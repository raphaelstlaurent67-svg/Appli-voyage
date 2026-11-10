// Site web public : présente le service et envoie les clients vers la fiche de demande.
// Pour changer le nom de la marque partout sur le site, il suffit de changer MARQUE.

import { icone } from './icones.js';
import { photo, PHOTOS_PAYS, PHOTOS_FOND } from './photos.js';

const MARQUE = 'Voyage sur mesure';

const TXT = {
  fr: {
    navComment: 'Comment ça marche', navRecois: 'Ce que vous recevez', navFaq: 'Questions',
    cta: 'Demander mon voyage', ctaCourt: 'Commencer', voirComment: 'Comment ça marche',
    surtitre: 'Itinéraires sur mesure',
    titre: 'Le monde, tel que peu le voient.',
    sousTitre: "Des endroits choisis un par un, par des gens qui y vivent. Votre voyage, tracé jour après jour, loin des listes que tout le monde suit.",
    rassure1: 'Une fiche, deux minutes', rassure2: 'Le prix avant de commencer', rassure3: 'Vous réservez, à votre rythme',
    commentSur: 'Comment ça marche', commentTitre: 'Trois étapes.',
    e1t: 'Vous nous dites où', e1p: 'Les pays, la durée, ce qui vous attire. Deux minutes.',
    e2t: 'Nous traçons la route', e2p: 'Chaque nuit, chaque table, chaque détour, choisis pour vous.',
    e3t: 'Vous partez', e3p: 'Le voyage jour par jour, la carte, les liens. Il ne reste qu’à réserver.',
    recoisSur: 'Ce que vous recevez', recoisTitre: 'Un voyage entier, déjà pensé.',
    recoisTexte: "Rien de copié d'internet. Des adresses vues, vérifiées, mises dans le bon ordre.",
    r1t: 'Le fil des jours', r1p: 'Quoi faire, où, et à quel moment.',
    r2t: 'Où dormir', r2p: 'Des lieux à votre mesure, du simple au rare.',
    r3t: 'Où manger', r3p: 'Les tables, les marchés, la cuisine de rue qui compte.',
    r4t: 'La carte', r4p: 'Chaque endroit à sa place, sur votre cellulaire.',
    r5t: 'Le budget', r5p: 'Ce que coûtera le voyage sur place, avant de partir.',
    destSur: 'Destinations', destTitre: 'Où irez-vous ?',
    faqSur: 'Questions', faqTitre: 'Les questions fréquentes',
    faq: [
      ['Combien ça coûte ?', "Ça dépend du nombre de pays et de jours. Après votre fiche, nous vous donnons un prix clair avant de commencer. Aucune obligation."],
      ['Est-ce que vous réservez pour moi ?', 'Non : nous préparons votre itinéraire complet avec tous les liens, et vous réservez vous-même. Vous gardez le contrôle de vos billets et de votre argent.'],
      ['Et si je ne connais pas encore mes dates ?', 'Aucun problème. Dans la fiche, indiquez simplement la durée (par exemple 10 jours) ; on précise le reste ensuite.'],
      ['Est-ce que je peux modifier l’itinéraire ?', 'Oui. Si quelque chose ne vous convient pas, nous l’ajustons ensemble.'],
    ],
    appelTitre: 'Le départ commence ici.', appelTexte: 'Une fiche. Notre équipe vous répond avec une proposition.',
    pied: 'Itinéraires de voyage sur mesure', credits: 'Photos : Unsplash',
  },
  en: {
    navComment: 'How it works', navRecois: 'What you get', navFaq: 'Questions',
    cta: 'Plan my trip', ctaCourt: 'Start', voirComment: 'How it works',
    surtitre: 'Custom itineraries',
    titre: 'The world, as few see it.',
    sousTitre: 'Places chosen one by one, by people who live there. Your trip, drawn day by day, far from the lists everyone follows.',
    rassure1: 'One form, two minutes', rassure2: 'The price before we begin', rassure3: 'You book, at your own pace',
    commentSur: 'How it works', commentTitre: 'Three steps.',
    e1t: 'Tell us where', e1p: 'The countries, the length, what draws you. Two minutes.',
    e2t: 'We draw the route', e2p: 'Every night, every table, every detour, chosen for you.',
    e3t: 'You leave', e3p: 'The trip day by day, the map, the links. All that is left is to book.',
    recoisSur: 'What you get', recoisTitre: 'A whole journey, already thought through.',
    recoisTexte: 'Nothing copied from the internet. Places seen, checked, set in the right order.',
    r1t: 'The thread of the days', r1p: 'What to do, where, and when.',
    r2t: 'Where to sleep', r2p: 'Places that fit you, from simple to rare.',
    r3t: 'Where to eat', r3p: 'The tables, the markets, the street food that matters.',
    r4t: 'The map', r4p: 'Every place where it belongs, on your phone.',
    r5t: 'The budget', r5p: 'What the trip will cost on the ground, before you go.',
    destSur: 'Destinations', destTitre: 'Where will you go?',
    faqSur: 'Questions', faqTitre: 'Frequently asked questions',
    faq: [
      ['How much does it cost?', 'It depends on the number of countries and days. After your form, we give you a clear price before starting. No obligation.'],
      ['Do you book for me?', 'No: we prepare your full itinerary with every link, and you book yourself. You stay in control of your tickets and your money.'],
      ["What if I don't know my dates yet?", 'No problem. In the form, just enter the length (for example 10 days) and we sort out the rest later.'],
      ['Can I change the itinerary?', "Yes. If something doesn't feel right, we adjust it together."],
    ],
    appelTitre: 'The journey begins here.', appelTexte: 'One form. Our team replies with a proposal.',
    pied: 'Custom travel itineraries', credits: 'Photos: Unsplash',
  },
};

// Destinations mises en avant (nom en français pour la fiche, nom affiché selon la langue).
const DESTINATIONS = [
  ['Japon', 'Japan'], ['Thaïlande', 'Thailand'], ['Vietnam', 'Vietnam'], ['Indonésie', 'Indonesia'], ['Corée du Sud', 'South Korea'],
  ['France', 'France'], ['Italie', 'Italy'], ['Espagne', 'Spain'], ['Portugal', 'Portugal'], ['Grèce', 'Greece'],
  ['Mexique', 'Mexico'], ['Cuba', 'Cuba'], ['Costa Rica', 'Costa Rica'], ['Pérou', 'Peru'], ['Maroc', 'Morocco'],
];

let langue = 'fr';
try { langue = localStorage.getItem('langueSite') || (/^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en'); } catch (_) { /* rien */ }
const lienDemande = () => `../demande.html?lang=${langue}`;
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function afficher() {
  const t = TXT[langue];
  document.documentElement.lang = langue;
  document.title = `${MARQUE}, ${t.surtitre}`;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  document.querySelectorAll('[data-marque]').forEach((el) => { el.textContent = MARQUE; });
  document.querySelectorAll('[data-demande]').forEach((el) => { el.href = lienDemande(); });
  document.querySelectorAll('[data-langue]').forEach((b) => b.classList.toggle('choisi', b.dataset.langue === langue));
  document.getElementById('destinations-liste').innerHTML = DESTINATIONS.map(([fr, en]) => `
    <a class="destination" href="${lienDemande()}" style="${PHOTOS_PAYS[fr] ? `--photo:url('${photo(PHOTOS_PAYS[fr], 700)}')` : ''}"><span>${esc(langue === 'en' ? en : fr)}</span></a>`).join('');
  document.getElementById('faq-liste').innerHTML = t.faq.map(([q, r]) => `<details><summary>${esc(q)}${icone('chevron-down', { taille: 18 })}</summary><p>${esc(r)}</p></details>`).join('');
}

document.querySelectorAll('[data-ico]').forEach((el) => {
  const grand = el.closest('.etapes, .liste-recois');
  el.innerHTML = icone(el.dataset.ico, { taille: grand ? 22 : el.classList.contains('marque-ico') ? 17 : 18, epaisseur: el.classList.contains('marque-ico') ? 2.2 : 2 });
});
document.querySelectorAll('[data-langue]').forEach((b) => {
  b.onclick = () => { langue = b.dataset.langue; try { localStorage.setItem('langueSite', langue); } catch (_) { /* rien */ } afficher(); };
});
afficher();

// Couverture : quelques photos de voyage qui se suivent, avec un zoom lent.
const fond = document.getElementById('fond-couverture');
if (fond) {
  // Deux calques seulement : la photo suivante est chargée et décodée AVANT le fondu,
  // puis elle apparaît par-dessus l'ancienne. Le fondu reste donc fluide.
  const calques = [0, 1].map(() => { const c = document.createElement('div'); c.className = 'fond-img'; fond.append(c); return c; });
  let i = 0;
  let visible = null;
  const montrer = (n) => {
    const img = new Image();
    img.src = photo(PHOTOS_FOND[n], 2000);
    (img.decode ? img.decode() : new Promise((ok) => { img.onload = ok; })).then(() => {
      const suivant = calques.find((c) => c !== visible);
      suivant.classList.remove('visible', 'sortie');
      suivant.style.backgroundImage = `url("${img.src}")`;
      void suivant.offsetWidth;
      const ancien = visible;
      if (ancien) { ancien.classList.add('sortie'); ancien.classList.remove('visible'); }
      requestAnimationFrame(() => suivant.classList.add('visible'));
      setTimeout(() => ancien && ancien.classList.remove('sortie'), 2200);
      visible = suivant;
    }, () => {});
  };
  montrer(0);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => { i = (i + 1) % PHOTOS_FOND.length; montrer(i); }, 7000);
  }
}
