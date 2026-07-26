import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_CONFIG, isPlanId } from "./plans";
import {
  daysUntil,
  freeTierLossSentence,
} from "./trials";
import { createNotificationAsync } from "@/lib/notifications/create-notification";

function billingUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`;
}

/**
 * Send 3-day and 1-day trial ending reminders (idempotent via stamp columns).
 */
export async function sendTrialEndingReminders(supabase: SupabaseClient): Promise<number> {
  const now = new Date();
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in1Day = new Date(now);
  in1Day.setDate(in1Day.getDate() + 1);
  // Window: ends within N days, and not already past
  const nowIso = now.toISOString();

  let sent = 0;

  // 3-day window: trial_ends_at between now and now+3d, stamp null
  const { data: day3 } = await supabase
    .from("subscriptions")
    .select("user_id, trial_ends_at, trial_tier, plan_id")
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", nowIso)
    .lte("trial_ends_at", in3Days.toISOString())
    .is("trial_reminder_3d_sent_at", null);

  for (const sub of day3 ?? []) {
    const daysLeft = daysUntil(sub.trial_ends_at, now) ?? 3;
    // Only stamp as 3d if still more than ~1.5 days left; otherwise 1d handler covers it
    if (daysLeft <= 1) continue;
    const ok = await sendTrialEndingNotice(supabase, sub.user_id, daysLeft, sub.trial_tier ?? sub.plan_id);
    if (ok) {
      await supabase
        .from("subscriptions")
        .update({
          trial_reminder_3d_sent_at: nowIso,
          updated_at: nowIso,
        })
        .eq("user_id", sub.user_id);
      sent += 1;
    }
  }

  // 1-day window
  const { data: day1 } = await supabase
    .from("subscriptions")
    .select("user_id, trial_ends_at, trial_tier, plan_id")
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", nowIso)
    .lte("trial_ends_at", in1Day.toISOString())
    .is("trial_reminder_1d_sent_at", null);

  for (const sub of day1 ?? []) {
    const daysLeft = Math.max(1, daysUntil(sub.trial_ends_at, now) ?? 1);
    const ok = await sendTrialEndingNotice(supabase, sub.user_id, daysLeft, sub.trial_tier ?? sub.plan_id);
    if (ok) {
      await supabase
        .from("subscriptions")
        .update({
          trial_reminder_1d_sent_at: nowIso,
          // Also mark 3d so a late join doesn't double-send next run
          trial_reminder_3d_sent_at: nowIso,
          updated_at: nowIso,
        })
        .eq("user_id", sub.user_id);
      sent += 1;
    }
  }

  return sent;
}

async function sendTrialEndingNotice(
  supabase: SupabaseClient,
  userId: string,
  daysLeft: number,
  trialTier: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  const planName = isPlanId(trialTier) ? PLAN_CONFIG[trialTier].name : "your";
  const loss = freeTierLossSentence();
  const upgradeUrl = billingUrl();
  const dayLabel = daysLeft === 1 ? "1 day" : `${daysLeft} days`;

  createNotificationAsync({
    userId,
    type: "trial_ending",
    title: `Your ${planName} trial ends in ${dayLabel}`,
    body: `You'll automatically move to Free — no charge. You'll lose: ${loss}. Upgrade anytime to keep access.`,
    actionUrl: "/settings?tab=billing",
    actionLabel: "Upgrade now",
    metadata: { daysLeft, trialTier },
    email: profile?.email
      ? {
          to: profile.email,
          subject: `Your Zuri trial ends in ${dayLabel}`,
          template: "trial_ending",
          templateProps: {
            firstName: profile.full_name?.split(" ")[0] ?? "there",
            daysLeft,
            planName,
            lossSummary: loss,
            upgradeUrl,
          },
        }
      : undefined,
  });

  return true;
}

/**
 * Auto-downgrade expired trials to Free. No charge attempt.
 */
export async function processExpiredTrials(supabase: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString();

  const { data: expired } = await supabase
    .from("subscriptions")
    .select("user_id, trial_tier, plan_id")
    .eq("status", "trialing")
    .not("trial_ends_at", "is", null)
    .lt("trial_ends_at", nowIso);

  if (!expired?.length) return 0;

  let count = 0;
  for (const sub of expired) {
    const tier = sub.trial_tier ?? sub.plan_id;
    const planName = isPlanId(tier) ? PLAN_CONFIG[tier].name : "trial";

    await supabase
      .from("subscriptions")
      .update({
        plan_id: "free",
        status: "active",
        trial_ends_at: null,
        trial_tier: null,
        trial_ended_at: nowIso,
        trial_reminder_3d_sent_at: null,
        trial_reminder_1d_sent_at: null,
        cancel_at_period_end: false,
        grace_period_end: null,
        updated_at: nowIso,
      })
      .eq("user_id", sub.user_id)
      .eq("status", "trialing");

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", sub.user_id)
      .single();

    const loss = freeTierLossSentence();
    const upgradeUrl = billingUrl();

    createNotificationAsync({
      userId: sub.user_id,
      type: "trial_expired",
      title: `Your ${planName} trial has ended`,
      body: `Your account is now on Free. You've lost: ${loss}. Upgrade anytime to restore access.`,
      actionUrl: "/settings?tab=billing",
      actionLabel: "Upgrade",
      metadata: { previousTier: tier },
      email: profile?.email
        ? {
            to: profile.email,
            subject: "Your Zuri trial has ended",
            template: "trial_expired",
            templateProps: {
              firstName: profile.full_name?.split(" ")[0] ?? "there",
              planName,
              lossSummary: loss,
              upgradeUrl,
            },
          }
        : undefined,
    });

    count += 1;
  }

  return count;
}
