// Envoi automatique entre le cellulaire et le Studio, par un dossier GitHub privé.
// Gratuit, sans nouveau compte : chaque endroit est un petit fichier, chaque photo aussi.
//   endroits/<id>.json      endroits de Raph (cellulaire)
//   villes/<id>.json        notes par ville (cellulaire)
//   photos/<id>.jpg         toutes les photos
//   contributions/<id>.json endroits des contributeurs (Studio)
//   studio/<magasin>.json   voyages, contributeurs, paiements (Studio)
// Si internet manque, les envois attendent et repartent tout seuls plus tard.

import * as db from './db.js';

const API = 'https://api.github.com';
const CLES_PRIVEES = ['sync', 'syncShas', 'syncFile', 'syncDernier'];
export const estCleSync = (cle) => CLES_PRIVEES.includes(cle);

let config = null;
let enCours = null;
const abonnes = new Set();

export async function lireConfig() {
  if (!config) config = await db.lireReglage('sync', null);
  return config && config.jeton && config.depot ? config : null;
}

export async function enregistrerConfig(depot, jeton) {
  config = { depot: nettoyerDepot(depot), jeton: String(jeton || '').trim() };
  await db.ecrireReglage('sync', config);
  await db.ecrireReglage('syncShas', {});
}

export async function oublierConfig() {
  config = null;
  await db.effacer('reglages', 'sync');
}

// Accepte « nom », « proprio/nom » ou l'adresse complète du dossier.
export function nettoyerDepot(t) {
  return String(t || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, '');
}

async function api(chemin, { methode = 'GET', corps, cfg } = {}) {
  const c = cfg || (await lireConfig());
  const rep = await fetch(`${API}${chemin}`, {
    method: methode,
    headers: {
      Authorization: `Bearer ${c.jeton}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
  let donnees = null;
  try { donnees = await rep.json(); } catch (_) { /* réponse vide */ }
  return { ok: rep.ok, statut: rep.status, donnees };
}

// Vérifie la clé et le dossier, et explique simplement ce qui ne va pas.
export async function tester(depot, jeton) {
  const cfg = { depot: nettoyerDepot(depot), jeton: String(jeton || '').trim() };
  if (!cfg.jeton) return { ok: false, message: 'Colle ta clé GitHub.' };
  if (!cfg.depot.includes('/')) {
    const moi = await api('/user', { cfg }).catch(() => null);
    if (!moi) return { ok: false, message: "Pas d'internet pour vérifier. Réessaie plus tard." };
    if (moi.statut === 401) return { ok: false, message: 'Cette clé ne marche pas. Vérifie que tu as copié toute la clé.' };
    if (moi.ok && moi.donnees?.login) cfg.depot = `${moi.donnees.login}/${cfg.depot}`;
  }
  let r;
  try { r = await api(`/repos/${cfg.depot}`, { cfg }); } catch (_) { return { ok: false, message: "Pas d'internet pour vérifier. Réessaie plus tard." }; }
  if (r.statut === 401) return { ok: false, message: 'Cette clé ne marche pas. Vérifie que tu as copié toute la clé.' };
  if (r.statut === 404) return { ok: false, message: `Dossier « ${cfg.depot} » introuvable, ou la clé n'y a pas accès.` };
  if (!r.ok) return { ok: false, message: `GitHub a répondu une erreur (${r.statut}). Réessaie dans un instant.` };
  if (r.donnees && r.donnees.private === false) return { ok: false, message: 'Ce dossier est public : tout le monde verrait tes notes privées. Utilise un dossier privé.' };
  if (r.donnees?.permissions && !r.donnees.permissions.push) return { ok: false, message: 'La clé peut lire mais pas écrire. Mets « Contents » à « Read and write ».' };
  return { ok: true, depot: cfg.depot };
}

// ---------- Encodage ----------
function octetsVersBase64(octets) {
  let s = '';
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}
function base64VersOctets(b64) {
  const s = atob(String(b64).replace(/\s/g, ''));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}
const texteVersBase64 = (t) => octetsVersBase64(new TextEncoder().encode(t));
const base64VersTexte = (b) => new TextDecoder().decode(base64VersOctets(b));

// ---------- File d'envoi ----------
// On note seulement le chemin du fichier à envoyer : au moment d'envoyer, on lit
// la version la plus récente (ou on efface le fichier si la chose n'existe plus).
export async function marquer(...chemins) {
  const file = await db.lireReglage('syncFile', []);
  for (const c of chemins.flat()) if (c && !file.includes(c)) file.push(c);
  await db.ecrireReglage('syncFile', file);
  envoyerBientot();
}
export const cheminEndroit = (e) => (e.contributeurId ? `contributions/${e.id}.json` : `endroits/${e.id}.json`);
export const cheminPhoto = (id) => `photos/${id}.jpg`;
export const cheminVille = (id) => `villes/${encodeURIComponent(id)}.json`;
export const cheminStudio = (magasin) => `studio/${magasin}.json`;

// Donne le contenu à envoyer pour un chemin (null = à effacer).
async function contenuPour(chemin) {
  const [dossier, fichier] = chemin.split('/');
  const id = decodeURIComponent(fichier.replace(/\.(json|jpg)$/, ''));
  if (dossier === 'photos') {
    const p = await db.lire('photos', id);
    return p ? octetsVersBase64(new Uint8Array(await p.blob.arrayBuffer())) : null;
  }
  if (dossier === 'endroits' || dossier === 'contributions') {
    const e = await db.lire('endroits', id);
    return e ? texteVersBase64(JSON.stringify(e, null, 1)) : null;
  }
  if (dossier === 'villes') {
    const v = await db.lire('villes', id);
    return v ? texteVersBase64(JSON.stringify(v, null, 1)) : null;
  }
  if (dossier === 'studio') {
    return texteVersBase64(JSON.stringify(await db.tous(id), null, 1));
  }
  return null;
}

let minuterie = null;
export function envoyerBientot(delai = 800) {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { envoyer().catch(() => {}); }, delai);
}

async function shaDistant(chemin) {
  const r = await api(`/repos/${config.depot}/contents/${chemin}`);
  return r.ok ? r.donnees.sha : null;
}

async function envoyerUn(chemin, shas) {
  const contenu = await contenuPour(chemin);
  if (contenu === null) {
    const sha = shas[chemin] || (await shaDistant(chemin));
    if (sha) {
      const r = await api(`/repos/${config.depot}/contents/${chemin}`, { methode: 'DELETE', corps: { message: `Retirer ${chemin}`, sha } });
      if (!r.ok && r.statut !== 404) throw new Error(`effacer ${r.statut}`);
    }
    delete shas[chemin];
    return;
  }
  const essai = (sha) => api(`/repos/${config.depot}/contents/${chemin}`, {
    methode: 'PUT', corps: { message: `${shas[chemin] ? 'Modifier' : 'Ajouter'} ${chemin}`, content: contenu, ...(sha ? { sha } : {}) },
  });
  let r = await essai(shas[chemin]);
  if (r.statut === 409 || r.statut === 422) r = await essai(await shaDistant(chemin));
  if (!r.ok) throw new Error(`envoyer ${r.statut}`);
  shas[chemin] = r.donnees.content.sha;
}

// Envoie tout ce qui attend, un fichier à la fois.
export async function envoyer() {
  if (enCours) return enCours;
  enCours = (async () => {
    if (!(await lireConfig()) || !navigator.onLine) return etat();
    const shas = await db.lireReglage('syncShas', {});
    let file = await db.lireReglage('syncFile', []);
    let erreur = null;
    while (file.length) {
      const chemin = file[0];
      try {
        await envoyerUn(chemin, shas);
      } catch (err) { erreur = err; break; }
      await db.ecrireReglage('syncShas', shas);
      // Relire la file : d'autres choses ont pu être ajoutées pendant l'envoi.
      file = (await db.lireReglage('syncFile', [])).filter((c) => c !== chemin);
      await db.ecrireReglage('syncFile', file);
      prevenir();
    }
    if (!erreur) await db.ecrireReglage('syncDernier', new Date().toISOString());
    return etat(erreur);
  })();
  try { return await enCours; } finally { enCours = null; prevenir(); }
}

// Va chercher ce qui a changé dans le dossier GitHub et l'ajoute ici.
// dossiers : ceux à lire (le cellulaire lit ses endroits ; le Studio lit tout).
export async function recevoir(dossiers = ['endroits', 'villes', 'photos', 'contributions', 'studio']) {
  if (!(await lireConfig()) || !navigator.onLine) return { nouveaux: 0 };
  const r = await api(`/repos/${config.depot}/git/trees/HEAD?recursive=1`);
  if (r.statut === 409 || r.statut === 404) return { nouveaux: 0 }; // dossier encore vide
  if (!r.ok) throw new Error(`lire ${r.statut}`);
  const shas = await db.lireReglage('syncShas', {});
  const file = new Set(await db.lireReglage('syncFile', []));
  let nouveaux = 0;
  const photosVoulues = [];
  for (const f of r.donnees.tree || []) {
    if (f.type !== 'blob') continue;
    const dossier = f.path.split('/')[0];
    if (!dossiers.includes(dossier) || file.has(f.path)) continue;
    if (shas[f.path] === f.sha) continue;
    if (dossier === 'photos') { photosVoulues.push(f); continue; }
    const b = await api(`/repos/${config.depot}/git/blobs/${f.sha}`);
    if (!b.ok) continue;
    let objet;
    try { objet = JSON.parse(base64VersTexte(b.donnees.content)); } catch (_) { continue; }
    if (dossier === 'studio') {
      const magasin = f.path.slice(7, -5);
      for (const x of Array.isArray(objet) ? objet : []) {
        const actuel = await db.lire(magasin, x.id);
        if (!actuel || (x.modifieLe || '') > (actuel.modifieLe || '')) await db.ecrire(magasin, x);
      }
    } else {
      const magasin = dossier === 'villes' ? 'villes' : 'endroits';
      const actuel = await db.lire(magasin, objet.id);
      if (!actuel || (objet.modifieLe || '') > (actuel.modifieLe || '')) {
        // Une décision prise dans le Studio (accepté, refusé) n'est jamais perdue.
        if (actuel?.statut && actuel.statut !== 'en_attente' && objet.statut === 'en_attente') objet.statut = actuel.statut;
        await db.ecrire(magasin, objet);
        if (!actuel) nouveaux++;
      }
    }
    shas[f.path] = f.sha;
  }
  for (const f of photosVoulues) {
    const id = f.path.slice(7, -4);
    if (!(await db.lire('photos', id))) {
      const b = await api(`/repos/${config.depot}/git/blobs/${f.sha}`);
      if (!b.ok) continue;
      await db.ecrire('photos', { id, blob: new Blob([base64VersOctets(b.donnees.content)], { type: 'image/jpeg' }) });
    }
    shas[f.path] = f.sha;
  }
  // Effacé ailleurs (ex. : endroit supprimé sur le cell) : on l'efface ici aussi.
  const presents = new Set((r.donnees.tree || []).map((f) => f.path));
  for (const chemin of Object.keys(shas)) {
    const dossier = chemin.split('/')[0];
    if (presents.has(chemin) || file.has(chemin) || !['endroits', 'villes', 'photos'].includes(dossier) || !dossiers.includes(dossier)) continue;
    const id = decodeURIComponent(chemin.slice(dossier.length + 1).replace(/\.(json|jpg)$/, ''));
    await db.effacer(dossier === 'villes' ? 'villes' : dossier === 'photos' ? 'photos' : 'endroits', id);
    delete shas[chemin];
  }
  await db.ecrireReglage('syncShas', shas);
  await db.ecrireReglage('syncDernier', new Date().toISOString());
  prevenir();
  return { nouveaux };
}

// Tout envoyer une première fois (après avoir branché le dossier).
export async function toutMarquer(magasins = ['endroits', 'villes']) {
  const chemins = [];
  if (magasins.includes('endroits')) {
    for (const e of await db.tous('endroits')) { chemins.push(cheminEndroit(e)); for (const p of e.photos || []) chemins.push(cheminPhoto(p)); }
  }
  if (magasins.includes('villes')) for (const v of await db.tous('villes')) chemins.push(cheminVille(v.id));
  for (const m of ['voyages', 'contributeurs', 'paiements']) if (magasins.includes(m)) chemins.push(cheminStudio(m));
  await marquer(chemins);
}

// État à afficher : branché ou non, nombre de fichiers en attente, dernière fois.
export async function etat(erreur = null) {
  const cfg = await lireConfig();
  const file = await db.lireReglage('syncFile', []);
  return { branche: !!cfg, depot: cfg?.depot, enAttente: file.length, dernier: await db.lireReglage('syncDernier', null), erreur: erreur ? String(erreur.message || erreur) : null, horsLigne: !navigator.onLine };
}

export function surChangement(fn) { abonnes.add(fn); return () => abonnes.delete(fn); }
function prevenir() { etat().then((e) => abonnes.forEach((fn) => { try { fn(e); } catch (_) { /* rien */ } })); }

window.addEventListener('online', () => envoyerBientot(200));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') envoyerBientot(500); });
