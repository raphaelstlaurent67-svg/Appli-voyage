// Site web public : présente le service et envoie les clients vers la fiche de demande.
// Pour changer le nom de la marque partout sur le site, il suffit de changer MARQUE (js/marque.js).

import './clavier.js';
import { icone } from './icones.js';
import { photo, PHOTOS_PAYS, PHOTOS_FOND } from './photos.js';
import { MARQUE } from './marque.js';
import { TOUS_PAYS, NOM_EN, sansAccents } from './noms-pays.js';

const TXT = {
  fr: {
    navComment: 'Notre méthode', navRecois: 'Ce que vous recevez', navFaq: 'Questions',
    cta: 'Demander mon voyage', ctaCourt: 'Commencer', voirComment: 'Notre méthode',
    surtitre: 'Itinéraires de voyage sur mesure',
    titre: 'Votre grand voyage, conçu sur mesure.',
    sousTitre: 'Nous concevons votre itinéraire complet selon vos goûts, votre rythme et votre budget, avec des adresses repérées sur place par notre équipe.',
    rassure1: 'Prix fixe, convenu d’avance', rassure2: 'Une équipe québécoise', rassure3: 'Ajustements inclus',
    commentSur: 'Notre méthode', commentTitre: 'De votre demande à votre départ',
    e1t: 'Votre projet', e1p: 'Destinations, période, style et envies.',
    e2t: 'Un premier appel', e2p: 'Quinze minutes pour bien vous comprendre.',
    e3t: 'Votre itinéraire', e3p: 'Votre voyage, jour par jour.',
    recoisSur: 'Ce que vous recevez', recoisTitre: 'Un itinéraire complet, prêt à réserver',
    recoisTexte: 'Chaque recommandation est choisie pour vous, selon votre style de voyage et votre budget.',
    r1t: 'Jour par jour', r1p: 'Quoi faire, où et à quel moment.',
    r2t: 'Où dormir', r2p: 'Des hébergements adaptés à votre budget.',
    r3t: 'Où manger', r3p: 'Des restaurants, des marchés et de la cuisine locale.',
    r4t: 'La carte', r4p: 'Toutes les adresses sur une carte, dans votre cellulaire.',
    r5t: 'Le budget', r5p: 'Une estimation des dépenses sur place.',
    destSur: 'Destinations', destTitre: 'Où aimeriez-vous aller ?',
    destTexte: 'Nous préparons des voyages partout dans le monde.',
    chercherPays: 'Rechercher un pays', aucunPays: 'Aucun pays trouvé.', autreDest: 'Une autre destination', autreDestP: 'Rechercher un pays',
    pasDecide: 'Pas encore décidé ? Commencez quand même',
    faqSur: 'Questions', faqTitre: 'Les questions fréquentes',
    faq: [
      ['Combien ça coûte ?', 'Le prix dépend de la durée du voyage et du nombre de pays. Il est fixé lors de notre premier appel, avant que le travail commence. Aucune obligation.'],
      ['Qui prépare mon itinéraire ?', 'Notre équipe, au Québec. Nos éclaireurs, des voyageurs que nous connaissons personnellement, se rendent sur place pour repérer les adresses que nous recommandons.'],
      ['Pour quel genre de voyage ?', 'Surtout les voyages qui comptent : lune de miel, voyage de retraite, sabbatique ou grand voyage en famille. Seul, en couple ou en groupe.'],
      ['Est-ce que vous réservez pour moi ?', 'Non. Vous recevez l’itinéraire complet avec un lien pour chaque hôtel, activité et transport, et vous réservez vous-même. Vous gardez le contrôle de vos billets et de votre argent.'],
      ['Pourquoi ne pas tout planifier moi-même ?', 'Vous pouvez, mais un bon itinéraire demande des dizaines d’heures de recherche. Nous faisons ce travail pour vous, et vous partez avec des adresses déjà repérées.'],
      ['Et si je ne sais pas encore où aller ?', 'C’est fréquent. Indiquez une région qui vous attire, ou « Surprenez-moi », et dites-nous ce que vous aimez. Nous vous proposerons des destinations.'],
      ['Et si je ne connais pas encore mes dates ?', 'Aucun problème. Indiquez le mois et une durée approximative : nous ajusterons ensemble.'],
      ['Combien de temps à l’avance dois-je faire ma demande ?', 'Idéalement deux mois ou plus avant le départ. Le délai de préparation vous est confirmé lors du premier appel.'],
      ['Est-ce que je peux modifier l’itinéraire ?', 'Oui. Si quelque chose ne vous convient pas, nous l’ajustons avec vous.'],
      ['Mes informations restent-elles privées ?', 'Oui. Vos réponses servent uniquement à préparer votre voyage. Elles ne sont jamais vendues ni partagées.'],
    ],
    appelTitre: 'Parlons de votre prochain voyage', appelTexte: 'Décrivez votre projet en quelques minutes. Nous vous contactons pour en discuter.',
    e1m: 'Notre formulaire de demande nous permet de cerner votre projet : destinations, période, nombre de voyageurs, style de voyage et centres d’intérêt. Si vous n’avez pas encore choisi de pays, une région suffit.',
    e2m: 'Lors d’un appel de quinze minutes, nous validons avec vous vos attentes, votre rythme et votre budget. Nous vous confirmons ensuite le prix et le délai de préparation, sans engagement de votre part.',
    e3m: 'Votre itinéraire vous est remis sur une page personnelle : programme jour par jour, carte, hébergements, restaurants et activités recommandés, avec tous les liens de réservation.',
    r1m: 'Chaque journée est organisée selon votre rythme : ce qu’il faut voir, dans quel ordre et combien de temps prévoir.',
    r2m: 'Pour chaque étape, des hébergements adaptés à votre style de voyage, avec le lien pour réserver.',
    r3m: 'Des adresses pour chaque moment de la journée, du café du matin au souper, choisies selon vos goûts.',
    r4m: 'Toutes les adresses de votre voyage sur une seule carte, à ouvrir sur votre cellulaire une fois sur place.',
    r5m: 'Une estimation des coûts sur place : hébergement, repas, transport et activités. Vous savez à quoi vous attendre avant de partir.',
    enSavoirPlus: 'En savoir plus',
    moins: 'Moins',
    faqAstuce: 'Touchez une carte pour voir la réponse.', faqAstuceOrdi: 'Passez la souris sur une carte pour voir la réponse.',
    voirReponse: 'Voir la réponse',
    retourner: 'Retourner',
    pied: 'Itinéraires de voyage sur mesure', credits: 'Photos : Unsplash', contrib: 'Devenir éclaireur', voirExemple: 'Voir un exemple',
  },
  en: {
    navComment: 'Our approach', navRecois: 'What you get', navFaq: 'Questions',
    cta: 'Plan my trip', ctaCourt: 'Start', voirComment: 'Our approach',
    surtitre: 'Custom travel itineraries',
    titre: 'Your big trip, designed around you.',
    sousTitre: 'We design your complete itinerary around your tastes, your pace and your budget, with places our team has scouted on site.',
    rassure1: 'Fixed price, agreed upfront', rassure2: 'A team based in Québec', rassure3: 'Adjustments included',
    commentSur: 'Our approach', commentTitre: 'From your request to departure',
    e1t: 'Your project', e1p: 'Destinations, timing, style and interests.',
    e2t: 'A first call', e2p: 'Fifteen minutes to understand you.',
    e3t: 'Your itinerary', e3p: 'Your trip, day by day.',
    recoisSur: 'What you get', recoisTitre: 'A complete itinerary, ready to book',
    recoisTexte: 'Every recommendation is chosen for you, based on your travel style and your budget.',
    r1t: 'Day by day', r1p: 'What to do, where and when.',
    r2t: 'Where to stay', r2p: 'Accommodation that fits your budget.',
    r3t: 'Where to eat', r3p: 'Restaurants, markets and local food.',
    r4t: 'The map', r4p: 'Every place on a map, on your phone.',
    r5t: 'The budget', r5p: 'An estimate of what you will spend on the ground.',
    destSur: 'Destinations', destTitre: 'Where would you like to go?',
    destTexte: 'We plan trips all over the world.',
    chercherPays: 'Search for a country', aucunPays: 'No country found.', autreDest: 'Another destination', autreDestP: 'Search for a country',
    pasDecide: 'Not sure yet? Start anyway',
    faqSur: 'Questions', faqTitre: 'Frequently asked questions',
    faq: [
      ['How much does it cost?', 'The price depends on the length of the trip and the number of countries. It is set during our first call, before any work begins. No obligation.'],
      ['Who prepares my itinerary?', 'Our team, based in Québec. Our scouts, travellers we know personally, go on site to find the places we recommend.'],
      ['What kind of trip is it for?', 'Mostly the trips that matter: a honeymoon, a retirement trip, a sabbatical or a big family trip. Solo, as a couple or in a group.'],
      ['Do you book for me?', 'No. You receive the full itinerary with a link for every hotel, activity and transfer, and you book yourself. You stay in control of your tickets and your money.'],
      ['Why not plan it all myself?', 'You can, but a good itinerary takes dozens of hours of research. We do that work for you, and you leave with places already scouted.'],
      ["What if I don't know where to go yet?", 'That is common. Pick a region you are drawn to, or “Surprise me”, and tell us what you enjoy. We will suggest destinations.'],
      ["What if I don't know my dates yet?", 'No problem. Give us the month and a rough length: we will adjust together.'],
      ['How far ahead should I ask?', 'Ideally two months or more before departure. The preparation time is confirmed during the first call.'],
      ['Can I change the itinerary?', 'Yes. If something does not feel right, we adjust it with you.'],
      ['Is my information kept private?', 'Yes. Your answers are only used to prepare your trip. They are never sold or shared.'],
    ],
    appelTitre: "Let's talk about your next trip", appelTexte: 'Describe your project in a few minutes. We will contact you to discuss it.',
    e1m: 'Our request form lets us understand your project: destinations, timing, number of travellers, travel style and interests. If you have not chosen a country yet, a region is enough.',
    e2m: 'During a fifteen-minute call, we confirm your expectations, your pace and your budget with you. We then confirm the price and the preparation time, with no commitment on your part.',
    e3m: 'Your itinerary is delivered on a personal page: a day-by-day plan, a map, recommended accommodation, restaurants and activities, with every booking link.',
    r1m: 'Each day is planned around your pace: what to see, in what order and how much time to allow.',
    r2m: 'For each stop, accommodation that fits your travel style, with the link to book.',
    r3m: 'Places for every moment of the day, from morning coffee to dinner, chosen for your tastes.',
    r4m: 'Every place of your trip on one map, ready to open on your phone once you are there.',
    r5m: 'An estimate of costs on the ground: accommodation, meals, transport and activities. You know what to expect before you leave.',
    enSavoirPlus: 'Learn more',
    moins: 'Less',
    faqAstuce: 'Tap a card to see the answer.', faqAstuceOrdi: 'Hover over a card to see the answer.',
    voirReponse: 'See the answer',
    retourner: 'Flip back',
    pied: 'Custom travel itineraries', credits: 'Photos: Unsplash', contrib: 'Become a scout', voirExemple: 'See an example',
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
const lienDemande = (pays = '') => `../demande.html?lang=${langue}${pays ? `&pays=${encodeURIComponent(pays)}` : ''}`;
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nomPays = (p) => (langue === 'en' ? NOM_EN[p] || p : p);

// Les deux langues sont écrites l'une par-dessus l'autre ; seule la bonne est visible.
// Chaque texte prend donc toujours la place du plus long des deux : rien ne bouge quand on change de langue.
const BLOCS = new Set(['H1', 'H2', 'H3', 'P', 'LI', 'DIV']);
const deux = (fr, en, bloc = false) => `<span class="bi${bloc ? ' bloc' : ''}"><span lang="fr">${esc(fr)}</span><span lang="en">${esc(en)}</span></span>`;

function remplirTextes() {
  if (SURVOL) document.querySelectorAll('[data-t="faqAstuce"]').forEach((el) => { el.dataset.t = 'faqAstuceOrdi'; });
  document.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = deux(TXT.fr[el.dataset.t], TXT.en[el.dataset.t], BLOCS.has(el.tagName)); });
  document.querySelectorAll('[data-marque]').forEach((el) => { el.textContent = MARQUE; });
  document.getElementById('destinations-liste').innerHTML = DESTINATIONS.map(([fr, en]) => `
    <a class="destination" data-pays="${esc(fr)}" style="${PHOTOS_PAYS[fr] ? `--photo:url('${photo(PHOTOS_PAYS[fr], 700)}')` : ''}">${deux(fr, en)}</a>`).join('') + `
    <button type="button" class="destination autre" id="autre-dest">${icone('search', { taille: 26 })}<b>${deux(TXT.fr.autreDest, TXT.en.autreDest)}</b></button>`;
  // « En savoir plus » : une phrase courte, et le détail pour qui veut en lire plus.
  document.querySelectorAll('[data-plus]').forEach((el, i) => {
    const k = el.dataset.plus;
    el.innerHTML = `
      <button type="button" class="plus-bouton" aria-expanded="false" aria-controls="plus-${i}">
        <span class="plus-txt">${deux(TXT.fr.enSavoirPlus, TXT.en.enSavoirPlus)}</span><span class="moins-txt">${deux(TXT.fr.moins, TXT.en.moins)}</span>${icone('chevron-down', { taille: 16, epaisseur: 2.4 })}
      </button>
      <div class="plus-panneau" id="plus-${i}"><div><p>${deux(TXT.fr[k], TXT.en[k], true)}</p></div></div>`;
  });
  // Questions : des cartes à retourner, la question d'un côté, la réponse de l'autre.
  document.getElementById('faq-liste').innerHTML = TXT.fr.faq.map(([q, r], i) => `
    <button type="button" class="carte-q" aria-pressed="false" style="--i:${i}">
      <span class="carte-int">
        <span class="face recto">
          <span class="carte-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="carte-question">${deux(q, TXT.en.faq[i][0], true)}</span>
          <span class="carte-indice">${icone('refresh-cw', { taille: 15, epaisseur: 2.2 })}${deux(TXT.fr.voirReponse, TXT.en.voirReponse)}</span>
        </span>
        <span class="face verso">
          <span class="carte-question petite">${deux(q, TXT.en.faq[i][0], true)}</span>
          <span class="carte-reponse">${deux(r, TXT.en.faq[i][1], true)}</span>
          <span class="carte-indice">${icone('refresh-cw', { taille: 15, epaisseur: 2.2 })}${deux(TXT.fr.retourner, TXT.en.retourner)}</span>
        </span>
      </span>
    </button>`).join('');
}

function afficher() {
  const t = TXT[langue];
  document.documentElement.lang = langue;
  document.title = `${MARQUE}, ${t.surtitre}`;
  document.querySelectorAll('[data-demande]').forEach((el) => { el.href = lienDemande(); });
  document.querySelectorAll('.destination[data-pays]').forEach((el) => { el.href = lienDemande(el.dataset.pays); });
  document.querySelectorAll('[data-langue]').forEach((b) => { b.classList.toggle('choisi', b.dataset.langue === langue); b.setAttribute('aria-pressed', b.dataset.langue === langue); });
  const champ = document.getElementById('cherche-pays');
  if (champ) { champ.placeholder = t.chercherPays; champ.setAttribute('aria-label', t.chercherPays); dessinerResultats(); }
}

// ---------- Recherche d'un pays (tous les pays du monde, pas seulement ceux en photo) ----------
function dessinerResultats() {
  const champ = document.getElementById('cherche-pays');
  const zone = document.getElementById('resultats-pays');
  if (!champ || !zone) return;
  const q = sansAccents(champ.value.trim());
  if (!q) { zone.hidden = true; zone.innerHTML = ''; return; }
  const trouves = TOUS_PAYS
    .filter((p) => sansAccents(p).includes(q) || sansAccents(NOM_EN[p]).includes(q))
    .sort((x, y) => Number(!sansAccents(nomPays(x)).startsWith(q)) - Number(!sansAccents(nomPays(y)).startsWith(q)))
    .slice(0, 8);
  zone.hidden = false;
  zone.innerHTML = trouves.length
    ? trouves.map((p) => `<a role="option" class="resultat" data-pays="${esc(p)}" href="${lienDemande(p)}"><span>${esc(nomPays(p))}</span>${icone('arrow-right', { taille: 16 })}</a>`).join('')
    : `<p class="aucun">${esc(TXT[langue].aucunPays)}</p>`;
}
function brancherRecherche() {
  const champ = document.getElementById('cherche-pays');
  if (!champ) return;
  champ.oninput = dessinerResultats;
  champ.onkeydown = (ev) => {
    if (ev.key === 'Escape') { champ.value = ''; dessinerResultats(); }
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const premier = document.querySelector('#resultats-pays .resultat');
    if (premier) premier.click();
  };
  document.getElementById('autre-dest').onclick = () => {
    champ.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => champ.focus({ preventScroll: true }), 350);
  };
}

// ---------- Transition vers la fiche de demande ----------
// Même site, même adresse de base : ça marche pareil sur github.io et sur le futur .com.
// Bouton : un disque couleur crème grandit depuis le bouton et couvre l'écran, puis la fiche apparaît.
// Destination : la photo s'agrandit jusqu'à remplir l'écran, et la fiche s'ouvre sur cette même photo.
const MOUVEMENT_REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;
function partirVers(lien, depuis, pays) {
  if (MOUVEMENT_REDUIT) { location.href = lien; return; }
  const r = depuis.getBoundingClientRect();
  const voile = document.createElement('div');
  voile.className = 'voile-transition';
  if (pays && PHOTOS_PAYS[pays]) {
    voile.classList.add('photo');
    voile.style.cssText = `top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;background-image:url('${photo(PHOTOS_PAYS[pays], 700)}')`;
    document.body.append(voile);
    requestAnimationFrame(() => requestAnimationFrame(() => voile.classList.add('plein')));
  } else {
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const rayon = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    voile.classList.add('disque');
    voile.style.cssText = `left:${x - rayon}px;top:${y - rayon}px;width:${rayon * 2}px;height:${rayon * 2}px`;
    document.body.append(voile);
    requestAnimationFrame(() => requestAnimationFrame(() => voile.classList.add('plein')));
  }
  try { sessionStorage.setItem('arriveeSite', JSON.stringify({ quand: Date.now(), photo: pays && PHOTOS_PAYS[pays] ? photo(PHOTOS_PAYS[pays], 700) : '' })); } catch (_) { /* rien */ }
  setTimeout(() => { location.href = lien; }, 520);
}
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[data-demande], a.destination[data-pays], a.resultat');
  if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  partirVers(a.href, a, a.dataset.pays || '');
});
// Retour arrière (le navigateur garde la page en mémoire) : on enlève le voile.
addEventListener('pageshow', () => document.querySelectorAll('.voile-transition').forEach((v) => v.remove()));
// La fiche est chargée d'avance dès qu'on approche d'un bouton : l'ouverture est instantanée.
let precharge = false;
const precharger = () => {
  if (precharge) return;
  precharge = true;
  const l = document.createElement('link');
  l.rel = 'prefetch'; l.href = '../demande.html';
  document.head.append(l);
};
document.addEventListener('pointerover', (ev) => { if (ev.target.closest?.('a[data-demande], a.destination, a.resultat')) precharger(); }, { passive: true });
document.addEventListener('touchstart', (ev) => { if (ev.target.closest?.('a[data-demande], a.destination, a.resultat')) precharger(); }, { passive: true });

// ---------- Interactions ----------
const SURVOL = matchMedia('(hover: hover) and (pointer: fine)').matches;
document.addEventListener('click', (ev) => {
  const plus = ev.target.closest('.plus-bouton');
  if (plus) {
    const ouvert = plus.getAttribute('aria-expanded') !== 'true';
    plus.setAttribute('aria-expanded', ouvert);
    plus.parentElement.classList.toggle('ouvert', ouvert);
    return;
  }
  const carte = ev.target.closest('.carte-q');
  // Ordinateur : la carte tourne au survol. Cellulaire : on la touche.
  if (carte && !SURVOL) {
    const tourne = carte.getAttribute('aria-pressed') !== 'true';
    carte.setAttribute('aria-pressed', tourne);
    carte.classList.toggle('tournee', tourne);
  }
});
// Les cartes penchent légèrement vers la souris (ordinateur seulement).
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !MOUVEMENT_REDUIT) {
  document.addEventListener('pointermove', (ev) => {
    const c = ev.target.closest?.('.carte-q, .destination');
    document.querySelectorAll('.penche').forEach((x) => { if (x !== c) { x.classList.remove('penche'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.classList.add('penche');
    c.style.setProperty('--ry', `${((ev.clientX - r.left) / r.width - 0.5) * 8}deg`);
    c.style.setProperty('--rx', `${-((ev.clientY - r.top) / r.height - 0.5) * 8}deg`);
  }, { passive: true });
}
// Les blocs apparaissent en douceur quand on arrive dessus en défilant.
function animerAuDefilement() {
  if (!('IntersectionObserver' in window) || MOUVEMENT_REDUIT) return;
  const cibles = document.querySelectorAll('.section h2, .section .surtitre, .section .texte, .etapes li, .liste-recois li, .destination, .carte-q, .cherche-pays, .appel-int > *');
  document.documentElement.classList.add('anime');
  const vu = new IntersectionObserver((entrees) => entrees.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('vu');
    vu.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  cibles.forEach((el) => {
    const freres = [...el.parentElement.children].filter((x) => x.matches(el.tagName));
    el.style.setProperty('--delai', `${Math.min(freres.indexOf(el), 6) * 70}ms`);
    vu.observe(el);
  });
}

document.querySelectorAll('[data-ico]').forEach((el) => {
  const grand = el.closest('.etapes, .liste-recois');
  el.innerHTML = icone(el.dataset.ico, { taille: grand ? 22 : el.classList.contains('marque-ico') ? 17 : 18, epaisseur: el.classList.contains('marque-ico') ? 2.2 : 2 });
});
document.querySelectorAll('[data-langue]').forEach((b) => {
  b.onclick = () => { langue = b.dataset.langue; try { localStorage.setItem('langueSite', langue); } catch (_) { /* rien */ } afficher(); };
});

// Étapes : même hauteur pour les trois quand elles sont fermées ; seule celle qu'on ouvre grandit.
function egaliserEtapes() {
  const li = [...document.querySelectorAll('.etapes li')];
  li.forEach((x) => { x.style.minHeight = ''; });
  if (matchMedia('(max-width: 860px)').matches) return;
  const fermees = li.filter((x) => !x.querySelector('.plus.ouvert'));
  const h = Math.max(0, ...li.map((x) => (x.querySelector('.plus.ouvert') ? 0 : x.offsetHeight)));
  if (fermees.length) li.forEach((x) => { x.style.minHeight = `${h}px`; });
}
addEventListener('resize', () => { clearTimeout(egaliserEtapes.t); egaliserEtapes.t = setTimeout(egaliserEtapes, 150); });
remplirTextes();
egaliserEtapes();
document.fonts?.ready.then(egaliserEtapes);
brancherRecherche();
afficher();
animerAuDefilement();

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
