// Carnet « voyage sur mesure » en direct : ce qui sert à la fois
//   - à l'appli de Raph (cellulaire) qui publie le carnet,
//   - à la page du client (carnet.html) qui le lit,
//   - à l'envoi automatique du soir (GitHub, chaque heure).
// Aucun service payant : GitHub (gratuit) garde les fichiers, chiffrés.
//
// Comment seul le client peut voir son carnet :
//   Le carnet et ses photos sont chiffrés (AES-256, le même chiffrement que les banques)
//   avec une clé tirée au hasard. Cette clé est seulement dans le lien du client,
//   après le « # » : un navigateur n'envoie jamais cette partie à internet.
//   Sur GitHub, il n'y a donc que du charabia illisible.

// Où sont publiés les carnets chiffrés : une branche à part du dossier public de l'appli.
// (Le site ne change pas : cette branche sert seulement à garder les carnets.)
export const DEPOT_CARNETS = 'raphaelstlaurent67-svg/Appli-voyage';
export const BRANCHE_CARNETS = 'carnets';
// Le petit service gratuit (sans compte) par lequel les choix du client reviennent à Raph.
// Ce qui y passe est chiffré avec la même clé : illisible pour tout le monde sauf Raph.
export const RELAIS = 'https://ntfy.sh';

export const HEURE_PAR_DEFAUT = 19;
export const FUSEAU_PAR_DEFAUT = 'America/Toronto'; // heure de Montréal

const subtil = () => globalThis.crypto.subtle;

// ---------- Petits outils ----------
export function enBase64Url(octets) {
  const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deBase64Url(t) {
  const b = String(t).replace(/-/g, '+').replace(/_/g, '/');
  const s = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}
export const idCourt = () => enBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(9))); // 12 caractères

// ---------- Chiffrement ----------
export const nouvelleCle = () => enBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));

const clesImportees = new Map();
function importer(cle) {
  if (!clesImportees.has(cle)) clesImportees.set(cle, subtil().importKey('raw', deBase64Url(cle), 'AES-GCM', false, ['encrypt', 'decrypt']));
  return clesImportees.get(cle);
}

// Renvoie [12 octets au hasard][données chiffrées].
export async function chiffrer(cle, octets) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await subtil().encrypt({ name: 'AES-GCM', iv }, await importer(cle), octets));
  const tout = new Uint8Array(12 + c.length);
  tout.set(iv);
  tout.set(c, 12);
  return tout;
}
export async function dechiffrer(cle, tout) {
  const o = tout instanceof Uint8Array ? tout : new Uint8Array(tout);
  return new Uint8Array(await subtil().decrypt({ name: 'AES-GCM', iv: o.subarray(0, 12) }, await importer(cle), o.subarray(12)));
}
export const chiffrerJson = async (cle, objet) => chiffrer(cle, new TextEncoder().encode(JSON.stringify(objet)));
export const dechiffrerJson = async (cle, octets) => JSON.parse(new TextDecoder().decode(await dechiffrer(cle, octets)));

// Le « canal » où le client dépose ses choix. On ne peut pas le deviner sans la clé.
export async function canalChoix(id, cle) {
  const h = new Uint8Array(await subtil().digest('SHA-256', new TextEncoder().encode(`choix|${id}|${cle}`)));
  return `pv${[...h.subarray(0, 12)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// ---------- Adresses des fichiers publiés ----------
export const cheminPublic = (id, fichier = 'c') => `carnets/${id}/${fichier}.bin`;
export const urlPublique = (id, fichier = 'c', depot = DEPOT_CARNETS) => `https://raw.githubusercontent.com/${depot}/${BRANCHE_CARNETS}/${cheminPublic(id, fichier)}`;

// Lien à donner au client. La clé est après le « # » : elle ne quitte jamais son téléphone.
export function lienClient(base, id, cle) {
  return `${base.replace(/[^/]*$/, '')}carnet.html?c=${encodeURIComponent(id)}#${cle}`;
}

// ---------- Heures et fuseaux ----------
function partiesLocales(date, fuseau) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).filter((x) => x.type !== 'literal').map((x) => [x.type, +x.value]));
  return p;
}
function decalage(date, fuseau) {
  const p = partiesLocales(date, fuseau);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}
// L'instant où il est « a/m/j h:00 » dans ce fuseau.
function instantLocal(a, m, j, h, fuseau) {
  const devine = Date.UTC(a, m - 1, j, h, 0, 0);
  let t = devine - decalage(new Date(devine), fuseau);
  t = devine - decalage(new Date(t), fuseau); // une 2e fois pour les changements d'heure
  return new Date(t);
}

// Livraison d'aujourd'hui (dans le fuseau du client), même si elle est déjà passée.
export function livraisonDuJour(maintenant, heure = HEURE_PAR_DEFAUT, fuseau = FUSEAU_PAR_DEFAUT) {
  const p = partiesLocales(maintenant, fuseau);
  return instantLocal(p.year, p.month, p.day, heure, fuseau);
}

// Prochaine livraison après « apres » : ce soir à 19 h, ou demain si 19 h est passé.
export function prochaineLivraison(apres, heure = HEURE_PAR_DEFAUT, fuseau = FUSEAU_PAR_DEFAUT) {
  const t = livraisonDuJour(apres, heure, fuseau);
  if (t > apres) return t;
  const demain = new Date(apres.getTime() + 24 * 3600 * 1000);
  return livraisonDuJour(demain, heure, fuseau);
}

export const formatHeure = (h) => `${h} h`;

// Une date lisible dans le fuseau du client (« mardi 14 novembre »).
export function dateLongue(date, fuseau = FUSEAU_PAR_DEFAUT, langue = 'fr-CA') {
  return new Date(date).toLocaleDateString(langue, { timeZone: fuseau, weekday: 'long', day: 'numeric', month: 'long' });
}
export function jourLocal(date, fuseau = FUSEAU_PAR_DEFAUT) {
  const p = partiesLocales(new Date(date), fuseau);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// ---------- Le mot du soir (écrit tout seul, sans IA payante) ----------
// Des phrases modèles, choisies selon ce que Raph a trouvé dans la journée.
// Le même texte sert dans la page du client et dans le courriel de 19 h.

const NOMS_CAT = {
  hebergement: ['un endroit où dormir', 'endroits où dormir'],
  restos: ['une table', 'tables'],
  visites: ['une visite', 'visites'],
  experiences: ['une expérience', 'expériences'],
  sport: ['une activité', 'activités'],
  nuit: ['un bar', 'bars'],
  trajets: ['un trajet', 'trajets'],
  autre: ['une trouvaille', 'trouvailles'],
};
const CHIFFRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const nombreEnLettres = (n, feminin) => (n === 1 ? (feminin ? 'une' : 'un') : CHIFFRES[n] || String(n));
const FEMININ = { restos: true, visites: true, experiences: true, sport: true, autre: true, hebergement: false, nuit: false, trajets: false };

function morceauCat(cat, n) {
  const [un, plusieurs] = NOMS_CAT[cat] || NOMS_CAT.autre;
  if (n === 1) return un;
  return `${nombreEnLettres(n, FEMININ[cat])} ${plusieurs}`;
}
function joindre(liste) {
  if (liste.length <= 1) return liste.join('');
  return `${liste.slice(0, -1).join(', ')} et ${liste[liste.length - 1]}`;
}
// Petit hasard stable : le même soir donne toujours le même texte.
function graine(texte) {
  let h = 2166136261;
  for (const c of String(texte)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
const choisir = (liste, g) => liste[g % liste.length];

const ORDRE = ['hebergement', 'restos', 'visites', 'experiences', 'nuit', 'sport', 'trajets', 'autre'];

// items : ceux livrés ce soir ; carnet : { prenom, raph, ville } ; numero : 1er soir, 2e soir…
export function motDuSoir(items, { prenom = '', raph = 'Raph', ville = '', numero = 1, cle = '' } = {}) {
  if (!items.length) return { titre: '', texte: '' };
  const g = graine(`${cle}|${numero}|${items.map((i) => i.id).join(',')}`);
  const compte = {};
  for (const i of items) compte[i.categorie || 'autre'] = (compte[i.categorie || 'autre'] || 0) + 1;
  const cats = ORDRE.filter((c) => compte[c]);
  const liste = joindre(cats.map((c) => morceauCat(c, compte[c])));
  const coeur = items.find((i) => i.coupDeCoeur);
  const hotels = compte.hebergement || 0;
  const salut = prenom ? `${prenom}, ` : '';
  const ici = ville ? ` à ${ville}` : '';

  const titres = numero === 1
    ? ['Le premier soir de ton carnet', 'Ton carnet s’ouvre ce soir', 'Premières trouvailles']
    : ['Les trouvailles de ce soir', 'Ce soir dans ton carnet', 'Livraison du soir', 'Nouvelles du terrain'];
  const ouvertures = [
    `${salut}aujourd’hui, ${raph} a marché${ici} pour toi.`,
    `${salut}${raph} revient du terrain${ici}.`,
    `${salut}nouvelle journée de repérage${ici}.`,
    `${salut}${raph} a poussé quelques portes${ici} aujourd’hui.`,
  ];
  const milieux = [
    `Au menu ce soir : ${liste}.`,
    `Il te rapporte ${liste}.`,
    `Dans ton carnet ce soir : ${liste}.`,
  ];
  let fin;
  if (coeur) fin = choisir([`Son coup de cœur : ${coeur.nom}.`, `Un endroit l’a vraiment marqué : ${coeur.nom}.`, `Garde un œil sur ${coeur.nom} : c’est son coup de cœur.`], g >> 3);
  else if (hotels > 1) fin = choisir(['Pour dormir, choisis ton préféré quand tu veux, rien ne presse.', 'Plusieurs options pour dormir : prends ton temps pour choisir.'], g >> 3);
  else fin = choisir(['Regarde quand tu as le temps, et garde ce qui te fait envie.', 'Un ❤ sur ce qui te plaît, c’est tout. Rien ne presse.', 'Prends ton temps : tes ❤ aident à bâtir ton voyage.'], g >> 3);

  return { titre: choisir(titres, g >> 5), texte: `${choisir(ouvertures, g)} ${choisir(milieux, g >> 2)} ${fin}` };
}

// Combien de choses, en mots (« 3 endroits où dormir, 2 tables »), pour l'aperçu « en route ».
export function resumeCompte(items) {
  const compte = {};
  for (const i of items) compte[i.categorie || 'autre'] = (compte[i.categorie || 'autre'] || 0) + 1;
  return joindre(ORDRE.filter((c) => compte[c]).map((c) => (compte[c] === 1 ? NOMS_CAT[c][0] : `${compte[c]} ${NOMS_CAT[c][1]}`)));
}
