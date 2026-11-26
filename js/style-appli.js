// Le style de l'appli (Réglages > Apparence) : 10 styles + Classique, en clair, sombre ou auto.
// Gardé sur le téléphone ; appliqué tout de suite au démarrage (voir le petit script dans index.html).

export const STYLES = [
  { n: 0, nom: 'Classique', police: 'Figtree', clair: ['#ffffff', '#f0532f', '#1d1d1f'], sombre: ['#121212', '#ff6a47', '#f2f2f4'] },
  { n: 1, nom: 'Sable et terracotta', police: 'Fraunces', clair: ['#f6efe4', '#c4532d', '#2b2118'], sombre: ['#1a1511', '#e08462', '#f3f1ec'] },
  { n: 2, nom: 'Océan', police: 'DM Sans', clair: ['#f3f7fb', '#1565a8', '#0e2a3f'], sombre: ['#0b1622', '#5ea3e0', '#f3f1ec'] },
  { n: 3, nom: 'Nuit dorée', police: 'Playfair Display', clair: ['#faf7f0', '#9a7430', '#1b1a22'], sombre: ['#0d1424', '#e0c086', '#f3f1ec'] },
  { n: 4, nom: 'Jungle', police: 'Outfit', clair: ['#f2f7f1', '#1f8a4c', '#13261a'], sombre: ['#0c1510', '#54bd82', '#f3f1ec'] },
  { n: 5, nom: 'Noir et blanc', police: 'Space Grotesk', clair: ['#ffffff', '#0a0a0a', '#0a0a0a'], sombre: ['#000000', '#f4f4f4', '#f3f1ec'] },
  { n: 6, nom: 'Lavande', police: 'Plus Jakarta Sans', clair: ['#f6f4fc', '#6d4fd8', '#231d3a'], sombre: ['#121022', '#a38df3', '#f3f1ec'] },
  { n: 7, nom: 'Coucher de soleil', police: 'Poppins', clair: ['#fff8f4', '#e8467c', '#2e1a22'], sombre: ['#170d12', '#f37ea3', '#f3f1ec'] },
  { n: 8, nom: 'Méditerranée', police: 'Cormorant Garamond', clair: ['#fbfaf6', '#1d6fb8', '#13304a'], sombre: ['#0b1520', '#6ba8df', '#f3f1ec'] },
  { n: 9, nom: 'Forêt du Nord', police: 'Lora', clair: ['#f4f1e8', '#2f6b45', '#1a2a20'], sombre: ['#0f1a14', '#e7b871', '#f3f1ec'] },
  { n: 10, nom: 'Rose poudré', police: 'Quicksand', clair: ['#fdf6f6', '#c9566b', '#3a2326'], sombre: ['#170e10', '#e692a2', '#f3f1ec'] },
];
export const MODES = [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']];

const lire = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* rien */ } };

export const styleActuel = () => { const n = parseInt(lire('av-style', '0'), 10); return STYLES.some((s) => s.n === n) ? n : 0; };
export const modeActuel = () => { const m = lire('av-theme', 'auto'); return MODES.some(([k]) => k === m) ? m : 'auto'; };
export const estSombre = () => { const m = modeActuel(); return m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };

// La barre du haut de l'iPhone prend la couleur du fond.
export function couleurBarre() {
  const fond = getComputedStyle(document.documentElement).getPropertyValue('--fond').trim() || (estSombre() ? '#121212' : '#ffffff');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.removeAttribute('media'); m.content = fond; });
}

export function appliquer(style = styleActuel(), mode = modeActuel(), { enFondu = false } = {}) {
  const html = document.documentElement;
  ecrire('av-style', String(style)); ecrire('av-theme', mode);
  if (enFondu) { html.classList.add('change-style'); setTimeout(() => html.classList.remove('change-style'), 450); }
  if (style) html.dataset.style = String(style); else delete html.dataset.style;
  if (mode === 'auto') delete html.dataset.theme; else html.dataset.theme = mode;
  couleurBarre();
}

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => couleurBarre());
