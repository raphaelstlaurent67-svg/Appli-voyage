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
    titre: 'Votre voyage, pensé juste pour vous.',
    sousTitre: "Dites-nous où vous voulez aller et ce que vous aimez. Notre équipe prépare votre itinéraire jour par jour, avec les meilleurs endroits choisis un par un.",
    rassure1: 'Fiche de 2 minutes', rassure2: 'Prix connu avant de commencer', rassure3: 'Vous réservez vous-même, à votre rythme',
    commentSur: 'Comment ça marche', commentTitre: 'Trois étapes, zéro casse-tête',
    e1t: 'Vous remplissez la fiche', e1p: 'Vos pays, vos dates (ou juste la durée), vos envies. Ça prend 2 minutes.',
    e2t: 'Nous préparons votre itinéraire', e2p: 'Chaque hébergement, resto et activité est choisi selon votre style et votre budget.',
    e3t: 'Vous partez l’esprit tranquille', e3p: 'Vous recevez votre voyage jour par jour, avec la carte et tous les liens. Il ne reste qu’à réserver.',
    recoisSur: 'Ce que vous recevez', recoisTitre: 'Tout votre voyage, prêt à partir',
    recoisTexte: "Pas une liste copiée d'internet : des endroits choisis à la main, organisés pour que chaque journée ait du sens.",
    r1t: 'Un plan jour par jour', r1p: 'Quoi faire, où, et dans quel ordre.',
    r2t: 'Où dormir', r2p: 'Des hébergements à votre image : économique, confort ou luxe.',
    r3t: 'Où manger', r3p: 'Les bons restos, la cuisine de rue et les marchés à ne pas manquer.',
    r4t: 'La carte de votre voyage', r4p: 'Chaque endroit placé sur la carte, facile à suivre sur votre cellulaire.',
    r5t: 'Un budget estimé', r5p: 'Une idée claire du coût sur place avant de partir.',
    destSur: 'Destinations', destTitre: 'Où voulez-vous aller ?',
    faqSur: 'Questions', faqTitre: 'Les questions fréquentes',
    faq: [
      ['Combien ça coûte ?', "Ça dépend du nombre de pays et de jours. Après votre fiche, nous vous donnons un prix clair avant de commencer. Aucune obligation."],
      ['Est-ce que vous réservez pour moi ?', 'Non : nous préparons votre itinéraire complet avec tous les liens, et vous réservez vous-même. Vous gardez le contrôle de vos billets et de votre argent.'],
      ['Et si je ne connais pas encore mes dates ?', 'Aucun problème. Dans la fiche, indiquez simplement la durée (par exemple 10 jours) ; on précise le reste ensuite.'],
      ['Est-ce que je peux modifier l’itinéraire ?', 'Oui. Si quelque chose ne vous convient pas, nous l’ajustons ensemble.'],
    ],
    appelTitre: 'Prêt à partir ?', appelTexte: 'Remplissez la fiche : notre équipe vous répond avec une proposition.',
    pied: 'Itinéraires de voyage sur mesure', credits: 'Photos : Unsplash',
  },
  en: {
    navComment: 'How it works', navRecois: 'What you get', navFaq: 'Questions',
    cta: 'Plan my trip', ctaCourt: 'Start', voirComment: 'How it works',
    surtitre: 'Custom itineraries',
    titre: 'Your trip, designed just for you.',
    sousTitre: 'Tell us where you want to go and what you love. Our team plans your day-by-day itinerary with the best places, hand-picked one by one.',
    rassure1: '2-minute form', rassure2: 'Price known upfront', rassure3: 'You book yourself, at your pace',
    commentSur: 'How it works', commentTitre: 'Three steps, zero headache',
    e1t: 'Fill in the form', e1p: 'Your countries, your dates (or just the length), what you love. It takes 2 minutes.',
    e2t: 'We plan your itinerary', e2p: 'Every stay, restaurant and activity is picked to match your style and budget.',
    e3t: 'You travel stress-free', e3p: 'You get your trip day by day, with the map and every link. All you do is book.',
    recoisSur: 'What you get', recoisTitre: 'Your whole trip, ready to go',
    recoisTexte: 'Not a list copied from the internet: hand-picked places, organized so every day makes sense.',
    r1t: 'A day-by-day plan', r1p: 'What to do, where, and in what order.',
    r2t: 'Where to stay', r2p: 'Stays that match your style: budget, comfort or luxury.',
    r3t: 'Where to eat', r3p: "Great restaurants, street food and markets you shouldn't miss.",
    r4t: 'Your trip map', r4p: 'Every place on the map, easy to follow on your phone.',
    r5t: 'An estimated budget', r5p: 'A clear idea of costs on the ground before you go.',
    destSur: 'Destinations', destTitre: 'Where do you want to go?',
    faqSur: 'Questions', faqTitre: 'Frequently asked questions',
    faq: [
      ['How much does it cost?', 'It depends on the number of countries and days. After your form, we give you a clear price before starting. No obligation.'],
      ['Do you book for me?', 'No: we prepare your full itinerary with every link, and you book yourself. You stay in control of your tickets and your money.'],
      ["What if I don't know my dates yet?", 'No problem. In the form, just enter the length (for example 10 days) and we sort out the rest later.'],
      ['Can I change the itinerary?', "Yes. If something doesn't feel right, we adjust it together."],
    ],
    appelTitre: 'Ready to go?', appelTexte: 'Fill in the form: our team will reply with a proposal.',
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
  document.title = `${MARQUE} · ${t.surtitre}`;
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
