// Fallback FCM service worker if the SDK looks for this filename by default.
// Primary registration remains /sw.js (see src/app/layout.tsx + getToken).
try {
  importScripts("/api/firebase-messaging-sw-init");
} catch (err) {
  console.warn("[firebase-messaging-sw] init failed:", err);
}
