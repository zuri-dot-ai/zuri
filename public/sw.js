/* Zuri Service Worker — lightweight offline shell cache */
const CACHE_NAME = "zuri-v1";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/Zuri_Logo.png",
  "/Zuri_Favicon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Cache same-origin successful GETs so the shell works offline.
        if (
          res &&
          res.status === 200 &&
          req.url.startsWith(self.location.origin)
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || caches.match("/offline"))
      )
  );
});
