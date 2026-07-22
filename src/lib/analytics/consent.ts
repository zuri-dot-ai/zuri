/**
 * Client-side analytics consent (docs/05_ANALYTICS.md addendum — Session 4A v2).
 *
 * Cookie-free tracking still requires an explicit visitor choice before any
 * pageview/event call fires. Choice is stored in localStorage only — no
 * server-side record in this pass (cross-device consent history can be added
 * later without changing this contract).
 *
 * These functions are also the documented source-of-truth mirrored by the
 * inline consent script injected into published sites (see
 * getConsentBannerScript in tracking-script.ts) — published sites cannot
 * import this module directly since they are served as raw HTML with no
 * bundler access, so any change here must be kept in sync with that inline
 * script.
 */

export const CONSENT_STORAGE_KEY = "zuri_consent";

export type ConsentChoice = "accepted" | "declined";

/** True only when the visitor has explicitly accepted tracking. */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

/** True once the visitor has made any choice (accept or decline). */
export function hasRecordedChoice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function recordConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // localStorage unavailable (private mode, quota) — fail closed, no tracking.
  }
}
