// Côté Raph (cellulaire) : publier le carnet du client et récupérer ses choix.
// Le carnet complet (avec la clé et le courriel du client) reste dans le dossier GitHub privé.
// Ce qui va dans le dossier public est chiffré : seul le lien du client permet de le lire.

import * as db from './db.js';
import * as sync from './sync.js';
import {
  DEPOT_CARNETS, BRANCHE_CARNETS, RELAIS, HEURE_PAR_DEFAUT, FUSEAU_PAR_DEFAUT,
  idCourt, nouvelleCle, chiffrer, chiffrerJson, dechiffrerJson, deBase64Url, enBase64Url, canalChoix, cheminPublic, prochaineLivraison, lienClient,
} from './carnet-commun.js';

const API = 'https://api.github.com';

export function nouveauCarnet({ prenom = '', ville = '', pays = '' } = {}) {
  const maintenant = new Date().toISOString();
  return {
    id: idCourt(),
    cle: nouvelleCle(),
    client: { prenom, courriel: '' },
    raph: 'Raph',
    ville, pays,
    debut: '', fin: '',
    mot: '',
    heure: HEURE_PAR_DEFAUT,
    fuseau: FUSEAU_PAR_DEFAUT,
    courrielSoir: true,
    actif: true,
    items: [],
    choix: null,
    publication: { photos: {}, publieLe: null, erreur: null },
    creeLe: maintenant,
    modifieLe: maintenant,
  };
}

export const lien = (c) => lienClient(location.href.split('#')[0].split('?')[0], c.id, c.cle);
export const carnetActif = async () => {
  const id = await db.lireReglage('carnetActif', null);
  const c = id ? await db.lire('carnets', id) : null;
  return c && c.actif ? c : null;
};

// Ajoute un endroit au carnet. Il sera livré au client à la prochaine heure de livraison.
export function ajouterItem(c, endroitId, mot = '') {
  const deja = c.items.find((i) => i.endroitId === endroitId);
  if (deja) { deja.mot = mot || deja.mot; return deja; }
  const maintenant = new Date();
  const item = { id: idCourt(), endroitId, mot, ajouteLe: maintenant.toISOString(), livraison: prochaineLivraison(maintenant, c.heure, c.fuseau).toISOString() };
  c.items.push(item);
  return item;
}

export async function enregistrer(c) {
  c.modifieLe = new Date().toISOString();
  await db.ecrire('carnets', c);
  sync.marquer(sync.cheminCarnet(c.id));
  publierBientot(c.id);
}

// ---------- Publication ----------
// Ce que le client reçoit : jamais les notes privées, jamais le téléphone perso de Raph.
function versClient(c, endroits) {
  const items = [];
  for (const it of c.items) {
    const e = endroits.find((x) => x.id === it.endroitId);
    if (!e) continue;
    items.push({
      id: it.id,
      categorie: e.categorie, type: e.type, sousType: e.sousType,
      nom: e.nom, ville: e.ville, pays: e.pays, adresse: e.adresse,
      description: e.description, mot: it.mot,
      prix: e.prix, confort: e.confort, montant: e.montant, devise: e.devise,
      coupDeCoeur: !!e.coupDeCoeur,
      lat: e.lat, lng: e.lng, lienMaps: e.lienMaps,
      site: e.contacts?.site || e.contacts?.reservation || '', instagram: e.contacts?.instagram || '',
      depart: e.depart, arrivee: e.arrivee, duree: e.duree,
      photos: (e.photos || []).slice(0, 6),
      livraison: it.livraison,
    });
  }
  return {
    v: 1, id: c.id,
    prenom: c.client?.prenom || '', raph: c.raph || 'Raph',
    ville: c.ville, pays: c.pays, debut: c.debut, fin: c.fin, mot: c.mot,
    heure: c.heure, fuseau: c.fuseau, actif: c.actif,
    misAJour: new Date().toISOString(),
    items,
  };
}

async function api(jeton, chemin, { methode = 'GET', corps } = {}) {
  const rep = await fetch(`${API}${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
  let donnees = null;
  try { donnees = await rep.json(); } catch (_) { /* vide */ }
  return { ok: rep.ok, statut: rep.status, donnees };
}

const EXPLICATION_CLE = "Ta clé GitHub n'a pas encore le droit d'écrire dans le dossier de l'appli. Sur github.com : Settings > Developer settings > Fine-grained tokens > ta clé > ajoute le dossier « Appli-voyage » (Contents : Read and write).";

// La branche « carnets » est créée la première fois, vide (le site ne change pas).
async function assurerBranche(jeton) {
  const b = await api(jeton, `/repos/${DEPOT_CARNETS}/branches/${BRANCHE_CARNETS}`);
  if (b.ok) return;
  if (b.statut !== 404) throw new Error(b.statut === 401 || b.statut === 403 ? EXPLICATION_CLE : `GitHub ${b.statut}`);
  const arbre = await api(jeton, `/repos/${DEPOT_CARNETS}/git/trees`, { methode: 'POST', corps: { tree: [{ path: 'LISEZMOI.md', mode: '100644', type: 'blob', content: 'Carnets clients chiffrés. Illisibles sans le lien du client.\n' }] } });
  if (!arbre.ok) throw new Error(arbre.statut === 403 || arbre.statut === 404 ? EXPLICATION_CLE : `GitHub ${arbre.statut}`);
  const commit = await api(jeton, `/repos/${DEPOT_CARNETS}/git/commits`, { methode: 'POST', corps: { message: 'Carnets clients', tree: arbre.donnees.sha, parents: [] } });
  if (!commit.ok) throw new Error(`GitHub ${commit.statut}`);
  const ref = await api(jeton, `/repos/${DEPOT_CARNETS}/git/refs`, { methode: 'POST', corps: { ref: `refs/heads/${BRANCHE_CARNETS}`, sha: commit.donnees.sha } });
  if (!ref.ok && ref.statut !== 422) throw new Error(`GitHub ${ref.statut}`);
}

async function deposer(jeton, chemin, octets, message) {
  const url = `/repos/${DEPOT_CARNETS}/contents/${chemin}`;
  const contenu = btoa(Array.from(octets, (x) => String.fromCharCode(x)).join(''));
  const essai = (sha) => api(jeton, url, { methode: 'PUT', corps: { message, content: contenu, branch: BRANCHE_CARNETS, ...(sha ? { sha } : {}) } });
  let r = await essai();
  if (r.statut === 409 || r.statut === 422) {
    const actuel = await api(jeton, `${url}?ref=${BRANCHE_CARNETS}`);
    r = await essai(actuel.ok ? actuel.donnees.sha : undefined);
  }
  if (!r.ok) throw new Error(r.statut === 403 || r.statut === 404 ? EXPLICATION_CLE : `GitHub ${r.statut}`);
}

const enCours = new Map();
const minuteries = new Map();
const abonnes = new Set();
export const surPublication = (fn) => { abonnes.add(fn); return () => abonnes.delete(fn); };
const prevenir = (c) => abonnes.forEach((fn) => { try { fn(c); } catch (_) { /* rien */ } });

export function publierBientot(id, delai = 1500) {
  clearTimeout(minuteries.get(id));
  minuteries.set(id, setTimeout(() => { publier(id).catch(() => {}); }, delai));
}

export async function publier(id) {
  if (enCours.has(id)) return enCours.get(id);
  const travail = (async () => {
    const c = await db.lire('carnets', id);
    if (!c) return null;
    const cfg = await sync.lireConfig();
    c.publication = c.publication || { photos: {} };
    if (!cfg) { c.publication.erreur = "Branche d'abord l'envoi automatique (Réglages) : c'est lui qui met le carnet en ligne."; await db.ecrire('carnets', c); prevenir(c); return c; }
    if (!navigator.onLine) { c.publication.erreur = 'hors-ligne'; await db.ecrire('carnets', c); prevenir(c); return c; }
    try {
      await assurerBranche(cfg.jeton);
      const endroits = await db.tous('endroits');
      const donnees = versClient(c, endroits);
      // Les photos d'abord (une seule fois chacune), puis le carnet.
      for (const it of donnees.items) {
        for (const p of it.photos) {
          if (c.publication.photos[p]) continue;
          const photo = await db.lire('photos', p);
          if (!photo) continue;
          await deposer(cfg.jeton, cheminPublic(c.id, p), await chiffrer(c.cle, new Uint8Array(await photo.blob.arrayBuffer())), 'Photo');
          c.publication.photos[p] = true;
          prevenir(c);
        }
      }
      await deposer(cfg.jeton, cheminPublic(c.id), await chiffrerJson(c.cle, donnees), 'Carnet');
      c.publication.publieLe = new Date().toISOString();
      c.publication.erreur = null;
    } catch (err) {
      c.publication.erreur = String(err.message || err);
    }
    // On relit avant d'écrire : Raph a pu changer le carnet pendant l'envoi.
    const frais = (await db.lire('carnets', id)) || c;
    frais.publication = c.publication;
    await db.ecrire('carnets', frais);
    prevenir(frais);
    return frais;
  })();
  enCours.set(id, travail);
  try { return await travail; } finally { enCours.delete(id); }
}

// ---------- Les choix du client ----------
// Le client dépose ses choix (chiffrés) ; on prend le dernier dépôt.
export async function lireChoix(c) {
  if (!navigator.onLine) return c;
  try {
    const canal = await canalChoix(c.id, c.cle);
    const rep = await fetch(`${RELAIS}/${canal}/json?poll=1&since=all`, { cache: 'no-store' });
    if (!rep.ok) return c;
    const lignes = (await rep.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter((m) => m && m.event === 'message' && m.message);
    let plusRecent = null;
    for (const m of lignes) {
      try {
        const choix = await dechiffrerJson(c.cle, deBase64Url(m.message));
        if (!plusRecent || (choix.envoyeLe || '') > (plusRecent.envoyeLe || '')) plusRecent = choix;
      } catch (_) { /* message illisible : ignoré */ }
    }
    if (plusRecent && (plusRecent.envoyeLe || '') > (c.choix?.recuLe || '')) {
      c.choix = { ...plusRecent, recuLe: plusRecent.envoyeLe };
      await db.ecrire('carnets', c);
      sync.marquer(sync.cheminCarnet(c.id));
    }
  } catch (_) { /* on réessaiera */ }
  return c;
}

export { enBase64Url };
