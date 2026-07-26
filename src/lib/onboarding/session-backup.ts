/**
 * Client-side backup for the anonymous onboarding session token.
 * The real source of truth is the httpOnly cookie; this survives OAuth
 * round-trips when the cookie is briefly missing so /start can re-attach it.
 */

export const ONBOARDING_SESSION_BACKUP_KEY = "zuri_anon_session_backup";

export function saveOnboardingSessionBackup(sessionToken: string): void {
  if (typeof window === "undefined" || !sessionToken) return;
  try {
    sessionStorage.setItem(ONBOARDING_SESSION_BACKUP_KEY, sessionToken);
  } catch {
    /* private mode / quota — best-effort */
  }
}

export function readOnboardingSessionBackup(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ONBOARDING_SESSION_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function clearOnboardingSessionBackup(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ONBOARDING_SESSION_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}
