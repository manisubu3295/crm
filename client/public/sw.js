const CACHE = "crm-v1";
const PRECACHE = ["/", "/manifest.json"];

// Install: pre-cache shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push: show notification
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || "crm-notification",
    renotify: true,
  };
  e.waitUntil(self.registration.showNotification(data.title || "Aadhirai CRM", options));
});

// Notification click: focus or open app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Never cache API calls or socket.io
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) {
    e.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ?? fetch(request).then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
    )
  );
});
