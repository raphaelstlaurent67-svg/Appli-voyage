// Générateur de voyages : assembler des endroits en un voyage jour par jour.
// Utilisé par Raph seulement, surtout sur l'ordinateur. Les endroits viennent du fichier
// de sauvegarde du cellulaire (Mes données > Importer). Tout reste sur cet appareil.

import { TAXONOMIE, TAUX_PAR_DEFAUT } from './taxonomie.js';
import * as db from './db.js';

const etat = { endroits: [], voyages: [], taux: { ...TAUX_PAR_DEFAUT } };
const urlsPhotos = new Map();
const app = document.getElementById('app');

// ---------- Petits outils ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dollars = (n) => (n ? '$'.repeat(n) : '');
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uniques = (l) => [...new Set(l.filter(Boolean))];
const trier = (l) => [...l].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
const categorie = (e) => TAXONOMIE[e?.categorie] || TAXONOMIE.autre;
const endroit = (id) => etat.endroits.find((e) => e.id === id);

function toast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  clearTimeout(toast.minuterie);
  toast.minuterie = setTimeout(() => t.classList.remove('visible'), 2500);
}

function enCAD(montant, devise) {
  const m = parseFloat(String(montant ?? '').replace(',', '.'));
  const t = etat.taux[devise];
  return m && t ? m * t : null;
}
const formatCAD = (v) => `${Math.round(v || 0).toLocaleString('fr-CA')} $ CA`;

function dateDuJour(v, index) {
  if (!v.dateDebut) return '';
  const d = new Date(`${v.dateDebut}T12:00:00`);
  d.setDate(d.getDate() + index);
  return d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long' });
}

function lienWeb(v) {
  const t = String(v || '').trim();
  return !t ? '' : /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
function lienCarte(e) {
  if (e.lienMaps) return lienWeb(e.lienMaps);
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
async function afficherPhotos(racine) {
  for (const img of racine.querySelectorAll('img[data-photo]')) {
    const url = await urlPhoto(img.dataset.photo);
    if (url) img.src = url; else img.remove();
  }
}

// ---------- Données ----------
async function charger() {
  etat.endroits = await db.tous('endroits');
  etat.voyages = await db.tous('voyages');
  etat.taux = { ...TAUX_PAR_DEFAUT, ...(await db.lireReglage('taux', {})) };
}

async function sauver(v) {
  v.modifieLe = new Date().toISOString();
  await db.ecrire('voyages', v);
  etat.voyages = etat.voyages.filter((x) => x.id !== v.id).concat(v);
}

function nouveauVoyage() {
  const v = {
    id: db.nouvelId(), titre: 'Nouveau voyage', client: '', dateDebut: '', voyageurs: 2, style: 'moyen',
    prixVente: '', introClient: '', notesPrivees: '', modele: false,
    etapes: [], jours: [], creeLe: new Date().toISOString(),
  };
  return v;
}

function dupliquer(v, { commeModele = false } = {}) {
  const copie = structuredClone(v);
  copie.id = db.nouvelId();
  copie.titre = commeModele ? v.titre : `${v.titre} (copie)`;
  copie.modele = commeModele;
  copie.client = '';
  copie.creeLe = new Date().toISOString();
  return copie;
}

// Les jours viennent des étapes : une étape de 3 jours à Kyoto = 3 jours dans le voyage.
// Quand on raccourcit une étape, les endroits des jours retirés vont dans son dernier jour.
function synchroniserJours(v) {
  const anciens = v.jours || [];
  const nouveaux = [];
  for (const et of v.etapes) {
    const n = Math.max(1, Math.min(60, parseInt(et.jours, 10) || 1));
    et.jours = n;
    const ceux = [];
    for (let r = 0; r < n; r++) {
      const j = anciens.find((x) => x.etapeId === et.id && x.rang === r) || { id: db.nouvelId(), etapeId: et.id, rang: r, titre: '', items: [] };
      ceux.push(j);
    }
    for (const j of anciens) {
      if (j.etapeId === et.id && j.rang >= n) ceux[n - 1].items.push(...j.items);
    }
    nouveaux.push(...ceux);
  }
  v.jours = nouveaux;
}

const etapeDe = (v, jour) => v.etapes.find((et) => et.id === jour.etapeId) || {};
const itineraire = (v) => v.etapes.map((et) => et.ville || et.pays).filter(Boolean).join(' → ');
const nbEndroits = (v) => v.jours.reduce((n, j) => n + j.items.length, 0);

function coutVoyage(v) {
  let total = 0;
  let sansPrix = 0;
  for (const j of v.jours) {
    for (const it of j.items) {
      const e = endroit(it.endroitId);
      const c = e ? enCAD(e.montant, e.devise) : null;
      if (c == null) sansPrix++; else total += c;
    }
  }
  return { total, sansPrix };
}

// ---------- Navigation ----------
async function router() {
  const [, page, id, mode] = (location.hash || '#/').split('/');
  document.body.dataset.page = page || 'voyages';
  document.querySelectorAll('.onglets a[data-page]').forEach((a) => a.classList.toggle('actif', a.dataset.page === (page || 'voyages')));
  window.scrollTo(0, 0);
  if (page === 'voyage') return pageEditeur(id);
  if (page === 'client') return pageClient(id, mode === 'apercu' ? 'apercu' : 'complet');
  if (page === 'donnees') return pageDonnees();
  return pageVoyages();
}

// ---------- Liste des voyages ----------
function carteVoyage(v) {
  const nbJours = v.jours.length;
  return `
    <li class="carte-voyage">
      <a href="#/voyage/${esc(v.id)}" class="carte-voyage-lien">
        <span class="carte-voyage-titre">${esc(v.titre)}</span>
        <span class="petit">${esc(itineraire(v) || 'Aucune étape')}</span>
        <span class="petit">${nbJours} jour${nbJours > 1 ? 's' : ''} · ${nbEndroits(v)} endroits${v.client ? ` · ${esc(v.client)}` : ''}</span>
      </a>
      <div class="carte-voyage-actions">
        <button class="bouton-secondaire petit-bouton" data-dupliquer="${esc(v.id)}">${v.modele ? 'Utiliser ce modèle' : 'Dupliquer'}</button>
      </div>
    </li>`;
}

function pageVoyages() {
  const tries = [...etat.voyages].sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
  const modeles = tries.filter((v) => v.modele);
  const clients = tries.filter((v) => !v.modele);
  app.innerHTML = `
    <section class="page-voyages">
      <div class="entete-ligne">
        <div>
          <h1>Mes voyages</h1>
          <p class="petit">${etat.endroits.length} endroits disponibles pour bâtir tes voyages.</p>
        </div>
        <button class="bouton-principal" id="nouveau">+ Nouveau voyage</button>
      </div>
      ${etat.endroits.length ? '' : `<p class="alerte">Aucun endroit pour l'instant. Va dans <a href="#/donnees">Mes données</a> pour importer le fichier de sauvegarde de ton cellulaire.</p>`}
      <h2>Modèles réutilisables</h2>
      <p class="petit">Un voyage type (ex. « Japon 14 jours ») que tu adaptes pour chaque client.</p>
      <ul class="grille-voyages">${modeles.map(carteVoyage).join('') || '<li class="vide">Aucun modèle. Ouvre un voyage et coche « Modèle réutilisable ».</li>'}</ul>
      <h2>Voyages clients</h2>
      <ul class="grille-voyages">${clients.map(carteVoyage).join('') || '<li class="vide">Aucun voyage pour l\'instant.</li>'}</ul>
    </section>`;

  app.querySelector('#nouveau').onclick = async () => {
    const v = nouveauVoyage();
    await sauver(v);
    location.hash = `#/voyage/${v.id}`;
  };
  app.querySelectorAll('[data-dupliquer]').forEach((b) => {
    b.onclick = async () => {
      const copie = dupliquer(etat.voyages.find((v) => v.id === b.dataset.dupliquer));
      await sauver(copie);
      toast('Copie créée');
      location.hash = `#/voyage/${copie.id}`;
    };
  });
}

// ---------- Éditeur d'un voyage ----------
let carte = null;

function pageEditeur(id) {
  const trouve = etat.voyages.find((x) => x.id === id);
  if (!trouve) { location.hash = '#/'; return; }
  const v = structuredClone(trouve);
  synchroniserJours(v);
  const biblio = { recherche: '', pays: '', ville: '__jour', categorie: '', coeur: false };
  let jourChoisi = v.jours[0]?.id || null;
  let minuterie;
  const enregistrer = () => { clearTimeout(minuterie); minuterie = setTimeout(() => sauver(v), 300); };

  const paysConnus = () => trier(uniques([...etat.endroits.map((e) => e.pays), ...v.etapes.map((e) => e.pays)]));
  const villesConnues = (pays) => trier(uniques(etat.endroits.filter((e) => !pays || e.pays === pays).map((e) => e.ville)));

  app.innerHTML = `
    <section class="editeur">
      <div class="editeur-haut">
        <a class="rond" href="#/" aria-label="Retour aux voyages">←</a>
        <input class="titre-voyage" id="titre" value="${esc(v.titre)}" aria-label="Nom du voyage">
        <div class="actions-haut">
          <label class="case"><input type="checkbox" id="modele" ${v.modele ? 'checked' : ''}> Modèle réutilisable</label>
          <a class="bouton-secondaire petit-bouton" href="#/client/${esc(v.id)}/apercu">👁 Aperçu à vendre</a>
          <a class="bouton-secondaire petit-bouton" href="#/client/${esc(v.id)}/complet">📄 Version complète</a>
          <button class="bouton-secondaire petit-bouton" id="dupliquer">Dupliquer</button>
          <button class="bouton-danger petit-bouton" id="supprimer">Supprimer</button>
        </div>
      </div>

      <details class="bloc infos" ${v.client || v.dateDebut ? '' : 'open'}>
        <summary>Infos du voyage <small>client, dates, budget, prix de vente</small></summary>
        <div class="infos-grille">
          <label class="champ"><span>Client</span><input data-info="client" value="${esc(v.client)}" placeholder="Ex. : Julie et Marc"></label>
          <label class="champ"><span>Date de départ</span><input data-info="dateDebut" type="date" value="${esc(v.dateDebut)}"></label>
          <label class="champ"><span>Voyageurs</span><input data-info="voyageurs" type="number" min="1" value="${esc(v.voyageurs)}"></label>
          <label class="champ"><span>Style</span><select data-info="style">
            ${[['eco', 'Économique'], ['moyen', 'Moyen de gamme'], ['luxe', 'Luxe']].map(([k, l]) => `<option value="${k}" ${v.style === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
          <label class="champ"><span>Prix de vente de l'itinéraire ($ CA)</span><input data-info="prixVente" inputmode="decimal" value="${esc(v.prixVente)}" placeholder="Ex. : 350"></label>
          <label class="champ large"><span>Mot d'introduction pour le client</span><textarea data-info="introClient" rows="2" placeholder="Visible par le client">${esc(v.introClient)}</textarea></label>
          <label class="champ large champ-prive"><span>🔒 Notes privées <small>jamais montrées au client</small></span><textarea data-info="notesPrivees" rows="2">${esc(v.notesPrivees)}</textarea></label>
        </div>
      </details>

      <div class="bloc">
        <div class="bloc-titre"><h2>Étapes</h2><span class="petit" id="itineraire"></span></div>
        <ol class="etapes" id="etapes"></ol>
        <button class="bouton-secondaire petit-bouton" id="ajout-etape">+ Ajouter une étape (pays, ville, nombre de jours)</button>
        <datalist id="liste-pays"></datalist>
      </div>

      <div class="trois-colonnes">
        <aside class="bloc colonne-biblio">
          <h2>Mes endroits</h2>
          <input type="search" id="recherche" placeholder="Chercher un endroit…">
          <div class="filtres-biblio">
            <select id="f-pays"></select>
            <select id="f-ville"></select>
            <select id="f-cat"><option value="">Toutes les catégories</option>${Object.entries(TAXONOMIE).map(([k, c]) => `<option value="${k}">${c.icone} ${esc(c.nom)}</option>`).join('')}</select>
            <label class="case"><input type="checkbox" id="f-coeur"> ❤ Coups de cœur</label>
          </div>
          <p class="aide">Glisse un endroit dans un jour, ou clique sur « + » pour l'ajouter au jour choisi.</p>
          <ul class="biblio" id="biblio"></ul>
        </aside>

        <div class="colonne-jours" id="jours"></div>

        <aside class="colonne-droite">
          <div class="bloc"><h2>Carte</h2><div id="carte" class="carte"></div><p class="aide" id="aide-carte"></p></div>
          <div class="bloc" id="resume"></div>
        </aside>
      </div>
    </section>`;

  const $ = (s) => app.querySelector(s);

  // --- En-tête et infos ---
  $('#titre').oninput = (ev) => { v.titre = ev.target.value; enregistrer(); };
  $('#modele').onchange = (ev) => { v.modele = ev.target.checked; enregistrer(); toast(v.modele ? 'Ajouté aux modèles' : 'Retiré des modèles'); };
  app.querySelectorAll('[data-info]').forEach((champ) => {
    champ.oninput = () => {
      v[champ.dataset.info] = champ.type === 'number' ? +champ.value : champ.value;
      enregistrer();
      if (champ.dataset.info === 'dateDebut') rendreJours();
      if (champ.dataset.info === 'prixVente') rendreResume();
    };
  });
  $('#dupliquer').onclick = async () => {
    await sauver(v);
    const copie = dupliquer(v);
    await sauver(copie);
    toast('Copie créée');
    location.hash = `#/voyage/${copie.id}`;
  };
  $('#supprimer').onclick = async () => {
    if (!confirm(`Supprimer le voyage « ${v.titre} » ? Les endroits ne sont pas effacés.`)) return;
    clearTimeout(minuterie);
    await db.effacer('voyages', v.id);
    etat.voyages = etat.voyages.filter((x) => x.id !== v.id);
    location.hash = '#/';
  };

  // --- Étapes ---
  function rendreEtapes() {
    $('#liste-pays').innerHTML = paysConnus().map((p) => `<option value="${esc(p)}">`).join('');
    $('#etapes').innerHTML = v.etapes.map((et, i) => `
      <li class="etape" data-etape="${esc(et.id)}">
        <span class="etape-num">${i + 1}</span>
        <input data-champ="pays" list="liste-pays" value="${esc(et.pays)}" placeholder="Pays" aria-label="Pays">
        <input data-champ="ville" list="villes-${esc(et.id)}" value="${esc(et.ville)}" placeholder="Ville" aria-label="Ville">
        <datalist id="villes-${esc(et.id)}">${villesConnues(et.pays).map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <label class="etape-jours"><input data-champ="jours" type="number" min="1" max="60" value="${et.jours}" aria-label="Nombre de jours"> jours</label>
        <span class="etape-boutons">
          <button class="mini" data-bouger="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
          <button class="mini" data-bouger="1" ${i === v.etapes.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
          <button class="mini danger" data-retirer aria-label="Retirer l'étape">✕</button>
        </span>
      </li>`).join('') || '<li class="vide">Commence par ajouter une étape : un pays, une ville et le nombre de jours.</li>';
    const total = v.jours.length;
    $('#itineraire').textContent = v.etapes.length ? `${itineraire(v)} · ${total} jour${total > 1 ? 's' : ''}` : '';
  }

  $('#etapes').addEventListener('change', (ev) => {
    const li = ev.target.closest('[data-etape]');
    const champ = ev.target.dataset.champ;
    if (!li || !champ) return;
    const et = v.etapes.find((x) => x.id === li.dataset.etape);
    et[champ] = ev.target.value.trim();
    synchroniserJours(v);
    enregistrer();
    rendreTout();
  });
  $('#etapes').addEventListener('click', (ev) => {
    const li = ev.target.closest('[data-etape]');
    if (!li) return;
    const i = v.etapes.findIndex((x) => x.id === li.dataset.etape);
    if (ev.target.dataset.bouger) {
      const j = i + +ev.target.dataset.bouger;
      [v.etapes[i], v.etapes[j]] = [v.etapes[j], v.etapes[i]];
    } else if ('retirer' in ev.target.dataset) {
      const nb = v.jours.filter((j) => j.etapeId === v.etapes[i].id).reduce((n, j) => n + j.items.length, 0);
      if (nb && !confirm(`Cette étape contient ${nb} endroit${nb > 1 ? 's' : ''}. Les retirer du voyage ?`)) return;
      v.etapes.splice(i, 1);
    } else return;
    synchroniserJours(v);
    if (!v.jours.some((j) => j.id === jourChoisi)) jourChoisi = v.jours[0]?.id || null;
    enregistrer();
    rendreTout();
  });
  $('#ajout-etape').onclick = () => {
    const derniere = v.etapes[v.etapes.length - 1];
    v.etapes.push({ id: db.nouvelId(), pays: derniere?.pays || '', ville: '', jours: 2 });
    synchroniserJours(v);
    if (!jourChoisi) jourChoisi = v.jours[0]?.id;
    enregistrer();
    rendreTout();
    const champs = app.querySelectorAll('#etapes [data-champ="ville"]');
    champs[champs.length - 1]?.focus();
  };

  // --- Bibliothèque d'endroits ---
  function villeFiltre() {
    if (biblio.ville !== '__jour') return biblio.ville;
    const j = v.jours.find((x) => x.id === jourChoisi);
    return j ? etapeDe(v, j).ville || '' : '';
  }

  function rendreFiltres() {
    const pays = paysConnus();
    $('#f-pays').innerHTML = `<option value="">Tous les pays</option>${pays.map((p) => `<option ${p === biblio.pays ? 'selected' : ''}>${esc(p)}</option>`).join('')}`;
    const villes = villesConnues(biblio.pays);
    $('#f-ville').innerHTML = `<option value="__jour" ${biblio.ville === '__jour' ? 'selected' : ''}>Ville du jour</option><option value="" ${biblio.ville === '' ? 'selected' : ''}>Toutes les villes</option>${villes.map((c) => `<option ${c === biblio.ville ? 'selected' : ''}>${esc(c)}</option>`).join('')}`;
  }

  function rendreBiblio() {
    const ville = villeFiltre();
    const q = sansAccents(biblio.recherche);
    const utilises = new Set(v.jours.flatMap((j) => j.items.map((it) => it.endroitId)));
    const liste = etat.endroits.filter((e) =>
      (!biblio.pays || e.pays === biblio.pays) &&
      (!ville || sansAccents(e.ville) === sansAccents(ville)) &&
      (!biblio.categorie || e.categorie === biblio.categorie) &&
      (!biblio.coeur || e.coupDeCoeur) &&
      (!q || sansAccents([e.nom, e.ville, e.type, e.sousType, e.description].join(' ')).includes(q)))
      .sort((a, b) => (b.coupDeCoeur ? 1 : 0) - (a.coupDeCoeur ? 1 : 0) || a.nom.localeCompare(b.nom, 'fr'));
    $('#biblio').innerHTML = liste.map((e) => {
      const cat = categorie(e);
      return `
        <li class="endroit" draggable="true" data-endroit="${esc(e.id)}" style="--c:${cat.couleur}">
          <span class="vignette">${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : cat.icone}</span>
          <span class="endroit-texte">
            <b>${esc(e.nom)}${e.coupDeCoeur ? ' <span class="coeur">❤</span>' : ''}</b>
            <small>${esc([e.sousType || e.type || cat.nom, e.ville].filter(Boolean).join(' · '))} ${dollars(e.prix)}</small>
          </span>
          ${utilises.has(e.id) ? '<span class="deja" title="Déjà dans ce voyage">✓</span>' : ''}
          <button class="mini plus" data-ajouter="${esc(e.id)}" aria-label="Ajouter au jour choisi">+</button>
        </li>`;
    }).join('') || `<li class="vide">${etat.endroits.length ? `Aucun endroit${ville ? ` à ${esc(ville)}` : ''} avec ces filtres.` : 'Importe d\'abord tes endroits dans « Mes données ».'}</li>`;
    afficherPhotos($('#biblio'));
  }

  $('#recherche').oninput = (ev) => { biblio.recherche = ev.target.value; rendreBiblio(); };
  $('#f-pays').onchange = (ev) => { biblio.pays = ev.target.value; biblio.ville = biblio.ville === '__jour' ? '__jour' : ''; rendreFiltres(); rendreBiblio(); };
  $('#f-ville').onchange = (ev) => { biblio.ville = ev.target.value; rendreBiblio(); };
  $('#f-cat').onchange = (ev) => { biblio.categorie = ev.target.value; rendreBiblio(); };
  $('#f-coeur').onchange = (ev) => { biblio.coeur = ev.target.checked; rendreBiblio(); };
  $('#biblio').addEventListener('click', (ev) => {
    const id = ev.target.dataset.ajouter;
    if (!id) return;
    const jour = v.jours.find((j) => j.id === jourChoisi);
    if (!jour) { toast("Ajoute d'abord une étape pour avoir des jours"); return; }
    jour.items.push({ id: db.nouvelId(), endroitId: id, noteClient: '' });
    enregistrer();
    rendreJours(); rendreBiblio(); rendreResume(); majCarte();
    toast(`Ajouté au jour ${v.jours.indexOf(jour) + 1}`);
  });

  // --- Jours ---
  function rendreJours() {
    $('#jours').innerHTML = v.jours.map((j, i) => {
      const et = etapeDe(v, j);
      const lignes = j.items.map((it) => {
        const e = endroit(it.endroitId);
        const cat = categorie(e);
        return `
          <li class="item" draggable="true" data-item="${esc(it.id)}" style="--c:${cat.couleur}">
            <span class="vignette">${e?.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : cat.icone}</span>
            <span class="item-texte">
              <b>${e ? esc(e.nom) : '<i>Endroit introuvable</i>'}</b>
              <small>${esc([e?.sousType || e?.type || cat.nom].filter(Boolean).join(''))} ${dollars(e?.prix)}</small>
              <input class="note-client" data-note="${esc(it.id)}" value="${esc(it.noteClient)}" placeholder="Conseil pour le client (optionnel)">
            </span>
            <button class="mini danger" data-retirer-item="${esc(it.id)}" aria-label="Retirer">✕</button>
          </li>`;
      }).join('');
      return `
        <article class="jour ${j.id === jourChoisi ? 'choisi' : ''}" data-jour="${esc(j.id)}">
          <header class="jour-tete">
            <span class="jour-num">Jour ${i + 1}</span>
            <span class="jour-lieu">${esc(et.ville || et.pays || '')}${v.dateDebut ? ` · ${esc(dateDuJour(v, i))}` : ''}</span>
            <input class="jour-titre" data-titre-jour="${esc(j.id)}" value="${esc(j.titre)}" placeholder="Titre du jour (ex. : Temples et marché de nuit)">
          </header>
          <ul class="items">${lignes || '<li class="depot">Glisse des endroits ici</li>'}</ul>
        </article>`;
    }).join('') || '<p class="vide bloc">Les jours apparaîtront ici dès que tu ajoutes une étape.</p>';
    afficherPhotos($('#jours'));
  }

  $('#jours').addEventListener('click', (ev) => {
    const retirer = ev.target.dataset.retirerItem;
    if (retirer) {
      for (const j of v.jours) j.items = j.items.filter((it) => it.id !== retirer);
      enregistrer();
      rendreJours(); rendreBiblio(); rendreResume(); majCarte();
      return;
    }
    const art = ev.target.closest('[data-jour]');
    if (art && art.dataset.jour !== jourChoisi && !ev.target.matches('input')) {
      jourChoisi = art.dataset.jour;
      app.querySelectorAll('.jour').forEach((x) => x.classList.toggle('choisi', x.dataset.jour === jourChoisi));
      rendreBiblio(); majCarte();
    }
  });
  $('#jours').addEventListener('input', (ev) => {
    if (ev.target.dataset.note) {
      for (const j of v.jours) for (const it of j.items) if (it.id === ev.target.dataset.note) it.noteClient = ev.target.value;
      enregistrer();
    } else if (ev.target.dataset.titreJour) {
      v.jours.find((j) => j.id === ev.target.dataset.titreJour).titre = ev.target.value;
      enregistrer();
    }
  });

  // --- Glisser-déposer : de la bibliothèque vers un jour, ou d'un jour à l'autre ---
  $('#jours').addEventListener('dragover', (ev) => {
    const art = ev.target.closest('[data-jour]');
    if (!art) return;
    ev.preventDefault();
    app.querySelectorAll('.survol').forEach((x) => x.classList.remove('survol'));
    art.classList.add('survol');
  });
  $('#jours').addEventListener('dragleave', (ev) => {
    if (!ev.relatedTarget || !ev.currentTarget.contains(ev.relatedTarget)) app.querySelectorAll('.survol').forEach((x) => x.classList.remove('survol'));
  });
  $('#jours').addEventListener('drop', (ev) => {
    const art = ev.target.closest('[data-jour]');
    app.querySelectorAll('.survol').forEach((x) => x.classList.remove('survol'));
    if (!art) return;
    ev.preventDefault();
    const [genre, id] = ev.dataTransfer.getData('text/plain').split(':');
    const jour = v.jours.find((j) => j.id === art.dataset.jour);
    let item;
    if (genre === 'e') item = { id: db.nouvelId(), endroitId: id, noteClient: '' };
    else if (genre === 'i') {
      for (const j of v.jours) {
        const k = j.items.findIndex((x) => x.id === id);
        if (k >= 0) { [item] = j.items.splice(k, 1); break; }
      }
    }
    if (!item) return;
    const avant = ev.target.closest('[data-item]');
    const pos = avant ? jour.items.findIndex((x) => x.id === avant.dataset.item) : -1;
    if (pos >= 0) jour.items.splice(pos, 0, item); else jour.items.push(item);
    jourChoisi = jour.id;
    enregistrer();
    rendreJours(); rendreBiblio(); rendreResume(); majCarte();
  });

  // --- Résumé et carte ---
  function rendreResume() {
    const { total, sansPrix } = coutVoyage(v);
    const prixVente = parseFloat(String(v.prixVente || '').replace(',', '.'));
    $('#resume').innerHTML = `
      <h2>Résumé</h2>
      <dl class="chiffres">
        <div><dt>Jours</dt><dd>${v.jours.length}</dd></div>
        <div><dt>Endroits</dt><dd>${nbEndroits(v)}</dd></div>
        <div><dt>Coût estimé sur place</dt><dd>${formatCAD(total)}</dd></div>
        ${prixVente ? `<div><dt>Ton prix de vente</dt><dd>${formatCAD(prixVente)}</dd></div>` : ''}
      </dl>
      <p class="aide">Le coût additionne les prix réels que tu as notés pour chaque endroit${sansPrix ? `; ${sansPrix} endroit${sansPrix > 1 ? 's' : ''} sans prix ne compte${sansPrix > 1 ? 'nt' : ''} pas` : ''}. C'est une estimation.</p>`;
  }

  function majCarte() {
    const zone = $('#carte');
    if (!zone) return;
    if (!window.L) { $('#aide-carte').textContent = "La carte a besoin d'internet."; return; }
    if (!carte || !document.body.contains(carte.getContainer())) {
      carte = L.map(zone, { scrollWheelZoom: false }).setView([25, 110], 3);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(carte);
      carte.couche = L.layerGroup().addTo(carte);
    }
    carte.couche.clearLayers();
    const jour = v.jours.find((j) => j.id === jourChoisi);
    const jours = jour && jour.items.length ? [jour] : v.jours;
    const points = [];
    for (const j of jours) {
      j.items.forEach((it, k) => {
        const e = endroit(it.endroitId);
        if (!e?.lat || !e?.lng) return;
        const n = jours.length === 1 ? k + 1 : v.jours.indexOf(j) + 1;
        const icone = L.divIcon({ className: 'repere', html: `<span style="--c:${categorie(e).couleur}">${n}</span>`, iconSize: [26, 26] });
        L.marker([e.lat, e.lng], { icon: icone, title: e.nom }).bindTooltip(esc(e.nom)).addTo(carte.couche);
        points.push([e.lat, e.lng]);
      });
    }
    if (points.length) carte.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
    const sansGps = jours.reduce((n, j) => n + j.items.filter((it) => !endroit(it.endroitId)?.lat).length, 0);
    $('#aide-carte').textContent = jours.length === 1
      ? `Jour ${v.jours.indexOf(jours[0]) + 1}, dans l'ordre de la journée.${sansGps ? ` ${sansGps} endroit(s) sans position GPS.` : ''}`
      : `Tout le voyage (numéro = jour).${sansGps ? ` ${sansGps} endroit(s) sans position GPS.` : ''}`;
    setTimeout(() => carte.invalidateSize(), 0);
  }

  function rendreTout() {
    rendreEtapes(); rendreFiltres(); rendreBiblio(); rendreJours(); rendreResume(); majCarte();
  }
  rendreTout();
}

// ---------- Page client : version complète ou aperçu à vendre ----------
// L'aperçu montre le trajet, les jours et le genre d'endroits, mais cache les noms,
// les adresses et les liens (sauf le jour 1, offert comme échantillon).
// Les notes privées ne sont jamais montrées, dans aucune version.
function htmlClient(v, mode) {
  const apercu = mode === 'apercu';
  const villes = itineraire(v);
  const jours = v.jours.map((j, i) => {
    const et = etapeDe(v, j);
    const cache = apercu && i > 0;
    const items = j.items.map((it) => {
      const e = endroit(it.endroitId);
      if (!e) return '';
      const cat = categorie(e);
      const genre = [e.type, e.sousType].filter(Boolean).join(' · ') || cat.nom;
      const liens = cache ? '' : [
        lienCarte(e) ? `<a href="${esc(lienCarte(e))}" target="_blank" rel="noopener">Carte</a>` : '',
        e.contacts?.site ? `<a href="${esc(lienWeb(e.contacts.site))}" target="_blank" rel="noopener">Site web</a>` : '',
        e.contacts?.reservation ? `<a href="${esc(lienWeb(e.contacts.reservation))}" target="_blank" rel="noopener">Réserver</a>` : '',
      ].filter(Boolean).join(' · ');
      return `
        <li class="c-item" style="--c:${cat.couleur}">
          ${e.photos?.length ? `<div class="c-photo ${cache ? 'flou' : ''}"><img data-photo="${esc(e.photos[0])}" alt=""></div>` : `<div class="c-photo c-icone">${cat.icone}</div>`}
          <div class="c-texte">
            <span class="c-cat">${cat.icone} ${esc(cat.nom)}</span>
            <h4>${cache ? esc(genre) : esc(e.nom)}</h4>
            ${cache ? '<p class="c-cache">Nom, adresse et conseils dans l\'itinéraire complet</p>' : `
              <p class="c-genre">${esc(genre)}${e.prix ? ` · ${dollars(e.prix)}` : ''}</p>
              ${e.description ? `<p>${esc(e.description)}</p>` : ''}
              ${it.noteClient ? `<p class="c-conseil">💡 ${esc(it.noteClient)}</p>` : ''}
              ${e.adresse ? `<p class="c-petit">${esc(e.adresse)}</p>` : ''}
              ${liens ? `<p class="c-petit">${liens}</p>` : ''}`}
          </div>
        </li>`;
    }).join('');
    return `
      <section class="c-jour">
        <h3><span>Jour ${i + 1}</span> ${esc(et.ville || et.pays || '')}${v.dateDebut ? ` <small>${esc(dateDuJour(v, i))}</small>` : ''}</h3>
        ${j.titre ? `<p class="c-titre-jour">${esc(j.titre)}</p>` : ''}
        ${apercu && i === 0 ? '<p class="c-echantillon">Jour offert en exemple : voici le niveau de détail de chaque journée.</p>' : ''}
        <ul class="c-items">${items || '<li class="c-petit">Journée libre</li>'}</ul>
      </section>`;
  }).join('');
  const prix = parseFloat(String(v.prixVente || '').replace(',', '.'));
  const appel = apercu ? `
    <div class="c-appel">
      <b>Ceci est un aperçu.</b> L'itinéraire complet contient le nom de chaque endroit, les adresses, les cartes, les liens pour réserver et mes conseils pour chaque journée.
      ${prix ? `<span class="c-prix">Itinéraire complet : ${formatCAD(prix)}</span>` : ''}
    </div>` : '';
  return `
    <article class="client ${apercu ? 'mode-apercu' : ''}">
      <header class="c-entete">
        <p class="c-sur">${apercu ? 'Aperçu de voyage sur mesure' : 'Ton voyage sur mesure'}</p>
        <h1>${esc(v.titre)}</h1>
        <p>${esc(villes)}${v.jours.length ? ` · ${v.jours.length} jours` : ''}${v.voyageurs ? ` · ${v.voyageurs} voyageur${v.voyageurs > 1 ? 's' : ''}` : ''}</p>
        ${v.introClient ? `<p class="c-intro">${esc(v.introClient)}</p>` : ''}
      </header>
      ${appel}
      ${jours || '<p>Aucun jour pour l\'instant.</p>'}
      ${appel}
    </article>`;
}

function pageClient(id, mode) {
  const v = etat.voyages.find((x) => x.id === id);
  if (!v) { location.hash = '#/'; return; }
  app.innerHTML = `
    <div class="barre-client">
      <a class="rond" href="#/voyage/${esc(v.id)}" aria-label="Retour au voyage">←</a>
      <div class="segments">
        <a href="#/client/${esc(v.id)}/apercu" class="${mode === 'apercu' ? 'choisi' : ''}">Aperçu à vendre</a>
        <a href="#/client/${esc(v.id)}/complet" class="${mode === 'complet' ? 'choisi' : ''}">Version complète</a>
      </div>
      <button class="bouton-secondaire petit-bouton" id="imprimer">Imprimer / PDF</button>
      <button class="bouton-principal petit-bouton" id="telecharger">Télécharger la page</button>
    </div>
    <p class="aide centre">${mode === 'apercu'
      ? "Ce que tu peux montrer avant la vente : le trajet, les jours et le genre d'endroits. Les noms sont cachés et les photos floues, sauf pour le jour 1."
      : 'La version que le client reçoit après avoir payé. Tes notes privées ne sont jamais incluses.'}</p>
    ${htmlClient(v, mode)}`;
  afficherPhotos(app);
  app.querySelector('#imprimer').onclick = () => window.print();
  app.querySelector('#telecharger').onclick = () => telechargerPage(v, mode);
}

function miniature(blob, largeur) {
  return new Promise((ok) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = largeur;
      c.height = Math.max(1, Math.round(largeur * img.height / img.width));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ok(''); };
    img.src = url;
  });
}

// Fabrique un seul fichier .html (photos incluses) à envoyer au client par courriel ou WhatsApp.
async function telechargerPage(v, mode) {
  const bouton = app.querySelector('#telecharger');
  bouton.disabled = true;
  bouton.textContent = 'Préparation…';
  try {
    const boite = document.createElement('div');
    boite.innerHTML = htmlClient(v, mode);
    for (const img of boite.querySelectorAll('img[data-photo]')) {
      const p = await db.lire('photos', img.dataset.photo);
      if (!p) { img.remove(); continue; }
      // Dans l'aperçu, les photos cachées sont réduites à une toute petite taille :
      // impossible de retrouver la vraie photo en enlevant le flou.
      img.src = img.closest('.flou') ? await miniature(p.blob, 48) : await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(p.blob); });
      img.removeAttribute('data-photo');
    }
    const css = await (await fetch('css/generateur.css')).text();
    const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(v.titre)}</title><style>${css}</style></head><body class="page-client-seule">${boite.innerHTML}</body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([page], { type: 'text/html' }));
    a.download = `${sansAccents(v.titre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voyage'}-${mode === 'apercu' ? 'apercu' : 'complet'}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Page téléchargée');
  } catch (err) {
    toast("La page n'a pas pu être créée.");
  } finally {
    bouton.disabled = false;
    bouton.textContent = 'Télécharger la page';
  }
}

// ---------- Mes données ----------
async function pageDonnees() {
  const nbPhotos = etat.endroits.reduce((n, e) => n + (e.photos?.length || 0), 0);
  const pays = uniques(etat.endroits.map((e) => e.pays));
  app.innerHTML = `
    <section class="page-donnees">
      <h1>Mes données</h1>
      <div class="bloc">
        <h2>1. Importer les endroits de ton cellulaire</h2>
        <ol class="etapes-texte">
          <li>Sur ton cell, ouvre l'appli, va dans <b>Réglages</b> et touche <b>Faire une copie de sauvegarde</b>.</li>
          <li>Envoie le fichier à ton ordi (courriel, AirDrop, Google Drive…).</li>
          <li>Ici, choisis ce fichier. Les nouveaux endroits s'ajoutent, et ceux déjà présents sont mis à jour.</li>
        </ol>
        <label class="bouton-principal">Choisir le fichier de sauvegarde<input type="file" accept=".json,application/json" id="importer" hidden></label>
        <p class="petit">Sur cet appareil : ${etat.endroits.length} endroits, ${nbPhotos} photos, ${pays.length} pays, ${etat.voyages.length} voyages.</p>
      </div>
      <div class="bloc">
        <h2>2. Garder une copie de tes voyages</h2>
        <p class="petit">Tes voyages sont gardés dans ce navigateur seulement. Fais une copie de temps en temps et garde-la dans ton Google Drive ou tes courriels.</p>
        <button class="bouton-secondaire" id="exporter">Télécharger une copie (endroits + voyages)</button>
      </div>
    </section>`;

  app.querySelector('#importer').onchange = async (ev) => {
    const fichier = ev.target.files[0];
    if (!fichier) return;
    try {
      const n = await db.importerTout(JSON.parse(await fichier.text()));
      await charger();
      toast(`${n} endroit${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} ou mis à jour`);
      pageDonnees();
    } catch (err) {
      toast(err.message || 'Ce fichier ne peut pas être lu.');
    }
  };
  app.querySelector('#exporter').onclick = async () => {
    const donnees = await db.exporterTout();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(donnees)], { type: 'application/json' }));
    a.download = `generateur-voyages-copie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', router);
app.addEventListener('dragstart', (ev) => {
  const e = ev.target.closest?.('[data-endroit]');
  const it = ev.target.closest?.('[data-item]');
  if (e) ev.dataTransfer.setData('text/plain', `e:${e.dataset.endroit}`);
  else if (it) ev.dataTransfer.setData('text/plain', `i:${it.dataset.item}`);
  ev.dataTransfer.effectAllowed = 'move';
});
charger().then(() => { db.demanderStockagePersistant(); return router(); }).catch((err) => {
  app.innerHTML = `<p class="vide">Erreur au démarrage : ${esc(err.message)}</p>`;
});
