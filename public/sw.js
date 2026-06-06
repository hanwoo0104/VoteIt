const CACHE_NAME = "voteit-pwa-v2";
const OFFLINE_URLS = ["/", "/manifest.webmanifest", "/favicon.png", "/brand/voteit-logo.png"];
const STATIC_CACHE_PATHS = new Set(["/manifest.webmanifest", "/favicon.png", "/brand/voteit-logo.png"]);

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isApiRequest(pathname) {
  return pathname.startsWith("/api/");
}

function isNextRuntimeRequest(pathname) {
  return pathname.startsWith("/_next/webpack-hmr") || pathname.startsWith("/_next/static/development/");
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/");
    if (offline) return offline;
    return new Response("보팃을 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refreshed = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;

  const response = await refreshed;
  if (response) return response;

  return new Response("요청한 리소스를 불러오지 못했습니다.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (!isSameOrigin(url) || isApiRequest(url.pathname) || isNextRuntimeRequest(url.pathname)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (STATIC_CACHE_PATHS.has(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
