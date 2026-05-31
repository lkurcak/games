const CACHE_PREFIX = "games-hub-offline";
const CACHE_NAME = `${CACHE_PREFIX}-v1`;
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./games.json",
  "./assets/favicon/site.webmanifest",
  "./assets/favicon/favicon.svg",
  "./assets/favicon/favicon-32.png",
  "./assets/favicon/apple-touch-icon.png",
  "./assets/favicon/android-chrome-192x192.png",
  "./assets/favicon/android-chrome-512x512.png",
  "./assets/icons/murmur.svg",
  "./assets/icons/wizard.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (
    request.method !== "GET" ||
    request.destination === "serviceworker" ||
    url.pathname.endsWith("/sw.js") ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      return (await getNavigationFallback(request, cache)) || offlineResponse();
    }

    throw error;
  }
}

async function getNavigationFallback(request, cache) {
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`) {
    return (await cache.match("./")) || (await cache.match("./index.html"));
  }

  return null;
}

function offlineResponse() {
  return new Response("This game is not cached for offline play yet.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
