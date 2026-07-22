"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DRAFT_KEY_PREFIX = "zuri:draft:";
const RESUME_EVENT = "zuri:session-resumed";

// Module-level registry so any open form can offer its in-progress state to
// be preserved across a session-expiry re-auth, without prop-drilling the
// monitor through every page.
const draftSources = new Map<string, () => unknown>();

/**
 * Register a getter for a form's current draft state. Call the returned
 * function to unregister on unmount. When the session expires, every
 * registered draft is snapshotted to localStorage before the re-auth modal
 * appears; after successful re-auth, listen for `onSessionResumed(key, cb)`
 * to rehydrate.
 */
export function registerDraftSource(key: string, getState: () => unknown) {
  draftSources.set(key, getState);
  return () => {
    draftSources.delete(key);
  };
}

/** Read back (and clear) a previously saved draft for `key`, if any. */
export function consumeDraft<T = unknown>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY_PREFIX + key);
    if (!raw) return null;
    window.localStorage.removeItem(DRAFT_KEY_PREFIX + key);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Fired on `window` after a successful re-auth so open forms can rehydrate. */
export function onSessionResumed(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(RESUME_EVENT, handler);
  return () => window.removeEventListener(RESUME_EVENT, handler);
}

/**
 * Convenience hook for a form that wants automatic draft preservation +
 * restoration around session expiry. `key` should be stable per-form (e.g.
 * "website-section-editor").
 */
export function useDraftPreservation<T>(
  key: string,
  getState: () => T,
  restoreState: (state: T) => void
) {
  useEffect(() => registerDraftSource(key, getState), [key, getState]);

  useEffect(() => {
    return onSessionResumed(() => {
      const draft = consumeDraft<T>(key);
      if (draft !== null) restoreState(draft);
    });
  }, [key, restoreState]);
}

function snapshotAllDrafts() {
  if (typeof window === "undefined") return;
  for (const [key, getState] of draftSources) {
    try {
      window.localStorage.setItem(
        DRAFT_KEY_PREFIX + key,
        JSON.stringify(getState())
      );
    } catch {
      // Draft too large / storage unavailable — skip, don't block the modal.
    }
  }
}

/**
 * Detects session expiry while the user is actively using the app. Rather
 * than hard-redirecting to /login (which would lose in-progress form state),
 * this snapshots every registered draft and reports `expired: true` so the
 * caller can render `<SessionExpiredModal>` in place.
 */
export function useSessionMonitor() {
  const [expired, setExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        snapshotAllDrafts();
        setExpired(true);
        setDismissed(false);
      }
      if (event === "SIGNED_IN" && expired) {
        setExpired(false);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = useCallback(() => {
    setExpired(false);
    setDismissed(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(RESUME_EVENT));
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    /** True while the re-auth modal should be shown. */
    expired: expired && !dismissed,
    resume,
    dismiss,
  };
}
