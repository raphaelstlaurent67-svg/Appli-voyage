import { TAXONOMIE, TAUX_PAR_DEFAUT, DEVISE_DU_PAYS, CONTACTS, NOMS_DEVISES, DEVISES_FAVORITES } from './taxonomie.js';
import { VILLES, PAYS_ASIE, trierFr } from './lieux.js';
import * as db from './db.js';

// ---------- État de l'appli ----------
const etat = {
  endroits: [],
  villes: [],
  taux: { ...TAUX_PAR_DEFAUT },
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

// Pays et villes connus : la liste de l'Asie plus ceux déjà utilisés.
function listePays() {
  return trierFr(uniques([...PAYS_ASIE, ...etat.endroits.map((e) => e.pays)]));
}
function listeVilles(pays) {
  return trierFr(uniques([...(VILLES[pays] || []), ...etat.endroits.filter((e) => e.pays === pays).map((e) => e.ville)]));
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
    ${retour ? `<button type="button" class="rond" data-retour="${retour}" aria-label="Retour">‹</button>` : '<span class="rond vide-rond"></span>'}
    <h2>${titre}</h2>
    <button type="button" class="rond" data-fermer aria-label="Fermer">✕</button>
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
          <span class="tuile-icone">${c.icone}</span>
          <span class="tuile-nom">${esc(c.nom)}</span>
          <span class="tuile-sous">${Object.keys(c.types).length ? `${Object.keys(c.types).length} types` : 'Pas sûr où le classer'}</span>
        </button>`).join('')}
    </div>`, clic);

  const etape2 = () => {
    const c = TAXONOMIE[cat];
    ouvrirFeuille(`
      ${enteteFeuille(`${c.icone} ${esc(c.nom)}`, '1')}
      <div class="tuiles" style="--c:${c.couleur}">
        ${Object.entries(c.types).map(([t, sous]) => `
          <button type="button" class="tuile ${cat === f.categorie && t === f.type ? 'choisie' : ''}" data-type="${esc(t)}">
            <span class="tuile-nom">${esc(t)}</span>
            <span class="tuile-sous">${esc(sous.slice(0, 3).join(', '))}${sous.length > 3 ? '…' : ''}</span>
          </button>`).join('')}
      </div>`, clic);
  };

  const etape3 = () => {
    const c = TAXONOMIE[cat];
    const sous = c.types[type] || [];
    ouvrirFeuille(`
      ${enteteFeuille(`${c.icone} ${esc(type)}`, '2')}
      <div class="tuiles tuiles-petites" style="--c:${c.couleur}">
        ${sous.map((s) => `
          <button type="button" class="tuile ${type === f.type && s === f.sousType ? 'choisie' : ''}" data-sous="${esc(s)}">
            <span class="tuile-nom">${esc(s)}</span>
          </button>`).join('')}
        <button type="button" class="tuile tuile-autre" data-autre><span class="tuile-nom">+ Autre</span></button>
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
      ${valeurs.map((v) => `<li data-nom="${esc(etiquette(v))}"><button type="button" class="ligne ${v === choisie ? 'choisie' : ''}" data-valeur="${esc(v)}">${esc(etiquette(v))}${v === choisie ? '<span>✓</span>' : ''}</button></li>`).join('')}
      ${ajout ? '<li><button type="button" class="ligne ligne-ajout" data-ajouter="" hidden>+ Ajouter « <b></b> »</button></li>' : ''}
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
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === nom));
  window.scrollTo(0, 0);
  if (page === 'ajouter') return pageFormulaire(null);
  if (page === 'modifier') return pageFormulaire(id);
  if (page === 'endroit') return pageFiche(id);
  if (page === 'villes') return pageVilles();
  if (page === 'reglages') return pageReglages();
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
  const rappel = etat.endroits.length >= 5 && (jours === null || jours >= 7);

  app.innerHTML = `
    <header class="hero">
      <p class="hero-sur">Carnet de voyage · Asie</p>
      <h1>Mes endroits</h1>
      <p class="hero-stats">${etat.endroits.length} endroit${etat.endroits.length > 1 ? 's' : ''} · ${nbPays} pays</p>
      <div class="hero-recherche">
        <input type="search" id="recherche" placeholder="Chercher un nom, une ville…" value="${esc(f.recherche)}" autocomplete="off">
      </div>
    </header>
    ${rappel ? `<a class="alerte" href="#/reglages">💾 ${jours === null ? "Tu n'as jamais fait de copie de sauvegarde." : `Dernière copie de sauvegarde il y a ${jours} jours.`} Touche ici pour en faire une.</a>` : ''}
    <div class="defile-cats" role="tablist">
      <button class="cat-puce ${!f.categorie ? 'choisie' : ''}" data-cat-filtre="">Tout <span>${etat.endroits.length}</span></button>
      ${Object.entries(TAXONOMIE).map(([k, c]) => `<button class="cat-puce ${f.categorie === k ? 'choisie' : ''}" style="--c:${c.couleur}" data-cat-filtre="${k}">${c.icone} ${esc(c.nom)} <span>${compteCat(k)}</span></button>`).join('')}
    </div>
    <div class="barre-outils">
      <button class="bouton-secondaire ${nbFiltres ? 'actif' : ''}" id="btn-filtres">⚙︎ Filtres${nbFiltres ? ` · ${nbFiltres}` : ''}</button>
      <select id="tri" aria-label="Trier">
        ${options([['recent', 'Plus récents'], ['prixCroissant', 'Moins cher'], ['prixDecroissant', 'Plus cher'], ['luxe', 'Plus luxueux'], ['coeur', 'Coups de cœur'], ['nom', 'Nom (A à Z)']], f.tri, 'Trier par…')}
      </select>
    </div>
    <div class="filtres ${nbFiltres ? 'ouvert' : ''}" id="filtres">
      <select data-filtre="pays">${options(paysConnus, f.pays, 'Tous les pays')}</select>
      <select data-filtre="ville">${options(villesConnues, f.ville, 'Toutes les villes')}</select>
      <select data-filtre="prix">${options([['1', '$'], ['2', '$$'], ['3', '$$$'], ['4', '$$$$']], f.prix, 'Tous les budgets')}</select>
      <select data-filtre="type" ${f.categorie ? '' : 'disabled'}>${options(typesConnus, f.type, f.categorie ? 'Tous les types' : 'Type : choisis une catégorie')}</select>
      ${nbFiltres ? '<button class="lien" id="effacer-filtres">Effacer les filtres</button>' : ''}
    </div>
    <ul class="cartes" id="cartes"></ul>`;

  const remplir = () => {
    const l = endroitsFiltres();
    const ul = app.querySelector('#cartes');
    ul.innerHTML = l.map(carte).join('') || `<li class="vide">${etat.endroits.length
      ? 'Aucun endroit ne correspond à ta recherche.'
      : '<span class="vide-icone">🧭</span><b>Ton carnet est vide.</b><br>Touche le bouton <b>+</b> pour ajouter ton premier endroit.'}</li>`;
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
  const choisie = app.querySelector('.cat-puce.choisie');
  if (choisie && choisie.dataset.catFiltre) choisie.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function carte(e) {
  const cat = TAXONOMIE[e.categorie] || { icone: '📍', couleur: '#64748b', nom: '' };
  const sousTitre = [e.type, e.sousType].filter(Boolean).join(' · ');
  const lieu = e.categorie === 'trajets' && (e.depart || e.arrivee)
    ? `${esc(e.depart || '?')} → ${esc(e.arrivee || '?')}`
    : esc([e.ville, e.pays].filter(Boolean).join(', '));
  return `
    <li>
      <a class="carte" href="#/endroit/${esc(e.id)}" style="--c:${cat.couleur}">
        <div class="carte-image ${e.photos?.length ? '' : 'sans-photo'}">
          ${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : `<span class="carte-icone">${cat.icone}</span>`}
          <span class="carte-cat">${cat.icone} ${esc(cat.nom)}</span>
          ${e.coupDeCoeur ? '<span class="carte-coeur" aria-label="Coup de cœur">❤</span>' : ''}
        </div>
        <div class="carte-corps">
          <div class="carte-nom">${esc(e.nom)}</div>
          ${sousTitre ? `<div class="carte-sous">${esc(sousTitre)}</div>` : ''}
          <div class="carte-bas">
            <span class="carte-lieu">${lieu ? `📍 ${lieu}` : ''}</span>
            <span class="carte-cotes">${e.prix ? `<b>${dollars(e.prix)}</b>` : ''}${e.confort ? `<span>${e.confort}★</span>` : ''}</span>
          </div>
        </div>
      </a>
    </li>`;
}

// ---------- Fiche d'un endroit ----------
async function pageFiche(id) {
  const e = etat.endroits.find((x) => x.id === id);
  if (!e) return aller('#/');
  const cat = TAXONOMIE[e.categorie] || { icone: '📍', couleur: '#64748b', nom: '' };
  const cad = enCAD(e.montant, e.devise);
  const carteUrl = lienCarte(e);
  const tel = e.telephone ? e.telephone.replace(/[^\d+]/g, '') : '';
  const contacts = CONTACTS.filter(([k]) => e.contacts?.[k]).map(([k, lib]) => {
    const lien = lienContact(k, e.contacts[k]);
    return `<li><span class="etiquette">${esc(lib)}</span>${lien ? `<a href="${esc(lien)}" target="_blank" rel="noopener">${esc(e.contacts[k])}</a>` : `<span>${esc(e.contacts[k])}</span>`}</li>`;
  }).join('');
  const photos = e.photos || [];

  app.innerHTML = `
    <div class="fiche-haut" style="--c:${cat.couleur}">
      ${photos.length ? `<div class="galerie">${photos.map((p) => `<img data-photo="${esc(p)}" alt="">`).join('')}</div>` : `<div class="fiche-icone">${cat.icone}</div>`}
      <div class="fiche-boutons">
        <a class="rond rond-flottant" href="#/" aria-label="Retour">‹</a>
        <a class="pilule-flottante" href="#/modifier/${esc(e.id)}">Modifier</a>
      </div>
      ${photos.length > 1 ? `<span class="galerie-compte">${photos.length} photos</span>` : ''}
    </div>
    <article class="fiche" style="--c:${cat.couleur}">
      <div class="chemin"><span class="chemin-cat">${cat.icone} ${esc(cat.nom)}</span>${e.type ? ` › ${esc(e.type)}` : ''}${e.sousType ? ` › ${esc(e.sousType)}` : ''}</div>
      <h1>${esc(e.nom)}${e.coupDeCoeur ? ' <span class="coeur">❤</span>' : ''}</h1>
      <p class="lieu">${esc([e.ville, e.pays].filter(Boolean).join(', '))}</p>

      <div class="pastilles">
        ${e.prix ? `<span class="pastille"><small>Prix</small>${dollars(e.prix)}</span>` : ''}
        ${e.confort ? `<span class="pastille"><small>Confort</small>${e.confort}/5</span>` : ''}
        ${e.montant ? `<span class="pastille"><small>Prix réel</small>${esc(e.montant)} ${esc(e.devise)}${cad != null && e.devise !== 'CAD' ? ` <em>≈ ${formatCAD(cad)}</em>` : ''}</span>` : ''}
      </div>

      <div class="actions">
        ${tel ? `<a class="action" href="tel:${esc(tel)}"><span>📞</span>Appeler</a>` : ''}
        ${carteUrl ? `<a class="action" href="${esc(carteUrl)}" target="_blank" rel="noopener"><span>🗺️</span>Carte</a>` : ''}
        ${e.contacts?.whatsapp ? `<a class="action" href="${esc(lienContact('whatsapp', e.contacts.whatsapp))}" target="_blank" rel="noopener"><span>💬</span>WhatsApp</a>` : ''}
        ${e.contacts?.site ? `<a class="action" href="${esc(lienWeb(e.contacts.site))}" target="_blank" rel="noopener"><span>🌐</span>Site web</a>` : ''}
      </div>

      ${e.categorie === 'trajets' && (e.depart || e.arrivee || e.duree) ? `
        <section class="bloc-fiche">
          <h2>Le trajet</h2>
          <div class="trajet">
            <div><span class="etiquette">Départ</span><b>${esc(e.depart || '—')}</b></div>
            <div class="trajet-fleche">→<small>${esc(e.duree || '')}</small></div>
            <div><span class="etiquette">Arrivée</span><b>${esc(e.arrivee || '—')}</b></div>
          </div>
        </section>` : ''}

      ${e.description ? `<section class="bloc-fiche"><h2>Ce que fait l'endroit</h2><p class="texte">${esc(e.description)}</p></section>` : ''}

      <section class="bloc-fiche">
        <h2>Coordonnées</h2>
        <ul class="details">
          ${e.adresse ? `<li><span class="etiquette">Adresse</span><span>${esc(e.adresse)}</span></li>` : ''}
          ${e.telephone ? `<li><span class="etiquette">Téléphone</span><a href="tel:${esc(tel)}">${esc(e.telephone)}</a></li>` : ''}
          ${carteUrl ? `<li><span class="etiquette">Google Maps</span><a href="${esc(carteUrl)}" target="_blank" rel="noopener">Ouvrir la carte</a></li>` : ''}
          ${contacts}
        </ul>
      </section>

      ${e.notes ? `<section class="bloc-fiche"><h2>🔒 Mes notes privées</h2><p class="texte notes">${esc(e.notes)}</p></section>` : ''}

      <p class="petit">${e.verifieLe ? `✓ Vérifié le ${esc(e.verifieLe)}` : 'Pas de date de vérification'}</p>
      <button class="bouton-danger" id="supprimer">Supprimer cet endroit</button>
      <div class="confirmer" id="confirmer" hidden>
        <p>Supprimer « ${esc(e.nom)} » ? C'est définitif.</p>
        <button class="bouton-danger plein" id="oui-supprimer">Oui, supprimer</button>
        <button class="bouton-secondaire" id="non-supprimer">Annuler</button>
      </div>
    </article>`;

  afficherPhotos(app);
  const demander = (oui) => { app.querySelector('#supprimer').hidden = oui; app.querySelector('#confirmer').hidden = !oui; };
  app.querySelector('#supprimer').onclick = () => demander(true);
  app.querySelector('#non-supprimer').onclick = () => demander(false);
  app.querySelector('#oui-supprimer').onclick = async () => {
    for (const p of e.photos || []) await db.effacer('photos', p);
    await db.effacer('endroits', e.id);
    etat.endroits = etat.endroits.filter((x) => x.id !== e.id);
    toast('Endroit supprimé');
    aller('#/');
  };
}

// ---------- Formulaire d'ajout / modification ----------
async function pageFormulaire(id) {
  const existant = id ? etat.endroits.find((x) => x.id === id) : null;
  if (id && !existant) return aller('#/');
  const dernierLieu = await db.lireReglage('dernierLieu', {});
  const f = existant
    ? structuredClone(existant)
    : { id: db.nouvelId(), pays: dernierLieu.pays || '', ville: dernierLieu.ville || '', devise: dernierLieu.devise || DEVISE_DU_PAYS[dernierLieu.pays] || 'CAD', contacts: {}, photos: [], verifieLe: aujourdhui(), ...(brouillon || {}) };
  brouillon = null;
  f.contacts = f.contacts || {};
  f.photos = f.photos || [];
  f.nouvellesPhotos = []; // { cle, blob, url }
  f.photosRetirees = [];
  const nbAutresContacts = CONTACTS.filter(([k]) => f.contacts[k]).length;

  app.innerHTML = `
    <header class="entete-form">
      <a class="rond" href="${existant ? `#/endroit/${esc(f.id)}` : '#/'}" aria-label="Annuler">✕</a>
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
        <h2 class="section-titre">Où ?</h2>
        <div class="deux">
          <button type="button" class="selecteur" id="choix-pays"></button>
          <button type="button" class="selecteur" id="choix-ville"></button>
        </div>
        <div id="zone-trajet"></div>
        <label class="champ"><span>Adresse</span><input name="adresse" value="${esc(f.adresse)}" placeholder="Rue, quartier…"></label>
        <label class="champ"><span>Téléphone</span><input name="telephone" type="tel" value="${esc(f.telephone)}" placeholder="+66 …"></label>
        <label class="champ"><span>Lien Google Maps</span><input name="lienMaps" type="url" inputmode="url" value="${esc(f.lienMaps)}" placeholder="Colle le lien partagé par Google Maps"></label>
        <button type="button" class="bouton-secondaire petit-bouton" id="ma-position">📍 Enregistrer ma position actuelle</button>
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
        <p class="aide">1 = simple · 5 = haut de gamme</p>
      </section>

      <section class="section">
        <label class="interrupteur">
          <span><b>❤ Coup de cœur</b><small>Un endroit que tu recommandes à coup sûr</small></span>
          <input type="checkbox" name="coupDeCoeur" ${f.coupDeCoeur ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
      </section>

      <section class="section">
        <h2 class="section-titre">Photos</h2>
        <div class="photos" id="photos"></div>
        <label class="bouton-secondaire bouton-photo">📷 Ajouter des photos<input type="file" accept="image/*" multiple id="ajout-photos" hidden></label>
      </section>

      <section class="section">
        <h2 class="section-titre">Notes</h2>
        <label class="champ"><span>Ce que fait l'endroit</span><textarea name="description" rows="3" placeholder="Visible par le client">${esc(f.description)}</textarea></label>
        <label class="champ champ-prive"><span>🔒 Mes notes privées <small>jamais montrées au client</small></span><textarea name="notes" rows="3">${esc(f.notes)}</textarea></label>
        <label class="champ"><span>Vérifié le</span><input name="verifieLe" type="date" value="${esc(f.verifieLe)}"></label>
      </section>

      <details class="section" ${nbAutresContacts ? 'open' : ''}>
        <summary>Plus de détails <small>WhatsApp, Instagram, WeChat…</small></summary>
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
      b.innerHTML = '<span class="selecteur-icone">＋</span><span class="selecteur-texte"><b>Choisir une catégorie</b><small>Hébergement, resto, activité, trajet…</small></span><span class="chevron">›</span>';
      b.style.removeProperty('--c');
      b.classList.add('a-remplir');
    } else {
      b.style.setProperty('--c', c.couleur);
      b.classList.remove('a-remplir');
      b.innerHTML = `<span class="selecteur-icone">${c.icone}</span><span class="selecteur-texte"><b>${esc([f.type, f.sousType].filter(Boolean).join(' › ') || c.nom)}</b><small>${f.type ? esc(c.nom) : 'Catégorie'}</small></span><span class="chevron">Changer</span>`;
    }
    majTrajet();
  }

  function majLieu() {
    app.querySelector('#choix-pays').innerHTML = `<span class="selecteur-texte"><small>Pays</small><b class="${f.pays ? '' : 'vide-txt'}">${esc(f.pays || 'Choisir')}</b></span><span class="chevron">›</span>`;
    app.querySelector('#choix-ville').innerHTML = `<span class="selecteur-texte"><small>Ville</small><b class="${f.ville ? '' : 'vide-txt'}">${esc(f.ville || 'Choisir')}</b></span><span class="chevron">›</span>`;
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
      titre: `Ville · ${f.pays}`,
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
      <div class="photo"><img src="${esc(p.url)}" alt=""><button type="button" data-retirer-photo="${esc(p.cle)}" aria-label="Retirer">✕</button></div>`).join('');
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
      etiquette: (d) => `${d} · ${NOMS_DEVISES[d] || d}`,
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
    texte.innerHTML = `✓ Position enregistrée${f.precision ? ` (précision ± ${f.precision} m)` : ''} · <a href="${url}" target="_blank" rel="noopener">Vérifier sur la carte</a>`;
  }

  app.querySelector('#ma-position').addEventListener('click', () => {
    const texte = app.querySelector('#texte-position');
    if (!navigator.geolocation) { texte.textContent = 'Position non disponible sur cet appareil.'; return; }
    texte.textContent = 'Recherche de ta position…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        f.lat = +pos.coords.latitude.toFixed(6);
        f.lng = +pos.coords.longitude.toFixed(6);
        f.precision = Math.round(pos.coords.accuracy);
        afficherPosition();
      },
      (err) => {
        texte.textContent = err.code === 1
          ? "Ton téléphone a refusé l'accès à la position. Va dans Réglages > Confidentialité > Service de localisation et permets-le pour Safari (ou Chrome)."
          : err.code === 3
            ? 'La position prend trop de temps. Sors à découvert ou réessaie dans un instant.'
            : "Impossible d'obtenir ta position pour le moment. Réessaie dans un instant.";
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });

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
    await db.ecrireReglage('dernierLieu', { pays: endroit.pays, ville: endroit.ville, devise: endroit.devise });
    db.demanderStockagePersistant();
    toast(existant ? 'Modifications enregistrées' : 'Endroit ajouté ✓');
    aller(existant ? `#/endroit/${endroit.id}` : '#/');
  });

  majCategorie();
  majLieu();
  majPuces();
  majPhotos();
  majDevises();
  afficherPosition();
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
      }).join('') || '<p class="vide"><span class="vide-icone">🏙️</span>Les villes apparaîtront ici dès que tu auras ajouté des endroits.</p>'}
    </div>`;

  app.querySelectorAll('[data-ville]').forEach((bloc) => {
    const g = groupes.get(bloc.dataset.ville);
    const sauver = async (cleChamp, valeur) => {
      const v = etat.villes.find((x) => x.id === g.id) || { id: g.id, pays: g.pays, ville: g.ville };
      v[cleChamp] = valeur;
      v.modifieLe = new Date().toISOString();
      await db.ecrire('villes', v);
      etat.villes = etat.villes.filter((x) => x.id !== v.id).concat(v);
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
  app.innerHTML = `
    <header class="entete-page"><h1>Réglages</h1></header>

    <section class="section">
      <h2 class="section-titre">💾 Copie de sauvegarde</h2>
      <p>Pour l'instant, tes données sont gardées <b>sur ce téléphone seulement</b>. Fais une copie de sauvegarde régulièrement et garde-la dans ton Google Drive, iCloud ou tes courriels.</p>
      <p class="petit">${etat.endroits.length} endroits, ${nbPhotos} photos. ${derniere ? `Dernière copie : ${new Date(derniere).toLocaleDateString('fr-CA')}.` : 'Aucune copie faite pour le moment.'}</p>
      <button class="bouton-principal" id="exporter">Faire une copie de sauvegarde</button>
      <label class="bouton-secondaire bouton-bloc">Restaurer une copie<input type="file" accept=".json,application/json" id="importer" hidden></label>
    </section>

    <section class="section">
      <h2 class="section-titre">💱 Taux de change</h2>
      <p class="petit">Valeur approximative de 1 unité en dollars canadiens. Sert seulement à afficher l'équivalent en $ CA.</p>
      <div class="taux">
        ${trierFr(Object.keys(etat.taux)).filter((d) => d !== 'CAD').map((d) => `<label>${d}<input type="text" inputmode="decimal" data-devise="${d}" value="${etat.taux[d]}"></label>`).join('')}
      </div>
    </section>

    <section class="section">
      <h2 class="section-titre">📱 Installer sur l'écran d'accueil</h2>
      <p class="petit">iPhone : dans Safari, touche le bouton Partager puis « Sur l'écran d'accueil ». Android : dans Chrome, menu ⋮ puis « Installer l'application ».</p>
    </section>`;

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

// ---------- Démarrage ----------
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
charger().then(router).catch((err) => {
  app.innerHTML = `<p class="vide">Erreur au démarrage : ${esc(err.message)}</p>`;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* l'appli marche quand même */ });
}
