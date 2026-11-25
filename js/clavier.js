// Le clavier du téléphone se ferme quand on veut :
// - en touchant n'importe où ailleurs que dans un champ (iPhone le laisse ouvert sinon) ;
// - avec la touche « OK / Terminé » du clavier (pas dans les grandes zones de texte, où elle fait une nouvelle ligne).
const CHAMP = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const ouvert = () => { const a = document.activeElement; return a && a !== document.body && a.matches?.(CHAMP) ? a : null; };

let depart = null;
document.addEventListener('pointerdown', (ev) => { depart = { x: ev.clientX, y: ev.clientY }; }, true);
document.addEventListener('pointerup', (ev) => {
  const a = ouvert();
  if (!a || !depart) return;
  const bouge = Math.abs(ev.clientX - depart.x) + Math.abs(ev.clientY - depart.y) > 10; // on faisait défiler
  depart = null;
  if (bouge) return;
  const cible = ev.target instanceof Element ? ev.target : null;
  if (!cible || cible.closest(CHAMP)) return;
  // Toucher l'étiquette d'un champ y met le curseur : on laisse faire.
  const etiquette = cible.closest('label');
  if (etiquette && (etiquette.control || etiquette.querySelector(CHAMP))) return;
  // Sur un bouton : on le laisse d'abord faire son travail, puis on ferme le clavier
  // (sauf si le bouton a mis le curseur dans un autre champ).
  if (cible.closest('button, a, [role="button"], summary')) setTimeout(() => { if (document.activeElement === a) a.blur(); }, 350);
  else a.blur();
}, true);

// Touche « OK » : on la montre comme « Terminé » et elle ferme le clavier.
document.addEventListener('focusin', (ev) => {
  const c = ev.target;
  if (c instanceof HTMLInputElement && !c.hasAttribute('enterkeyhint')) c.setAttribute('enterkeyhint', 'done');
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.isComposing || !(ev.target instanceof HTMLInputElement)) return;
  const c = ev.target;
  // La page fait d'abord ce qu'elle veut avec « Entrée » (ex. : choisir le premier pays trouvé), puis on ferme.
  setTimeout(() => { if (document.activeElement === c) c.blur(); }, 0);
});

// Pas de zoom en touchant deux fois vite au même endroit (texte, image, fond de page).
// Les boutons et les champs ne sont pas touchés ici : le CSS (touch-action) s'en occupe,
// et chaque toucher rapide sur + ou − compte bien.
let dernierToucher = 0;
document.addEventListener('touchend', (ev) => {
  const maintenant = Date.now();
  const cible = ev.target instanceof Element ? ev.target : null;
  const actif = cible?.closest(`${CHAMP}, button, a, label, [role="button"], summary, [data-appui], .leaflet-container`);
  if (!actif && ev.touches.length === 0 && ev.changedTouches.length === 1 && maintenant - dernierToucher < 350) ev.preventDefault();
  dernierToucher = maintenant;
}, { passive: false });
