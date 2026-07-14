import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Public: Supabase OAuth / email-confirm callback.
 * Exchanges the auth code for a session, then routes by onboarding status.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? searchParams.get("redirect") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure NDPA consent timestamp exists (email confirm / Google OAuth)
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

        const dest = profile?.onboarding_completed ? next : "/onboarding";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
