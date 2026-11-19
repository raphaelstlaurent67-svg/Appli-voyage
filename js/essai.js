// L'essai de Montréal : de vrais endroits de Montréal (ceux de la démo), que Raph peut envoyer
// à un client pour qu'il essaie le principe avant son vrai voyage. Ils ne sont pas dans les endroits
// de Raph : ils vivent seulement ici, et ne vont jamais dans le voyage du Studio.

import { RESERVE } from './carnet-demo.js';

export const PREFIXE_ESSAI = 'essai-';
export const estEssai = (endroitId) => String(endroitId || '').startsWith(PREFIXE_ESSAI);

// 6 hôtels, 6 restos, 6 activités : deux soirées d'essai avec 3 choix de chaque.
export const ENDROITS_ESSAI = RESERVE.map(([id, o]) => ({
  ...o, id: `${PREFIXE_ESSAI}${id}`, ville: 'Montréal', pays: 'Canada', contacts: {}, essai: true, creeLe: '2026-01-01T00:00:00.000Z',
}));

// Ajoute les endroits de l'essai à une carte id → endroit (pour les retrouver dans la file du client).
export function avecEssai(endroits) {
  const carte = endroits instanceof Map ? new Map(endroits) : new Map(endroits.map((e) => [e.id, e]));
  for (const e of ENDROITS_ESSAI) carte.set(e.id, e);
  return carte;
}

// Met tout l'essai dans la file du client (à la suite de ce qui y est déjà).
export function ajouterEssai(c, ajouterItem) {
  let n = 0;
  for (const e of ENDROITS_ESSAI) {
    if (c.items.some((i) => i.endroitId === e.id)) continue;
    ajouterItem(c, e.id, e.mot || '');
    n++;
  }
  return n;
}
// Retire ce qui n'est pas encore parti (ce qu'il a déjà reçu reste sur sa page).
export function retirerEssai(c, estEnvoye) {
  const avant = c.items.length;
  c.items = c.items.filter((i) => !estEssai(i.endroitId) || estEnvoye(i));
  return avant - c.items.length;
}
export const essaiEnCours = (c, estEnvoye) => c.items.some((i) => estEssai(i.endroitId) && !estEnvoye(i));
