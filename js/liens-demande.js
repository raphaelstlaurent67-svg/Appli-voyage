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
    if (l.source === 'public' || !l.cle || l.efface) continue;
    // Une demande déjà reçue est encore surveillée 3 jours (au cas où le client en envoie une 2e).
    if (new Date(l.creeLe).getTime() < limite || (l.code && Date.now() - new Date(l.recuLe).getTime() > 3 * 864e5)) continue;
    try {
      const canal = await canalDemande(l.id, l.cle);
      // Chaque envoi est une demande à part (au plus 2 par lien) : la 1re va sur le lien lui-même,
      // la 2e sur une fiche voisine « <id>~2 ». Rien n'est jamais remplacé.
      const envois = [];
      for (const m of await lireRelais(canal)) {
        let msg; try { msg = await dechiffrerJson(l.cle, deBase64Url(m.message)); } catch (_) { continue; }
        if (msg?.code && typeof msg.code === 'string' && !envois.some((x) => x.code === msg.code)) envois.push(msg);
      }
      const frais = (await db.lire('liens', l.id)) || l;
      if (frais.efface) continue;
      const nouveaux = envois.filter((x) => x.code !== frais.code);
      if (!frais.code && nouveaux.length) {
        const x = nouveaux.shift();
        Object.assign(frais, { code: x.code, nom: x.nom || frais.client, statut: 'recu', vu: false, recuLe: x.envoyeLe || new Date().toISOString(), modifieLe: new Date().toISOString() });
        await db.ecrire('liens', frais);
        sync.marquer(sync.cheminLien(frais.id));
        recus.push(frais);
      }
      const idVoisin = `${l.id}~2`;
      const voisin = await db.lire('liens', idVoisin);
      if (nouveaux.length && !voisin) {
        const x = nouveaux[0];
        const maintenant = new Date().toISOString();
        const deux = { id: idVoisin, parent: l.id, client: frais.client || '', nom: x.nom || frais.client || '', statut: 'recu', code: x.code, recuLe: x.envoyeLe || maintenant, creeLe: maintenant, modifieLe: maintenant, vu: false };
        await db.ecrire('liens', deux);
        sync.marquer(sync.cheminLien(deux.id));
        recus.push(deux);
      }
    } catch (_) { /* on réessaiera */ }
  }
  return recus;
}

export const tousLesLiens = async () => (await db.tous('liens')).filter((l) => !l.efface).sort((a, b) => (b.recuLe || b.creeLe || '').localeCompare(a.recuLe || a.creeLe || ''));
// Supprimer une demande : on garde une petite trace « effacée » (cachée partout),
// sinon le relais (qui garde les envois 12 h) la ramènerait à la prochaine ouverture.
export async function oublierLien(id) {
  const l = await db.lire('liens', id);
  if (!l) return;
  const trace = { id: l.id, source: l.source, cle: l.cle, courriel: l.courriel, code: l.code, creeLe: l.creeLe, recuLe: l.recuLe, efface: true, modifieLe: new Date().toISOString() };
  await db.ecrire('liens', trace);
  sync.marquer(sync.cheminLien(id));
}

// Les demandes du lien public (demande.html tout court) : chaque envoi devient sa propre fiche,
// même quand c'est la même personne (le formulaire limite déjà à 2 demandes par personne).
// Jamais deux fois le même envoi, jamais une fiche remplacée par une autre, et une demande
// supprimée reste supprimée (sa trace « effacée » garde son identifiant).
// Seules les demandes « à vérifier » (robot probable) sont limitées à 25 par jour.
async function releverPubliques() {
  const recus = [];
  try {
    const canal = await canalDemande(DEMANDE_PUBLIQUE.id, DEMANDE_PUBLIQUE.cle);
    const messages = await lireRelais(canal);
    const tous = await db.tous('liens');
    const parId = new Map(tous.map((l) => [l.id, l]));
    const codes = new Set(tous.filter((l) => l.code).map((l) => l.code));
    const jour = Date.now() - 864e5;
    let suspectsAujourdhui = tous.filter((l) => l.source === 'public' && l.suspect && new Date(l.creeLe).getTime() > jour).length;
    for (const m of messages.slice(-300)) {
      if (!m.id || m.message.length > 200000) continue;
      const id = `p-${String(m.id).replace(/[^\w-]/g, '').slice(0, 24)}`;
      if (parId.has(id)) continue;
      let msg; try { msg = await dechiffrerJson(DEMANDE_PUBLIQUE.cle, deBase64Url(m.message)); } catch (_) { continue; }
      if (!msg?.code || typeof msg.code !== 'string' || codes.has(msg.code)) continue;
      let dem; try { dem = await decoder(msg.code); } catch (_) { continue; }
      const courriel = String(dem?.courriel || '').trim().toLowerCase();
      if (!dem?.nom && !courriel) continue;
      const suspect = typeof msg.suspect === 'string' ? msg.suspect.slice(0, 20) : '';
      if (suspect) {
        if (suspectsAujourdhui >= MAX_SUSPECTES_PAR_JOUR) continue;
        suspectsAujourdhui++;
      }
      const maintenant = new Date().toISOString();
      const l = { id, source: 'public', courriel, client: '', nom: String(msg.nom || dem.nom || courriel).slice(0, 80), statut: 'recu', code: msg.code, recuLe: msg.envoyeLe || maintenant, creeLe: maintenant, modifieLe: maintenant, vu: false, ...(suspect ? { suspect } : {}), ...(msg.test ? { essai: true } : {}) };
      await db.ecrire('liens', l);
      sync.marquer(sync.cheminLien(l.id));
      parId.set(id, l);
      codes.add(msg.code);
      recus.push(l);
    }
  } catch (_) { /* on réessaiera */ }
  return recus;
}
