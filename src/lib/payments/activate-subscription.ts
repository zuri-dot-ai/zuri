import { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_CONFIG, isPlanId } from "./plans";
import { sendPlanActivationEmail } from "@/lib/email/templates";

export async function activateSubscription(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  billingCycle: "monthly" | "annual",
  transactionId: string,
  amount: number,
  /** Flutterwave tx_ref used when initiating payment — matches payment_history.flutterwave_reference */
  txRef?: string
) {
  if (!isPlanId(planId) || planId === "free") {
    throw new Error(`Invalid plan for activation: ${planId}`);
  }

  const plan = PLAN_CONFIG[planId];
  const now = new Date();
  const periodEnd = new Date(now);

  if (billingCycle === "annual") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Upsert subscription
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: planId,
      status: "active",
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      grace_period_end: null,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Mark the pending initiation row successful (match on tx_ref, not Flutterwave's numeric id)
  if (txRef) {
    await supabase
      .from("payment_history")
      .update({
        status: "successful",
        flutterwave_transaction_id: transactionId,
      })
      .eq("flutterwave_reference", txRef)
      .is("flutterwave_transaction_id", null);
  }

  // If no matching pending record found, insert new record
  await supabase.from("payment_history").upsert(
    {
      user_id: userId,
      plan_id: planId,
      amount,
      currency: "NGN",
      status: "successful",
      flutterwave_transaction_id: transactionId,
      flutterwave_reference: txRef ?? null,
      billing_cycle: billingCycle,
      payment_type: "subscription_new",
    },
    { onConflict: "flutterwave_transaction_id", ignoreDuplicates: true }
  );

  // Initialise usage tracking for this billing period
  const periodStart = now.toISOString().split("T")[0];
  await supabase.from("usage_tracking").upsert(
    {
      user_id: userId,
      period_start: periodStart,
    },
    { onConflict: "user_id,period_start", ignoreDuplicates: true }
  );

  // Send activation email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profile?.email) {
    await sendPlanActivationEmail({
      to: profile.email,
      name: profile.full_name,
      planName: plan.name,
      billingCycle,
      nextBillingDate: periodEnd.toLocaleDateString("en-NG"),
    });
  }
}
