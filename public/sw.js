// LIVRE service worker. Three jobs only:
//  1. Keep the app's own files (scripts, styles, fonts, images) in the phone
//     so repeat visits open fast.
//  2. Show a friendly offline page when there is no connection.
//  3. Show the staff's push notifications (new orders, reviews, team
//     changes) and open the admin page they point to when tapped.
// Pages, the cart, checkout, the admin and every API call always go to the
// network: nothing private or out of date is ever served from here.

const VERSION = "v2";
const STATIC = `livre-static-${VERSION}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll([OFFLINE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("livre-") && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || /\.(?:woff2|webp|png|svg|jpg|jpeg|avif)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});

// A notification from /api/push/ping: { title, body, url, tag? }.
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = {};
  }
  const title = typeof message.title === "string" && message.title ? message.title : "LIVRE";
  const tag = typeof message.tag === "string" && message.tag ? message.tag : undefined;
  const options = {
    body: typeof message.body === "string" ? message.body : "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: typeof message.url === "string" ? message.url : "/admin" },
  };
  if (tag) {
    options.tag = tag;
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

// Only admin pages of this site can be opened from a notification.
const adminTarget = (value) => {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Not a URL: fall through to the dashboard.
  }
  return "/admin";
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = adminTarget(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const open = windows.find((w) => {
        const url = new URL(w.url);
        return url.origin === self.location.origin && url.pathname.startsWith("/admin");
      });
      if (open) {
        await open.focus();
        return open.navigate(target).catch(() => self.clients.openWindow(target));
      }
      return self.clients.openWindow(target);
    }),
  );
});
