import { createClient } from "@/lib/supabase/server";
import { Step12Building } from "@/components/onboarding/steps/Step12Building";

/**
 * Onboarding V2 (docs/01_ONBOARDING_V2.md) — this route is now ONLY Step 12
 * (decorative "Building your presence"). Steps 1-11 (anonymous, pre-signup)
 * live at /start. By the time a user reaches here they already have a real
 * account and a submitted business_profiles row — /api/onboarding/complete
 * and /api/ai/generate-website were already triggered from either
 * /api/auth/callback (Google OAuth) or Step11Signup (email+password).
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessName = "your business";
  if (user) {
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.business_name) businessName = profile.business_name;
  }

  return (
    <div className="onboarding-shell flex min-h-screen w-full flex-col items-center justify-center px-5 sm:px-6">
      <Step12Building businessName={businessName} />
    </div>
  );
}
