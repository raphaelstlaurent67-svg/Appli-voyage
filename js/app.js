import { TAXONOMIE, TAUX_PAR_DEFAUT, DEVISE_DU_PAYS, CONTACTS, NOMS_DEVISES, DEVISES_FAVORITES, sousTypes } from './taxonomie.js';
import { trierFr } from './lieux.js';
import { CONTINENTS, VILLES_MONDE, paysDuContinent } from './monde.js';
import * as sync from './sync.js';
import * as pwa from './installer.js';
import * as db from './db.js';
import { icone, iconeCat } from './icones.js';
import * as carnets from './carnets.js';
import { prochaineLivraison, dateLongue, formatHeure, HEURE_PAR_DEFAUT, motDuSoir } from './carnet-commun.js';

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
    ${enteteFeuille('Quelle catégorie ?')}
    <div class="tuiles">
      ${Object.entries(TAXONOMIE).map(([k, c]) => `
        <button type="button" class="tuile ${k === f.categorie ? 'choisie' : ''}" style="--c:${c.couleur}" data-cat="${k}">
          <span class="tuile-icone">${iconeCat(k, { taille: 24 })}</span>
          <span class="tuile-nom">${esc(c.nom)}</span>
          <span class="tuile-sous">${Object.keys(c.types).length ? `${Object.keys(c.types).length} types` : 'Pas sûr où le classer'}</span>
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
            <span class="tuile-sous">${esc(sous.slice(0, 3).join(', '))}${sous.length > 3 ? '…' : ''}</span>
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
        <input id="autre-nom" placeholder="Nom du sous-type" autocomplete="off">
        <button type="button" class="bouton-principal" data-autre-ok>OK</button>
      </div>
      <button type="button" class="lien-discret" data-sans-sous>Garder seulement « ${esc(type)} »</button>`, clic);
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
function aller(route) { location.hash = route; }

async function router() {
  fermerFeuille();
  const [, page, id] = (location.hash || '#/').split('/');
  const nom = page || 'liste';
  document.body.dataset.page = nom;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === (nom === 'carnet' ? 'clients' : nom)));
  window.scrollTo(0, 0);
  if (page === 'ajouter') return pageFormulaire(null);
  if (page === 'modifier') return pageFormulaire(id);
  if (page === 'endroit') return pageFiche(id);
  if (page === 'villes') return pageVilles();
  if (page === 'reglages') return pageReglages();
  if (page === 'clients') return pageClients();
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
      ? `<li class="vide"><span class="vide-icone">${icone('search', { taille: 28 })}</span><b>Aucun résultat</b><span>Essaie un autre mot ou enlève des filtres.</span></li>`
      : `<li class="vide"><span class="vide-icone">${icone('map-pin', { taille: 30 })}</span><b>Ajoute ton premier endroit</b><span>Un hôtel, un resto, une activité : note-le en 30 secondes pendant que tu y es.</span><a class="bouton-principal bouton-vide" href="#/ajouter">${icone('plus', { taille: 18 })} Ajouter un endroit</a></li>`);
    afficherPhotos(ul);
  };
  remplir();

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
      <a class="carte" href="#/endroit/${esc(e.id)}" style="--c:${cat.couleur}">
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

// ---------- Fiche d'un endroit ----------
async function pageFiche(id) {
  const e = etat.endroits.find((x) => x.id === id);
  if (!e) return aller('#/');
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
        <a class="rond rond-flottant" href="#/" aria-label="Retour">${icone('chevron-left', { taille: 20, epaisseur: 2.4 })}</a>
        <a class="rond rond-flottant" href="#/modifier/${esc(e.id)}" aria-label="Modifier">${icone('pencil', { taille: 18 })}</a>
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
  carnets.carnetActif().then((c) => {
    const zone = app.querySelector('#zone-client');
    if (!c || !zone || e.contributeurId) return;
    const prenom = c.client?.prenom || 'ton client';
    const dedans = c.items.some((i) => i.endroitId === e.id);
    zone.innerHTML = dedans
      ? `<p class="etat-branche">${icone('moon', { taille: 16 })}<span>Dans le carnet de <b>${esc(prenom)}</b></span></p>`
      : `<button class="bouton-secondaire bouton-bloc" id="envoyer-client">${icone('send', { taille: 18 })} Envoyer à ${esc(prenom)} (${formatHeure(c.heure)})</button>`;
    const b = zone.querySelector('#envoyer-client');
    if (b) b.onclick = async () => { carnets.ajouterItem(c, e.id); await carnets.enregistrer(c); toast(`En route pour ${prenom}`); zone.innerHTML = `<p class="etat-branche">${icone('moon', { taille: 16 })}<span>Dans le carnet de <b>${esc(prenom)}</b></span></p>`; };
  });
  const demander = (oui) => { app.querySelector('#supprimer').hidden = oui; app.querySelector('#confirmer').hidden = !oui; };
  app.querySelector('#supprimer').onclick = () => demander(true);
  app.querySelector('#non-supprimer').onclick = () => demander(false);
  app.querySelector('#oui-supprimer').onclick = async () => {
    for (const p of e.photos || []) await db.effacer('photos', p);
    await db.effacer('endroits', e.id);
    etat.endroits = etat.endroits.filter((x) => x.id !== e.id);
    sync.marquer(sync.cheminEndroit(e), (e.photos || []).map(sync.cheminPhoto));
    toast('Endroit supprimé');
    aller('#/');
  };
}

// ---------- Formulaire d'ajout / modification ----------
async function pageFormulaire(id) {
  const existant = id ? etat.endroits.find((x) => x.id === id) : null;
  if (id && !existant) return aller('#/');
  const dernierLieu = await db.lireReglage('dernierLieu', {});
  // Pays fixé dans Réglages > Où je suis : il est déjà rempli, et la dernière ville aussi si elle est dans ce pays.
  const paysFixe = etat.region.pays;
  const lieu = paysFixe ? { pays: paysFixe, ville: dernierLieu.pays === paysFixe ? dernierLieu.ville : '', devise: dernierLieu.pays === paysFixe ? dernierLieu.devise : '' } : dernierLieu;
  const f = existant
    ? structuredClone(existant)
    : { id: db.nouvelId(), pays: lieu.pays || '', ville: lieu.ville || '', devise: lieu.devise || DEVISE_DU_PAYS[lieu.pays] || 'CAD', contacts: {}, photos: [], verifieLe: aujourdhui(), ...(brouillon || {}) };
  brouillon = null;
  // Repérage en cours pour un client : on propose d'envoyer l'endroit dans son carnet.
  const carnetPour = await carnets.carnetActif();
  const itemClient = carnetPour?.items.find((i) => i.endroitId === f.id);
  const prenomClient = carnetPour?.client?.prenom || 'ton client';
  f.contacts = f.contacts || {};
  f.photos = f.photos || [];
  f.nouvellesPhotos = []; // { cle, blob, url }
  f.photosRetirees = [];
  const nbAutresContacts = CONTACTS.filter(([k]) => f.contacts[k]).length;

  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="${existant ? `#/endroit/${esc(f.id)}` : '#/'}" aria-label="Annuler">${icone('x')}</a>
      <h1>${existant ? 'Modifier' : 'Nouvel endroit'}</h1>
      <span class="rond vide-rond"></span>
    </header>
    <form id="formulaire" class="formulaire" autocomplete="off" novalidate>

      <section class="section">
        <h2 class="section-titre">C'est quoi ?</h2>
        <button type="button" class="selecteur selecteur-cat" id="choix-categorie"></button>
        <label class="champ"><span>Nom</span><input name="nom" required value="${esc(f.nom)}" placeholder="Ex. : Chez Mama Noi"></label>
      </section>

      <section class="section">
        <h2 class="section-titre">Photos</h2>
        <div class="photos" id="photos"></div>
        <label class="bouton-secondaire bouton-photo">${icone('camera', { taille: 20 })} Ajouter des photos<input type="file" accept="image/*" multiple id="ajout-photos" hidden></label>
      </section>

      <section class="section">
        <h2 class="section-titre">Où ?</h2>
        <div class="deux">
          <button type="button" class="selecteur" id="choix-pays"></button>
          <button type="button" class="selecteur" id="choix-ville"></button>
        </div>
        <div id="zone-trajet"></div>
        <label class="champ"><span>Adresse</span><input name="adresse" value="${esc(f.adresse)}" placeholder="Rue, quartier…"></label>
        <label class="champ"><span>Téléphone</span><input name="telephone" type="tel" value="${esc(f.telephone)}" placeholder="+66 …"></label>
        <label class="champ"><span>Lien Google Maps</span><input name="lienMaps" type="url" inputmode="url" value="${esc(f.lienMaps)}" placeholder="Colle le lien partagé par Google Maps"></label>
        <button type="button" class="bouton-secondaire petit-bouton" id="ma-position">${icone('locate-fixed', { taille: 18 })} Reprendre ma position actuelle</button>
        <p class="aide" id="texte-position"></p>
      </section>

      <section class="section">
        <h2 class="section-titre">Combien ?</h2>
        <p class="sous-titre">Budget</p>
        <div class="segments" id="prix">${[1, 2, 3, 4].map((n) => `<button type="button" class="segment" data-prix="${n}">${dollars(n)}</button>`).join('')}</div>
        <p class="sous-titre">Prix réel</p>
        <div class="montant">
          <input name="montant" type="text" inputmode="decimal" value="${esc(f.montant)}" placeholder="Ex. : 300" aria-label="Montant">
          <span class="montant-devise" id="devise-actuelle"></span>
        </div>
        <div class="puces-devises" id="devises"></div>
        <p class="aide" id="conversion"></p>
        <p class="sous-titre">Luxe / confort <small>(séparé du prix)</small></p>
        <div class="segments" id="confort">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="segment" data-confort="${n}">${n}★</button>`).join('')}</div>
        <p class="aide">1 = simple, 5 = haut de gamme</p>
      </section>

      <section class="section">
        <label class="interrupteur">
          <span><b>${icone('heart', { taille: 18 })} Coup de cœur</b><small>Un endroit que tu recommandes à coup sûr</small></span>
          <input type="checkbox" name="coupDeCoeur" ${f.coupDeCoeur ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
      </section>

      ${carnetPour ? `
      <section class="section section-client">
        <label class="interrupteur">
          <span><b>${icone('moon', { taille: 18 })} Pour ${esc(prenomClient)}</b><small>Livré dans son carnet ${esc(formatHeure(carnetPour.heure))}, avec tes photos</small></span>
          <input type="checkbox" name="pourClient" ${itemClient || !existant ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
        <label class="champ"><span>Ton mot pour ${esc(prenomClient)} <small>il le lira</small></span><textarea name="motClient" rows="2" placeholder="Ex. : Demande la chambre du 6e, la vue est folle.">${esc(itemClient?.mot)}</textarea></label>
      </section>` : ''}

      <section class="section">
        <h2 class="section-titre">Notes</h2>
        <label class="champ"><span>Ce que fait l'endroit</span><textarea name="description" rows="3" placeholder="Visible par le client">${esc(f.description)}</textarea></label>
        <label class="champ champ-prive"><span>${icone('lock', { taille: 15 })} Mes notes privées <small>jamais montrées au client</small></span><textarea name="notes" rows="3">${esc(f.notes)}</textarea></label>
      </section>

      <details class="section" ${nbAutresContacts ? 'open' : ''}>
        <summary>Plus de détails <small>WhatsApp, Instagram, date de visite…</small></summary>
        <label class="champ"><span>Visité le <small>(rempli tout seul)</small></span><input name="verifieLe" type="date" value="${esc(f.verifieLe)}"></label>
        ${CONTACTS.map(([k, lib]) => `<label class="champ"><span>${esc(lib)}</span><input data-contact="${k}" value="${esc(f.contacts[k])}"></label>`).join('')}
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
      b.innerHTML = `<span class="selecteur-icone">${icone('plus', { taille: 22 })}</span><span class="selecteur-texte"><b>Choisir une catégorie</b><small>Hébergement, resto, activité, trajet…</small></span><span class="chevron">${icone('chevron-right', { taille: 18 })}</span>`;
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
        <label class="champ"><span>Point de départ</span><input name="depart" value="${esc(f.depart)}" placeholder="Ex. : Gare de Bangkok"></label>
        <label class="champ"><span>Point d'arrivée</span><input name="arrivee" value="${esc(f.arrivee)}" placeholder="Ex. : Chiang Mai"></label>
        <label class="champ"><span>Durée</span><input name="duree" value="${esc(f.duree)}" placeholder="Ex. : 11 h"></label>
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
    app.querySelector('#conversion').textContent = cad != null && f.devise !== 'CAD' ? `≈ ${formatCAD(cad)} (taux approximatif)` : '';
  }

  // Seulement 3 choix rapides : la monnaie du pays, le dollar américain et le dollar canadien.
  function majDevises() {
    const locale = DEVISE_DU_PAYS[f.pays];
    const rapides = uniques([locale, f.devise, 'USD', 'CAD']);
    app.querySelector('#devise-actuelle').textContent = f.devise || '';
    app.querySelector('#devises').innerHTML = rapides.map((d) => `
      <button type="button" class="puce-devise ${d === f.devise ? 'choisie' : ''}" data-devise-rapide="${d}">
        <b>${d}</b><small>${esc(d === locale ? `Monnaie locale` : NOMS_DEVISES[d] || '')}</small>
      </button>`).join('') + '<button type="button" class="puce-devise autre" data-devise-autre><b>Autre…</b><small>Toutes les monnaies</small></button>';
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
      placeholder: 'Chercher (ex. : baht, yen…)',
      quandChoisi: (d) => { f.devise = d; majDevises(); },
    });
  }

  champ('montant').addEventListener('input', majConversion);
  app.querySelector('#devises').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.deviseRapide) { f.devise = b.dataset.deviseRapide; majDevises(); } else if (b.hasAttribute('data-devise-autre')) choisirDevise();
  });

  app.querySelector('#ajout-photos').addEventListener('change', async (ev) => {
    for (const fichier of ev.target.files) {
      const blob = await compresserPhoto(fichier);
      f.nouvellesPhotos.push({ cle: db.nouvelId(), blob, url: URL.createObjectURL(blob) });
    }
    ev.target.value = '';
    majPhotos();
  });

  function afficherPosition() {
    const texte = app.querySelector('#texte-position');
    if (!f.lat) { texte.textContent = ''; return; }
    const url = `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`;
    texte.innerHTML = `${icone('locate-fixed', { taille: 15 })} Position ${f.positionAuto ? 'prise automatiquement' : 'enregistrée'}${f.precision ? ` (précision ± ${f.precision} m)` : ''}, <a href="${url}" target="_blank" rel="noopener">Vérifier sur la carte</a>, <button type="button" class="lien" id="retirer-position">Retirer</button>`;
    texte.querySelector('#retirer-position').onclick = () => {
      delete f.lat; delete f.lng; delete f.precision; delete f.positionAuto;
      afficherPosition();
    };
  }

  // auto = true quand on ouvre un nouvel endroit : la position se prend toute seule,
  // parce qu'on est normalement sur place. On peut la retirer si on n'y est pas.
  function prendrePosition(auto = false) {
    const texte = app.querySelector('#texte-position');
    if (!navigator.geolocation) { texte.textContent = 'Position non disponible sur cet appareil.'; return; }
    texte.textContent = auto ? 'Prise de ta position automatiquement…' : 'Recherche de ta position…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!document.body.contains(texte)) return;
        f.lat = +pos.coords.latitude.toFixed(6);
        f.lng = +pos.coords.longitude.toFixed(6);
        f.precision = Math.round(pos.coords.accuracy);
        f.positionAuto = auto;
        afficherPosition();
      },
      (err) => {
        if (!document.body.contains(texte)) return;
        texte.textContent = err.code === 1
          ? "Ton téléphone a refusé l'accès à la position. Va dans Réglages > Confidentialité > Service de localisation et permets-le pour Safari (ou Chrome)."
          : err.code === 3
            ? 'La position prend trop de temps. Sors à découvert ou réessaie dans un instant.'
            : "Impossible d'obtenir ta position pour le moment. Réessaie dans un instant.";
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: auto ? 60000 : 0 },
    );
  }

  app.querySelector('#ma-position').addEventListener('click', () => prendrePosition(false));
  // Écrire un mot pour le client, c'est vouloir lui envoyer l'endroit.
  if (carnetPour) champ('motClient').addEventListener('input', () => { if (champ('motClient').value.trim()) champ('pourClient').checked = true; });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!f.categorie) { toast('Choisis une catégorie'); choisirCategorie(f, majCategorie); return; }
    if (!champ('nom').value.trim()) { toast("Écris le nom de l'endroit"); champ('nom').focus(); return; }
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

    const { nouvellesPhotos, photosRetirees, ...endroit } = f;
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
    if (carnetPour) {
      const c = await db.lire('carnets', carnetPour.id);
      const dans = c.items.some((i) => i.endroitId === endroit.id);
      if (champ('pourClient').checked) { carnets.ajouterItem(c, endroit.id, champ('motClient').value.trim()); envoyeAuClient = !dans; await carnets.enregistrer(c); } else if (dans) { c.items = c.items.filter((i) => i.endroitId !== endroit.id); await carnets.enregistrer(c); }
    }
    // Un endroit déjà dans le carnet d'un client : son carnet se met à jour (photos, textes).
    for (const c of await db.tous('carnets')) if (c.id !== carnetPour?.id && c.items.some((i) => i.endroitId === endroit.id)) carnets.publierBientot(c.id);
    if (envoyeAuClient) { toast(`Ajouté, et en route pour ${prenomClient} (${formatHeure(carnetPour.heure)})`); aller('#/'); return; }
    toast(existant ? 'Modifications enregistrées' : 'Endroit ajouté ✓');
    aller(existant ? `#/endroit/${endroit.id}` : '#/');
  });

  majCategorie();
  majLieu();
  majPuces();
  majPhotos();
  majDevises();
  afficherPosition();
  // Nouvel endroit (sauf un trajet) : position GPS prise automatiquement.
  if (!existant && !f.lat && f.categorie !== 'trajets') prendrePosition(true);
}

// ---------- Voyages sur mesure : le carnet en direct du client ----------
// Raph repère sur place pour un client. Chaque endroit envoyé au client part dans son carnet,
// et lui est livré tous les soirs à la même heure (19 h par défaut), avec un petit mot écrit tout seul.

const FUSEAUX = [
  ['America/Toronto', 'Montréal, Toronto, New York'],
  ['America/Vancouver', 'Vancouver, Los Angeles'],
  ['Europe/Paris', 'Paris, Bruxelles, Genève'],
  ['Europe/London', 'Londres'],
  ['America/Mexico_City', 'Mexico'],
  ['Asia/Tokyo', 'Tokyo, Séoul'],
  ['Asia/Bangkok', 'Bangkok, Hanoï'],
  ['Asia/Singapore', 'Singapour, Manille, Bali'],
  ['Asia/Kathmandu', 'Katmandou'],
  ['Australia/Sydney', 'Sydney'],
];
const HEURES = [7, 8, 9, 12, 17, 18, 19, 20, 21, 22];

function etatPublication(c) {
  const p = c.publication || {};
  if (p.erreur === 'hors-ligne') return { classe: 'attente', texte: 'Pas d’internet : le carnet se met en ligne dès que possible.' };
  if (p.erreur) return { classe: 'erreur', texte: p.erreur };
  if (p.publieLe) return { classe: 'ok', texte: `En ligne, à jour (${new Date(p.publieLe).toLocaleTimeString('fr-CA', { hour: 'numeric', minute: '2-digit' })})` };
  return { classe: 'attente', texte: 'Mise en ligne…' };
}
const enAttente = (c) => c.items.filter((i) => new Date(i.livraison) > Date.now());
const livres = (c) => c.items.filter((i) => new Date(i.livraison) <= Date.now());
const nbChoix = (c) => (c.choix?.coeurs?.length || 0) + Object.keys(c.choix?.dormir || {}).length;
const depuis = (iso) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 2) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
};

async function pageClients() {
  const tous = (await db.tous('carnets')).sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
  const actif = await db.lireReglage('carnetActif', null);
  app.innerHTML = `
    <header class="entete-page">
      <h1>Clients</h1>
      <p>Voyage sur mesure : tu repères sur place, ton client reçoit tes trouvailles chaque soir.</p>
    </header>
    <button class="bouton-principal" id="nouveau-carnet">${icone('plus', { taille: 20 })} Nouveau voyage sur mesure</button>
    <ul class="carnets">
      ${tous.map((c) => `
        <li><a class="carnet-ligne" href="#/carnet/${esc(c.id)}">
          <span class="carnet-avatar">${esc((c.client?.prenom || '?').charAt(0).toUpperCase())}</span>
          <span class="carnet-txt">
            <b>${esc(c.client?.prenom || 'Client sans nom')}${c.ville ? `, ${esc(c.ville)}` : ''}</b>
            <small>${livres(c).length} livré${livres(c).length > 1 ? 's' : ''}${enAttente(c).length ? `, ${enAttente(c).length} pour ce soir` : ''}${nbChoix(c) ? ` · ${icone('heart', { taille: 12 })} ${nbChoix(c)}` : ''}${c.choix?.vuLe ? ` · vu ${esc(depuis(c.choix.vuLe))}` : ''}</small>
          </span>
          ${c.id === actif && c.actif ? '<span class="pastille-direct">En repérage</span>' : !c.actif ? '<span class="pastille-fini">Terminé</span>' : ''}
          ${icone('chevron-right', { taille: 18 })}
        </a></li>`).join('')}
    </ul>
    ${tous.length ? '' : `<p class="vide"><span class="vide-icone">${icone('moon', { taille: 28 })}</span><b>Aucun client pour l’instant</b><span>Crée un voyage sur mesure : ton client aura sa page privée, livrée chaque soir.</span></p>`}
    <a class="bouton-secondaire bouton-bloc lien-demo" href="carnet.html?demo" target="_blank" rel="noopener">${icone('eye', { taille: 18 })} Voir l’exemple : Montréal</a>`;
  app.querySelector('#nouveau-carnet').onclick = async () => {
    const dernier = await db.lireReglage('dernierLieu', {});
    const c = carnets.nouveauCarnet({ ville: dernier.ville || '', pays: dernier.pays || etat.region.pays || '' });
    await db.ecrire('carnets', c);
    await db.ecrireReglage('carnetActif', c.id);
    sync.marquer(sync.cheminCarnet(c.id));
    aller(`#/carnet/${c.id}/reglages`);
  };
}

function ligneItem(c, i, endroit, { attente }) {
  const aime = c.choix?.coeurs?.includes(i.id);
  const dort = Object.values(c.choix?.dormir || {}).includes(i.id);
  return `
    <li class="item-carnet">
      <a class="item-vignette" href="#/endroit/${esc(endroit.id)}">${endroit.photos?.length ? `<img data-photo="${esc(endroit.photos[0])}" alt="">` : iconeCat(endroit.categorie, { taille: 22 })}</a>
      <div class="item-txt">
        <b>${esc(endroit.nom)}</b>
        <small>${esc(endroit.sousType || endroit.type || TAXONOMIE[endroit.categorie]?.nom || '')}${dort ? ` · <span class="choisi-client">${icone('bed-double', { taille: 12 })} son choix</span>` : ''}${aime ? ` · <span class="choisi-client">${icone('heart', { taille: 12 })} aimé</span>` : ''}</small>
        <button type="button" class="lien item-mot" data-mot="${esc(i.id)}">${i.mot ? `« ${esc(i.mot)} »` : '+ Ajouter ton mot pour le client'}</button>
      </div>
      <div class="item-actions">
        ${attente ? `<button type="button" class="petit-rond" data-livrer="${esc(i.id)}" aria-label="Livrer tout de suite" title="Livrer tout de suite">${icone('send', { taille: 16 })}</button>` : ''}
        <button type="button" class="petit-rond" data-retirer="${esc(i.id)}" aria-label="Retirer du carnet" title="Retirer du carnet">${icone('x', { taille: 16 })}</button>
      </div>
    </li>`;
}

async function pageCarnet(id, sous) {
  let c = await db.lire('carnets', id);
  if (!c) return aller('#/clients');
  const actifId = await db.lireReglage('carnetActif', null);
  const prenom = c.client?.prenom || 'ton client';
  const lienClient = carnets.lien(c);
  const parId = new Map(etat.endroits.map((e) => [e.id, e]));
  const items = c.items.filter((i) => parId.has(i.endroitId));
  const attente = items.filter((i) => new Date(i.livraison) > Date.now());
  const faits = items.filter((i) => new Date(i.livraison) <= Date.now());
  const soirs = [...new Set(faits.map((i) => i.livraison))].sort().reverse();
  const pub = etatPublication(c);
  const prochaine = prochaineLivraison(new Date(), c.heure, c.fuseau);
  const ch = c.choix || {};
  const reglagesOuverts = sous === 'reglages' || !c.client?.prenom;

  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="#/clients" aria-label="Retour">${icone('chevron-left')}</a>
      <h1>${esc(c.client?.prenom ? `Voyage de ${c.client.prenom}` : 'Nouveau voyage sur mesure')}</h1>
      <span class="rond vide-rond"></span>
    </header>

    <section class="carnet-entete">
      <p class="carnet-sur">${icone('moon', { taille: 15 })} ${esc(c.ville || 'Ville à choisir')} · livraison chaque soir à ${formatHeure(c.heure)}</p>
      <p class="pub ${pub.classe}" id="pub">${esc(pub.texte)}</p>
      <label class="interrupteur carte-interrupteur">
        <span><b>Je repère pour ${esc(prenom)}</b><small>Chaque nouvel endroit te propose de l’envoyer dans son carnet</small></span>
        <input type="checkbox" id="repere" ${actifId === c.id && c.actif ? 'checked' : ''}>
        <i aria-hidden="true"></i>
      </label>
      <div class="deux">
        <button class="bouton-principal" id="envoyer-lien">${icone('send', { taille: 18 })} Son lien</button>
        <a class="bouton-secondaire" href="${esc(lienClient)}" target="_blank" rel="noopener">${icone('eye', { taille: 18 })} Sa page</a>
      </div>
    </section>

    ${ch.envoyeLe || nbChoix(c) ? `
    <section class="section">
      <h2 class="section-titre">${icone('heart', { taille: 20 })} Ses choix</h2>
      <p class="petit">${ch.vuLe ? `${esc(prenom)} a ouvert son carnet ${esc(depuis(ch.vuLe))}.` : ''} Ses ❤ arrivent tout seuls, il n’a rien à t’envoyer.</p>
      ${Object.entries(ch.dormir || {}).map(([ville, x]) => { const i = c.items.find((y) => y.id === x); const e = i && parId.get(i.endroitId); return e ? `<p class="choix-ligne">${icone('bed-double', { taille: 16 })}<span>Dort à <b>${esc(e.nom)}</b> (${esc(ville)})</span></p>` : ''; }).join('')}
      ${(ch.coeurs || []).map((x) => { const i = c.items.find((y) => y.id === x); const e = i && parId.get(i.endroitId); return e ? `<p class="choix-ligne">${icone('heart', { taille: 16 })}<span>${esc(e.nom)}</span></p>` : ''; }).join('')}
      ${ch.mot ? `<blockquote class="mot-du-client">« ${esc(ch.mot)} »</blockquote>` : ''}
      <button class="lien lien-icone" id="rafraichir-choix">${icone('refresh-cw', { taille: 14 })} Regarder s’il y a du nouveau</button>
    </section>` : ''}

    <section class="section">
      <h2 class="section-titre">${icone('clock', { taille: 20 })} ${esc(dateLongue(prochaine, c.fuseau).replace(/^./, (x) => x.toUpperCase()))}, ${formatHeure(c.heure)}</h2>
      ${attente.length ? `
        <div class="apercu-soir">
          <small>Ce que ${esc(prenom)} lira :</small>
          <p>${esc(motDuSoir(attente.map((i) => parId.get(i.endroitId)).map((e, n) => ({ ...e, id: attente[n].id })), { prenom: c.client?.prenom, raph: c.raph, ville: c.ville, numero: soirs.length + 1, cle: c.id }).texte)}</p>
        </div>
        <ul class="items-carnet">${attente.map((i) => ligneItem(c, i, parId.get(i.endroitId), { attente: true })).join('')}</ul>
        <button class="bouton-secondaire bouton-bloc" id="livrer-tout">${icone('send', { taille: 18 })} Tout livrer maintenant</button>` : `
        <p class="petit">Rien pour ce soir encore. Ajoute un endroit avec le bouton +${actifId === c.id ? '' : ' (active « Je repère » plus haut)'}, ou ajoute un endroit déjà noté.</p>`}
      <button class="bouton-secondaire bouton-bloc" id="ajouter-existant">${icone('plus', { taille: 18 })} Ajouter un endroit déjà noté</button>
    </section>

    ${soirs.length ? `
    <section class="section">
      <h2 class="section-titre">${icone('book-open', { taille: 20 })} Déjà livré</h2>
      ${soirs.map((s) => `
        <p class="soir-titre">${esc(dateLongue(s, c.fuseau))}</p>
        <ul class="items-carnet">${faits.filter((i) => i.livraison === s).map((i) => ligneItem(c, i, parId.get(i.endroitId), { attente: false })).join('')}</ul>`).join('')}
    </section>` : ''}

    <details class="section" id="reglages-carnet" ${reglagesOuverts ? 'open' : ''}>
      <summary>Réglages du voyage <small>prénom, courriel, ville, heure…</small></summary>
      <label class="champ"><span>Prénom du client</span><input id="c-prenom" value="${esc(c.client?.prenom)}" placeholder="Ex. : Marc" autocapitalize="words"></label>
      <label class="champ"><span>Courriel du client <small>pour le petit courriel du soir</small></span><input id="c-courriel" type="email" inputmode="email" value="${esc(c.client?.courriel)}" placeholder="marc@exemple.com" autocapitalize="off"></label>
      <div class="deux">
        <label class="champ"><span>Ville</span><input id="c-ville" value="${esc(c.ville)}" placeholder="Ex. : Montréal"></label>
        <label class="champ"><span>Pays</span><input id="c-pays" value="${esc(c.pays)}" placeholder="Ex. : Canada"></label>
      </div>
      <label class="champ"><span>Ton mot d’accueil <small>en haut de sa page</small></span><textarea id="c-mot" rows="3" placeholder="Salut Marc ! Je suis à Montréal pour toi cette semaine…">${esc(c.mot)}</textarea></label>
      <div class="deux">
        <label class="champ"><span>Heure de livraison</span><select id="c-heure">${HEURES.map((h) => `<option value="${h}" ${h === c.heure ? 'selected' : ''}>${formatHeure(h)}${h === HEURE_PAR_DEFAUT ? ' (conseillé)' : ''}</option>`).join('')}</select></label>
        <label class="champ"><span>Heure de chez lui</span><select id="c-fuseau">${FUSEAUX.map(([f, nom]) => `<option value="${f}" ${f === c.fuseau ? 'selected' : ''}>${esc(nom)}</option>`).join('')}</select></label>
      </div>
      <p class="aide">19 h, c’est après le souper : le moment où on a le temps de rêver. L’heure est celle de chez ton client.</p>
      <label class="interrupteur">
        <span><b>Courriel du soir</b><small>Un petit courriel à l’heure de livraison, seulement s’il y a du nouveau</small></span>
        <input type="checkbox" id="c-courriel-soir" ${c.courrielSoir ? 'checked' : ''}>
        <i aria-hidden="true"></i>
      </label>
      <label class="interrupteur">
        <span><b>Repérage terminé</b><small>Sa page reste ouverte, sans le « En repérage »</small></span>
        <input type="checkbox" id="c-fini" ${c.actif ? '' : 'checked'}>
        <i aria-hidden="true"></i>
      </label>
      <button class="bouton-danger" id="supprimer-carnet">${icone('trash-2', { taille: 18 })} Supprimer ce voyage</button>
    </details>`;

  afficherPhotos(app);
  const recharger = () => pageCarnet(id, reglagesOuverts && app.querySelector('#reglages-carnet')?.open ? 'reglages' : '');
  const sauver = async () => { await carnets.enregistrer(c); };

  const arret = carnets.surPublication((x) => {
    const el = app.querySelector('#pub');
    if (!el) { arret(); return; }
    if (x.id === c.id) { const p = etatPublication(x); el.className = `pub ${p.classe}`; el.textContent = p.texte; }
  });
  if (!c.publication?.publieLe || c.publication?.erreur) carnets.publierBientot(c.id, 300);

  app.querySelector('#repere').onchange = async (ev) => {
    if (ev.target.checked) { c.actif = true; await db.ecrireReglage('carnetActif', c.id); await sauver(); toast(`Tes prochains endroits iront à ${prenom}`); } else { await db.ecrireReglage('carnetActif', null); toast('Repérage en pause'); }
  };
  app.querySelector('#envoyer-lien').onclick = async () => {
    const texte = `${c.client?.prenom ? `Salut ${c.client.prenom} ! ` : ''}Voici ton carnet de voyage${c.ville ? ` pour ${c.ville}` : ''}. Chaque soir à ${formatHeure(c.heure)}, tu y trouveras ce que j’ai repéré pour toi dans la journée. Garde-le sur ton écran d’accueil. Ce lien est juste pour toi :`;
    try {
      if (navigator.share) await navigator.share({ text: texte, url: lienClient });
      else { await navigator.clipboard.writeText(`${texte} ${lienClient}`); toast('Lien copié : colle-le dans un message'); }
    } catch (_) { /* annulé */ }
  };
  const rafraichir = app.querySelector('#rafraichir-choix');
  if (rafraichir) rafraichir.onclick = async () => { await carnets.lireChoix(c); toast('À jour'); recharger(); };

  app.querySelector('#ajouter-existant').onclick = () => {
    const deja = new Set(c.items.map((i) => i.endroitId));
    const proposes = [...etat.endroits].filter((e) => !deja.has(e.id) && !e.contributeurId).sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
    if (!proposes.length) { toast('Tous tes endroits sont déjà dans ce carnet'); return; }
    choisirDansListe({
      titre: `Pour ${prenom}`,
      valeurs: proposes.map((e) => e.id),
      etiquette: (x) => { const e = parId.get(x); return [e.nom, e.ville].filter(Boolean).join(', '); },
      placeholder: 'Chercher un endroit',
      quandChoisi: async (x) => { carnets.ajouterItem(c, x); await sauver(); toast(`Ajouté pour ce soir, ${formatHeure(c.heure)}`); recharger(); },
    });
  };

  app.querySelectorAll('[data-livrer]').forEach((b) => {
    b.onclick = async () => {
      const i = c.items.find((x) => x.id === b.dataset.livrer);
      i.livraison = new Date().toISOString();
      await sauver();
      toast('Livré : il le voit déjà');
      recharger();
    };
  });
  const toutLivrer = app.querySelector('#livrer-tout');
  if (toutLivrer) {
    toutLivrer.onclick = async () => {
      const t = new Date().toISOString();
      for (const i of c.items) if (new Date(i.livraison) > Date.now()) i.livraison = t;
      await sauver();
      toast('Tout est livré');
      recharger();
    };
  }
  app.querySelectorAll('[data-retirer]').forEach((b) => {
    b.onclick = async () => {
      c.items = c.items.filter((x) => x.id !== b.dataset.retirer);
      await sauver();
      toast('Retiré du carnet');
      recharger();
    };
  });
  app.querySelectorAll('[data-mot]').forEach((b) => {
    b.onclick = () => {
      const i = c.items.find((x) => x.id === b.dataset.mot);
      ouvrirFeuille(`
        ${enteteFeuille('Ton mot pour le client')}
        <div class="feuille-corps">
          <p class="petit">Une ou deux phrases, comme si tu lui parlais. C’est ce qui rend le carnet unique.</p>
          <textarea id="mot-item" rows="4" class="zone-mot" placeholder="Ex. : Demande la chambre du 6e, la vue est folle.">${esc(i.mot)}</textarea>
          <button type="button" class="bouton-principal" id="ok-mot">Enregistrer</button>
        </div>`, async (ev) => {
        if (!ev.target.closest('#ok-mot')) return;
        i.mot = feuille.querySelector('#mot-item').value.trim();
        await sauver();
        fermerFeuille();
        recharger();
      });
      feuille.querySelector('#mot-item').focus();
    };
  });

  // Réglages : enregistrés dès qu'on les change.
  const champ = (sel) => app.querySelector(sel);
  const surChange = (sel, fn) => { champ(sel).addEventListener('change', async () => { fn(champ(sel)); await sauver(); }); };
  surChange('#c-prenom', (el) => { c.client = { ...c.client, prenom: el.value.trim() }; });
  surChange('#c-courriel', (el) => { c.client = { ...c.client, courriel: el.value.trim() }; });
  surChange('#c-ville', (el) => { c.ville = el.value.trim(); });
  surChange('#c-pays', (el) => { c.pays = el.value.trim(); });
  surChange('#c-mot', (el) => { c.mot = el.value.trim(); });
  surChange('#c-courriel-soir', (el) => { c.courrielSoir = el.checked; });
  surChange('#c-fini', (el) => { c.actif = !el.checked; });
  const changerHeure = () => {
    // Ce qui attend la livraison suit la nouvelle heure.
    for (const i of c.items) if (new Date(i.livraison) > Date.now()) i.livraison = prochaineLivraison(new Date(), c.heure, c.fuseau).toISOString();
  };
  surChange('#c-heure', (el) => { c.heure = +el.value; changerHeure(); });
  surChange('#c-fuseau', (el) => { c.fuseau = el.value; changerHeure(); });
  ['#c-heure', '#c-fuseau', '#c-fini'].forEach((s) => champ(s).addEventListener('change', () => setTimeout(recharger, 50)));
  app.querySelector('#supprimer-carnet').onclick = async (ev) => {
    const b = ev.currentTarget;
    if (!b.dataset.confirmer) { b.dataset.confirmer = '1'; b.textContent = `Toucher encore pour supprimer (la page de ${prenom} ne s’ouvrira plus)`; return; }
    await db.effacer('carnets', c.id);
    if (actifId === c.id) await db.ecrireReglage('carnetActif', null);
    sync.marquer(sync.cheminCarnet(c.id));
    toast('Voyage supprimé');
    aller('#/clients');
  };

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
      <p>Combien de jours tu conseilles dans chaque ville. Ça servira pour créer les itinéraires.</p>
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
            <textarea rows="2" placeholder="Notes sur la ville (privé)" data-champ="notes">${esc(info.notes)}</textarea>
          </div>`;
      }).join('') || `<p class="vide"><span class="vide-icone">${icone('building-2', { taille: 28 })}</span><b>Pas encore de villes</b><span>Elles apparaîtront ici dès que tu auras ajouté des endroits.</span></p>`}
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

// ---------- Réglages ----------
async function pageReglages() {
  const derniere = await db.lireReglage('derniereSauvegarde', null);
  const nbPhotos = etat.endroits.reduce((n, e) => n + (e.photos?.length || 0), 0);
  const envoi = await sync.etat();
  const cfg = await sync.lireConfig();
  const r = etat.region;
  const paysProposes = paysDuContinent(r.continent);
  app.innerHTML = `
    <header class="entete-page"><h1>Réglages</h1></header>

    <section class="section">
      <h2 class="section-titre">${icone('map-pin', { taille: 20 })} Où je suis</h2>
      <p class="petit">Pour aller plus vite : l'appli te propose seulement les pays de ce continent, et remplit le pays toute seule.</p>
      <label class="champ"><span>Continent</span><select id="continent">
        <option value="">Tous les continents</option>
        ${Object.keys(CONTINENTS).map((c) => `<option ${c === r.continent ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select></label>
      <label class="champ"><span>Pays où je suis en ce moment</span><select id="pays-actuel">
        <option value="">Je change souvent de pays</option>
        ${paysProposes.map((p) => `<option ${p === r.pays ? 'selected' : ''}>${esc(p)}</option>`).join('')}
      </select></label>
    </section>

    <section class="section" id="section-envoi">
      <h2 class="section-titre">${icone('refresh-cw', { taille: 20 })} Envoi automatique au Studio</h2>
      ${cfg ? `
        <p class="etat-branche">${icone('check', { taille: 16 })}<span>Branché au dossier <b>${esc(cfg.depot)}</b></span></p>
        <p class="petit">Chaque endroit part tout seul au Studio quand tu l'enregistres. Sans internet, il attend et part dès que possible.</p>
        <p class="petit" id="detail-envoi">${esc(texteDetailEnvoi(envoi))}</p>
        <button class="bouton-principal" id="envoyer-maintenant">Envoyer maintenant</button>
        <button class="lien" id="debrancher">Débrancher</button>` : `
        <p class="petit">Tes endroits et tes photos partent tout seuls vers ton dossier GitHub privé, et le Studio les reçoit. C'est aussi ta copie de sauvegarde.</p>
        <label class="champ"><span>Nom du dossier GitHub privé</span><input id="depot" value="appli-voyage-donnees" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <label class="champ"><span>Clé d'accès GitHub</span><input id="jeton" type="password" placeholder="github_pat_…" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <p class="aide" id="message-envoi"></p>
        <button class="bouton-principal" id="brancher">Brancher</button>`}
    </section>

    <section class="section">
      <h2 class="section-titre">${icone('route', { taille: 20 })} Studio (générateur de voyages)</h2>
      <p class="petit">Pour assembler tes endroits en voyages. Fait pour l'ordinateur, mais marche aussi ici.</p>
      <a class="bouton-secondaire bouton-bloc" href="studio/">Ouvrir le Studio</a>
    </section>
    ${pwa.dejaInstallee() ? '' : `
    <section class="section">
      <h2 class="section-titre">${icone('download', { taille: 20 })} Mettre l'appli sur cet appareil</h2>
      <p class="petit">Pour l'ouvrir d'un clic, comme une vraie appli, sur ton cell ou ton ordi.</p>
      <button class="bouton-secondaire bouton-bloc" id="installer">Installer l'appli</button>
      <p class="petit" id="aide-installer" hidden>${pwa.EXPLICATION.fr}</p>
    </section>`}

    <section class="section">
      <h2 class="section-titre">${icone('save', { taille: 20 })} Copie dans un fichier</h2>
      <p class="petit">${cfg ? 'Pas nécessaire avec l\'envoi automatique, mais possible au besoin.' : 'Sans envoi automatique, tes données sont seulement sur ce téléphone : fais une copie de temps en temps.'} ${etat.endroits.length} endroits, ${nbPhotos} photos. ${derniere ? `Dernière copie : ${new Date(derniere).toLocaleDateString('fr-CA')}.` : ''}</p>
      <button class="bouton-secondaire bouton-bloc" id="exporter">Faire une copie</button>
      <label class="bouton-secondaire bouton-bloc">Restaurer une copie<input type="file" accept=".json,application/json" id="importer" hidden></label>
    </section>

    <section class="section">
      <h2 class="section-titre">${icone('coins', { taille: 20 })} Taux de change</h2>
      <p class="petit">Valeur approximative de 1 unité en dollars canadiens. Sert seulement à afficher l'équivalent en $ CA.</p>
      <div class="taux">
        ${trierFr(Object.keys(etat.taux)).filter((d) => d !== 'CAD').map((d) => `<label>${d}<input type="text" inputmode="decimal" data-devise="${d}" value="${etat.taux[d]}"></label>`).join('')}
      </div>
    </section>`;

  const boutonInstaller = app.querySelector('#installer');
  if (boutonInstaller) boutonInstaller.onclick = async () => { if (!(await pwa.installer())) app.querySelector('#aide-installer').hidden = false; };

  const sauverRegion = async () => { await db.ecrireReglage('region', etat.region); };
  app.querySelector('#continent').onchange = async (ev) => {
    etat.region.continent = ev.target.value;
    if (etat.region.pays && !paysDuContinent(etat.region.continent).includes(etat.region.pays)) etat.region.pays = '';
    await sauverRegion();
    pageReglages();
  };
  app.querySelector('#pays-actuel').onchange = async (ev) => {
    etat.region.pays = ev.target.value;
    await sauverRegion();
    toast(etat.region.pays ? `Pays : ${etat.region.pays}` : 'Pays libre');
  };

  if (cfg) {
    const detail = app.querySelector('#detail-envoi');
    const arret = sync.surChangement((e) => { if (document.body.contains(detail)) detail.textContent = texteDetailEnvoi(e); else arret(); });
    app.querySelector('#envoyer-maintenant').onclick = async (ev) => {
      ev.target.disabled = true;
      await sync.toutMarquer();
      const e = await sync.envoyer();
      ev.target.disabled = false;
      toast(e.erreur ? "L'envoi n'a pas marché, réessaie plus tard" : e.horsLigne ? 'Pas d\'internet : ça partira plus tard' : 'Tout est envoyé au Studio');
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
      await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix']).catch(() => {});
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

  app.querySelectorAll('[data-devise]').forEach((input) => {
    input.onchange = async () => {
      const v = parseFloat(input.value.replace(',', '.'));
      if (!(v > 0)) return;
      etat.taux[input.dataset.devise] = v;
      const perso = await db.lireReglage('taux', {});
      perso[input.dataset.devise] = v;
      await db.ecrireReglage('taux', perso);
      toast('Taux enregistré');
    };
  });
}

function texteDetailEnvoi(e) {
  const quand = e.dernier ? `Dernier envoi : ${new Date(e.dernier).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}.` : '';
  if (!e.enAttente) return `Tout est envoyé. ${quand}`;
  if (e.horsLigne) return `${e.enAttente} élément(s) en attente d'internet. ${quand}`;
  if (e.erreur) return `${e.enAttente} élément(s) en attente : GitHub ne répond pas (${e.erreur}). Ça réessaiera tout seul. ${quand}`;
  return `Envoi en cours : ${e.enAttente} élément(s)… ${quand}`;
}

// Au démarrage : recevoir ce qui manque (ex. : nouveau téléphone), puis envoyer ce qui attend.
async function demarrerEnvoi() {
  if (!(await sync.lireConfig())) return;
  try {
    const { nouveaux } = await sync.recevoir(['endroits', 'villes', 'photos', 'carnets', 'carnets-choix']);
    if (nouveaux) { await charger(); if (!location.hash || location.hash === '#/') router(); }
  } catch (_) { /* on réessaiera */ }
  sync.envoyerBientot(300);
}

// ---------- Démarrage ----------
document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = icone(el.dataset.ico, { taille: +(el.dataset.taille || 24), epaisseur: 1.8 }); });
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
