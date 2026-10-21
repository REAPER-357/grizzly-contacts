// Grizzly Contacts service worker: offline shell + runtime caching of CDN assets
const CACHE = 'grizzly-contacts-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon.png', './small-icon.png'];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => Promise.all(SHELL.map(u => cache.add(u).catch(() => {})))).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return; // never touch webhook POSTs
    const url = new URL(req.url);
    const sameOrigin = url.origin === location.origin;
    const isCdn = /(^|\.)(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname);
    if (!sameOrigin && !isCdn) return;

    // Network first, fall back to cache, so updates arrive when online and the app still opens offline
    event.respondWith(
        fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
});
