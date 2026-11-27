// Fiche de demande que Raph envoie à ses clients (en français ou en anglais).
// Cinq petites étapes : destination, dates, voyageurs, envies, coordonnées.
// Champs obligatoires : destination, durée, voyageurs, style, nom et courriel (?test permet de passer les étapes).
// À la fin, ses réponses deviennent un lien : en cliquant dessus, Raph crée le voyage dans le Studio.

import './clavier.js';
import { tirerPourRecharger } from './tirer.js';
tirerPourRecharger();
import { paysDuContinent } from './monde.js';
import { icone } from './icones.js';
import { ENVIES, encoder, nuits } from './code-demande.js';
import { ideesPour, aDesIdees, traduireIdee } from './idees-pays.js';
import * as pwa from './installer.js';
import { CONTACT } from './contact.js';
import { RELAIS, canalDemande, chiffrerJson, enBase64Url, deposerRelais } from './carnet-commun.js';
import { MARQUE, DEMANDE_PUBLIQUE, ALERTE } from './marque.js';
import { messageAppel, lienTexto, lienCourriel } from './appel.js';
import { photo, photoPays, PHOTOS_FOND } from './photos.js';

const fiche = document.getElementById('fiche');
const params = new URLSearchParams(location.search);
// Courriel de Raph, ajouté au lien par le Studio (gardé si la fiche est installée sur son ordi).
let POUR = params.get('pour') || '';
try { if (POUR) localStorage.setItem('pourDemande', POUR); else POUR = localStorage.getItem('pourDemande') || ''; } catch (_) { /* rien */ }
if (!POUR) POUR = CONTACT.courriel.trim();
// Numéro de cell de Raph (optionnel) : le client lui envoie sa demande par texto en un clic.
let TEL = (params.get('tel') || '').replace(/[^\d+]/g, '');
try { if (TEL) localStorage.setItem('telDemande', TEL); else TEL = localStorage.getItem('telDemande') || ''; } catch (_) { /* rien */ }
if (!TEL) TEL = CONTACT.cell.replace(/[^\d+]/g, '');
// Lien personnel fait par Raph : demande.html?l=<id>#k=<clé>. La demande lui arrive toute seule, chiffrée.
const LIEN = (() => {
  const id = params.get('l') || '';
  const cle = new URLSearchParams(location.hash.slice(1)).get('k') || '';
  return id && cle ? { id, cle } : null;
})();
// Sans lien personnel (bio Instagram, site…) : la demande passe par le lien public.
const LIEN_ENVOI = LIEN || DEMANDE_PUBLIQUE;
// Contre les envois en masse : un champ caché que seuls les robots remplissent,
// un minimum de temps passé sur le formulaire, et quelques envois par appareil par jour.
// Rien n'est jamais jeté : un envoi douteux part quand même, marqué « à vérifier »
// (dans l'appli et dans la notification). Un lien personnel n'est jamais douteux.
// Début du remplissage (gardé si la page se recharge, pour ne pas bloquer un vrai client).
let OUVERT_LE = Date.now();
try { OUVERT_LE = +localStorage.getItem('debutDemande') || OUVERT_LE; localStorage.setItem('debutDemande', String(OUVERT_LE)); } catch (_) { /* rien */ }
function envoiSuspect() {
  const debut = OUVERT_LE;
  OUVERT_LE = Date.now();
  try { localStorage.removeItem('debutDemande'); } catch (_) { /* rien */ }
  let rafale = false;
  try {
    const jour = Date.now() - 864e5;
    const envois = JSON.parse(localStorage.getItem('envoisDemande') || '[]').filter((x) => x > jour);
    rafale = envois.length >= 3;
    envois.push(Date.now());
    localStorage.setItem('envoisDemande', JSON.stringify(envois.slice(-20)));
  } catch (_) { /* rien */ }
  if (LIEN || MODE_TEST) return '';
  if (document.querySelector('#site-web-pot')?.value) return 'robot';
  if (Date.now() - debut < 20000) return 'rapide';
  if (rafale) return 'rafale';
  return '';
}
const MONTRER_INSTALLER = params.has('installer') && !pwa.dejaInstallee();
// demande.html?test : pour Raph seulement, permet de passer les étapes sans tout remplir.
const MODE_TEST = params.has('test');
// demande.html?apercu : Raph regarde depuis son appli. Bouton Retour (le client ne le voit jamais).
if (params.has('apercu')) {
  const retour = document.createElement('button');
  retour.type = 'button';
  retour.className = 'retour-apercu';
  retour.innerHTML = `${icone('chevron-left', { taille: 20 })}<span>Retour</span>`;
  retour.onclick = () => { if (history.length > 1) history.back(); else { window.close(); setTimeout(() => { location.href = './#/clients'; }, 300); } };
  document.body.appendChild(retour);
}
// demande.html?client=Marie%20Tremblay : lien personnel fait dans le Studio. Chaque client a son propre
// brouillon (rien n'est partagé entre appareils de toute façon), son nom est déjà rempli et on le salue.
const CLIENT = (params.get('client') || '').trim().slice(0, 80);
// Le brouillon est rangé sous l'identifiant unique du lien (jamais sous le nom) : deux clients
// qui ont le même nom, ou deux liens ouverts sur le même téléphone, ne se mélangent jamais.
const CLE_BROUILLON = LIEN ? `brouillonDemande:l:${LIEN.id}` : CLIENT ? `brouillonDemande:${CLIENT.toLowerCase()}` : 'brouillonDemande';
const prenomClient = CLIENT.split(/\s+/)[0] || '';
const REQUIS = '<span class="requis" aria-hidden="true">*</span>';
// Les destinations les plus demandées ; les autres se trouvent avec la recherche.
const POPULAIRES = ['Japon', 'Italie', 'Thaïlande', 'France', 'Grèce', 'Portugal', 'Espagne', 'Islande', 'Mexique', 'Costa Rica', 'Pérou', 'Vietnam', 'Corée du Sud', 'Indonésie', 'Maroc', 'Cuba', 'République dominicaine', 'États-Unis'];
const TOUS_PAYS = paysDuContinent('');
const COULEURS = ['#f0532f', '#2f80ed', '#16a34a', '#a855f7', '#e8a20c', '#0ea5a4', '#db2777', '#64748b'];
// Pour qui ne sait pas encore où aller : une région suffit (nom français gardé, nom anglais affiché).
const REGIONS = [
  ['Asie', 'Asia'], ['Europe', 'Europe'], ['Caraïbes', 'Caribbean'], ['Amérique latine', 'Latin America'],
  ['Amérique du Nord', 'North America'], ['Afrique', 'Africa'], ['Océanie', 'Oceania'], ['Moyen-Orient', 'Middle East'],
  ['Surprenez-moi', 'Surprise me'],
];
const STYLES = [['eco', 'backpack', '$'], ['moyen', 'sofa', '$$'], ['luxe', 'gem', '$$$']];
const NB_ETAPES = 5;

// ---------- Textes (français / anglais) ----------
const TXT = {
  fr: {
    etapes: ['Destination', 'Dates', 'Style', 'Envies', 'Coordonnées'], voyageurs: 'Voyageurs',
    titres: ['Destination', 'Dates et voyageurs', 'Style de voyage', 'Vos envies', 'Vos coordonnées'],
    requis: 'Champ obligatoire', paysOuRegion: 'Pays ou région', introStyle: 'Il nous guide pour le choix des hébergements et le rythme du voyage.',
    errDestination: 'Choisissez au moins un pays ou une région.', errDuree: 'Indiquez la durée approximative du voyage.', errDatesPays: 'Choisissez les dates de chaque pays.', errStyle: 'Choisissez un style de voyage.', errNom: 'Indiquez votre nom.', errCourriel: 'Indiquez une adresse courriel valide.',
    etapeSur: (i, n) => `Étape ${i} sur ${n}`, facultatif: 'Facultatif', optionnel: 'facultatif',
    retour: 'Retour', continuer: 'Continuer', passer: 'Passer cette étape', envoyerDemande: 'Envoyer la demande', installer: 'Installer sur mon ordi',
    bonjour: (n) => `Bonjour ${n}, voici votre demande de voyage personnalisée.`,
    introPays: 'Un ou plusieurs pays, dans l’ordre souhaité. Vous hésitez encore ? Indiquez plutôt une région.',
    chercher: 'Chercher un pays', resultats: 'Résultats', populaires: 'Les plus demandés', aucunPays: 'Aucun pays trouvé. Vérifiez l’orthographe ou choisissez une région.',
    trajet: 'Votre itinéraire', plusTot: 'Plus tôt', plusTard: 'Plus tard', retirer: 'Retirer',
    pasDecide: 'Ou une région', regionsChoisies: 'Régions qui vous attirent',
    introDates: 'Une estimation suffit pour commencer. Nous préciserons ensemble.',
    combien: 'Durée du voyage', moinsJours: 'Un jour de moins', plusJours: 'Un jour de plus', plusDe: '3 sem. et +', plageTxt: (a, z) => `${a} à ${z}`, plageJours: (a, z) => `${a} à ${z} jours`, autreDuree: 'Combien de jours ?', autre: 'Autre durée',
    longs: [[21, '3 semaines'], [30, '1 mois'], [45, '6 semaines'], [60, '2 mois'], [90, '3 mois'], [120, '4 mois']],
    jours: (n) => `${n} jour${n > 1 ? 's' : ''}`, joursMot: (n) => (n > 1 ? 'jours' : 'jour'),
    semaines: (s, j) => `${s} semaine${s > 1 ? 's' : ''}${j ? ` et ${j} jour${j > 1 ? 's' : ''}` : ''}`,
    quand: 'Mois de départ', quandAide: '', dateExacte: 'J’ai déjà une date précise', sansDateExacte: 'Juste le mois, finalement',
    parPays: 'Des dates précises pour chaque pays', retourTotal: 'Revenir à une durée totale',
    depart: 'Départ', retourLe: 'Retour', effacer: 'Effacer', touchDepart: 'Choisissez le jour de départ',
    repartition: 'Une préférence pour répartir votre temps ?', repartitionEx: (p) => `Ex. : surtout ${p}, le reste à votre choix`,
    introPays2: 'Pour chaque pays, choisissez le jour d’arrivée, puis celui du départ.',
    arrivee: 'Arrivée', choisisJour: 'Choisir un jour', choisisDepart: 'Choisir le départ', aChoisir: 'Dates à choisir',
    tonVoyage: 'Votre voyage', au: 'au', astuce: 'Le jour où vous quittez un pays peut être celui où vous arrivez dans le suivant.',
    moisPrec: 'Mois précédent', moisSuiv: 'Mois suivant', semaineJours: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], sem: 'S',
    nuitsTxt: (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    adultes: 'Adultes', enfants: 'Enfants', enfantsAide: '12 ans et moins', agesEnfants: 'Âge des enfants', agesEx: 'Ex. : 4 et 9 ans',
    moins: 'Moins', plus: 'Plus', nombreDe: (x) => `Nombre : ${x}`,
    style: 'Style de voyage', styles: { eco: 'Économique', moyen: 'Confort', luxe: 'Luxe' },
    enSavoirPlus: 'Comparer les styles', masquer: 'Masquer',
    stylesCourt: {
      eco: 'Parfait pour les étudiants et les jeunes voyageurs.',
      moyen: 'Le juste milieu, choisi par la plupart des voyageurs.',
      luxe: 'Le voyage de rêve, niveau lune de miel.',
    },
    stylesTxt: {
      eco: [['Pour qui', 'Étudiants, jeunes voyageurs, longs voyages où le budget compte.'], ['Hébergement', 'Auberges, guesthouses et petits hôtels simples, propres et bien situés.'], ['Déplacements', 'Trains, bus et transport local, comme les gens du pays.'], ['Repas', 'Cuisine de rue, marchés et petits restos populaires.'], ['Activités', 'Beaucoup de gratuit : randonnées, quartiers, plages, temples.']],
      moyen: [['Pour qui', 'La plupart des voyageurs : couples, familles, amis.'], ['Hébergement', 'Hôtels de charme 3 à 4 étoiles, chambre privée et salle de bain.'], ['Déplacements', 'Trains rapides et vols intérieurs, quelques transferts privés.'], ['Repas', 'Bons restos locaux, et quelques tables plus réputées.'], ['Activités', 'Visites guidées choisies et sorties qui valent le coup.']],
      luxe: [['Pour qui', 'Lune de miel, grand anniversaire, voyage d’une vie.'], ['Hébergement', 'Hôtels 5 étoiles, villas et adresses d’exception.'], ['Déplacements', 'Chauffeurs privés, vols en classe affaires si souhaité.'], ['Repas', 'Grandes tables et expériences gastronomiques privées.'], ['Activités', 'Guides privés, accès exclusifs, horaires à votre rythme.']],
    },
    introEnvies: 'Sélectionnez ce qui vous intéresse et indiquez, environ, combien de fois pendant le voyage.', introEnviesSans: 'Sélectionnez ce qui vous intéresse et indiquez, environ, combien de fois pendant le voyage.',
    ideesPour: (p) => (p ? `Idées : ${p}` : 'Quelques idées'), touchezIdees: 'Touchez celles qui vous tentent.',
    combienFois: 'Nombre de fois',
    aVoir: 'Un lieu ou une expérience à ne pas manquer', aVoirEx: 'Par exemple : les cerisiers en fleurs à Kyoto',
    nom: 'Nom complet', nomEx: '', courriel: 'Courriel', courrielEx: '',
    source: 'Comment nous avez-vous connus ?', sources: { instagram: 'Instagram', facebook: 'Facebook', google: 'Google', bouche: 'Bouche à oreille', courriel: 'Courriel ou appel', autre: 'Autre' },
    sourceAutre: 'Précisez', sourceAutreEx: 'Par exemple : un ami, un événement',
    tel: 'Téléphone', message: 'Précisions', messageEx: 'Occasion spéciale, budget, rythme souhaité, besoins particuliers',
    introToi: 'Nous vous répondons sous 12 heures avec une première proposition, sans frais ni engagement.',
    ecrisNom: 'Écrivez votre nom pour que l’on sache à qui répondre', ecrisCourriel: 'Écrivez votre courriel ou votre téléphone pour recevoir la réponse',
    monVoyage: 'Demande de voyage', voyageursN: (n) => (n > 1 ? 'voyageurs' : 'voyageur'),
    adultesN: (n) => `${n} adulte${n > 1 ? 's' : ''}`, enfantsN: (n) => `${n} enfant${n > 1 ? 's' : ''}`,
    destinationAVoir: 'Destination à définir ensemble', dureeTotale: 'Durée', departLe: (x) => `Départ : ${x}`, datesAVoir: 'Dates à préciser',
    jeTeLaisse: 'Répartition du temps entre les pays : à votre choix', styleMot: 'style', aDefinir: 'À définir', flexible: 'Flexible', dureeMot: 'durée',
    mesEnvies: 'Envies', aVoirCourt: 'À ne pas manquer',
    presque: 'Votre demande est prête', presqueTxt: 'Envoyez-la-nous avec un des boutons ci-dessous. Notre équipe vous répond avec une proposition d’itinéraire.',
    envoiCours: 'Envoi de votre demande', envoyee: 'Demande envoyée', envoyeeTxt: 'Merci. Nous vous répondons sous 12 heures pour convenir d’un appel et vous présenter une première proposition.', echec: 'L’envoi automatique n’a pas fonctionné. Envoyez votre demande avec un de ces boutons.',
    parCourriel: 'Envoyer par courriel', parMessage: 'Envoyer par message', copier: 'Copier la demande',
    image: 'Enregistrer le résumé en image', imageAide: 'Pratique pour le montrer aux autres voyageurs.', modifier: 'Modifier mes réponses', nouvelle: 'Faire une autre demande',
    merci: 'Merci ! Demande envoyée', copie: 'Copié ! Collez-le dans un courriel ou un message', copieCeTexte: 'Copiez ce texte :',
    sujet: (p, n) => `Demande de voyage : ${p}${n ? ` (${n})` : ''}`,
    corps: (lignes, lien, n) => `Bonjour,\n\nVoici ma demande de voyage sur mesure.\n\n${lignes}\n\nToutes mes réponses sont dans ce lien :\n${lien}\n\n${n}`,
    imagePrete: 'Image enregistrée',
  },
  en: {
    etapes: ['Destination', 'Dates', 'Style', 'Interests', 'Contact'], voyageurs: 'Travellers',
    titres: ['Destination', 'Dates and travellers', 'Travel style', 'Your interests', 'Your details'],
    requis: 'Required field', paysOuRegion: 'Country or region', introStyle: 'It guides our choice of accommodation and the pace of your trip.',
    errDestination: 'Choose at least one country or region.', errDuree: 'Enter the approximate length of your trip.', errDatesPays: 'Choose the dates for each country.', errStyle: 'Choose a travel style.', errNom: 'Enter your name.', errCourriel: 'Enter a valid email address.',
    etapeSur: (i, n) => `Step ${i} of ${n}`, facultatif: 'Optional', optionnel: 'optional',
    retour: 'Back', continuer: 'Continue', passer: 'Skip this step', envoyerDemande: 'Send request', installer: 'Install on my computer',
    bonjour: (n) => `Hello ${n}, here is your personal trip request.`,
    introPays: 'One or more countries, in the order you’d like. Still deciding? Choose a region instead.',
    chercher: 'Search a country', resultats: 'Results', populaires: 'Most requested', aucunPays: 'No country found. Check the spelling or choose a region.',
    trajet: 'Your route', plusTot: 'Earlier', plusTard: 'Later', retirer: 'Remove',
    pasDecide: 'Or a region', regionsChoisies: 'Regions you’re drawn to',
    introDates: 'An estimate is enough to start. We’ll refine it together.',
    combien: 'Trip length', moinsJours: 'One day less', plusJours: 'One day more', plusDe: '3 wks +', plageTxt: (a, z) => `${a} to ${z}`, plageJours: (a, z) => `${a} to ${z} days`, autreDuree: 'How many days?', autre: 'Other length',
    longs: [[21, '3 weeks'], [30, '1 month'], [45, '6 weeks'], [60, '2 months'], [90, '3 months'], [120, '4 months']],
    jours: (n) => `${n} day${n > 1 ? 's' : ''}`, joursMot: (n) => (n > 1 ? 'days' : 'day'),
    semaines: (s, j) => `${s} week${s > 1 ? 's' : ''}${j ? ` and ${j} day${j > 1 ? 's' : ''}` : ''}`,
    quand: 'Departure month', quandAide: '', dateExacte: 'I already have an exact date', sansDateExacte: 'Just the month after all',
    parPays: 'Exact dates for each country', retourTotal: 'Back to a total length',
    depart: 'Departure', retourLe: 'Return', effacer: 'Clear', touchDepart: 'Choose your departure day',
    repartition: 'Any preference on how to split your time?', repartitionEx: (p) => `E.g. more time in ${p}, the rest is up to you`,
    introPays2: 'For each country, choose the arrival day, then the departure day.',
    arrivee: 'Arrival', choisisJour: 'Pick a day', choisisDepart: 'Pick departure', aChoisir: 'Dates to pick',
    tonVoyage: 'Your trip', au: 'to', astuce: 'The day you leave one country can be the day you arrive in the next.',
    moisPrec: 'Previous month', moisSuiv: 'Next month', semaineJours: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], sem: 'W',
    nuitsTxt: (n) => `${n} night${n > 1 ? 's' : ''}`,
    adultes: 'Adults', enfants: 'Children', enfantsAide: '12 and under', agesEnfants: 'Children’s ages', agesEx: 'E.g. 4 and 9',
    moins: 'Fewer', plus: 'More', nombreDe: (x) => `Number: ${x}`,
    style: 'Travel style', styles: { eco: 'Budget', moyen: 'Comfort', luxe: 'Luxury' },
    enSavoirPlus: 'Compare the styles', masquer: 'Hide',
    stylesCourt: {
      eco: 'Perfect for students and young travellers.',
      moyen: 'The sweet spot most travellers choose.',
      luxe: 'The dream trip, honeymoon level.',
    },
    stylesTxt: {
      eco: [['Best for', 'Students, young travellers, long trips where budget matters.'], ['Where you stay', 'Hostels, guesthouses and simple small hotels, clean and well located.'], ['Getting around', 'Trains, buses and local transport, like the locals.'], ['Food', 'Street food, markets and popular local spots.'], ['Activities', 'Lots of free things: hikes, neighbourhoods, beaches, temples.']],
      moyen: [['Best for', 'Most travellers: couples, families, friends.'], ['Where you stay', 'Charming 3 to 4-star hotels, private room and bathroom.'], ['Getting around', 'Fast trains and domestic flights, a few private transfers.'], ['Food', 'Good local restaurants, and a few well-known tables.'], ['Activities', 'Selected guided visits and outings worth the price.']],
      luxe: [['Best for', 'Honeymoons, big anniversaries, the trip of a lifetime.'], ['Where you stay', '5-star hotels, villas and exceptional addresses.'], ['Getting around', 'Private drivers, business class flights if you wish.'], ['Food', 'Fine dining and private food experiences.'], ['Activities', 'Private guides, exclusive access, your own pace.']],
    },
    introEnvies: 'Select what interests you and roughly how many times during the trip.', introEnviesSans: 'Select what interests you and roughly how many times during the trip.',
    ideesPour: (p) => (p ? `Ideas: ${p}` : 'A few ideas'), touchezIdees: 'Tap the ones you like.',
    combienFois: 'Number of times',
    aVoir: 'A place or experience not to miss', aVoirEx: 'For example: the cherry blossoms in Kyoto',
    nom: 'Full name', nomEx: '', courriel: 'Email', courrielEx: '',
    source: 'How did you hear about us?', sources: { instagram: 'Instagram', facebook: 'Facebook', google: 'Google', bouche: 'Word of mouth', courriel: 'Email or call', autre: 'Other' },
    sourceAutre: 'Please specify', sourceAutreEx: 'For example: a friend, an event',
    tel: 'Phone', message: 'Additional details', messageEx: 'Special occasion, budget, preferred pace, specific needs',
    introToi: 'We reply within 12 hours with a first proposal, free and with no commitment.',
    ecrisNom: 'Enter your name so we know who to reply to', ecrisCourriel: 'Enter your email or phone to receive our reply',
    monVoyage: 'Trip request', voyageursN: (n) => (n > 1 ? 'travellers' : 'traveller'),
    adultesN: (n) => `${n} adult${n > 1 ? 's' : ''}`, enfantsN: (n) => `${n} child${n > 1 ? 'ren' : ''}`,
    destinationAVoir: 'Destination to decide together', dureeTotale: 'Length', departLe: (x) => `Departure: ${x}`, datesAVoir: 'Dates to confirm',
    jeTeLaisse: 'Time split between countries: up to you', styleMot: 'style', aDefinir: 'To decide', flexible: 'Flexible', dureeMot: 'length',
    mesEnvies: 'Interests', aVoirCourt: 'Not to miss',
    presque: 'Your request is ready', presqueTxt: 'Send it to us with one of the buttons below. Our team will reply with an itinerary proposal.',
    envoiCours: 'Sending your request', envoyee: 'Request sent', envoyeeTxt: 'Thank you. We’ll get back to you within 12 hours to set up a call and share a first proposal.', echec: 'Automatic sending did not work. Please send your request with one of these buttons.',
    parCourriel: 'Send by email', parMessage: 'Send by message', copier: 'Copy the request',
    image: 'Save the summary as an image', imageAide: 'Handy to show the other travellers.', modifier: 'Edit my answers', nouvelle: 'Start a new request',
    merci: 'Thanks! Request sent', copie: 'Copied! Paste it in an email or a message', copieCeTexte: 'Copy this text:',
    sujet: (p, n) => `Trip request: ${p}${n ? ` (${n})` : ''}`,
    corps: (lignes, lien, n) => `Hello,\n\nHere is my custom trip request.\n\n${lignes}\n\nAll my answers are in this link:\n${lien}\n\n${n}`,
    imagePrete: 'Image saved',
  },
};
const ENVIES_EN = {
  visites: ['Culture and sights', 'Monuments, museums, historic districts'],
  restos: ['Food', 'Great restaurants, street food, markets'],
  experiences: ['Local experiences', 'Classes, shows, meeting locals'],
  sport: ['Sport and adventure', 'Hiking, diving, surfing, cycling'],
  nuit: ['Nightlife', 'Bars, rooftops, live music'],
  nature: ['Nature and outdoors', 'Parks, mountains, wildlife, wild beaches'],
  detente: ['Relaxation', 'Beach, spa, hot springs, slow days'],
};

// ---------- Noms des pays en anglais (la demande garde le nom français, pour le Studio) ----------
const sansAccents = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CODES_MANQUANTS = { centrafrique: 'CF', congo: 'CG', guyane: 'GF', hongkong: 'HK', kirghizistan: 'KG', macao: 'MO', myanmar: 'MM', republiquedemocratiqueducongo: 'CD', vatican: 'VA' };
const EN_REMPLACE = { HK: 'Hong Kong', MO: 'Macao', MM: 'Myanmar', CD: 'DR Congo', CG: 'Congo', CI: "Côte d'Ivoire", PS: 'Palestine' };
const NOM_EN = (() => {
  const m = {};
  try {
    const fr = new Intl.DisplayNames(['fr'], { type: 'region' });
    const en = new Intl.DisplayNames(['en'], { type: 'region' });
    const cle = (x) => sansAccents(x).replace(/[^a-z]/g, '');
    const codes = { ...CODES_MANQUANTS };
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const a of L) for (const b of L) { const c = a + b; const f = fr.of(c); if (f && f !== c && !codes[cle(f)]) codes[cle(f)] = c; }
    for (const p of TOUS_PAYS) { const c = codes[cle(p)]; if (c) m[p] = EN_REMPLACE[c] || en.of(c); }
  } catch (_) { /* vieux navigateur : on garde les noms français */ }
  return m;
})();

// ---------- Réponses (gardées dans le navigateur au cas où la page se ferme) ----------
const langueParam = ['fr', 'en'].includes(params.get('lang')) ? params.get('lang') : '';
const vide = () => ({
  f: 'demande', v: 3, langue: langueParam || (/^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en'),
  pays: [], regions: [],
  mode: 'total', duree: 0, plage: '', depart: '', mois: '', repartition: '',
  adultes: 2, enfants: 0, agesEnfants: '', voyageurs: 2, style: '',
  envies: {}, idees: {}, incontournable: '',
  nom: '', courriel: '', telephone: '', message: '', source: '', sourceAutre: '',
});
let d = vide();
let brouillonRepris = false;
// Ménage : les brouillons de plus d'une journée sont effacés de ce téléphone.
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('brouillonDemande') || k.endsWith(':etape') || k === CLE_BROUILLON) continue;
    const b = JSON.parse(localStorage.getItem(k) || 'null');
    if (!b || Date.now() - (b.gardeLe || 0) > 24 * 3600 * 1000) { localStorage.removeItem(k); localStorage.removeItem(`${k}:etape`); }
  }
} catch (_) { /* rien */ }
// Un brouillon commencé est gardé une journée ; après (ou une fois la demande envoyée), on repart à zéro.
try {
  const b = MODE_TEST ? null : JSON.parse(localStorage.getItem(CLE_BROUILLON) || 'null');
  if (b?.f === 'demande' && !b.envoyeLe && Date.now() - (b.gardeLe || 0) < 24 * 3600 * 1000 && (b.lien || '') === (LIEN?.id || '')) {
    d = { ...vide(), ...b, v: 3 };
    if (!b.v || b.v < 3) {
      d.adultes = Math.max(1, b.voyageurs || 2); d.style = b.style || '';
      d.incontournable = d.pays.filter((p) => p.incontournable?.trim()).map((p) => `${p.nom} : ${p.incontournable.trim()}`).join('\n');
      d.pays.forEach((p) => { p.incontournable = ''; });
    }
    delete d.gardeLe; delete d.lien;
    brouillonRepris = true;
  }
} catch (_) { /* rien */ }
if (langueParam) d.langue = langueParam;
d.plage = ''; // les anciennes tranches « 3 à 6 » sont remplacées par un nombre de jours
if (CLIENT) { d.client = CLIENT; if (!d.nom) d.nom = CLIENT; }
// Venu du site en touchant une destination (?pays=Japon) : elle est déjà choisie.
const PAYS_PARAM = params.get('pays') || '';
if (PAYS_PARAM && TOUS_PAYS.includes(PAYS_PARAM) && !d.pays.some((p) => p.nom === PAYS_PARAM)) d.pays.push({ nom: PAYS_PARAM, debut: '', fin: '', incontournable: '' });
// L'étape où on est est gardée aussi : si la page se recharge (ex. en tirant vers le bas en haut de la page),
// on revient à la même étape au lieu du début.
const CLE_ETAPE = `${CLE_BROUILLON}:etape`;
const garder = () => {
  try {
    localStorage.setItem(CLE_BROUILLON, JSON.stringify({ ...d, lien: LIEN?.id || '', gardeLe: Date.now() }));
    localStorage.setItem(CLE_ETAPE, String(etape));
  } catch (_) { /* rien */ }
};
let etape = 0;
try {
  const e = parseInt(localStorage.getItem(CLE_ETAPE), 10);
  if (brouillonRepris && !MODE_TEST && e > 0) etape = Math.min(e, 4);
} catch (_) { /* rien */ }
let paysActif = 0;
let moisAffiche = null;
let voirCalendrier = Boolean(d.depart);
let voirStyles = false;
const DUREE_DEFAUT = 10; // montré en gris pâle dans la case de la durée
const semainesTxt = (n) => `${d.langue === 'en' ? 'That is' : 'Soit'} ${TXT[d.langue === 'en' ? 'en' : 'fr'].semaines(Math.floor(n / 7), n % 7)}`;

const t = () => TXT[d.langue] || TXT.fr;
const loc = () => (d.langue === 'en' ? 'en-CA' : 'fr-CA');
const deuxPoints = () => (d.langue === 'en' ? ':' : ' :');
const nomPays = (p) => (d.langue === 'en' ? NOM_EN[p] || p : p);
const nomRegion = (r) => (d.langue === 'en' ? REGIONS.find(([fr]) => fr === r)?.[1] || r : r);
const nomEnvie = (k, nom) => (d.langue === 'en' ? ENVIES_EN[k]?.[0] || nom : nom);
const exEnvie = (k, ex) => (d.langue === 'en' ? ENVIES_EN[k]?.[1] || ex : ex);
const totalVoyageurs = () => Math.max(1, (d.adultes || 0) + (d.enfants || 0));

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const date = (s) => new Date(`${s}T12:00:00`);
const ajouterJours = (s, n) => { const x = date(s); x.setDate(x.getDate() + n); return iso(x); };
const jolie = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? date(s).toLocaleDateString(loc(), opts) : '');
const nomMois = (cle, opts = { month: 'long', year: 'numeric' }) => (cle ? date(`${cle}-15`).toLocaleDateString(loc(), opts) : '');
// « 5 au 12 avr. » plutôt que deux dates complètes.
function plage(debut, fin, annee = false) {
  if (!debut || !fin) return '';
  const opts = { day: 'numeric', month: 'short', ...(annee ? { year: 'numeric' } : {}) };
  try { return new Intl.DateTimeFormat(loc(), opts).formatRange(date(debut), date(fin)); } catch (_) { return `${jolie(debut, opts)} au ${jolie(fin, opts)}`; }
}
const coul = (i) => COULEURS[i % COULEURS.length];

function dureeTexte(n, unite = 'nuits') {
  if (!n) return '';
  const s = Math.floor(n / 7);
  const base = unite === 'jours' ? t().jours(n) : t().nuitsTxt(n);
  return s ? `${base}, ${t().semaines(s, n % 7)}` : base;
}

// Les durées courtes se choisissent par tranche (« 3 à 6 ») ; d.duree garde alors le plus grand nombre.
const plageChoisie = () => (d.mode === 'total' && d.plage ? d.plage.split('-').map(Number) : null);
const dureeAffichee = () => { const p = plageChoisie(); return p ? t().plageJours(p[0], p[1]) : dureeTexte(d.duree, 'jours'); };

// Durée totale du voyage (en jours), quel que soit le mode.
const totalJours = () => (d.mode === 'total' ? d.duree : d.pays.reduce((n, x) => n + nuits(x.debut, x.fin), 0));
const debutVoyage = () => (d.mode === 'total' ? d.depart : d.pays.map((x) => x.debut).filter(Boolean).sort()[0] || '');
const finVoyage = () => (d.mode === 'total' ? (d.depart && d.duree && !d.plage ? ajouterJours(d.depart, d.duree) : '') : d.pays.map((x) => x.fin).filter(Boolean).sort().pop() || '');

// Une étape est « vide » si le client n'y a rien indiqué : le bouton devient alors « Passer cette étape ».
function etapeVide(i = etape) {
  if (i === 0) return !d.pays.length && !d.regions.length;
  if (i === 1) return !d.voyageursChoisis && (d.mode === 'total' ? !d.duree && !d.depart && !d.mois : !d.pays.some((p) => p.debut));
  if (i === 2) return !d.style;
  if (i === 3) return !Object.values(d.envies).some(Boolean) && !d.incontournable.trim() && !d.pays.some((p) => p.incontournable?.trim());
  return false;
}

// ---------- Photo en fond, sur les côtés de la fiche (grands écrans) ----------
// La photo du pays choisi (ou du pays dont on choisit les dates) ; sinon, des photos de voyage qui défilent.
const decor = document.getElementById('decor');
let decorActuel = '';
let decorIndex = 0;
let decorMinuterie = null;
function montrerPhoto(id) {
  if (!decor || !id || id === decorActuel) return;
  decorActuel = id;
  const img = new Image();
  const afficher = () => {
    if (decorActuel !== id) return; // une autre photo a été demandée entre-temps
    // Fondu enchaîné : la nouvelle photo apparaît par-dessus l'ancienne, qui reste en place jusqu'à la fin du fondu.
    const calques = [...decor.querySelectorAll('.decor-img')];
    const visible = calques.find((c) => c.classList.contains('visible'));
    const suivant = calques.find((c) => c !== visible) || calques[0];
    clearTimeout(montrerPhoto.fin);
    suivant.classList.remove('visible', 'sortie');
    suivant.style.backgroundImage = `url("${img.src}")`;
    void suivant.offsetWidth; // relance l'animation de zoom lent
    if (visible) { visible.classList.add('sortie'); visible.classList.remove('visible'); }
    requestAnimationFrame(() => suivant.classList.add('visible'));
    montrerPhoto.fin = setTimeout(() => { if (visible) visible.classList.remove('sortie'); }, 2200);
  };
  img.src = photo(id, 1800);
  (img.decode ? img.decode() : new Promise((ok) => { img.onload = ok; })).then(afficher, () => {});
}
function majDecor() {
  if (!decor || matchMedia('(max-width: 899px)').matches) return;
  const actif = etape === 1 && d.mode === 'pays' ? d.pays[paysActif] : null;
  const choisi = actif && photoPays(actif.nom) ? actif.nom : [...d.pays].reverse().map((p) => p.nom).find(photoPays);
  clearInterval(decorMinuterie);
  if (choisi) { montrerPhoto(photoPays(choisi)); return; }
  montrerPhoto(PHOTOS_FOND[decorIndex % PHOTOS_FOND.length]);
  decorMinuterie = setInterval(() => { decorIndex++; montrerPhoto(PHOTOS_FOND[decorIndex % PHOTOS_FOND.length]); }, 8000);
}
window.addEventListener('resize', () => { clearTimeout(majDecor.r); majDecor.r = setTimeout(majDecor, 300); });

function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m; el.classList.add('visible');
  clearTimeout(toast.m); toast.m = setTimeout(() => el.classList.remove('visible'), 3200);
}

// Un compteur « − 2 + » dont on peut aussi toucher le chiffre pour l'écrire.
const compteur = (cle, n, min, max, nomA11y, classe = '') => `
  <span class="compteur ${classe}">
    <button type="button" data-moins="${cle}" ${n > min ? '' : 'disabled'} aria-label="${t().moins}">${icone('minus', { taille: 16, epaisseur: 2.4 })}</button>
    <input class="nombre" data-nombre="${cle}" type="number" inputmode="numeric" pattern="[0-9]*" min="${min}" max="${max}" value="${n}" aria-label="${esc(nomA11y)}">
    <button type="button" data-plus="${cle}" ${n < max ? '' : 'disabled'} aria-label="${t().plus}">${icone('plus', { taille: 16, epaisseur: 2.4 })}</button>
  </span>`;
const borne = (v, min, max) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

// ---------- Rendu général ----------
function enTete(etapeIci) {
  return `
    <div class="haut-ligne">
      <p class="marque">${esc(MARQUE)}</p>
      <div class="haut-actions">
        ${MONTRER_INSTALLER ? `<button class="petit-bouton" id="installer">${icone('download', { taille: 15 })}<span>${t().installer}</span></button>` : ''}
        <div class="langue" role="group" aria-label="Langue / Language">${['fr', 'en'].map((l) => `<button class="${d.langue === l ? 'choisi' : ''}" data-langue="${l}" lang="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      </div>
    </div>
    ${etapeIci == null ? '' : `
    <div class="progres" role="progressbar" aria-valuemin="1" aria-valuemax="${NB_ETAPES}" aria-valuenow="${etapeIci + 1}" aria-label="${esc(t().etapeSur(etapeIci + 1, NB_ETAPES))}">
      ${t().etapes.map((e, i) => `<button type="button" class="${i < etapeIci ? 'fait' : i === etapeIci ? 'ici' : ''}" data-aller="${i}" ${i === etapeIci ? 'aria-current="step"' : ''}><i></i><span>${e}</span></button>`).join('')}
    </div>
    ${prenomClient && etapeIci === 0 ? `<p class="bonjour">${t().bonjour(esc(prenomClient))}</p>` : ''}
    <p class="etape-sur">${t().etapeSur(etapeIci + 1, NB_ETAPES)}</p>
    <h1>${t().titres[etapeIci]}</h1>`}`;
}

function brancherEnTete(refaire) {
  fiche.querySelectorAll('[data-langue]').forEach((b) => { b.onclick = () => { d.langue = b.dataset.langue; garder(); refaire(); }; });
  fiche.querySelectorAll('[data-aller]').forEach((b) => { b.onclick = () => allerA(+b.dataset.aller); });
  const inst = fiche.querySelector('#installer');
  if (inst) inst.onclick = async () => { if (!(await pwa.installer())) alert(pwa.EXPLICATION[d.langue] || pwa.EXPLICATION.fr); };
}

function majBas() {
  // Dès que l'étape est remplie, le message d'erreur disparaît.
  if (etapeValide(etape)) {
    fiche.querySelectorAll('.erreur-msg').forEach((e) => e.remove());
    fiche.querySelectorAll('.erreur').forEach((e) => e.classList.remove('erreur'));
  }
  const s = fiche.querySelector('#suivant');
  if (!s || etape === 4) return;
  const passer = MODE_TEST && etapeVide();
  s.classList.toggle('passer', passer);
  s.innerHTML = `${passer ? t().passer : t().continuer} ${icone('arrow-right', { taille: 18 })}`;
}

function rendre() {
  document.documentElement.lang = d.langue;
  document.title = `${t().monVoyage} · ${MARQUE}`;
  fiche.innerHTML = `
    <header class="haut">${enTete(etape)}</header>
    <section class="corps" id="corps"></section>
    <footer class="bas">
      ${etape ? `<button class="bouton secondaire" id="retour" aria-label="${t().retour}">${icone('chevron-left', { taille: 18 })}<span>${t().retour}</span></button>` : '<span></span>'}
      <button class="bouton" id="suivant">${etape === 4 ? `${t().envoyerDemande} ${icone('send', { taille: 18 })}` : ''}</button>
    </footer>`;
  brancherEnTete(rendre);
  [etapePays, etapeDates, etapeStyle, etapeEnvies, etapeToi][etape](fiche.querySelector('#corps'));
  if (etape !== 3) fiche.querySelector('#corps').insertAdjacentHTML('beforeend', `<p class="note-requis"><span class="requis">*</span> ${t().requis}</p>`);
  fiche.querySelector('#suivant').onclick = suivant;
  const r = fiche.querySelector('#retour');
  if (r) r.onclick = () => allerA(etape - 1);
  majBas();
  majDecor();
}

function allerA(i) {
  if (i === etape || i < 0 || i >= NB_ETAPES) return;
  // On peut revenir en arrière librement ; pour avancer par la barre d'étapes, celles d'avant doivent être remplies.
  if (i > etape && !MODE_TEST) {
    if (!verifierEtape()) return;
    for (let k = etape + 1; k < i; k++) if (!etapeValide(k)) { i = k; break; }
  }
  etape = i;
  if (etape === 1) { paysActif = Math.max(0, d.pays.findIndex((p) => !p.fin)); moisAffiche = null; }
  garder();
  rendre();
  window.scrollTo(0, 0);
}

// Les champs obligatoires de chaque étape sont-ils remplis ?
function etapeValide(k) {
  if (k === 0) return Boolean(d.pays.length || d.regions.length);
  if (k === 1) return d.mode === 'total' ? d.duree > 0 : d.pays.every((p) => p.debut && p.fin);
  if (k === 2) return Boolean(d.style);
  return true;
}
// Ce qui manque à l'étape (champ obligatoire) : on l'indique sous le champ, sans fenêtre qui bloque.
function verifierEtape() {
  if (MODE_TEST) return true;
  if (etape === 0 && !d.pays.length && !d.regions.length) return montrerErreur('#cherche', t().errDestination, '.recherche');
  if (etape === 1 && d.mode === 'total' && !d.duree) return montrerErreur('#duree-libre', t().errDuree, '.duree-boite');
  if (etape === 1 && d.mode === 'pays' && d.pays.some((p) => !p.debut || !p.fin)) return montrerErreur('.choix-dates', t().errDatesPays, '.choix-dates');
  if (etape === 2 && !d.style) return montrerErreur('.styles', t().errStyle, '.styles');
  return true;
}
function montrerErreur(cible, message, bloc) {
  fiche.querySelectorAll('.erreur-msg').forEach((e) => e.remove());
  fiche.querySelectorAll('.erreur').forEach((e) => e.classList.remove('erreur'));
  const el = fiche.querySelector(bloc) || fiche.querySelector(cible);
  if (el) {
    el.classList.add('erreur');
    el.insertAdjacentHTML('afterend', `<p class="erreur-msg" role="alert">${esc(message)}</p>`);
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const champ = fiche.querySelector(cible);
    if (champ?.focus && champ.matches('input')) champ.focus({ preventScroll: true });
  } else toast(message);
  return false;
}

function suivant() {
  if (etape === 4) return envoyer();
  allerA(etape + 1);
  return undefined;
}

// ---------- 1. Destination ----------
function etapePays(zone) {
  let recherche = '';
  zone.innerHTML = `
    <p class="intro">${t().introPays}</p>
    <label class="petit-titre premier" for="cherche">${t().paysOuRegion} ${REQUIS}</label>
    <label class="recherche">${icone('search', { taille: 18 })}<input id="cherche" type="search" placeholder="${t().chercher}" autocomplete="off" enterkeyhint="search"></label>
    <div id="resultats"></div>
    <div id="choix"></div>`;
  const champ = zone.querySelector('#cherche');
  const dessinerResultats = () => {
    const choisis = d.pays.map((p) => p.nom);
    const q = sansAccents(recherche.trim());
    const resultats = q ? TOUS_PAYS.filter((p) => sansAccents(p).includes(q) || sansAccents(NOM_EN[p]).includes(q)).slice(0, 12) : POPULAIRES;
    zone.querySelector('#resultats').innerHTML = `
      <p class="petit-titre">${q ? t().resultats : t().populaires}</p>
      <div class="puces">${resultats.map((p) => `<button class="puce ${choisis.includes(p) ? 'choisie' : ''}" data-pays="${esc(p)}" aria-pressed="${choisis.includes(p)}">${choisis.includes(p) ? icone('check', { taille: 15, epaisseur: 2.6 }) : icone('plus', { taille: 15 })}${esc(nomPays(p))}</button>`).join('') || `<p class="doux">${t().aucunPays}</p>`}</div>`;
  };
  const dessinerChoix = () => {
    zone.querySelector('#choix').innerHTML = d.pays.length ? `
      <p class="petit-titre">${t().trajet}</p>
      <ol class="trajet">${d.pays.map((p, i) => `
        <li style="--c:${coul(i)}">
          <span class="num">${i + 1}</span><b>${esc(nomPays(p.nom))}</b>
          <span class="actions">
            ${d.pays.length > 1 ? `<button data-monter="${i}" ${i ? '' : 'disabled'} aria-label="${t().plusTot}">${icone('arrow-up', { taille: 16 })}</button>
            <button data-descendre="${i}" ${i < d.pays.length - 1 ? '' : 'disabled'} aria-label="${t().plusTard}">${icone('arrow-down', { taille: 16 })}</button>` : ''}
            <button data-retirer="${i}" aria-label="${t().retirer}">${icone('x', { taille: 16 })}</button>
          </span>
        </li>`).join('')}</ol>` : `
      <div class="indecis">
        <p class="petit-titre">${t().pasDecide}</p>
        <div class="puces">${REGIONS.map(([fr]) => `<button class="puce douce ${d.regions.includes(fr) ? 'choisie' : ''}" data-region="${esc(fr)}" aria-pressed="${d.regions.includes(fr)}">${esc(nomRegion(fr))}</button>`).join('')}</div>
      </div>`;
  };
  dessinerResultats();
  dessinerChoix();
  // On ne redessine que la liste, pour garder le clavier ouvert pendant qu'on tape.
  champ.oninput = () => { recherche = champ.value; dessinerResultats(); };
  champ.onkeydown = (ev) => {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const premier = zone.querySelector('#resultats [data-pays]');
    if (premier && recherche.trim()) premier.click();
  };
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.pays) {
      const n = b.dataset.pays;
      const i = d.pays.findIndex((p) => p.nom === n);
      if (i >= 0) d.pays.splice(i, 1); else d.pays.push({ nom: n, debut: '', fin: '', incontournable: '' });
      if (recherche) { recherche = ''; champ.value = ''; }
    } else if (b.dataset.region) {
      const r = b.dataset.region;
      d.regions = d.regions.includes(r) ? d.regions.filter((x) => x !== r) : [...d.regions, r];
    } else if (b.dataset.monter) { const i = +b.dataset.monter; [d.pays[i - 1], d.pays[i]] = [d.pays[i], d.pays[i - 1]]; }
    else if (b.dataset.descendre) { const i = +b.dataset.descendre; [d.pays[i + 1], d.pays[i]] = [d.pays[i], d.pays[i + 1]]; }
    else if (b.dataset.retirer) d.pays.splice(+b.dataset.retirer, 1);
    else return;
    if (d.mode === 'pays' && d.pays.length < 2) d.mode = 'total';
    garder();
    dessinerResultats();
    dessinerChoix();
    majBas();
    majDecor();
  };
}

// ---------- 2. Dates ----------
const moisDe = (s) => s.slice(0, 7);
const decalerMois = (cle, n) => { const [a, m] = cle.split('-').map(Number); const x = new Date(a, m - 1 + n, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };

// Un seul mois à la fois, avec une flèche de chaque côté du nom du mois.
// plages : [{ debut, fin, i }] pour colorer les jours ; actif : la plage en cours.
function calendrier(plages, actif) {
  const aujourdhui = iso(new Date());
  const [a, m] = moisAffiche.split('-').map(Number);
  const premier = new Date(a, m - 1, 1);
  const decal = (premier.getDay() + 6) % 7; // lundi en premier
  const nb = new Date(a, m, 0).getDate();
  const cases = [];
  for (let i = 0; i < decal; i++) cases.push('<span></span>');
  for (let j = 1; j <= nb; j++) {
    const s = `${moisAffiche}-${String(j).padStart(2, '0')}`;
    const p = plages.find((x) => x.debut && s >= x.debut && s <= (x.fin || x.debut));
    const classes = [s < aujourdhui ? 'passe' : '', s === aujourdhui ? 'auj' : '', p ? 'pris' : '', p && s === p.debut ? 'debut' : '', p && s === (p.fin || p.debut) ? 'fin' : '', p && p.i === actif ? 'actif' : ''].join(' ');
    cases.push(`<button class="jour ${classes}" data-jour="${s}" ${s < aujourdhui ? 'disabled' : ''} style="${p ? `--c:${coul(p.i)}` : ''}" aria-label="${esc(jolie(s, { weekday: 'long', day: 'numeric', month: 'long' }))}">${j}</button>`);
  }
  const auDebut = moisDe(aujourdhui) >= moisAffiche;
  return `
    <div class="calendrier">
      <div class="nav-mois">
        <button data-mois="-1" ${auDebut ? 'disabled' : ''} aria-label="${t().moisPrec}">${icone('chevron-left', { taille: 20 })}</button>
        <p class="mois-nom">${premier.toLocaleDateString(loc(), { month: 'long', year: 'numeric' })}</p>
        <button data-mois="1" aria-label="${t().moisSuiv}">${icone('chevron-right', { taille: 20 })}</button>
      </div>
      <div class="semaine">${t().semaineJours.map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="grille-jours">${cases.join('')}</div>
    </div>`;
}

function etapeDates(zone) {
  // Redessiner ne doit pas faire bouger la page : on garde la position (verticale et la rangée des mois).
  const rangee = zone.querySelector('.mois-rangee');
  const gauche = rangee ? rangee.scrollLeft : null;
  const y = window.scrollY;
  if (d.mode === 'total') datesTotal(zone); else datesPays(zone);
  const nouvelle = zone.querySelector('.mois-rangee');
  if (nouvelle) {
    if (gauche != null) nouvelle.scrollLeft = gauche;
    else {
      // À l'arrivée sur l'étape, le mois déjà choisi est visible.
      const choisi = nouvelle.querySelector('.mois-puce.choisi');
      if (choisi) nouvelle.scrollLeft += choisi.getBoundingClientRect().left - nouvelle.getBoundingClientRect().left - 16;
    }
  }
  if (window.scrollY !== y) window.scrollTo(0, y);
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) { d.mode = b.dataset.mode; moisAffiche = null; paysActif = 0; garder(); etapeDates(zone); majBas(); majDecor(); return; }
    if (b.dataset.mois) { moisAffiche = decalerMois(moisAffiche, +b.dataset.mois); etapeDates(zone); return; }
    if (b.dataset.plus || b.dataset.moins) {
      const cle = b.dataset.plus || b.dataset.moins;
      changerVoyageurs(cle, d[cle] + (b.dataset.plus ? 1 : -1));
      etapeDates(zone); majBas(); return;
    }
    if (b.dataset.voirCal != null) { voirCalendrier = !voirCalendrier; if (!voirCalendrier) d.depart = ''; moisAffiche = null; garder(); etapeDates(zone); majBas(); return; }
    if (d.mode === 'total') clicTotal(b); else clicPays(b);
    garder();
    etapeDates(zone);
    majBas();
    majDecor();
  };
  zone.oninput = (ev) => {
    if (ev.target.id === 'repartition') { d.repartition = ev.target.value; garder(); }
    const cle = ev.target.dataset.nombre;
    if (cle && ev.target.value !== '') { changerVoyageurs(cle, parseInt(ev.target.value, 10)); majBas(); }
    if (ev.target.id === 'duree-libre') {
      // On garde le champ tel quel pendant qu'on tape (pas de redessin, le clavier reste ouvert).
      const v = parseInt(ev.target.value, 10);
      d.duree = v > 0 ? Math.min(365, v) : 0; d.plage = ''; garder(); majBas();
      zone.querySelector('.duree-boite')?.classList.toggle('remplie', Boolean(d.duree));
      const moins = zone.querySelector('[data-duree="-1"]'); if (moins) moins.disabled = d.duree === 1;
      const plus = zone.querySelector('[data-duree="1"]'); if (plus) plus.disabled = d.duree >= 365;
      const r = zone.querySelector('.duree-resume');
      if (r) r.textContent = d.duree >= 7 ? semainesTxt(d.duree) : '';
    }
  };
  // Pas de redessin ici : il ferait rater le toucher sur + ou − juste après avoir tapé.
  zone.onchange = (ev) => {
    if (ev.target.id === 'duree-libre') ev.target.value = d.duree || '';
    const cle = ev.target.dataset.nombre;
    if (cle) { changerVoyageurs(cle, parseInt(ev.target.value, 10)); ev.target.value = d[cle]; }
  };
  zone.onfocusin = (ev) => { if (ev.target.dataset.nombre) ev.target.select(); };
}

// Le voyage au complet : la durée, et le mois (ou la date exacte) du départ si on le connaît.
function datesTotal(zone) {
  const n = d.duree;
  const fin = finVoyage();
  const premierMois = moisDe(iso(new Date()));
  const mois = Array.from({ length: 12 }, (_, i) => decalerMois(premierMois, i));
  if (!moisAffiche) moisAffiche = moisDe(d.depart || (d.mois ? `${d.mois}-01` : ajouterJours(iso(new Date()), 30)));
  const exemple = nomPays(d.pays[0]?.nom || (d.langue === 'en' ? 'Japan' : 'Japon'));
  zone.innerHTML = `
    <p class="intro">${t().introDates}</p>
    <div class="duree-voyageurs">
    <div>
    <label class="petit-titre premier" for="duree-libre">${t().combien} ${REQUIS}</label>
    <div class="duree-boite ${n ? 'remplie' : ''}">
      <label class="duree-champ"><input id="duree-libre" type="number" inputmode="numeric" pattern="[0-9]*" min="1" max="365" value="${n || ''}" placeholder="${DUREE_DEFAUT}"><span>${t().joursMot(2)}</span></label>
      <span class="compteur grand">
        <button type="button" data-duree="-1" ${n === 1 ? 'disabled' : ''} aria-label="${t().moinsJours}">${icone('minus', { taille: 16, epaisseur: 2.4 })}</button>
        <button type="button" data-duree="1" ${n >= 365 ? 'disabled' : ''} aria-label="${t().plusJours}">${icone('plus', { taille: 16, epaisseur: 2.4 })}</button>
      </span>
    </div>
    <p class="doux duree-resume">${n >= 7 ? esc(semainesTxt(n)) : ''}</p>
    </div>
    <div><p class="petit-titre premier">${t().voyageurs} ${REQUIS}</p>${blocVoyageurs()}</div>
    </div>
    <p class="petit-titre">${voirCalendrier ? t().depart : t().quand}</p>
    ${voirCalendrier ? `
    <div class="choix-dates une" style="--c:${coul(0)}">
      <div class="case-date ${d.depart ? '' : 'attend'}"><small>${t().depart}</small><b>${d.depart ? jolie(d.depart) : t().touchDepart}</b></div>
      ${d.depart && fin ? `${icone('arrow-right', { taille: 18 })}<div class="case-date"><small>${t().retourLe}</small><b>${jolie(fin)}</b></div>` : ''}
      ${d.depart ? `<button class="effacer" data-effacer aria-label="${t().effacer}">${icone('x', { taille: 16 })}</button>` : ''}
    </div>
    ${calendrier(d.depart ? [{ debut: d.depart, fin: fin || d.depart, i: 0 }] : [], 0)}
    <button class="lien-mode" data-voir-cal>${icone('chevron-left', { taille: 16 })} ${t().sansDateExacte}</button>` : `
    <div class="mois-rangee" role="group" aria-label="${t().quand}">${mois.map((m) => {
      const [a] = m.split('-');
      const choisi = d.mois === m;
      return `<button class="mois-puce ${choisi ? 'choisi' : ''}" data-choix-mois="${m}" aria-pressed="${choisi}"><b>${esc(nomMois(m, { month: 'short' }).replace('.', ''))}</b><small>${a}</small></button>`;
    }).join('')}</div>
    <button class="lien-mode" data-voir-cal>${icone('calendar', { taille: 16 })} ${t().dateExacte}</button>`}
    ${d.pays.length > 1 ? `
    <label class="champ marge-haut"><span>${t().repartition}</span><textarea id="repartition" rows="2" placeholder="${esc(t().repartitionEx(exemple))}">${esc(d.repartition)}</textarea></label>
    <button class="lien-mode discret" data-mode="pays">${icone('route', { taille: 16 })} ${t().parPays}</button>` : ''}`;
}

function clicTotal(b) {
  // + et − partent de 10 jours (montré en pâle tant que rien n'est choisi) : + donne 11, − donne 9.
  if (b.dataset.duree) { d.duree = borne((d.duree || DUREE_DEFAUT) + +b.dataset.duree, 1, 365); d.plage = ''; }
  else if (b.dataset.choixMois) { d.mois = d.mois === b.dataset.choixMois ? '' : b.dataset.choixMois; d.depart = ''; }
  else if (b.dataset.effacer != null) d.depart = '';
  else if (b.dataset.jour) { d.depart = d.depart === b.dataset.jour ? '' : b.dataset.jour; d.mois = d.depart ? moisDe(d.depart) : d.mois; }
}

// Pays par pays : on touche l'arrivée puis le départ, comme pour un billet d'avion.
function datesPays(zone) {
  if (!d.pays[paysActif]) paysActif = 0;
  const p = d.pays[paysActif];
  if (!moisAffiche) moisAffiche = moisDe(p.debut || d.pays[paysActif - 1]?.fin || ajouterJours(iso(new Date()), 30));
  const debut = debutVoyage();
  const fin = finVoyage();
  const total = nuits(debut, fin);
  zone.innerHTML = `
    <p class="intro">${t().introPays2}</p>
    <div class="onglets-pays">${d.pays.map((x, i) => `
      <button class="onglet-pays ${i === paysActif ? 'choisi' : ''}" data-pays-actif="${i}" style="--c:${coul(i)}">
        <i></i><span><b>${esc(nomPays(x.nom))}</b><small>${x.debut && x.fin ? plage(x.debut, x.fin) : x.debut ? t().choisisDepart : t().aChoisir}</small></span>
      </button>`).join('')}</div>
    <div class="choix-dates" style="--c:${coul(paysActif)}">
      <div class="case-date ${!p.debut || p.fin ? 'attend' : ''}"><small>${t().arrivee}, ${esc(nomPays(p.nom))}</small><b>${p.debut ? jolie(p.debut) : t().choisisJour}</b></div>
      ${icone('arrow-right', { taille: 18 })}
      <div class="case-date ${p.debut && !p.fin ? 'attend' : ''}"><small>${t().depart}</small><b>${p.fin ? jolie(p.fin) : t().choisisJour}</b></div>
      <div class="case-duree">${p.debut && p.fin ? dureeTexte(nuits(p.debut, p.fin)) : ''}</div>
    </div>
    ${calendrier(d.pays.map((x, i) => ({ debut: x.debut, fin: x.fin, i })), paysActif)}
    ${debut && fin && total ? `
      <div class="ligne-temps">
        <p class="petit-titre">${t().tonVoyage}, ${jolie(debut, { day: 'numeric', month: 'long' })} ${t().au} ${jolie(fin, { day: 'numeric', month: 'long' })}, ${dureeTexte(total)}</p>
        <div class="barre-temps">${d.pays.map((x, i) => {
          if (!x.debut || !x.fin) return '';
          const largeur = Math.max(4, (nuits(x.debut, x.fin) / Math.max(1, total)) * 100);
          const gauche = (nuits(debut, x.debut) / Math.max(1, total)) * 100;
          return `<span style="--c:${coul(i)};left:${gauche}%;width:${largeur}%"><b>${esc(nomPays(x.nom))}</b><small>${t().nuitsTxt(nuits(x.debut, x.fin))}</small></span>`;
        }).join('')}</div>
        <div class="semaines">${Array.from({ length: Math.ceil(total / 7) + 1 }, (_, k) => `<span style="left:${Math.min(100, (k * 7 / Math.max(1, total)) * 100)}%">${k ? `${t().sem}${k}` : ''}</span>`).join('')}</div>
      </div>` : `<p class="doux">${t().astuce}</p>`}
    <p class="petit-titre">${t().voyageurs}</p>${blocVoyageurs()}
    <button class="lien-mode discret" data-mode="total">${icone('chevron-left', { taille: 16 })} ${t().retourTotal}</button>`;
}

function clicPays(b) {
  if (b.dataset.paysActif) { paysActif = +b.dataset.paysActif; if (d.pays[paysActif].debut) moisAffiche = moisDe(d.pays[paysActif].debut); return; }
  if (!b.dataset.jour) return;
  const p = d.pays[paysActif];
  const j = b.dataset.jour;
  if (!p.debut || p.fin || j < p.debut) { p.debut = j; p.fin = ''; return; }
  p.fin = j === p.debut ? ajouterJours(j, 1) : j;
  // Le pays suivant commence par défaut le jour du départ.
  const n = d.pays[paysActif + 1];
  if (n && !n.debut) n.debut = p.fin;
  if (n && !n.fin) paysActif++;
}

// Les voyageurs, en petit, à côté de la durée (étape des dates).
const blocVoyageurs = () => `
  <div class="voyageurs-mini">
    <div class="vm-ligne"><span>${t().adultes}</span>${compteur('adultes', d.adultes, 1, 30, t().adultes)}</div>
    <div class="vm-ligne"><span>${t().enfants}<small>${t().enfantsAide}</small></span>${compteur('enfants', d.enfants, 0, 20, t().enfants)}</div>
  </div>`;
function changerVoyageurs(cle, v) {
  if (cle === 'adultes') d.adultes = borne(v, 1, 30);
  else if (cle === 'enfants') d.enfants = borne(v, 0, 20);
  else return false;
  d.voyageurs = totalVoyageurs();
  d.voyageursChoisis = true;
  garder();
  return true;
}

// ---------- 3. Style de voyage ----------
function etapeStyle(zone) {
  const dessiner = () => {
    zone.innerHTML = `
      <p class="intro">${t().introStyle}</p>
      <p class="petit-titre premier">${t().style} ${REQUIS}</p>
      <div class="styles">${STYLES.map(([k, ico, prix]) => `
        <button class="style-carte ${d.style === k ? 'choisi' : ''}" data-style="${k}" aria-pressed="${d.style === k}">
          ${icone(ico, { taille: 22 })}<b>${t().styles[k]}</b><small>${prix}</small>
        </button>`).join('')}</div>
      ${d.style && !voirStyles ? `<p class="style-court">${t().stylesCourt[d.style]}</p>` : ''}
      <button class="lien-mode" id="savoir" aria-expanded="${voirStyles}">${voirStyles ? t().masquer : t().enSavoirPlus}</button>
      ${voirStyles ? `<dl class="styles-info">${STYLES.map(([k, ico]) => `<div class="${d.style === k ? 'choisi' : ''}"><dt>${icone(ico, { taille: 16 })} ${t().styles[k]}</dt><dd><ul>${t().stylesTxt[k].map(([e, v]) => `<li><span>${e}</span>${v}</li>`).join('')}</ul></dd></div>`).join('')}</dl>` : ''}`;
  };
  dessiner();
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.style) { d.style = d.style === b.dataset.style ? '' : b.dataset.style; garder(); }
    else if (b.id === 'savoir') voirStyles = !voirStyles;
    else return;
    dessiner();
    majBas();
  };
}

// ---------- 4. Envies ----------
// Idées précises sous une envie, seulement si un pays connu est choisi : les 3 plus connues
// par pays (2 pays au plus), une par ligne. Toucher une idée ajoute 1 au nombre ; la retoucher l'enlève.
// Sans pays (ou « Surprenez-moi »), aucune idée : des idées générales ne servent à rien.
function ideesEnvie(k) {
  return d.pays.map((p) => p.nom).filter(aDesIdees).slice(0, 2)
    .map((p, i, liste) => ({ pays: liste.length > 1 ? nomPays(p) : '', idees: ideesPour(p, k, d.langue).slice(0, 3) }))
    .filter((g) => g.idees.length);
}

function etapeEnvies(zone) {
  const dessiner = () => {
    zone.innerHTML = `
      <p class="intro">${d.pays.some((p) => aDesIdees(p.nom)) ? t().introEnvies : t().introEnviesSans}</p>
      <div class="envies">${ENVIES.map(([k, nom, ico, ex]) => {
        const n = d.envies[k] || 0;
        const choisies = d.idees[k] || [];
        return `
        <div class="envie ${n ? 'oui' : ''}">
          <div class="envie-tete">
            <button class="envie-zone" data-envie="${k}" aria-pressed="${Boolean(n)}">
              <span class="envie-ico">${icone(ico, { taille: 22 })}</span>
              <span class="envie-txt"><b>${esc(nomEnvie(k, nom))}</b><small>${esc(exEnvie(k, ex))}</small></span>
            </button>
            ${n ? compteur(k, n, 0, 30, `${nomEnvie(k, nom)} : ${t().combienFois}`) : `<button class="ajouter-envie" data-envie="${k}" aria-label="${esc(nomEnvie(k, nom))}">${icone('plus', { taille: 18, epaisseur: 2.2 })}</button>`}
          </div>
          ${n && ideesEnvie(k).length ? `
          <div class="idees" aria-label="${esc(t().touchezIdees)}">${ideesEnvie(k).map((g) => `${g.pays ? `<p class="idees-pays">${esc(g.pays)}</p>` : ''}<div class="idees-liste">${g.idees.map((i) => `<button class="idee ${choisies.includes(i.fr) ? 'choisie' : ''}" data-idee="${k}" data-fr="${esc(i.fr)}" aria-pressed="${choisies.includes(i.fr)}">${choisies.includes(i.fr) ? icone('check', { taille: 13, epaisseur: 2.8 }) : icone('plus', { taille: 13 })}${esc(i.texte)}</button>`).join('')}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}</div>
      <label class="champ marge-haut"><span>${t().aVoir}</span><textarea id="incontournable" rows="2" placeholder="${esc(t().aVoirEx)}">${esc(d.incontournable)}</textarea></label>`;
  };
  dessiner();
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.envie) {
      const k = b.dataset.envie;
      d.envies[k] = d.envies[k] ? 0 : 1;
      if (!d.envies[k]) delete d.idees[k];
    } else if (b.dataset.idee) {
      const k = b.dataset.idee;
      const l = d.idees[k] || [];
      const deja = l.includes(b.dataset.fr);
      d.idees[k] = deja ? l.filter((x) => x !== b.dataset.fr) : [...l, b.dataset.fr];
      d.envies[k] = borne((d.envies[k] || 0) + (deja ? -1 : 1), d.idees[k].length, 30);
      if (!d.envies[k]) delete d.idees[k];
    } else if (b.dataset.plus) d.envies[b.dataset.plus] = Math.min(30, (d.envies[b.dataset.plus] || 0) + 1);
    else if (b.dataset.moins) {
      // Jamais moins que le nombre d'idées cochées.
      const k = b.dataset.moins;
      const min = (d.idees[k] || []).length;
      d.envies[k] = Math.max(min, (d.envies[k] || 0) - 1);
      if (!d.envies[k]) delete d.idees[k];
    }
    else return;
    garder();
    // Le défilement reste en place : on redessine sans faire sauter la page.
    const y = window.scrollY;
    dessiner();
    window.scrollTo(0, y);
    majBas();
  };
  zone.oninput = (ev) => {
    if (ev.target.id === 'incontournable') { d.incontournable = ev.target.value; garder(); majBas(); }
    const cle = ev.target.dataset.nombre;
    if (cle && ev.target.value !== '') { d.envies[cle] = borne(parseInt(ev.target.value, 10), 0, 30); garder(); }
  };
  zone.onchange = (ev) => { const cle = ev.target.dataset.nombre; if (cle) { d.envies[cle] = borne(parseInt(ev.target.value, 10), 0, 30); if (!d.envies[cle]) delete d.idees[cle]; garder(); const y = window.scrollY; dessiner(); window.scrollTo(0, y); } };
  zone.onfocusin = (ev) => { if (ev.target.dataset.nombre) ev.target.select(); };
}

// ---------- 5. Coordonnées ----------
function etapeToi(zone) {
  zone.innerHTML = `
    <p class="intro">${t().introToi}</p>
    <label class="champ"><span>${t().nom} ${REQUIS}</span><input data-champ="nom" value="${esc(d.nom)}" autocomplete="name" placeholder="${esc(t().nomEx)}"></label>
    <input id="site-web-pot" name="site-web" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <label class="champ"><span>${t().courriel} ${REQUIS}</span><input data-champ="courriel" type="email" inputmode="email" value="${esc(d.courriel)}" autocomplete="email" placeholder="${esc(t().courrielEx)}"></label>
    <label class="champ"><span>${t().tel}</span><input data-champ="telephone" type="tel" value="${esc(d.telephone)}" autocomplete="tel"></label>
    <label class="champ"><span>${t().message}</span><textarea data-champ="message" rows="3" placeholder="${esc(t().messageEx)}">${esc(d.message)}</textarea></label>
    <p class="petit-titre">${t().source}</p>
    <div class="grille-sources" role="radiogroup">${Object.entries(t().sources).map(([k, nom]) => `<button type="button" class="${d.source === k ? 'choisi' : ''}" data-source="${k}" role="radio" aria-checked="${d.source === k}">${esc(nom)}</button>`).join('')}</div>
    <label class="champ source-autre" ${d.source === 'autre' ? '' : 'hidden'}><span class="vh">${t().sourceAutre}</span><input data-champ="sourceAutre" value="${esc(d.sourceAutre || '')}" maxlength="120" placeholder="${esc(t().sourceAutreEx)}"></label>
    ${carteResume()}`;
  zone.querySelectorAll('[data-source]').forEach((b) => {
    b.onclick = () => {
      d.source = d.source === b.dataset.source ? '' : b.dataset.source; garder();
      zone.querySelectorAll('[data-source]').forEach((x) => { const on = x.dataset.source === d.source; x.classList.toggle('choisi', on); x.setAttribute('aria-checked', on); });
      const autre = zone.querySelector('.source-autre');
      autre.hidden = d.source !== 'autre';
      if (!autre.hidden && !d.sourceAutre) autre.querySelector('input').focus();
    };
  });
  zone.oninput = (ev) => {
    const k = ev.target.dataset.champ;
    if (!k) return;
    d[k] = ev.target.value; garder();
    const c = ev.target.closest('.champ'); if (c?.classList.contains('erreur')) { c.classList.remove('erreur'); c.querySelector('.erreur-msg')?.remove(); }
    if (k === 'nom') { const s = zone.querySelector('.cr-sur'); if (s) s.textContent = `${t().monVoyage}${d.nom.trim() ? `, ${d.nom.trim()}` : ''}`; }
  };
}

// ---------- Le résumé : une belle carte, qu'on peut enregistrer en image ----------
function lignesPays() {
  return d.pays.map((x, i) => ({
    nom: nomPays(x.nom), couleur: coul(i),
    dates: d.mode === 'pays' ? plage(x.debut, x.fin) : '',
    duree: d.mode === 'pays' ? nuits(x.debut, x.fin) : 0,
  }));
}
function titreDestination() {
  if (d.pays.length) return d.pays.map((x) => nomPays(x.nom)).join(', ');
  if (d.regions.length) return d.regions.map(nomRegion).join(', ');
  return t().destinationAVoir;
}
function sousTitreDates() {
  const debut = debutVoyage();
  const fin = finVoyage();
  if (debut && fin) return plage(debut, fin, true);
  if (debut) return t().departLe(jolie(debut, { day: 'numeric', month: 'long', year: 'numeric' }));
  if (d.mode === 'total' && d.mois) return t().departLe(nomMois(d.mois));
  return t().datesAVoir;
}
const texteVoyageurs = () => [t().adultesN(d.adultes), d.enfants ? t().enfantsN(d.enfants) : ''].filter(Boolean).join(', ');
const enviesChoisies = () => ENVIES.filter(([k]) => d.envies[k]).map(([k, nom, ico]) => ({ k, nom: nomEnvie(k, nom), ico, n: d.envies[k], idees: (d.idees[k] || []).map((x) => traduireIdee(x, d.langue)) }));
const incontournables = () => [
  ...(d.incontournable.trim() ? [{ nom: '', txt: d.incontournable.trim() }] : []),
  ...d.pays.filter((x) => x.incontournable?.trim()).map((x) => ({ nom: nomPays(x.nom), txt: x.incontournable.trim() })),
];
const statsResume = () => {
  const total = totalJours();
  return [
    [String(totalVoyageurs()), t().voyageursN(totalVoyageurs())],
    plageChoisie() || total ? [plageChoisie() ? t().plageTxt(...plageChoisie()) : String(total), t().joursMot(total || 2)] : [t().flexible, t().dureeMot],
    [d.style ? t().styles[d.style] : t().aDefinir, t().styleMot],
  ];
};

function carteResume() {
  const envies = enviesChoisies();
  const inc = incontournables();
  const ph = d.pays.map((p) => photoPays(p.nom)).find(Boolean);
  return `
    <article class="carte-resume">
      <div class="cr-haut ${ph ? 'photo' : ''}" ${ph ? `style="--photo:url('${photo(ph, 900)}')"` : ''}>
        <p class="cr-sur">${t().monVoyage}${d.nom.trim() ? `, ${esc(d.nom.trim())}` : ''}</p>
        <h2>${esc(titreDestination())}</h2>
        <p class="cr-dates">${icone('calendar', { taille: 16 })} ${esc(sousTitreDates())}</p>
        <div class="cr-stats">${statsResume().map(([v, l], i) => `<div><b class="${i === 2 || v.length > 6 ? 'mot' : ''}">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
      </div>
      ${d.pays.length ? `<ol class="cr-pays">${lignesPays().map((x) => `
        <li style="--c:${x.couleur}"><i></i><span><b>${esc(x.nom)}</b>${x.dates ? `<small>${esc(x.dates)}</small>` : ''}</span>${x.duree ? `<em>${esc(t().nuitsTxt(x.duree))}</em>` : ''}</li>`).join('')}
      </ol>` : ''}
      ${d.mode === 'total' && d.pays.length > 1 ? `<p class="cr-note">${esc(d.repartition.trim() || t().jeTeLaisse)}</p>` : ''}
      <div class="cr-bloc"><p class="cr-titre">${t().voyageurs}</p><p class="cr-inc">${esc(texteVoyageurs())}${d.enfants && d.agesEnfants.trim() ? ` (${esc(d.agesEnfants.trim())})` : ''}</p></div>
      ${envies.length ? `<div class="cr-bloc"><p class="cr-titre">${t().mesEnvies}</p><div class="cr-envies">${envies.map((e) => `<span>${icone(e.ico, { taille: 15 })}${esc(e.nom)}<b>${e.n}</b></span>`).join('')}</div>
        ${envies.some((e) => e.idees.length) ? `<ul class="cr-idees">${envies.flatMap((e) => e.idees).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>` : ''}
      ${inc.length ? `<div class="cr-bloc"><p class="cr-titre">${t().aVoirCourt}</p>${inc.map((x) => `<p class="cr-inc">${x.nom ? `<b>${esc(x.nom)}</b> ` : ''}${esc(x.txt)}</p>`).join('')}</div>` : ''}
    </article>`;
}

// Dessine la carte du résumé dans une image, pour la partager aux autres voyageurs.
async function imageResume() {
  try { await document.fonts.load('500 30px Newsreader'); } catch (_) { /* police par défaut */ }
  const W = 1080;
  const M = 48; // marge autour de la carte
  const P = 56; // marge dans la carte
  const L = W - 2 * M - 2 * P; // largeur du texte
  const gauche = M + P;
  const c = document.createElement('canvas');
  c.width = W; c.height = 5000;
  const x = c.getContext('2d');
  // Les grands titres (64 px) en Newsreader, comme sur la page ; le reste dans la police du système.
  const police = (poids, taille) => { x.font = taille >= 60 ? `500 ${taille}px Newsreader, Georgia, serif` : `${poids} ${taille}px -apple-system, 'Segoe UI', system-ui, sans-serif`; };
  const couper = (texte, largeur) => {
    const res = [];
    let ligne = '';
    for (const m of String(texte).split(/\s+/)) {
      const essai = ligne ? `${ligne} ${m}` : m;
      if (x.measureText(essai).width > largeur && ligne) { res.push(ligne); ligne = m; } else ligne = essai;
    }
    if (ligne) res.push(ligne);
    return res;
  };
  const rond = (rx, ry, rw, rh, r) => {
    x.beginPath();
    if (x.roundRect) x.roundRect(rx, ry, rw, rh, r); else x.rect(rx, ry, rw, rh);
  };
  // On note tout ce qu'il faut dessiner, puis on dessine la carte (dont on connaît alors la hauteur) et le contenu.
  const actions = [];
  const texte = (t2, tx, ty, poids, taille, couleur, align = 'left') => actions.push(() => { police(poids, taille); x.fillStyle = couleur; x.textAlign = align; x.fillText(t2, tx, ty); x.textAlign = 'left'; });

  // En-tête foncé
  let y = M + P;
  police(800, 64);
  // Le titre passe à la ligne entre deux noms, jamais au milieu d'un nom.
  const noms = d.pays.length ? d.pays.map((p) => nomPays(p.nom)) : d.regions.length ? d.regions.map(nomRegion) : [t().destinationAVoir];
  const titre = [];
  for (const nomP of noms) {
    const essai = titre.length ? `${titre[titre.length - 1]}, ${nomP}` : nomP;
    if (titre.length && x.measureText(essai).width <= L) titre[titre.length - 1] = essai; else titre.push(...couper(nomP, L));
  }
  y += 24; texte(`${t().monVoyage}${d.nom.trim() ? `, ${d.nom.trim()}` : ''}`.toUpperCase(), gauche, y, 700, 24, 'rgba(255,255,255,.75)');
  y += 8;
  for (const l of titre) { y += 72; texte(l, gauche, y, 800, 64, '#fff'); }
  y += 52; texte(sousTitreDates(), gauche, y, 600, 32, 'rgba(255,255,255,.9)');
  y += 36;
  const yStats = y;
  const largeurStat = (L - 40) / 3;
  statsResume().forEach(([v, lbl], i) => {
    const sx = gauche + i * (largeurStat + 20);
    actions.push(() => { rond(sx, yStats, largeurStat, 132, 24); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill(); });
    texte(v, sx + 24, yStats + 68, 800, v.length > 7 ? 34 : v.length > 4 ? 42 : 52, '#fff');
    texte(lbl, sx + 24, yStats + 108, 600, 24, 'rgba(255,255,255,.75)');
  });
  const hautHeader = yStats + 132 + P - M;
  actions.unshift(() => {
    const g = x.createLinearGradient(M, M, W - M, M + hautHeader);
    g.addColorStop(0, '#2b2622'); g.addColorStop(1, '#1d1b19');
    x.save(); rond(M, M, W - 2 * M, hautHeader, [40, 40, 0, 0]); x.fillStyle = g; x.fill(); x.restore();
    x.fillStyle = '#f0532f'; x.fillRect(M, M + hautHeader - 6, W - 2 * M, 6);
  });
  y = M + hautHeader + 36;

  // Les pays
  lignesPays().forEach((p, i) => {
    const yy = y;
    actions.push(() => { x.beginPath(); x.arc(gauche + 12, yy + (p.dates ? 24 : 34), 12, 0, Math.PI * 2); x.fillStyle = p.couleur; x.fill(); });
    texte(p.nom, gauche + 44, yy + (p.dates ? 36 : 46), 700, 36, '#1d1b19');
    if (p.dates) texte(p.dates, gauche + 44, yy + 76, 500, 28, '#6b655f');
    if (p.duree) texte(t().nuitsTxt(p.duree), W - M - P, yy + 50, 700, 30, p.couleur, 'right');
    y += p.dates ? 108 : 76;
    if (i < d.pays.length - 1) { const ly = y - 14; actions.push(() => { x.fillStyle = '#ebe6df'; x.fillRect(gauche, ly, L, 2); }); }
  });
  const paragraphe = (txt, couleur = '#6b655f') => { police(500, 28); for (const l of couper(txt, L)) { y += 40; texte(l, gauche, y, 500, 28, couleur); } };
  const titreBloc = (txt) => { y += 46; texte(txt.toUpperCase(), gauche, y, 700, 24, '#a19a92'); y += 4; };
  if (d.mode === 'total' && d.pays.length > 1) { paragraphe(d.repartition.trim() || t().jeTeLaisse); y += 16; }

  titreBloc(t().voyageurs);
  paragraphe(`${texteVoyageurs()}${d.enfants && d.agesEnfants.trim() ? ` (${d.agesEnfants.trim()})` : ''}`, '#1d1b19');

  // Les envies, en petites étiquettes avec le nombre dans un rond
  const envies = enviesChoisies();
  if (envies.length) {
    titreBloc(t().mesEnvies); y += 18;
    let ex = gauche;
    for (const e of envies) {
      police(600, 28);
      const w = x.measureText(e.nom).width + 28 + 14 + 40 + 10;
      if (ex + w > gauche + L) { ex = gauche; y += 72; }
      const bx = ex;
      const by = y;
      actions.push(() => {
        rond(bx, by, w, 60, 30); x.fillStyle = '#fdeee9'; x.fill();
        x.beginPath(); x.arc(bx + w - 30, by + 30, 20, 0, Math.PI * 2); x.fillStyle = '#f0532f'; x.fill();
      });
      texte(e.nom, bx + 28, by + 40, 600, 28, '#1d1b19');
      texte(String(e.n), bx + w - 30, by + 39, 800, 24, '#fff', 'center');
      ex += w + 12;
    }
    y += 60;
    const idees = envies.flatMap((e) => e.idees);
    if (idees.length) { y += 6; idees.forEach((i2) => paragraphe(`·  ${i2}`, '#1d1b19')); }
  }
  const inc = incontournables();
  if (inc.length) {
    titreBloc(t().aVoirCourt);
    for (const i2 of inc) { paragraphe(`${i2.nom ? `${i2.nom}${deuxPoints()} ` : ''}${i2.txt}`, '#1d1b19'); y += 6; }
  }
  const basCarte = y + P - 10;

  x.fillStyle = '#faf8f5'; x.fillRect(0, 0, W, c.height);
  x.save(); x.shadowColor = 'rgba(0,0,0,.08)'; x.shadowBlur = 40; x.shadowOffsetY = 10;
  rond(M, M, W - 2 * M, basCarte - M, 40); x.fillStyle = '#fff'; x.fill(); x.restore();
  actions.forEach((f) => f());

  const fin = document.createElement('canvas');
  fin.width = W; fin.height = Math.min(c.height, basCarte + M);
  fin.getContext('2d').drawImage(c, 0, 0);
  return new Promise((ok) => fin.toBlob(ok, 'image/png'));
}

async function partagerImage() {
  const blob = await imageResume();
  if (!blob) return;
  const base = d.pays.length ? d.pays.map((p) => sansAccents(nomPays(p.nom)).replace(/[^a-z]+/g, '-')).join('-') : 'demande';
  const nom = `${`${d.langue === 'en' ? 'my-trip' : 'mon-voyage'}-${base}`.slice(0, 70)}.png`;
  const fichier = new File([blob], nom, { type: 'image/png' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: t().monVoyage }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(t().imagePrete);
}

// ---------- Envoi ----------
function texteMessage(lien) {
  const dp = deuxPoints();
  const lignes = [];
  if (d.mode === 'pays' && d.pays.some((x) => x.debut)) {
    d.pays.forEach((x) => lignes.push(`- ${nomPays(x.nom)}${dp} ${x.debut && x.fin ? `${plage(x.debut, x.fin, true)} (${t().nuitsTxt(nuits(x.debut, x.fin))})` : t().datesAVoir}`));
  } else {
    lignes.push(`- ${titreDestination()}`);
    if (d.duree) lignes.push(`- ${t().dureeTotale}${dp} ${dureeAffichee()}`);
    lignes.push(`- ${sousTitreDates()}`);
  }
  lignes.push(`- ${texteVoyageurs()}${d.enfants && d.agesEnfants.trim() ? ` (${d.agesEnfants.trim()})` : ''}`);
  if (d.style) lignes.push(`- ${t().style}${dp} ${t().styles[d.style]}`);
  const envies = enviesChoisies();
  if (envies.length) lignes.push(`- ${t().mesEnvies}${dp} ${envies.map((e) => e.nom).join(', ')}`);
  if (d.source && t().sources[d.source]) lignes.push(`- ${t().source}${dp} ${t().sources[d.source]}${d.source === 'autre' && d.sourceAutre?.trim() ? ` (${d.sourceAutre.trim()})` : ''}`);
  return t().corps(lignes.join('\n'), lien, d.nom);
}

function marquerErreur(champ, message) {
  fiche.querySelectorAll('.erreur-msg').forEach((e) => e.remove());
  const el = fiche.querySelector(`[data-champ="${champ}"]`);
  if (!el) return toast(message);
  const c = el.closest('.champ');
  c.classList.add('erreur');
  c.insertAdjacentHTML('beforeend', `<span class="erreur-msg" role="alert">${esc(message)}</span>`);
  el.focus();
  return undefined;
}

// Notification instantanée sur le téléphone de Raph (appli ntfy). Rien de privé : pas de courriel ni de téléphone.
async function alerter(suspect = '') {
  if (!ALERTE) return false;
  const prenom = d.nom.trim().split(/\s+/)[0].slice(0, 30);
  const ou = d.pays.length ? d.pays.map((x) => x.nom).join(', ') : d.regions.join(', ') || 'destination à définir';
  const jours = totalJours();
  const n = totalVoyageurs();
  const texte = `${prenom} · ${ou}${jours ? ` · ${jours} jours` : ''} · ${n} voyageur${n > 1 ? 's' : ''}${d.telephone.trim() ? ' · touche pour lui texter' : ''}`;
  // Boutons dans la notification : Texto (ou Courriel) déjà écrit pour proposer un appel, et l'agenda.
  const message = messageAppel({ nom: d.nom, langue: d.langue });
  const tel = d.telephone.trim();
  const contact = tel ? ['Texto', lienTexto(tel, message)] : d.courriel.trim() ? ['Courriel', lienCourriel(d.courriel, d.langue, message)] : null;
  const actions = [contact && `view, ${contact[0]}, ${contact[1]}`, 'view, Mon agenda, https://calendar.google.com/calendar/r/week', `view, Voir la demande, ${new URL('./#/demandes', location.href).href}`].filter(Boolean).join('; ');
  const q = new URLSearchParams({
    title: `${MODE_TEST ? '(Essai) ' : ''}${suspect ? '(À vérifier) ' : ''}Nouvelle demande de voyage${LIEN ? '' : ' · site'}`, tags: 'airplane', priority: 'high',
    click: contact ? contact[1] : new URL('./#/demandes', location.href).href,
    actions,
  });
  // Réessaie si le réseau du client flanche (jusqu'à 3 fois).
  for (let k = 0; k < 3; k++) {
    try { if ((await fetch(`${RELAIS}/${ALERTE}?${q}`, { method: 'POST', body: texte.slice(0, 300) })).ok) return true; } catch (_) { /* réessaie */ }
    await new Promise((r) => setTimeout(r, 800 * (k + 1)));
  }
  return false;
}

async function envoyer() {
  if (!d.nom.trim()) return marquerErreur('nom', t().errNom);
  if (!/^\S+@\S+\.\S+$/.test(d.courriel.trim())) return marquerErreur('courriel', t().errCourriel);
  d.voyageurs = totalVoyageurs();
  d.envoyeLe = new Date().toISOString();
  // On n'envoie que ce qui sert au mode choisi.
  const envoi = structuredClone(d);
  delete envoi.voyageursChoisis;
  envoi.sourceAutre = envoi.source === 'autre' ? (envoi.sourceAutre || '').trim().slice(0, 120) : '';
  if (envoi.pays.length) envoi.regions = [];
  if (envoi.mode !== 'total') envoi.plage = '';
  if (envoi.mode === 'total') envoi.pays.forEach((p) => { p.debut = ''; p.fin = ''; });
  else { envoi.duree = totalJours(); envoi.depart = debutVoyage(); envoi.mois = moisDe(envoi.depart || ''); envoi.repartition = ''; }
  envoi.idees = Object.fromEntries(Object.entries(envoi.idees).filter(([k, l]) => envoi.envies[k] && l.length));
  const code = await encoder(envoi);
  const lien = `${new URL('studio/', location.href).href}#/demande/${code}`;
  garder(); // le brouillon envoyé ne sera pas rouvert la prochaine fois
  // Envoi automatique : la demande part directement au courriel de Raph (FormSubmit, gratuit).
  let etat = 'envoi';
  const suspect = envoiSuspect();
  const envoyerAuto = async () => {
    // 1. Directement dans l'appli de Raph (relais gratuit, chiffré avec la clé du lien).
    // Même un envoi douteux part (marqué « à vérifier ») : aucune demande n'est perdue en silence.
    let parRelais = false;
    try {
      const canal = await canalDemande(LIEN_ENVOI.id, LIEN_ENVOI.cle);
      const corps = enBase64Url(await chiffrerJson(LIEN_ENVOI.cle, { code, nom: d.nom.trim().slice(0, 80), envoyeLe: d.envoyeLe, ...(suspect ? { suspect } : {}) }));
      parRelais = await deposerRelais(canal, corps);
    } catch (_) { parRelais = false; }
    // 2. La notification sur le téléphone de Raph, chaque fois.
    await alerter(suspect);
    if (!POUR) { etat = parRelais ? 'ok' : 'manuel'; dessiner(); return; }
    // 2. Et par courriel (FormSubmit), en plus.
    try {
      const rep = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(POUR)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouvelle demande de voyage : ${d.pays.length ? d.pays.map((x) => x.nom).join(', ') : d.regions.join(', ') || 'destination à définir'} (${d.nom.trim()})`,
          _template: 'box', _captcha: 'false',
          Nom: d.nom.trim(), email: d.courriel.trim() || undefined, Téléphone: d.telephone.trim() || '-',
          Demande: texteMessage(lien), 'Ouvrir dans le Studio': lien,
        }),
      });
      const r = await rep.json().catch(() => ({}));
      etat = parRelais || (rep.ok && String(r.success) !== 'false') ? 'ok' : 'manuel';
    } catch (_) { etat = parRelais ? 'ok' : 'manuel'; }
    dessiner();
  };
  const dessiner = () => {
    document.documentElement.lang = d.langue;
    const sujet = t().sujet(titreDestination(), d.nom.trim());
    const texte = texteMessage(lien);
    fiche.innerHTML = `
      <header class="haut">${enTete(null)}</header>
      <section class="merci ${etat}">
        <span class="merci-ico">${etat === 'envoi' ? '<i class="roue"></i>' : icone(etat === 'ok' ? 'check' : 'send', { taille: 30, epaisseur: 2.4 })}</span>
        ${etat === 'envoi' ? `<h1>${t().envoiCours}</h1>` : etat === 'ok' ? `<h1>${t().envoyee}</h1><p>${t().envoyeeTxt}</p>` : `<h1>${t().presque}</h1><p>${POUR ? t().echec : t().presqueTxt}</p>`}
        ${etat === 'manuel' ? `        <div class="boutons-envoi">
          ${POUR ? `<a class="bouton" href="mailto:${encodeURIComponent(POUR)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte)}">${icone('mail', { taille: 18 })} ${t().parCourriel}</a>` : ''}
          ${TEL ? `<a class="bouton ${POUR ? 'secondaire' : ''}" href="sms:${TEL}?&body=${encodeURIComponent(texte)}">${icone('message-circle', { taille: 18 })} ${t().parMessage}</a>`
            : navigator.share ? `<button class="bouton ${POUR ? 'secondaire' : ''}" id="partager">${icone('message-circle', { taille: 18 })} ${t().parMessage}</button>` : ''}
          ${POUR || TEL || navigator.share ? `<button class="lien" id="copier">${icone('copy', { taille: 16 })} ${t().copier}</button>` : `<button class="bouton" id="copier">${icone('copy', { taille: 18 })} ${t().copier}</button>`}
        </div>` : ''}
        ${carteResume()}
        <button class="bouton secondaire" id="image">${icone('image', { taille: 18 })} ${t().image}</button>
        <p class="doux">${t().imageAide}</p>
        <div class="merci-liens"><button class="lien" id="modifier">${t().modifier}</button><button class="lien" id="nouvelle">${t().nouvelle}</button></div>
      </section>`;
    brancherEnTete(dessiner);
    const p = fiche.querySelector('#partager');
    if (p) p.onclick = async () => { try { await navigator.share({ title: sujet, text: texte }); toast(t().merci); } catch (_) { /* annulé */ } };
    const c = fiche.querySelector('#copier');
    if (c) c.onclick = async () => {
      try { await navigator.clipboard.writeText(texte); toast(t().copie); } catch (_) { prompt(t().copieCeTexte, texte); }
    };
    fiche.querySelector('#image').onclick = partagerImage;
    fiche.querySelector('#modifier').onclick = () => { delete d.envoyeLe; garder(); etape = 0; rendre(); window.scrollTo(0, 0); };
    fiche.querySelector('#nouvelle').onclick = () => { const l = d.langue; d = vide(); d.langue = l; if (CLIENT) { d.client = CLIENT; d.nom = CLIENT; } garder(); etape = 0; voirCalendrier = false; rendre(); window.scrollTo(0, 0); };
  };
  dessiner();
  window.scrollTo(0, 0);
  if (etat === 'envoi') envoyerAuto();
  return undefined;
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
rendre();
