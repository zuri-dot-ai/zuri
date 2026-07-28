/**
 * Client-side FCM push helpers. Register the service worker
 * (src/app/layout.tsx already does this on load) before calling subscribeToPush().
 *
 * Callers must render their own pre-prompt UI before invoking
 * requestPushPermission() — this never cold-opens the raw browser dialog on
 * page load. Only call it in response to explicit user intent (e.g. a
 * "Enable notifications" button click).
 */

import { deleteToken, getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase/client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Requests browser permission. Call only after the caller's own custom
 * pre-prompt UI has confirmed user intent — this is the raw browser
 * permission dialog and can only be shown once per origin decision.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.requestPermission();
}

/**
 * Obtains an FCM token and stores it server-side.
 * Assumes permission has already been granted (call requestPushPermission
 * first, gated behind the custom pre-prompt UI).
 */
export async function subscribeToPush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  if (!VAPID_KEY) {
    console.error("subscribeToPush: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.");
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.error("subscribeToPush: Firebase Messaging is not available.");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    console.error("subscribeToPush: getToken failed:", err);
    return null;
  }

  if (!token) {
    console.error("subscribeToPush: getToken returned empty token.");
    return null;
  }

  const res = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fcm_token: token }),
  });

  if (!res.ok) {
    console.error("subscribeToPush: failed to store token server-side.");
    return null;
  }

  return token;
}

/** Unsubscribes the current device and removes the stored FCM token. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const messaging = await getFirebaseMessaging();
  let token: string | null = null;

  if (messaging) {
    try {
      const registration = await navigator.serviceWorker.ready;
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY || undefined,
        serviceWorkerRegistration: registration,
      });
      await deleteToken(messaging);
    } catch {
      // Best-effort — still clear server-side below.
    }
  }

  await fetch("/api/notifications/push/unsubscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(token ? { fcm_token: token } : {}),
  }).catch(() => {});
}
