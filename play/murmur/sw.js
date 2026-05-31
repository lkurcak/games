const CACHE_PREFIX = "murmur-offline";
const CACHE_NAME = `${CACHE_PREFIX}-v1`;
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest",
  "./js/main.js",
  "./js/renderer.js",
  "./js/state.js",
  "./js/utils.js",
  "./pkg/game_wasm.js",
  "./pkg/game_wasm_bg.wasm",
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
      return (await cache.match("./")) || (await cache.match("./index.html"));
    }

    throw error;
  }
}
