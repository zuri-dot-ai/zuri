// Fallback FCM service worker if the SDK looks for this filename by default.
// Primary registration remains /sw.js (see src/app/layout.tsx + getToken).
// Keep Firebase compat version in sync with package.json `firebase`.
try {
  importScripts(
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js",
    "/api/firebase-messaging-sw-init"
  );
} catch (err) {
  console.warn("[firebase-messaging-sw] init failed:", err);
}
