import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Step12Building } from "@/components/onboarding/steps/Step12Building";

/**
 * Onboarding V2 — Step 12 only (decorative "Building your presence").
 * Gated: only reachable after /api/onboarding/complete has set
 * onboarding_completed=true. Incomplete users are sent to /start.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/start");
  }

  let businessName = "your business";
  const { data: biz } = await supabase
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (biz?.business_name) businessName = biz.business_name;

  return (
    <div className="onboarding-shell flex min-h-screen w-full flex-col items-center justify-center px-5 sm:px-6">
      <Step12Building businessName={businessName} />
    </div>
  );
}
