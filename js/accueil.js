// Les applis installées rouvrent sur leur page d'accueil, pas sur la dernière page laissée ouverte.
// - Ouverte depuis l'écran d'accueil : on part de l'accueil.
// - Revenue après plus de 15 minutes en arrière-plan : on retourne à l'accueil.
// Sauf sur une page où on est en train d'écrire (« garder »), pour ne rien perdre.

const PAUSE = 15 * 60 * 1000;
const installee = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const page = () => (location.hash || '#/').split('/')[1] || '';

export function rouvrirALAccueil({ garder = [] } = {}) {
  const nav = performance.getEntriesByType?.('navigation')[0];
  if (installee() && nav?.type !== 'reload' && location.hash && !garder.includes(page())) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  let cacheeLe = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { cacheeLe = Date.now(); return; }
    if (cacheeLe && Date.now() - cacheeLe > PAUSE && location.hash && !garder.includes(page())) location.hash = '#/';
  });
}
