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

// Sale / new-order alerts, sent by src/lib/push.ts.
self.addEventListener("push", (event) => {
  let payload = { title: "AccShop admin", body: "" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // no-op, fall back to the default payload above
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/admin/icon-192.png",
      badge: "/admin/icon-192.png",
      data: { url: payload.url || "/admin/orders" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/orders";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
