// Stockage des données directement sur le téléphone (IndexedDB).
// Fonctionne sans internet. L'envoi automatique vers le Studio est dans sync.js.

const NOM_BASE = 'appli-voyage';
const CLES_SYNC = ['sync', 'syncShas', 'syncFile', 'syncDernier'];
const VERSION = 4; // 2 : voyages (générateur) · 3 : contributeurs et paiements · 4 : carnets clients en direct
let basePromise;

function ouvrir() {
  if (!basePromise) {
    basePromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOM_BASE, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('endroits')) db.createObjectStore('endroits', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('villes')) db.createObjectStore('villes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('reglages')) db.createObjectStore('reglages', { keyPath: 'cle' });
        if (!db.objectStoreNames.contains('voyages')) db.createObjectStore('voyages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('contributeurs')) db.createObjectStore('contributeurs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('paiements')) db.createObjectStore('paiements', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('carnets')) db.createObjectStore('carnets', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return basePromise;
}

async function transaction(magasin, mode, action) {
  const db = await ouvrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(magasin, mode);
    const store = tx.objectStore(magasin);
    const req = action(store);
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const tous = (magasin) => transaction(magasin, 'readonly', (s) => s.getAll());
export const lire = (magasin, id) => transaction(magasin, 'readonly', (s) => s.get(id));
export const ecrire = (magasin, objet) => transaction(magasin, 'readwrite', (s) => s.put(objet));
export const effacer = (magasin, id) => transaction(magasin, 'readwrite', (s) => s.delete(id));
export const vider = (magasin) => transaction(magasin, 'readwrite', (s) => s.clear());

export function nouvelId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

export async function lireReglage(cle, defaut) {
  const r = await lire('reglages', cle);
  return r ? r.valeur : defaut;
}

export const ecrireReglage = (cle, valeur) => ecrire('reglages', { cle, valeur });

// Demande au navigateur de ne pas effacer les données quand l'espace manque.
export async function demanderStockagePersistant() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (_) { /* pas grave */ }
  return false;
}

// ---- Sauvegarde dans un fichier (export / import) ----

function blobVersTexte(blob) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result);
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(blob);
  });
}

async function texteVersBlob(dataUrl) {
  const rep = await fetch(dataUrl);
  return rep.blob();
}

export async function exporterTout() {
  const photos = await tous('photos');
  const photosTexte = [];
  for (const p of photos) photosTexte.push({ id: p.id, data: await blobVersTexte(p.blob) });
  return {
    format: 'appli-voyage',
    version: 1,
    exporteLe: new Date().toISOString(),
    endroits: await tous('endroits'),
    villes: await tous('villes'),
    voyages: await tous('voyages'),
    contributeurs: await tous('contributeurs'),
    paiements: await tous('paiements'),
    carnets: await tous('carnets'),
    // La clé GitHub et l'état de l'envoi automatique ne sortent jamais dans une copie.
    reglages: (await tous('reglages')).filter((r) => !CLES_SYNC.includes(r.cle)),
    photos: photosTexte,
  };
}

// Ajoute le contenu d'une sauvegarde. Un endroit déjà présent (même identifiant)
// est remplacé seulement si la version importée est plus récente.
export async function importerTout(donnees) {
  if (!donnees || donnees.format !== 'appli-voyage') throw new Error("Ce fichier n'est pas une sauvegarde de l'appli.");
  let ajoutes = 0;
  for (const e of donnees.endroits || []) {
    const actuel = await lire('endroits', e.id);
    if (!actuel || (e.modifieLe || '') > (actuel.modifieLe || '')) { await ecrire('endroits', e); ajoutes++; }
  }
  for (const v of donnees.villes || []) {
    const actuelle = await lire('villes', v.id);
    if (!actuelle || (v.modifieLe || '') > (actuelle.modifieLe || '')) await ecrire('villes', v);
  }
  for (const v of donnees.voyages || []) {
    const actuel = await lire('voyages', v.id);
    if (!actuel || (v.modifieLe || '') > (actuel.modifieLe || '')) await ecrire('voyages', v);
  }
  for (const magasin of ['contributeurs', 'paiements', 'carnets']) {
    for (const x of donnees[magasin] || []) {
      const actuel = await lire(magasin, x.id);
      if (!actuel || (x.modifieLe || '') > (actuel.modifieLe || '')) await ecrire(magasin, x);
    }
  }
  for (const r of donnees.reglages || []) if (!CLES_SYNC.includes(r.cle)) await ecrire('reglages', r);
  for (const p of donnees.photos || []) {
    if (!(await lire('photos', p.id))) await ecrire('photos', { id: p.id, blob: await texteVersBlob(p.data) });
  }
  return ajoutes;
}

// Fichier envoyé par un contributeur : on prend seulement ses endroits et ses photos.
// Ils arrivent « à valider » ; un endroit déjà accepté ou refusé garde sa décision.
export async function importerContribution(donnees, contributeurId) {
  if (!donnees || donnees.format !== 'appli-voyage') throw new Error("Ce fichier n'est pas une sauvegarde de l'appli.");
  let nouveaux = 0;
  for (const e of donnees.endroits || []) {
    const actuel = await lire('endroits', e.id);
    if (actuel && (e.modifieLe || '') <= (actuel.modifieLe || '')) continue;
    const garde = actuel && actuel.contributeurId === contributeurId && actuel.statut !== 'en_attente';
    await ecrire('endroits', {
      ...e, contributeurId,
      statut: garde ? actuel.statut : 'en_attente',
      recuLe: actuel?.recuLe || new Date().toISOString(),
      decideLe: garde ? actuel.decideLe : undefined,
    });
    if (!actuel) nouveaux++;
  }
  for (const p of donnees.photos || []) {
    if (!(await lire('photos', p.id))) await ecrire('photos', { id: p.id, blob: await texteVersBlob(p.data) });
  }
  return nouveaux;
}
