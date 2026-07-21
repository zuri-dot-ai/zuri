import { SupabaseClient } from "@supabase/supabase-js";
import { createNotificationAsync } from "@/lib/notifications/create-notification";

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

  const gracePeriodEndLabel = graceEnd.toLocaleDateString("en-NG");
  const updatePaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`;

  createNotificationAsync({
    userId,
    type: "payment_failed",
    title: "We couldn't process your payment",
    body: `Update your payment method by ${gracePeriodEndLabel} to avoid losing access.`,
    actionUrl: "/settings?tab=billing",
    actionLabel: "Update payment method",
    email: profile?.email
      ? {
          to: profile.email,
          subject: "Action needed — Zuri payment failed",
          template: "payment_failed",
          templateProps: {
            firstName: profile.full_name?.split(" ")[0] ?? "there",
            planName: "current",
            gracePeriodEnd: gracePeriodEndLabel,
            updatePaymentUrl,
          },
        }
      : undefined,
  });
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

    createNotificationAsync({
      userId: sub.user_id,
      type: "plan_downgraded",
      title: "Your plan is now Free",
      body: "Your grace period ended without a successful payment, so your account is now on the Free plan.",
      actionUrl: "/settings?tab=billing",
      actionLabel: "Resubscribe",
      email: profile?.email
        ? {
            to: profile.email,
            subject: "Your Zuri plan has been updated to Free",
            template: "plan_downgraded",
            templateProps: {
              firstName: profile.full_name?.split(" ")[0] ?? "there",
              billingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
            },
          }
        : undefined,
    });
  }
}
