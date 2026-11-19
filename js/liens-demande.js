// Liens personnels du formulaire de demande. Un nouveau lien à chaque « Copier » ou « Envoyer » :
// chaque client a le sien, avec sa propre clé. Quand le client envoie sa demande, elle part (chiffrée)
// vers un relais gratuit (ntfy.sh, gardée 12 h) ; l'appli ou le Studio la récupère toute seule,
// et la range dans le dossier privé (liens/<id>.json) : elle arrive dans le Studio, même plus tard.

import * as db from './db.js';
import * as sync from './sync.js';
import { RELAIS, idCourt, nouvelleCle, canalDemande, dechiffrerJson, deBase64Url } from './carnet-commun.js';

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
  const recus = [];
  const limite = Date.now() - 183 * 864e5;
  for (const l of await db.tous('liens')) {
    // Une demande déjà reçue est encore surveillée 3 jours (au cas où le client la modifie et la renvoie).
    if (new Date(l.creeLe).getTime() < limite || (l.code && Date.now() - new Date(l.recuLe).getTime() > 3 * 864e5)) continue;
    try {
      const canal = await canalDemande(l.id, l.cle);
      const rep = await fetch(`${RELAIS}/${canal}/json?poll=1&since=all`, { cache: 'no-store' });
      if (!rep.ok) continue;
      let dernier = null;
      for (const ligne of (await rep.text()).split('\n')) {
        let m; try { m = JSON.parse(ligne); } catch (_) { continue; }
        if (m?.event !== 'message' || !m.message) continue;
        try { dernier = await dechiffrerJson(l.cle, deBase64Url(m.message)); } catch (_) { /* illisible : ignoré */ }
      }
      if (dernier?.code && dernier.code !== l.code) {
        const frais = (await db.lire('liens', l.id)) || l;
        Object.assign(frais, { code: dernier.code, nom: dernier.nom || frais.client, statut: 'recu', recuLe: dernier.envoyeLe || new Date().toISOString(), modifieLe: new Date().toISOString() });
        await db.ecrire('liens', frais);
        sync.marquer(sync.cheminLien(frais.id));
        recus.push(frais);
      }
    } catch (_) { /* on réessaiera */ }
  }
  return recus;
}

export const tousLesLiens = async () => (await db.tous('liens')).sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
export async function oublierLien(id) {
  await db.effacer('liens', id);
  sync.marquer(sync.cheminLien(id));
}
