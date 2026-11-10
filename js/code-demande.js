// Transforme la fiche d'un client en un lien court (et l'inverse).
// Rien n'est envoyé sur internet : toutes les réponses sont dans le lien lui-même.

// Les envies proposées au client. Les premières correspondent aux catégories de l'appli,
// pour que le Studio compare « voulu » et « prévu » dans le voyage.
export const ENVIES = [
  ['visites', 'Culture et visites', 'landmark', 'Temples, musées, quartiers historiques'],
  ['restos', 'Gastronomie', 'utensils', 'Bons restos, cuisine de rue, marchés'],
  ['experiences', 'Expériences', 'sparkles', 'Cours de cuisine, spectacles, activités uniques'],
  ['sport', 'Sport et aventure', 'dumbbell', 'Randonnée, plongée, surf, vélo'],
  ['nuit', 'Vie nocturne', 'martini', 'Bars, rooftops, boîtes de nuit'],
  ['nature', 'Nature et plein air', 'mountain-snow', 'Parcs, montagnes, plages sauvages'],
  ['detente', 'Détente', 'sun', 'Plage, spa, onsen, journées tranquilles'],
];

const versBase64Url = (octets) => {
  let s = '';
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const depuisBase64Url = (t) => {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
};

async function transformer(octets, flux) {
  const rep = new Response(new Blob([octets]).stream().pipeThrough(flux));
  return new Uint8Array(await rep.arrayBuffer());
}

export async function encoder(demande) {
  const brut = new TextEncoder().encode(JSON.stringify(demande));
  if (typeof CompressionStream === 'undefined') return `j${versBase64Url(brut)}`;
  return `z${versBase64Url(await transformer(brut, new CompressionStream('deflate-raw')))}`;
}

export async function decoder(code) {
  const t = String(code || '').trim();
  const octets = depuisBase64Url(t.slice(1));
  const brut = t[0] === 'z' ? await transformer(octets, new DecompressionStream('deflate-raw')) : octets;
  const d = JSON.parse(new TextDecoder().decode(brut));
  if (!d || d.f !== 'demande') throw new Error('Ce lien ne contient pas de demande.');
  return d;
}

// Retrouve le code dans un lien complet ou dans un message collé.
export function extraireCode(texte) {
  const m = String(texte || '').match(/#\/demande\/([zj][A-Za-z0-9_-]+)/) || String(texte || '').match(/\b([zj][A-Za-z0-9_-]{40,})\b/);
  return m ? m[1] : null;
}

// Nombre de nuits entre deux dates (aaaa-mm-jj).
export function nuits(debut, fin) {
  if (!debut || !fin) return 0;
  return Math.max(0, Math.round((new Date(`${fin}T12:00:00`) - new Date(`${debut}T12:00:00`)) / 864e5));
}
