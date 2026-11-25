// Carnet « voyage sur mesure » en direct : ce qui sert à la fois
//   - à l'appli de Raph (cellulaire) qui publie le carnet,
//   - à la page du client (carnet.html) qui le lit,
// Aucun service payant : GitHub (gratuit) garde les fichiers, chiffrés.
//
// Comment seul le client peut voir son carnet :
//   Le carnet et ses photos sont chiffrés (AES-256, le même chiffrement que les banques)
//   avec une clé tirée au hasard. Cette clé est seulement dans le lien du client,
//   après le « # » : un navigateur n'envoie jamais cette partie à internet.
//   Sur GitHub, il n'y a donc que du charabia illisible.

// Où sont publiés les carnets chiffrés : une branche à part du dossier public de l'appli.
// (Le site ne change pas : cette branche sert seulement à garder les carnets.)
export { DEPOT_PUBLIC as DEPOT_CARNETS } from './marque.js';
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

// Le canal où un formulaire de demande dépose la demande du client (chiffrée avec la clé de son lien).
export async function canalDemande(id, cle) {
  const h = new Uint8Array(await subtil().digest('SHA-256', new TextEncoder().encode(`demande|${id}|${cle}`)));
  return `pd${[...h.subarray(0, 12)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// ---------- Adresses des fichiers publiés ----------
export const cheminPublic = (id, fichier = 'c') => `carnets/${id}/${fichier}.bin`;
export const urlPublique = (id, fichier = 'c', depot = DEPOT_CARNETS) => `https://raw.githubusercontent.com/${depot}/${BRANCHE_CARNETS}/${cheminPublic(id, fichier)}`;

// Lien à donner au client : il ouvre sa propre petite appli « Mon voyage » (séparée de l'appli de Raph).
// La clé est après le « # » : elle ne quitte jamais son téléphone.
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

// ---------- Les choix du soir ----------
// Chaque soir, le client choisit 1 hôtel, 1 resto et 1 activité parmi les trouvailles de Raph.
export const GROUPES_CHOIX = {
  dormir: { cats: ['hebergement'], titre: 'Où dormir', court: 'Hôtel', ico: 'bed-double' },
  manger: { cats: ['restos'], titre: 'Où manger', court: 'Resto', ico: 'utensils' },
  faire: { cats: ['visites', 'experiences', 'sport', 'nuit'], titre: 'Activités', court: 'Activité', ico: 'sparkles' },
  // Les bars : avec les activités, sauf si Raph leur donne leur propre section dans les réglages du client.
  sortir: { cats: ['nuit'], titre: 'Où sortir', court: 'Bar', ico: 'martini' },
};
export const groupeDeCategorie = (cat) => Object.keys(GROUPES_CHOIX).find((g) => GROUPES_CHOIX[g].cats.includes(cat)) || 'savoir';

// Tous les choix du client, soir par soir : [{ quand, groupe, itemId }] (itemId = 'aucun' s'il n'a rien aimé).
export function choixRetenus(carnet) {
  const soirs = carnet?.choix?.soirs || {};
  return Object.keys(soirs).sort().flatMap((quand) => Object.keys(GROUPES_CHOIX).filter((g) => soirs[quand][g]).map((g) => ({ quand, groupe: g, itemId: soirs[quand][g] })));
}
// Les endroits choisis par le client : ils doivent être dans son voyage, à 100 %.
export function endroitsChoisis(carnet) {
  const ids = new Set();
  for (const r of choixRetenus(carnet)) {
    const it = carnet.items?.find((i) => i.id === r.itemId);
    if (it) ids.add(it.endroitId);
  }
  return ids;
}

// ---------- L'envoi automatique, selon les réglages du client ----------
// Raph sauvegarde ses endroits pendant le repérage ; ils attendent dans une file, dans l'ordre.
// À chaque envoi (19 h par défaut, les jours choisis), on prend les suivants de la file :
// tant d'hôtels, tant de restos, tant d'activités (3 par défaut). Le reste part aux envois suivants.
// Un endroit déjà envoyé ne bouge plus jamais.
export const QUOTAS_DEFAUT = { dormir: 3, manger: 3, faire: 3, sortir: 0 };
export const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6]; // 0 = dimanche
export const NOMS_JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function reglagesEnvoi(c) {
  const jours = (c?.envoi?.jours || []).filter((j) => TOUS_LES_JOURS.includes(j));
  return {
    quotas: { ...QUOTAS_DEFAUT, ...(c?.envoi?.quotas || {}) },
    jours: jours.length ? jours : TOUS_LES_JOURS,
    heure: c?.heure ?? HEURE_PAR_DEFAUT,
    fuseau: c?.fuseau || FUSEAU_PAR_DEFAUT,
  };
}
// Le groupe d'un endroit pour ce client (les bars ont leur section seulement si Raph l'a demandé).
export function groupePour(cat, quotas = QUOTAS_DEFAUT) {
  if (cat === 'nuit' && quotas.sortir > 0) return 'sortir';
  return groupeDeCategorie(cat);
}
// Envoyé = son heure est passée. Un endroit sans heure attend dans la réserve.
export const estEnvoye = (i, maintenant = Date.now()) => !!i.livraison && new Date(i.livraison).getTime() <= +maintenant;

// Les prochaines heures d'envoi, en sautant les jours non choisis.
export function prochainsEnvois(apres, reglages, combien) {
  const liste = [];
  let t = new Date(apres);
  for (let k = 0; liste.length < combien && k < 400; k++) {
    const l = prochaineLivraison(t, reglages.heure, reglages.fuseau);
    const p = partiesLocales(l, reglages.fuseau);
    if (reglages.jours.includes(new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay())) liste.push(l);
    t = new Date(l.getTime() + 60000);
  }
  return liste;
}

// Donne à chaque endroit pas encore envoyé son heure d'envoi. catDe(item) → catégorie de l'endroit.
export function planifier(c, catDe, maintenant = new Date()) {
  const r = reglagesEnvoi(c);
  const parGroupe = {};
  const savoir = [];
  for (const i of c.items) {
    if (estEnvoye(i, maintenant)) continue;
    const g = groupePour(catDe(i), r.quotas);
    if (g === 'savoir') savoir.push(i); else (parGroupe[g] ||= []).push(i);
  }
  let besoin = 1;
  for (const [g, liste] of Object.entries(parGroupe)) if (r.quotas[g] > 0) besoin = Math.max(besoin, Math.ceil(liste.length / r.quotas[g]));
  const envois = prochainsEnvois(maintenant, r, Math.min(besoin, 120));
  for (const [g, liste] of Object.entries(parGroupe)) {
    const q = r.quotas[g];
    liste.forEach((i, k) => { i.livraison = q > 0 && envois[Math.floor(k / q)] ? envois[Math.floor(k / q)].toISOString() : null; });
  }
  for (const i of savoir) i.livraison = envois[0] ? envois[0].toISOString() : null;
  return envois;
}
