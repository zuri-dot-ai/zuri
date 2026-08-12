import {
  PLAN_CONFIG,
  PLAN_RANK,
  PAID_PLAN_IDS,
  isPlanId,
  type PlanId,
} from "./plans";

export const PRO_TRIAL_DAYS = 14;
export const UPGRADE_TRIAL_DAYS = 7;

export interface SubscriptionTrialRow {
  user_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  trial_tier: string | null;
  trials_used: string[] | null;
  trial_ended_at: string | null;
  trial_reminder_3d_sent_at?: string | null;
  trial_reminder_1d_sent_at?: string | null;
}

/** Unconverted = still evaluating; not a paying (or grace) customer. */
export function isUnconverted(sub: Pick<SubscriptionTrialRow, "plan_id" | "status">): boolean {
  if (sub.status === "trialing") return true;
  if (sub.status === "grace_period") return false;
  // Still in a paid billing relationship — checkout, not a free trial.
  if (sub.status === "past_due") return false;
  if (sub.status === "active" && sub.plan_id !== "free") return false;
  // Free (any status) or lapsed paid rows that display as Free.
  if (sub.plan_id === "free") return true;
  if (
    sub.status === "inactive" ||
    sub.status === "expired" ||
    sub.status === "cancelled"
  ) {
    return true;
  }
  return false;
}

export function normalizeTrialsUsed(raw: string[] | null | undefined): PlanId[] {
  if (!raw?.length) return [];
  return raw.filter((id): id is PlanId => isPlanId(id) && id !== "free");
}

export function mergeTrialsUsed(
  existing: string[] | null | undefined,
  planId: PlanId
): PlanId[] {
  const set = new Set(normalizeTrialsUsed(existing));
  if (planId !== "free") set.add(planId);
  return Array.from(set);
}

export function canStartTrial(
  sub: Pick<SubscriptionTrialRow, "plan_id" | "status" | "trials_used">,
  targetPlan: PlanId
): { ok: true } | { ok: false; reason: string } {
  // Only Growth is trialable. Pro and Premium are purchase-only, no trial.
  if (targetPlan !== "growth") {
    return { ok: false, reason: "Only the Growth plan offers a free trial." };
  }
  if (!isUnconverted(sub)) {
    return {
      ok: false,
      reason: "Trials are only available before you subscribe. Use checkout to upgrade.",
    };
  }
  const used = normalizeTrialsUsed(sub.trials_used);
  if (used.includes(targetPlan)) {
    return {
      ok: false,
      reason: "You've already used your Growth trial.",
    };
  }
  // Already trialing something (shouldn't happen now that only one tier
  // trials, but guards against stale trialing rows from before this change)
  if (sub.status === "trialing") {
    return { ok: false, reason: "You already have an active trial." };
  }

  return { ok: true };
}

export function trialDaysForPlan(planId: PlanId): number {
  return UPGRADE_TRIAL_DAYS; // 7 days — only Growth trials exist now
}

/** Lowest unused paid tier the user can still trial, or null if none. */
export function nextAvailableTrialPlan(
  sub: Pick<SubscriptionTrialRow, "plan_id" | "status" | "trials_used">
): PlanId | null {
  for (const id of PAID_PLAN_IDS) {
    if (canStartTrial(sub, id).ok) return id;
  }
  return null;
}

/** Concrete Free-tier losses for emails and banners. */
export function freeTierLossSummary(): string[] {
  return [
    "Publishing your website (preview only on Free)",
    "Content calendar and AI post generation",
    "AI image generation",
    "Agency marketplace access",
  ];
}

export function freeTierLossSentence(): string {
  return freeTierLossSummary().join("; ");
}

export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildStartTrialUpdate(
  targetPlan: PlanId,
  existingTrialsUsed: string[] | null | undefined,
  now = new Date()
) {
  const days = trialDaysForPlan(targetPlan);
  const trialEnds = new Date(now);
  trialEnds.setDate(trialEnds.getDate() + days);
  const trialEndsAt = trialEnds.toISOString();

  return {
    plan_id: targetPlan,
    status: "trialing" as const,
    trial_tier: targetPlan,
    trial_ends_at: trialEndsAt,
    trials_used: mergeTrialsUsed(existingTrialsUsed, targetPlan),
    trial_ended_at: null,
    trial_reminder_3d_sent_at: null,
    trial_reminder_1d_sent_at: null,
    current_period_start: now.toISOString(),
    current_period_end: trialEndsAt,
    grace_period_end: null,
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  };
}
