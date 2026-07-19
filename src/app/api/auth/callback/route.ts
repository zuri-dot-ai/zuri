import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/auth/redirect";

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = next;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, terms_accepted_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.terms_accepted_at) {
      await supabase
        .from("profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: "1.0",
        })
        .eq("id", user.id);
    }

    dest = profile?.onboarding_completed ? next : "/onboarding";
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
}
