/** localStorage / sessionStorage helpers for upgrade-prompt frequency caps. */

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export const PROMPT_KEYS = {
  trialWelcomeDismissed: "zuri_trial_welcome_dismissed",
  loginUpgradePromptDay: "zuri_login_upgrade_prompt_day",
  loginUpgradeSessionDismissed: "zuri_login_upgrade_session_dismissed",
  trialEndingBannerDay: "zuri_trial_ending_banner_day",
  trialEndedNoticeDay: "zuri_trial_ended_notice_day",
  startTrialPromptDay: "zuri_start_trial_prompt_day",
  startTrialSessionDismissed: "zuri_start_trial_session_dismissed",
  lastGateAttempt: "zuri_last_gate_attempt",
  trialEndedAckPrefix: "zuri_trial_ended_ack_",
  contentProfileNudgeDay: "zuri_content_profile_nudge_day",
} as const;

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return true;
  return safeGet(localStorage, key) === "1";
}

export function dismiss(key: string): void {
  if (typeof window === "undefined") return;
  safeSet(localStorage, key, "1");
}

export function isDismissedForDay(dayKey: string): boolean {
  if (typeof window === "undefined") return true;
  return safeGet(localStorage, dayKey) === todayKey();
}

export function dismissForDay(dayKey: string): void {
  if (typeof window === "undefined") return;
  safeSet(localStorage, dayKey, todayKey());
}

export function isSessionDismissed(key: string): boolean {
  if (typeof window === "undefined") return true;
  return safeGet(sessionStorage, key) === "1";
}

export function dismissForSession(key: string): void {
  if (typeof window === "undefined") return;
  safeSet(sessionStorage, key, "1");
}

export function recordGateAttempt(): void {
  if (typeof window === "undefined") return;
  safeSet(localStorage, PROMPT_KEYS.lastGateAttempt, String(Date.now()));
}

export function hasRecentGateAttempt(withinMs = 24 * 60 * 60 * 1000): boolean {
  if (typeof window === "undefined") return false;
  const raw = safeGet(localStorage, PROMPT_KEYS.lastGateAttempt);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < withinMs;
}

export function trialEndedAckKey(trialEndedAt: string): string {
  return `${PROMPT_KEYS.trialEndedAckPrefix}${trialEndedAt}`;
}
