// Garde une copie de l'appli sur le téléphone pour qu'elle s'ouvre sans internet.
// Change le numéro de version quand on modifie un fichier de l'appli.
const VERSION = 'v62';
const FICHIERS = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/db.js', 'js/taxonomie.js', 'js/lieux.js', 'js/icones.js', 'js/sync.js', 'js/monde.js',
  'demande.html', 'js/contact.js',
  'css/demande.css',
  'js/demande.js', 'js/clavier.js', 'js/idees-pays.js', 'js/marque.js',
  'js/code-demande.js', 'js/autour.js', 'js/style-appli.js', 'css/themes.css',
  'fonts/cormorant-garamond.woff2', 'fonts/dm-sans.woff2', 'fonts/fraunces.woff2', 'fonts/inter.woff2', 'fonts/lora.woff2', 'fonts/manrope.woff2', 'fonts/nunito.woff2', 'fonts/outfit.woff2', 'fonts/playfair-display.woff2', 'fonts/plus-jakarta-sans.woff2', 'fonts/quicksand.woff2', 'fonts/space-grotesk.woff2', 'fonts/poppins-400.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2',
  'js/phrases.js', 'js/carte-contact.js', 'vendor/qrcode/qrcode.js', 'js/tirer.js', 'js/appel.js', 'js/installer.js', 'demande.webmanifest', 'icons/demande.svg', 'fonts/figtree.woff2', 'fonts/newsreader.woff2', 'js/photos.js', 'contribuer.html', 'contribuer.webmanifest', 'css/contribuer.css', 'js/contribuer.js', 'js/exif.js',
  'generateur.html', 'studio/', 'studio/index.html', 'studio/manifest.webmanifest', 'css/generateur.css', 'css/client.css', 'js/generateur.js', 'js/verification.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'carnet.html', 'carnet.webmanifest', 'css/carnet.css', 'js/carnet.js', 'js/carnets.js', 'js/carnet-commun.js', 'js/carnet-demo.js', 'js/accueil.js', 'js/a-venir.js', 'css/a-venir.css', 'js/liens-demande.js', 'js/essai.js', 'icons/carnet.svg', 'icons/carnet-192.png', 'icons/carnet-512.png',
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
