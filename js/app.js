import './clavier.js';
import { tirerPourRecharger } from './tirer.js';
// Tirer vers le bas : on relit les données et on redessine la page, sans écran vide.
tirerPourRecharger(async () => {
  try { if (await sync.lireConfig()) await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix', 'liens']); } catch (_) { /* hors ligne */ }
  try { await liensDemande.relever(); } catch (_) { /* hors ligne */ }
  await charger();
  const y = window.scrollY;
  await router();
  window.scrollTo(0, y);
});
import { TAXONOMIE, TAUX_PAR_DEFAUT, DEVISE_DU_PAYS, CONTACTS, CONTACTS_RARES, NOMS_DEVISES, DEVISES_FAVORITES, sousTypes } from './taxonomie.js';
import { trierFr } from './lieux.js';
import { CONTINENTS, VILLES_MONDE, paysDuContinent } from './monde.js';
import * as sync from './sync.js';
import * as pwa from './installer.js';
import { rouvrirALAccueil } from './accueil.js';
import * as db from './db.js';
import { icone, iconeCat } from './icones.js';
import * as carnets from './carnets.js';
import { dateLongue, formatHeure, choixRetenus, GROUPES_CHOIX, estEnvoye } from './carnet-commun.js';
import * as aVenir from './a-venir.js';
import * as liensDemande from './liens-demande.js';
import * as essai from './essai.js';
import { DEPOT_DONNEES, DEPOT_PUBLIC, MARQUE, ALERTE } from './marque.js';
import { messageAppel, messageRelance, messageRappelFiche, lienTexto, lienCourriel } from './appel.js';
import { PHRASES, PITCH_FR, LANGUES, langueDuPays, voixPays, urgences } from './phrases.js';
import { ENVIES, decoder, nuits as nuitsEntre } from './code-demande.js';
import * as autour from './autour.js';
import * as styleAppli from './style-appli.js';
import { pageCarte } from './carte-contact.js';

styleAppli.couleurBarre();

// ---------- État de l'appli ----------
const etat = {
  endroits: [],
  villes: [],
  taux: { ...TAUX_PAR_DEFAUT },
  region: { continent: '', pays: '' }, // Réglages > Où je suis
  filtres: { recherche: '', pays: '', ville: '', prix: '', categorie: '', type: '', tri: 'recent' },
};
const urlsPhotos = new Map(); // id photo -> URL d'affichage
let brouillon = null; // catégorie choisie avec le bouton + avant d'ouvrir le formulaire

const app = document.getElementById('app');
const feuille = document.getElementById('feuille');

// ---------- Petits outils ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dollars = (n) => (n ? '$'.repeat(n) : '');
const cleVille = (pays, ville) => `${(pays || '').trim().toLowerCase()}|${(ville || '').trim().toLowerCase()}`;
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uniques = (liste) => [...new Set(liste.filter(Boolean))];

function toast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  clearTimeout(toast.minuterie);
  toast.minuterie = setTimeout(() => t.classList.remove('visible'), 2500);
}

function enCAD(montant, devise) {
  const m = parseFloat(String(montant).replace(',', '.'));
  const t = etat.taux[devise];
  if (!m || !t) return null;
  return m * t;
}

function formatCAD(v) {
  if (v == null) return '';
  return v < 10 ? `${v.toFixed(2).replace('.', ',')} $ CA` : `${Math.round(v).toLocaleString('fr-CA')} $ CA`;
}

function lienWeb(v) {
  const t = String(v || '').trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function lienContact(cle, valeur) {
  const v = String(valeur || '').trim();
  const chiffres = v.replace(/[^\d+]/g, '');
  switch (cle) {
    case 'whatsapp': return `https://wa.me/${chiffres.replace('+', '')}`;
    case 'email': return `mailto:${v}`;
    case 'site': case 'reservation': case 'facebook': return lienWeb(v);
    case 'instagram': return /^https?:/i.test(v) ? v : `https://instagram.com/${v.replace('@', '')}`;
    default: return '';
  }
}

function lienCarte(e) {
  if (e.lienMaps) return lienWeb(e.lienMaps);
  if (e.lat && e.lng) return `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`;
  const q = [e.nom, e.adresse, e.ville, e.pays].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

// Les anciennes fiches gardaient le lien Google Maps avec les autres contacts.
function migrer(e) {
  if (e.contacts?.googleMaps && !e.lienMaps) { e.lienMaps = e.contacts.googleMaps; delete e.contacts.googleMaps; }
  return e;
}

async function urlPhoto(id) {
  if (/^https?:/.test(id)) return id;
  if (urlsPhotos.has(id)) return urlsPhotos.get(id);
  const p = await db.lire('photos', id);
  if (!p) return '';
  const url = URL.createObjectURL(p.blob);
  urlsPhotos.set(id, url);
  return url;
}

async function afficherPhotos(racine) {
  for (const img of racine.querySelectorAll('img[data-photo]')) {
    const url = await urlPhoto(img.dataset.photo);
    if (url) img.src = url;
  }
}

// Réduit la photo pour qu'elle prenne moins de place (max 1600 px).
function compresserPhoto(fichier) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fichier);
    img.onload = () => {
      const max = 1600;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => resolve(b || fichier), 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(fichier); };
    img.src = url;
  });
}

// Pays proposés : ceux du continent choisi dans Réglages (ou tous), plus ceux déjà utilisés là.
function listePays() {
  const duContinent = paysDuContinent(etat.region.continent);
  const utilises = etat.endroits.map((e) => e.pays).filter((p) => !etat.region.continent || duContinent.includes(p));
  return trierFr(uniques([...duContinent, ...utilises]));
}
function listeVilles(pays) {
  return trierFr(uniques([...(VILLES_MONDE[pays] || []), ...etat.endroits.filter((e) => e.pays === pays).map((e) => e.ville)]));
}

// ---------- Feuille qui monte du bas (choix de catégorie, pays, ville) ----------
function ouvrirFeuille(html, auClic, { plein = false } = {}) {
  feuille.innerHTML = `<div class="feuille-fond" data-fermer></div><div class="feuille-panneau ${plein ? 'plein' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  feuille.dataset.numero = String(+(feuille.dataset.numero || 0) + 1);
  feuille.classList.remove('ferme');
  feuille.hidden = false;
  document.body.classList.add('fige');
  feuille.onclick = (ev) => {
    if (ev.target.closest('[data-fermer]')) { fermerFeuille(true); return; }
    auClic(ev);
  };
  activerGlissement(feuille.querySelector('.feuille-panneau'));
  const recherche = feuille.querySelector('.feuille-recherche');
  if (recherche) {
    recherche.addEventListener('input', () => { filtrerFeuille(recherche.value); feuille.querySelector('.feuille-panneau').scrollTop = 0; });
    // Entrée choisit le premier résultat.
    recherche.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const visible = (b) => !b.hidden && !b.closest('li').hidden;
      const premier = [...feuille.querySelectorAll('[data-valeur]')].find(visible) || [...feuille.querySelectorAll('[data-ajouter]')].find(visible);
      if (premier) premier.click();
    });
    // Le clavier s'ouvre tout de suite pour pouvoir écrire.
    recherche.focus({ preventScroll: true });
  }
}

// anime = true : la feuille redescend en glissant avant de disparaître.
function fermerFeuille(anime = false) {
  if (feuille.hidden) return;
  const numero = feuille.dataset.numero;
  const fin = () => {
    if (feuille.dataset.numero !== numero) return; // une autre feuille s'est ouverte entre-temps
    feuille.hidden = true;
    feuille.innerHTML = '';
    feuille.classList.remove('ferme');
    document.body.classList.remove('fige');
  };
  const panneau = feuille.querySelector('.feuille-panneau');
  if (!anime || !panneau || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fin(); return; }
  panneau.style.transition = 'transform .22s ease-in';
  panneau.style.transform = 'translateY(100%)';
  feuille.classList.add('ferme');
  setTimeout(fin, 220);
}

// Glisser la feuille vers le bas pour la fermer.
function activerGlissement(panneau) {
  let debutY = null;
  let dy = 0;
  let debutTemps = 0;
  panneau.addEventListener('touchstart', (ev) => {
    if (panneau.scrollTop > 0 && !ev.target.closest('.feuille-entete')) { debutY = null; return; }
    debutY = ev.touches[0].clientY;
    dy = 0;
    debutTemps = Date.now();
    panneau.style.transition = 'none';
  }, { passive: true });
  panneau.addEventListener('touchmove', (ev) => {
    if (debutY == null) return;
    dy = ev.touches[0].clientY - debutY;
    if (dy > 0) {
      panneau.style.transform = `translateY(${dy}px)`;
      if (ev.cancelable) ev.preventDefault();
    }
  }, { passive: false });
  const relacher = () => {
    if (debutY == null) return;
    debutY = null;
    const rapide = dy > 40 && dy / Math.max(1, Date.now() - debutTemps) > 0.5;
    if (dy > 110 || rapide) { fermerFeuille(true); return; }
    panneau.style.transition = 'transform .2s ease-out';
    panneau.style.transform = '';
  };
  panneau.addEventListener('touchend', relacher);
  panneau.addEventListener('touchcancel', relacher);
}

function filtrerFeuille(texte) {
  const q = sansAccents(texte.trim());
  let visibles = 0;
  feuille.querySelectorAll('[data-nom]').forEach((li) => {
    const ok = !q || sansAccents(li.dataset.nom).includes(q);
    li.hidden = !ok;
    if (ok) visibles++;
  });
  const ajout = feuille.querySelector('[data-ajouter]');
  if (ajout) {
    const exact = [...feuille.querySelectorAll('[data-nom]')].some((li) => sansAccents(li.dataset.nom) === q);
    ajout.hidden = !q || exact;
    ajout.dataset.ajouter = texte.trim();
    ajout.querySelector('b').textContent = texte.trim();
  }
  const vide = feuille.querySelector('.feuille-vide');
  if (vide) vide.hidden = visibles > 0 || !!(ajout && !ajout.hidden);
}

const enteteFeuille = (titre, retour) => `
  <div class="feuille-entete">
    ${retour ? `<button type="button" class="rond" data-retour="${retour}" aria-label="Retour">${icone('chevron-left')}</button>` : '<span class="rond vide-rond"></span>'}
    <h2>${titre}</h2>
    <button type="button" class="rond" data-fermer aria-label="Fermer">${icone('x')}</button>
  </div>`;

// Choix catégorie > type > sous-type, un écran à la fois.
function choisirCategorie(f, quandFini) {
  let cat = f.categorie;
  let type = f.type;

  const etape1 = () => ouvrirFeuille(`
    ${enteteFeuille('Catégorie')}
    <div class="tuiles">
      ${Object.entries(TAXONOMIE).map(([k, c]) => `
        <button type="button" class="tuile ${k === f.categorie ? 'choisie' : ''}" style="--c:${c.couleur}" data-cat="${k}">
          <span class="tuile-icone">${iconeCat(k, { taille: 24 })}</span>
          <span class="tuile-nom">${esc(c.nom)}</span>
        </button>`).join('')}
    </div>`, clic);

  const etape2 = () => {
    const c = TAXONOMIE[cat];
    ouvrirFeuille(`
      ${enteteFeuille(esc(c.nom), '1')}
      <div class="tuiles" style="--c:${c.couleur}">
        ${Object.keys(c.types).map((t) => [t, sousTypes(cat, t, f.pays)]).map(([t, sous]) => `
          <button type="button" class="tuile ${cat === f.categorie && t === f.type ? 'choisie' : ''}" data-type="${esc(t)}">
            <span class="tuile-nom">${esc(t)}</span>
          </button>`).join('')}
      </div>`, clic);
  };

  const etape3 = () => {
    const c = TAXONOMIE[cat];
    const sous = sousTypes(cat, type, f.pays);
    ouvrirFeuille(`
      ${enteteFeuille(esc(type), '2')}
      <div class="tuiles tuiles-petites" style="--c:${c.couleur}">
        ${sous.map((s) => `
          <button type="button" class="tuile ${type === f.type && s === f.sousType ? 'choisie' : ''}" data-sous="${esc(s)}">
            <span class="tuile-nom">${esc(s)}</span>
          </button>`).join('')}
        <button type="button" class="tuile tuile-autre" data-autre><span class="tuile-nom">${icone('plus', { taille: 16 })} Autre</span></button>
      </div>
      <div class="autre-saisie" hidden>
        <input id="autre-nom" placeholder="Autre" autocomplete="off" enterkeyhint="done">
        <button type="button" class="bouton-principal" data-autre-ok>OK</button>
      </div>
      <button type="button" class="lien-discret" data-sans-sous>Passer</button>`, clic);
    const champ = feuille.querySelector('#autre-nom');
    champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); feuille.querySelector('[data-autre-ok]').click(); } });
  };

  const finir = (sousType) => {
    f.categorie = cat; f.type = type; f.sousType = sousType;
    fermerFeuille();
    quandFini();
  };

  function clic(ev) {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.retour === '1') etape1();
    else if (b.dataset.retour === '2') etape2();
    else if (b.dataset.cat) {
      cat = b.dataset.cat;
      if (Object.keys(TAXONOMIE[cat].types).length) etape2();
      else { type = ''; finir(''); }
    }
    else if (b.dataset.type) { type = b.dataset.type; etape3(); }
    else if (b.dataset.sous) finir(b.dataset.sous);
    else if (b.hasAttribute('data-sans-sous')) finir('');
    else if (b.hasAttribute('data-autre')) {
      feuille.querySelector('.autre-saisie').hidden = false;
      feuille.querySelector('#autre-nom').focus();
    } else if (b.hasAttribute('data-autre-ok')) {
      const nom = feuille.querySelector('#autre-nom').value.trim();
      if (nom) finir(nom);
    }
  }

  etape1();
}

// Liste avec recherche (pays ou ville).
function choisirDansListe({ titre, valeurs, choisie, ajout, retour, quandChoisi, quandRetour, etiquette = (v) => v, placeholder = 'Chercher…' }) {
  ouvrirFeuille(`
    ${enteteFeuille(esc(titre), retour ? 'liste' : '')}
    <input class="feuille-recherche" type="search" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="words" enterkeyhint="go">
    <ul class="liste-choix">
      ${valeurs.map((v) => `<li data-nom="${esc(etiquette(v))}"><button type="button" class="ligne ${v === choisie ? 'choisie' : ''}" data-valeur="${esc(v)}">${esc(etiquette(v))}${v === choisie ? icone('check', { taille: 18 }) : ''}</button></li>`).join('')}
      ${ajout ? `<li><button type="button" class="ligne ligne-ajout" data-ajouter="" hidden>${icone('plus', { taille: 18 })}<span>Ajouter « <b></b> »</span></button></li>` : ''}
    </ul>
    <p class="feuille-vide" hidden>Aucun résultat.</p>`, (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.retour === 'liste') { quandRetour(); return; }
    const v = b.dataset.valeur ?? b.dataset.ajouter;
    if (v) { fermerFeuille(); quandChoisi(v); }
  }, { plein: true });
}

// ---------- Chargement ----------
async function charger() {
  etat.endroits = (await db.tous('endroits')).map(migrer);
  etat.villes = await db.tous('villes');
  etat.taux = { ...TAUX_PAR_DEFAUT, ...(await db.lireReglage('taux', {})) };
  etat.region = { continent: '', pays: '', ...(await db.lireReglage('region', {})) };
  try {
    const f = JSON.parse(localStorage.getItem('filtres') || 'null');
    if (f) etat.filtres = { ...etat.filtres, ...f, recherche: '' };
  } catch (_) { /* pas grave */ }
}

function sauverFiltres() {
  try { localStorage.setItem('filtres', JSON.stringify(etat.filtres)); } catch (_) { /* pas grave */ }
}

// ---------- Navigation ----------
// Chaque page garde son rang dans l'historique : le bouton Retour revient vraiment à la page d'avant
// (liste, client, demande…), et seulement s'il n'y en a pas, à la page « parent ».
let rang = -1;
function noterRang() {
  const n = history.state?.rang;
  if (Number.isInteger(n)) rang = n;
  else { rang = rang < 0 ? 0 : rang + 1; history.replaceState({ rang }, ''); }
}
function aller(route) { location.hash = route; }
// Revenir en arrière ; « parent » sert quand l'appli vient de s'ouvrir sur cette page.
function revenir(parent = '#/') {
  if (rang > 0) history.back();
  else location.replace(parent);
}
// Tous les boutons Retour (data-retour-page) passent par revenir().
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-retour-page]');
  if (!a) return;
  ev.preventDefault();
  revenir(a.getAttribute('href') || a.dataset.retourPage || '#/');
});

// Les onglets principaux, dans l'ordre : on glisse de l'un à l'autre (gauche / droite).
const ONGLETS = ['liste', 'clients', 'demandes', 'reglages'];
const ROUTE_ONGLET = { liste: '#/', clients: '#/clients', demandes: '#/demandes', reglages: '#/reglages' };
let ongletAvant = null;
function animerOnglet(nom) {
  const a = ONGLETS.indexOf(ongletAvant);
  const b = ONGLETS.indexOf(nom);
  ongletAvant = b >= 0 ? nom : null;
  app.classList.remove('glisse-gauche', 'glisse-droite', 'glisse-tenu');
  app.style.transform = '';
  if (a < 0 || b < 0 || a === b) return;
  void app.offsetWidth;
  app.classList.add(b > a ? 'glisse-gauche' : 'glisse-droite');
}
(function glisserEntreOnglets() {
  let x0 = null; let y0 = null; let sens = null;
  const bloque = (cible) => cible.closest('input, textarea, select, .onglets-cats, .galerie, .puces-langues, .defile, .av-jours, #feuille, .pas-glisser');
  document.addEventListener('touchstart', (ev) => {
    x0 = null;
    if (ev.touches.length !== 1 || !ONGLETS.includes(document.body.dataset.page) || !feuille.hidden || bloque(ev.target)) return;
    x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; sens = null;
  }, { passive: true });
  document.addEventListener('touchmove', (ev) => {
    if (x0 == null) return;
    const dx = ev.touches[0].clientX - x0; const dy = ev.touches[0].clientY - y0;
    if (!sens && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) sens = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    if (sens !== 'x') return;
    const k = ONGLETS.indexOf(document.body.dataset.page);
    const bout = (dx > 0 && k === 0) || (dx < 0 && k === ONGLETS.length - 1);
    app.classList.add('glisse-tenu');
    app.style.transform = `translateX(${dx * (bout ? 0.12 : 0.35)}px)`;
  }, { passive: true });
  const fin = (ev) => {
    if (x0 == null) return;
    const dx = (ev.changedTouches?.[0]?.clientX ?? x0) - x0;
    x0 = null;
    app.classList.remove('glisse-tenu');
    if (sens !== 'x') { app.style.transform = ''; return; }
    const k = ONGLETS.indexOf(document.body.dataset.page);
    const cible = Math.abs(dx) > 60 ? ONGLETS[k + (dx < 0 ? 1 : -1)] : null;
    if (!cible) { app.style.transition = 'transform .2s'; app.style.transform = ''; setTimeout(() => { app.style.transition = ''; }, 220); return; }
    try { navigator.vibrate?.(8); } catch (_) { /* rien */ }
    aller(ROUTE_ONGLET[cible]);
  };
  document.addEventListener('touchend', fin, { passive: true });
  document.addEventListener('touchcancel', fin, { passive: true });
})();

async function router() {
  noterRang();
  fermerFeuille();
  const [, page, id] = (location.hash || '#/').split('/');
  const nom = page || 'liste';
  animerOnglet(nom);
  document.body.dataset.page = nom;
  document.body.classList.remove('mode-selection');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === (['carnet', 'demande', 'demandes'].includes(nom) ? 'clients' : nom === 'outils' ? 'reglages' : nom)));
  window.scrollTo(0, 0);
  if (page === 'ajouter') return pageFormulaire(null);
  if (page === 'modifier') return pageFormulaire(id);
  if (page === 'endroit') return pageFiche(id);
  if (page === 'villes') return pageVilles();
  if (page === 'reglages') return pageReglages();
  if (page === 'outils') return pageOutil(id);
  if (page === 'clients') return pageClients();
  if (page === 'demandes') return pageClients('demandes');
  if (page === 'voyage') return pageMonVoyage(id, location.hash.split('/')[3] || '');
  if (page === 'demande') return pageDemande(id);
  if (page === 'carnet') return pageCarnet(id, (location.hash.split('/')[3] || ''));
  return pageListe();
}

// ---------- Liste des endroits ----------
function endroitsFiltres() {
  const f = etat.filtres;
  const q = sansAccents(f.recherche.trim());
  const liste = etat.endroits.filter((e) =>
    (!f.pays || e.pays === f.pays) &&
    (!f.ville || e.ville === f.ville) &&
    (!f.prix || String(e.prix) === f.prix) &&
    (!f.categorie || e.categorie === f.categorie) &&
    (!f.type || e.type === f.type) &&
    (!q || sansAccents([e.nom, e.ville, e.pays, e.type, e.sousType, e.description, e.notes].join(' ')).includes(q)));

  const nul = (v, fin) => (v == null || v === '' ? fin : v);
  const tris = {
    recent: (a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''),
    prixCroissant: (a, b) => nul(a.prix, 99) - nul(b.prix, 99),
    prixDecroissant: (a, b) => nul(b.prix, -1) - nul(a.prix, -1),
    luxe: (a, b) => nul(b.confort, -1) - nul(a.confort, -1),
    coeur: (a, b) => (b.coupDeCoeur ? 1 : 0) - (a.coupDeCoeur ? 1 : 0),
    nom: (a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'),
  };
  return liste.sort(tris[f.tri] || tris.recent);
}

function options(valeurs, choisie, vide) {
  return `<option value="">${esc(vide)}</option>` + valeurs.map((v) => {
    const [val, lib] = Array.isArray(v) ? v : [v, v];
    return `<option value="${esc(val)}" ${String(val) === String(choisie) ? 'selected' : ''}>${esc(lib)}</option>`;
  }).join('');
}

async function pageListe() {
  const f = etat.filtres;
  const paysConnus = trierFr(uniques(etat.endroits.map((e) => e.pays)));
  const villesConnues = trierFr(uniques(etat.endroits.filter((e) => !f.pays || e.pays === f.pays).map((e) => e.ville)));
  const typesConnus = f.categorie ? Object.keys(TAXONOMIE[f.categorie]?.types || {}) : [];
  const nbFiltres = ['pays', 'ville', 'prix', 'type'].filter((k) => f[k]).length;
  const nbPays = paysConnus.length;
  const compteCat = (k) => etat.endroits.filter((e) => e.categorie === k).length;

  const derniere = await db.lireReglage('derniereSauvegarde', null);
  const jours = derniere ? Math.floor((Date.now() - new Date(derniere)) / 864e5) : null;
  const envoi = await sync.etat();
  const rappel = !envoi.branche && etat.endroits.length >= 5 && (jours === null || jours >= 7);

  const nb = etat.endroits.length;
  app.innerHTML = `
    <header class="tete">
      <div class="pilule-recherche">
        ${icone('search', { taille: 18, epaisseur: 2.4 })}
        <div class="pilule-textes">
          <input type="search" id="recherche" placeholder="Chercher un endroit" value="${esc(f.recherche)}" autocomplete="off" aria-label="Chercher un endroit">
          <small>${nb ? `${nb} endroit${nb > 1 ? 's' : ''}, ${nbPays} pays` : 'Nom, ville, type, notes…'}</small>
        </div>
        <button class="pilule-filtres ${nbFiltres ? 'actif' : ''}" id="btn-filtres" aria-label="Filtres">${icone('sliders-horizontal', { taille: 18 })}${nbFiltres ? `<i>${nbFiltres}</i>` : ''}</button>
      </div>
      <nav class="onglets-cats" aria-label="Catégories">
        <button class="onglet-cat ${!f.categorie ? 'choisie' : ''}" data-cat-filtre="">${icone('layout-grid', { taille: 22, epaisseur: 1.7 })}<span>Tout</span></button>
        ${Object.entries(TAXONOMIE).map(([k, c]) => `<button class="onglet-cat ${f.categorie === k ? 'choisie' : ''}" data-cat-filtre="${k}" ${compteCat(k) ? '' : 'data-vide'}>${iconeCat(k, { taille: 22, epaisseur: 1.7 })}<span>${esc(c.nom)}</span></button>`).join('')}
      </nav>
    </header>
    <div class="filtres ${nbFiltres ? 'ouvert' : ''}" id="filtres">
      <div class="filtres-grille">
        <label><span>Pays</span><select data-filtre="pays">${options(paysConnus, f.pays, 'Tous')}</select></label>
        <label><span>Ville</span><select data-filtre="ville">${options(villesConnues, f.ville, 'Toutes')}</select></label>
        <label><span>Budget</span><select data-filtre="prix">${options([['1', '$'], ['2', '$$'], ['3', '$$$'], ['4', '$$$$']], f.prix, 'Tous')}</select></label>
        <label><span>Type</span><select data-filtre="type" ${f.categorie ? '' : 'disabled'}>${options(typesConnus, f.type, f.categorie ? 'Tous' : 'Choisis une catégorie')}</select></label>
      </div>
      ${nbFiltres ? '<button class="lien" id="effacer-filtres">Effacer les filtres</button>' : ''}
    </div>
    ${rappel ? `<a class="alerte" href="#/reglages">${icone('save', { taille: 18 })}<span>${jours === null ? "Tes endroits sont seulement sur ce téléphone." : `Dernière copie il y a ${jours} jours.`} <b>Brancher l'envoi automatique</b></span>${icone('chevron-right', { taille: 18 })}</a>` : ''}
    ${envoi.branche ? `<p class="etat-envoi" id="etat-envoi">${texteEnvoi(envoi)}</p>` : ''}
    <div class="barre-liste" ${nb ? '' : 'hidden'}>
      <span id="compte"></span>
      <label class="tri">${icone('arrow-up-down', { taille: 15 })}<select id="tri" aria-label="Trier">
        ${options([['recent', 'Plus récents'], ['prixCroissant', 'Moins cher'], ['prixDecroissant', 'Plus cher'], ['luxe', 'Plus luxueux'], ['coeur', 'Coups de cœur'], ['nom', 'Nom (A à Z)']], f.tri, 'Trier')}
      </select></label>
    </div>
    <ul class="cartes" id="cartes"></ul>`;

  const remplir = () => {
    const l = endroitsFiltres();
    const ul = app.querySelector('#cartes');
    const compte = app.querySelector('#compte');
    if (compte) compte.textContent = `${l.length} endroit${l.length > 1 ? 's' : ''}`;
    ul.innerHTML = l.map(carte).join('') || (etat.endroits.length
      ? `<li class="vide"><span class="vide-icone">${icone('search', { taille: 28 })}</span><b>Aucun résultat</b></li>`
      : `<li class="vide"><span class="vide-icone">${icone('map-pin', { taille: 30 })}</span><b>Aucun endroit</b><a class="bouton-principal bouton-vide" href="#/ajouter">${icone('plus', { taille: 18 })} Ajouter un endroit</a></li>`);
    afficherPhotos(ul);
  };
  remplir();
  // Appui long sur un endroit : modifier, pour un client, supprimer…
  appuiLong(app.querySelector('#cartes'), 'a.carte', (a) => {
    const e = etat.endroits.find((x) => x.id === a.dataset.id);
    if (e) menuEndroit(e, { apres: () => remplir() });
  });

  const rafraichir = () => { sauverFiltres(); pageListe(); };
  app.querySelector('#recherche').addEventListener('input', (ev) => { etat.filtres.recherche = ev.target.value; remplir(); });
  app.querySelector('#btn-filtres').onclick = () => app.querySelector('#filtres').classList.toggle('ouvert');
  app.querySelector('#tri').onchange = (ev) => { etat.filtres.tri = ev.target.value || 'recent'; rafraichir(); };
  app.querySelectorAll('[data-cat-filtre]').forEach((b) => {
    b.onclick = () => { etat.filtres.categorie = b.dataset.catFiltre; etat.filtres.type = ''; rafraichir(); };
  });
  app.querySelectorAll('[data-filtre]').forEach((s) => {
    s.onchange = () => {
      const k = s.dataset.filtre;
      etat.filtres[k] = s.value;
      if (k === 'pays') etat.filtres.ville = '';
      rafraichir();
    };
  });
  const eff = app.querySelector('#effacer-filtres');
  if (eff) eff.onclick = () => { Object.assign(etat.filtres, { pays: '', ville: '', prix: '', type: '' }); rafraichir(); };
  const choisie = app.querySelector('.onglet-cat.choisie');
  if (choisie && choisie.dataset.catFiltre) choisie.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// Petite ligne sous la recherche : tout est-il bien parti vers le Studio ?
function texteEnvoi(e) {
  if (e.enAttente && e.horsLigne) return `${icone('clock', { taille: 14 })} Pas d'internet : ${e.enAttente} élément${e.enAttente > 1 ? 's' : ''} partira${e.enAttente > 1 ? 'ont' : ''} au Studio dès que possible`;
  if (e.enAttente && e.erreur) return `${icone('triangle-alert', { taille: 14 })} L'envoi au Studio bloque. <a href="#/reglages">Voir</a>`;
  if (e.enAttente) return `${icone('refresh-cw', { taille: 14 })} Envoi au Studio… (${e.enAttente})`;
  return `${icone('check', { taille: 14 })} Tout est envoyé au Studio`;
}
sync.surChangement((e) => { const p = document.getElementById('etat-envoi'); if (p) p.innerHTML = texteEnvoi(e); });

// 28000 -> « 28 000 » (garde le texte tel quel si ce n'est pas un nombre).
function fmtMontant(m) {
  const n = parseFloat(String(m ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n.toLocaleString('fr-CA', { maximumFractionDigits: 2 }) : String(m ?? '');
}

function prixHtml(n) {
  if (!n) return '';
  return `<span class="dollars" aria-label="Budget ${n} sur 4"><b>${'$'.repeat(n)}</b>${'$'.repeat(4 - n)}</span>`;
}

function carte(e) {
  const cat = TAXONOMIE[e.categorie] || TAXONOMIE.autre;
  const sousTitre = [e.sousType || e.type, cat.nom].filter(Boolean)[0];
  const lieu = e.categorie === 'trajets' && (e.depart || e.arrivee)
    ? `${esc(e.depart || '?')} → ${esc(e.arrivee || '?')}`
    : esc([e.ville, e.pays].filter(Boolean).join(', '));
  const n = e.photos?.length || 0;
  return `
    <li>
      <a class="carte" href="#/endroit/${esc(e.id)}" data-id="${esc(e.id)}" style="--c:${cat.couleur}">
        <div class="carte-image ${n ? '' : 'sans-photo'}">
          ${n ? `<img data-photo="${esc(e.photos[0])}" alt="" loading="lazy">` : `<span class="carte-icone">${iconeCat(e.categorie, { taille: 38, epaisseur: 1.4 })}</span>`}
          ${e.coupDeCoeur ? '<span class="carte-badge">Coup de cœur</span>' : ''}
          ${e.coupDeCoeur ? `<span class="carte-coeur" aria-label="Coup de cœur">${icone('heart', { taille: 22 })}</span>` : ''}
          ${n > 1 ? `<span class="carte-nb">${icone('camera', { taille: 13 })} ${n}</span>` : ''}
        </div>
        <div class="carte-corps">
          <div class="carte-ligne">
            <span class="carte-nom">${esc(e.nom)}</span>
            ${e.confort ? `<span class="carte-note">${icone('star', { taille: 13 })}${e.confort}</span>` : ''}
          </div>
          <div class="carte-sous">${esc(sousTitre)}</div>
          ${lieu ? `<div class="carte-sous">${lieu}</div>` : ''}
          ${e.prix || e.montant ? `<div class="carte-prix">${prixHtml(e.prix)}${e.montant ? `<span>${esc(fmtMontant(e.montant))} ${esc(e.devise || '')}</span>` : ''}</div>` : ''}
        </div>
      </a>
    </li>`;
}

// ---------- Appui long, menu d'un endroit, choix du client ----------
// Appui long (½ seconde) sur un élément : ouvre le menu de l'appli au lieu du menu du téléphone.
// Quand on lâche après un appui long, le téléphone envoie un « clic » à l'endroit du doigt :
// il tomberait sur le menu qui vient de s'ouvrir (et le fermerait). On l'ignore.
let clicFantome = null; // { t, x, y } : où et quand le doigt s'est levé
document.addEventListener('click', (ev) => {
  const f = clicFantome;
  if (!f || Date.now() > f.t) return;
  // Seulement le clic qui tombe là où le doigt s'est levé (un vrai toucher ailleurs passe).
  if (ev.clientX === 0 && ev.clientY === 0 ? true : Math.abs(ev.clientX - f.x) < 30 && Math.abs(ev.clientY - f.y) < 30) {
    ev.preventDefault(); ev.stopPropagation(); clicFantome = null;
  }
}, true);
function appuiLong(racine, selecteur, quandAppui) {
  let minuterie = null;
  let depart = null;
  let declenche = false;
  const annuler = () => { clearTimeout(minuterie); minuterie = null; };
  racine.addEventListener('touchstart', (ev) => {
    const el = ev.target.closest(selecteur);
    if (!el || ev.touches.length > 1) return;
    declenche = false;
    depart = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    annuler();
    el.classList.add('appui');
    minuterie = setTimeout(() => {
      minuterie = null;
      declenche = true;
      el.classList.remove('appui');
      if (navigator.vibrate) navigator.vibrate(15);
      try { window.getSelection()?.removeAllRanges(); } catch (_) { /* rien */ }
      quandAppui(el);
    }, 480);
  }, { passive: true });
  racine.addEventListener('touchmove', (ev) => {
    if (!minuterie || !depart) return;
    const t = ev.touches[0];
    if (Math.abs(t.clientX - depart.x) > 10 || Math.abs(t.clientY - depart.y) > 10) { annuler(); racine.querySelectorAll('.appui').forEach((x) => x.classList.remove('appui')); }
  }, { passive: true });
  const fin = (ev) => {
    annuler();
    racine.querySelectorAll('.appui').forEach((x) => x.classList.remove('appui'));
    if (declenche && ev.cancelable) ev.preventDefault(); // pas de clic après un appui long
    if (declenche) {
      const t = ev.changedTouches?.[0];
      clicFantome = t ? { t: Date.now() + 600, x: t.clientX, y: t.clientY } : null;
      setTimeout(() => { declenche = false; }, 450);
    }
  };
  racine.addEventListener('touchend', fin);
  racine.addEventListener('touchcancel', fin);
  // Clic droit (ordinateur) ou menu du téléphone : notre menu à la place.
  racine.addEventListener('contextmenu', (ev) => {
    const el = ev.target.closest(selecteur);
    if (!el) return;
    ev.preventDefault();
    if (!declenche) quandAppui(el);
  });
  racine.addEventListener('click', (ev) => {
    if (declenche && ev.target.closest(selecteur)) { ev.preventDefault(); ev.stopPropagation(); declenche = false; }
  }, true);
}

// Clients en cours (un carnet actif = un client qu'on prépare). Le client « en repérage » d'abord.
async function clientsActifs() {
  const actif = await db.lireReglage('carnetActif', null);
  return (await db.tous('carnets')).filter((c) => c.actif)
    .sort((a, b) => (b.id === actif) - (a.id === actif) || (b.modifieLe || '').localeCompare(a.modifieLe || ''));
}
const nomClient = (c) => [c.client?.nom || c.client?.prenom || 'Client sans nom', c.ville].filter(Boolean).join(' · ') + (c.raph && c.raph !== 'Raph' ? ` (${c.raph})` : '');

function choisirClient(clients, choisi, quandChoisi) {
  const parId = new Map(clients.map((c) => [c.id, c]));
  choisirDansListe({
    titre: 'Pour quel client ?',
    valeurs: clients.map((c) => c.id),
    choisie: choisi,
    etiquette: (id) => nomClient(parId.get(id)),
    placeholder: 'Chercher un client',
    quandChoisi: (id) => quandChoisi(parId.get(id)),
  });
}

// Met l'endroit dans la file d'un client (il part selon ses réglages d'envoi).
async function envoyerAClient(e) {
  const clients = await clientsActifs();
  if (!clients.length) { toast('Aucun client en cours. Crée-le dans Clients.'); return; }
  const pret = async (c) => {
    const frais = await db.lire('carnets', c.id);
    if (frais.items.some((i) => i.endroitId === e.id)) { toast(`Déjà prévu pour ${frais.client?.prenom || 'ce client'}`); return; }
    carnets.ajouterItem(frais, e.id);
    await carnets.enregistrer(frais);
    await db.ecrireReglage('dernierClient', frais.id);
    toast(`Prévu pour ${frais.client?.prenom || 'le client'} ✓`);
  };
  if (clients.length === 1) pret(clients[0]); else choisirClient(clients, null, pret);
}

// Efface l'endroit partout : sur le téléphone, dans le Studio, et dans la file des clients (s'il n'est pas déjà parti).
async function supprimerEndroit(e) {
  for (const p of e.photos || []) await db.effacer('photos', p);
  await db.effacer('endroits', e.id);
  etat.endroits = etat.endroits.filter((x) => x.id !== e.id);
  sync.marquer(sync.cheminEndroit(e), (e.photos || []).map(sync.cheminPhoto));
  for (const c of await db.tous('carnets')) {
    const avant = c.items.length;
    c.items = c.items.filter((i) => i.endroitId !== e.id || estEnvoye(i));
    if (c.items.length !== avant) await carnets.enregistrer(c);
  }
}

function menuEndroit(e, { apres } = {}) {
  const carteUrl = lienCarte(e);
  ouvrirFeuille(`
    ${enteteFeuille(esc(e.nom))}
    <ul class="liste-choix">
      ${ligneMenu('modifier', 'pencil', 'Modifier')}
      ${e.contributeurId ? '' : ligneMenu('client', 'send', 'Pour un client')}
      ${ligneMenu('coeur', 'heart', e.coupDeCoeur ? 'Retirer le coup de cœur' : 'Coup de cœur')}
      ${carteUrl ? ligneMenu('carte', 'map', 'Ouvrir dans Google Maps') : ''}
      ${ligneMenu('supprimer', 'trash-2', 'Supprimer', 'ligne-danger')}
    </ul>
    ${confirmerHtml(`Supprimer « ${esc(e.nom)} » ?`, '', 'Supprimer')}`, async (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'modifier') { fermerFeuille(); aller(`#/modifier/${e.id}`); }
    else if (a === 'client') { fermerFeuille(); envoyerAClient(e); }
    else if (a === 'coeur') {
      e.coupDeCoeur = !e.coupDeCoeur;
      e.modifieLe = new Date().toISOString();
      await db.ecrire('endroits', e);
      sync.marquer(sync.cheminEndroit(e));
      fermerFeuille();
      toast(e.coupDeCoeur ? 'Coup de cœur ✓' : 'Coup de cœur retiré');
      if (apres) apres();
    } else if (a === 'carte') { fermerFeuille(); window.open(carteUrl, '_blank', 'noopener'); }
    else if (a === 'supprimer') montrerConfirmer(b);
    else if (a === 'non') cacherConfirmer();
    else if (a === 'oui') {
      await supprimerEndroit(e);
      fermerFeuille();
      toast('Endroit supprimé');
      if (apres) apres(true);
    }
  });
}

// ---------- Fiche d'un endroit ----------
async function pageFiche(id) {
  const e = etat.endroits.find((x) => x.id === id);
  if (!e) return location.replace('#/');
  const cat = TAXONOMIE[e.categorie] || TAXONOMIE.autre;
  const cad = enCAD(e.montant, e.devise);
  const carteUrl = lienCarte(e);
  const tel = e.telephone ? e.telephone.replace(/[^\d+]/g, '') : '';
  const contacts = CONTACTS.filter(([k]) => e.contacts?.[k]).map(([k, lib]) => {
    const lien = lienContact(k, e.contacts[k]);
    return `<li>${icone(k === 'email' ? 'message-circle' : k === 'whatsapp' ? 'phone' : 'link', { taille: 20 })}<div><span class="etiquette">${esc(lib)}</span>${lien ? `<a href="${esc(lien)}" target="_blank" rel="noopener">${esc(e.contacts[k])}</a>` : `<span>${esc(e.contacts[k])}</span>`}</div></li>`;
  }).join('');
  const photos = e.photos || [];

  const ligne = (ico, etiquette, contenu) => `<li>${icone(ico, { taille: 20 })}<div><span class="etiquette">${etiquette}</span>${contenu}</div></li>`;
  app.innerHTML = `
    <div class="fiche-haut" style="--c:${cat.couleur}">
      ${photos.length ? `<div class="galerie" id="galerie">${photos.map((p) => `<img data-photo="${esc(p)}" alt="">`).join('')}</div>` : `<div class="fiche-icone">${iconeCat(e.categorie, { taille: 64, epaisseur: 1.2 })}</div>`}
      <div class="fiche-boutons">
        <a class="rond rond-flottant" href="#/" data-retour-page aria-label="Retour">${icone('chevron-left', { taille: 20, epaisseur: 2.4 })}</a>
        <span class="fiche-boutons-droite">
          <a class="rond rond-flottant" href="#/modifier/${esc(e.id)}" aria-label="Modifier">${icone('pencil', { taille: 18 })}</a>
          <button type="button" class="rond rond-flottant" id="menu-fiche" aria-label="Plus">${icone('ellipsis', { taille: 20 })}</button>
        </span>
      </div>
      ${photos.length > 1 ? `<span class="galerie-compte" id="galerie-compte">1 / ${photos.length}</span>` : ''}
    </div>
    <article class="fiche" style="--c:${cat.couleur}">
      <p class="chemin">${iconeCat(e.categorie, { taille: 15 })}<span>${esc([cat.nom, e.type, e.sousType].filter(Boolean).join(', '))}</span></p>
      <h1>${esc(e.nom)}</h1>
      <p class="lieu">${esc(e.categorie === 'trajets' && (e.depart || e.arrivee) ? `${e.depart || '?'} → ${e.arrivee || '?'}` : [e.ville, e.pays].filter(Boolean).join(', '))}</p>

      ${e.coupDeCoeur || e.prix || e.confort ? `
      <div class="bandeau-cotes">
        ${e.coupDeCoeur ? `<div class="cote cote-coeur">${icone('heart', { taille: 22 })}<span>Coup de cœur</span></div>` : ''}
        ${e.prix ? `<div class="cote"><b>${'$'.repeat(e.prix)}</b><span>Budget</span></div>` : ''}
        ${e.confort ? `<div class="cote"><b>${e.confort}${icone('star', { taille: 14 })}</b><span>Confort</span></div>` : ''}
      </div>` : ''}

      ${e.montant ? `<p class="prix-reel"><b>${esc(fmtMontant(e.montant))} ${esc(e.devise)}</b>${cad != null && e.devise !== 'CAD' ? ` <span>≈ ${formatCAD(cad)}</span>` : ''}</p>` : ''}

      <div class="actions">
        ${tel ? `<a class="action" href="tel:${esc(tel)}"><span>${icone('phone')}</span>Appeler</a>` : ''}
        ${carteUrl ? `<a class="action" href="${esc(carteUrl)}" target="_blank" rel="noopener"><span>${icone('map')}</span>Carte</a>` : ''}
        ${e.contacts?.whatsapp ? `<a class="action" href="${esc(lienContact('whatsapp', e.contacts.whatsapp))}" target="_blank" rel="noopener"><span>${icone('message-circle')}</span>WhatsApp</a>` : ''}
        ${e.contacts?.site ? `<a class="action" href="${esc(lienWeb(e.contacts.site))}" target="_blank" rel="noopener"><span>${icone('globe')}</span>Site web</a>` : ''}
      </div>

      ${e.categorie === 'trajets' && (e.depart || e.arrivee || e.duree) ? `
        <section class="bloc-fiche">
          <h2>Le trajet</h2>
          <div class="trajet">
            <div><span class="etiquette">Départ</span><b>${esc(e.depart || '—')}</b></div>
            <div class="trajet-fleche">${icone('arrow-right', { taille: 22 })}<small>${esc(e.duree || '')}</small></div>
            <div><span class="etiquette">Arrivée</span><b>${esc(e.arrivee || '—')}</b></div>
          </div>
        </section>` : ''}

      ${e.description ? `<section class="bloc-fiche"><h2>À propos</h2><p class="texte">${esc(e.description)}</p></section>` : ''}

      <section class="bloc-fiche">
        <h2>Coordonnées</h2>
        <ul class="details">
          ${e.adresse ? ligne('map-pin', 'Adresse', `<span>${esc(e.adresse)}</span>`) : ''}
          ${e.telephone ? ligne('phone', 'Téléphone', `<a href="tel:${esc(tel)}">${esc(e.telephone)}</a>`) : ''}
          ${carteUrl ? ligne('map', 'Carte', `<a href="${esc(carteUrl)}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>`) : ''}
          ${e.lat ? ligne('locate-fixed', 'Position GPS', `<span>${e.lat}, ${e.lng}</span>`) : ''}
          ${contacts}
        </ul>
      </section>

      ${e.notes ? `<section class="bloc-fiche"><h2>${icone('lock', { taille: 17 })} Mes notes privées</h2><p class="texte notes">${esc(e.notes)}</p></section>` : ''}

      <div id="zone-client"></div>
      <p class="verifie">${e.verifieLe ? `${icone('badge-check', { taille: 16 })} Vérifié le ${esc(new Date(`${e.verifieLe}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }))}` : 'Pas de date de vérification'}</p>
      <button class="bouton-danger" id="supprimer">${icone('trash-2', { taille: 18 })} Supprimer cet endroit</button>
      <div class="confirmer" id="confirmer" hidden>
        <p>Supprimer « ${esc(e.nom)} » ? C'est définitif.</p>
        <button class="bouton-danger plein" id="oui-supprimer">Oui, supprimer</button>
        <button class="bouton-secondaire" id="non-supprimer">Annuler</button>
      </div>
    </article>`;

  const galerie = app.querySelector('#galerie');
  if (galerie && photos.length > 1) {
    galerie.addEventListener('scroll', () => {
      const i = Math.round(galerie.scrollLeft / galerie.clientWidth) + 1;
      app.querySelector('#galerie-compte').textContent = `${i} / ${photos.length}`;
    }, { passive: true });
  }
  afficherPhotos(app);
  // Les clients pour qui cet endroit est prévu, et un bouton pour l'ajouter à un client.
  const majZoneClient = async () => {
    const zone = app.querySelector('#zone-client');
    if (!zone || e.contributeurId) return;
    const clients = await clientsActifs();
    if (!clients.length) { zone.innerHTML = ''; return; }
    const pour = clients.filter((c) => c.items.some((i) => i.endroitId === e.id));
    zone.innerHTML = `${pour.map((c) => `<p class="etat-branche">${icone('check', { taille: 16 })}<span>Prévu pour <b>${esc(nomClient(c))}</b></span></p>`).join('')}
      ${pour.length < clients.length ? `<button class="bouton-secondaire bouton-bloc" id="envoyer-client">${icone('send', { taille: 18 })} ${pour.length ? 'Aussi pour un autre client' : 'Pour un client'}</button>` : ''}`;
    const b = zone.querySelector('#envoyer-client');
    if (b) b.onclick = async () => {
      const restants = clients.filter((c) => !pour.includes(c));
      const pret = async (c) => { const frais = await db.lire('carnets', c.id); carnets.ajouterItem(frais, e.id); await carnets.enregistrer(frais); await db.ecrireReglage('dernierClient', c.id); toast(`Prévu pour ${c.client?.prenom || 'le client'} ✓`); majZoneClient(); };
      if (restants.length === 1) pret(restants[0]); else choisirClient(restants, null, pret);
    };
  };
  majZoneClient();
  app.querySelector('#menu-fiche').onclick = () => menuEndroit(e, { apres: (efface) => (efface ? revenir('#/') : pageFiche(e.id)) });
  appuiLong(app, '.galerie img', () => menuEndroit(e, { apres: (efface) => (efface ? revenir('#/') : pageFiche(e.id)) }));
  const demander = (oui) => { app.querySelector('#supprimer').hidden = oui; app.querySelector('#confirmer').hidden = !oui; };
  app.querySelector('#supprimer').onclick = () => demander(true);
  app.querySelector('#non-supprimer').onclick = () => demander(false);
  app.querySelector('#oui-supprimer').onclick = async () => {
    await supprimerEndroit(e);
    toast('Endroit supprimé');
    revenir('#/');
  };
}

// ---------- Formulaire d'ajout / modification ----------
async function pageFormulaire(id) {
  const existant = id ? etat.endroits.find((x) => x.id === id) : null;
  if (id && !existant) return location.replace('#/');
  const dernierLieu = await db.lireReglage('dernierLieu', {});
  // Pays fixé dans Réglages > Où je suis : il est déjà rempli, et la dernière ville aussi si elle est dans ce pays.
  const paysFixe = etat.region.pays;
  const lieu = paysFixe ? { pays: paysFixe, ville: dernierLieu.pays === paysFixe ? dernierLieu.ville : '', devise: dernierLieu.pays === paysFixe ? dernierLieu.devise : '' } : dernierLieu;
  const f = existant
    ? structuredClone(existant)
    : { id: db.nouvelId(), pays: lieu.pays || '', ville: lieu.ville || '', devise: lieu.devise || DEVISE_DU_PAYS[lieu.pays] || 'CAD', contacts: {}, photos: [], verifieLe: aujourdhui(), ...(brouillon || {}) };
  if (!f.devise) f.devise = DEVISE_DU_PAYS[f.pays] || 'CAD';
  if (!f.contacts) f.contacts = {};
  brouillon = null;
  // « Pour un client » : coché d'office pour le client en repérage. Coché, on choisit le client dans la liste.
  const clients = f.contributeurId ? [] : await clientsActifs();
  const clientDepart = existant ? clients.find((c) => c.items.some((i) => i.endroitId === f.id)) || null : null;
  // Un client « En repérage » : tout nouvel endroit va dans sa file (on peut décocher).
  const actifId = await db.lireReglage('carnetActif', null);
  const enReperage = !existant ? clients.find((c) => c.id === actifId) || null : null;
  let clientChoisi = clientDepart || enReperage;
  const itemClient = clientDepart?.items.find((i) => i.endroitId === f.id);
  const dernierClient = await db.lireReglage('dernierClient', null);
  const pellicule = await db.lireReglage('pellicule', true);
  f.aPellicule = []; // photos prises avec l'appareil, à garder aussi dans la pellicule
  f.contacts = f.contacts || {};
  f.photos = f.photos || [];
  f.nouvellesPhotos = []; // { cle, blob, url }
  f.photosRetirees = [];
  const nbAutresContacts = CONTACTS.filter(([k]) => f.contacts[k]).length;

  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="${existant ? `#/endroit/${esc(f.id)}` : '#/'}" data-retour-page aria-label="Annuler">${icone('x')}</a>
      <h1>${existant ? 'Modifier' : 'Nouvel endroit'}</h1>
      <span class="rond vide-rond"></span>
    </header>
    <form id="formulaire" class="formulaire" autocomplete="off" novalidate>

      <section class="section">
        <button type="button" class="selecteur selecteur-cat" id="choix-categorie"></button>
        <label class="champ"><span>Nom</span><input name="nom" required value="${esc(f.nom)}" placeholder="Nom de l'endroit" autocapitalize="words" enterkeyhint="done"></label>
      </section>

      <section class="section">
        <h2 class="section-titre">Photos</h2>
        <div class="photos" id="photos"></div>
        <div class="deux">
          <label class="bouton-secondaire bouton-photo">${icone('camera', { taille: 20 })} Prendre<input type="file" accept="image/*" capture="environment" id="prendre-photo" hidden></label>
          <label class="bouton-secondaire bouton-photo">${icone('image', { taille: 20 })} Mes photos<input type="file" accept="image/*" multiple id="ajout-photos" hidden></label>
        </div>
        <p class="aide" id="aide-pellicule"></p>
      </section>

      <section class="section">
        <h2 class="section-titre">Emplacement</h2>
        <div class="deux">
          <button type="button" class="selecteur" id="choix-pays"></button>
          <button type="button" class="selecteur" id="choix-ville"></button>
        </div>
        <div id="zone-trajet"></div>
        <label class="champ"><span>Adresse</span><input name="adresse" value="${esc(f.adresse)}" placeholder="Rue, quartier"></label>
        <label class="champ"><span>Téléphone</span><input name="telephone" type="tel" value="${esc(f.telephone)}"></label>
        <label class="champ"><span>Lien Google Maps</span><input name="lienMaps" type="url" inputmode="url" value="${esc(f.lienMaps)}" placeholder="maps.app.goo.gl/…"></label>
        <button type="button" class="bouton-secondaire petit-bouton" id="ma-position">${icone('locate-fixed', { taille: 18 })} <span>Ma position</span></button>
        <p class="aide" id="texte-position"></p>
        <div class="autour" id="autour" hidden></div>
      </section>

      <section class="section">
        <h2 class="section-titre">Prix</h2>
        <p class="sous-titre">Budget</p>
        <div class="segments" id="prix">${[1, 2, 3, 4].map((n) => `<button type="button" class="segment" data-prix="${n}">${dollars(n)}</button>`).join('')}</div>
        <p class="sous-titre">Montant</p>
        <div class="montant">
          <input name="montant" type="text" inputmode="decimal" value="${esc(f.montant)}" placeholder="0" aria-label="Montant">
          <span class="montant-devise" id="devise-actuelle"></span>
        </div>
        <div class="puces-devises" id="devises"></div>
        <p class="aide" id="conversion"></p>
        <p class="sous-titre">Confort</p>
        <div class="segments" id="confort">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="segment" data-confort="${n}">${n}★</button>`).join('')}</div>
      </section>

      <section class="section">
        <label class="interrupteur">
          <span><b>${icone('heart', { taille: 18 })} Coup de cœur</b></span>
          <input type="checkbox" name="coupDeCoeur" ${f.coupDeCoeur ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
      </section>

      ${clients.length ? `
      <section class="section section-client">
        <label class="interrupteur">
          <span><b>${icone('send', { taille: 18 })} Pour un client</b></span>
          <input type="checkbox" name="pourClient" ${clientChoisi ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
        <div id="zone-pour-client" ${clientChoisi ? '' : 'hidden'}>
          <button type="button" class="selecteur" id="choix-client"></button>
          <label class="champ"><span>Conseil pour le client</span><textarea name="motClient" rows="2" placeholder="Demande la chambre du 6e">${esc(itemClient?.mot)}</textarea></label>
        </div>
      </section>` : ''}

      <section class="section">
        <h2 class="section-titre">Description</h2>
        <label class="champ"><span>Pour le client</span><textarea name="description" rows="3">${esc(f.description)}</textarea></label>
        <label class="champ champ-prive"><span>${icone('lock', { taille: 15 })} Notes privées</span><textarea name="notes" rows="3">${esc(f.notes)}</textarea></label>
      </section>

      <details class="section" ${nbAutresContacts ? 'open' : ''}>
        <summary>Contacts et visite</summary>
        <label class="champ"><span>Visité le</span><input name="verifieLe" type="date" value="${esc(f.verifieLe)}"></label>
        ${CONTACTS.filter(([k]) => !CONTACTS_RARES.includes(k) || f.contacts[k]).map(([k, lib]) => `<label class="champ"><span>${esc(lib)}</span><input data-contact="${k}" value="${esc(f.contacts[k])}"></label>`).join('')}
      </details>

      <div class="barre-enregistrer">
        <button type="submit" class="bouton-principal">Enregistrer</button>
      </div>
    </form>`;

  const form = app.querySelector('#formulaire');
  const champ = (n) => form.elements[n];

  function majCategorie() {
    const c = TAXONOMIE[f.categorie];
    const b = app.querySelector('#choix-categorie');
    if (!c) {
      b.innerHTML = `<span class="selecteur-icone">${icone('plus', { taille: 22 })}</span><span class="selecteur-texte"><b>Catégorie</b><small>Choisir</small></span><span class="chevron">${icone('chevron-right', { taille: 18 })}</span>`;
      b.style.removeProperty('--c');
      b.classList.add('a-remplir');
    } else {
      b.style.setProperty('--c', c.couleur);
      b.classList.remove('a-remplir');
      b.innerHTML = `<span class="selecteur-icone">${iconeCat(f.categorie, { taille: 22 })}</span><span class="selecteur-texte"><b>${esc([f.type, f.sousType].filter(Boolean).join(' › ') || c.nom)}</b><small>${f.type ? esc(c.nom) : 'Catégorie'}</small></span><span class="chevron chevron-texte">Changer</span>`;
    }
    majTrajet();
  }

  function majLieu() {
    app.querySelector('#choix-pays').innerHTML = `<span class="selecteur-texte"><small>Pays</small><b class="${f.pays ? '' : 'vide-txt'}">${esc(f.pays || 'Choisir')}</b></span><span class="chevron">${icone('chevron-down', { taille: 16 })}</span>`;
    app.querySelector('#choix-ville').innerHTML = `<span class="selecteur-texte"><small>Ville</small><b class="${f.ville ? '' : 'vide-txt'}">${esc(f.ville || 'Choisir')}</b></span><span class="chevron">${icone('chevron-down', { taille: 16 })}</span>`;
  }

  function majTrajet() {
    const zone = app.querySelector('#zone-trajet');
    if (f.categorie !== 'trajets') { zone.innerHTML = ''; return; }
    zone.innerHTML = `
      <div class="trajet-saisie">
        <label class="champ"><span>Départ</span><input name="depart" value="${esc(f.depart)}" placeholder="Gare centrale"></label>
        <label class="champ"><span>Arrivée</span><input name="arrivee" value="${esc(f.arrivee)}" placeholder="Québec"></label>
        <label class="champ"><span>Durée</span><input name="duree" value="${esc(f.duree)}" placeholder="3 h"></label>
      </div>`;
    zone.querySelectorAll('input').forEach((i) => { i.oninput = () => { f[i.name] = i.value; }; });
  }

  function choisirPays(ensuiteVille) {
    choisirDansListe({
      titre: 'Pays',
      valeurs: listePays(),
      choisie: f.pays,
      ajout: true,
      quandChoisi: (p) => {
        if (p !== f.pays) {
          f.pays = p;
          f.ville = '';
          const d = DEVISE_DU_PAYS[p];
          if (d && !champ('montant').value) f.devise = d;
          majDevises();
        }
        majLieu();
        if (ensuiteVille) choisirVille(true);
      },
    });
  }

  function choisirVille(depuisPays) {
    if (!f.pays) { choisirPays(true); return; }
    choisirDansListe({
      titre: `Ville (${f.pays})`,
      valeurs: listeVilles(f.pays),
      choisie: f.ville,
      ajout: true,
      retour: depuisPays,
      quandRetour: () => choisirPays(true),
      quandChoisi: (v) => { f.ville = v; majLieu(); },
    });
  }

  app.querySelector('#choix-categorie').onclick = () => choisirCategorie(f, majCategorie);
  // Nouvel endroit : on commence par la catégorie (elle décide où il va chez le client : hôtel, resto, activité).
  if (!existant && !f.categorie) setTimeout(() => { if (location.hash.startsWith('#/ajouter') && feuille.hidden) { choisirCategorie(f, majCategorie); autourDansFeuille(); } }, 120);
  app.querySelector('#choix-pays').onclick = () => choisirPays(!f.ville);
  app.querySelector('#choix-ville').onclick = () => choisirVille(false);

  form.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.prix) {
      f.prix = f.prix === +b.dataset.prix ? null : +b.dataset.prix;
      majPuces();
    } else if (b.dataset.confort) {
      f.confort = f.confort === +b.dataset.confort ? null : +b.dataset.confort;
      majPuces();
    } else if (b.dataset.retirerPhoto) {
      const cle = b.dataset.retirerPhoto;
      if (f.photos.includes(cle)) { f.photos = f.photos.filter((p) => p !== cle); f.photosRetirees.push(cle); } else f.nouvellesPhotos = f.nouvellesPhotos.filter((p) => p.cle !== cle);
      majPhotos();
    }
  });

  function majPuces() {
    app.querySelectorAll('[data-prix]').forEach((b) => b.classList.toggle('choisi', +b.dataset.prix === f.prix));
    app.querySelectorAll('[data-confort]').forEach((b) => b.classList.toggle('choisi', +b.dataset.confort === f.confort));
  }

  async function majPhotos() {
    const zone = app.querySelector('#photos');
    const existantes = await Promise.all(f.photos.map(async (p) => ({ cle: p, url: await urlPhoto(p) })));
    zone.innerHTML = [...existantes, ...f.nouvellesPhotos].map((p) => `
      <div class="photo"><img src="${esc(p.url)}" alt=""><button type="button" data-retirer-photo="${esc(p.cle)}" aria-label="Retirer">${icone('x', { taille: 16, epaisseur: 2.6 })}</button></div>`).join('');
  }

  function majConversion() {
    const cad = enCAD(champ('montant').value, f.devise);
    app.querySelector('#conversion').textContent = cad != null && f.devise !== 'CAD' ? `≈ ${formatCAD(cad)}` : '';
  }

  // Seulement 3 choix rapides : la monnaie du pays, le dollar américain et le dollar canadien.
  function majDevises() {
    const locale = DEVISE_DU_PAYS[f.pays];
    const rapides = uniques([locale, f.devise, 'USD', 'CAD']);
    app.querySelector('#devise-actuelle').textContent = f.devise || '';
    app.querySelector('#devises').innerHTML = rapides.map((d) => `
      <button type="button" class="puce-devise ${d === f.devise ? 'choisie' : ''}" data-devise-rapide="${d}">
        <b>${d}</b><small>${esc(NOMS_DEVISES[d] || (d === locale ? 'Monnaie locale' : ''))}</small>
      </button>`).join('') + '<button type="button" class="puce-devise autre" data-devise-autre><b>Autre</b><small>Toutes les monnaies</small></button>';
    majConversion();
  }

  function choisirDevise() {
    const favorites = DEVISES_FAVORITES.filter((d) => etat.taux[d]);
    const autres = trierFr(Object.keys(etat.taux).filter((d) => !favorites.includes(d)));
    choisirDansListe({
      titre: 'Monnaie',
      valeurs: [...favorites, ...autres],
      choisie: f.devise,
      etiquette: (d) => `${d}, ${NOMS_DEVISES[d] || d}`,
      placeholder: 'Chercher une monnaie',
      quandChoisi: (d) => { f.devise = d; majDevises(); },
    });
  }

  champ('montant').addEventListener('input', majConversion);
  app.querySelector('#devises').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.deviseRapide) { f.devise = b.dataset.deviseRapide; majDevises(); } else if (b.hasAttribute('data-devise-autre')) choisirDevise();
  });

  // Une photo prise avec l'appareil : on la garde aussi pour la pellicule (proposé à l'enregistrement).
  const peutPellicule = (fichiers) => { try { return !!navigator.canShare?.({ files: fichiers }); } catch (_) { return false; } };
  const ajouterPhotos = async (ev, priseIci) => {
    const fichiers = [...ev.target.files];
    for (const fichier of fichiers) {
      const blob = await compresserPhoto(fichier);
      f.nouvellesPhotos.push({ cle: db.nouvelId(), blob, url: URL.createObjectURL(blob) });
    }
    if (priseIci && pellicule) f.aPellicule.push(...fichiers.filter((x) => peutPellicule([x])));
    ev.target.value = '';
    majPhotos();
    app.querySelector('#aide-pellicule').innerHTML = f.aPellicule.length ? `${icone('download', { taille: 14 })} À l'enregistrement : « Enregistrer ${f.aPellicule.length > 1 ? `les ${f.aPellicule.length} images` : "l'image"} » pour ta pellicule` : '';
  };
  app.querySelector('#prendre-photo').addEventListener('change', (ev) => ajouterPhotos(ev, true));
  app.querySelector('#ajout-photos').addEventListener('change', (ev) => ajouterPhotos(ev, false));

  const lienPosition = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const lienAuto = () => (f.lat ? lienPosition(f.lat, f.lng) : '');

  function afficherPosition() {
    const texte = app.querySelector('#texte-position');
    if (!f.lat) { texte.textContent = ''; return; }
    texte.innerHTML = `${icone('check', { taille: 15 })} Position prise${f.precision ? ` (± ${f.precision} m)` : ''}, <a href="${lienAuto()}" target="_blank" rel="noopener">Voir sur la carte</a>, <button type="button" class="lien" id="retirer-position">Retirer</button>`;
    texte.querySelector('#retirer-position').onclick = () => {
      if (champ('lienMaps').value.trim() === lienAuto()) champ('lienMaps').value = '';
      delete f.lat; delete f.lng; delete f.precision; delete f.positionAuto;
      afficherPosition();
    };
  }

  // auto = true quand on ouvre un nouvel endroit : la position se prend toute seule,
  // parce qu'on est normalement sur place. Le lien Google Maps se remplit avec.
  let chercheEnCours = false;
  function prendrePosition(auto = false) {
    const texte = app.querySelector('#texte-position');
    const bouton = app.querySelector('#ma-position');
    if (!navigator.geolocation) { texte.textContent = 'Position non disponible sur cet appareil.'; return; }
    if (chercheEnCours) return;
    chercheEnCours = true;
    bouton.disabled = true;
    bouton.querySelector('span').textContent = 'Localisation…';
    texte.textContent = '';
    const fini = () => { chercheEnCours = false; if (document.body.contains(bouton)) { bouton.disabled = false; bouton.querySelector('span').textContent = 'Ma position'; } };
    const reussi = (pos) => {
      fini();
      if (!document.body.contains(texte)) return;
      const ancien = lienAuto();
      f.lat = +pos.coords.latitude.toFixed(6);
      f.lng = +pos.coords.longitude.toFixed(6);
      f.precision = Math.round(pos.coords.accuracy);
      f.positionAuto = auto;
      // Le lien se remplit, sauf si tu as collé ton propre lien Google Maps.
      const lien = champ('lienMaps');
      if (!lien.value.trim() || lien.value.trim() === ancien) {
        lien.value = lienAuto();
        lien.classList.remove('vient-remplir'); void lien.offsetWidth; lien.classList.add('vient-remplir');
      }
      afficherPosition();
      if (!auto) toast(`Position prise ✓${f.precision ? ` (± ${f.precision} m)` : ''}`);
      proposerAutour(f.lat, f.lng, f.precision);
    };
    const rate = (err) => {
      fini();
      if (!document.body.contains(texte) || auto) return;
      const msg = err.code === 1
        ? 'Localisation refusée : Réglages > Confidentialité > Service de localisation > Safari.'
        : 'Position introuvable pour le moment.';
      texte.textContent = msg;
      if (!auto) toast(err.code === 1 ? 'Position refusée' : 'Pas de position, réessaie');
    };
    // D'abord le GPS précis ; s'il est trop long (à l'intérieur), une position approximative.
    navigator.geolocation.getCurrentPosition(reussi, (err) => {
      if (err.code === 1) { rate(err); return; }
      navigator.geolocation.getCurrentPosition(reussi, rate, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: auto ? 60000 : 5000 });
  }

  app.querySelector('#ma-position').addEventListener('click', () => prendrePosition(false));

  // « Tu es ici ? » : les vrais endroits autour (OpenStreetMap). Un toucher remplit ce qui est vide.
  let autourCtrl = null;
  async function proposerAutour(lat, lng, precision = 30, nomCherche = '') {
    const zone = app.querySelector('#autour');
    if (!zone || existant || f.categorie === 'trajets') return;
    autourCtrl?.abort();
    autourCtrl = new AbortController();
    zone.hidden = false;
    zone.innerHTML = `<p class="autour-titre">${icone('search', { taille: 14 })} Recherche des endroits autour…</p>`;
    let liste = [];
    try { liste = await autour.endroitsAutour(lat, lng, Math.min(150, Math.max(50, (precision || 30) + 30)), { signal: autourCtrl.signal }); }
    catch (err) { if (err?.name === 'AbortError') return; zone.hidden = true; return; }
    if (!document.body.contains(zone)) return;
    if (!liste.length) { zone.hidden = true; return; }
    const exact = nomCherche && liste.find((e) => sansAccents(e.nom) === sansAccents(nomCherche));
    if (exact) { remplirDepuis(exact); zone.hidden = true; return; }
    zone.innerHTML = `<p class="autour-titre">${icone('map-pin', { taille: 14 })} Tu es ici ?</p>
      <div class="autour-liste">${liste.map((e, k) => `<button type="button" class="autour-choix" data-autour="${k}">${iconeCat(e.categorie, { taille: 16 })}<span><b>${esc(e.nom)}</b><small>${esc([e.sousType || e.type || TAXONOMIE[e.categorie]?.nom, e.distance < 9999 ? `${e.distance} m` : ''].filter(Boolean).join(' · '))}</small></span></button>`).join('')}</div>`;
    zone.querySelectorAll('[data-autour]').forEach((b) => { b.onclick = () => { remplirDepuis(liste[+b.dataset.autour]); zone.hidden = true; }; });
    listeAutour = liste;
    autourDansFeuille();
  }
  // La feuille « Catégorie » est ouverte : on propose aussi en haut de la feuille.
  let listeAutour = [];
  function autourDansFeuille() {
    const zone = app.querySelector('#autour');
    const tuiles = listeAutour.length && !feuille.hidden && !f.categorie && feuille.querySelector('.tuiles');
    if (!zone || !tuiles || feuille.querySelector('.autour')) return;
    const bloc = document.createElement('div');
    bloc.className = 'autour autour-feuille';
    bloc.innerHTML = zone.innerHTML;
    tuiles.before(bloc);
    bloc.querySelectorAll('[data-autour]').forEach((b) => { b.onclick = (ev) => { ev.stopPropagation(); fermerFeuille(); remplirDepuis(listeAutour[+b.dataset.autour]); zone.hidden = true; }; });
  }
  function remplirDepuis(e) {
    const remplis = [];
    const mettre = (el, v) => { if (el && v && !el.value.trim()) { el.value = v; el.classList.remove('vient-remplir'); void el.offsetWidth; el.classList.add('vient-remplir'); remplis.push(el); } };
    mettre(champ('nom'), e.nom);
    mettre(champ('adresse'), e.adresse);
    mettre(champ('telephone'), e.telephone);
    for (const [k, v] of [['site', e.site], ['instagram', e.instagram], ['facebook', e.facebook], ['email', e.email]]) {
      if (!v) continue;
      const el = form.querySelector(`[data-contact="${k}"]`);
      if (el) mettre(el, v); else if (!f.contacts[k]) f.contacts[k] = v;
    }
    if (!f.categorie && e.categorie) {
      f.categorie = e.categorie; f.type = e.type || ''; f.sousType = e.sousType || '';
      if (!feuille.hidden && feuille.querySelector('.tuiles')) fermerFeuille();
      majCategorie();
    }
    // Le lien Google Maps : vers cet endroit précis (nom + adresse), si c'était le lien automatique.
    const lien = champ('lienMaps');
    if (!lien.value.trim() || lien.value.trim() === lienAuto()) {
      lien.value = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.nom, e.adresse].filter(Boolean).join(', '))}`;
    }
    toast(`${esc(e.nom)} : rempli`);
  }
  // Lien Google Maps collé : on lit le nom et la position s'ils y sont.
  champ('lienMaps').addEventListener('change', () => {
    const info = autour.lireLienMaps(champ('lienMaps').value);
    if (info.url && info.url !== champ('lienMaps').value.trim()) champ('lienMaps').value = info.url;
    if (info.nom && !champ('nom').value.trim()) { champ('nom').value = info.nom; champ('nom').classList.add('vient-remplir'); }
    if (info.lat) { f.lat = info.lat; f.lng = info.lng; f.precision = 20; afficherPosition(); }
    const lat = info.lat ?? f.lat; const lng = info.lng ?? f.lng;
    if (lat) proposerAutour(lat, lng, 40, info.nom || champ('nom').value.trim());
  });

  // Le client choisi (seulement si « Pour un client » est coché).
  function majClient() {
    const b = app.querySelector('#choix-client');
    if (!b) return;
    b.classList.toggle('a-remplir', !clientChoisi);
    b.innerHTML = `<span class="selecteur-texte"><small>Client</small><b class="${clientChoisi ? '' : 'vide-txt'}">${esc(clientChoisi ? nomClient(clientChoisi) : 'Choisir le client')}</b></span><span class="chevron ${clientChoisi ? 'chevron-texte' : ''}">${clientChoisi ? 'Changer' : icone('chevron-down', { taille: 16 })}</span>`;
  }
  const ouvrirChoixClient = () => choisirClient(clients, clientChoisi?.id, (c) => { clientChoisi = c; majClient(); });
  if (clients.length) {
    champ('pourClient').addEventListener('change', () => {
      const oui = champ('pourClient').checked;
      app.querySelector('#zone-pour-client').hidden = !oui;
      if (!oui) return;
      // Un seul client en cours : il est choisi. Sinon, le dernier choisi, ou la liste s'ouvre.
      if (!clientChoisi) clientChoisi = clients.length === 1 ? clients[0] : clients.find((c) => c.id === dernierClient) || null;
      majClient();
      if (!clientChoisi) ouvrirChoixClient();
    });
    app.querySelector('#choix-client').onclick = ouvrirChoixClient;
    majClient();
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!f.categorie) { toast('Choisis une catégorie'); choisirCategorie(f, majCategorie); return; }
    if (!champ('nom').value.trim()) { toast("Écris le nom de l'endroit"); champ('nom').focus(); return; }
    const pourClient = clients.length && champ('pourClient').checked ? clientChoisi : null;
    if (clients.length && champ('pourClient').checked && !pourClient) { toast('Choisis le client'); ouvrirChoixClient(); return; }
    // Les photos prises ici : le téléphone propose de les enregistrer dans la pellicule (une touche).
    if (f.aPellicule.length) {
      const aGarder = f.aPellicule;
      f.aPellicule = [];
      try { navigator.share({ files: aGarder }).catch(() => {}); } catch (_) { /* pas possible sur cet appareil */ }
    }
    const bouton = form.querySelector('[type=submit]');
    bouton.disabled = true;

    for (const n of ['nom', 'adresse', 'telephone', 'lienMaps', 'description', 'montant', 'notes', 'verifieLe']) f[n] = champ(n).value.trim();
    f.montant = f.montant.replace(',', '.');
    f.coupDeCoeur = champ('coupDeCoeur').checked;
    form.querySelectorAll('[data-contact]').forEach((i) => { f.contacts[i.dataset.contact] = i.value.trim(); });
    for (const k of Object.keys(f.contacts)) if (!f.contacts[k]) delete f.contacts[k];
    if (f.categorie !== 'trajets') { delete f.depart; delete f.arrivee; delete f.duree; }

    for (const p of f.nouvellesPhotos) { await db.ecrire('photos', { id: p.cle, blob: p.blob }); f.photos.push(p.cle); }
    for (const p of f.photosRetirees) await db.effacer('photos', p);

    const { nouvellesPhotos, photosRetirees, aPellicule, ...endroit } = f;
    const maintenant = new Date().toISOString();
    endroit.creeLe = endroit.creeLe || maintenant;
    endroit.modifieLe = maintenant;
    await db.ecrire('endroits', endroit);
    etat.endroits = etat.endroits.filter((x) => x.id !== endroit.id).concat(endroit);
    // Part tout seul vers le Studio (ou dès que le téléphone retrouve internet).
    sync.marquer(sync.cheminEndroit(endroit), nouvellesPhotos.map((p) => sync.cheminPhoto(p.cle)), photosRetirees.map(sync.cheminPhoto));
    await db.ecrireReglage('dernierLieu', { pays: endroit.pays, ville: endroit.ville, devise: endroit.devise });
    db.demanderStockagePersistant();
    let envoyeAuClient = false;
    // Changé de client, ou décoché : on le retire de l'ancien (s'il n'est pas déjà parti chez lui).
    if (clientDepart && clientDepart.id !== pourClient?.id) {
      const c = await db.lire('carnets', clientDepart.id);
      c.items = c.items.filter((i) => i.endroitId !== endroit.id || estEnvoye(i));
      await carnets.enregistrer(c);
    }
    if (pourClient) {
      const c = await db.lire('carnets', pourClient.id);
      const dans = c.items.some((i) => i.endroitId === endroit.id);
      const item = carnets.ajouterItem(c, endroit.id, champ('motClient').value.trim());
      if (dans) item.mot = champ('motClient').value.trim();
      envoyeAuClient = !dans;
      await carnets.enregistrer(c);
      await db.ecrireReglage('dernierClient', c.id);
    }
    // Un endroit déjà dans le carnet d'un client : son carnet se met à jour (photos, textes).
    for (const c of await db.tous('carnets')) if (c.id !== pourClient?.id && c.items.some((i) => i.endroitId === endroit.id)) carnets.publierBientot(c.id);
    toast(envoyeAuClient ? `Enregistré, prévu pour ${pourClient.client?.prenom || 'le client'}` : existant ? 'Modifications enregistrées' : 'Endroit ajouté');
    revenir(existant ? `#/endroit/${endroit.id}` : '#/');
  });

  majCategorie();
  majLieu();
  majPuces();
  majPhotos();
  majDevises();
  afficherPosition();
  if (f.lat && !champ('lienMaps').value.trim()) champ('lienMaps').value = lienAuto();
  // Nouvel endroit (sauf un trajet) : position GPS prise automatiquement.
  if (!existant && !f.lat && f.categorie !== 'trajets') prendrePosition(true);
}


// ---------- Anciens liens clients ----------
// Les premiers liens ressemblaient à index.html#/voyage/<carnet>/<clé>. Le voyage du client a maintenant
// sa propre petite appli (carnet.html) : on l'y envoie, sans rien garder dans l'appli de Raph.
function pageMonVoyage(id, cle) {
  if (id && cle) location.replace(`carnet.html?c=${id}#${cle}`);
  else aller('#/');
}

// ---------- Voyages sur mesure : le carnet en direct du client ----------
// Raph repère sur place pour un client. Chaque endroit envoyé au client part dans son carnet,
// et lui est livré tous les soirs à la même heure (19 h par défaut), avec un petit mot écrit tout seul.


function etatPublication(c) {
  const p = c.publication || {};
  if (p.erreur === 'hors-ligne') return { classe: 'attente', texte: 'Hors ligne' };
  if (p.erreur) return { classe: 'erreur', texte: /Branche|brancher/i.test(p.erreur) ? 'Pas en ligne : brancher le Studio (Réglages)' : p.erreur };
  if (p.publieLe) return { classe: 'ok', texte: 'En ligne' };
  return { classe: 'attente', texte: 'Mise en ligne…' };
}
const enAttente = (c) => c.items.filter((i) => !estEnvoye(i));
const livres = (c) => c.items.filter((i) => estEnvoye(i));
const nbChoix = (c) => choixRetenus(c).filter((r) => r.itemId !== 'aucun').length;
const depuis = (iso) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 2) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
};

async function pageClients(onglet = 'clients') {
  const tous = (await db.tous('carnets')).sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
  const actif = await db.lireReglage('carnetActif', null);
  const liens = await liensDemande.tousLesLiens();
  const nouvelles = liens.filter((l) => (l.code && !l.carnetId && !l.vu) || aRelancer(l)).length;
  const surDemandes = onglet === 'demandes';
  app.innerHTML = `
    <header class="entete-page entete-clients">
      <h1>Clients</h1>
      <span class="entete-actions">
        <button type="button" class="lien-exemple" id="selectionner" hidden>Tout</button>
        <button type="button" class="rond rond-accent" id="nouveau" aria-label="${surDemandes ? 'Nouveau lien de demande' : 'Nouveau client'}">${icone('plus', { taille: 22, epaisseur: 2.2 })}</button>
      </span>
    </header>
    <div class="onglets-page" role="tablist">
      <a href="#/clients" role="tab" class="${surDemandes ? '' : 'choisi'}" data-onglet>Clients</a>
      <a href="#/demandes" role="tab" class="${surDemandes ? 'choisi' : ''}" data-onglet>Demandes${nouvelles ? `<i>${nouvelles}</i>` : ''}</a>
    </div>
    <div id="zone-onglet"></div>`;
  app.querySelectorAll('[data-onglet]').forEach((a) => { a.onclick = (ev) => { ev.preventDefault(); location.replace(a.getAttribute('href')); }; });
  const zone = app.querySelector('#zone-onglet');
  liensDemande.relever().then((r) => {
    if (!r.length || !document.body.contains(zone)) return;
    toast(r.length > 1 ? `${r.length} nouvelles demandes` : `Nouvelle demande : ${r[0].nom || r[0].client}`);
    pageClients(onglet);
  });
  if (surDemandes) return ongletDemandes(zone, liens);

  // ----- Onglet Clients -----
  const sousTitre = (c) => [c.ville, nbChoix(c) ? plur(nbChoix(c), 'choix', 'choix') : ''].filter(Boolean).join(' · ');
  zone.innerHTML = tous.length ? `
    <ul class="carnets" id="carnets">
      ${tous.map((c) => `
        <li><a class="carnet-ligne" href="#/carnet/${esc(c.id)}" data-id="${esc(c.id)}">
          <span class="coche-rond" aria-hidden="true">${icone('check', { taille: 16, epaisseur: 3 })}</span>
          <span class="carnet-avatar">${esc((c.client?.nom || c.client?.prenom || '').charAt(0).toUpperCase()) || icone('user', { taille: 20 })}</span>
          <span class="carnet-txt">
            <b>${esc(c.client?.nom || c.client?.prenom || 'Nouveau client')}</b>
            ${sousTitre(c) ? `<small>${esc(sousTitre(c))}</small>` : ''}
          </span>
          ${c.id === actif && c.actif ? '<span class="pastille-direct">En repérage</span>' : !c.actif ? '<span class="pastille-fini">Terminé</span>' : ''}
          ${icone('chevron-right', { taille: 18 })}
        </a></li>`).join('')}
    </ul>
    <div class="barre-selection" id="barre-selection" hidden>
      <button type="button" class="bouton-secondaire" id="sel-annuler">Annuler</button>
      <button type="button" class="bouton-danger plein" id="sel-supprimer" disabled>${icone('trash-2', { taille: 18 })} <span>Supprimer</span></button>
    </div>`
    : `<div class="vide">${`<span class="vide-icone">${icone('users', { taille: 28 })}</span>`}<b>Aucun client</b><button type="button" class="bouton-principal bouton-vide" id="nouveau-vide">${icone('plus', { taille: 18 })} Nouveau client</button></div>`;

  const nouveauClient = async () => {
    const dernier = await db.lireReglage('dernierLieu', {});
    const c = carnets.nouveauCarnet({ ville: dernier.ville || '', pays: dernier.pays || etat.region.pays || '' });
    await db.ecrire('carnets', c);
    await db.ecrireReglage('carnetActif', c.id);
    sync.marquer(sync.cheminCarnet(c.id));
    aller(`#/carnet/${c.id}`);
  };
  app.querySelector('#nouveau').onclick = nouveauClient;
  const vide = zone.querySelector('#nouveau-vide');
  if (vide) vide.onclick = nouveauClient;
  if (!tous.length) return;

  // Appui long sur un client : son menu. « Sélectionner plusieurs » : en supprimer plusieurs d'un coup.
  const ul = zone.querySelector('#carnets');
  let selection = null;
  const bsel = app.querySelector('#selectionner');
  const majSelection = () => {
    const actifSel = !!selection;
    ul.classList.toggle('en-selection', actifSel);
    zone.querySelector('#barre-selection').hidden = !actifSel;
    document.body.classList.toggle('mode-selection', actifSel);
    app.querySelector('#nouveau').hidden = actifSel;
    bsel.hidden = !actifSel;
    ul.querySelectorAll('.carnet-ligne').forEach((a) => a.classList.toggle('coche', actifSel && selection.has(a.dataset.id)));
    const n = selection?.size || 0;
    const bs = zone.querySelector('#sel-supprimer');
    bs.disabled = !n;
    bs.querySelector('span').textContent = n ? `Supprimer (${n})` : 'Supprimer';
    bsel.textContent = n === tous.length ? 'Aucun' : 'Tout';
  };
  const entrerSelection = (id) => { selection = new Set(id ? [id] : []); majSelection(); };
  ul.addEventListener('click', (ev) => {
    const a = ev.target.closest('.carnet-ligne');
    if (!a || !selection) return;
    ev.preventDefault();
    if (selection.has(a.dataset.id)) selection.delete(a.dataset.id); else selection.add(a.dataset.id);
    majSelection();
  });
  bsel.onclick = () => { selection = selection.size === tous.length ? new Set() : new Set(tous.map((c) => c.id)); majSelection(); };
  zone.querySelector('#sel-annuler').onclick = () => { selection = null; majSelection(); };
  zone.querySelector('#sel-supprimer').onclick = () => {
    const n = selection.size;
    if (!n) return;
    ouvrirFeuille(`${enteteFeuille(`Supprimer ${plur(n, 'client')} ?`)}
      <div class="feuille-corps">
        <p class="petit">Leur page ne s'ouvrira plus.</p>
        <button type="button" class="bouton-danger plein" data-action="oui">${icone('trash-2', { taille: 18 })} Supprimer</button>
      </div>`, async (e2) => {
      if (!e2.target.closest('[data-action=oui]')) return;
      for (const c of tous.filter((x) => selection.has(x.id))) await effacerCarnet(c);
      fermerFeuille();
      document.body.classList.remove('mode-selection');
      toast(n > 1 ? `${n} clients supprimés` : 'Client supprimé');
      pageClients();
    });
  };
  appuiLong(ul, '.carnet-ligne', (a) => {
    if (selection) return;
    const c = tous.find((x) => x.id === a.dataset.id);
    if (!c) return;
    const nom = c.client?.nom || c.client?.prenom || 'Nouveau client';
    ouvrirFeuille(`${enteteFeuille(esc(nom))}
      <ul class="liste-choix">
        ${ligneMenu('ouvrir', 'user', 'Ouvrir')}
        ${c.actif && c.id !== actif ? ligneMenu('reperage', 'map-pin', 'Mettre en repérage') : ''}
        ${ligneMenu('fini', c.actif ? 'circle-check-big' : 'refresh-cw', c.actif ? 'Marquer terminé' : 'Remettre en cours')}
        ${ligneMenu('selection', 'list', 'Sélectionner plusieurs')}
        ${ligneMenu('supprimer', 'trash-2', 'Supprimer', 'ligne-danger')}
      </ul>
      ${confirmerHtml(`Supprimer « ${esc(nom)} » ?`, 'Sa page ne s’ouvrira plus.', 'Supprimer')}`, async (ev) => {
      const b = ev.target.closest('[data-action]');
      if (!b) return;
      const act = b.dataset.action;
      if (act === 'ouvrir') { fermerFeuille(); aller(`#/carnet/${c.id}`); }
      else if (act === 'reperage') { await db.ecrireReglage('carnetActif', c.id); fermerFeuille(); toast(`${c.client?.prenom || 'Client'} en repérage`); pageClients(); }
      else if (act === 'fini') { c.actif = !c.actif; c.modifieLe = new Date().toISOString(); await db.ecrire('carnets', c); sync.marquer(sync.cheminCarnet(c.id)); fermerFeuille(); toast(c.actif ? 'Remis en cours' : 'Marqué terminé'); pageClients(); }
      else if (act === 'selection') { fermerFeuille(); entrerSelection(c.id); }
      else if (act === 'supprimer') montrerConfirmer(b);
      else if (act === 'non') cacherConfirmer();
      else if (act === 'oui') { await effacerCarnet(c); fermerFeuille(); toast('Client supprimé'); pageClients(); }
    });
  });
}

// Petits morceaux communs des menus (appui long).
const ligneMenu = (action, ico, texte, classe = '') => `<li><button type="button" class="ligne ligne-menu ${classe}" data-action="${action}">${icone(ico, { taille: 20 })}<span>${texte}</span></button></li>`;
const confirmerHtml = (question, detail, oui) => `
  <div class="confirmer" id="menu-confirmer" hidden>
    <p><b>${question}</b>${detail ? `<span>${detail}</span>` : ''}</p>
    <button type="button" class="bouton-danger plein" data-action="oui">${oui}</button>
    <button type="button" class="bouton-secondaire" data-action="non">Annuler</button>
  </div>`;
function montrerConfirmer(b) { b.closest('ul').hidden = true; feuille.querySelector('#menu-confirmer').hidden = false; }
function cacherConfirmer() { feuille.querySelector('.liste-choix').hidden = false; feuille.querySelector('#menu-confirmer').hidden = true; }

// ----- Onglet Demandes : les formulaires envoyés et les demandes reçues -----
const SOURCES = { instagram: 'Instagram', facebook: 'Facebook', bouche: 'Bouche à oreille', google: 'Google', courriel: 'Courriel ou appel', autre: 'Autre' };
// Relance après 3 jours sans nouvelles : la demande reçue qu'on a contactée, ou le lien jamais rempli.
const JOURS_RELANCE = 3;
const depuisJours = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : 0);
const aRelancer = (l) => !l.carnetId && (l.code ? Boolean(l.contacteLe) && depuisJours(l.relanceLe || l.contacteLe) >= JOURS_RELANCE : depuisJours(l.relanceLe || l.creeLe) >= JOURS_RELANCE);
function etatLien(l) {
  if (l.carnetId) return ['client', 'Client'];
  if (aRelancer(l)) return ['relance', 'À relancer'];
  if (l.code && !l.contacteLe) return ['recue', l.vu ? 'À répondre' : 'Nouvelle'];
  if (l.code) return ['attente', 'Contacté'];
  return ['attente', 'Envoyé'];
}
// Ce qui demande une action passe en premier.
const rangLien = (l) => { const k = etatLien(l)[0]; return k === 'recue' ? 0 : k === 'relance' ? 1 : k === 'attente' ? 2 : 3; };
async function ongletDemandes(zone, liens) {
  liens = [...liens].sort((a, b) => rangLien(a) - rangLien(b));
  zone.innerHTML = liens.length ? `
    <ul class="liste-demandes" id="liste-liens">
      ${liens.map((l) => { const [cl, txt] = etatLien(l); return `
        <li><a class="ligne-demande" href="#/demande/${esc(l.id)}" data-id="${esc(l.id)}">
          <span class="carnet-avatar ${l.code ? '' : 'avatar-pale'}">${l.code ? esc((l.nom || l.client || '?').charAt(0).toUpperCase()) : icone('send', { taille: 18 })}</span>
          <span class="carnet-txt"><b>${esc(l.nom || l.client || 'Sans nom')}</b><small>${esc(new Date(l.recuLe || l.creeLe).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }))}${l.source === 'public' ? ' · site' : ''}${l.suspect ? ' · à vérifier' : ''}</small></span>
          <span class="etat-lien ${cl}">${txt}</span>
          ${icone('chevron-right', { taille: 18 })}
        </a></li>`; }).join('')}
    </ul>`
    : `<div class="vide"><span class="vide-icone">${icone('inbox', { taille: 28 })}</span><b>Aucune demande</b><button type="button" class="bouton-principal bouton-vide" id="nouveau-vide">${icone('plus', { taille: 18 })} Nouveau lien</button></div>`;
  const nouveau = () => feuilleNouveauLien(() => pageClients('demandes'));
  app.querySelector('#nouveau').onclick = nouveau;
  const vide = zone.querySelector('#nouveau-vide');
  if (vide) vide.onclick = nouveau;
  // Appui long sur une demande : la voir ou l'effacer.
  const ul = zone.querySelector('#liste-liens');
  if (!ul) return;
  appuiLong(ul, 'a.ligne-demande', async (a) => {
    const l = await db.lire('liens', a.dataset.id);
    if (!l) return;
    ouvrirFeuille(`${enteteFeuille(esc(l.nom || l.client || 'Demande'))}
      <ul class="liste-choix">
        ${l.code ? ligneMenu('voir', 'inbox', 'Ouvrir la demande') : ''}
        ${ligneMenu('effacer', 'trash-2', 'Supprimer', 'ligne-danger')}
      </ul>
      ${confirmerHtml('Supprimer cette demande ?', l.code ? '' : 'Le lien ne marchera plus.', 'Supprimer')}`, async (ev) => {
      const b = ev.target.closest('[data-action]');
      if (!b) return;
      if (b.dataset.action === 'voir') { fermerFeuille(); aller(`#/demande/${l.id}`); }
      else if (b.dataset.action === 'effacer') montrerConfirmer(b);
      else if (b.dataset.action === 'non') cacherConfirmer();
      else if (b.dataset.action === 'oui') { await liensDemande.oublierLien(l.id); fermerFeuille(); toast('Demande supprimée'); pageClients('demandes'); }
    });
  });
}

// Nouveau lien de formulaire : un lien unique par client (Copier ou Envoyer), ou le lien public.
function feuilleNouveauLien(apres) {
  ouvrirFeuille(`${enteteFeuille('Formulaire de demande')}
    <div class="feuille-corps">
      <label class="champ"><span>Nom du client</span><input id="fiche-nom" placeholder="Marie Tremblay" autocapitalize="words" autocomplete="off" enterkeyhint="done"></label>
      <div class="deux">
        <button type="button" class="bouton-principal" data-action="copier">${icone('copy', { taille: 17 })} Copier le lien</button>
        <button type="button" class="bouton-secondaire" data-action="envoyer">${icone('send', { taille: 17 })} Envoyer</button>
      </div>
      <ul class="liste-choix liste-sobre">
        ${ligneMenu('public', 'link', 'Copier le lien public')}
        <li><a class="ligne ligne-menu" href="demande.html?apercu">${icone('eye', { taille: 20 })}<span>Aperçu du formulaire</span></a></li>
      </ul>
    </div>`, async (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b) return;
    const courriel = await db.lireReglage('courrielFiche', '');
    const tel = await db.lireReglage('telFiche', '');
    if (b.dataset.action === 'public') {
      const url = new URL('demande.html', location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Lien public copié'); } catch (_) { window.prompt('Copie ce lien :', url); }
      return;
    }
    // Le lien est préparé tout de suite : le téléphone permet de copier seulement juste après le toucher.
    const { lien, url } = liensDemande.preparerLien(location.href, { client: feuille.querySelector('#fiche-nom').value, pour: courriel, tel });
    if (b.dataset.action === 'copier') {
      try { await navigator.clipboard.writeText(url); toast(`Lien copié${lien.client ? ` pour ${lien.client}` : ''}`); } catch (_) { window.prompt('Copie ce lien :', url); }
    } else {
      try {
        if (navigator.share) await navigator.share({ title: 'Votre voyage sur mesure', url });
        else { await navigator.clipboard.writeText(url); toast('Lien copié'); }
      } catch (_) { return; /* annulé : le lien n'est pas gardé */ }
    }
    await liensDemande.garderLien(lien);
    fermerFeuille();
    apres();
  });
}

// ---------- Une demande reçue (formulaire rempli par le client) ----------
const NOM_STYLE = { eco: 'Économique', moyen: 'Confort', luxe: 'Luxe' };
const plur = (n, mot, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
const jolieDate = (s, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('fr-CA', opts) : '');

async function effacerCarnet(c) {
  await db.effacer('carnets', c.id);
  if ((await db.lireReglage('carnetActif', null)) === c.id) await db.ecrireReglage('carnetActif', null);
  sync.marquer(sync.cheminCarnet(c.id));
}

// Crée le client (son carnet) à partir de sa demande. Le Studio relie tout seul le carnet et le voyage (même prénom).
async function clientDepuisDemande(lien, d) {
  const nom = (d.nom || lien.nom || lien.client || '').trim();
  const c = carnets.nouveauCarnet({ prenom: nom.split(/\s+/)[0] || '', pays: d.pays?.[0]?.nom || '' });
  c.client.nom = nom;
  if (d.telephone) c.client.tel = d.telephone;
  if (d.courriel) c.client.courriel = d.courriel;
  c.lienId = lien.id;
  await db.ecrire('carnets', c);
  sync.marquer(sync.cheminCarnet(c.id));
  const frais = (await db.lire('liens', lien.id)) || lien;
  frais.carnetId = c.id;
  frais.modifieLe = new Date().toISOString();
  await db.ecrire('liens', frais);
  sync.marquer(sync.cheminLien(frais.id));
  return c;
}

async function pageDemande(lienId) {
  const lien = await db.lire('liens', lienId);
  if (!lien) return location.replace('#/demandes');
  if (lien.code && !lien.vu) { lien.vu = true; await db.ecrire('liens', lien); }
  const retour = `<a class="rond" href="#/demandes" data-retour-page aria-label="Retour">${icone('chevron-left')}</a>`;
  if (!lien.code) {
    app.innerHTML = `<header class="entete-form">${retour}<h1>${esc(lien.client || 'Demande')}</h1><span class="rond vide-rond"></span></header>
      <div class="vide-demande">${icone('hourglass', { taille: 30 })}<b>Pas encore remplie</b><span>Le lien a été envoyé le ${esc(new Date(lien.creeLe).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }))}.</span>
        <button type="button" class="bouton-principal bouton-vide" id="rappel-fiche">${icone('send', { taille: 18 })} Envoyer un rappel</button></div>`;
    app.querySelector('#rappel-fiche').onclick = async () => {
      const url = liensDemande.urlLien(location.href, lien);
      const texte = messageRappelFiche({ nom: lien.client, url, signe: (await db.lireReglage('nomFiche', '')) || undefined });
      try {
        if (navigator.share) await navigator.share({ text: texte });
        else { await navigator.clipboard.writeText(texte); toast('Rappel copié'); }
      } catch (err) { if (err?.name === 'AbortError') return; try { await navigator.clipboard.writeText(texte); toast('Rappel copié'); } catch (_) { return; } }
      lien.relanceLe = new Date().toISOString(); await liensDemande.garderLien(lien);
    };
    return;
  }
  let d;
  try { d = await decoder(lien.code); } catch (_) {
    app.innerHTML = `<header class="entete-form">${retour}<h1>Demande</h1><span class="rond vide-rond"></span></header><div class="vide-demande">${icone('triangle-alert', { taille: 30 })}<b>Demande illisible</b><span>Ouvre-la dans le Studio.</span></div>`;
    return;
  }
  const tous = await db.tous('carnets');
  const client = tous.find((c) => c.id === lien.carnetId) || tous.find((c) => c.lienId === lien.id);
  const jours = d.mode === 'total' ? d.duree || 0 : (d.pays || []).reduce((n, p) => n + nuitsEntre(p.debut, p.fin), 0);
  const voyageurs = d.adultes != null
    ? [plur(d.adultes, 'adulte'), d.enfants ? `${plur(d.enfants, 'enfant')}${d.agesEnfants?.trim() ? ` (${d.agesEnfants.trim()})` : ''}` : ''].filter(Boolean).join(', ')
    : plur(d.voyageurs || 1, 'voyageur');
  const destination = d.pays?.length ? d.pays.map((p) => p.nom).join(' → ') : d.regions?.length ? `À décider (${d.regions.join(', ')})` : 'À décider';
  const depart = d.depart ? jolieDate(d.depart) : d.mois ? new Date(`${d.mois}-15T12:00:00`).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) : 'À préciser';
  const envies = ENVIES.filter(([k]) => d.envies?.[k]);
  const incontournables = [d.incontournable?.trim(), ...(d.pays || []).filter((p) => p.incontournable?.trim()).map((p) => `${p.nom} : ${p.incontournable.trim()}`)].filter(Boolean);
  const tel = (d.telephone || '').replace(/[^\d+]/g, '');
  const info = (ico, etiquette, valeur) => `<li>${icone(ico, { taille: 19 })}<div><span class="etiquette">${etiquette}</span><b>${esc(valeur)}</b></div></li>`;
  // Réponse rapide déjà écrite : proposer un appel de 15 minutes.
  const signe = (await db.lireReglage('nomFiche', '')) || undefined;
  const relancer = !client && aRelancer(lien);
  const reponse = relancer ? messageRelance({ nom: d.nom, langue: d.langue, signe }) : messageAppel({ nom: d.nom, langue: d.langue, signe });

  app.innerHTML = `
    <header class="entete-form">${retour}<h1>Demande</h1><span class="rond vide-rond"></span></header>
    <article class="demande-recue">
      <div class="demande-tete">
        <span class="carnet-avatar grand">${esc((d.nom || '?').charAt(0).toUpperCase())}</span>
        <div><h2>${esc(d.nom || 'Sans nom')}</h2><small>Reçue le ${esc(new Date(lien.recuLe || d.envoyeLe || lien.modifieLe).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' }))}${lien.suspect ? ' · à vérifier' : ''}${d.langue === 'en' ? ' · en anglais' : ''}</small></div>
      </div>
      ${relancer ? `<p class="bandeau-relance">${icone('clock', { taille: 17 })}<span>Sans nouvelles depuis ${Math.floor(depuisJours(lien.relanceLe || lien.contacteLe))} jours</span></p>` : ''}
      ${tel || d.courriel ? `<div class="actions" id="actions-demande">
        ${tel ? `<a class="action" href="tel:${esc(tel)}"><span>${icone('phone')}</span>Appeler</a><a class="action" href="${esc(lienTexto(tel, reponse))}"><span>${icone('message-circle')}</span>Texto</a>` : ''}
        ${d.courriel ? `<a class="action" href="${esc(lienCourriel(d.courriel, d.langue, reponse))}"><span>${icone('mail')}</span>Courriel</a>` : ''}
      </div>` : ''}
      <section class="bloc-fiche">
        <h2>Le voyage</h2>
        <ul class="details">
          ${info('map-pin', 'Destination', destination)}
          ${d.mode !== 'total' && d.pays?.length ? d.pays.map((p) => info('calendar', p.nom, `${jolieDate(p.debut, { day: 'numeric', month: 'short' })} → ${jolieDate(p.fin, { day: 'numeric', month: 'short', year: 'numeric' })} · ${plur(nuitsEntre(p.debut, p.fin), 'nuit')}`)).join('') : info('calendar', 'Départ', depart)}
          ${info('clock', 'Durée', jours ? plur(jours, 'jour') : 'À décider')}
          ${info('users', 'Voyageurs', voyageurs)}
          ${d.style ? info('gem', 'Style', NOM_STYLE[d.style] || d.style) : ''}
          ${d.repartition?.trim() ? info('route', 'Répartition', d.repartition.trim()) : ''}
          ${d.source ? info('megaphone', 'Nous a connus par', d.source === 'autre' && d.sourceAutre?.trim() ? d.sourceAutre.trim() : (SOURCES[d.source] || d.source)) : ''}
        </ul>
      </section>
      ${envies.length ? `<section class="bloc-fiche"><h2>Ses envies</h2><ul class="envies-tel">
        ${envies.map(([k, nom, ico]) => `<li>${icone(ico, { taille: 18 })}<div><b>${esc(nom)}</b>${d.idees?.[k]?.length ? `<small>${d.idees[k].map(esc).join(' · ')}</small>` : ''}</div><em>× ${d.envies[k]}</em></li>`).join('')}
      </ul></section>` : ''}
      ${incontournables.length ? `<section class="bloc-fiche"><h2>À voir absolument</h2>${incontournables.map((t) => `<p class="texte">${esc(t)}</p>`).join('')}</section>` : ''}
      ${d.message?.trim() ? `<section class="bloc-fiche"><h2>Son message</h2><p class="texte">${esc(d.message.trim())}</p></section>` : ''}
      ${d.courriel || d.telephone ? `<section class="bloc-fiche"><h2>Coordonnées</h2><ul class="details">
        ${d.courriel ? `<li>${icone('mail', { taille: 19 })}<div><span class="etiquette">Courriel</span><a href="mailto:${esc(d.courriel)}">${esc(d.courriel)}</a></div></li>` : ''}
        ${d.telephone ? `<li>${icone('phone', { taille: 19 })}<div><span class="etiquette">Téléphone</span><a href="tel:${esc(tel)}">${esc(d.telephone)}</a></div></li>` : ''}
      </ul></section>` : ''}
    </article>
    <div class="barre-enregistrer barre-demande">
      ${client ? `<a class="bouton-principal" href="#/carnet/${esc(client.id)}">${icone('user-check', { taille: 19 })} Ouvrir ${esc(client.client?.prenom || 'le client')}</a>`
        : `<button class="bouton-principal" id="creer-client">${icone('user-plus', { taille: 19 })} Ajouter comme client</button>`}
    </div>`;
  // Un appel, un texto ou un courriel : on note la date, pour savoir quand relancer.
  app.querySelector('#actions-demande')?.addEventListener('click', async (ev) => {
    if (!ev.target.closest('a.action')) return;
    const maintenant = new Date().toISOString();
    if (relancer || lien.contacteLe) lien.relanceLe = maintenant; else lien.contacteLe = maintenant;
    lien.modifieLe = maintenant;
    await liensDemande.garderLien(lien);
  });
  const b = app.querySelector('#creer-client');
  if (b) b.onclick = async () => {
    b.disabled = true;
    const c = await clientDepuisDemande(lien, d);
    toast(`${c.client.prenom || 'Client'} ajouté ✓`);
    aller(`#/carnet/${c.id}`);
  };
}

function ligneItem(c, i, endroit, { attente }) {
  const choisi = choixRetenus(c).some((r) => r.itemId === i.id);
  return `
    <li class="item-carnet">
      <a class="item-vignette" ${endroit.essai ? '' : `href="#/endroit/${esc(endroit.id)}"`}>${endroit.photos?.length ? `<img data-photo="${esc(endroit.photos[0])}" alt="">` : iconeCat(endroit.categorie, { taille: 22 })}</a>
      <div class="item-txt">
        <b>${esc(endroit.nom)}</b>
        <small>${esc(endroit.sousType || endroit.type || TAXONOMIE[endroit.categorie]?.nom || '')}${choisi ? ` · <span class="choisi-client">${icone('check', { taille: 12 })} son choix</span>` : ''}</small>
        <button type="button" class="lien item-mot" data-mot="${esc(i.id)}">${i.mot ? `« ${esc(i.mot)} »` : '+ Conseil'}</button>
      </div>
      <div class="item-actions">
        ${attente ? `<button type="button" class="petit-rond" data-livrer="${esc(i.id)}" aria-label="Livrer tout de suite" title="Livrer tout de suite">${icone('send', { taille: 16 })}</button>` : ''}
        <button type="button" class="petit-rond" data-retirer="${esc(i.id)}" aria-label="Retirer du carnet" title="Retirer du carnet">${icone('x', { taille: 16 })}</button>
      </div>
    </li>`;
}

async function pageCarnet(id, sous) {
  let c = await db.lire('carnets', id);
  if (!c) return location.replace('#/clients');
  const actifId = await db.lireReglage('carnetActif', null);
  const prenom = c.client?.prenom || 'ton client';
  const lienClient = carnets.lien(c);
  const parId = essai.avecEssai(etat.endroits);
  const faits = c.items.filter((i) => parId.has(i.endroitId) && estEnvoye(i));
  const enEssai = essai.essaiEnCours(c, estEnvoye);
  const soirs = [...new Set(faits.map((i) => i.livraison))].sort().reverse();
  const pub = etatPublication(c);
  const ch = c.choix || {};
  const reglagesOuverts = sous === 'reglages' || !c.client?.prenom;
  const aAjouter = aVenir.endroitsAAjouter(c, parId);
  const telDefaut = await db.lireReglage('telFiche', '');

  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="#/clients" data-retour-page aria-label="Retour">${icone('chevron-left')}</a>
      <h1>${esc(c.client?.nom || c.client?.prenom || 'Nouveau client')}</h1>
      <button type="button" class="rond rond-supprimer" id="supprimer-haut" aria-label="Supprimer ce client" title="Supprimer ce client">${icone('trash-2', { taille: 19 })}</button>
    </header>

    <section class="carnet-entete">
      <p class="carnet-sur">${icone('map-pin', { taille: 15 })} ${esc(c.ville || c.pays || 'Ville')}<span class="pub ${pub.classe}" id="pub">${esc(pub.texte)}</span></p>
      <label class="interrupteur carte-interrupteur">
        <span><b>En repérage</b></span>
        <input type="checkbox" id="repere" ${actifId === c.id && c.actif ? 'checked' : ''}>
        <i aria-hidden="true"></i>
      </label>
      <div class="trois">
        <button class="bouton-principal" id="copier-lien">${icone('copy', { taille: 17 })} Copier</button>
        <button class="bouton-secondaire" id="envoyer-lien">${icone('send', { taille: 17 })} Envoyer</button>
        <a class="bouton-secondaire" href="${esc(carnets.lienApercu(lienClient))}">${icone('eye', { taille: 17 })} Voir</a>
      </div>
    </section>

    ${ch.envoyeLe || nbChoix(c) ? `
    <section class="section">
      <h2 class="section-titre">${icone('check', { taille: 20 })} Ses choix</h2>
      ${ch.vuLe ? `<p class="petit">Vu ${esc(depuis(ch.vuLe))}</p>` : ''}
      ${[...new Set(choixRetenus(c).map((r) => r.quand))].map((q) => `
        <p class="soir-titre">${esc(dateLongue(q, c.fuseau))}</p>
        ${choixRetenus(c).filter((r) => r.quand === q).map((r) => { const i = c.items.find((y) => y.id === r.itemId); const e = i && parId.get(i.endroitId); return `<p class="choix-ligne">${icone(GROUPES_CHOIX[r.groupe].ico, { taille: 16 })}<span>${GROUPES_CHOIX[r.groupe].court} : <b>${e ? esc(e.nom) : 'aucun ne lui plaisait'}</b></span></p>`; }).join('')}`).join('')}
      ${(ch.messages?.length ? ch.messages : ch.mot ? [{ texte: ch.mot }] : []).map((m) => `<blockquote class="mot-du-client">« ${esc(m.texte)} »${m.le ? `<small>${esc(depuis(m.le))}</small>` : ''}</blockquote>`).join('')}
      <button class="lien lien-icone" id="rafraichir-choix">${icone('refresh-cw', { taille: 14 })} Actualiser</button>
    </section>` : ''}

    <section class="section" id="a-venir">
      <h2 class="section-titre">${icone('clock', { taille: 20 })} À venir</h2>
      ${aVenir.blocAVenir(c, parId, { prenom, resume: false, conseilCompact: true })}
      <button class="lien lien-icone" id="ajouter-existant">${icone('plus', { taille: 15 })} Ajouter un endroit</button>
    </section>

    ${soirs.length ? `
    <section class="section" id="deja-livre">
      <h2 class="section-titre">${icone('book-open', { taille: 20 })} Déjà envoyé</h2>
      ${soirs.map((s) => `
        <p class="soir-titre">${esc(dateLongue(s, c.fuseau))}</p>
        <ul class="items-carnet">${faits.filter((i) => i.livraison === s).map((i) => ligneItem(c, i, parId.get(i.endroitId), { attente: false })).join('')}</ul>`).join('')}
    </section>` : ''}

    <details class="section" id="reglages-carnet" ${reglagesOuverts || sous === 'envoi' ? 'open' : ''}>
      <summary>Réglages <small>${esc(aVenir.resumeReglages(c))}</small></summary>
      <label class="champ"><span>Prénom du client</span><input id="c-prenom" value="${esc(c.client?.prenom)}" autocapitalize="words"></label>
      <div class="deux">
        <label class="champ"><span>Ville</span><input id="c-ville" value="${esc(c.ville)}" autocapitalize="words"></label>
        <label class="champ"><span>Pays</span><input id="c-pays" value="${esc(c.pays)}" autocapitalize="words"></label>
      </div>
      <label class="champ"><span>Ton cell</span><input id="c-tel" type="tel" value="${esc(c.tel ?? telDefaut)}"></label>
      <label class="interrupteur">
        <span><b>Repérage terminé</b></span>
        <input type="checkbox" id="c-fini" ${c.actif ? '' : 'checked'}>
        <i aria-hidden="true"></i>
      </label>
      <div id="envoi-carnet">${aVenir.blocReglages(c)}</div>
      <button class="bouton-secondaire bouton-bloc" id="essai-montreal">${icone(enEssai ? 'x' : 'map-pin', { taille: 18 })} ${enEssai ? 'Arrêter l’essai de Montréal' : 'Essai de Montréal'}</button>
      <button class="bouton-danger" id="supprimer-carnet">${icone('trash-2', { taille: 18 })} Supprimer ce client</button>
    </details>`;

  afficherPhotos(app);
  const ouvert = () => (app.querySelector('#reglages-carnet')?.open ? 'envoi' : '');
  const recharger = () => pageCarnet(id, ouvert());
  const sauver = async () => { await carnets.enregistrer(c); };

  const arret = carnets.surPublication((x) => {
    const el = app.querySelector('#pub');
    if (!el) { arret(); return; }
    if (x.id === c.id) { const p = etatPublication(x); el.className = `pub ${p.classe}`; el.textContent = p.texte; }
  });
  if (!c.publication?.publieLe || c.publication?.erreur) carnets.publierBientot(c.id, 300);

  app.querySelector('#repere').onchange = async (ev) => {
    if (ev.target.checked) {
      c.actif = true;
      await db.ecrireReglage('carnetActif', c.id);
      // Ses endroits déjà repérés dans sa ville entrent dans sa file tout seuls.
      const deja = c.ville ? aAjouter : [];
      for (const e of deja) carnets.ajouterItem(c, e.id);
      await sauver();
      toast(deja.length ? `${deja.length} endroit${deja.length > 1 ? 's' : ''} ajouté${deja.length > 1 ? 's' : ''} · les prochains iront à ${prenom}` : `Tes prochains endroits iront à ${prenom}`);
      if (deja.length) recharger();
    } else { await db.ecrireReglage('carnetActif', null); toast('Repérage en pause'); }
  };
  // Copier : seulement son lien, rien d'autre.
  app.querySelector('#copier-lien').onclick = async () => {
    try { await navigator.clipboard.writeText(lienClient); toast('Son lien est copié'); }
    catch (_) { window.prompt('Copie son lien :', lienClient); }
  };
  // Envoyer : ouvre Messages, WhatsApp… avec seulement son lien.
  app.querySelector('#envoyer-lien').onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `Ton voyage${c.ville ? ` à ${c.ville}` : ''}`, url: lienClient });
      else { await navigator.clipboard.writeText(lienClient); toast('Son lien est copié'); }
    } catch (_) { /* annulé */ }
  };
  const rafraichir = app.querySelector('#rafraichir-choix');
  if (rafraichir) rafraichir.onclick = async () => { await carnets.lireChoix(c); toast('À jour'); recharger(); };

  // Le mot pour le client, dans une feuille.
  const editerMot = (i) => new Promise((ok) => {
    ouvrirFeuille(`
      ${enteteFeuille('Conseil')}
      <div class="feuille-corps">
        <textarea id="mot-item" rows="4" class="zone-mot" placeholder="Demande la chambre du 6e">${esc(i.mot)}</textarea>
        <button type="button" class="bouton-principal" id="ok-mot">Enregistrer</button>
      </div>`, (ev) => {
      if (!ev.target.closest('#ok-mot')) return;
      const t = feuille.querySelector('#mot-item').value;
      fermerFeuille();
      ok(t);
    });
    feuille.querySelector('#mot-item').focus();
  });
  const choisirEndroit = ({ titre, options }) => new Promise((ok) => {
    const parCle = new Map(options.map((o) => [o.id, o]));
    choisirDansListe({
      titre,
      valeurs: options.map((o) => o.id),
      etiquette: (x) => { const o = parCle.get(x); return `${o.nom}${o.detail ? ` (${o.detail})` : ''}`; },
      placeholder: 'Chercher un endroit',
      quandChoisi: ok,
    });
  });

  const zoneAVenir = app.querySelector('#a-venir');
  aVenir.brancherAVenir(zoneAVenir, c, parId, { sauver, recharger, choisirEndroit, editerMot, ajouterItem: carnets.ajouterItem, toast });
  aVenir.brancherReglages(app.querySelector('#envoi-carnet'), c, { sauver, recharger });

  // L'essai de Montréal : 2 soirées de vrais choix à Montréal, envoyées à son heure, pour essayer.
  app.querySelector('#essai-montreal').onclick = async () => {
    if (enEssai) {
      essai.retirerEssai(c, estEnvoye);
      await sauver(); toast('Essai arrêté'); recharger(); return;
    }
    essai.ajouterEssai(c, carnets.ajouterItem);
    if (!c.ville) { c.ville = 'Montréal'; c.pays = c.pays || 'Canada'; }
    await sauver();
    toast(`Essai prêt : ses choix arrivent à ${formatHeure(c.heure ?? 19)}`);
    recharger();
  };

  app.querySelector('#ajouter-existant').onclick = () => {
    const deja = new Set(c.items.map((i) => i.endroitId));
    const proposes = [...etat.endroits].filter((e) => !deja.has(e.id) && !e.contributeurId).sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
    if (!proposes.length) { toast('Tous tes endroits sont déjà dans ce voyage'); return; }
    choisirDansListe({
      titre: `Pour ${prenom}`,
      valeurs: proposes.map((e) => e.id),
      etiquette: (x) => { const e = parId.get(x); return [e.nom, e.ville].filter(Boolean).join(', '); },
      placeholder: 'Chercher un endroit',
      quandChoisi: async (x) => { carnets.ajouterItem(c, x); await sauver(); toast('Ajouté à sa file'); recharger(); },
    });
  };

  // Déjà envoyé : on peut encore retirer ou changer le conseil (sa page se met à jour).
  const deja = app.querySelector('#deja-livre');
  deja?.querySelectorAll('[data-retirer]').forEach((b) => {
    b.onclick = async () => { c.items = c.items.filter((x) => x.id !== b.dataset.retirer); await sauver(); toast('Retiré de sa page'); recharger(); };
  });
  deja?.querySelectorAll('[data-mot]').forEach((b) => {
    b.onclick = async () => {
      const i = c.items.find((x) => x.id === b.dataset.mot);
      const t = await editerMot(i);
      if (t === null || t === undefined) return;
      i.mot = t.trim(); await sauver(); recharger();
    };
  });

  // Infos : enregistrées dès qu'on les change.
  const champ = (sel) => app.querySelector(sel);
  const surChange = (sel, fn) => { champ(sel).addEventListener('change', async () => { fn(champ(sel)); await sauver(); }); };
  surChange('#c-prenom', (el) => { c.client = { ...c.client, prenom: el.value.trim() }; });
  surChange('#c-ville', (el) => { c.ville = el.value.trim(); });
  surChange('#c-pays', (el) => { c.pays = el.value.trim(); });
  surChange('#c-tel', (el) => { c.tel = el.value.trim(); if (c.tel) db.ecrireReglage('telFiche', c.tel); });
  surChange('#c-fini', (el) => { c.actif = !el.checked; });
  ['#c-fini', '#c-ville'].forEach((s) => champ(s).addEventListener('change', () => setTimeout(recharger, 50)));
  // Supprimer : deux touchers, pour ne pas le faire par erreur.
  const supprimer = async (b, texte) => {
    if (!b.dataset.confirmer) {
      b.dataset.confirmer = '1'; b.classList.add('confirmer');
      if (texte) b.textContent = texte;
      toast(`Touche encore pour supprimer ${prenom} (sa page ne s’ouvrira plus)`);
      setTimeout(() => { delete b.dataset.confirmer; b.classList.remove('confirmer'); }, 5000);
      return;
    }
    await effacerCarnet(c);
    toast('Client supprimé');
    revenir('#/clients');
  };
  app.querySelector('#supprimer-haut').onclick = (ev) => supprimer(ev.currentTarget);
  app.querySelector('#supprimer-carnet').onclick = (ev) => supprimer(ev.currentTarget, `Toucher encore pour supprimer`);


  // Les choix du client : on regarde en arrivant, puis chaque minute tant que la page est ouverte.
  const avant = JSON.stringify(c.choix || null);
  c = await carnets.lireChoix(c);
  if (JSON.stringify(c.choix || null) !== avant && location.hash.startsWith(`#/carnet/${id}`)) recharger();
  const minuterie = setInterval(async () => {
    if (!location.hash.startsWith(`#/carnet/${id}`)) { clearInterval(minuterie); return; }
    const a = JSON.stringify(c.choix || null);
    c = await carnets.lireChoix(c);
    if (JSON.stringify(c.choix || null) !== a && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { clearInterval(minuterie); recharger(); }
  }, 60000);
}

// ---------- Villes (jours recommandés) ----------
async function pageVilles() {
  const groupes = new Map();
  for (const e of etat.endroits) {
    if (!e.ville) continue;
    const cle = cleVille(e.pays, e.ville);
    if (!groupes.has(cle)) groupes.set(cle, { id: cle, pays: e.pays, ville: e.ville, nb: 0 });
    groupes.get(cle).nb++;
  }
  for (const v of etat.villes) if (!groupes.has(v.id)) groupes.set(v.id, { ...v, nb: 0 });
  const liste = [...groupes.values()].sort((a, b) => (a.pays || '').localeCompare(b.pays || '', 'fr') || a.ville.localeCompare(b.ville, 'fr'));

  let paysCourant = null;
  app.innerHTML = `
    <header class="entete-page">
      <h1>Villes</h1>
    </header>
    <div class="villes">
      ${liste.map((v) => {
        const info = etat.villes.find((x) => x.id === v.id) || {};
        const titre = v.pays !== paysCourant ? `<h2 class="pays-titre">${esc(v.pays || 'Pays inconnu')}</h2>` : '';
        paysCourant = v.pays;
        return `${titre}
          <div class="ville" data-ville="${esc(v.id)}">
            <div class="ville-tete"><b>${esc(v.ville)}</b><span class="petit">${v.nb} endroit${v.nb > 1 ? 's' : ''}</span></div>
            <div class="jours">
              <span>Jours recommandés</span>
              <div class="compteur">
                <button type="button" data-moins aria-label="Moins">−</button>
                <input type="text" inputmode="decimal" value="${esc(info.joursRecommandes ?? '')}" placeholder="–" data-champ="joursRecommandes" aria-label="Jours recommandés">
                <button type="button" data-plus aria-label="Plus">+</button>
              </div>
            </div>
            <textarea rows="2" placeholder="Notes privées" data-champ="notes">${esc(info.notes)}</textarea>
          </div>`;
      }).join('') || `<p class="vide"><span class="vide-icone">${icone('building-2', { taille: 28 })}</span><b>Aucune ville</b></p>`}
    </div>`;

  app.querySelectorAll('[data-ville]').forEach((bloc) => {
    const g = groupes.get(bloc.dataset.ville);
    const sauver = async (cleChamp, valeur) => {
      const v = etat.villes.find((x) => x.id === g.id) || { id: g.id, pays: g.pays, ville: g.ville };
      v[cleChamp] = valeur;
      v.modifieLe = new Date().toISOString();
      await db.ecrire('villes', v);
      etat.villes = etat.villes.filter((x) => x.id !== v.id).concat(v);
      sync.marquer(sync.cheminVille(v.id));
      toast('Enregistré');
    };
    const jours = bloc.querySelector('[data-champ=joursRecommandes]');
    const lireJours = () => { const n = parseFloat(jours.value.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
    jours.addEventListener('change', () => sauver('joursRecommandes', lireJours()));
    bloc.querySelector('[data-plus]').onclick = () => { const n = (lireJours() || 0) + 1; jours.value = n; sauver('joursRecommandes', n); };
    bloc.querySelector('[data-moins]').onclick = () => { const n = Math.max(0, (lireJours() || 0) - 1); jours.value = n || ''; sauver('joursRecommandes', n || null); };
    bloc.querySelector('[data-champ=notes]').addEventListener('change', (ev) => sauver('notes', ev.target.value.trim()));
  });
}

// ---------- En voyage : phrases, présentation, conversion, carte ----------
function parler(texte, voix) {
  if (!('speechSynthesis' in window)) { toast('Lecture non disponible sur cet appareil'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = voix;
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

async function pageOutil(id) {
  const titres = { phrases: 'Phrases utiles', pitch: 'Présenter mon agence', convertir: 'Convertir un prix', carte: 'Ma carte de contact', alertes: 'Alerte nouvelle demande', style: 'Apparence' };
  if (!titres[id]) return location.replace('#/reglages');
  const pays = await paysCourant();
  const choix = await db.lireReglage('langueOutils', null);
  let langue = choix && choix.pays === pays ? choix.langue : langueDuPays(pays);
  if (!LANGUES[langue]) langue = 'en';
  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="#/reglages" data-retour-page aria-label="Retour">${icone('chevron-left')}</a>
      <h1>${titres[id]}</h1>
      <span class="rond vide-rond"></span>
    </header>
    <div id="outil" class="outil"></div>`;
  const zone = app.querySelector('#outil');
  const puces = () => `<div class="puces-langues" role="tablist">${Object.entries(LANGUES).map(([k, l]) => `<button type="button" class="puce-langue ${k === langue ? 'choisie' : ''}" data-langue="${k}">${esc(l.nom)}</button>`).join('')}</div>`;
  const brancherPuces = (redessiner) => zone.querySelectorAll('[data-langue]').forEach((b) => {
    b.onclick = async () => { langue = b.dataset.langue; await db.ecrireReglage('langueOutils', { pays, langue }); redessiner(); };
  });

  if (id === 'phrases') {
    const dessiner = () => {
      const L = LANGUES[langue];
      const voix = voixPays(langue, pays);
      const urg = urgences(pays);
      zone.innerHTML = `
        ${puces()}
        ${urg.length ? `<div class="urgences">${icone('siren', { taille: 18 })}<span>${esc(pays)}</span>${urg.map(([n, num]) => `<a href="tel:${num}">${esc(n)} <b>${num}</b></a>`).join('')}</div>` : ''}
        <ul class="phrases">
          ${PHRASES.map(([k, fr]) => { const [texte, prono] = L.phrases[k]; if (k === 'langue' && langue === 'en') fr = 'Parlez-vous français ?'; return `
            <li><button type="button" class="phrase" data-dire="${esc(k)}">
              <span class="phrase-fr">${esc(fr)}</span>
              <b lang="${esc(voix)}">${esc(texte)}</b>
              <i>${esc(prono)}</i>
              <span class="phrase-son" aria-label="Écouter">${icone('volume-2', { taille: 18 })}</span>
            </button></li>`; }).join('')}
        </ul>`;
      brancherPuces(dessiner);
      zone.querySelectorAll('[data-dire]').forEach((b) => { b.onclick = () => parler(L.phrases[b.dataset.dire][0], voix); });
    };
    dessiner();
  } else if (id === 'pitch') {
    const dessiner = () => {
      const L = LANGUES[langue];
      const voix = voixPays(langue, pays);
      zone.innerHTML = `
        ${puces()}
        <article class="pitch">
          <p class="pitch-texte" lang="${esc(voix)}">${esc(L.pitch)}</p>
          <div class="deux">
            <button type="button" class="bouton-principal" id="ecouter">${icone('volume-2', { taille: 18 })} Écouter</button>
            <button type="button" class="bouton-secondaire" id="grand">${icone('maximize-2', { taille: 18 })} Montrer</button>
          </div>
        </article>
        <p class="pitch-fr">${esc(PITCH_FR)}</p>`;
      brancherPuces(dessiner);
      zone.querySelector('#ecouter').onclick = () => parler(L.pitch, voix);
      zone.querySelector('#grand').onclick = () => {
        const voile = document.createElement('div');
        voile.className = 'pitch-plein';
        voile.innerHTML = `<p lang="${esc(voix)}">${esc(L.pitch)}</p><button type="button" class="rond" aria-label="Fermer">${icone('x')}</button>`;
        voile.onclick = () => voile.remove();
        document.body.appendChild(voile);
      };
    };
    dessiner();
  } else if (id === 'convertir') {
    let devise = DEVISE_DU_PAYS[pays] && DEVISE_DU_PAYS[pays] !== 'CAD' ? DEVISE_DU_PAYS[pays] : 'USD';
    const nombre = (v) => parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    const joli = (n) => (Number.isFinite(n) ? n.toLocaleString('fr-CA', { maximumFractionDigits: n < 10 ? 2 : 0 }) : '');
    const dessiner = () => {
      const rapides = uniques([DEVISE_DU_PAYS[pays] !== 'CAD' ? DEVISE_DU_PAYS[pays] : '', devise, 'USD', 'EUR']);
      zone.innerHTML = `
        <div class="convertir">
          <label class="conv-ligne"><span>${esc(devise)}<small>${esc(NOMS_DEVISES[devise] || '')}</small></span><input id="conv-local" inputmode="decimal" placeholder="0" autocomplete="off" enterkeyhint="done"></label>
          <span class="conv-fleche">${icone('arrow-left-right', { taille: 18 })}</span>
          <label class="conv-ligne"><span>CAD<small>Dollar canadien</small></span><input id="conv-cad" inputmode="decimal" placeholder="0" autocomplete="off" enterkeyhint="done"></label>
        </div>
        <div class="puces-devises">${rapides.map((d) => `<button type="button" class="puce-devise ${d === devise ? 'choisie' : ''}" data-devise="${d}"><b>${d}</b><small>${esc(NOMS_DEVISES[d] || '')}</small></button>`).join('')}<button type="button" class="puce-devise autre" data-autre><b>Autre</b><small>Toutes les monnaies</small></button></div>
        <p class="petit">Taux approximatif : 1 ${esc(devise)} = ${joli(etat.taux[devise])} $ CA</p>`;
      const local = zone.querySelector('#conv-local');
      const cad = zone.querySelector('#conv-cad');
      local.oninput = () => { const n = nombre(local.value); cad.value = Number.isFinite(n) ? joli(n * etat.taux[devise]) : ''; };
      cad.oninput = () => { const n = nombre(cad.value); local.value = Number.isFinite(n) ? joli(n / etat.taux[devise]) : ''; };
      zone.querySelectorAll('[data-devise]').forEach((b) => { b.onclick = () => { devise = b.dataset.devise; dessiner(); }; });
      zone.querySelector('[data-autre]').onclick = () => choisirDansListe({
        titre: 'Monnaie',
        valeurs: trierFr(Object.keys(etat.taux).filter((d) => d !== 'CAD')),
        choisie: devise,
        etiquette: (d) => `${d}, ${NOMS_DEVISES[d] || d}`,
        placeholder: 'Chercher une monnaie',
        quandChoisi: (d) => { devise = d; dessiner(); },
      });
    };
    dessiner();
  } else if (id === 'style') {
    const dessiner = () => {
      const st = styleAppli.styleActuel(); const mode = styleAppli.modeActuel(); const sombre = styleAppli.estSombre();
      zone.innerHTML = `
        <div class="segments modes-style" role="radiogroup">${styleAppli.MODES.map(([k, l]) => `<button type="button" class="segment ${k === mode ? 'choisi' : ''}" data-mode="${k}" role="radio" aria-checked="${k === mode}">${k === 'light' ? icone('sun', { taille: 16 }) : k === 'dark' ? icone('moon', { taille: 16 }) : icone('smartphone', { taille: 16 })} ${l}</button>`).join('')}</div>
        <ul class="grille-styles">${styleAppli.STYLES.map((x) => { const [fond, acc, encre] = sombre ? x.sombre : x.clair; return `
          <li><button type="button" class="tuile-style ${x.n === st ? 'choisie' : ''}" data-style="${x.n}" aria-pressed="${x.n === st}" style="--t-fond:${fond};--t-acc:${acc};--t-encre:${encre}">
            <span class="ts-apercu"><b style="font-family:'${x.police}',var(--police)">Aa</b><i></i><i></i><em></em>${x.n === st ? `<span class="ts-coche">${icone('check', { taille: 14 })}</span>` : ''}</span>
            <span class="ts-nom">${esc(x.nom)}</span>
          </button></li>`; }).join('')}</ul>`;
      zone.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { styleAppli.appliquer(styleAppli.styleActuel(), b.dataset.mode, { enFondu: true }); dessiner(); }; });
      zone.querySelectorAll('[data-style]').forEach((b) => { b.onclick = () => { styleAppli.appliquer(+b.dataset.style, styleAppli.modeActuel(), { enFondu: true }); dessiner(); }; });
    };
    dessiner();
  } else if (id === 'alertes') {
    zone.innerHTML = `
      <ol class="etapes-alerte">
        <li><b>Installer l'appli ntfy</b><a class="bouton-secondaire" href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">${icone('external-link', { taille: 17 })} App Store</a></li>
        <li><b>Dans ntfy, toucher + et coller ce nom</b><code class="sujet-alerte">${esc(ALERTE)}</code><button type="button" class="bouton-secondaire" id="copier-sujet">${icone('copy', { taille: 17 })} Copier</button></li>
        <li><b>Recevoir un essai</b><button type="button" class="bouton-principal" id="essai-alerte">${icone('bell', { taille: 18 })} Envoyer un essai</button></li>
      </ol>`;
    zone.querySelector('#copier-sujet').onclick = async () => {
      try { await navigator.clipboard.writeText(ALERTE); toast('Copié'); } catch (_) { toast('Copie impossible'); }
    };
    zone.querySelector('#essai-alerte').onclick = async () => {
      const q = new URLSearchParams({ title: 'Nouvelle demande de voyage', tags: 'airplane', priority: 'high', click: new URL('./#/demandes', location.href).href });
      try {
        const r = await fetch(`https://ntfy.sh/${ALERTE}?${q}`, { method: 'POST', body: 'Essai · tout fonctionne' });
        if (!r.ok) throw new Error();
        await db.ecrireReglage('alerteActive', true);
        toast('Essai envoyé');
      } catch (_) { toast('Pas de connexion'); }
    };
  } else if (id === 'carte') {
    await pageCarte(zone, { toast });
  }
}

// ---------- Réglages ----------
async function paysCourant() {
  if (etat.region.pays) return etat.region.pays;
  return (await db.lireReglage('dernierLieu', {})).pays || '';
}
const ligneReglage = (href, ico, texte, detail = '') => `<li><a class="ligne ligne-reglage" href="${href}">${icone(ico, { taille: 20 })}<span>${texte}</span>${detail ? `<small>${esc(detail)}</small>` : ''}${icone('chevron-right', { taille: 18 })}</a></li>`;

async function pageReglages() {
  const derniere = await db.lireReglage('derniereSauvegarde', null);
  const nbPhotos = etat.endroits.reduce((n, e) => n + (e.photos?.length || 0), 0);
  const envoi = await sync.etat();
  const cfg = await sync.lireConfig();
  const pays = await paysCourant();
  const langue = langueDuPays(pays);
  const tousPays = trierFr(Object.values(CONTINENTS).flat());
  app.innerHTML = `
    <header class="entete-page"><h1>Réglages</h1></header>

    <section class="section">
      <h2 class="section-titre">Mes coordonnées</h2>
      <ul class="liste-choix liste-reglages">
        ${ligneReglage('#/outils/carte', 'id-card', 'Ma carte de contact')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-titre">En voyage</h2>
      <ul class="liste-choix liste-reglages">
        ${ligneReglage('#/outils/phrases', 'message-circle', 'Phrases utiles', langue === 'fr' ? '' : LANGUES[langue]?.nom)}
        ${ligneReglage('#/outils/pitch', 'megaphone', 'Présenter mon agence')}
        ${ligneReglage('#/outils/convertir', 'coins', 'Convertir un prix')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-titre">Notifications</h2>
      <ul class="liste-choix liste-reglages">
        ${ligneReglage('#/outils/alertes', 'bell', 'Alerte nouvelle demande', (await db.lireReglage('alerteActive', false)) ? 'Activée' : '')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-titre">Apparence</h2>
      <ul class="liste-choix liste-reglages">
        ${ligneReglage('#/outils/style', 'sparkles', 'Style', styleAppli.STYLES.find((x) => x.n === styleAppli.styleActuel())?.nom)}
      </ul>
    </section>


    <section class="section">
      <h2 class="section-titre">Préférences</h2>
      <label class="champ"><span>Pays par défaut</span><select id="pays-actuel">
        <option value="">Aucun</option>
        ${tousPays.map((p) => `<option ${p === etat.region.pays ? 'selected' : ''}>${esc(p)}</option>`).join('')}
      </select></label>
      <label class="interrupteur">
        <span><b>Photos aussi dans la pellicule</b></span>
        <input type="checkbox" id="pellicule" ${(await db.lireReglage('pellicule', true)) ? 'checked' : ''}>
        <i aria-hidden="true"></i>
      </label>
    </section>

    <section class="section" id="section-envoi">
      <h2 class="section-titre">Studio</h2>
      ${cfg ? `
        <p class="etat-branche" id="detail-envoi">${texteDetailEnvoi(envoi)}</p>
        <p class="etat-branche" id="etat-cle">${icone('lock', { taille: 16 })}<span><b>Clé GitHub : vérification…</b></span></p>
        <div class="deux">
          <button class="bouton-secondaire" id="envoyer-maintenant">${icone('refresh-cw', { taille: 17 })} Synchroniser</button>
          <a class="bouton-secondaire" href="studio/?depuis=appli">${icone('external-link', { taille: 17 })} Ouvrir</a>
        </div>
        <div class="liens-ligne"><button class="lien" id="changer-cle">Changer la clé</button><button class="lien" id="debrancher">Débrancher</button></div>
        <div id="zone-cle" hidden>
          <label class="champ"><span>Nouvelle clé</span><input id="jeton" type="password" placeholder="github_pat_…" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
          <p class="aide" id="message-envoi"></p>
          <button class="bouton-secondaire bouton-bloc" id="enregistrer-cle">Enregistrer</button>
        </div>` : `
        <label class="champ"><span>Dossier GitHub privé</span><input id="depot" value="${esc(DEPOT_DONNEES)}" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <label class="champ"><span>Clé d'accès GitHub</span><input id="jeton" type="password" placeholder="github_pat_…" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <p class="aide" id="message-envoi"></p>
        <button class="bouton-principal" id="brancher">Brancher</button>
        <a class="bouton-secondaire bouton-bloc" href="studio/?depuis=appli">Ouvrir le Studio</a>`}
    </section>

    <section class="section">
      <h2 class="section-titre">Aperçus</h2>
      <ul class="liste-choix liste-reglages">
        ${ligneReglage('demande.html?apercu', 'file-text', 'Formulaire de demande')}
        ${ligneReglage('carnet.html?demo&apercu', 'eye', 'Page client (exemple)')}
      </ul>
    </section>

    <section class="section">
      <h2 class="section-titre">Sauvegarde</h2>
      <p class="petit">${plur(etat.endroits.length, 'endroit')}, ${plur(nbPhotos, 'photo')}${derniere ? ` · copie du ${new Date(derniere).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}` : ''}</p>
      <div class="deux">
        <button class="bouton-secondaire" id="exporter">Faire une copie</button>
        <label class="bouton-secondaire">Restaurer<input type="file" accept=".json,application/json" id="importer" hidden></label>
      </div>
    </section>
    ${pwa.dejaInstallee() ? '' : `
    <section class="section">
      <button class="bouton-secondaire bouton-bloc" id="installer">${icone('download', { taille: 18 })} Installer l'appli</button>
      <p class="petit" id="aide-installer" hidden>${pwa.EXPLICATION.fr}</p>
    </section>`}`;

  const boutonInstaller = app.querySelector('#installer');
  if (boutonInstaller) boutonInstaller.onclick = async () => { if (!(await pwa.installer())) app.querySelector('#aide-installer').hidden = false; };

  app.querySelector('#pellicule').onchange = (ev) => db.ecrireReglage('pellicule', ev.target.checked);
  app.querySelector('#pays-actuel').onchange = async (ev) => {
    etat.region = { continent: '', pays: ev.target.value };
    await db.ecrireReglage('region', etat.region);
    toast(etat.region.pays ? `Pays par défaut : ${etat.region.pays}` : 'Aucun pays par défaut');
    pageReglages();
  };

  if (cfg) {
    const detail = app.querySelector('#detail-envoi');
    const arret = sync.surChangement((e) => { if (document.body.contains(detail)) detail.innerHTML = texteDetailEnvoi(e); else arret(); });
    // La clé marche-t-elle pour le Studio (dossier privé) et pour les pages des clients (appli) ?
    sync.verifierCle(carnets.DEPOT_PAGES).then((v) => {
      const el = app.querySelector('#etat-cle');
      if (el && v) el.outerHTML = texteCle(v);
    });
    app.querySelector('#changer-cle').onclick = () => { const z = app.querySelector('#zone-cle'); z.hidden = !z.hidden; if (!z.hidden) z.querySelector('#jeton').focus(); };
    app.querySelector('#enregistrer-cle').onclick = async (ev) => {
      const msg = app.querySelector('#message-envoi');
      ev.target.disabled = true;
      msg.textContent = 'Vérification…';
      const t = await sync.tester(cfg.depot, app.querySelector('#jeton').value);
      ev.target.disabled = false;
      if (!t.ok) { msg.textContent = t.message; return; }
      await sync.enregistrerConfig(t.depot, app.querySelector('#jeton').value);
      sync.envoyerBientot(200);
      toast('Nouvelle clé enregistrée');
      pageReglages();
    };
    app.querySelector('#envoyer-maintenant').onclick = async (ev) => {
      const b = ev.currentTarget;
      b.disabled = true;
      await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix', 'liens']).then(() => charger()).catch(() => {});
      await sync.toutMarquer();
      const e = await sync.envoyer();
      b.disabled = false;
      toast(e.erreur ? 'La synchronisation a échoué' : e.horsLigne ? 'Pas d\'internet : ça partira plus tard' : 'Tout est à jour');
    };
    app.querySelector('#debrancher').onclick = async () => { await sync.oublierConfig(); toast('Envoi automatique débranché'); pageReglages(); };
  } else {
    app.querySelector('#brancher').onclick = async (ev) => {
      const msg = app.querySelector('#message-envoi');
      ev.target.disabled = true;
      msg.textContent = 'Vérification…';
      const t = await sync.tester(app.querySelector('#depot').value, app.querySelector('#jeton').value);
      ev.target.disabled = false;
      if (!t.ok) { msg.textContent = t.message; return; }
      await sync.enregistrerConfig(t.depot, app.querySelector('#jeton').value);
      msg.textContent = 'Branché ! Envoi de tes endroits…';
      await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix', 'liens']).catch(() => {});
      await charger();
      await sync.toutMarquer();
      toast('Branché : tes endroits partent vers le Studio');
      pageReglages();
    };
  }

  app.querySelector('#exporter').onclick = async () => {
    const donnees = await db.exporterTout();
    const blob = new Blob([JSON.stringify(donnees)], { type: 'application/json' });
    const nom = `appli-voyage-sauvegarde-${aujourdhui()}.json`;
    const fichier = new File([blob], nom, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: nom }); } catch (err) { if (err.name === 'AbortError') return; }
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nom;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    await db.ecrireReglage('derniereSauvegarde', new Date().toISOString());
    toast('Copie de sauvegarde créée');
    pageReglages();
  };

  app.querySelector('#importer').onchange = async (ev) => {
    const fichier = ev.target.files[0];
    if (!fichier) return;
    try {
      const n = await db.importerTout(JSON.parse(await fichier.text()));
      await charger();
      toast(`${n} endroit${n > 1 ? 's' : ''} restauré${n > 1 ? 's' : ''}`);
      pageReglages();
    } catch (err) {
      toast(err.message || 'Ce fichier ne peut pas être lu.');
    }
  };

}

function texteDetailEnvoi(e) {
  const quand = e.dernier ? `<small>Dernier envoi : ${esc(new Date(e.dernier).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }))}</small>` : '';
  const ligne = (ico, texte) => `${icone(ico, { taille: 16 })}<span><b>${texte}</b>${quand}</span>`;
  if (!e.enAttente) return ligne('check', 'Tout est envoyé');
  if (e.horsLigne) return ligne('clock', `${e.enAttente} en attente d'internet`);
  if (e.erreur) return ligne('triangle-alert', /401/.test(e.erreur) ? 'Clé refusée : change la clé' : `${e.enAttente} en attente : GitHub ne répond pas`);
  return ligne('refresh-cw', `Envoi en cours (${e.enAttente})`);
}

function texteCle(v) {
  if (v.horsLigne) return `<p class="etat-branche" id="etat-cle">${icone('lock', { taille: 16 })}<span><b>Clé GitHub : pas d'internet pour vérifier</b></span></p>`;
  const bout = (nom, x) => `${icone(x === 'ok' ? 'check' : 'x', { taille: 13 })} ${nom}`;
  const ok = v.studio === 'ok' && v.pages === 'ok';
  const conseil = ok ? '' : v.studio === 'cle' ? '<small>Clé refusée : colle la nouvelle clé (Changer la clé)</small>'
    : v.pages !== 'ok' ? `<small>Sur GitHub, donne aussi à ta clé le dossier « ${esc(DEPOT_PUBLIC.split('/')[1])} » (Contents : Read and write)</small>`
    : `<small>Sur GitHub, donne à ta clé le dossier « ${esc(DEPOT_DONNEES)} » (Contents : Read and write)</small>`;
  return `<p class="etat-branche ${ok ? '' : 'mauvais'}" id="etat-cle">${icone('lock', { taille: 16 })}<span><b>Clé GitHub : ${bout('Studio', v.studio)} · ${bout('Pages clients', v.pages)}</b>${conseil}</span></p>`;
}

// Au démarrage : recevoir ce qui manque (ex. : nouveau téléphone), puis envoyer ce qui attend.
async function demarrerEnvoi() {
  if (!(await sync.lireConfig())) return;
  try {
    const { nouveaux } = await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix', 'liens']);
    if (nouveaux) { await charger(); if (!location.hash || location.hash === '#/') router(); }
  } catch (_) { /* on réessaiera */ }
  sync.envoyerBientot(300);
}

// ---------- Démarrage ----------
document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = icone(el.dataset.ico, { taille: +(el.dataset.taille || 24), epaisseur: 1.8 }); });
rouvrirALAccueil({ garder: ['ajouter', 'modifier', 'voyage'] });
window.addEventListener('hashchange', router);
// Le bouton + ouvre d'abord le choix de catégorie par-dessus la page.
// Si on le referme, on reste où on était ; sinon le formulaire s'ouvre.
document.querySelector('.bouton-ajouter').addEventListener('click', (ev) => {
  ev.preventDefault();
  const choix = {};
  choisirCategorie(choix, () => {
    brouillon = { categorie: choix.categorie, type: choix.type, sousType: choix.sousType };
    aller('#/ajouter');
  });
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !feuille.hidden) fermerFeuille(); });
charger().then(router).then(demarrerEnvoi).catch((err) => {
  app.innerHTML = `<p class="vide">Erreur au démarrage : ${esc(err.message)}</p>`;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* l'appli marche quand même */ });
}
