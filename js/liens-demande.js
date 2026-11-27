// Liens personnels du formulaire de demande. Un nouveau lien à chaque « Copier » ou « Envoyer » :
// chaque client a le sien, avec sa propre clé. Quand le client envoie sa demande, elle part (chiffrée)
// vers un relais gratuit (ntfy.sh, gardée 12 h) ; l'appli ou le Studio la récupère toute seule,
// et la range dans le dossier privé (liens/<id>.json) : elle arrive dans le Studio, même plus tard.

import * as db from './db.js';
import * as sync from './sync.js';
import { idCourt, nouvelleCle, canalDemande, dechiffrerJson, deBase64Url, lireRelais } from './carnet-commun.js';
import { DEMANDE_PUBLIQUE } from './marque.js';
import { decoder } from './code-demande.js';

const MAX_SUSPECTES_PAR_JOUR = 25;

// Prépare un lien unique, tout de suite (sans attendre : le téléphone permet de copier seulement
// juste après le toucher). Puis garderLien() le range, pour le retrouver dans le Studio.
export function preparerLien(base, { client = '', pour = '', tel = '', langue = '' } = {}) {
  const maintenant = new Date().toISOString();
  const lien = { id: idCourt(), cle: nouvelleCle(), client: client.trim(), statut: 'envoye', code: null, creeLe: maintenant, modifieLe: maintenant };
  return { lien, url: urlLien(base, lien, { pour, tel, langue }) };
}
export async function garderLien(lien) {
  await db.ecrire('liens', lien);
  sync.marquer(sync.cheminLien(lien.id));
}

export function urlLien(base, lien, { pour = '', tel = '', langue = '' } = {}) {
  const u = new URL('demande.html', base);
  if (lien.client) u.searchParams.set('client', lien.client);
  if (pour) u.searchParams.set('pour', pour);
  if (tel) u.searchParams.set('tel', String(tel).replace(/[^\d+]/g, ''));
  if (langue) u.searchParams.set('lang', langue);
  u.searchParams.set('l', lien.id);
  u.hash = `k=${lien.cle}`;
  return u.href;
}

// Va chercher les demandes envoyées par les clients (liens pas encore reçus, de moins de 6 mois).
// Retourne la liste des liens qui viennent de recevoir leur demande.
export async function relever() {
  if (!navigator.onLine) return [];
  const recus = await releverPubliques();
  const limite = Date.now() - 183 * 864e5;
  for (const l of await db.tous('liens')) {
    if (l.source === 'public' || !l.cle) continue;
    // Une demande déjà reçue est encore surveillée 3 jours (au cas où le client la modifie et la renvoie).
    if (new Date(l.creeLe).getTime() < limite || (l.code && Date.now() - new Date(l.recuLe).getTime() > 3 * 864e5)) continue;
    try {
      const canal = await canalDemande(l.id, l.cle);
      let dernier = null;
      for (const m of await lireRelais(canal)) {
        try { dernier = await dechiffrerJson(l.cle, deBase64Url(m.message)); } catch (_) { /* illisible : ignoré */ }
      }
      if (dernier?.code && dernier.code !== l.code) {
        const frais = (await db.lire('liens', l.id)) || l;
        Object.assign(frais, { code: dernier.code, nom: dernier.nom || frais.client, statut: 'recu', vu: false, recuLe: dernier.envoyeLe || new Date().toISOString(), modifieLe: new Date().toISOString() });
        await db.ecrire('liens', frais);
        sync.marquer(sync.cheminLien(frais.id));
        recus.push(frais);
      }
    } catch (_) { /* on réessaiera */ }
  }
  return recus;
}

export const tousLesLiens = async () => (await db.tous('liens')).sort((a, b) => (b.recuLe || b.creeLe || '').localeCompare(a.recuLe || a.creeLe || ''));
export async function oublierLien(id) {
  await db.effacer('liens', id);
  sync.marquer(sync.cheminLien(id));
}

// Les demandes du lien public (demande.html tout court) : chaque demande devient sa propre fiche.
// Aucune vraie demande n'est jamais jetée en silence :
// - le même message n'est jamais rangé deux fois ;
// - même courriel, demande encore toute neuve (pas encore contactée, moins de 3 jours) : mise à jour ;
//   sinon c'est une nouvelle fiche (un client qui revient, ou Raph qui fait un essai) ;
// - seules les demandes marquées « à vérifier » par le formulaire (robot probable, envoi en rafale)
//   sont limitées à 25 par jour, pour qu'un robot ne remplisse pas l'appli.
async function releverPubliques() {
  const recus = [];
  try {
    const canal = await canalDemande(DEMANDE_PUBLIQUE.id, DEMANDE_PUBLIQUE.cle);
    const messages = await lireRelais(canal);
    const tous = await db.tous('liens');
    const parId = new Map(tous.map((l) => [l.id, l]));
    const jour = Date.now() - 864e5;
    let suspectsAujourdhui = tous.filter((l) => l.source === 'public' && l.suspect && new Date(l.creeLe).getTime() > jour).length;
    for (const m of messages.slice(-300)) {
      if (!m.id || m.message.length > 200000) continue;
      const id = `p-${String(m.id).replace(/[^\w-]/g, '').slice(0, 24)}`;
      if (parId.has(id)) continue;
      let msg; try { msg = await dechiffrerJson(DEMANDE_PUBLIQUE.cle, deBase64Url(m.message)); } catch (_) { continue; }
      if (!msg?.code || typeof msg.code !== 'string') continue;
      let dem; try { dem = await decoder(msg.code); } catch (_) { continue; }
      const courriel = String(dem?.courriel || '').trim().toLowerCase();
      if (!dem?.nom && !courriel) continue;
      const suspect = typeof msg.suspect === 'string' ? msg.suspect.slice(0, 20) : '';
      const maintenant = new Date().toISOString();
      const nom = String(msg.nom || dem.nom || courriel).slice(0, 80);
      // Déjà rangée (même contenu) : rien à faire.
      if ([...parId.values()].some((l) => l.source === 'public' && l.code === msg.code)) continue;
      const meme = courriel && [...parId.values()].find((l) => l.source === 'public' && l.courriel === courriel
        && !l.carnetId && !l.contacteLe && Date.now() - new Date(l.recuLe || l.creeLe).getTime() < 3 * 864e5);
      if (meme) {
        Object.assign(meme, { code: msg.code, nom, statut: 'recu', recuLe: msg.envoyeLe || maintenant, modifieLe: maintenant, vu: false, suspect });
        await db.ecrire('liens', meme);
        sync.marquer(sync.cheminLien(meme.id));
        recus.push(meme);
        continue;
      }
      if (suspect) {
        if (suspectsAujourdhui >= MAX_SUSPECTES_PAR_JOUR) continue;
        suspectsAujourdhui++;
      }
      const l = { id, source: 'public', courriel, client: '', nom, statut: 'recu', code: msg.code, recuLe: msg.envoyeLe || maintenant, creeLe: maintenant, modifieLe: maintenant, suspect };
      await db.ecrire('liens', l);
      sync.marquer(sync.cheminLien(l.id));
      parId.set(id, l);
      recus.push(l);
    }
  } catch (_) { /* on réessaiera */ }
  return recus;
}
