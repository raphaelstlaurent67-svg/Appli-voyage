import { TAXONOMIE, PAYS, TAUX_PAR_DEFAUT, DEVISE_DU_PAYS, CONTACTS } from './taxonomie.js';
import * as db from './db.js';

// ---------- État de l'appli ----------
const etat = {
  endroits: [],
  villes: [],
  taux: { ...TAUX_PAR_DEFAUT },
  filtres: { recherche: '', pays: '', ville: '', prix: '', categorie: '', type: '', tri: 'recent' },
  form: null, // endroit en cours de saisie
};
const urlsPhotos = new Map(); // id photo -> URL d'affichage

const app = document.getElementById('app');

// ---------- Petits outils ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dollars = (n) => (n ? '$'.repeat(n) : '');
const etoiles = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
const cleVille = (pays, ville) => `${(pays || '').trim().toLowerCase()}|${(ville || '').trim().toLowerCase()}`;

function toast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  clearTimeout(toast.minuterie);
  toast.minuterie = setTimeout(() => t.classList.remove('visible'), 2500);
}

function enCAD(montant, devise) {
  const m = parseFloat(montant);
  const t = etat.taux[devise];
  if (!m || !t) return null;
  return m * t;
}

function formatCAD(v) {
  if (v == null) return '';
  return v < 10 ? `${v.toFixed(2)} $ CA` : `${Math.round(v).toLocaleString('fr-CA')} $ CA`;
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
    case 'site': case 'reservation': case 'facebook': case 'googleMaps': return lienWeb(v);
    case 'instagram': return /^https?:/i.test(v) ? v : `https://instagram.com/${v.replace('@', '')}`;
    default: return '';
  }
}

function lienCarte(e) {
  if (e.lat && e.lng) return `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`;
  const q = [e.nom, e.adresse, e.ville, e.pays].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

async function urlPhoto(id) {
  if (urlsPhotos.has(id)) return urlsPhotos.get(id);
  const p = await db.lire('photos', id);
  if (!p) return '';
  const url = URL.createObjectURL(p.blob);
  urlsPhotos.set(id, url);
  return url;
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

// ---------- Chargement ----------
async function charger() {
  etat.endroits = await db.tous('endroits');
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
  const [, page, id] = (location.hash || '#/').split('/');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === (page || 'liste')));
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
  const q = f.recherche.trim().toLowerCase();
  let liste = etat.endroits.filter((e) =>
    (!f.pays || e.pays === f.pays) &&
    (!f.ville || e.ville === f.ville) &&
    (!f.prix || String(e.prix) === f.prix) &&
    (!f.categorie || e.categorie === f.categorie) &&
    (!f.type || e.type === f.type) &&
    (!q || [e.nom, e.ville, e.pays, e.type, e.sousType, e.description, e.notes].join(' ').toLowerCase().includes(q)));

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
  const paysConnus = [...new Set(etat.endroits.map((e) => e.pays).filter(Boolean))].sort();
  const villesConnues = [...new Set(etat.endroits.filter((e) => !f.pays || e.pays === f.pays).map((e) => e.ville).filter(Boolean))].sort();
  const typesConnus = f.categorie ? Object.keys(TAXONOMIE[f.categorie]?.types || {}) : [];
  const nbFiltres = ['pays', 'ville', 'prix', 'categorie', 'type'].filter((k) => f[k]).length;
  const liste = endroitsFiltres();

  const derniere = await db.lireReglage('derniereSauvegarde', null);
  const jours = derniere ? Math.floor((Date.now() - new Date(derniere)) / 864e5) : null;
  const rappel = etat.endroits.length >= 5 && (jours === null || jours >= 7);

  app.innerHTML = `
    <header class="entete">
      <h1>Mes endroits <span class="compte">${etat.endroits.length}</span></h1>
    </header>
    ${rappel ? `<a class="alerte" href="#/reglages">💾 ${jours === null ? "Tu n'as jamais fait de copie de sauvegarde." : `Dernière copie de sauvegarde il y a ${jours} jours.`} Touche ici pour en faire une.</a>` : ''}
    <div class="barre-recherche">
      <input type="search" id="recherche" placeholder="Chercher un nom, une ville…" value="${esc(f.recherche)}">
    </div>
    <div class="barre-outils">
      <button class="bouton-secondaire" id="btn-filtres">Filtres${nbFiltres ? ` (${nbFiltres})` : ''}</button>
      <select id="tri" aria-label="Trier">
        ${options([['recent', 'Plus récents'], ['prixCroissant', 'Prix : moins cher'], ['prixDecroissant', 'Prix : plus cher'], ['luxe', 'Plus luxueux'], ['coeur', 'Coups de cœur'], ['nom', 'Nom (A à Z)']], f.tri, 'Trier par…')}
      </select>
    </div>
    <div class="filtres ${nbFiltres ? 'ouvert' : ''}" id="filtres">
      <select data-filtre="pays">${options(paysConnus, f.pays, 'Tous les pays')}</select>
      <select data-filtre="ville">${options(villesConnues, f.ville, 'Toutes les villes')}</select>
      <select data-filtre="prix">${options([['1', '$'], ['2', '$$'], ['3', '$$$'], ['4', '$$$$']], f.prix, 'Tous les budgets')}</select>
      <select data-filtre="categorie">${options(Object.entries(TAXONOMIE).map(([k, c]) => [k, `${c.icone} ${c.nom}`]), f.categorie, 'Toutes les catégories')}</select>
      <select data-filtre="type" ${f.categorie ? '' : 'disabled'}>${options(typesConnus, f.type, 'Tous les types')}</select>
      ${nbFiltres ? '<button class="lien" id="effacer-filtres">Effacer les filtres</button>' : ''}
    </div>
    <ul class="cartes">
      ${liste.map(carte).join('') || `<li class="vide">${etat.endroits.length ? 'Aucun endroit ne correspond à ta recherche.' : 'Aucun endroit pour le moment.<br>Touche le bouton <b>+</b> pour ajouter ton premier.'}</li>`}
    </ul>`;

  // Miniatures des photos
  for (const e of liste) {
    if (e.photos?.length) {
      const img = app.querySelector(`[data-mini="${e.id}"]`);
      if (img) img.src = await urlPhoto(e.photos[0]);
    }
  }

  const rafraichir = () => { sauverFiltres(); pageListe(); };
  app.querySelector('#recherche').addEventListener('input', (ev) => {
    etat.filtres.recherche = ev.target.value;
    const ul = app.querySelector('.cartes');
    const l = endroitsFiltres();
    ul.innerHTML = l.map(carte).join('') || '<li class="vide">Aucun endroit ne correspond à ta recherche.</li>';
    l.forEach(async (e) => { if (e.photos?.length) { const img = ul.querySelector(`[data-mini="${e.id}"]`); if (img) img.src = await urlPhoto(e.photos[0]); } });
  });
  app.querySelector('#btn-filtres').onclick = () => app.querySelector('#filtres').classList.toggle('ouvert');
  app.querySelector('#tri').onchange = (ev) => { etat.filtres.tri = ev.target.value || 'recent'; rafraichir(); };
  app.querySelectorAll('[data-filtre]').forEach((s) => {
    s.onchange = () => {
      const k = s.dataset.filtre;
      etat.filtres[k] = s.value;
      if (k === 'pays') etat.filtres.ville = '';
      if (k === 'categorie') etat.filtres.type = '';
      rafraichir();
    };
  });
  const eff = app.querySelector('#effacer-filtres');
  if (eff) eff.onclick = () => { Object.assign(etat.filtres, { pays: '', ville: '', prix: '', categorie: '', type: '' }); rafraichir(); };
}

function carte(e) {
  const cat = TAXONOMIE[e.categorie];
  const sousTitre = [e.type, e.sousType].filter(Boolean).join(' · ');
  const lieu = e.categorie === 'trajets' && (e.depart || e.arrivee)
    ? `${esc(e.depart || '?')} → ${esc(e.arrivee || '?')}`
    : esc([e.ville, e.pays].filter(Boolean).join(', '));
  return `
    <li>
      <a class="carte" href="#/endroit/${esc(e.id)}">
        ${e.photos?.length ? `<img class="mini" data-mini="${esc(e.id)}" alt="">` : `<div class="mini icone">${cat?.icone || '📍'}</div>`}
        <div class="infos">
          <div class="nom">${e.coupDeCoeur ? '<span class="coeur">❤</span> ' : ''}${esc(e.nom)}</div>
          <div class="sous">${esc(sousTitre)}</div>
          <div class="sous">${lieu}</div>
        </div>
        <div class="cotes">
          <span class="prix">${dollars(e.prix)}</span>
          <span class="confort">${e.confort ? `${e.confort}★` : ''}</span>
        </div>
      </a>
    </li>`;
}

// ---------- Fiche d'un endroit ----------
async function pageFiche(id) {
  const e = etat.endroits.find((x) => x.id === id);
  if (!e) return aller('#/');
  const cat = TAXONOMIE[e.categorie];
  const cad = enCAD(e.montant, e.devise);
  const contacts = CONTACTS.filter(([k]) => e.contacts?.[k]).map(([k, lib]) => {
    const lien = lienContact(k, e.contacts[k]);
    return `<li><span class="etiquette">${esc(lib)}</span>${lien ? `<a href="${esc(lien)}" target="_blank" rel="noopener">${esc(e.contacts[k])}</a>` : esc(e.contacts[k])}</li>`;
  }).join('');
  const carteUrl = lienCarte(e);

  app.innerHTML = `
    <header class="entete">
      <a class="retour" href="#/">‹ Retour</a>
      <a class="bouton-secondaire" href="#/modifier/${esc(e.id)}">Modifier</a>
    </header>
    <div class="galerie">${(e.photos || []).map((p) => `<img data-photo="${esc(p)}" alt="">`).join('')}</div>
    <article class="fiche">
      <div class="chemin">${cat ? `${cat.icone} ${esc(cat.nom)}` : ''} ${e.type ? `› ${esc(e.type)}` : ''} ${e.sousType ? `› ${esc(e.sousType)}` : ''}</div>
      <h1>${e.coupDeCoeur ? '<span class="coeur">❤</span> ' : ''}${esc(e.nom)}</h1>
      <p class="lieu">${esc([e.ville, e.pays].filter(Boolean).join(', '))}</p>
      <div class="pastilles">
        ${e.prix ? `<span class="pastille">Prix ${dollars(e.prix)}</span>` : ''}
        ${e.confort ? `<span class="pastille">Confort ${etoiles(e.confort)}</span>` : ''}
        ${e.montant ? `<span class="pastille">${esc(e.montant)} ${esc(e.devise)}${cad != null && e.devise !== 'CAD' ? ` ≈ ${formatCAD(cad)}` : ''}</span>` : ''}
      </div>

      ${e.categorie === 'trajets' ? `
        <h2>Le trajet</h2>
        <ul class="details">
          ${e.depart ? `<li><span class="etiquette">Départ</span>${esc(e.depart)}</li>` : ''}
          ${e.arrivee ? `<li><span class="etiquette">Arrivée</span>${esc(e.arrivee)}</li>` : ''}
          ${e.duree ? `<li><span class="etiquette">Durée</span>${esc(e.duree)}</li>` : ''}
        </ul>` : ''}

      ${e.description ? `<h2>Description</h2><p class="texte">${esc(e.description)}</p>` : ''}

      <h2>Coordonnées</h2>
      <ul class="details">
        ${e.adresse ? `<li><span class="etiquette">Adresse</span>${esc(e.adresse)}</li>` : ''}
        ${carteUrl ? `<li><span class="etiquette">Carte</span><a href="${esc(carteUrl)}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a></li>` : ''}
        ${e.telephone ? `<li><span class="etiquette">Téléphone</span><a href="tel:${esc(e.telephone.replace(/[^\d+]/g, ''))}">${esc(e.telephone)}</a></li>` : ''}
        ${contacts}
      </ul>

      ${e.notes ? `<h2>🔒 Mes notes privées</h2><p class="texte notes">${esc(e.notes)}</p>` : ''}

      <p class="petit">${e.verifieLe ? `Vérifié le ${esc(e.verifieLe)}` : 'Pas de date de vérification'}</p>
      <button class="bouton-danger" id="supprimer">Supprimer cet endroit</button>
      <div class="confirmer" id="confirmer" hidden>
        <p>Supprimer « ${esc(e.nom)} » ? C'est définitif.</p>
        <button class="bouton-danger" id="oui-supprimer">Oui, supprimer</button>
        <button class="bouton-secondaire" id="non-supprimer">Annuler</button>
      </div>
    </article>`;

  for (const img of app.querySelectorAll('[data-photo]')) img.src = await urlPhoto(img.dataset.photo);
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
    : { id: db.nouvelId(), pays: dernierLieu.pays || '', ville: dernierLieu.ville || '', devise: dernierLieu.devise || DEVISE_DU_PAYS[dernierLieu.pays] || 'CAD', contacts: {}, photos: [], verifieLe: aujourdhui() };
  f.contacts = f.contacts || {};
  f.photos = f.photos || [];
  f.nouvellesPhotos = []; // { cle, blob, url }
  f.photosRetirees = [];
  etat.form = f;

  const villesDuPays = () => [...new Set(etat.endroits.filter((e) => !f.pays || e.pays === f.pays).map((e) => e.ville).filter(Boolean))].sort();
  const paysListe = [...new Set([...PAYS, ...etat.endroits.map((e) => e.pays).filter(Boolean)])];

  app.innerHTML = `
    <header class="entete">
      <a class="retour" href="${existant ? `#/endroit/${esc(f.id)}` : '#/'}">‹ Annuler</a>
      <h1 class="titre-petit">${existant ? 'Modifier' : 'Nouvel endroit'}</h1>
    </header>
    <form id="formulaire" class="formulaire" autocomplete="off">
      <fieldset>
        <legend>Catégorie</legend>
        <div class="puces" id="categories">
          ${Object.entries(TAXONOMIE).map(([k, c]) => `<button type="button" class="puce" data-categorie="${k}">${c.icone} ${esc(c.nom)}</button>`).join('')}
        </div>
        <div id="zone-type"></div>
        <div id="zone-soustype"></div>
      </fieldset>

      <label>Nom *<input name="nom" required value="${esc(f.nom)}" placeholder="Ex. : Chez Mama Noi"></label>

      <div class="deux">
        <label>Pays<input name="pays" list="liste-pays" value="${esc(f.pays)}"></label>
        <label>Ville<input name="ville" list="liste-villes" value="${esc(f.ville)}"></label>
      </div>
      <datalist id="liste-pays">${paysListe.map((p) => `<option value="${esc(p)}">`).join('')}</datalist>
      <datalist id="liste-villes"></datalist>

      <div id="zone-trajet"></div>

      <fieldset>
        <legend>Prix</legend>
        <div class="puces" id="prix">${[1, 2, 3, 4].map((n) => `<button type="button" class="puce" data-prix="${n}">${dollars(n)}</button>`).join('')}</div>
      </fieldset>
      <fieldset>
        <legend>Luxe / confort</legend>
        <div class="puces" id="confort">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="puce" data-confort="${n}">${n}★</button>`).join('')}</div>
        <p class="aide">1 = simple, 5 = haut de gamme. Séparé du prix.</p>
      </fieldset>

      <label class="interrupteur"><input type="checkbox" name="coupDeCoeur" ${f.coupDeCoeur ? 'checked' : ''}><span>❤ Coup de cœur</span></label>

      <fieldset>
        <legend>Photos</legend>
        <div class="photos" id="photos"></div>
        <label class="bouton-secondaire bouton-photo">📷 Ajouter des photos<input type="file" accept="image/*" multiple id="ajout-photos" hidden></label>
      </fieldset>

      <details ${existant ? 'open' : ''}>
        <summary>Plus de détails (adresse, contacts, notes…)</summary>

        <label>Adresse<input name="adresse" value="${esc(f.adresse)}"></label>
        <div class="position">
          <button type="button" class="bouton-secondaire" id="ma-position">📍 Utiliser ma position actuelle</button>
          <span id="texte-position" class="petit">${f.lat ? `Position enregistrée (${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)})` : ''}</span>
        </div>

        <label>Téléphone<input name="telephone" type="tel" value="${esc(f.telephone)}"></label>
        ${CONTACTS.map(([k, lib]) => `<label>${esc(lib)}<input data-contact="${k}" value="${esc(f.contacts[k])}"></label>`).join('')}

        <label>Ce que fait l'endroit<textarea name="description" rows="3">${esc(f.description)}</textarea></label>

        <fieldset>
          <legend>Prix réel</legend>
          <div class="deux">
            <label>Montant<input name="montant" type="number" inputmode="decimal" step="any" min="0" value="${esc(f.montant)}"></label>
            <label>Monnaie<select name="devise">${Object.keys(etat.taux).map((d) => `<option ${d === f.devise ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
          </div>
          <p class="aide" id="conversion"></p>
        </fieldset>

        <label>🔒 Mes notes privées (jamais montrées au client)<textarea name="notes" rows="3">${esc(f.notes)}</textarea></label>
        <label>Vérifié le<input name="verifieLe" type="date" value="${esc(f.verifieLe)}"></label>
      </details>

      <div class="barre-enregistrer">
        <button type="submit" class="bouton-principal">Enregistrer</button>
      </div>
    </form>`;

  const form = app.querySelector('#formulaire');
  const champ = (n) => form.elements[n];

  // Catégorie > type > sous-type
  function majCategories() {
    app.querySelectorAll('[data-categorie]').forEach((b) => b.classList.toggle('choisie', b.dataset.categorie === f.categorie));
    const cat = TAXONOMIE[f.categorie];
    const zoneType = app.querySelector('#zone-type');
    const zoneSous = app.querySelector('#zone-soustype');
    if (!cat) { zoneType.innerHTML = ''; zoneSous.innerHTML = ''; majTrajet(); return; }
    const types = Object.keys(cat.types);
    if (f.type && !types.includes(f.type)) types.push(f.type);
    zoneType.innerHTML = `<p class="sous-legende">Type</p><div class="puces">${types.map((t) => `<button type="button" class="puce ${t === f.type ? 'choisie' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
    if (f.type) {
      const sous = [...(cat.types[f.type] || [])];
      if (f.sousType && !sous.includes(f.sousType)) sous.push(f.sousType);
      zoneSous.innerHTML = `<p class="sous-legende">Sous-type</p><div class="puces">${sous.map((s) => `<button type="button" class="puce ${s === f.sousType ? 'choisie' : ''}" data-soustype="${esc(s)}">${esc(s)}</button>`).join('')}<button type="button" class="puce autre" data-autre>+ Autre</button></div>
        <div class="autre-saisie" id="autre-saisie" hidden><input id="autre-nom" placeholder="Nom du sous-type"><button type="button" class="bouton-secondaire" data-autre-ok>OK</button></div>`;
    } else zoneSous.innerHTML = '';
    majTrajet();
  }

  function majTrajet() {
    const zone = app.querySelector('#zone-trajet');
    if (f.categorie !== 'trajets') { zone.innerHTML = ''; return; }
    zone.innerHTML = `
      <fieldset>
        <legend>Le trajet</legend>
        <label>Point de départ<input name="depart" value="${esc(f.depart)}" placeholder="Ex. : Gare de Bangkok"></label>
        <label>Point d'arrivée<input name="arrivee" value="${esc(f.arrivee)}" placeholder="Ex. : Chiang Mai"></label>
        <label>Durée<input name="duree" value="${esc(f.duree)}" placeholder="Ex. : 11 h"></label>
        <p class="aide">Le prix approximatif va dans « Prix réel », plus bas.</p>
      </fieldset>`;
    zone.querySelectorAll('input').forEach((i) => { i.oninput = () => { f[i.name] = i.value; }; });
  }

  app.querySelector('#formulaire').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.categorie) {
      if (f.categorie !== b.dataset.categorie) { f.categorie = b.dataset.categorie; f.type = ''; f.sousType = ''; }
      majCategories();
    } else if (b.dataset.type) {
      if (f.type !== b.dataset.type) { f.type = b.dataset.type; f.sousType = ''; }
      majCategories();
    } else if (b.dataset.soustype) {
      f.sousType = f.sousType === b.dataset.soustype ? '' : b.dataset.soustype;
      majCategories();
    } else if (b.hasAttribute('data-autre')) {
      app.querySelector('#autre-saisie').hidden = false;
      app.querySelector('#autre-nom').focus();
    } else if (b.hasAttribute('data-autre-ok')) {
      const nom = app.querySelector('#autre-nom').value.trim();
      if (nom) { f.sousType = nom; majCategories(); }
    } else if (b.dataset.prix) {
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

  form.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.id === 'autre-nom') {
      ev.preventDefault();
      app.querySelector('[data-autre-ok]').click();
    }
  });

  function majPuces() {
    app.querySelectorAll('[data-prix]').forEach((b) => b.classList.toggle('choisie', +b.dataset.prix === f.prix));
    app.querySelectorAll('[data-confort]').forEach((b) => b.classList.toggle('choisie', +b.dataset.confort === f.confort));
  }

  async function majPhotos() {
    const zone = app.querySelector('#photos');
    const existantes = await Promise.all(f.photos.map(async (p) => ({ cle: p, url: await urlPhoto(p) })));
    zone.innerHTML = [...existantes, ...f.nouvellesPhotos].map((p) => `
      <div class="photo"><img src="${esc(p.url)}" alt=""><button type="button" data-retirer-photo="${esc(p.cle)}" aria-label="Retirer">✕</button></div>`).join('');
  }

  function majVilles() {
    app.querySelector('#liste-villes').innerHTML = villesDuPays().map((v) => `<option value="${esc(v)}">`).join('');
  }

  function majConversion() {
    const cad = enCAD(champ('montant').value, champ('devise').value);
    app.querySelector('#conversion').textContent = cad != null && champ('devise').value !== 'CAD' ? `≈ ${formatCAD(cad)} (taux approximatif)` : '';
  }

  champ('pays').addEventListener('change', () => {
    f.pays = champ('pays').value.trim();
    majVilles();
    const d = DEVISE_DU_PAYS[f.pays];
    if (d && !champ('montant').value) { champ('devise').value = d; majConversion(); }
  });
  champ('montant').addEventListener('input', majConversion);
  champ('devise').addEventListener('change', majConversion);

  app.querySelector('#ajout-photos').addEventListener('change', async (ev) => {
    for (const fichier of ev.target.files) {
      const blob = await compresserPhoto(fichier);
      f.nouvellesPhotos.push({ cle: db.nouvelId(), blob, url: URL.createObjectURL(blob) });
    }
    ev.target.value = '';
    majPhotos();
  });

  app.querySelector('#ma-position').addEventListener('click', () => {
    const texte = app.querySelector('#texte-position');
    if (!navigator.geolocation) { texte.textContent = 'Position non disponible sur cet appareil.'; return; }
    texte.textContent = 'Recherche de ta position…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        f.lat = +pos.coords.latitude.toFixed(6);
        f.lng = +pos.coords.longitude.toFixed(6);
        texte.textContent = `Position enregistrée (${f.lat.toFixed(5)}, ${f.lng.toFixed(5)})`;
      },
      () => { texte.textContent = "Impossible d'obtenir ta position. Vérifie que la localisation est permise."; },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!f.categorie) { toast('Choisis une catégorie'); app.querySelector('#categories').scrollIntoView({ behavior: 'smooth' }); return; }
    const bouton = form.querySelector('[type=submit]');
    bouton.disabled = true;

    for (const n of ['nom', 'pays', 'ville', 'adresse', 'telephone', 'description', 'montant', 'devise', 'notes', 'verifieLe']) f[n] = champ(n).value.trim();
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

  majCategories();
  majPuces();
  majPhotos();
  majVilles();
  majConversion();
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
    <header class="entete"><h1>Villes</h1></header>
    <p class="intro">Combien de jours tu conseilles de passer dans chaque ville. C'est une suggestion pour les futurs itinéraires.</p>
    <div class="villes">
      ${liste.map((v) => {
        const info = etat.villes.find((x) => x.id === v.id) || {};
        const titre = v.pays !== paysCourant ? `<h2>${esc(v.pays || 'Pays inconnu')}</h2>` : '';
        paysCourant = v.pays;
        return `${titre}
          <div class="ville" data-ville="${esc(v.id)}">
            <div class="ville-tete"><b>${esc(v.ville)}</b><span class="petit">${v.nb} endroit${v.nb > 1 ? 's' : ''}</span></div>
            <label class="jours">Jours recommandés
              <input type="number" inputmode="decimal" min="0" step="0.5" value="${esc(info.joursRecommandes ?? '')}" data-champ="joursRecommandes">
            </label>
            <textarea rows="2" placeholder="Notes sur la ville (privé)" data-champ="notes">${esc(info.notes)}</textarea>
          </div>`;
      }).join('') || '<p class="vide">Les villes apparaîtront ici dès que tu auras ajouté des endroits.</p>'}
    </div>`;

  app.querySelectorAll('[data-ville]').forEach((bloc) => {
    const g = groupes.get(bloc.dataset.ville);
    bloc.querySelectorAll('[data-champ]').forEach((input) => {
      input.addEventListener('change', async () => {
        const v = etat.villes.find((x) => x.id === g.id) || { id: g.id, pays: g.pays, ville: g.ville };
        v[input.dataset.champ] = input.dataset.champ === 'joursRecommandes' ? (input.value === '' ? null : +input.value) : input.value.trim();
        v.modifieLe = new Date().toISOString();
        await db.ecrire('villes', v);
        etat.villes = etat.villes.filter((x) => x.id !== v.id).concat(v);
        toast('Enregistré');
      });
    });
  });
}

// ---------- Réglages ----------
async function pageReglages() {
  const derniere = await db.lireReglage('derniereSauvegarde', null);
  const nbPhotos = etat.endroits.reduce((n, e) => n + (e.photos?.length || 0), 0);
  app.innerHTML = `
    <header class="entete"><h1>Réglages</h1></header>

    <section class="bloc">
      <h2>💾 Copie de sauvegarde</h2>
      <p>Pour l'instant, tes données sont gardées <b>sur ce téléphone seulement</b>. Fais une copie de sauvegarde régulièrement et garde-la dans ton Google Drive, iCloud ou tes courriels.</p>
      <p class="petit">${etat.endroits.length} endroits, ${nbPhotos} photos. ${derniere ? `Dernière copie : ${new Date(derniere).toLocaleDateString('fr-CA')}.` : 'Aucune copie faite pour le moment.'}</p>
      <button class="bouton-principal" id="exporter">Faire une copie de sauvegarde</button>
      <label class="bouton-secondaire bouton-bloc">Restaurer une copie<input type="file" accept=".json,application/json" id="importer" hidden></label>
    </section>

    <section class="bloc">
      <h2>💱 Taux de change</h2>
      <p class="petit">Valeur approximative de 1 unité en dollars canadiens. Sert seulement à afficher l'équivalent en $ CA.</p>
      <div class="taux">
        ${Object.entries(etat.taux).filter(([d]) => d !== 'CAD').map(([d, t]) => `<label>${d}<input type="number" step="any" min="0" inputmode="decimal" data-devise="${d}" value="${t}"></label>`).join('')}
      </div>
    </section>

    <section class="bloc">
      <h2>📱 Installer sur l'écran d'accueil</h2>
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
      const v = parseFloat(input.value);
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
charger().then(router).catch((err) => {
  app.innerHTML = `<p class="vide">Erreur au démarrage : ${esc(err.message)}</p>`;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* l'appli marche quand même */ });
}
