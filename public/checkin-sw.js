// Service worker for the organiser check-in page only, on the organiser domain (organizer.<site>/<org>/events/<event>/checkin).
// It lets a phone that has opened the page online open it again with no network: the page
// is network-first with the last good copy as fallback, and Next's hashed static files are cache-first.
// Everything else, including server actions, goes straight to the network.
const CACHE = "kao-checkin-v2";
const CHECKIN_PAGE = /^\/[^/]+\/events\/[^/]+\/checkin\/?$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kao-checkin-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page lists what it loaded before this worker was in control, so the first visit is enough.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => {
    const url = new URL(u, self.location.origin);
    return url.origin === self.location.origin && (CHECKIN_PAGE.test(url.pathname) || url.pathname.startsWith("/_next/static/"));
  });
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        urls.map((u) =>
          fetch(u)
            .then((response) => (response.ok && !response.redirected ? cache.put(u, response) : undefined))
            .catch(() => {}),
        ),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && CHECKIN_PAGE.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // A redirect means signed out (login page) or no access: never keep that as the check-in page.
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(() => caches.match(url.pathname).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
