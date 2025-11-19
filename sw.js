// ===============================
// SERVICE WORKER OFICIAL DE LA PWA
// -------------------------------
// No incluye Firebase
// No interfiere con OneSignal
// ===============================

// Cache name
const CACHE_NAME = "stock-supervisor-v1";

// Files to cache
const ASSETS = [
  "./",
  "index.html",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match("index.html"));
    })
  );
});

// Mensajes del frontend
self.addEventListener("message", (event) => {
  console.log("[SW] Mensaje recibido:", event.data);
});
