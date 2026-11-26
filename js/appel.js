// Le texto (ou courriel) déjà écrit qui propose un appel de 15 minutes au client.
import { MARQUE, CONSEILLER, LIEN_RDV } from './marque.js';

export function messageAppel({ nom = '', langue = 'fr', signe = CONSEILLER } = {}) {
  const prenom = String(nom).trim().split(/\s+/)[0] || '';
  const moi = String(signe || '').trim().split(/\s+/)[0];
  if (langue === 'en') {
    return `Hi${prenom ? ` ${prenom}` : ''}, ${moi ? `${moi} here from ${MARQUE}. ` : ''}Thanks for your travel request! Do you have 15 minutes for a quick call to talk about your trip? ${LIEN_RDV ? `Pick the time that suits you here: ${LIEN_RDV}` : 'Tell me what time works for you.'}`;
  }
  return `Bonjour${prenom ? ` ${prenom}` : ''}, ${moi ? `ici ${moi} de ${MARQUE}. ` : ''}Merci pour votre demande de voyage ! Auriez-vous 15 minutes pour un appel rapide pour parler de votre projet ? ${LIEN_RDV ? `Choisissez le moment qui vous convient ici : ${LIEN_RDV}` : 'Dites-moi le moment qui vous convient.'}`;
}
export const sujetAppel = (langue = 'fr') => (langue === 'en' ? 'Your trip: a quick 15-minute call?' : 'Votre voyage : un appel de 15 minutes ?');
// iPhone : sms:NUMÉRO&body=…
export const lienTexto = (tel, texte) => `sms:${String(tel).replace(/[^\d+]/g, '')}&body=${encodeURIComponent(texte)}`;
export const lienCourriel = (courriel, langue, texte) => `mailto:${encodeURIComponent(String(courriel).trim()).replace('%40', '@')}?subject=${encodeURIComponent(sujetAppel(langue))}&body=${encodeURIComponent(texte)}`;
