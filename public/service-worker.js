// service-worker.js
const CACHE_NAME = "astroer-cache-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/cities.json",
  "/manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // API ko cache nahi karna (live hi rahe)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // sirf GET requests cache kare
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          // sirf same-origin ko cache kare
          if (url.origin === self.location.origin) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
