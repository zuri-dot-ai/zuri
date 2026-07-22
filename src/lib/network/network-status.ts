"use client";

/**
 * Single shared source of truth for browser online/offline events, so
 * `OfflineBanner` and `use-retry-queue` don't register duplicate listeners
 * and always agree on the current state.
 */

type Listener = (online: boolean) => void;

const listeners = new Set<Listener>();
let attached = false;

function handleChange() {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  listeners.forEach((l) => l(online));
}

function ensureAttached() {
  if (attached || typeof window === "undefined") return;
  window.addEventListener("online", handleChange);
  window.addEventListener("offline", handleChange);
  attached = true;
}

/** Subscribe to online/offline transitions. Returns an unsubscribe function. */
export function subscribeNetworkStatus(listener: Listener): () => void {
  ensureAttached();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe specifically to the "connection restored" transition. */
export function onNetworkRestore(callback: () => void): () => void {
  return subscribeNetworkStatus((online) => {
    if (online) callback();
  });
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
