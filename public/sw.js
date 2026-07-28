// public/sw.js — caching + FCM background messaging
// Keep Firebase compat version in sync with package.json `firebase`.

const CACHE_NAME = "zuri-v3";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/Zuri_Logo.png",
  "/Zuri_Favicon.png",
  "/manifest.json",
];

// FCM: all importScripts must be top-level (no nested importScripts).
try {
  importScripts(
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js",
    "/api/firebase-messaging-sw-init"
  );
} catch (err) {
  console.warn("[sw] Firebase messaging init failed:", err);
}

// Install: cache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Notification click: focus an existing tab on the target route, or open one.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always network-first for API calls — never serve stale API responses
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response(JSON.stringify({ error: "You are offline." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  // Cache-first for static assets (images, fonts, JS, CSS)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2")
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ??
          fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network-first for pages, fallback to offline page
  e.respondWith(
    fetch(e.request).catch(
      () =>
        caches.match("/offline").then(
          (cached) =>
            cached ??
            new Response("You are offline. Please reconnect to use Zuri.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
    )
  );
});
