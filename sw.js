// Garde une copie de l'appli sur le téléphone pour qu'elle s'ouvre sans internet.
// Change le numéro de version quand on modifie un fichier de l'appli.
const VERSION = 'v18';
const FICHIERS = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/db.js', 'js/taxonomie.js', 'js/lieux.js', 'js/icones.js', 'js/sync.js', 'js/monde.js',
  'demande.html',
  'css/demande.css',
  'js/demande.js',
  'js/code-demande.js', 'js/installer.js', 'demande.webmanifest', 'icons/demande.svg', 'fonts/figtree.woff2', 'js/photos.js', 'contribuer.html', 'contribuer.webmanifest', 'css/contribuer.css', 'js/contribuer.js', 'js/exif.js',
  'generateur.html', 'studio/', 'studio/index.html', 'studio/manifest.webmanifest', 'css/generateur.css', 'css/client.css', 'js/generateur.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'manifest.webmanifest', 'icons/studio.svg', 'icons/studio-192.png', 'icons/studio-512.png', 'icons/icone.svg', 'icons/icone-192.png', 'icons/icone-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Réseau d'abord (pour avoir la dernière version), copie locale si pas d'internet.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((rep) => { const copie = rep.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); return rep; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
