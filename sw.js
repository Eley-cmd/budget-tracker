const CACHE_NAME = 'ledger-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/style.css',
    '/js/auth.js',
    '/js/storage.js',
    '/js/charts.js',
    '/js/dashboard.js',
    '/js/chart.min.js',
    '/manifest.json'
];

// Install Event: Sine-save ang files sa phone memory
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event: Dito kinukuha ang files kapag offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});