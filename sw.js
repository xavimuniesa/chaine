// Service worker de l'app PRS 516
// - L'app (HTML, manifest, icones) queda desada perquè s'obri sense connexió.
// - La pàgina es demana primer a la xarxa, així les actualitzacions arriben
//   de seguida; si no hi ha connexió, es fa servir la còpia desada.
// - Les APIs externes (Open-Meteo, Generalitat, BigDataCloud) no es toquen:
//   sempre van a la xarxa i l'app ja té la seva pròpia memòria per als festius.
// Canvia CACHE_VERSION quan modifiquis els fitxers per forçar una còpia nova.

const CACHE_VERSION = 'prs516-v16';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // APIs externes: sempre xarxa

  // Pàgina: primer xarxa, si falla la còpia desada
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Icones i manifest: còpia desada a l'instant i actualització en segon pla
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
