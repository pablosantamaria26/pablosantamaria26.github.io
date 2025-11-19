/****************************************************
 * SW.JS — PWA Offline + Cache Inteligente
 * Version Final 2025
 ****************************************************/

const CACHE_NAME = "stock-supervisor-v3";
const ASSETS = [
    "./",
    "index.html",
    "app.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png"
];

// INSTALAR
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// ACTIVAR
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(k => k !== CACHE_NAME && caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// FETCH — cache first
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then(cacheRes =>
            cacheRes ||
            fetch(event.request).catch(() => caches.match("index.html"))
        )
    );
});
