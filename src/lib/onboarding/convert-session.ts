import { createServiceClient } from "@/lib/supabase/service";

/**
 * Marks an anonymous onboarding session as converted once signup succeeds.
 * Does NOT write business_profiles/website_generation_jobs itself — that
 * happens in `POST /api/onboarding/complete`, which reads the same
 * anonymous_onboarding_sessions row as its single source of truth. Never
 * trust a client-submitted OnboardingState body at this stage.
 */
export async function convertAnonymousSession(
  sessionToken: string,
  newUserId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { data: anonSession, error } = await supabase
    .from("anonymous_onboarding_sessions")
    .select("id, data, archetype")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load anonymous session: ${error.message}`);
  }
  if (!anonSession) {
    throw new Error("Anonymous session not found or expired");
  }

  const { error: updateError } = await supabase
    .from("anonymous_onboarding_sessions")
    .update({ converted_user_id: newUserId })
    .eq("session_token", sessionToken);

  if (updateError) {
    throw new Error(
      `Failed to mark anonymous session converted: ${updateError.message}`
    );
  }
}
