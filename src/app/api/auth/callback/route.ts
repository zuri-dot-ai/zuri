import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/redirect";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { ANON_COOKIE_NAME } from "@/lib/onboarding/anonymous-session";

/**
 * Public: Supabase OAuth / email-confirm callback.
 * Exchanges the auth code for a session (cookies attached to the redirect),
 * then routes by onboarding status.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(
    searchParams.get("next") ?? searchParams.get("redirect")
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
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
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dest = next;
    if (user) {
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
        await supabase.from("profiles").update(profilePatch).eq("id", user.id);
      }

      dest = profile?.onboarding_completed ? next : "/start";

      // Onboarding V2 — if an anonymous session exists from /start, convert it.
      // Only land on /onboarding (Building) after a successful complete.
      // No anon cookie or failed complete → /start so the user can finish Q&A.
      if (!profile?.onboarding_completed) {
        const sessionToken = cookieStore.get(ANON_COOKIE_NAME)?.value;
        if (sessionToken) {
          try {
            const cookieHeader = cookieStore
              .getAll()
              .map((c) => `${c.name}=${c.value}`)
              .join("; ");
            const completeResponse = await fetch(
              `${origin}/api/onboarding/complete`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: cookieHeader,
                },
                body: JSON.stringify({ sessionToken }),
              }
            );
            if (completeResponse.ok) {
              dest = "/onboarding";
            } else {
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

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    const redirectUrl =
      !isLocalEnv && forwardedHost
        ? `https://${forwardedHost}${dest}`
        : `${origin}${dest}`;

    const response = NextResponse.redirect(redirectUrl);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, route: "/api/auth/callback" });
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
