const CACHE = "blackjack-signal-v4";
const ASSETS = ["./", "index.html", "styles.css", "blackjack-engine.js", "app.js", "icon.svg", "manifest.webmanifest"];

// The service worker is only used when the app is served over http://localhost
// or a hosted site such as GitHub Pages. The macOS .app opens index.html as a
// local file, so it does not need this file to work offline.
self.addEventListener("install", (event) => {
  // Activate new versions immediately instead of waiting for all tabs to close.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => event.waitUntil(
  // Delete older caches so users do not get stuck on stale HTML/JS.
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode === "navigate" || request.destination === "document") {
    // HTML is network-first so updates appear quickly during development.
    // If offline, fall back to the cached document.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./")))
    );
    return;
  }
  // Static assets are cache-first for speed.
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
