import type { PlanId } from "./plans";

export interface NudgeCheckInput {
  planId: PlanId;
  status: string;
  createdAt: string; // profile/account creation timestamp
  trialEndedAt: string | null;
  lastUpgradeNudgeAt: string | null;
}

export type NudgeKind = "activate_trial" | "upgrade";

const HOUR = 60 * 60 * 1000;
const FIRST_NUDGE_DELAY_MS = 18 * HOUR; // mid-point of 12-24h window
const REPEAT_INTERVAL_MS = 24 * HOUR;

/**
 * Determines whether the recurring upgrade/trial-activation modal should
 * show right now, and which variant. Pure function — call from a server
 * component with fresh DB values.
 */
export function getNudgeToShow(input: NudgeCheckInput): NudgeKind | null {
  const { planId, status, createdAt, trialEndedAt, lastUpgradeNudgeAt } = input;

  // Already paying — never nudge.
  if (planId !== "free") return null;
  // Currently mid-trial — the trial-ending reminders (email) handle this,
  // not this modal.
  if (status === "trialing") return null;

  const now = Date.now();
  const last = lastUpgradeNudgeAt ? new Date(lastUpgradeNudgeAt).getTime() : null;

  // Post-trial: they used their Growth trial and lapsed back to Free.
  if (trialEndedAt) {
    if (last === null) return "upgrade";
    return now - last >= REPEAT_INTERVAL_MS ? "upgrade" : null;
  }

  // Pre-trial: never trialed, still on Free from signup.
  const created = new Date(createdAt).getTime();
  if (last === null) {
    return now - created >= FIRST_NUDGE_DELAY_MS ? "activate_trial" : null;
  }
  return now - last >= REPEAT_INTERVAL_MS ? "activate_trial" : null;
}