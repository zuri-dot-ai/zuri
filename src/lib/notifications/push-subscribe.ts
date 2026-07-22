/**
 * Client-side web push helpers (docs/08_NOTIFICATIONS.md addendum —
 * Session 4B v2). Register the service worker (src/app/layout.tsx already
 * does this on load) before calling subscribeToPush().
 *
 * Callers must render their own pre-prompt UI before invoking
 * requestPushPermission() — this never cold-opens the raw browser dialog on
 * page load. Only call it in response to explicit user intent (e.g. a
 * "Enable notifications" button click).
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Base64url string -> Uint8Array, required by pushManager.subscribe(). */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
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
 * Registers a PushSubscription with the browser and stores it server-side.
 * Assumes permission has already been granted (call requestPushPermission
 * first, gated behind the custom pre-prompt UI).
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.error("subscribeToPush: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const res = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  if (!res.ok) {
    console.error("subscribeToPush: failed to store subscription server-side.");
  }

  return subscription;
}

/** Unsubscribes the current device and removes the stored subscription. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});

  await fetch("/api/notifications/push/unsubscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}
