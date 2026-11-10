// Fiche de demande que Raph envoie à ses clients (en français ou en anglais).
// Le client choisit ses pays, ses dates (le voyage au complet, ou pays par pays) et ses envies.
// À la fin, ses réponses deviennent un lien : en cliquant dessus, Raph crée le voyage dans le Studio.

import { paysDuContinent } from './monde.js';
import { icone } from './icones.js';
import { ENVIES, encoder, nuits } from './code-demande.js';
import * as pwa from './installer.js';
import { photo, photoPays, PHOTOS_FOND } from './photos.js';

const fiche = document.getElementById('fiche');
const params = new URLSearchParams(location.search);
// Courriel de Raph, ajouté au lien par le Studio (gardé si la fiche est installée sur son ordi).
let POUR = params.get('pour') || '';
try { if (POUR) localStorage.setItem('pourDemande', POUR); else POUR = localStorage.getItem('pourDemande') || ''; } catch (_) { /* rien */ }
// Numéro de cell de Raph (optionnel) : le client lui envoie sa demande par texto en un clic.
let TEL = (params.get('tel') || '').replace(/[^\d+]/g, '');
try { if (TEL) localStorage.setItem('telDemande', TEL); else TEL = localStorage.getItem('telDemande') || ''; } catch (_) { /* rien */ }
const MONTRER_INSTALLER = params.has('installer') && !pwa.dejaInstallee();
// Les destinations les plus demandées (du monde entier) ; les autres se trouvent avec la recherche.
const POPULAIRES = ['Japon', 'Thaïlande', 'France', 'Italie', 'Espagne', 'Portugal', 'Grèce', 'Mexique', 'Cuba', 'République dominicaine', 'États-Unis', 'Costa Rica', 'Vietnam', 'Indonésie', 'Maroc', 'Pérou'];
const TOUS_PAYS = paysDuContinent('');
const COULEURS = ['#f0532f', '#2f80ed', '#16a34a', '#a855f7', '#e8a20c', '#0ea5a4', '#db2777', '#64748b'];

// ---------- Textes (français / anglais) ----------
const TXT = {
  fr: {
    sur: 'Voyage sur mesure', etapes: ['Pays', 'Dates', 'Envies', 'Vous'],
    titres: ['Pays', 'Durée du voyage', "Qu'est-ce qui vous fait envie ?", 'Coordonnées'],
    retour: 'Retour', continuer: 'Continuer', envoyerDemande: 'Terminer', installer: 'Installer sur mon ordi',
    introPays: "Un ou plusieurs, dans l'ordre du voyage.", chercher: 'Chercher un pays',
    resultats: 'Résultats', populaires: 'Populaires', aucunPays: 'Aucun pays trouvé.', trajet: 'Votre trajet',
    plusTot: 'Plus tôt', plusTard: 'Plus tard', retirer: 'Retirer', choisisPays: 'Choisissez au moins un pays',
    combien: 'Nombre de jours', plusDe: '14+', autreDuree: 'Combien de jours ?', autre: 'Autre', longs: [[14, '2 semaines'], [21, '3 semaines'], [30, '1 mois'], [45, '6 semaines'], [60, '2 mois'], [90, '3 mois']], parPays: 'Des dates différentes pour chaque pays ?', retourTotal: 'Juste une durée totale', jours: (n) => `${n} jour${n > 1 ? 's' : ''}`,
    semaines: (s, j) => `${s} semaine${s > 1 ? 's' : ''}${j ? ` et ${j} jour${j > 1 ? 's' : ''}` : ''}`,
    quandPars: 'Départ', optionnel: 'optionnel', touchDepart: 'Touchez votre jour de départ',
    pasSur: 'Pas encore sûr ? Laissez vide.', depart: 'Départ', retourLe: 'Retour', effacer: 'Effacer',
    repartition: 'Une préférence pour répartir votre temps ?', repartitionEx: 'Ex. : plus de temps au Japon, le reste à votre choix',
    introPays2: "Touchez l'arrivée, puis le départ.",
    arrivee: 'Arrivée', choisisJour: 'Choisissez un jour', choisisDepart: 'Choisissez le départ', aChoisir: 'À choisir',
    tonVoyage: 'Votre voyage', au: 'au', astuce: "Astuce : le départ d'un pays peut être le même jour que l'arrivée dans le suivant.",
    moisPrec: 'Mois précédent', moisSuiv: 'Mois suivant', semaineJours: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], sem: 'S',
    nuitsTxt: (n) => `${n} nuit${n > 1 ? 's' : ''}`, choisisDuree: 'Choisissez la durée du voyage', datesPour: (p) => `Choisissez vos dates pour : ${p}`,
    introEnvies: () => 'Combien de fois ? Laissez à 0 ce qui ne vous intéresse pas.',
    moins: 'Moins', plus: 'Plus', aVoir: 'À voir absolument', aVoirEx: 'Ex. : le mont Fuji, un ryokan avec onsen, un match de sumo…',
    voyageurs: 'Voyageurs', style: 'Style de voyage', styles: { eco: 'Économique', moyen: 'Confort', luxe: 'Luxe' },
    introToi: '',
    nom: 'Nom', nomEx: 'Ex. : Julie Tremblay', courriel: 'Courriel', courrielEx: 'julie@exemple.com',
    tel: 'Téléphone', message: 'Autre chose à nous dire ?', messageEx: 'Allergies, occasion spéciale, budget…',
    ecrisNom: 'Écrivez votre nom', ecrisCourriel: 'Écrivez votre courriel (ou votre téléphone)',
    monVoyage: 'Voyage sur mesure', voyageursN: (n) => (n > 1 ? 'voyageurs' : 'voyageur'), joursMot: (n) => (n > 1 ? 'jours' : 'jour'),
    dureeTotale: 'Durée totale', departLe: (x) => `Départ le ${x}`, datesAVoir: 'Dates à préciser', jeTeLaisse: 'Répartition du temps entre les pays : à votre choix',
    mesEnvies: 'Envies', aVoirCourt: 'À voir absolument',
    presque: 'Votre demande est prête', presqueTxt: 'Envoyez-la-nous : notre équipe vous répond avec une proposition d’itinéraire.',
    parCourriel: 'Envoyer par courriel', parMessage: 'Envoyer par message', copier: 'Copier la demande',
    image: 'Enregistrer le résumé en image', imageAide: 'Pratique pour le montrer aux autres voyageurs.', modifier: 'Modifier mes réponses',
    merci: 'Merci ! Demande envoyée', copie: 'Copié ! Collez-le dans un courriel ou un message', copieCeTexte: 'Copiez ce texte :',
    sujet: (p, n) => `Demande de voyage : ${p} (${n})`,
    corps: (lignes, v, lien, n) => `Bonjour,\n\nVoici ma demande de voyage sur mesure.\n\n${lignes}\n- ${v} voyageur(s)\n\nToutes mes réponses (pays, dates, envies) sont dans ce lien :\n${lien}\n\n${n}`,
    imagePrete: 'Image enregistrée',
  },
  en: {
    sur: 'Custom trip', etapes: ['Countries', 'Dates', 'Interests', 'You'],
    titres: ['Countries', 'Trip length', 'What are you into?', 'Your details'],
    retour: 'Back', continuer: 'Continue', envoyerDemande: 'Finish', installer: 'Install on my computer',
    introPays: 'One or more, in travel order.', chercher: 'Search a country',
    resultats: 'Results', populaires: 'Popular', aucunPays: 'No country found.', trajet: 'Your route',
    plusTot: 'Earlier', plusTard: 'Later', retirer: 'Remove', choisisPays: 'Pick at least one country',
        combien: 'Number of days', plusDe: '14+', autreDuree: 'How many days?', autre: 'Other', longs: [[14, '2 weeks'], [21, '3 weeks'], [30, '1 month'], [45, '6 weeks'], [60, '2 months'], [90, '3 months']], parPays: 'Different dates for each country?', retourTotal: 'Just a total length', jours: (n) => `${n} day${n > 1 ? 's' : ''}`,
    semaines: (s, j) => `${s} week${s > 1 ? 's' : ''}${j ? ` and ${j} day${j > 1 ? 's' : ''}` : ''}`,
    quandPars: 'Departure', optionnel: 'optional', touchDepart: 'Tap your departure day',
    pasSur: 'Not sure yet? Leave it empty.', depart: 'Departure', retourLe: 'Return', effacer: 'Clear',
    repartition: 'Any preference on how to split your time?', repartitionEx: 'E.g. more time in Japan, the rest is up to you',
    introPays2: 'Tap arrival, then departure.',
    arrivee: 'Arrival', choisisJour: 'Pick a day', choisisDepart: 'Pick departure', aChoisir: 'To pick',
    tonVoyage: 'Your trip', au: 'to', astuce: 'Tip: leaving a country can be the same day you arrive in the next one.',
    moisPrec: 'Previous month', moisSuiv: 'Next month', semaineJours: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], sem: 'W',
    nuitsTxt: (n) => `${n} night${n > 1 ? 's' : ''}`, choisisDuree: 'Pick the length of your trip', datesPour: (p) => `Pick your dates for: ${p}`,
    introEnvies: () => "How many times? Leave 0 if it's not for you.",
    moins: 'Less', plus: 'More', aVoir: 'Must see', aVoirEx: 'E.g. Mount Fuji, a ryokan with an onsen, a sumo match…',
    voyageurs: 'Travellers', style: 'Travel style', styles: { eco: 'Budget', moyen: 'Comfort', luxe: 'Luxury' },
    introToi: '',
    nom: 'Your name', nomEx: 'E.g. Julie Smith', courriel: 'Your email', courrielEx: 'julie@example.com',
    tel: 'Phone', message: 'Anything else we should know?', messageEx: 'Allergies, special occasion, budget…',
    ecrisNom: 'Enter your name', ecrisCourriel: 'Enter your email (or phone)',
    monVoyage: 'Custom trip', voyageursN: (n) => (n > 1 ? 'travellers' : 'traveller'), joursMot: (n) => (n > 1 ? 'days' : 'day'),
    dureeTotale: 'Total length', departLe: (x) => `Leaving ${x}`, datesAVoir: 'Dates to confirm', jeTeLaisse: 'Time split between countries: up to you',
    mesEnvies: 'Interests', aVoirCourt: 'Must see',
    presque: 'Your request is ready', presqueTxt: 'Send it to us: our team will reply with an itinerary proposal.',
    parCourriel: 'Send by email', parMessage: 'Send by message', copier: 'Copy the request',
    image: 'Save the summary as an image', imageAide: 'Handy to show the other travellers.', modifier: 'Edit my answers',
    merci: 'Thanks! Request sent', copie: 'Copied! Paste it in an email or a message', copieCeTexte: 'Copy this text:',
    sujet: (p, n) => `Trip request: ${p} (${n})`,
    corps: (lignes, v, lien, n) => `Hello,\n\nHere is my custom trip request.\n\n${lignes}\n- ${v} traveller(s)\n\nAll my answers (countries, dates, interests) are in this link:\n${lien}\n\n${n}`,
    imagePrete: 'Image saved',
  },
};
const ENVIES_EN = {
  visites: ['Culture and sights', 'Temples, museums, historic districts'],
  restos: ['Food', 'Great restaurants, street food, markets'],
  experiences: ['Experiences', 'Cooking classes, shows, unique activities'],
  sport: ['Sport and adventure', 'Hiking, diving, surfing, cycling'],
  nuit: ['Nightlife', 'Bars, rooftops, clubs'],
  nature: ['Nature and outdoors', 'Parks, mountains, wild beaches'],
  detente: ['Relaxation', 'Beach, spa, onsen, slow days'],
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
  f: 'demande', v: 2, langue: langueParam || (/^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en'),
  mode: 'total', duree: 0, depart: '', repartition: '',
  pays: [], envies: {}, voyageurs: 2, style: 'moyen', nom: '', courriel: '', telephone: '', message: '',
});
let d = vide();
try { const b = JSON.parse(localStorage.getItem('brouillonDemande') || 'null'); if (b?.f === 'demande') d = { ...vide(), ...b, v: 2 }; } catch (_) { /* rien */ }
if (langueParam) d.langue = langueParam;
const garder = () => { try { localStorage.setItem('brouillonDemande', JSON.stringify(d)); } catch (_) { /* rien */ } };
let etape = 0;
let paysActif = 0;
let moisAffiche = null;

const t = () => TXT[d.langue] || TXT.fr;
const loc = () => (d.langue === 'en' ? 'en-CA' : 'fr-CA');
const nomPays = (p) => (d.langue === 'en' ? NOM_EN[p] || p : p);
const nomEnvie = (k, nom) => (d.langue === 'en' ? ENVIES_EN[k]?.[0] || nom : nom);
const exEnvie = (k, ex) => (d.langue === 'en' ? ENVIES_EN[k]?.[1] || ex : ex);

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const date = (s) => new Date(`${s}T12:00:00`);
const ajouterJours = (s, n) => { const x = date(s); x.setDate(x.getDate() + n); return iso(x); };
const jolie = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? date(s).toLocaleDateString(loc(), opts) : '');
// « 5 – 12 avr. » plutôt que deux dates complètes.
function plage(debut, fin, annee = false) {
  if (!debut || !fin) return '';
  const opts = { day: 'numeric', month: 'short', ...(annee ? { year: 'numeric' } : {}) };
  try { return new Intl.DateTimeFormat(loc(), opts).formatRange(date(debut), date(fin)); } catch (_) { return `${jolie(debut, opts)} – ${jolie(fin, opts)}`; }
}
const coul = (i) => COULEURS[i % COULEURS.length];

function dureeTexte(n, unite = 'nuits') {
  if (!n) return '';
  const s = Math.floor(n / 7);
  const base = unite === 'jours' ? t().jours(n) : t().nuitsTxt(n);
  return s ? `${base} · ${t().semaines(s, n % 7)}` : base;
}

// Durée totale du voyage (en jours), quel que soit le mode.
const totalJours = () => (d.mode === 'total' ? d.duree : d.pays.reduce((n, x) => n + nuits(x.debut, x.fin), 0));
const debutVoyage = () => (d.mode === 'total' ? d.depart : d.pays.map((x) => x.debut).filter(Boolean).sort()[0] || '');
const finVoyage = () => (d.mode === 'total' ? (d.depart && d.duree ? ajouterJours(d.depart, d.duree) : '') : d.pays.map((x) => x.fin).filter(Boolean).sort().pop() || '');

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
    // Fondu enchaîné : la nouvelle photo apparaît par-dessus l'ancienne, qui reste en place
    // (et continue son zoom) jusqu'à la fin du fondu. Rien ne saute, pas de trou entre les deux.
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
  // decode() : l'image est prête à peindre avant le fondu, donc pas d'accroc pendant l'animation
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
  clearTimeout(toast.m); toast.m = setTimeout(() => el.classList.remove('visible'), 2600);
}

// ---------- Rendu général ----------
function enTete(etapeIci) {
  return `
    <div class="haut-ligne">
      <p class="sur">${t().sur}</p>
      <div class="haut-actions">
        ${MONTRER_INSTALLER ? `<button class="petit-bouton" id="installer">${icone('download', { taille: 15 })}<span>${t().installer}</span></button>` : ''}
        <div class="langue" role="group" aria-label="Langue / Language">${['fr', 'en'].map((l) => `<button class="${d.langue === l ? 'choisi' : ''}" data-langue="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      </div>
    </div>
    ${etapeIci == null ? '' : `
    <h1>${t().titres[etapeIci]}</h1>
    <ol class="progres">${t().etapes.map((e, i) => `<li class="${i < etapeIci ? 'fait' : i === etapeIci ? 'ici' : ''}"><span>${i < etapeIci ? icone('check', { taille: 13, epaisseur: 3 }) : i + 1}</span>${e}</li>`).join('')}</ol>`}`;
}

function brancherEnTete(refaire) {
  fiche.querySelectorAll('[data-langue]').forEach((b) => { b.onclick = () => { d.langue = b.dataset.langue; garder(); refaire(); }; });
  const inst = fiche.querySelector('#installer');
  if (inst) inst.onclick = async () => { if (!(await pwa.installer())) alert(pwa.EXPLICATION[d.langue] || pwa.EXPLICATION.fr); };
}

function rendre() {
  document.documentElement.lang = d.langue;
  fiche.innerHTML = `
    <header class="haut">${enTete(etape)}</header>
    <section class="corps" id="corps"></section>
    <footer class="bas">
      ${etape ? `<button class="bouton secondaire" id="retour">${icone('chevron-left', { taille: 18 })} ${t().retour}</button>` : '<span></span>'}
      <button class="bouton" id="suivant">${etape === 3 ? t().envoyerDemande : t().continuer} ${icone('arrow-right', { taille: 18 })}</button>
    </footer>`;
  brancherEnTete(rendre);
  [etapePays, etapeDates, etapeEnvies, etapeToi][etape](fiche.querySelector('#corps'));
  fiche.querySelector('#suivant').onclick = suivant;
  const r = fiche.querySelector('#retour');
  if (r) r.onclick = () => { etape--; rendre(); window.scrollTo(0, 0); };
  majDecor();
}

function suivant() {
  if (etape === 0 && !d.pays.length) return toast(t().choisisPays);
  if (etape === 1) {
    if (d.mode === 'total' && !d.duree) return toast(t().choisisDuree);
    if (d.mode === 'pays') {
      const sans = d.pays.find((p) => !p.debut || !p.fin);
      if (sans) { paysActif = d.pays.indexOf(sans); moisAffiche = null; rendre(); return toast(t().datesPour(nomPays(sans.nom))); }
    }
  }
  if (etape === 3) return envoyer();
  etape++;
  if (etape === 1) { paysActif = Math.max(0, d.pays.findIndex((p) => !p.fin)); moisAffiche = null; }
  garder();
  rendre();
  window.scrollTo(0, 0);
  return undefined;
}

// ---------- 1. Pays ----------
function etapePays(zone) {
  let recherche = '';
  const dessiner = () => {
    const choisis = d.pays.map((p) => p.nom);
    const q = sansAccents(recherche);
    const resultats = q ? TOUS_PAYS.filter((p) => sansAccents(p).includes(q) || sansAccents(NOM_EN[p]).includes(q)).slice(0, 12) : POPULAIRES;
    zone.innerHTML = `
      <p class="intro">${t().introPays}</p>
      <label class="recherche">${icone('search', { taille: 18 })}<input id="cherche" type="search" placeholder="${t().chercher}" value="${esc(recherche)}" autocomplete="off"></label>
      <p class="petit-titre">${q ? t().resultats : t().populaires}</p>
      <div class="puces">${resultats.map((p) => `<button class="puce ${choisis.includes(p) ? 'choisie' : ''}" data-pays="${esc(p)}">${choisis.includes(p) ? icone('check', { taille: 15, epaisseur: 2.6 }) : icone('plus', { taille: 15 })}${esc(nomPays(p))}</button>`).join('') || `<p class="doux">${t().aucunPays}</p>`}</div>
      ${d.pays.length ? `
        <p class="petit-titre">${t().trajet}</p>
        <ol class="trajet">${d.pays.map((p, i) => `
          <li style="--c:${coul(i)}">
            <span class="num">${i + 1}</span><b>${esc(nomPays(p.nom))}</b>
            <span class="actions">
              <button data-monter="${i}" ${i ? '' : 'disabled'} aria-label="${t().plusTot}">${icone('arrow-up', { taille: 16 })}</button>
              <button data-descendre="${i}" ${i < d.pays.length - 1 ? '' : 'disabled'} aria-label="${t().plusTard}">${icone('arrow-down', { taille: 16 })}</button>
              <button data-retirer="${i}" aria-label="${t().retirer}">${icone('x', { taille: 16 })}</button>
            </span>
          </li>`).join('')}</ol>` : ''}`;
    const champ = zone.querySelector('#cherche');
    champ.oninput = () => { recherche = champ.value; dessiner(); const c = zone.querySelector('#cherche'); c.focus(); c.setSelectionRange(c.value.length, c.value.length); };
    zone.onclick = (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.pays) {
        const n = b.dataset.pays;
        const i = d.pays.findIndex((p) => p.nom === n);
        if (i >= 0) d.pays.splice(i, 1); else d.pays.push({ nom: n, debut: '', fin: '', incontournable: '' });
        recherche = '';
      } else if (b.dataset.monter) { const i = +b.dataset.monter; [d.pays[i - 1], d.pays[i]] = [d.pays[i], d.pays[i - 1]]; }
      else if (b.dataset.descendre) { const i = +b.dataset.descendre; [d.pays[i + 1], d.pays[i]] = [d.pays[i], d.pays[i + 1]]; }
      else if (b.dataset.retirer) d.pays.splice(+b.dataset.retirer, 1);
      else return;
      garder();
      dessiner();
      majDecor();
    };
  };
  dessiner();
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
    const classes = [s < aujourdhui ? 'passe' : '', p ? 'pris' : '', p && s === p.debut ? 'debut' : '', p && s === (p.fin || p.debut) ? 'fin' : '', p && p.i === actif ? 'actif' : ''].join(' ');
    cases.push(`<button class="jour ${classes}" data-jour="${s}" ${s < aujourdhui ? 'disabled' : ''} style="${p ? `--c:${coul(p.i)}` : ''}">${j}</button>`);
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
  // Le choix « pays par pays » reste discret : un simple lien sous la durée.
  const choixMode = d.mode === 'total'
    ? (d.pays.length > 1 ? `<button class="lien-mode" data-mode="pays">${icone('route', { taille: 16 })} ${t().parPays}</button>` : '')
    : `<button class="lien-mode" data-mode="total">${icone('chevron-left', { taille: 16 })} ${t().retourTotal}</button>`;
  if (d.mode === 'total') datesTotal(zone, choixMode); else datesPays(zone, choixMode);
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) { d.mode = b.dataset.mode; moisAffiche = null; garder(); etapeDates(zone); return; }
    if (b.dataset.mois) { moisAffiche = decalerMois(moisAffiche, +b.dataset.mois); etapeDates(zone); return; }
    if (d.mode === 'total') clicTotal(b); else clicPays(b);
    garder();
    etapeDates(zone);
    majDecor();
  };
  zone.oninput = (ev) => {
    if (ev.target.id === 'repartition') { d.repartition = ev.target.value; garder(); }
    if (ev.target.id === 'duree-libre') { const v = parseInt(ev.target.value, 10); if (v > 0) { d.duree = Math.min(365, v); garder(); const r = document.querySelector('.duree-resume'); if (r) r.textContent = `${t().jours(d.duree)} · ${t().semaines(Math.floor(d.duree / 7), d.duree % 7)}`; } }
  };
  zone.onchange = (ev) => { if (ev.target.id === 'duree-libre') etapeDates(zone); };
}

// Le voyage au complet : juste la durée, et la date de départ si on la connaît.
function datesTotal(zone, choixMode) {
  if (!moisAffiche) moisAffiche = moisDe(d.depart || ajouterJours(iso(new Date()), 30));
  const n = d.duree;
  const s = Math.floor(n / 7);
  const fin = finVoyage();
  const long = n >= 14 || dureeLibre;
  const rapide = t().longs.some(([j]) => j === n);
  zone.innerHTML = `
    <p class="petit-titre premier">${t().combien}</p>
    <div class="grille-duree">${Array.from({ length: 13 }, (_, i) => i + 1).map((j) => `<button class="${n === j && !long ? 'choisi' : ''}" data-fixe="${j}">${j}</button>`).join('')}<button class="plus ${long ? 'choisi' : ''}" data-plus-long>${t().plusDe}</button></div>
    ${long ? `
    <div class="durees-longues">
      ${t().longs.map(([j, nom]) => `<button class="${n === j ? 'choisi' : ''}" data-fixe="${j}" data-long>${nom}</button>`).join('')}
      <label class="autre-duree ${rapide ? '' : 'choisi'}"><span>${t().autre}</span><input id="duree-libre" type="number" inputmode="numeric" min="14" max="365" value="${rapide ? '' : n}" placeholder="${n}" aria-label="${t().autreDuree}"><span>${t().joursMot(2)}</span></label>
    </div>
    ${s && !rapide ? `<p class="doux duree-resume">${t().jours(n)} · ${t().semaines(s, n % 7)}</p>` : ''}` : ''}
    ${choixMode}
    <p class="petit-titre">${t().quandPars} <small>${t().optionnel}</small></p>
    <div class="choix-dates une" style="--c:${coul(0)}">
      <div class="case-date ${d.depart ? '' : 'attend'}"><small>${t().depart}</small><b>${d.depart ? jolie(d.depart) : t().touchDepart}</b></div>
      ${d.depart && fin ? `${icone('arrow-right', { taille: 18 })}<div class="case-date"><small>${t().retourLe}</small><b>${jolie(fin)}</b></div>` : ''}
      ${d.depart ? `<button class="effacer" data-effacer aria-label="${t().effacer}">${icone('x', { taille: 16 })}</button>` : ''}
    </div>
    ${calendrier(d.depart ? [{ debut: d.depart, fin: fin || d.depart, i: 0 }] : [], 0)}
    ${d.depart ? '' : `<p class="doux">${t().pasSur}</p>`}
    ${d.pays.length > 1 ? `<label class="champ marge-haut"><span>${t().repartition} <small>${t().optionnel}</small></span><textarea id="repartition" rows="2" placeholder="${esc(t().repartitionEx)}">${esc(d.repartition)}</textarea></label>` : ''}`;
}

let dureeLibre = false; // « 14+ » touché : on montre le champ pour écrire le nombre de jours
function clicTotal(b) {
  if (b.dataset.duree) d.duree = Math.max(15, Math.min(365, (d.duree || 14) + +b.dataset.duree));
  else if (b.dataset.fixe) { d.duree = +b.dataset.fixe; dureeLibre = b.dataset.long != null; }
  else if (b.dataset.plusLong != null) { dureeLibre = true; if (d.duree < 14) d.duree = 14; }
  else if (b.dataset.effacer != null) d.depart = '';
  else if (b.dataset.jour) d.depart = d.depart === b.dataset.jour ? '' : b.dataset.jour;
}

// Pays par pays : on touche l'arrivée puis le départ, comme pour un billet d'avion.
function datesPays(zone, choixMode) {
  if (!d.pays[paysActif]) paysActif = 0;
  const p = d.pays[paysActif];
  if (!moisAffiche) moisAffiche = moisDe(p.debut || d.pays[paysActif - 1]?.fin || ajouterJours(iso(new Date()), 30));
  const debut = debutVoyage();
  const fin = finVoyage();
  const total = nuits(debut, fin);
  zone.innerHTML = `
    ${choixMode}
    <p class="intro">${t().introPays2}</p>
    <div class="onglets-pays">${d.pays.map((x, i) => `
      <button class="onglet-pays ${i === paysActif ? 'choisi' : ''}" data-pays-actif="${i}" style="--c:${coul(i)}">
        <i></i><span><b>${esc(nomPays(x.nom))}</b><small>${x.debut && x.fin ? plage(x.debut, x.fin) : x.debut ? t().choisisDepart : t().aChoisir}</small></span>
      </button>`).join('')}</div>
    <div class="choix-dates" style="--c:${coul(paysActif)}">
      <div class="case-date ${!p.debut || p.fin ? 'attend' : ''}"><small>${t().arrivee} · ${esc(nomPays(p.nom))}</small><b>${p.debut ? jolie(p.debut) : t().choisisJour}</b></div>
      ${icone('arrow-right', { taille: 18 })}
      <div class="case-date ${p.debut && !p.fin ? 'attend' : ''}"><small>${t().depart}</small><b>${p.fin ? jolie(p.fin) : '—'}</b></div>
      <div class="case-duree">${p.debut && p.fin ? dureeTexte(nuits(p.debut, p.fin)) : ''}</div>
    </div>
    ${calendrier(d.pays.map((x, i) => ({ debut: x.debut, fin: x.fin, i })), paysActif)}
    ${debut && fin ? `
      <div class="ligne-temps">
        <p class="petit-titre">${t().tonVoyage} · ${jolie(debut, { day: 'numeric', month: 'long' })} ${t().au} ${jolie(fin, { day: 'numeric', month: 'long' })} · ${dureeTexte(total)}</p>
        <div class="barre-temps">${d.pays.map((x, i) => {
          if (!x.debut || !x.fin) return '';
          const largeur = Math.max(4, (nuits(x.debut, x.fin) / Math.max(1, total)) * 100);
          const gauche = (nuits(debut, x.debut) / Math.max(1, total)) * 100;
          return `<span style="--c:${coul(i)};left:${gauche}%;width:${largeur}%"><b>${esc(nomPays(x.nom))}</b><small>${t().nuitsTxt(nuits(x.debut, x.fin))}</small></span>`;
        }).join('')}</div>
        <div class="semaines">${Array.from({ length: Math.ceil(total / 7) + 1 }, (_, k) => `<span style="left:${Math.min(100, (k * 7 / Math.max(1, total)) * 100)}%">${k ? `${t().sem}${k}` : ''}</span>`).join('')}</div>
      </div>` : `<p class="doux">${t().astuce}</p>`}`;
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

// ---------- 3. Envies ----------
function etapeEnvies(zone) {
  const total = totalJours();
  zone.innerHTML = `
    <p class="intro">${t().introEnvies(total)}</p>
    <div class="envies">${ENVIES.map(([k, nom, ico, ex]) => {
      const n = d.envies[k] || 0;
      return `
      <div class="envie ${n ? 'oui' : ''}">
        <span class="envie-ico">${icone(ico, { taille: 22 })}</span>
        <span class="envie-txt"><b>${esc(nomEnvie(k, nom))}</b><small>${esc(exEnvie(k, ex))}</small></span>
        <span class="compteur">
          <button data-moins="${k}" ${n ? '' : 'disabled'} aria-label="${t().moins}">−</button>
          <b>${n}</b>
          <button data-plus="${k}" aria-label="${t().plus}">+</button>
        </span>
      </div>`;
    }).join('')}</div>
    <p class="petit-titre">${t().aVoir} <small>${t().optionnel}</small></p>
    ${d.pays.map((x, i) => `<label class="champ"><span>${esc(nomPays(x.nom))}</span><textarea data-incontournable="${i}" rows="2" placeholder="${esc(t().aVoirEx)}">${esc(x.incontournable)}</textarea></label>`).join('')}
    <div class="deux">
      <div>
        <p class="petit-titre">${t().voyageurs}</p>
        <span class="compteur grand"><button data-voyageurs="-1" ${d.voyageurs > 1 ? '' : 'disabled'} aria-label="${t().moins}">−</button><b>${d.voyageurs}</b><button data-voyageurs="1" aria-label="${t().plus}">+</button></span>
      </div>
      <div>
        <p class="petit-titre">${t().style}</p>
        <div class="seg">${Object.entries(t().styles).map(([k, l]) => `<button class="${d.style === k ? 'choisi' : ''}" data-style="${k}">${l}</button>`).join('')}</div>
      </div>
    </div>`;
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.plus) d.envies[b.dataset.plus] = Math.min(30, (d.envies[b.dataset.plus] || 0) + 1);
    else if (b.dataset.moins) d.envies[b.dataset.moins] = Math.max(0, (d.envies[b.dataset.moins] || 0) - 1);
    else if (b.dataset.voyageurs) d.voyageurs = Math.max(1, Math.min(30, d.voyageurs + +b.dataset.voyageurs));
    else if (b.dataset.style) d.style = b.dataset.style;
    else return;
    garder();
    etapeEnvies(zone);
  };
  zone.oninput = (ev) => { const i = ev.target.dataset.incontournable; if (i != null) { d.pays[+i].incontournable = ev.target.value; garder(); } };
}

// ---------- 4. Coordonnées ----------
function etapeToi(zone) {
  zone.innerHTML = `
    <label class="champ"><span>${t().nom}</span><input data-champ="nom" value="${esc(d.nom)}" autocomplete="name" placeholder="${esc(t().nomEx)}"></label>
    <label class="champ"><span>${t().courriel}</span><input data-champ="courriel" type="email" value="${esc(d.courriel)}" autocomplete="email" placeholder="${esc(t().courrielEx)}"></label>
    <label class="champ"><span>${t().tel} <small>${t().optionnel}</small></span><input data-champ="telephone" type="tel" value="${esc(d.telephone)}" autocomplete="tel"></label>
    <label class="champ"><span>${t().message} <small>${t().optionnel}</small></span><textarea data-champ="message" rows="3" placeholder="${esc(t().messageEx)}">${esc(d.message)}</textarea></label>
    ${carteResume()}`;
  zone.oninput = (ev) => { const k = ev.target.dataset.champ; if (k) { d[k] = ev.target.value; garder(); } };
}

// ---------- Le résumé : une belle carte, qu'on peut enregistrer en image ----------
function lignesPays() {
  return d.pays.map((x, i) => ({
    nom: nomPays(x.nom), couleur: coul(i),
    dates: d.mode === 'pays' ? plage(x.debut, x.fin) : '',
    duree: d.mode === 'pays' ? nuits(x.debut, x.fin) : 0,
  }));
}
function sousTitreDates() {
  const debut = debutVoyage();
  const fin = finVoyage();
  return debut && fin ? plage(debut, fin, true) : t().datesAVoir;
}
const enviesChoisies = () => ENVIES.filter(([k]) => d.envies[k]).map(([k, nom, ico]) => ({ k, nom: nomEnvie(k, nom), ico, n: d.envies[k] }));
const incontournables = () => d.pays.filter((x) => x.incontournable?.trim()).map((x) => ({ nom: nomPays(x.nom), txt: x.incontournable.trim() }));

function carteResume() {
  const total = totalJours();
  const envies = enviesChoisies();
  const inc = incontournables();
  return `
    <article class="carte-resume">
      <div class="cr-haut">
        <p class="cr-sur">${t().monVoyage}${d.nom.trim() ? ` · ${esc(d.nom.trim())}` : ''}</p>
        <h2>${d.pays.map((x) => esc(nomPays(x.nom))).join(' · ')}</h2>
        <p class="cr-dates">${icone('calendar', { taille: 16 })} ${esc(sousTitreDates())}</p>
        <div class="cr-stats">
          <div><b>${d.voyageurs}</b><span>${t().voyageursN(d.voyageurs)}</span></div>
          <div><b>${total || '—'}</b><span>${t().joursMot(total)}</span></div>
          <div><b class="mot">${esc(t().styles[d.style])}</b><span>style</span></div>
        </div>
      </div>
      <ol class="cr-pays">${lignesPays().map((x) => `
        <li style="--c:${x.couleur}"><i></i><span><b>${esc(x.nom)}</b>${x.dates ? `<small>${esc(x.dates)}</small>` : ''}</span>${x.duree ? `<em>${esc(t().nuitsTxt(x.duree))}</em>` : ''}</li>`).join('')}
      </ol>
      ${d.mode === 'total' && d.pays.length > 1 ? `<p class="cr-note">${esc(d.repartition.trim() || t().jeTeLaisse)}</p>` : ''}
      ${envies.length ? `<div class="cr-bloc"><p class="cr-titre">${t().mesEnvies}</p><div class="cr-envies">${envies.map((e) => `<span>${icone(e.ico, { taille: 15 })}${esc(e.nom)}<b>${e.n}</b></span>`).join('')}</div></div>` : ''}
      ${inc.length ? `<div class="cr-bloc"><p class="cr-titre">${t().aVoirCourt}</p>${inc.map((x) => `<p class="cr-inc"><b>${esc(x.nom)}</b> ${esc(x.txt)}</p>`).join('')}</div>` : ''}
    </article>`;
}

// Dessine la carte du résumé dans une image, pour la partager aux autres voyageurs.
async function imageResume() {
  try { await Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 30px Figtree`))); } catch (_) { /* police par défaut */ }
  const W = 1080;
  const M = 48; // marge autour de la carte
  const P = 56; // marge dans la carte
  const L = W - 2 * M - 2 * P; // largeur du texte
  const gauche = M + P;
  const c = document.createElement('canvas');
  c.width = W; c.height = 4000;
  const x = c.getContext('2d');
  const police = (poids, taille) => { x.font = `${poids} ${taille}px Figtree, system-ui, sans-serif`; };
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
  const total = totalJours();

  // En-tête corail
  let y = M + P;
  police(800, 64);
  // Le titre passe à la ligne entre deux pays, jamais au milieu d'un nom.
  const titre = [];
  for (const nomP of d.pays.map((p) => nomPays(p.nom))) {
    const essai = titre.length ? `${titre[titre.length - 1]} · ${nomP}` : nomP;
    if (titre.length && x.measureText(essai).width <= L) titre[titre.length - 1] = essai; else titre.push(nomP);
  }
  y += 24; texte(`${t().monVoyage}${d.nom.trim() ? ` · ${d.nom.trim()}` : ''}`.toUpperCase(), gauche, y, 700, 24, 'rgba(255,255,255,.85)');
  y += 8;
  for (const l of titre) { y += 72; texte(l, gauche, y, 800, 64, '#fff'); }
  y += 52; texte(sousTitreDates(), gauche, y, 600, 32, 'rgba(255,255,255,.92)');
  y += 36;
  const yStats = y;
  const largeurStat = (L - 40) / 3;
  [[String(d.voyageurs), t().voyageursN(d.voyageurs)], [String(total || '—'), t().joursMot(total)], [t().styles[d.style], 'style']].forEach(([v, lbl], i) => {
    const sx = gauche + i * (largeurStat + 20);
    actions.push(() => { rond(sx, yStats, largeurStat, 132, 24); x.fillStyle = 'rgba(255,255,255,.18)'; x.fill(); });
    texte(v, sx + 24, yStats + 68, 800, v.length > 7 ? 38 : 52, '#fff');
    texte(lbl, sx + 24, yStats + 108, 600, 24, 'rgba(255,255,255,.85)');
  });
  const hautHeader = yStats + 132 + P - M;
  actions.unshift(() => {
    const g = x.createLinearGradient(M, M, W - M, M + hautHeader);
    g.addColorStop(0, '#f0532f'); g.addColorStop(1, '#e8436f');
    x.save(); rond(M, M, W - 2 * M, hautHeader, [40, 40, 0, 0]); x.fillStyle = g; x.fill(); x.restore();
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
  if (d.mode === 'total' && d.pays.length > 1) {
    police(500, 28);
    y += 8;
    for (const l of couper(d.repartition.trim() || t().jeTeLaisse, L)) { y += 38; texte(l, gauche, y, 500, 28, '#6b655f'); }
    y += 24;
  }

  // Les envies, en petites étiquettes avec le nombre dans un rond
  const envies = enviesChoisies();
  if (envies.length) {
    y += 34; texte(t().mesEnvies.toUpperCase(), gauche, y, 700, 24, '#a19a92'); y += 22;
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
  }
  const inc = incontournables();
  if (inc.length) {
    y += 46; texte(t().aVoirCourt.toUpperCase(), gauche, y, 700, 24, '#a19a92'); y += 6;
    for (const i2 of inc) {
      police(500, 28);
      couper(`${i2.nom}${d.langue === 'en' ? ':' : ' :'} ${i2.txt}`, L).forEach((l) => { y += 40; texte(l, gauche, y, 500, 28, '#1d1b19'); });
      y += 8;
    }
  }
  const basCarte = y + P - 10;

  x.fillStyle = '#faf8f5'; x.fillRect(0, 0, W, c.height);
  x.save(); x.shadowColor = 'rgba(0,0,0,.08)'; x.shadowBlur = 40; x.shadowOffsetY = 10;
  rond(M, M, W - 2 * M, basCarte - M, 40); x.fillStyle = '#fff'; x.fill(); x.restore();
  actions.forEach((f) => f());

  const fin = document.createElement('canvas');
  fin.width = W; fin.height = basCarte + M;
  fin.getContext('2d').drawImage(c, 0, 0);
  return new Promise((ok) => fin.toBlob(ok, 'image/png'));
}

async function partagerImage() {
  const blob = await imageResume();
  if (!blob) return;
  const nom = `${d.langue === 'en' ? 'my-trip' : 'mon-voyage'}-${d.pays.map((p) => sansAccents(nomPays(p.nom)).replace(/[^a-z]+/g, '-')).join('-')}`.slice(0, 70) + '.png';
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
  const lignes = d.mode === 'total'
    ? `- ${d.pays.map((x) => nomPays(x.nom)).join(', ')}\n- ${t().dureeTotale}${d.langue === 'en' ? ':' : ' :'} ${dureeTexte(d.duree, 'jours')}${d.depart ? `\n- ${t().departLe(jolie(d.depart, { day: 'numeric', month: 'long', year: 'numeric' }))}` : ''}`
    : d.pays.map((x) => `- ${nomPays(x.nom)}${d.langue === 'en' ? ':' : ' :'} ${plage(x.debut, x.fin, true)} (${t().nuitsTxt(nuits(x.debut, x.fin))})`).join('\n');
  return t().corps(lignes, d.voyageurs, lien, d.nom);
}

async function envoyer() {
  if (!d.nom.trim()) return toast(t().ecrisNom);
  if (!/.+@.+\..+/.test(d.courriel.trim()) && !d.telephone.trim()) return toast(t().ecrisCourriel);
  d.envoyeLe = new Date().toISOString();
  garder();
  // On n'envoie que ce qui sert au mode choisi.
  const envoi = structuredClone(d);
  if (envoi.mode === 'total') envoi.pays.forEach((p) => { p.debut = ''; p.fin = ''; });
  else { envoi.duree = totalJours(); envoi.depart = debutVoyage(); envoi.repartition = ''; }
  const code = await encoder(envoi);
  const lien = `${new URL('studio/', location.href).href}#/demande/${code}`;
  const dessiner = () => {
    document.documentElement.lang = d.langue;
    const sujet = t().sujet(d.pays.map((x) => nomPays(x.nom)).join(', '), d.nom);
    const texte = texteMessage(lien);
    fiche.innerHTML = `
      <header class="haut">${enTete(null)}</header>
      <section class="merci">
        <span class="merci-ico">${icone('check', { taille: 30, epaisseur: 2.6 })}</span>
        <h1>${t().presque}</h1>
        <p>${t().presqueTxt}</p>
        <div class="boutons-envoi">
          ${POUR ? `<a class="bouton" href="mailto:${encodeURIComponent(POUR)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte)}">${icone('mail', { taille: 18 })} ${t().parCourriel}</a>` : ''}
          ${TEL ? `<a class="bouton ${POUR ? 'secondaire' : ''}" href="sms:${TEL}?&body=${encodeURIComponent(texte)}">${icone('message-circle', { taille: 18 })} ${t().parMessage}</a>`
            : navigator.share ? `<button class="bouton ${POUR ? 'secondaire' : ''}" id="partager">${icone('message-circle', { taille: 18 })} ${t().parMessage}</button>` : ''}
          ${POUR || TEL || navigator.share ? `<button class="lien" id="copier">${icone('copy', { taille: 16 })} ${t().copier}</button>` : `<button class="bouton" id="copier">${icone('copy', { taille: 18 })} ${t().copier}</button>`}
        </div>
        ${carteResume()}
        <button class="bouton secondaire" id="image">${icone('image', { taille: 18 })} ${t().image}</button>
        <p class="doux">${t().imageAide}</p>
        <button class="lien" id="modifier">${t().modifier}</button>
      </section>`;
    brancherEnTete(dessiner);
    const p = fiche.querySelector('#partager');
    if (p) p.onclick = async () => { try { await navigator.share({ title: sujet, text: texte }); toast(t().merci); } catch (_) { /* annulé */ } };
    fiche.querySelector('#copier').onclick = async () => {
      try { await navigator.clipboard.writeText(texte); toast(t().copie); } catch (_) { prompt(t().copieCeTexte, texte); }
    };
    fiche.querySelector('#image').onclick = partagerImage;
    fiche.querySelector('#modifier').onclick = () => { etape = 0; rendre(); };
  };
  dessiner();
  window.scrollTo(0, 0);
  return undefined;
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
rendre();
