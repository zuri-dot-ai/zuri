import { SupabaseClient } from "@supabase/supabase-js";
import {
  sendDowngradeEmail,
  sendPaymentFailedEmail,
} from "@/lib/email/templates";

export async function handleFailedPayment(
  supabase: SupabaseClient,
  userId: string
) {
  // Set status to grace_period, giving user 3 days to fix payment method
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 3);

  await supabase
    .from("subscriptions")
    .update({
      status: "grace_period",
      grace_period_end: graceEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Send failed payment email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profile?.email) {
    await sendPaymentFailedEmail({
      to: profile.email,
      name: profile.full_name,
      gracePeriodEnd: graceEnd.toLocaleDateString("en-NG"),
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });
  }
}

/**
 * Cron job (run daily via Vercel Cron):
 * Checks grace_period subscriptions whose grace_period_end < now
 * and downgrades them to 'free'.
 */
export async function processExpiredGracePeriods(supabase: SupabaseClient) {
  const { data: expired } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "grace_period")
    .lt("grace_period_end", new Date().toISOString());

  if (!expired?.length) return;

  for (const sub of expired) {
    await supabase
      .from("subscriptions")
      .update({
        plan_id: "free",
        status: "active",
        cancel_at_period_end: false,
        grace_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", sub.user_id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", sub.user_id)
      .single();

    if (profile?.email) {
      await sendDowngradeEmail({
        to: profile.email,
        name: profile.full_name,
      });
    }
  }
}
