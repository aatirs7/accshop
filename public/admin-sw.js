// Minimal service worker so the admin panel qualifies as an installable PWA.
// Intentionally does no caching — the CRM always needs live data.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
