import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAppOrigin, safeNextPath } from "@/lib/auth/redirect";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { ANON_COOKIE_NAME } from "@/lib/onboarding/anonymous-session";
import { CUSTOM_SITE_COOKIE_NAME } from "@/lib/custom-site/anonymous-session";
import { createServiceClient } from "@/lib/supabase/service";
import { completeOnboardingSession } from "@/lib/onboarding/complete-session";
import { sendWelcomeEmailIfNewUser } from "@/lib/email/send-welcome";

/**
 * Public: Supabase OAuth / email-confirm callback.
 * Exchanges the auth code for a session (cookies attached to the redirect),
 * then routes by onboarding status.
 *
 * Onboarding complete runs in-process with the exchanged user — never via an
 * HTTP self-fetch that can forward a stale/deleted JWT.
 *
 * Post-auth redirects always use getAppOrigin() so users stay on
 * app.buildzuri.com and are never bounced to *.vercel.app (which drops the
 * host-scoped anon onboarding cookie and restarts /start at step 1).
 */
export async function GET(request: Request) {
  const appOrigin = getAppOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(
    searchParams.get("next") ?? searchParams.get("redirect")
  );

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const cookieStore = await cookies();
  const pendingCookies: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach((cookie) => {
            pendingCookies.push(cookie);
            try {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            } catch {
              // Ignore if the cookie store is read-only in this context.
            }
          });
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${appOrigin}/login?error=auth`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dest = next;
    if (user) {
      sendWelcomeEmailIfNewUser(user);

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const metaAvatar =
        (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
        (typeof meta?.picture === "string" && meta.picture) ||
        null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, terms_accepted_at, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const profilePatch: Record<string, string> = {};
      if (!profile?.terms_accepted_at) {
        profilePatch.terms_accepted_at = new Date().toISOString();
        profilePatch.terms_version = "1.0";
      }
      if (!profile?.avatar_url && metaAvatar) {
        profilePatch.avatar_url = metaAvatar;
      }
      if (Object.keys(profilePatch).length > 0) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(profilePatch)
          .eq("id", user.id);
        if (profileUpdateError) {
          console.error(
            "[auth/callback] profile patch failed:",
            profileUpdateError.message
          );
        }
      }

      dest = profile?.onboarding_completed ? next : "/start";

      // Custom site funnel — Google OAuth returns to /custom-site with answers intact.
      const customSiteToken = cookieStore.get(CUSTOM_SITE_COOKIE_NAME)?.value;
      const isCustomSiteNext =
        next === "/custom-site" || next.startsWith("/custom-site?");
      if (isCustomSiteNext && customSiteToken) {
        try {
          const service = createServiceClient();
          await service
            .from("anonymous_custom_site_sessions")
            .update({ converted_user_id: user.id })
            .eq("session_token", customSiteToken)
            .is("converted_user_id", null);
          dest = next;
        } catch (err) {
          console.error("[auth/callback] custom-site convert failed:", err);
          dest = "/custom-site";
        }
      } else if (!profile?.onboarding_completed) {
        // Onboarding V2 — if an anonymous session exists from /start, convert it.
        // Only land on /onboarding (Building) after a successful complete.
        // No anon cookie or failed complete → /start so the user can finish Q&A.
        const sessionToken = cookieStore.get(ANON_COOKIE_NAME)?.value;
        if (sessionToken) {
          try {
            const result = await completeOnboardingSession(user, sessionToken, {
              // Cookie clear via cookies() may not reach the redirect response;
              // strip the anon cookie on the redirect below instead.
              clearAnonCookie: false,
            });
            if (result.ok) {
              dest = "/onboarding";
              // Clear anon cookie on the redirect response (in-process complete
              // intentionally skipped cookies() so Set-Cookie reaches the browser).
              pendingCookies.push({
                name: ANON_COOKIE_NAME,
                value: "",
                options: { path: "/", maxAge: 0 },
              });
            } else {
              console.error(
                "[auth/callback] onboarding complete failed:",
                result.error,
                result.details
              );
              dest = "/start?error=complete_failed";
            }
          } catch (err) {
            console.error("[auth/callback] onboarding complete failed:", err);
            dest = "/start?error=complete_failed";
          }
        } else {
          dest = "/start";
        }
      }
    }

    const response = NextResponse.redirect(`${appOrigin}${dest}`);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, route: "/api/auth/callback" });
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }
}
