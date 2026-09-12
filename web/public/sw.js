const CACHE_NAME = "cookbook-static-v2";
const ESSENTIAL_ASSETS = [
  "/icon.svg",
  "/icons/cookbook-192.png",
  "/icons/cookbook-512.png",
  "/brand/cookbook-mascot-mark.svg",
];
const IS_LOCAL = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  if (!IS_LOCAL) {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ESSENTIAL_ASSETS)));
  }
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("cookbook-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (IS_LOCAL || request.method !== "GET") return;

  const url = new URL(request.url);
  const isSafeStaticAsset = url.origin === self.location.origin && (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  );

  if (!isSafeStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/cozinhar", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => client.url === targetUrl);
      if (existing) return existing.focus();
      const visible = windows.find((client) => "focus" in client);
      if (visible) {
        await visible.navigate(targetUrl);
        return visible.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
