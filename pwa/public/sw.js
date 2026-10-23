/* Muhūrta service worker.
 * - App shell: HTML navigations are network-first and cached, so the app opens offline.
 *   Pages are client-rendered shells (no personal data in HTML); the last reading itself
 *   lives in localStorage and renders from there.
 * - Static build assets: cache-first (content-hashed).
 * - Never caches /api or /auth responses, and never answers with the manifest.
 * - Web Push: shows the server's notification (icon, monochrome badge, image, actions)
 *   and deep-links taps into the right screen, reusing an open app window.
 */
const VERSION = "v3";
const SHELL_CACHE = `muh-shell-${VERSION}`;
const PAGE_CACHE = `muh-pages-${VERSION}`;
const ASSET_CACHE = `muh-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/badge-96.png",
];
const APP_PAGES = ["/today", "/decode", "/life", "/timing", "/ask", "/settings", "/traditions", "/plans"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("muh-") && ![SHELL_CACHE, PAGE_CACHE, ASSET_CACHE].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isAppPage(pathname) {
  return APP_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname === "/welcome";
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    // Cache only clean 200 app pages (not auth redirects / errors).
    if (response.ok && !response.redirected && isAppPage(url.pathname)) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    const exact = await cache.match(url.pathname);
    if (exact) return exact;
    // Any cached app shell can boot the client router and render the cached reading.
    if (isAppPage(url.pathname)) {
      const shell = (await cache.match("/today")) || (await cache.match("/life"));
      if (shell) return shell;
    }
    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }
  // RSC payloads and other GETs: network, then cache, never the manifest.
  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) || Response.error()),
  );
});

// ---------- Web Push ----------
const PUSH_FALLBACK = {
  title: "Muhūrta",
  body: "Open today's timing.",
  url: "/today",
};

function sameOriginPath(raw) {
  try {
    const u = new URL(raw || "/today", self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search + u.hash : "/today";
  } catch {
    return "/today";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || PUSH_FALLBACK.title;
  const url = sameOriginPath(data.url || PUSH_FALLBACK.url);
  const actions = Array.isArray(data.actions) ? data.actions.slice(0, 2) : [];
  const options = {
    body: data.body || PUSH_FALLBACK.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-96.png",
    tag: data.tag || "muh",
    renotify: Boolean(data.renotify),
    lang: data.lang || "en",
    timestamp: data.timestamp || Date.now(),
    vibrate: [80, 40, 80],
    data: {
      url,
      kind: data.kind || "",
      actions: Object.fromEntries(actions.map((a) => [a.action, sameOriginPath(a.url)])),
    },
    actions: actions.map((a) => ({ action: a.action, title: a.title })),
  };
  if (data.image) options.image = data.image;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const target = (event.action && d.actions && d.actions[event.action]) || d.url || "/today";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if ("navigate" in client) return await client.navigate(target);
          client.postMessage({ type: "muh-navigate", url: target });
          return;
        } catch {
          /* fall through to a new window */
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// Browser rotated the subscription: re-subscribe with the same key and tell the app to save it.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription && event.oldSubscription.options;
      if (!options || !options.applicationServerKey) return;
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: options.applicationServerKey,
      });
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) client.postMessage({ type: "muh-push-resubscribed", subscription: sub.toJSON() });
    })(),
  );
});
