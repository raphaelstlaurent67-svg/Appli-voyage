// Studio : générateur de voyages et suivi des contributeurs.
// Utilisé par Raph seulement, surtout sur l'ordinateur. Les endroits viennent du fichier
// de sauvegarde du cellulaire (Mes données > Importer). Tout reste sur cet appareil.

import { TAXONOMIE, TAUX_PAR_DEFAUT } from './taxonomie.js';
import * as db from './db.js';
import { icone, iconeCat } from './icones.js';
import * as sync from './sync.js';
import * as pwa from './installer.js';
import { ENVIES, decoder, extraireCode, nuits } from './code-demande.js';
import { distanceM } from './exif.js';

const etat = { endroits: [], voyages: [], contributeurs: [], paiements: [], taux: { ...TAUX_PAR_DEFAUT }, regles: null };
const urlsPhotos = new Map();
const app = document.getElementById('app');
const side = document.getElementById('side');
const modale = document.getElementById('modale');

// Règles de paiement des contributeurs (modifiables dans Contributeurs > Règles).
const REGLES_DEFAUT = {
  parEndroit: 1,
  bonusVille: 75,
  // Une ville complète : 60 restos, 30 hébergements, 30 activités, 20 bars et 10 trajets (150).
  // Les trajets en plus remplacent les bars qui manquent ; un trajet complexe compte pour 2.
  cibles: { restos: 60, hebergement: 30, activites: 30, bars: 20, trajets: 10 },
  pourcentage: 1,
  seuilVoyage: 300,
  recompenseVoyage: 'Un voyage à rabais',
};

const GROUPES_VILLE = [
  ['restos', 'Restos', ['restos']],
  ['hebergement', 'Hébergement', ['hebergement']],
  ['activites', 'Activités', ['visites', 'experiences', 'sport']],
  ['bars', 'Bars', ['nuit']],
  ['trajets', 'Trajets', ['trajets']],
];
const groupeDe = (cat) => GROUPES_VILLE.find(([, , cats]) => cats.includes(cat))?.[0] || '';
// Progrès d'une ville à partir des endroits (acceptés) d'un contributeur.
function progresVille(endroits, cibles) {
  const n = { restos: 0, hebergement: 0, activites: 0, bars: 0, trajets: 0 };
  for (const e of endroits) { const g = groupeDe(e.categorie); if (g) n[g] += g === 'trajets' && e.complexe ? 2 : 1; }
  const remplace = Math.min(Math.max(0, cibles.bars - n.bars), Math.max(0, n.trajets - cibles.trajets));
  const compte = { ...n, bars: n.bars + remplace, trajets: n.trajets - remplace };
  const total = GROUPES_VILLE.reduce((t, [k]) => t + cibles[k], 0);
  const fait = GROUPES_VILLE.reduce((t, [k]) => t + Math.min(compte[k], cibles[k]), 0);
  return {
    compte, remplace, progres: total ? fait / total : 0, complete: fait >= total,
    manque: GROUPES_VILLE.filter(([k]) => compte[k] < cibles[k]).map(([k, nom]) => `${nom} ${compte[k]}/${cibles[k]}`),
  };
}

// ---------- Petits outils ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uniques = (l) => [...new Set(l.filter(Boolean))];
const trier = (l) => [...l].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
const categorie = (e) => TAXONOMIE[e?.categorie] || TAXONOMIE.autre;
const endroit = (id) => etat.endroits.find((e) => e.id === id);
const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;
const nombre = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const dateCourte = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const aujourdhui = () => new Date().toISOString().slice(0, 10);

function toast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  clearTimeout(toast.minuterie);
  toast.minuterie = setTimeout(() => t.classList.remove('visible'), 2600);
}

function enCAD(montant, devise) {
  const m = nombre(montant);
  const t = etat.taux[devise];
  return m && t ? m * t : null;
}
const formatCAD = (v) => `${Math.round(v || 0).toLocaleString('fr-CA')} $`;
const formatArgent = (v) => `${(Math.round((v || 0) * 100) / 100).toLocaleString('fr-CA', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })} $`;
const dollars = (n) => (n ? '$'.repeat(n) : '');
const pct = (n) => `${(+n || 0).toLocaleString('fr-CA', { maximumFractionDigits: 2 })} %`;

function dateDuJour(v, index, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!v.dateDebut) return '';
  const d = new Date(`${v.dateDebut}T12:00:00`);
  d.setDate(d.getDate() + index);
  return d.toLocaleDateString('fr-CA', options);
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
  etat.contributeurs = await db.tous('contributeurs');
  etat.paiements = await db.tous('paiements');
  etat.taux = { ...TAUX_PAR_DEFAUT, ...(await db.lireReglage('taux', {})) };
  etat.regles = { ...REGLES_DEFAUT, ...(await db.lireReglage('reglesContrib', {})) };
  // Ancien réglage par défaut (10 %) jugé beaucoup trop haut : on passe à 1 %.
  if (etat.regles.pourcentage === 10) etat.regles.pourcentage = 1;
  etat.regles.cibles = { ...REGLES_DEFAUT.cibles, ...(etat.regles.cibles || {}) };
}

async function sauver(magasin, objet) {
  objet.modifieLe = new Date().toISOString();
  await db.ecrire(magasin, objet);
  etat[magasin] = etat[magasin].filter((x) => x.id !== objet.id).concat(objet);
  marquerEnvoi(magasin, objet);
}

// Envoi automatique vers le dossier GitHub privé (copie de sauvegarde du Studio).
function marquerEnvoi(magasin, objet) {
  if (magasin === 'endroits') sync.marquer(sync.cheminEndroit(objet));
  else if (['voyages', 'contributeurs', 'paiements'].includes(magasin)) sync.marquer(sync.cheminStudio(magasin));
}
async function effacerEt(magasin, id) {
  await db.effacer(magasin, id);
  etat[magasin] = etat[magasin].filter((x) => x.id !== id);
  marquerEnvoi(magasin, { id });
}

// Un endroit est utilisable dans les voyages s'il est à Raph, ou accepté.
const utilisable = (e) => !e.contributeurId || e.statut === 'accepte';
const endroitsUtilisables = () => etat.endroits.filter(utilisable);
const aValider = () => etat.endroits.filter((e) => e.contributeurId && e.statut === 'en_attente');

function nouveauVoyage() {
  return {
    id: db.nouvelId(), titre: 'Nouveau voyage', client: '', dateDebut: '', voyageurs: 2, style: 'moyen',
    prixVente: '', introClient: '', notesPrivees: '', modele: false, vendu: false, venduLe: '',
    etapes: [], jours: [], creeLe: new Date().toISOString(),
  };
}

function dupliquer(v) {
  const copie = structuredClone(v);
  Object.assign(copie, { id: db.nouvelId(), titre: v.modele ? v.titre : `${v.titre} (copie)`, modele: false, vendu: false, venduLe: '', client: '', creeLe: new Date().toISOString() });
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
      ceux.push(anciens.find((x) => x.etapeId === et.id && x.rang === r) || { id: db.nouvelId(), etapeId: et.id, rang: r, titre: '', items: [] });
    }
    for (const j of anciens) if (j.etapeId === et.id && j.rang >= n) ceux[n - 1].items.push(...j.items);
    nouveaux.push(...ceux);
  }
  v.jours = nouveaux;
}

const etapeDe = (v, jour) => v.etapes.find((et) => et.id === jour.etapeId) || {};
const itineraire = (v) => v.etapes.map((et) => et.ville || et.pays).filter(Boolean).join(' → ');
const nbEndroits = (v) => v.jours.reduce((n, j) => n + j.items.length, 0);
const photoCouverture = (v) => {
  for (const j of v.jours) for (const it of j.items) { const e = endroit(it.endroitId); if (e?.photos?.length) return e.photos[0]; }
  return '';
};

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

// ---------- Contributeurs : calculs ----------
// Plus une fiche est complète, plus elle a de chances d'être acceptée.
const CRITERES = [
  ['photo', (e) => e.photos?.length > 0],
  ['position GPS', (e) => !!e.lat],
  ['description', (e) => (e.description || '').length >= 20],
  ['budget', (e) => !!e.prix],
  ['prix réel', (e) => !!e.montant],
  ['confort', (e) => !!e.confort],
  ['adresse ou lien Maps', (e) => !!(e.adresse || e.lienMaps)],
  ['type précis', (e) => !!(e.sousType || e.categorie === 'autre')],
  ['contact', (e) => !!(e.telephone || Object.keys(e.contacts || {}).length)],
  ['date de visite', (e) => !!e.verifieLe],
];
function completude(e) {
  const manque = CRITERES.filter(([, ok]) => !ok(e)).map(([nom]) => nom);
  return { score: Math.round(((CRITERES.length - manque.length) / CRITERES.length) * 100), manque };
}

function bilanContributeur(c) {
  const r = etat.regles;
  const siens = etat.endroits.filter((e) => e.contributeurId === c.id);
  const acceptes = siens.filter((e) => e.statut === 'accepte');
  const enAttente = siens.filter((e) => e.statut === 'en_attente').length;
  const refuses = siens.filter((e) => e.statut === 'refuse').length;

  // Bonus « ville complète » : voir progresVille.
  const parVille = new Map();
  for (const e of acceptes) {
    const cle = `${e.pays}|${e.ville}`;
    if (!parVille.has(cle)) parVille.set(cle, { pays: e.pays, ville: e.ville, endroits: [] });
    parVille.get(cle).endroits.push(e);
  }
  const villes = [...parVille.values()].map((v) => ({ pays: v.pays, ville: v.ville, ...progresVille(v.endroits, r.cibles) })).sort((a, b) => b.progres - a.progres);
  const bonus = villes.filter((v) => v.complete).length * r.bonusVille;

  // Pourcentage sur les itinéraires vendus, selon la part de ses endroits dans le voyage.
  let commissions = 0;
  const ventes = [];
  for (const v of etat.voyages.filter((x) => x.vendu && nombre(x.prixVente))) {
    const ids = v.jours.flatMap((j) => j.items.map((it) => it.endroitId));
    if (!ids.length) continue;
    const a = ids.filter((id) => endroit(id)?.contributeurId === c.id).length;
    if (!a) continue;
    const montant = nombre(v.prixVente) * (r.pourcentage / 100) * (a / ids.length);
    commissions += montant;
    ventes.push({ titre: v.titre, montant });
  }

  const gagne = acceptes.length * r.parEndroit + bonus + commissions;
  const paye = etat.paiements.filter((p) => p.contributeurId === c.id).reduce((n, p) => n + nombre(p.montant), 0);
  return {
    acceptes: acceptes.length, enAttente, refuses, villes, bonus, commissions, ventes,
    gagne, paye, du: Math.max(0, Math.round((gagne - paye) * 100) / 100),
    progresVoyage: Math.min(1, acceptes.length / Math.max(1, r.seuilVoyage)),
  };
}

// ---------- Barre latérale ----------
// Le menu, dans l'ordre. L'accueil reprend la même liste avec une phrase pour chaque choix.
const MENU = [
  ['#/', 'house', 'Accueil', ''],
  ['#/contributeurs', 'users', 'Contributeurs', 'Ajoute des contributeurs, envoie-leur leur lien, vois ce que tu leur dois.'],
  ['#/a-valider', 'inbox', 'À valider', 'Les endroits reçus. Les photos sont vérifiées pour toi.'],
  ['#/demandes', 'send', 'Fiche client', 'Le lien à envoyer à un client pour sa demande de voyage.'],
  ['#/ventes', 'banknote', 'Ventes', 'Ce que tes itinéraires ont rapporté.'],
  ['#/donnees', 'folder-open', 'Mes données', 'Importer un fichier de contributeur, garder une copie.'],
];
function rendreSide() {
  const route = location.hash || '#/';
  const tries = [...etat.voyages].sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
  const n = aValider().length;
  const actif = (href) => (href === '#/' ? route === '#/' || route === '#' : route.startsWith(href));
  const lienNav = (href, ico, texte, extra = '') => `<a class="navBtn ${actif(href) ? 'on' : ''}" href="${href}">${icone(ico, { taille: 16 })}<span>${texte}</span>${extra}</a>`;
  side.innerHTML = `
    <a class="brand" href="#/">
      <span class="mk">${icone('compass', { taille: 17, epaisseur: 2.2 })}</span>
      <span><b>Studio</b></span>
    </a>
    <nav class="sideNav">
      ${MENU.map(([href, ico, nom]) => lienNav(href, ico, nom, href === '#/a-valider' && n ? `<span class="pastille-n">${n}</span>` : '')).join('')}
    </nav>
    <div class="sideLab">Voyages</div>
    <div class="sideVoyages">
      ${tries.map((v) => `
        <a class="camp ${route.startsWith(`#/voyage/${v.id}`) ? 'on' : ''}" href="#/voyage/${esc(v.id)}">
          <span class="nm"><i class="cdot ${v.vendu ? 'vendu' : v.modele ? 'modele' : ''}"></i><span>${esc(v.titre)}</span></span>
          <span class="sub">${v.modele ? 'Modèle, ' : v.vendu ? 'Vendu, ' : ''}${pluriel(v.jours.length, 'jour')}, ${pluriel(nbEndroits(v), 'endroit')}</span>
        </a>`).join('')}
      <button class="navBtn" id="side-nouveau">${icone('plus', { taille: 16 })}<span>Nouveau voyage</span></button>
    </div>
    <div class="sideFoot">
      ${pwa.dejaInstallee() ? '' : `<button class="navBtn installer" id="side-installer">${icone('download', { taille: 16 })}<span>Installer sur mon ordi</span></button>`}
      <a href="../index.html">${icone('external-link', { taille: 13 })} Appli des endroits</a>
      <span>Données gardées sur cet ordinateur</span>
    </div>`;
  side.querySelector('#side-nouveau').onclick = creerVoyage;
  const inst = side.querySelector('#side-installer');
  if (inst) inst.onclick = () => installerAppli('le Studio');
}

// Nouveau voyage : on demande juste le nom (et le client si on le connaît).
function creerVoyage() {
  ouvrirModale('Nouveau voyage', `
    <div class="form-grille">
      <label class="champ large"><span>Nom du voyage</span><input name="titre" required placeholder="Ex. : Montréal en 3 jours"></label>
      <label class="champ large"><span>Pour qui ? <small>optionnel</small></span><input name="client" placeholder="Ex. : Julie et Marc"></label>
    </div>`, async (val) => {
    const v = nouveauVoyage();
    v.titre = val.titre.trim() || 'Nouveau voyage';
    v.client = val.client.trim();
    await sauver('voyages', v);
    location.hash = `#/voyage/${v.id}`;
    return true;
  }, { ok: 'Créer le voyage' });
}

// ---------- Fenêtre (modale) ----------
function ouvrirModale(titre, corps, quandOk, { ok = 'Enregistrer', danger = false } = {}) {
  modale.innerHTML = `
    <div class="mod-fond" data-fermer></div>
    <form class="mod" role="dialog" aria-modal="true">
      <header class="mod-tete"><h2>${titre}</h2><button type="button" class="ico-btn" data-fermer aria-label="Fermer">${icone('x', { taille: 18 })}</button></header>
      <div class="mod-corps">${corps}</div>
      <footer class="mod-pied"><button type="button" class="btn ghost" data-fermer>Annuler</button><button class="btn ${danger ? 'rouge' : ''}">${ok}</button></footer>
    </form>`;
  modale.hidden = false;
  const form = modale.querySelector('form');
  modale.querySelectorAll('[data-fermer]').forEach((b) => { b.onclick = fermerModale; });
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const valeurs = Object.fromEntries(new FormData(form));
    if ((await quandOk(valeurs, form)) !== false) fermerModale();
  };
  form.querySelector('input, select, textarea')?.focus();
}
function fermerModale() { modale.hidden = true; modale.innerHTML = ''; }
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !modale.hidden) fermerModale(); });

// ---------- Navigation ----------
let carte = null;

async function router() {
  const [, page, id, sous] = (location.hash || '#/').split('/');
  carte = null;
  rendreSide();
  app.classList.toggle('large', page === 'voyage');
  window.scrollTo(0, 0);
  if (page === 'voyage') return pageVoyage(id, sous || 'itineraire');
  if (page === 'client') { location.hash = `#/voyage/${id}/client`; return undefined; }
  if (page === 'contributeurs') return id === 'soumissions' ? (location.hash = '#/a-valider') : pageContributeurs(id || 'apercu');
  if (page === 'a-valider') return pageAValider();
  if (page === 'demande') return pageDemande(id);
  if (page === 'demandes') return pageDemandes();
  if (page === 'ventes') return pageVentes(id || '30j');
  if (page === 'donnees') return pageDonnees();
  return pageAccueil();
}

const entete = (titre, sousTitre, actions = '') => `
  <div class="head"><h1>${titre}</h1><div class="head-actions">${actions}</div></div>
  <p class="crumb">${sousTitre}</p>`;

// Met une appli sur le bureau, ou explique comment faire si le navigateur ne le propose pas.
async function installerAppli(nom) {
  if (await pwa.installer()) return;
  ouvrirModale(`Mettre ${nom} sur ton ordi`, `<p>${esc(pwa.EXPLICATION.fr)}</p><p class="aide" style="margin-top:10px">Si tu vois plutôt « Ouvrir dans Appli de voyage », ferme l'onglet et rouvre-le avec Ctrl+Shift+R : c'est réglé dans la nouvelle version.</p>`, () => true, { ok: 'Compris' });
}

// ---------- Fiche client : la demande remplie par le client ----------
const NOM_STYLE = { eco: 'Économique', moyen: 'Confort', luxe: 'Luxe' };
const jolieDate = (s, opts = { day: 'numeric', month: 'short' }) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('fr-CA', opts) : '');
const lienFiche = (courriel, langue = '', tel = '') => {
  const u = new URL('../demande.html', location.href);
  if (courriel) u.searchParams.set('pour', courriel);
  if (tel) u.searchParams.set('tel', tel.replace(/[^\d+]/g, ''));
  if (langue) u.searchParams.set('lang', langue);
  return u.href;
};
// Durée totale demandée (le client a donné juste la durée, ou ses dates pays par pays).
const joursDemande = (d) => (d.mode === 'total' ? d.duree || 0 : d.pays.reduce((n, p) => n + nuits(p.debut, p.fin), 0));
const langueDemande = (d) => (d.langue === 'en' ? 'en anglais' : '');
function htmlDatesDemande(d, long = false) {
  const opts = long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' };
  if (d.mode === 'total') {
    const n = d.duree || 0;
    return `<ul class="${long ? 'dates-demande' : 'liste-simple'}">
      <li><b>Voyage au complet : ${d.plage ? `${d.plage.replace('-', ' à ')} jours` : pluriel(n, 'jour')}</b>${long ? '<span>' : ', '}${d.depart ? `départ le ${esc(jolieDate(d.depart, { ...opts, year: 'numeric' }))}` : 'date de départ à préciser'}${long ? '</span>' : ''}${long ? `<small>${n >= 7 ? `${Math.round(n / 7 * 10) / 10} sem.` : ''}</small>` : ''}</li>
      <li><b>${esc(d.pays.map((p) => p.nom).join(' → '))}</b>${long ? `<span>${esc(d.repartition?.trim() || 'Il te laisse répartir le temps entre les pays.')}</span>` : d.repartition?.trim() ? `, ${esc(d.repartition.trim())}` : ', répartition libre'}</li>
    </ul>`;
  }
  return `<ul class="${long ? 'dates-demande' : 'liste-simple'}">${d.pays.map((p) => (long
    ? `<li><b>${esc(p.nom)}</b><span>${esc(jolieDate(p.debut, opts))} → ${esc(jolieDate(p.fin, { ...opts, year: 'numeric' }))}</span><small>${pluriel(nuits(p.debut, p.fin), 'nuit')}</small></li>`
    : `<li><b>${esc(p.nom)}</b>, ${esc(jolieDate(p.debut))} → ${esc(jolieDate(p.fin))}, ${pluriel(nuits(p.debut, p.fin), 'nuit')}</li>`)).join('')}</ul>`;
}
const voyageDeDemande = (d) => etat.voyages.find((v) => v.demande && v.demande.envoyeLe === d.envoyeLe && v.demande.nom === d.nom);

// Combien d'endroits de chaque genre sont déjà prévus dans le voyage.
function prevusParCategorie(v) {
  const n = {};
  for (const j of v.jours) for (const it of j.items) { const e = endroit(it.endroitId); if (e) n[e.categorie] = (n[e.categorie] || 0) + 1; }
  return n;
}

function htmlEnvies(d, prevus) {
  const lignes = ENVIES.filter(([k]) => d.envies?.[k]);
  if (!lignes.length) return '<p class="aide">Aucune envie précise cochée.</p>';
  return `<ul class="envies-studio">${lignes.map(([k, nom, ico]) => {
    const voulu = d.envies[k];
    const suivi = prevus && TAXONOMIE[k];
    const fait = suivi ? prevus[k] || 0 : 0;
    return `<li class="${suivi && fait >= voulu ? 'ok' : ''}">${icone(ico, { taille: 15 })}<span>${esc(nom)}</span>
      <b>${suivi ? `${fait} / ${voulu}` : `× ${voulu}`}</b>${suivi ? barre(fait / voulu, fait >= voulu ? 'ok' : '') : ''}</li>`;
  }).join('')}</ul>`;
}

function htmlContact(d) {
  return [
    d.courriel ? `<a href="mailto:${esc(d.courriel)}">${icone('mail', { taille: 14 })} ${esc(d.courriel)}</a>` : '',
    d.telephone ? `<a href="tel:${esc(d.telephone.replace(/[^\d+]/g, ''))}">${icone('phone', { taille: 14 })} ${esc(d.telephone)}</a>` : '',
  ].filter(Boolean).join('');
}

const htmlIncontournables = (d) => {
  const inc = d.pays.filter((p) => p.incontournable?.trim());
  return inc.length ? `<ul class="liste-simple">${inc.map((p) => `<li><b>${esc(p.nom)} :</b> ${esc(p.incontournable)}</li>`).join('')}</ul>` : '<p class="aide">Rien de précis.</p>';
};

function htmlDemandeVoyage(v) {
  const d = v.demande;
  return `
    <summary>${icone('inbox', { taille: 16 })}<b>Ce que veut le client</b><span class="aide">${[esc(d.nom), pluriel(d.voyageurs || 1, 'voyageur'), esc(NOM_STYLE[d.style] || ''), langueDemande(d), `demande du ${esc(dateCourte(d.envoyeLe))}`].filter(Boolean).join(', ')}</span>${icone('chevron-down', { taille: 16, classe: 'chevron' })}</summary>
    <div class="demande-grille">
      <div><p class="mini-titre">Envies <small>prévu / voulu</small></p>${htmlEnvies(d, prevusParCategorie(v))}</div>
      <div><p class="mini-titre">À voir absolument</p>${htmlIncontournables(d)}
        ${d.message ? `<p class="mini-titre">Son message</p><p class="message-client">${esc(d.message)}</p>` : ''}</div>
      <div><p class="mini-titre">Ses dates</p>${htmlDatesDemande(d)}
        <p class="mini-titre">Le joindre</p><div class="contact-client">${htmlContact(d) || '<span class="aide">—</span>'}</div></div>
    </div>`;
}

async function creerDepuisDemande(d) {
  const v = nouveauVoyage();
  v.titre = `${d.pays.map((p) => p.nom).join(', ')}, ${d.nom}`.slice(0, 90);
  v.client = d.nom;
  v.dateDebut = d.mode === 'total' ? d.depart || '' : d.pays.map((p) => p.debut).filter(Boolean).sort()[0] || '';
  v.voyageurs = d.voyageurs || 2;
  v.style = NOM_STYLE[d.style] ? d.style : 'moyen';
  // Juste une durée totale : on la partage également entre les pays (Raph ajuste ensuite).
  const n = d.pays.length;
  const parts = d.mode === 'total' ? d.pays.map((_, i) => Math.floor((d.duree || n) / n) + (i < (d.duree || n) % n ? 1 : 0)) : d.pays.map((p) => nuits(p.debut, p.fin));
  v.etapes = d.pays.map((p, i) => ({ id: db.nouvelId(), pays: p.nom, ville: '', jours: Math.max(1, parts[i]) }));
  v.notesPrivees = [
    `Demande reçue le ${dateCourte(d.envoyeLe)}.`,
    d.courriel ? `Courriel : ${d.courriel}` : '',
    d.telephone ? `Téléphone : ${d.telephone}` : '',
    d.langue === 'en' ? 'Le client a rempli la fiche en anglais.' : '',
    d.mode === 'total' ? `Durée totale demandée : ${d.plage ? `${d.plage.replace('-', ' à ')} jours` : pluriel(d.duree || 0, 'jour')}, répartie également entre les pays (à ajuster).${d.repartition?.trim() ? ` Sa préférence : ${d.repartition.trim()}` : ''}` : '',
    d.message ? `Message : ${d.message}` : '',
  ].filter(Boolean).join('\n');
  v.demande = d;
  synchroniserJours(v);
  await sauver('voyages', v);
  return v;
}

async function pageDemande(code) {
  app.innerHTML = entete('Demande de voyage', 'Ouverture…');
  let d;
  try { d = await decoder(code); } catch (_) {
    app.innerHTML = `${entete('Demande de voyage', '')}
      <div class="panel vide-bloc">${icone('triangle-alert', { taille: 26, epaisseur: 1.6 })}<b>Ce lien ne fonctionne pas</b><span>Il est peut-être coupé. Demande au client de te renvoyer son message en entier, ou colle-le dans « Fiche client ».</span><a class="btn" href="#/demandes">Aller à Fiche client</a></div>`;
    return;
  }
  const existe = voyageDeDemande(d);
  const total = joursDemande(d);
  app.innerHTML = `
    ${entete(`Demande de ${esc(d.nom)}`, `${esc(d.pays.map((p) => p.nom).join(' → '))}, ${[pluriel(total, 'jour'), pluriel(d.voyageurs || 1, 'voyageur'), esc(NOM_STYLE[d.style] || ''), langueDemande(d)].filter(Boolean).join(', ')}`,
      existe ? `<a class="btn" href="#/voyage/${esc(existe.id)}">${icone('route', { taille: 15 })} Ouvrir le voyage</a>` : `<button class="btn" id="creer">${icone('plus', { taille: 15 })} Créer le voyage</button>`)}
    ${existe ? `<div class="encart"><span class="rond-ico">${icone('check', { taille: 18 })}</span><div><b>Le voyage existe déjà</b><p>Tu as déjà créé « ${esc(existe.titre)} » à partir de cette demande.</p></div><a class="btn" href="#/voyage/${esc(existe.id)}">Ouvrir</a></div>`
      : `<div class="encart"><span class="rond-ico">${icone('inbox', { taille: 18 })}</span><div><b>Nouvelle demande</b><p>Clique sur « Créer le voyage » : les pays, les jours et les envies du client y seront déjà. Tu n'auras qu'à choisir les villes et les endroits.</p></div><button class="btn" id="creer2">Créer le voyage</button></div>`}
    <div class="grille-2">
      <section class="panel">
        <div class="panel-tete"><h3>Ses dates</h3></div>
        ${htmlDatesDemande(d, true)}
        <p class="mini-titre">Le joindre</p><div class="contact-client">${htmlContact(d) || '<span class="aide">—</span>'}</div>
      </section>
      <section class="panel">
        <div class="panel-tete"><h3>Ses envies</h3><span class="aide">nombre de fois pendant le voyage</span></div>
        ${htmlEnvies(d, null)}
        <p class="mini-titre">À voir absolument</p>${htmlIncontournables(d)}
        ${d.message ? `<p class="mini-titre">Son message</p><p class="message-client">${esc(d.message)}</p>` : ''}
      </section>
    </div>`;
  const creer = async () => {
    const deja = voyageDeDemande(d);
    const v = deja || await creerDepuisDemande(d);
    toast(deja ? 'Ce voyage existe déjà' : 'Voyage créé à partir de la demande');
    history.replaceState(null, '', `#/voyage/${v.id}`);
    router();
  };
  app.querySelectorAll('#creer, #creer2').forEach((b) => { b.onclick = creer; });
}

async function pageDemandes() {
  const courriel = await db.lireReglage('courrielFiche', '');
  const telFiche = await db.lireReglage('telFiche', '');
  const recues = etat.voyages.filter((v) => v.demande).sort((a, b) => (b.demande.envoyeLe || '').localeCompare(a.demande.envoyeLe || ''));
  app.innerHTML = `
    ${entete('Fiche client', 'Le questionnaire que tu envoies à un client : ses pays, ses dates, ses envies. Sa réponse crée le voyage ici.')}
    <div class="grille-2">
      <section class="panel">
        <div class="etape-titre"><span class="gros-num">1</span><div><h3>Envoie la fiche au client</h3><p>Copie ce lien et envoie-le par Messenger, texto ou courriel.</p></div></div>
        <label class="champ"><span>Ton courriel <small>optionnel : le client pourra te répondre en un clic</small></span><input id="courriel" type="email" value="${esc(courriel)}" placeholder="toi@exemple.com"></label>
        <label class="champ"><span>Ton numéro de cell <small>optionnel : le client pourra te l'envoyer par texto en un clic</small></span><input id="tel-fiche" type="tel" value="${esc(telFiche)}" placeholder="514 555-1234"></label>
        <label class="champ"><span>Langue de la fiche <small>le client peut aussi changer en haut de la fiche</small></span><select id="langue-fiche">
          <option value="">Selon son téléphone (français ou anglais)</option><option value="fr">Français</option><option value="en">English</option>
        </select></label>
        <div class="lien-fiche"><code id="lien">${esc(lienFiche(courriel, '', telFiche))}</code></div>
        <div class="rangee-btn">
          <button class="btn" id="copier">${icone('copy', { taille: 15 })} Copier le lien</button>
          <a class="btn ghost" id="voir" href="${esc(lienFiche(courriel, '', telFiche))}" target="_blank" rel="noopener">${icone('eye', { taille: 15 })} Voir la fiche</a>
          <a class="btn ghost" href="${esc(lienFiche(courriel).replace('demande.html', 'demande.html?installer=1').replace('html?installer=1?', 'html?installer=1&'))}" target="_blank" rel="noopener">${icone('download', { taille: 15 })} Mettre la fiche sur mon ordi</a>
        </div>
      </section>
      <section class="panel">
        <div class="etape-titre"><span class="gros-num">2</span><div><h3>Tu as reçu une réponse ?</h3><p>Clique sur le lien dans le message du client. Ou colle tout son message ici.</p></div></div>
        <label class="champ"><span>Message du client</span><textarea id="colle" rows="4" placeholder="Colle ici le courriel ou le message reçu"></textarea></label>
        <div class="rangee-btn"><button class="btn" id="ouvrir">${icone('inbox', { taille: 15 })} Ouvrir la demande</button></div>
      </section>
    </div>
    <h2 class="titre-section">Demandes reçues <small>${pluriel(recues.length, 'voyage créé', 'voyages créés')} à partir d'une fiche</small></h2>
    ${recues.length ? `<section class="panel"><table class="tableau"><thead><tr><th>Client</th><th>Pays</th><th>Départ</th><th>Reçue le</th><th class="num">Endroits</th></tr></thead><tbody>
      ${recues.map((v) => `<tr class="cliquable" data-ouvrir="${esc(v.id)}"><td><b>${esc(v.client || v.demande.nom)}</b></td><td>${esc(v.demande.pays.map((p) => p.nom).join(', '))}</td><td>${esc(dateCourte(v.dateDebut))}</td><td>${esc(dateCourte(v.demande.envoyeLe))}</td><td class="num">${nbEndroits(v)}</td></tr>`).join('')}
      </tbody></table></section>` : '<p class="vide-ligne">Aucune demande pour l\'instant.</p>'}`;
  const champ = app.querySelector('#courriel');
  const langue = app.querySelector('#langue-fiche');
  const champTel = app.querySelector('#tel-fiche');
  const lienActuel = () => lienFiche(champ.value.trim(), langue.value, champTel.value.trim());
  champTel.oninput = () => maj();
  champTel.onchange = () => db.ecrireReglage('telFiche', champTel.value.trim());
  const maj = () => { const l = lienActuel(); app.querySelector('#lien').textContent = l; app.querySelector('#voir').href = l; };
  champ.oninput = maj;
  langue.onchange = maj;
  champ.onchange = () => db.ecrireReglage('courrielFiche', champ.value.trim());
  app.querySelector('#copier').onclick = async () => {
    const l = lienActuel();
    db.ecrireReglage('courrielFiche', champ.value.trim());
    db.ecrireReglage('telFiche', champTel.value.trim());
    try { await navigator.clipboard.writeText(l); toast('Lien copié'); } catch (_) { prompt('Copie ce lien :', l); }
  };
  app.querySelector('#ouvrir').onclick = () => {
    const c = extraireCode(app.querySelector('#colle').value);
    if (!c) { toast('Aucune demande trouvée dans ce texte'); return; }
    location.hash = `#/demande/${c}`;
  };
  app.querySelectorAll('[data-ouvrir]').forEach((tr) => { tr.onclick = () => { location.hash = `#/voyage/${tr.dataset.ouvrir}`; }; });
}

// ---------- Vue d'ensemble ----------
function tuileVoyage(v) {
  const photo = photoCouverture(v);
  const { total } = coutVoyage(v);
  return `
    <a class="tile" href="#/voyage/${esc(v.id)}">
      <div class="cv">
        ${photo ? `<img data-photo="${esc(photo)}" alt="">` : `<span class="none">${icone('route', { taille: 30, epaisseur: 1.5 })}</span>`}
        ${v.vendu ? '<span class="badge ok">Vendu</span>' : v.modele ? '<span class="badge">Modèle</span>' : v.client ? `<span class="badge">${esc(v.client)}</span>` : ''}
      </div>
      <div class="tb">
        <div class="tn">${esc(v.titre)}</div>
        <div class="troute">${esc(itineraire(v) || 'Parcours à faire')}</div>
        <div class="stats">
          <div class="stat"><b>${v.jours.length}</b><span>jours</span></div>
          <div class="stat"><b>${nbEndroits(v)}</b><span>endroits</span></div>
          <div class="stat"><b>${total ? formatCAD(total) : '—'}</b><span>coût estimé</span></div>
        </div>
      </div>
    </a>`;
}


// Le projet expliqué en 30 secondes (pour Philippe, un client, un futur contributeur).
const PITCH = {
  fr: "Je développe une application qui rémunère des gens du coin pour partager ce qu'ils connaissent de leur ville : les meilleurs restaurants, bars, hôtels, activités et façons de se déplacer. Chaque endroit est photographié sur place et vérifié. Je le fais partout dans le monde, avec un but : remplir la carte du monde, ville par ville, puis vendre des voyages sur mesure tirés de cette carte. Je n'ai trouvé personne d'autre qui fait les deux.",
  en: "I'm building an app that pays locals to share what they know about their city: the best restaurants, bars, hotels, activities and ways to get around. Every place is photographed on the spot and verified. I'm doing it worldwide, with one goal: fill the world map, city by city, then sell custom trips built from that map. I haven't found anyone else doing both.",
};
function pageAccueil() {
  const tries = [...etat.voyages].sort((a, b) => (b.modifieLe || '').localeCompare(a.modifieLe || ''));
  const modeles = tries.filter((v) => v.modele);
  const clients = tries.filter((v) => !v.modele);
  const utilisables = endroitsUtilisables();
  const pays = uniques(utilisables.map((e) => e.pays));
  const villes = uniques(utilisables.map((e) => `${e.pays}|${e.ville}`));
  const vendus = etat.voyages.filter((v) => v.vendu);
  const ventes = vendus.reduce((n, v) => n + nombre(v.prixVente), 0);
  const n = aValider().length;
  app.innerHTML = `
    ${entete('Accueil', '', `<button class="btn" id="nouveau">${icone('plus', { taille: 15 })} Nouveau voyage</button>`)}
    <div class="choix-accueil">
      ${MENU.slice(1).map(([href, ico, nom, phrase]) => `
        <a class="panel choix ${href === '#/a-valider' && n ? 'hi' : ''}" href="${href}">
          <span class="rond-ico">${icone(ico, { taille: 18 })}</span>
          <span><b>${nom}${href === '#/a-valider' && n ? ` <span class="pastille-n">${n}</span>` : ''}</b><small>${phrase}</small></span>
        </a>`).join('')}
    </div>
    <div class="kpis kpis-3">
      <div class="kpi"><span>${icone('map-pin', { taille: 15 })} Endroits</span><b>${utilisables.length}</b><small>${pluriel(villes.length, 'ville')}, ${pluriel(pays.length, 'pays', 'pays')}</small></div>
      <div class="kpi"><span>${icone('route', { taille: 15 })} Voyages</span><b>${clients.length}</b><small>${pluriel(modeles.length, 'modèle réutilisable', 'modèles réutilisables')}</small></div>
      <a class="kpi" href="#/ventes"><span>${icone('banknote', { taille: 15 })} Ventes</span><b>${formatCAD(ventes)}</b><small>${pluriel(vendus.length, 'itinéraire vendu', 'itinéraires vendus')}</small></a>
    </div>
    <section class="panel pitch">
      <div class="panel-tete"><h3>Ton projet en 30 secondes</h3><div class="seg"><button class="on" data-pitch="fr">Français</button><button data-pitch="en">English</button></div></div>
      <p id="pitch-texte">${esc(PITCH.fr)}</p>
      <div class="rangee-btn"><button class="btn ghost sm" id="copier-pitch">${icone('copy', { taille: 14 })} Copier</button></div>
    </section>
    ${etat.endroits.length ? '' : `
      <div class="encart">
        <span class="rond-ico">${icone('upload', { taille: 18 })}</span>
        <div><b>Commence par importer tes endroits</b><p>Sur ton cell : Réglages, puis « Faire une copie de sauvegarde ». Envoie le fichier à ton ordi et choisis-le dans « Mes données ».</p></div>
        <a class="btn" href="#/donnees">Importer</a>
      </div>`}
    <h2 class="titre-section">Voyages clients</h2>
    <div class="tiles">${clients.map(tuileVoyage).join('') || `<button class="tile tile-vide" id="nouveau2">${icone('plus', { taille: 22 })}<span>Créer ton premier voyage</span></button>`}</div>
    <h2 class="titre-section">Modèles réutilisables <small>Un voyage type (ex. « Japon 14 jours ») à dupliquer pour chaque client</small></h2>
    <div class="tiles">${modeles.map(tuileVoyage).join('') || '<p class="vide-ligne">Aucun modèle. Dans un voyage, onglet « Infos et vente », coche « Modèle réutilisable ».</p>'}</div>`;
  let languePitch = 'fr';
  app.querySelectorAll('[data-pitch]').forEach((b) => {
    b.onclick = () => {
      languePitch = b.dataset.pitch;
      app.querySelectorAll('[data-pitch]').forEach((x) => x.classList.toggle('on', x === b));
      app.querySelector('#pitch-texte').textContent = PITCH[languePitch];
    };
  });
  app.querySelector('#copier-pitch').onclick = async () => { try { await navigator.clipboard.writeText(PITCH[languePitch]); toast('Texte copié'); } catch (_) { toast('Sélectionne le texte pour le copier'); } };
  app.querySelector('#nouveau').onclick = creerVoyage;
  const n2 = app.querySelector('#nouveau2');
  if (n2) n2.onclick = creerVoyage;
  afficherPhotos(app);
}

// ---------- Un voyage ----------
function pageVoyage(id, onglet) {
  const trouve = etat.voyages.find((x) => x.id === id);
  if (!trouve) { location.hash = '#/'; return; }
  const v = structuredClone(trouve);
  synchroniserJours(v);
  let minuterie;
  const crumb = () => [itineraire(v) || 'Parcours à faire', pluriel(v.jours.length, 'jour'), pluriel(nbEndroits(v), 'endroit'), v.client].filter(Boolean).map(esc).join(', ');
  const majCrumb = () => { const c = app.querySelector('#crumb'); if (c) c.innerHTML = crumb(); };
  const enregistrer = () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(async () => { await sauver('voyages', v); rendreSide(); }, 300);
    majDemande();
  };
  const etiquette = () => (v.vendu ? '<span class="etiq ok">Vendu</span>' : v.modele ? '<span class="etiq">Modèle</span>' : '');
  const onglets = [['itineraire', 'route', 'Itinéraire'], ['infos', 'file-text', 'Infos et vente'], ['client', 'eye', 'Page client'], ['suivi', 'send', 'Suivi sur place']];

  app.innerHTML = `
    <div class="head">
      <h1 contenteditable="plaintext-only" spellcheck="false" id="titre" title="Clique pour renommer">${esc(v.titre)}</h1>
      <span id="etiq">${etiquette()}</span>
      <div class="head-actions">
        <button class="btn ghost sm" id="dupliquer">${icone('copy', { taille: 14 })} ${v.modele ? 'Utiliser ce modèle' : 'Dupliquer'}</button>
        <button class="btn danger sm" id="supprimer" aria-label="Supprimer le voyage">${icone('trash-2', { taille: 14 })}</button>
      </div>
    </div>
    <p class="crumb" id="crumb">${crumb()}</p>
    ${v.demande ? '<details class="panel demande-voyage" id="demande-voyage"></details>' : ''}
    <nav class="tabs">${onglets.map(([k, ico, nom]) => `<a class="tab ${k === onglet ? 'on' : ''}" href="#/voyage/${esc(v.id)}/${k}">${icone(ico, { taille: 15 })}${nom}</a>`).join('')}</nav>
    <div id="contenu"></div>`;

  const titre = app.querySelector('#titre');
  titre.addEventListener('input', () => { v.titre = titre.textContent.trim() || 'Sans titre'; enregistrer(); });
  titre.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); titre.blur(); } });
  app.querySelector('#dupliquer').onclick = async () => {
    clearTimeout(minuterie);
    await sauver('voyages', v);
    const copie = dupliquer(v);
    await sauver('voyages', copie);
    toast(v.modele ? 'Nouveau voyage créé à partir du modèle' : 'Copie créée');
    location.hash = `#/voyage/${copie.id}`;
  };
  app.querySelector('#supprimer').onclick = () => ouvrirModale('Supprimer ce voyage ?', `<p>« ${esc(v.titre)} » sera supprimé. Les endroits, eux, restent.</p>`, async () => {
    clearTimeout(minuterie);
    await effacerEt('voyages', v.id);
    location.hash = '#/';
  }, { ok: 'Supprimer', danger: true });

  const boiteDemande = app.querySelector('#demande-voyage');
  let ouvert = true;
  try { ouvert = localStorage.getItem('demandeOuverte') !== '0'; } catch (_) { /* pas grave */ }
  function majDemande() {
    if (!boiteDemande) return;
    boiteDemande.open = ouvert;
    boiteDemande.innerHTML = htmlDemandeVoyage(v);
  }
  if (boiteDemande) {
    majDemande();
    boiteDemande.addEventListener('toggle', () => { ouvert = boiteDemande.open; try { localStorage.setItem('demandeOuverte', ouvert ? '1' : '0'); } catch (_) { /* pas grave */ } });
  }

  const zone = app.querySelector('#contenu');
  const majEtiquette = () => { app.querySelector('#etiq').innerHTML = etiquette(); };
  if (onglet === 'infos') ongletInfos(v, zone, enregistrer, majEtiquette, majCrumb);
  else if (onglet === 'client') ongletClient(v, zone);
  else if (onglet === 'suivi') ongletSuivi(v, zone, enregistrer);
  else ongletItineraire(v, zone, enregistrer, majCrumb);
}

function ongletInfos(v, zone, enregistrer, majEtiquette, majCrumb) {
  const r = etat.regles;
  zone.innerHTML = `
    <div class="grille-2">
      <section class="panel">
        <div class="panel-tete"><h3>Le client</h3></div>
        <div class="form-grille">
          <label class="champ"><span>Nom du client</span><input data-info="client" value="${esc(v.client)}" placeholder="Ex. : Julie et Marc"></label>
          <label class="champ"><span>Date de départ</span><input data-info="dateDebut" type="date" value="${esc(v.dateDebut)}"></label>
          <label class="champ"><span>Voyageurs</span><input data-info="voyageurs" type="number" min="1" value="${esc(v.voyageurs)}"></label>
          <label class="champ"><span>Style</span><select data-info="style">
            ${[['eco', 'Économique'], ['moyen', 'Moyen de gamme'], ['luxe', 'Luxe']].map(([k, l]) => `<option value="${k}" ${v.style === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
          <label class="champ large"><span>Mot d'introduction <small>visible par le client</small></span><textarea data-info="introClient" rows="3" placeholder="Ex. : Deux semaines entre temples, onsen et izakayas, à votre rythme.">${esc(v.introClient)}</textarea></label>
          <label class="champ large prive"><span>${icone('lock', { taille: 13 })} Notes privées <small>jamais montrées au client</small></span><textarea data-info="notesPrivees" rows="3">${esc(v.notesPrivees)}</textarea></label>
        </div>
      </section>
      <section class="panel">
        <div class="panel-tete"><h3>Vente</h3></div>
        <div class="form-grille">
          <label class="champ"><span>Prix de l'itinéraire ($ CA)</span><input data-info="prixVente" inputmode="decimal" value="${esc(v.prixVente)}" placeholder="Ex. : 350"></label>
          <label class="champ"><span>Vendu le</span><input data-info="venduLe" type="date" value="${esc(v.venduLe)}" ${v.vendu ? '' : 'disabled'}></label>
          <label class="interr large"><input type="checkbox" data-info="vendu" ${v.vendu ? 'checked' : ''}><i></i><span><b>Itinéraire vendu</b><small>Les contributeurs dont les endroits sont dans ce voyage reçoivent ${pct(r.pourcentage)} du prix, selon leur part.</small></span></label>
          <label class="interr large"><input type="checkbox" data-info="modele" ${v.modele ? 'checked' : ''}><i></i><span><b>Modèle réutilisable</b><small>Apparaît dans « Modèles » pour le dupliquer à chaque nouveau client.</small></span></label>
        </div>
      </section>
    </div>`;
  zone.querySelectorAll('[data-info]').forEach((champ) => {
    champ.addEventListener(champ.type === 'checkbox' ? 'change' : 'input', () => {
      const k = champ.dataset.info;
      v[k] = champ.type === 'checkbox' ? champ.checked : champ.type === 'number' ? +champ.value : champ.value;
      if (k === 'vendu') {
        v.venduLe = v.vendu ? v.venduLe || aujourdhui() : '';
        const d = zone.querySelector('[data-info=venduLe]');
        d.disabled = !v.vendu;
        d.value = v.venduLe;
      }
      if (k === 'vendu' || k === 'modele') {
        majEtiquette();
        toast(k === 'vendu' ? (v.vendu ? 'Marqué comme vendu' : 'Plus marqué comme vendu') : v.modele ? 'Ajouté aux modèles' : 'Retiré des modèles');
      }
      if (k === 'client') majCrumb();
      enregistrer();
    });
  });
}

function ongletItineraire(v, zone, enregistrer, majCrumb) {
  const biblio = { recherche: '', pays: '', ville: '__jour', categorie: '', coeur: false };
  let jourChoisi = v.jours[0]?.id || null;
  const sources = endroitsUtilisables();
  const paysConnus = () => trier(uniques([...sources.map((e) => e.pays), ...v.etapes.map((e) => e.pays)]));
  const villesConnues = (pays) => trier(uniques(sources.filter((e) => !pays || e.pays === pays).map((e) => e.ville)));

  let carteVisible = false;
  try { carteVisible = localStorage.getItem('carteVisible') === '1'; } catch (_) { /* pas grave */ }
  zone.innerHTML = `
    <section class="panel etapes-panel">
      <div class="etape-titre">
        <span class="gros-num">1</span>
        <div><h3>Le parcours</h3><p>Les villes où dort le client, dans l'ordre, et combien de jours dans chacune. Les journées se créent toutes seules en dessous.</p></div>
      </div>
      <div class="parcours" id="parcours"></div>
      <div class="etapes-entete" id="etapes-entete"><span></span><span>Pays</span><span>Ville</span><span>Jours</span><span></span></div>
      <ol class="etapes" id="etapes"></ol>
      <button class="btn sm" id="ajout-etape">${icone('plus', { taille: 14 })} Ajouter une ville au parcours</button>
      <datalist id="liste-pays"></datalist>
    </section>
    <div class="etape-titre etape-titre-2">
      <span class="gros-num">2</span>
      <div><h3>Les journées</h3><p>Glisse tes endroits de la liste de droite dans chaque journée, ou clique sur la journée puis sur + .</p></div>
      <div class="chiffres-ligne" id="resume"></div>
      <button class="btn ghost sm" id="bouton-carte">${icone('map', { taille: 14 })} <span>${carteVisible ? 'Cacher la carte' : 'Voir la carte'}</span></button>
    </div>
    <section class="panel panneau-carte" id="panneau-carte" ${carteVisible ? '' : 'hidden'}><div class="panel-tete"><h3>Carte</h3><span class="aide" id="aide-carte"></span></div><div id="carte" class="carte"></div></section>
    <div class="deux-col">
      <div class="jours" id="jours"></div>
      <aside class="panel biblio-panel">
        <div class="panel-tete"><h3>Mes endroits</h3><span class="aide" id="nb-biblio"></span></div>
        <div class="recherche">${icone('search', { taille: 15 })}<input type="search" id="recherche" placeholder="Chercher un endroit"></div>
        <div class="filtres-biblio">
          <select id="f-pays" aria-label="Pays"></select>
          <select id="f-ville" aria-label="Ville"></select>
        </div>
        <div class="puces-cat" id="f-cat">
          <button class="puce on" data-cat="">Tout</button>
          ${Object.entries(TAXONOMIE).map(([k, c]) => `<button class="puce" data-cat="${k}" title="${esc(c.nom)}" aria-label="${esc(c.nom)}">${iconeCat(k, { taille: 15 })}</button>`).join('')}
          <button class="puce" data-coeur title="Coups de cœur" aria-label="Coups de cœur">${icone('heart', { taille: 15 })}</button>
        </div>
        <ul class="biblio" id="biblio"></ul>
        <p class="aide pied-biblio">Glisse un endroit dans une journée, ou clique sur + pour l'ajouter à la journée choisie (en couleur).</p>
      </aside>
    </div>`;
  const $ = (s) => zone.querySelector(s);
  $('#bouton-carte').onclick = () => {
    carteVisible = !carteVisible;
    try { localStorage.setItem('carteVisible', carteVisible ? '1' : '0'); } catch (_) { /* pas grave */ }
    $('#panneau-carte').hidden = !carteVisible;
    $('#bouton-carte span').textContent = carteVisible ? 'Cacher la carte' : 'Voir la carte';
    majCarte();
  };

  // --- Étapes ---
  function rendreEtapes() {
    $('#liste-pays').innerHTML = paysConnus().map((p) => `<option value="${esc(p)}">`).join('');
    $('#etapes-entete').hidden = !v.etapes.length;
    const remplies = v.etapes.filter((et) => et.ville || et.pays);
    $('#parcours').innerHTML = remplies.length ? remplies.map((et, i) => `${i ? `<span class="fleche">${icone('arrow-right', { taille: 14 })}</span>` : ''}<span class="arret"><b>${esc(et.ville || et.pays)}</b><small>${pluriel(et.jours, 'jour')}</small></span>`).join('') : '';
    $('#etapes').innerHTML = v.etapes.map((et, i) => `
      <li class="etape" data-etape="${esc(et.id)}">
        <span class="etape-num">${i + 1}</span>
        <input data-champ="pays" list="liste-pays" value="${esc(et.pays)}" placeholder="Pays" aria-label="Pays">
        <input data-champ="ville" list="villes-${esc(et.id)}" value="${esc(et.ville)}" placeholder="Ville" aria-label="Ville">
        <datalist id="villes-${esc(et.id)}">${villesConnues(et.pays).map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <label class="etape-jours"><input data-champ="jours" type="number" min="1" max="60" value="${et.jours}" aria-label="Nombre de jours"><span>jours</span></label>
        <span class="etape-boutons">
          <button class="ico-btn" data-bouger="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">${icone('arrow-up', { taille: 15 })}</button>
          <button class="ico-btn" data-bouger="1" ${i === v.etapes.length - 1 ? 'disabled' : ''} aria-label="Descendre">${icone('arrow-down', { taille: 15 })}</button>
          <button class="ico-btn rouge" data-retirer aria-label="Retirer cette ville" title="Retirer cette ville">${icone('x', { taille: 15 })}</button>
        </span>
      </li>`).join('') || `<li class="etape-vide">${icone('map-pin', { taille: 20 })}<span><b>Par où commence le voyage ?</b>Clique sur « Ajouter une ville au parcours », puis écris le pays, la ville et le nombre de jours. Ex. : Canada, Montréal, 3 jours.</span></li>`;
  }
  $('#etapes').addEventListener('change', (ev) => {
    const li = ev.target.closest('[data-etape]');
    const champ = ev.target.dataset.champ;
    if (!li || !champ) return;
    v.etapes.find((x) => x.id === li.dataset.etape)[champ] = ev.target.value.trim();
    synchroniserJours(v);
    enregistrer();
    rendreTout();
  });
  $('#etapes').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    const li = ev.target.closest('[data-etape]');
    if (!b || !li) return;
    const i = v.etapes.findIndex((x) => x.id === li.dataset.etape);
    const appliquer = () => {
      synchroniserJours(v);
      if (!v.jours.some((j) => j.id === jourChoisi)) jourChoisi = v.jours[0]?.id || null;
      enregistrer();
      rendreTout();
    };
    if (b.dataset.bouger) {
      const j = i + +b.dataset.bouger;
      [v.etapes[i], v.etapes[j]] = [v.etapes[j], v.etapes[i]];
      appliquer();
    } else if ('retirer' in b.dataset) {
      const nb = v.jours.filter((j) => j.etapeId === v.etapes[i].id).reduce((n, j) => n + j.items.length, 0);
      if (!nb) { v.etapes.splice(i, 1); appliquer(); return; }
      ouvrirModale('Retirer cette ville ?', `<p>Elle contient ${pluriel(nb, 'endroit')}, qui seront retirés du voyage.</p>`, () => { v.etapes.splice(i, 1); appliquer(); }, { ok: 'Retirer', danger: true });
    }
  });
  $('#ajout-etape').onclick = () => {
    const derniere = v.etapes[v.etapes.length - 1];
    v.etapes.push({ id: db.nouvelId(), pays: derniere?.pays || '', ville: '', jours: 2 });
    synchroniserJours(v);
    if (!jourChoisi) jourChoisi = v.jours[0]?.id;
    enregistrer();
    rendreTout();
    const champs = zone.querySelectorAll('#etapes [data-champ="ville"]');
    champs[champs.length - 1]?.focus();
  };

  // --- Bibliothèque ---
  function villeFiltre() {
    if (biblio.ville !== '__jour') return biblio.ville;
    const j = v.jours.find((x) => x.id === jourChoisi);
    return j ? etapeDe(v, j).ville || '' : '';
  }
  function rendreFiltres() {
    $('#f-pays').innerHTML = `<option value="">Tous les pays</option>${paysConnus().map((p) => `<option ${p === biblio.pays ? 'selected' : ''}>${esc(p)}</option>`).join('')}`;
    $('#f-ville').innerHTML = `<option value="__jour" ${biblio.ville === '__jour' ? 'selected' : ''}>Ville du jour</option><option value="" ${biblio.ville === '' ? 'selected' : ''}>Toutes les villes</option>${villesConnues(biblio.pays).map((c) => `<option ${c === biblio.ville ? 'selected' : ''}>${esc(c)}</option>`).join('')}`;
  }
  function rendreBiblio() {
    const ville = villeFiltre();
    const q = sansAccents(biblio.recherche);
    const utilises = new Set(v.jours.flatMap((j) => j.items.map((it) => it.endroitId)));
    const liste = sources.filter((e) =>
      (!biblio.pays || e.pays === biblio.pays) &&
      (!ville || sansAccents(e.ville) === sansAccents(ville)) &&
      (!biblio.categorie || e.categorie === biblio.categorie) &&
      (!biblio.coeur || e.coupDeCoeur) &&
      (!q || sansAccents([e.nom, e.ville, e.type, e.sousType, e.description].join(' ')).includes(q)))
      .sort((a, b) => (b.coupDeCoeur ? 1 : 0) - (a.coupDeCoeur ? 1 : 0) || (a.nom || '').localeCompare(b.nom || '', 'fr'));
    $('#nb-biblio').textContent = ville ? `${liste.length} à ${ville}` : `${liste.length}`;
    $('#biblio').innerHTML = liste.map((e) => {
      const cat = categorie(e);
      return `
        <li class="endroit ${utilises.has(e.id) ? 'deja' : ''}" draggable="true" data-endroit="${esc(e.id)}" style="--c:${cat.couleur}">
          <span class="vignette">${iconeCat(e.categorie, { taille: 18 })}${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : ''}</span>
          <span class="endroit-texte">
            <b>${esc(e.nom)}${e.coupDeCoeur ? icone('heart', { taille: 12, classe: 'coeur' }) : ''}</b>
            <small>${esc([e.sousType || e.type || cat.nom, e.ville].filter(Boolean).join(', '))}${e.prix ? `, ${dollars(e.prix)}` : ''}</small>
          </span>
          ${utilises.has(e.id) ? `<span class="deja-ico" title="Déjà dans ce voyage">${icone('check', { taille: 14 })}</span>` : ''}
          <button class="ico-btn plus" data-ajouter="${esc(e.id)}" aria-label="Ajouter au jour choisi">${icone('plus', { taille: 15 })}</button>
        </li>`;
    }).join('') || `<li class="vide-ligne">${sources.length ? `Aucun endroit${ville ? ` à ${esc(ville)}` : ''} avec ces filtres.` : 'Importe d\'abord tes endroits dans « Mes données ».'}</li>`;
    afficherPhotos($('#biblio'));
  }
  $('#recherche').oninput = (ev) => { biblio.recherche = ev.target.value; rendreBiblio(); };
  $('#f-pays').onchange = (ev) => { biblio.pays = ev.target.value; if (biblio.ville !== '__jour') biblio.ville = ''; rendreFiltres(); rendreBiblio(); };
  $('#f-ville').onchange = (ev) => { biblio.ville = ev.target.value; rendreBiblio(); };
  $('#f-cat').onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if ('coeur' in b.dataset) { biblio.coeur = !biblio.coeur; b.classList.toggle('on', biblio.coeur); } else {
      biblio.categorie = b.dataset.cat;
      $('#f-cat').querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b));
    }
    rendreBiblio();
  };
  $('#biblio').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ajouter]');
    if (!b) return;
    const jour = v.jours.find((j) => j.id === jourChoisi);
    if (!jour) { toast("Ajoute d'abord une ville au parcours (étape 1)"); return; }
    jour.items.push({ id: db.nouvelId(), endroitId: b.dataset.ajouter, noteClient: '' });
    apresChangement();
    toast(`Ajouté au jour ${v.jours.indexOf(jour) + 1}`);
  });

  // --- Jours ---
  function rendreJours() {
    $('#jours').innerHTML = v.jours.map((j, i) => {
      const et = etapeDe(v, j);
      const lignes = j.items.map((it, k) => {
        const e = endroit(it.endroitId);
        const cat = categorie(e);
        return `
          <li class="item" draggable="true" data-item="${esc(it.id)}" style="--c:${cat.couleur}">
            <span class="poignee" aria-hidden="true">${icone('grip-vertical', { taille: 14 })}</span>
            <span class="vignette">${iconeCat(e?.categorie, { taille: 18 })}${e?.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : ''}<i class="item-num">${k + 1}</i></span>
            <span class="item-texte">
              <b>${e ? esc(e.nom) : '<i>Endroit introuvable</i>'}</b>
              <small>${esc(e?.sousType || e?.type || cat.nom)}${e?.prix ? `, ${dollars(e.prix)}` : ''}${e?.montant ? `, ${esc(e.montant)} ${esc(e.devise || '')}` : ''}</small>
              <input class="note-client" data-note="${esc(it.id)}" value="${esc(it.noteClient)}" placeholder="+ Conseil pour le client">
            </span>
            <button class="ico-btn rouge" data-retirer-item="${esc(it.id)}" aria-label="Retirer">${icone('x', { taille: 15 })}</button>
          </li>`;
      }).join('');
      return `
        ${j.rang === 0 ? `<div class="sep-etape">${icone('map-pin', { taille: 14 })}<b>${esc(et.ville || et.pays || 'Étape sans nom')}</b><span>${esc([et.ville ? et.pays : '', pluriel(et.jours, 'jour')].filter(Boolean).join(', '))}</span></div>` : ''}
        <article class="jour ${j.id === jourChoisi ? 'choisi' : ''}" data-jour="${esc(j.id)}">
          <header class="jour-tete">
            <span class="jour-num">Jour ${i + 1}</span>
            ${v.dateDebut ? `<span class="jour-date">${esc(dateDuJour(v, i))}</span>` : ''}
            <input class="jour-titre" data-titre-jour="${esc(j.id)}" value="${esc(j.titre)}" placeholder="Titre du jour, ex. : Temples et marché de nuit">
          </header>
          <ul class="items">${lignes || `<li class="depot">${icone('plus', { taille: 15 })} Glisse des endroits ici</li>`}</ul>
        </article>`;
    }).join('') || `<div class="panel vide-bloc">${icone('route', { taille: 26, epaisseur: 1.6 })}<b>Pas encore de journées</b><span>Ajoute une ville au parcours (étape 1) : ses journées apparaîtront ici.</span></div>`;
    afficherPhotos($('#jours'));
  }
  function choisirJour(id) {
    jourChoisi = id;
    zone.querySelectorAll('.jour').forEach((x) => x.classList.toggle('choisi', x.dataset.jour === jourChoisi));
    rendreBiblio(); majCarte();
  }
  $('#jours').addEventListener('click', (ev) => {
    const retirer = ev.target.closest('[data-retirer-item]')?.dataset.retirerItem;
    if (retirer) {
      for (const j of v.jours) j.items = j.items.filter((it) => it.id !== retirer);
      apresChangement();
      return;
    }
    const art = ev.target.closest('[data-jour]');
    if (art && art.dataset.jour !== jourChoisi) choisirJour(art.dataset.jour);
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

  // --- Glisser-déposer ---
  const nettoyer = () => zone.querySelectorAll('.survol, .avant').forEach((x) => x.classList.remove('survol', 'avant'));
  $('#jours').addEventListener('dragover', (ev) => {
    const art = ev.target.closest('[data-jour]');
    if (!art) return;
    ev.preventDefault();
    nettoyer();
    art.classList.add('survol');
    ev.target.closest('[data-item]')?.classList.add('avant');
  });
  $('#jours').addEventListener('dragleave', (ev) => { if (!ev.relatedTarget || !ev.currentTarget.contains(ev.relatedTarget)) nettoyer(); });
  $('#jours').addEventListener('drop', (ev) => {
    const art = ev.target.closest('[data-jour]');
    nettoyer();
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
    apresChangement();
  });

  // --- Résumé et carte ---
  function rendreResume() {
    const { total, sansPrix } = coutVoyage(v);
    const prixVente = nombre(v.prixVente);
    const parJour = v.jours.length ? total / v.jours.length : 0;
    $('#resume').innerHTML = `
      <span><b>${v.jours.length}</b> ${v.jours.length > 1 ? 'jours' : 'jour'}</span>
      <span><b>${nbEndroits(v)}</b> ${nbEndroits(v) > 1 ? 'endroits' : 'endroit'}</span>
      <span title="Estimation en $ CA à partir des prix notés${sansPrix ? ` (${pluriel(sansPrix, 'endroit')} sans prix)` : ''}"><b>${formatCAD(total)}</b> sur place${parJour ? `, ${formatCAD(parJour)}/jour` : ''}</span>
      <a href="#/voyage/${esc(v.id)}/infos" class="${prixVente ? 'hi' : ''}"><b>${prixVente ? formatCAD(prixVente) : 'Prix ?'}</b> prix de vente</a>`;
  }

  function majCarte() {
    const zoneCarte = $('#carte');
    if (!zoneCarte || !carteVisible) return;
    if (!window.L) { $('#aide-carte').textContent = 'Carte indisponible'; return; }
    if (!carte) {
      carte = L.map(zoneCarte, { scrollWheelZoom: false }).setView([25, 110], 3);
      // Fond de carte d'OpenStreetMap France : les noms des pays et des villes sont en français.
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abc', attribution: '© OpenStreetMap France, © les contributeurs d\'OpenStreetMap' }).addTo(carte);
      carte.couche = L.layerGroup().addTo(carte);
    }
    carte.couche.clearLayers();
    const jour = v.jours.find((j) => j.id === jourChoisi);
    const jours = jour && jour.items.length ? [jour] : v.jours;
    const points = [];
    for (const j of jours) {
      const ligne = [];
      j.items.forEach((it, k) => {
        const e = endroit(it.endroitId);
        if (!e?.lat || !e?.lng) return;
        const n = jours.length === 1 ? k + 1 : v.jours.indexOf(j) + 1;
        L.marker([e.lat, e.lng], { icon: L.divIcon({ className: 'repere', html: `<span style="--c:${categorie(e).couleur}">${n}</span>`, iconSize: [26, 26] }), title: e.nom })
          .bindTooltip(esc(e.nom)).addTo(carte.couche);
        points.push([e.lat, e.lng]);
        ligne.push([e.lat, e.lng]);
      });
      if (jours.length === 1 && ligne.length > 1) L.polyline(ligne, { color: '#ff6a47', weight: 2, dashArray: '4 6', opacity: 0.9 }).addTo(carte.couche);
    }
    if (points.length) carte.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
    const sansGps = jours.reduce((n, j) => n + j.items.filter((it) => !endroit(it.endroitId)?.lat).length, 0);
    $('#aide-carte').textContent = `${jours.length === 1 ? `Jour ${v.jours.indexOf(jours[0]) + 1}` : 'Tout le voyage'}${sansGps ? `, ${sansGps} sans GPS` : ''}`;
    setTimeout(() => carte && carte.invalidateSize(), 0);
  }

  function apresChangement() { enregistrer(); rendreJours(); rendreBiblio(); rendreResume(); majCarte(); majCrumb(); }
  function rendreTout() { rendreEtapes(); rendreFiltres(); rendreBiblio(); rendreJours(); rendreResume(); majCarte(); majCrumb(); }
  rendreTout();
}

function ongletClient(v, zone) {
  let mode = 'apercu';
  const rendre = () => {
    zone.innerHTML = `
      <div class="barre-client">
        <div class="seg">
          <button class="${mode === 'apercu' ? 'on' : ''}" data-mode="apercu">${icone('eye', { taille: 14 })} Aperçu à vendre</button>
          <button class="${mode === 'complet' ? 'on' : ''}" data-mode="complet">${icone('file-text', { taille: 14 })} Version complète</button>
        </div>
        <div class="head-actions">
          <button class="btn ghost sm" id="imprimer">${icone('printer', { taille: 14 })} Imprimer / PDF</button>
          <button class="btn sm" id="telecharger">${icone('download', { taille: 14 })} Télécharger la page</button>
        </div>
      </div>
      <p class="aide aide-client">${mode === 'apercu'
    ? `${icone('info', { taille: 14 })}<span>Ce que tu montres avant la vente : le trajet, les jours et le genre d'endroits. Les noms, adresses et liens sont cachés et les photos floues, sauf le jour 1, offert en exemple.</span>`
    : `${icone('lock', { taille: 14 })}<span>La version que le client reçoit après avoir payé. Tes notes privées ne sont jamais incluses.</span>`}</p>
      <div class="cadre-client">${htmlClient(v, mode)}</div>`;
    afficherPhotos(zone);
    zone.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { mode = b.dataset.mode; rendre(); }; });
    zone.querySelector('#imprimer').onclick = () => window.print();
    zone.querySelector('#telecharger').onclick = () => telechargerPage(v, mode);
  };
  rendre();
}

// ---------- Page client : version complète ou aperçu à vendre ----------
// L'aperçu montre le trajet, les jours et le genre d'endroits, mais cache les noms,
// les adresses et les liens (sauf le jour 1, offert comme échantillon).
// Les notes privées ne sont jamais montrées, dans aucune version.
function htmlClient(v, mode) {
  const apercu = mode === 'apercu';
  const couverture = photoCouverture(v);
  const prix = nombre(v.prixVente);
  const etapes = v.etapes.filter((et) => et.ville || et.pays);
  const jours = v.jours.map((j, i) => {
    const et = etapeDe(v, j);
    const cache = apercu && i > 0;
    const items = j.items.map((it) => {
      const e = endroit(it.endroitId);
      if (!e) return '';
      const cat = categorie(e);
      const genre = [e.type, e.sousType].filter(Boolean).join(', ') || cat.nom;
      const liens = cache ? '' : [
        lienCarte(e) ? `<a href="${esc(lienCarte(e))}" target="_blank" rel="noopener">Voir sur la carte</a>` : '',
        e.contacts?.site ? `<a href="${esc(lienWeb(e.contacts.site))}" target="_blank" rel="noopener">Site web</a>` : '',
        e.contacts?.reservation ? `<a href="${esc(lienWeb(e.contacts.reservation))}" target="_blank" rel="noopener">Réserver</a>` : '',
      ].filter(Boolean).join('');
      return `
        <li class="c-item" style="--c:${cat.couleur}">
          <div class="c-photo ${cache ? 'flou' : ''}">${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : `<span class="c-icone">${iconeCat(e.categorie, { taille: 30, epaisseur: 1.5 })}</span>`}</div>
          <div class="c-texte">
            <span class="c-cat">${iconeCat(e.categorie, { taille: 13 })}${esc(cat.nom)}</span>
            <h4>${cache ? esc(genre) : esc(e.nom)}</h4>
            ${cache ? `<p class="c-cache">${icone('lock', { taille: 13 })}<span>Nom, adresse et conseils dans l'itinéraire complet</span></p>` : `
              <p class="c-genre">${esc(genre)}${e.prix ? `, ${dollars(e.prix)}` : ''}</p>
              ${e.description ? `<p class="c-desc">${esc(e.description)}</p>` : ''}
              ${it.noteClient ? `<p class="c-conseil">${icone('sparkles', { taille: 14 })}<span>${esc(it.noteClient)}</span></p>` : ''}
              ${e.adresse ? `<p class="c-petit">${esc(e.adresse)}</p>` : ''}
              ${liens ? `<p class="c-liens">${liens}</p>` : ''}`}
          </div>
        </li>`;
    }).join('');
    const sous = [j.titre ? et.ville || et.pays : '', dateDuJour(v, i, { weekday: 'long', day: 'numeric', month: 'long' })].filter(Boolean).join(', ');
    return `
      <section class="c-jour">
        <div class="c-jour-tete">
          <span class="c-jour-num"><small>Jour</small>${i + 1}</span>
          <div>
            <h3>${esc(j.titre || et.ville || et.pays || '')}</h3>
            ${sous ? `<p>${esc(sous)}</p>` : ''}
          </div>
        </div>
        ${apercu && i === 0 ? '<p class="c-echantillon">Journée offerte en exemple : voici le niveau de détail de chaque jour.</p>' : ''}
        <ul class="c-items">${items || '<li class="c-libre">Journée libre</li>'}</ul>
      </section>`;
  }).join('');
  const appel = (bas) => (apercu ? `
    <div class="c-appel ${bas ? 'bas' : ''}">
      <div>
        <b>${bas ? 'Envie de partir ?' : 'Ceci est un aperçu'}</b>
        <p>L'itinéraire complet contient le nom de chaque endroit, les adresses, les cartes, les liens pour réserver et mes conseils pour chaque journée.</p>
      </div>
      ${prix ? `<span class="c-prix"><small>Itinéraire complet</small>${formatCAD(prix)} CA</span>` : ''}
    </div>` : '');
  return `
    <article class="client ${apercu ? 'mode-apercu' : ''}">
      <header class="c-couv ${couverture ? '' : 'sans'}">
        ${couverture ? `<img data-photo="${esc(couverture)}" alt="">` : ''}
        <div class="c-couv-texte">
          <p class="c-sur">${apercu ? 'Aperçu du voyage sur mesure' : 'Voyage sur mesure'}</p>
          <h1>${esc(v.titre)}</h1>
          <p class="c-meta">${[pluriel(v.jours.length, 'jour'), v.voyageurs ? pluriel(v.voyageurs, 'voyageur') : '', v.dateDebut ? `départ le ${dateDuJour(v, 0, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''].filter(Boolean).map(esc).join(', ')}</p>
        </div>
      </header>
      ${v.introClient ? `<p class="c-intro">${esc(v.introClient)}</p>` : ''}
      ${etapes.length ? `<ol class="c-route">${etapes.map((et) => `<li><b>${esc(et.ville || et.pays)}</b><span>${pluriel(et.jours, 'jour')}</span></li>`).join('')}</ol>` : ''}
      ${appel(false)}
      ${jours || '<p class="c-libre">Aucun jour pour l\'instant.</p>'}
      ${appel(true)}
    </article>`;
}

function miniature(blob, largeur) {
  return new Promise((ok) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = largeur;
      c.height = Math.max(1, Math.round((largeur * img.height) / img.width));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ok(''); };
    img.src = url;
  });
}
const enDataUrl = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

// Fabrique un seul fichier .html (photos et police incluses) à envoyer au client.
async function telechargerPage(v, mode) {
  const bouton = app.querySelector('#telecharger');
  bouton.disabled = true;
  try {
    const boite = document.createElement('div');
    boite.innerHTML = htmlClient(v, mode);
    for (const img of boite.querySelectorAll('img[data-photo]')) {
      const p = await db.lire('photos', img.dataset.photo);
      if (!p) { img.remove(); continue; }
      // Dans l'aperçu, les photos cachées sont réduites à une toute petite taille :
      // impossible de retrouver la vraie photo en enlevant le flou.
      img.src = img.closest('.flou') ? await miniature(p.blob, 48) : await enDataUrl(p.blob);
      img.removeAttribute('data-photo');
    }
    const css = await (await fetch(new URL('../css/client.css', import.meta.url))).text();
    let police = '';
    try { police = `@font-face{font-family:'Figtree';src:url(${await enDataUrl(await (await fetch(new URL('../fonts/figtree.woff2', import.meta.url))).blob())}) format('woff2');font-weight:300 900}`; } catch (_) { /* police du système */ }
    const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(v.titre)}</title><style>${police}${css}</style></head><body class="page-client-seule">${boite.innerHTML}</body></html>`;
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
  }
}

// ---------- Suivi client : la page privée du voyage en préparation ----------
// Pendant que Raph est sur place, le client reçoit une page à lui : le voyage qui se remplit,
// les nouvelles du terrain (texte, photos, vidéo), des choix à faire, et un bouton pour écrire
// à Raph en direct (WhatsApp, texto ou courriel). La page est un seul fichier .html à envoyer.
const nouveauSuivi = () => ({ objectif: 30, mot: '', nouvelles: [], choix: [] });
const numeroWhatsApp = (tel) => { const c = String(tel || '').replace(/\D/g, ''); return c.length === 10 ? `1${c}` : c; };
const endroitsDuVoyage = (v) => uniques(v.jours.flatMap((j) => j.items.map((it) => it.endroitId))).map(endroit).filter(Boolean);
const OPTIONS_PAR_CHOIX = 3;

function reduirePhoto(fichier, max = 1600) {
  return new Promise((ok) => {
    const img = new Image();
    const url = URL.createObjectURL(fichier);
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => ok(b || fichier), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ok(fichier); };
    img.src = url;
  });
}
async function garderPhotos(fichiers) {
  const ids = [];
  for (const f of fichiers) {
    const id = `suivi-${db.nouvelId()}`;
    await db.ecrire('photos', { id, blob: await reduirePhoto(f) });
    ids.push(id);
  }
  return ids;
}

// Ce que le client voit.
function htmlSuivi(v, contact) {
  const s = v.suivi || nouveauSuivi();
  const prenom = contact.prenom || 'moi';
  const reperes = endroitsDuVoyage(v);
  const objectif = Math.max(1, Math.round(nombre(s.objectif)) || 30);
  const part = Math.min(1, reperes.length / objectif);
  const couverture = photoCouverture(v);
  const etapes = v.etapes.filter((et) => et.ville || et.pays).map((et) => ({
    nom: et.ville || et.pays,
    n: uniques(v.jours.filter((j) => j.etapeId === et.id).flatMap((j) => j.items.map((it) => it.endroitId))).length,
  }));
  const derniers = [...reperes].sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || '')).slice(0, 12);
  const nouvelles = [...s.nouvelles].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const wa = numeroWhatsApp(contact.tel);
  const tel = String(contact.tel || '').replace(/[^\d+]/g, '');
  const bonjour = `Bonjour ${contact.prenom || ''}`.trim() + ',';
  const lienDirect = (canal) => {
    const t = encodeURIComponent(`${bonjour} `);
    if (canal === 'wa') return `https://wa.me/${wa}?text=${t}`;
    if (canal === 'sms') return `sms:${tel}?&body=${t}`;
    return `mailto:${contact.courriel}?subject=${encodeURIComponent(v.titre)}`;
  };
  const canaux = [wa ? ['wa', 'message-circle', 'WhatsApp'] : null, tel ? ['sms', 'phone', 'Texto'] : null, contact.courriel ? ['courriel', 'mail', 'Courriel'] : null].filter(Boolean);
  const boutons = (lien) => canaux.map(([k, ico, nom]) => `<a class="s-canal ${k}" data-canal="${k}" href="${esc(lien(k))}" target="_blank" rel="noopener">${icone(ico, { taille: 16 })}${nom}</a>`).join('');
  const option = (c, o) => {
    const e = o.endroitId ? endroit(o.endroitId) : null;
    const titre = o.titre || e?.nom || '';
    const photo = o.photo || e?.photos?.[0] || '';
    const texte = o.texte || e?.description || '';
    return `
      <button type="button" class="s-option ${c.reponse === o.id ? 'on' : ''}" data-choix="${esc(c.id)}" data-option="${esc(o.id)}" data-libelle="${esc(titre)}">
        <span class="s-opt-photo">${photo ? `<img data-photo="${esc(photo)}" alt="">` : icone('image', { taille: 26, epaisseur: 1.5 })}</span>
        <span class="s-opt-texte"><b>${esc(titre)}</b>${texte ? `<small>${esc(texte)}</small>` : ''}</span>
        <span class="s-coche">${icone('check', { taille: 16 })}</span>
      </button>`;
  };
  return `
    <article class="client suivi" data-cle="${esc(v.id)}" data-titre="${esc(v.titre)}" data-wa="${esc(wa)}" data-tel="${esc(tel)}" data-courriel="${esc(contact.courriel || '')}" data-bonjour="${esc(bonjour)}">
      <header class="c-couv ${couverture ? '' : 'sans'}">
        ${couverture ? `<img data-photo="${esc(couverture)}" alt="">` : ''}
        <div class="c-couv-texte">
          <p class="c-sur">Votre voyage en préparation</p>
          <h1>${esc(v.titre)}</h1>
          <p class="c-meta">${esc([v.client, contact.prenom ? `préparé sur place par ${contact.prenom}` : 'préparé sur place'].filter(Boolean).join(', '))}</p>
        </div>
      </header>
      ${s.mot ? `<p class="c-intro">${esc(s.mot)}</p>` : ''}

      <section class="s-bloc s-progres">
        <p class="s-titre">Sur le terrain pour vous</p>
        <div class="s-compte"><b>${reperes.length}</b><span>endroit${reperes.length > 1 ? 's' : ''} repéré${reperes.length > 1 ? 's' : ''} sur ${objectif}</span></div>
        <div class="s-barre"><i style="width:${Math.round(part * 100)}%"></i></div>
        ${etapes.length ? `<ol class="s-etapes">${etapes.map((et) => `<li class="${et.n ? 'fait' : ''}"><b>${esc(et.nom)}</b><span>${et.n ? `${et.n} repéré${et.n > 1 ? 's' : ''}` : 'bientôt'}</span></li>`).join('')}</ol>` : ''}
      </section>

      ${s.choix.length ? `
      <section class="s-bloc">
        <p class="s-titre">À vous de choisir</p>
        <p class="s-aide">Touchez ce qui vous attire le plus, puis envoyez-moi vos choix.</p>
        ${s.choix.map((c) => `
          <div class="s-choix" data-question="${esc(c.question)}" data-reponse="${esc(c.reponse || '')}">
            <h3>${esc(c.question)}</h3>
            <div class="s-options">${c.options.map((o) => option(c, o)).join('')}</div>
          </div>`).join('')}
        ${canaux.length ? `<div class="s-envoyer" hidden><b>Envoyer mes choix</b><div class="s-canaux">${boutons(lienDirect)}</div></div>` : ''}
      </section>` : ''}

      ${nouvelles.length ? `
      <section class="s-bloc">
        <p class="s-titre">Nouvelles du terrain</p>
        ${nouvelles.map((n) => `
          <div class="s-nouvelle">
            <p class="s-date">${esc(new Date(n.date).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }))}${n.lieu ? `, ${esc(n.lieu)}` : ''}</p>
            ${n.texte ? `<p class="s-texte">${esc(n.texte)}</p>` : ''}
            ${n.photos?.length ? `<div class="s-photos n${Math.min(3, n.photos.length)}">${n.photos.map((p) => `<img data-photo="${esc(p)}" alt="">`).join('')}</div>` : ''}
            ${n.video ? `<a class="s-video" href="${esc(lienWeb(n.video))}" target="_blank" rel="noopener">${icone('eye', { taille: 16 })}Voir la vidéo</a>` : ''}
          </div>`).join('')}
      </section>` : ''}

      ${derniers.length ? `
      <section class="s-bloc">
        <p class="s-titre">Derniers endroits repérés</p>
        <div class="s-reperes">${derniers.map((e) => `
          <div class="s-repere">
            <span class="s-rep-photo">${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : iconeCat(e.categorie, { taille: 24, epaisseur: 1.5 })}</span>
            <b>${esc(e.nom)}</b><small>${esc([categorie(e).nom, e.ville].filter(Boolean).join(', '))}</small>
          </div>`).join('')}</div>
      </section>` : ''}

      ${canaux.length ? `
      <nav class="s-contact">
        <span>Une question, une envie ? Écrivez à ${esc(prenom)}, en direct.</span>
        <div class="s-canaux">${boutons(lienDirect)}</div>
      </nav>` : ''}
    </article>`;
}

// Rend la page vivante : choisir une option, puis l'envoyer. Copiée telle quelle dans le fichier
// du client, donc elle ne doit rien utiliser d'autre qu'elle-même.
function scriptSuivi(racine) {
  const page = racine.querySelector('.suivi');
  if (!page) return;
  const cle = `choix-${page.dataset.cle}`;
  let choix = {};
  try { choix = JSON.parse(localStorage.getItem(cle) || '{}'); } catch (_) { /* rien */ }
  page.querySelectorAll('.s-choix').forEach((sec) => {
    const id = sec.querySelector('.s-option')?.dataset.choix;
    if (id && !(id in choix) && sec.dataset.reponse) choix[id] = sec.dataset.reponse;
  });
  const lien = (canal, texte) => {
    const t = encodeURIComponent(texte);
    if (canal === 'wa') return `https://wa.me/${page.dataset.wa}?text=${t}`;
    if (canal === 'sms') return `sms:${page.dataset.tel}?&body=${t}`;
    return `mailto:${page.dataset.courriel}?subject=${encodeURIComponent(page.dataset.titre)}&body=${t}`;
  };
  const maj = () => {
    page.querySelectorAll('.s-option').forEach((b) => b.classList.toggle('on', choix[b.dataset.choix] === b.dataset.option));
    const lignes = [...page.querySelectorAll('.s-choix')].map((sec) => {
      const b = sec.querySelector('.s-option.on');
      return b ? `- ${sec.dataset.question} : ${b.dataset.libelle}` : '';
    }).filter(Boolean);
    const boite = page.querySelector('.s-envoyer');
    if (!boite) return;
    boite.hidden = !lignes.length;
    const texte = `${page.dataset.bonjour}\n\nMes choix pour « ${page.dataset.titre} » :\n${lignes.join('\n')}`;
    boite.querySelectorAll('a[data-canal]').forEach((a) => { a.href = lien(a.dataset.canal, texte); });
  };
  page.addEventListener('click', (ev) => {
    const b = ev.target.closest('.s-option');
    if (!b) return;
    choix[b.dataset.choix] = choix[b.dataset.choix] === b.dataset.option ? '' : b.dataset.option;
    try { localStorage.setItem(cle, JSON.stringify(choix)); } catch (_) { /* rien */ }
    maj();
  });
  maj();
}

const MODELE_VISITE = {
  fr: (h, p, v) => `Bonjour,

Je prépare un voyage sur mesure pour des clients qui visiteront ${v || '[ville]'} bientôt, et je cherche les meilleurs hôtels où les envoyer.

Serait-il possible de visiter ${h || '[nom de l\'hôtel]'} (une chambre type et les espaces communs) pendant mon passage, le [date] ? Une visite de 20 minutes me suffit.

Merci beaucoup,
${p || '[ton prénom]'}
Voyages sur mesure`,
  en: (h, p, v) => `Hello,

I am planning a custom trip for clients who will visit ${v || '[city]'} soon, and I am looking for the best hotels to recommend to them.

Would it be possible to do a short site inspection of ${h || '[hotel name]'} (a sample room and the common areas) during my stay, on [date]? Twenty minutes would be plenty.

Thank you very much,
${p || '[your first name]'}
Custom travel planning`,
};

async function ongletSuivi(v, zone, enregistrer) {
  if (!v.suivi) v.suivi = nouveauSuivi();
  const s = v.suivi;
  const contact = {
    prenom: await db.lireReglage('prenomSuivi', ''),
    tel: await db.lireReglage('telFiche', ''),
    courriel: await db.lireReglage('courrielFiche', ''),
  };
  const paysVoyage = new Set(v.etapes.map((et) => et.pays).filter(Boolean));
  const proposables = endroitsUtilisables().filter((e) => !paysVoyage.size || paysVoyage.has(e.pays));
  const parVille = {};
  proposables.forEach((e) => { (parVille[e.ville || e.pays || 'Autre'] ||= []).push(e); });
  const selectEndroit = (i) => `<select data-opt-endroit="${i}"><option value="">Ou un endroit de ta carte…</option>${trier(Object.keys(parVille)).map((vil) => `<optgroup label="${esc(vil)}">${parVille[vil].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map((e) => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  let langueVisite = 'fr';
  const sauverEtRendre = () => { enregistrer(); rendre(); };

  function apercu() {
    const cadre = zone.querySelector('#apercu-suivi');
    cadre.innerHTML = htmlSuivi(v, contact);
    afficherPhotos(cadre);
    scriptSuivi(cadre);
  }

  function rendre() {
    const nouvelles = [...s.nouvelles].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    zone.innerHTML = `
      <div class="barre-client">
        <p class="aide-client">${icone('lock', { taille: 14 })}<span>Une page privée, juste pour ${esc(v.client || 'ce client')} : son voyage qui se remplit, tes nouvelles, ses choix à faire, et un bouton pour t'écrire en direct. Envoie le fichier par WhatsApp ou courriel, et renvoie-le à chaque nouvelle.</span></p>
        <div class="head-actions">
          <button class="btn sm" id="telecharger-suivi">${icone('download', { taille: 14 })} Télécharger la page</button>
          ${navigator.canShare ? `<button class="btn ghost sm" id="partager-suivi">${icone('send', { taille: 14 })} Envoyer</button>` : ''}
        </div>
      </div>
      <div class="grille-2">
        <section class="panel">
          <div class="panel-tete"><h3>La page</h3></div>
          <div class="form-grille">
            <label class="champ"><span>Ton prénom</span><input id="s-prenom" value="${esc(contact.prenom)}" placeholder="Ex. : Raph"></label>
            <label class="champ"><span>Objectif d'endroits</span><input id="s-objectif" type="number" min="1" value="${esc(s.objectif)}"></label>
            <label class="champ"><span>Ton cell <small>WhatsApp et texto</small></span><input id="s-tel" type="tel" value="${esc(contact.tel)}" placeholder="514 555-1234"></label>
            <label class="champ"><span>Ton courriel</span><input id="s-courriel" type="email" value="${esc(contact.courriel)}" placeholder="toi@exemple.com"></label>
            <label class="champ large"><span>Mot pour le client <small>en haut de sa page</small></span><textarea id="s-mot" rows="3" placeholder="Ex. : Je suis à Kyoto depuis trois jours. Chaque endroit de votre voyage, je l'aurai vu de mes yeux.">${esc(s.mot)}</textarea></label>
          </div>
        </section>
        <section class="panel">
          <div class="panel-tete"><h3>Une nouvelle du terrain</h3><span class="aide">Tous les 2 ou 3 jours</span></div>
          <div class="form-grille">
            <label class="champ large"><span>Ton message</span><textarea id="n-texte" rows="3" placeholder="Ex. : Testé ce matin le petit marché derrière votre ryokan. Vous allez l'adorer."></textarea></label>
            <label class="champ"><span>Où <small>optionnel</small></span><input id="n-lieu" placeholder="Ex. : Kyoto"></label>
            <label class="champ"><span>Lien d'une vidéo <small>optionnel</small></span><input id="n-video" placeholder="YouTube, Google Drive…"></label>
            <label class="champ large"><span>Photos <small>optionnel</small></span><input id="n-photos" type="file" accept="image/*" multiple></label>
          </div>
          <div class="rangee-btn"><button class="btn" id="publier">${icone('plus', { taille: 15 })} Ajouter la nouvelle</button></div>
          ${nouvelles.length ? `<ul class="liste-suivi">${nouvelles.map((n) => `
            <li><span><b>${esc(dateCourte(n.date))}${n.lieu ? `, ${esc(n.lieu)}` : ''}</b><small>${esc((n.texte || '').slice(0, 90))}${(n.texte || '').length > 90 ? '…' : ''}${n.photos?.length ? `, ${pluriel(n.photos.length, 'photo')}` : ''}${n.video ? ', vidéo' : ''}</small></span>
            <button class="btn danger sm" data-effacer-nouvelle="${esc(n.id)}" aria-label="Retirer">${icone('trash-2', { taille: 14 })}</button></li>`).join('')}</ul>` : ''}
        </section>
      </div>

      <section class="panel marge-panel">
        <div class="panel-tete"><h3>Un choix à lui faire faire</h3><span class="aide">Il touche ce qu'il préfère, puis t'envoie ses choix en un clic</span></div>
        <label class="champ"><span>La question</span><input id="c-question" placeholder="Ex. : Pour vos deux nuits à Kyoto ?"></label>
        <div class="options-suivi">${Array.from({ length: OPTIONS_PAR_CHOIX }, (_, i) => `
          <fieldset class="champ option-suivi">
            <span>Option ${i + 1}${i > 1 ? ' <small>optionnel</small>' : ''}</span>
            <input data-opt-titre="${i}" placeholder="${['Ex. : Ryokan avec onsen privé', 'Ex. : Hôtel design au centre', ''][i]}">
            <textarea data-opt-texte="${i}" rows="2" placeholder="Une phrase pour le faire rêver"></textarea>
            ${selectEndroit(i)}
            <input data-opt-photo="${i}" type="file" accept="image/*">
          </fieldset>`).join('')}</div>
        <div class="rangee-btn"><button class="btn" id="ajouter-choix">${icone('plus', { taille: 15 })} Ajouter le choix</button></div>
        ${s.choix.length ? `<ul class="liste-suivi">${s.choix.map((c) => `
          <li><span><b>${esc(c.question)}</b><span class="reponses">${c.options.map((o) => `<button class="puce ${c.reponse === o.id ? 'on' : ''}" data-marquer="${esc(c.id)}|${esc(o.id)}" title="Il a choisi ça">${c.reponse === o.id ? icone('check', { taille: 12 }) : ''}${esc(o.titre || endroit(o.endroitId)?.nom || '?')}</button>`).join('')}</span></span>
          <button class="btn danger sm" data-effacer-choix="${esc(c.id)}" aria-label="Retirer">${icone('trash-2', { taille: 14 })}</button></li>`).join('')}</ul>
          <p class="aide">Quand il t'envoie sa réponse, clique sur l'option qu'il a choisie : elle sera cochée sur sa page.</p>` : ''}
      </section>

      <section class="panel marge-panel">
        <div class="panel-tete"><h3>Visiter un hôtel gratuitement</h3><span class="aide">Les hôtels font visiter aux gens qui leur envoient des clients</span></div>
        <div class="form-grille">
          <label class="champ"><span>Nom de l'hôtel</span><input id="v-hotel" placeholder="Ex. : Hoshinoya Kyoto"></label>
          <label class="champ"><span>Ville</span><input id="v-ville" value="${esc(v.etapes.find((et) => et.ville)?.ville || '')}"></label>
        </div>
        <div class="seg marge-seg"><button class="${langueVisite === 'fr' ? 'on' : ''}" data-langue-visite="fr">Français</button><button class="${langueVisite === 'en' ? 'on' : ''}" data-langue-visite="en">English</button></div>
        <textarea id="v-texte" class="texte-modele" rows="11" readonly></textarea>
        <div class="rangee-btn"><button class="btn ghost" id="copier-visite">${icone('copy', { taille: 15 })} Copier le courriel</button></div>
      </section>

      <h2 class="titre-section">Ce que ${esc(v.client || 'le client')} voit <small>Touche une option pour essayer</small></h2>
      <div class="cadre-client" id="apercu-suivi"></div>`;
    apercu();
    brancher();
  }

  function brancher() {
    const champ = (id) => zone.querySelector(id);
    const reglage = (id, cle, k) => { champ(id).oninput = () => { contact[k] = champ(id).value.trim(); db.ecrireReglage(cle, contact[k]); apercu(); majVisite(); }; };
    reglage('#s-prenom', 'prenomSuivi', 'prenom');
    reglage('#s-tel', 'telFiche', 'tel');
    reglage('#s-courriel', 'courrielFiche', 'courriel');
    champ('#s-objectif').oninput = () => { s.objectif = +champ('#s-objectif').value || 30; enregistrer(); apercu(); };
    champ('#s-mot').oninput = () => { s.mot = champ('#s-mot').value; enregistrer(); apercu(); };

    champ('#publier').onclick = async () => {
      const texte = champ('#n-texte').value.trim();
      const fichiers = [...champ('#n-photos').files];
      const video = champ('#n-video').value.trim();
      if (!texte && !fichiers.length && !video) return toast('Écris un message ou ajoute une photo');
      champ('#publier').disabled = true;
      const photos = await garderPhotos(fichiers);
      s.nouvelles.push({ id: db.nouvelId(), date: new Date().toISOString(), texte, lieu: champ('#n-lieu').value.trim(), video, photos });
      toast('Nouvelle ajoutée. Renvoie la page au client.');
      sauverEtRendre();
    };
    zone.querySelectorAll('[data-effacer-nouvelle]').forEach((b) => { b.onclick = () => { s.nouvelles = s.nouvelles.filter((n) => n.id !== b.dataset.effacerNouvelle); sauverEtRendre(); }; });

    // Choisir un endroit remplit le titre et le texte de l'option.
    zone.querySelectorAll('[data-opt-endroit]').forEach((sel) => {
      sel.onchange = () => {
        const e = endroit(sel.value);
        const i = sel.dataset.optEndroit;
        if (!e) return;
        zone.querySelector(`[data-opt-titre="${i}"]`).value = e.nom;
        const t = zone.querySelector(`[data-opt-texte="${i}"]`);
        if (!t.value.trim()) t.value = e.description || '';
      };
    });
    champ('#ajouter-choix').onclick = async () => {
      const question = champ('#c-question').value.trim();
      if (!question) return toast('Écris la question');
      const options = [];
      for (let i = 0; i < OPTIONS_PAR_CHOIX; i++) {
        const titre = zone.querySelector(`[data-opt-titre="${i}"]`).value.trim();
        const endroitId = zone.querySelector(`[data-opt-endroit="${i}"]`).value;
        const fichier = zone.querySelector(`[data-opt-photo="${i}"]`).files[0];
        if (!titre && !endroitId) continue;
        const e = endroit(endroitId);
        options.push({
          id: db.nouvelId(), titre: titre || e?.nom || '', texte: zone.querySelector(`[data-opt-texte="${i}"]`).value.trim(), endroitId,
          photo: fichier ? (await garderPhotos([fichier]))[0] : '',
        });
      }
      if (options.length < 2) return toast('Il faut au moins 2 options');
      s.choix.push({ id: db.nouvelId(), question, options, reponse: '' });
      toast('Choix ajouté');
      sauverEtRendre();
    };
    zone.querySelectorAll('[data-marquer]').forEach((b) => {
      b.onclick = () => {
        const [cid, oid] = b.dataset.marquer.split('|');
        const c = s.choix.find((x) => x.id === cid);
        c.reponse = c.reponse === oid ? '' : oid;
        try { localStorage.removeItem(`choix-${v.id}`); } catch (_) { /* rien */ }
        sauverEtRendre();
      };
    });
    zone.querySelectorAll('[data-effacer-choix]').forEach((b) => { b.onclick = () => { s.choix = s.choix.filter((c) => c.id !== b.dataset.effacerChoix); sauverEtRendre(); }; });

    const majVisite = () => { champ('#v-texte').value = MODELE_VISITE[langueVisite](champ('#v-hotel').value.trim(), contact.prenom, champ('#v-ville').value.trim()); };
    champ('#v-hotel').oninput = majVisite;
    champ('#v-ville').oninput = majVisite;
    zone.querySelectorAll('[data-langue-visite]').forEach((b) => {
      b.onclick = () => { langueVisite = b.dataset.langueVisite; zone.querySelectorAll('[data-langue-visite]').forEach((x) => x.classList.toggle('on', x === b)); majVisite(); };
    });
    champ('#copier-visite').onclick = async () => { try { await navigator.clipboard.writeText(champ('#v-texte').value); toast('Courriel copié'); } catch (_) { champ('#v-texte').select(); } };
    majVisite();

    champ('#telecharger-suivi').onclick = () => envoyerSuivi(v, contact, false);
    const p = champ('#partager-suivi');
    if (p) p.onclick = () => envoyerSuivi(v, contact, true);
  }
  rendre();
}

// Fabrique le fichier .html du client (photos, police et petit script inclus).
async function envoyerSuivi(v, contact, partager) {
  const boutons = app.querySelectorAll('#telecharger-suivi, #partager-suivi');
  boutons.forEach((b) => { b.disabled = true; });
  try {
    const boite = document.createElement('div');
    boite.innerHTML = htmlSuivi(v, contact);
    for (const img of boite.querySelectorAll('img[data-photo]')) {
      const p = await db.lire('photos', img.dataset.photo);
      if (!p) { img.remove(); continue; }
      img.src = await miniature(p.blob, img.closest('.c-couv') ? 1600 : 1000);
      img.removeAttribute('data-photo');
    }
    const css = await (await fetch(new URL('../css/client.css', import.meta.url))).text();
    let police = '';
    try { police = `@font-face{font-family:'Figtree';src:url(${await enDataUrl(await (await fetch(new URL('../fonts/figtree.woff2', import.meta.url))).blob())}) format('woff2');font-weight:300 900}`; } catch (_) { /* police du système */ }
    const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(v.titre)}</title><style>${police}${css}</style></head><body class="page-client-seule">${boite.innerHTML}<script>(${scriptSuivi.toString()})(document);</script></body></html>`;
    const nom = `suivi-${sansAccents(v.titre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'voyage'}.html`;
    const fichier = new File([page], nom, { type: 'text/html' });
    if (partager && navigator.canShare?.({ files: [fichier] })) {
      try { await navigator.share({ files: [fichier], title: v.titre }); return; } catch (err) { if (err?.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(fichier);
    a.download = nom;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Page téléchargée. Envoie-la au client.');
  } catch (err) {
    toast("La page n'a pas pu être créée.");
  } finally {
    boutons.forEach((b) => { b.disabled = false; });
  }
}

// ---------- Contributeurs ----------
const barre = (p, classe = '') => `<span class="bar ${classe}"><i style="width:${Math.round(Math.min(1, Math.max(0, p)) * 100)}%"></i></span>`;
const initiales = (nom) => esc((nom || '?').trim().split(/\s+/).map((m) => m[0]).slice(0, 2).join('').toUpperCase());

function pageContributeurs(onglet) {
  const n = aValider().length;
  const bilans = etat.contributeurs.map((c) => ({ c, b: bilanContributeur(c) }));
  const du = bilans.reduce((s, x) => s + x.b.du, 0);
  const paye = etat.paiements.reduce((s, p) => s + nombre(p.montant), 0);
  const onglets = [['apercu', 'users', 'Contributeurs', etat.contributeurs.length], ['paiements', 'banknote', 'Paiements', ''], ['regles', 'settings', 'Règles', '']];
  app.innerHTML = `
    ${entete('Contributeurs', "Les personnes qui ajoutent des endroits pour toi, ce qu'elles ont envoyé et ce que tu leur dois.", `<button class="btn" id="ajout-contrib">${icone('user-plus', { taille: 15 })} Ajouter un contributeur</button>`)}
    <div class="kpis">
      <div class="kpi"><span>${icone('users', { taille: 15 })} Contributeurs</span><b>${etat.contributeurs.length}</b><small>${pluriel(bilans.reduce((s, x) => s + x.b.acceptes, 0), 'endroit accepté', 'endroits acceptés')}</small></div>
      <a class="kpi ${n ? 'hi' : ''}" href="#/a-valider"><span>${icone('inbox', { taille: 15 })} À valider</span><b>${n}</b><small>${n ? 'Endroits en attente' : 'Rien en attente'}</small></a>
      <div class="kpi ${du ? 'warn' : ''}"><span>${icone('wallet', { taille: 15 })} À payer</span><b>${formatArgent(du)}</b><small>Total dû maintenant</small></div>
      <div class="kpi"><span>${icone('circle-check-big', { taille: 15 })} Déjà payé</span><b>${formatArgent(paye)}</b><small>${pluriel(etat.paiements.length, 'paiement')}</small></div>
    </div>
    <nav class="tabs">${onglets.map(([k, ico, nom, c]) => `<a class="tab ${k === onglet ? 'on' : ''}" href="#/contributeurs/${k}">${icone(ico, { taille: 15 })}${nom}${c !== '' ? `<span class="n">${c}</span>` : ''}</a>`).join('')}</nav>
    <div id="contenu"></div>`;
  app.querySelector('#ajout-contrib').onclick = () => formulaireContributeur();
  const zone = app.querySelector('#contenu');
  if (onglet === 'paiements') ongletPaiements(zone, bilans);
  else if (onglet === 'regles') ongletRegles(zone);
  else ongletListeContrib(zone, bilans);
}

// ---------- À valider ----------
function pageAValider() {
  const n = aValider().length;
  app.innerHTML = `
    ${entete('À valider', n ? `${pluriel(n, 'endroit envoyé', 'endroits envoyés')} par tes contributeurs, les plus complets en premier. Accepte ce qui est bon : seuls les endroits acceptés servent dans tes voyages et sont payés.` : "Ici arrivent les endroits que tes contributeurs t'envoient.")}
    <div id="contenu"></div>`;
  ongletSoumissions(app.querySelector('#contenu'));
}

// ---------- Ventes ----------
function pageVentes(periode) {
  const vendus = etat.voyages.filter((v) => v.vendu && nombre(v.prixVente)).map((v) => ({ v, date: v.venduLe || (v.modifieLe || '').slice(0, 10), prix: nombre(v.prixVente) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = vendus.reduce((s, x) => s + x.prix, 0);
  const moisCourant = aujourdhui().slice(0, 7);
  const ceMois = vendus.filter((x) => x.date.startsWith(moisCourant)).reduce((s, x) => s + x.prix, 0);
  const moyenne = vendus.length ? total / vendus.length : 0;

  // Barres : un jour par barre (30 derniers jours) ou un mois par barre (12 derniers mois).
  const barres = [];
  const d = new Date(`${aujourdhui()}T12:00:00`);
  if (periode === '12m') {
    d.setDate(1);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const cle = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      barres.push({ cle, etiquette: m.toLocaleDateString('fr-CA', { month: 'short' }), titre: m.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) });
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const j = new Date(d); j.setDate(d.getDate() - i);
      const cle = j.toISOString().slice(0, 10);
      barres.push({ cle, etiquette: String(j.getDate()), titre: j.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }) });
    }
  }
  for (const b of barres) {
    const ventes = vendus.filter((x) => x.date.startsWith(b.cle));
    b.montant = ventes.reduce((s, x) => s + x.prix, 0);
    b.nb = ventes.length;
  }
  const max = Math.max(...barres.map((b) => b.montant), 1);
  const periodeTotal = barres.reduce((s, b) => s + b.montant, 0);
  const graduation = (() => { const brut = max / 4; const p = 10 ** Math.floor(Math.log10(brut)); return Math.ceil(brut / p) * p; })();
  const haut = graduation * 4;

  app.innerHTML = `
    ${entete('Ventes', 'Les itinéraires marqués « vendu » dans l\'onglet « Infos et vente » de chaque voyage.')}
    <div class="kpis kpis-3">
      <div class="kpi"><span>${icone('banknote', { taille: 15 })} Total</span><b>${formatCAD(total)}</b><small>${pluriel(vendus.length, 'itinéraire vendu', 'itinéraires vendus')}</small></div>
      <div class="kpi"><span>${icone('calendar', { taille: 15 })} Ce mois-ci</span><b>${formatCAD(ceMois)}</b><small>${new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</small></div>
      <div class="kpi"><span>${icone('target', { taille: 15 })} Prix moyen</span><b>${formatCAD(moyenne)}</b><small>par itinéraire</small></div>
    </div>
    <section class="panel graphique">
      <div class="panel-tete"><h3>${periode === '12m' ? 'Par mois' : 'Par jour'}</h3><span class="aide">${formatCAD(periodeTotal)} sur ${periode === '12m' ? '12 mois' : '30 jours'}</span>
        <div class="seg petit-seg"><a class="${periode === '12m' ? '' : 'on'}" href="#/ventes/30j">30 jours</a><a class="${periode === '12m' ? 'on' : ''}" href="#/ventes/12m">12 mois</a></div>
      </div>
      <div class="barres" style="--n:${barres.length}">
        <div class="axe">${[4, 3, 2, 1, 0].map((k) => `<span>${formatCAD(graduation * k)}</span>`).join('')}</div>
        <div class="zone-barres">
          ${[4, 3, 2, 1].map((k) => `<i class="ligne-axe" style="bottom:${(k / 4) * 100}%"></i>`).join('')}
          ${barres.map((b) => `<div class="barre ${b.montant ? '' : 'zero'}" title="${esc(b.titre)} : ${b.montant ? `${formatCAD(b.montant)} (${pluriel(b.nb, 'vente')})` : 'aucune vente'}"><i style="height:${(b.montant / haut) * 100}%"></i><span>${esc(b.etiquette)}</span></div>`).join('')}
        </div>
      </div>
      ${vendus.length ? '' : '<p class="aide graphique-vide">Pas encore de vente. Quand tu vends un itinéraire, ouvre-le, va dans « Infos et vente » et coche « Itinéraire vendu ».</p>'}
    </section>
    <section class="panel">
      <div class="panel-tete"><h3>Itinéraires vendus</h3></div>
      ${vendus.length ? `<table class="tableau"><thead><tr><th>Date</th><th>Voyage</th><th>Client</th><th class="num">Prix</th></tr></thead><tbody>
        ${vendus.map((x) => `<tr><td>${esc(dateCourte(x.date))}</td><td><a class="lien-tableau" href="#/voyage/${esc(x.v.id)}/infos">${esc(x.v.titre)}</a></td><td class="doux">${esc(x.v.client || '')}</td><td class="num">${formatCAD(x.prix)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="vide-ligne">Aucun itinéraire vendu pour l\'instant.</p>'}
    </section>`;
}

// Le lien que le contributeur ouvre sur son cellulaire : l'appli simple, déjà à son nom.
const lienInvitation = (c) => `${new URL('../contribuer.html', location.href).href}?c=${encodeURIComponent(c.id)}&n=${encodeURIComponent(c.nom)}`;
function montrerInvitation(c) {
  const l = lienInvitation(c);
  ouvrirModale(`Le lien de ${esc(c.nom)}`, `
    <p class="doux">Envoie ce lien à ${esc(c.nom)}. Sur son cellulaire, il ouvre l'appli des contributeurs, déjà à son nom. Quand ses endroits sont prêts, il touche « Envoyer » et te transmet un fichier, que tu importes dans « Mes données ».</p>
    <div class="lien-invit"><code>${esc(l)}</code></div>`, async () => {
    try { await navigator.clipboard.writeText(l); toast('Lien copié'); } catch (_) { prompt('Copie ce lien :', l); }
    return true;
  }, { ok: 'Copier le lien' });
}

function formulaireContributeur(c = null) {
  ouvrirModale(c ? 'Modifier le contributeur' : 'Nouveau contributeur', `
    <div class="form-grille">
      <label class="champ large"><span>Nom</span><input name="nom" required value="${esc(c?.nom)}" placeholder="Ex. : Mai Tran"></label>
      <label class="champ"><span>Ville</span><input name="ville" value="${esc(c?.ville)}" placeholder="Ex. : Hanoï"></label>
      <label class="champ"><span>Pays</span><input name="pays" value="${esc(c?.pays)}" placeholder="Ex. : Vietnam"></label>
      <label class="champ large"><span>Contact <small>courriel, WhatsApp, Instagram…</small></span><input name="contact" value="${esc(c?.contact)}"></label>
      <label class="champ large"><span>Façon de le payer <small>PayPal, Wise, virement…</small></span><input name="paiement" value="${esc(c?.paiement)}"></label>
      <label class="champ large"><span>Notes</span><textarea name="notes" rows="2">${esc(c?.notes)}</textarea></label>
    </div>`, async (val) => {
    if (!val.nom.trim()) return false;
    const objet = { ...(c || { id: db.nouvelId(), creeLe: new Date().toISOString() }), ...val, nom: val.nom.trim() };
    await sauver('contributeurs', objet);
    toast(c ? 'Contributeur modifié' : 'Contributeur ajouté');
    router();
    if (!c) setTimeout(() => montrerInvitation(objet), 50);
    return true;
  }, { ok: c ? 'Enregistrer' : 'Ajouter' });
}

function ongletListeContrib(zone, bilans) {
  const r = etat.regles;
  const explications = `
    <div class="grille-3 explique">
      <div class="panel"><span class="rond-ico">${icone('map-pin', { taille: 18 })}</span><b>${formatArgent(r.parEndroit)} par endroit accepté</b><p>Tu valides chaque endroit. Plus la fiche est complète, plus elle a de chances d'être acceptée.</p></div>
      <div class="panel"><span class="rond-ico">${icone('trophy', { taille: 18 })}</span><b>${formatArgent(r.bonusVille)} par ville complète</b><p>${GROUPES_VILLE.map(([k, nom]) => `${r.cibles[k]} ${nom.toLowerCase()}`).join(', ')}. Les trajets en plus remplacent les bars manquants ; un trajet complexe compte double.</p></div>
      <div class="panel"><span class="rond-ico">${icone('percent', { taille: 18 })}</span><b>${pct(r.pourcentage)} des ventes</b><p>Quand un itinéraire vendu utilise ses endroits, selon sa part du voyage. ${esc(r.recompenseVoyage)} à ${r.seuilVoyage} endroits.</p></div>
    </div>`;
  if (!bilans.length) {
    zone.innerHTML = `
      <div class="panel vide-bloc">
        ${icone('users', { taille: 28, epaisseur: 1.6 })}
        <b>Aucun contributeur pour l'instant</b>
        <span>Ajoute une personne ici : tu reçois un lien à lui envoyer. Elle ouvre l'appli des contributeurs sur son cellulaire, ajoute ses endroits, puis t'envoie un fichier que tu importes dans « Mes données ».</span>
        <button class="btn" id="ajout-vide">${icone('user-plus', { taille: 15 })} Ajouter un contributeur</button>
      </div>
      ${explications}`;
    zone.querySelector('#ajout-vide').onclick = () => formulaireContributeur();
    return;
  }
  bilans.sort((a, b) => b.b.du - a.b.du || b.b.acceptes - a.b.acceptes);
  zone.innerHTML = `
    <div class="liste-contrib">
      ${bilans.map(({ c, b }) => {
        const villeProche = b.villes.find((x) => !x.complete);
        const nbBonus = b.villes.filter((x) => x.complete).length;
        return `
        <section class="panel contrib">
          <div class="contrib-tete">
            <span class="avatar">${initiales(c.nom)}</span>
            <div class="contrib-nom"><b>${esc(c.nom)}</b><small>${esc([c.ville, c.pays].filter(Boolean).join(', ') || 'Ville non précisée')}${c.contact ? `, ${esc(c.contact)}` : ''}</small></div>
            <div class="head-actions">
              <button class="btn ${b.du > 0 ? '' : 'ghost'} sm" data-payer="${esc(c.id)}" ${b.du > 0 ? '' : 'disabled'}>${icone('banknote', { taille: 14 })} ${b.du > 0 ? `Payer ${formatArgent(b.du)}` : 'Rien à payer'}</button>
              <button class="btn ghost sm" data-invitation="${esc(c.id)}">${icone('link', { taille: 14 })} Son lien</button>
              <button class="ico-btn" data-modifier="${esc(c.id)}" aria-label="Modifier">${icone('pencil', { taille: 15 })}</button>
            </div>
          </div>
          <div class="contrib-chiffres">
            <div><b>${b.acceptes}</b><span>acceptés</span></div>
            <div class="${b.enAttente ? 'hi' : ''}"><b>${b.enAttente}</b><span>à valider</span></div>
            <div><b>${b.refuses}</b><span>refusés</span></div>
            <div><b>${formatArgent(b.gagne)}</b><span>gagné</span></div>
            <div><b>${formatArgent(b.paye)}</b><span>payé</span></div>
            <div class="${b.du ? 'warn' : ''}"><b>${formatArgent(b.du)}</b><span>à payer</span></div>
          </div>
          <div class="recompenses">
            <div class="recomp">
              <div class="recomp-tete">${icone('trophy', { taille: 15 })}<b>Ville complète</b><span>${nbBonus ? `${nbBonus} × ${formatArgent(r.bonusVille)}` : formatArgent(r.bonusVille)}</span></div>
              ${villeProche ? `${barre(villeProche.progres)}<p>${esc(villeProche.ville || '?')} à ${Math.round(villeProche.progres * 100)} %. Manque : ${esc(villeProche.manque.slice(0, 2).join(', '))}${villeProche.manque.length > 2 ? '…' : ''}</p>` : `${barre(nbBonus ? 1 : 0, nbBonus ? 'ok' : '')}<p>${b.villes.length ? 'Toutes ses villes sont complètes.' : "Aucun endroit accepté pour l'instant."}</p>`}
            </div>
            <div class="recomp">
              <div class="recomp-tete">${icone('gift', { taille: 15 })}<b>${esc(r.recompenseVoyage)}</b><span>${r.seuilVoyage} endroits</span></div>
              ${barre(b.progresVoyage, b.progresVoyage >= 1 ? 'ok' : '')}<p>${b.progresVoyage >= 1 ? 'Objectif atteint !' : `${b.acceptes} / ${r.seuilVoyage}, encore ${r.seuilVoyage - b.acceptes}`}</p>
            </div>
            <div class="recomp">
              <div class="recomp-tete">${icone('percent', { taille: 15 })}<b>Part des ventes</b><span>${pct(r.pourcentage)}</span></div>
              <p>${b.ventes.length ? b.ventes.map((x) => `${esc(x.titre)} : ${formatArgent(x.montant)}`).join(', ') : 'Aucun itinéraire vendu avec ses endroits.'}</p>
            </div>
          </div>
        </section>`;
      }).join('')}
    </div>
    ${explications}`;
  zone.querySelectorAll('[data-modifier]').forEach((b) => { b.onclick = () => formulaireContributeur(etat.contributeurs.find((c) => c.id === b.dataset.modifier)); });
  zone.querySelectorAll('[data-invitation]').forEach((b) => { b.onclick = () => montrerInvitation(etat.contributeurs.find((c) => c.id === b.dataset.invitation)); });
  zone.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => formulairePaiement(b.dataset.payer); });
}

function formulairePaiement(contributeurId) {
  const c = etat.contributeurs.find((x) => x.id === contributeurId);
  const b = bilanContributeur(c);
  ouvrirModale(`Paiement à ${esc(c.nom)}`, `
    <div class="form-grille">
      <label class="champ"><span>Montant ($ CA)</span><input name="montant" inputmode="decimal" required value="${b.du ? b.du.toFixed(2) : ''}"></label>
      <label class="champ"><span>Date</span><input name="date" type="date" value="${aujourdhui()}"></label>
      <label class="champ large"><span>Note <small>ex. : PayPal, référence…</small></span><input name="note" value="${esc(c.paiement || '')}"></label>
    </div>
    <p class="aide">À payer en ce moment : ${formatArgent(b.du)}. Ceci ne fait pas le virement : ça note seulement que tu l'as fait.</p>`, async (val) => {
    const montant = nombre(val.montant);
    if (!(montant > 0)) return false;
    await sauver('paiements', { id: db.nouvelId(), contributeurId, montant, date: val.date || aujourdhui(), note: val.note.trim() });
    toast('Paiement noté');
    router();
    return true;
  }, { ok: 'Noter le paiement' });
}

// ---------- Vérification des photos des contributeurs ----------
// Aucun outil gratuit ne fouille tout internet tout seul. Le Studio fait donc ce qui est
// faisable sans service payant :
//  1. il lit les infos cachées de la photo (envoyées par l'appli des contributeurs) :
//     appareil, date, position GPS, logiciel de retouche ;
//  2. il compare chaque photo à toutes les autres photos déjà reçues (même photo réutilisée) ;
//  3. pour une photo douteuse, un clic copie la photo et ouvre Google Lens ou TinEye :
//     on colle (Ctrl+V) et on voit si elle existe déjà ailleurs (Google Maps, Reddit, Facebook…).
const empreintes = new Map(); // id photo -> empreinte de 64 bits (« dHash »)
async function empreinte(id) {
  if (empreintes.has(id)) return empreintes.get(id);
  let h = null;
  try {
    const p = await db.lire('photos', id);
    const bmp = await createImageBitmap(p.blob);
    const c = document.createElement('canvas');
    c.width = 9; c.height = 8;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, 9, 8);
    const d = ctx.getImageData(0, 0, 9, 8).data;
    const gris = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    h = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (y * 9 + x) * 4; h += gris(i) > gris(i + 4) ? '1' : '0'; }
  } catch (_) { h = null; }
  empreintes.set(id, h);
  return h;
}
const ecartBits = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
const RETOUCHE = /photoshop|lightroom|canva|snapseed|picsart|gimp|facetune|vsco|meitu|remini/i;
const distTexte = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

async function indexPhotos() {
  const index = [];
  for (const e of etat.endroits) for (const id of e.photos || []) index.push({ id, endroitId: e.id, h: await empreinte(id) });
  return index;
}

// Résultat : vert (rien à signaler), orange (à regarder), rouge (presque sûrement pas la sienne).
async function verifierPhotos(e, index) {
  let niveau = 'vert';
  const pire = (n) => { if (n === 'rouge' || (n === 'orange' && niveau === 'vert')) niveau = n; };
  const photos = [];
  for (const pid of e.photos || []) {
    const info = e.photosInfo?.[pid];
    const raisons = [];
    let n = 'vert';
    const marquer = (x, r) => { raisons.push(r); if (x === 'rouge' || n === 'vert') n = x; };
    if (!info) marquer('orange', 'envoyée sans les infos de la photo (ancienne version de l\'appli)');
    else {
      if (!info.appareil) marquer('orange', 'aucun appareil photo dans le fichier : capture d\'écran ou image d\'internet ?');
      if (info.logiciel && RETOUCHE.test(info.logiciel)) marquer('orange', `retouchée avec ${info.logiciel}`);
      if (info.datePhoto) {
        const mois = (Date.now() - new Date(info.datePhoto)) / 2.63e9;
        if (mois > 18) marquer('orange', `prise en ${info.datePhoto.slice(0, 4)}`);
      } else if (info.appareil) marquer('orange', 'date de la prise inconnue');
      if (info.lat != null && e.lat) {
        const m = distanceM(info, { lat: +e.lat, lng: +e.lng });
        if (m > 1000) marquer('rouge', `prise à ${distTexte(m)} de l'endroit`);
      }
    }
    const h = await empreinte(pid);
    if (h) {
      const double = index.find((x) => x.id !== pid && x.endroitId !== e.id && x.h && ecartBits(x.h, h) <= 5);
      if (double) {
        const autre = endroit(double.endroitId);
        // La photo la plus ancienne est sans doute l'originale : seule la copie est en rouge.
        if ((autre?.creeLe || '') <= (e.creeLe || '')) marquer('rouge', `même photo que « ${autre?.nom || 'un autre endroit'} », reçu avant`);
        else marquer('orange', `la même photo a été réutilisée plus tard pour « ${autre?.nom || 'un autre endroit'} »`);
      }
    }
    photos.push({ id: pid, niveau: n, raisons });
    pire(n);
  }
  if (!photos.length) pire('orange');
  return { niveau, photos };
}

// Copie la photo puis ouvre Google Lens ou TinEye : il reste à coller (Ctrl+V).
function chercherEnLigne(pid, moteur) {
  window.open(moteur === 'tineye' ? 'https://tineye.com/' : 'https://lens.google.com/', '_blank', 'noopener');
  const png = db.lire('photos', pid).then(async (p) => {
    const bmp = await createImageBitmap(p.blob);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    return new Promise((ok) => c.toBlob(ok, 'image/png'));
  });
  navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    .then(() => toast('Photo copiée : dans la page qui s\'ouvre, fais Ctrl+V'))
    .catch(() => toast('Copie impossible : enregistre la photo et dépose-la dans la page'));
}

function ongletSoumissions(zone) {
  const liste = aValider().sort((a, b) => completude(b).score - completude(a).score);
  if (!liste.length) {
    zone.innerHTML = `<div class="panel vide-bloc">${icone('circle-check-big', { taille: 28, epaisseur: 1.6 })}<b>Rien à valider</b><span>Quand tu importes le fichier d'un contributeur (dans « Mes données »), ses nouveaux endroits arrivent ici.</span></div>`;
    return;
  }
  zone.innerHTML = `
    <div class="barre-actions"><span>${pluriel(liste.length, 'endroit')} en attente, les plus complets en premier.</span>
      <button class="btn sm" id="accepter-verts" disabled>${icone('shield-check', { taille: 14 })} Accepter toutes les fiches sûres</button></div>
    <p class="aide">Une fiche est sûre quand ses photos ont passé la vérification (appareil photo, date, position, aucune copie) et qu'elle a sa position et une vraie description. Regarde seulement les autres.</p>
    <div class="soumissions">
      ${liste.map((e) => {
        const cat = categorie(e);
        const c = etat.contributeurs.find((x) => x.id === e.contributeurId);
        const { score, manque } = completude(e);
        return `
          <article class="panel soum" style="--c:${cat.couleur}">
            <div class="soum-photo">${iconeCat(e.categorie, { taille: 26, epaisseur: 1.5 })}${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : ''}${e.photos?.length > 1 ? `<span class="soum-nb">${e.photos.length} photos</span>` : ''}</div>
            <div class="soum-corps">
              <span class="c-cat">${iconeCat(e.categorie, { taille: 12 })}${esc([cat.nom, e.sousType || e.type, e.complexe ? 'trajet complexe, compte double' : ''].filter(Boolean).join(', '))}</span>
              <b class="soum-nom">${esc(e.nom)}</b>
              <small>${esc([e.ville, e.pays].filter(Boolean).join(', '))}. Par ${esc(c?.nom || 'inconnu')}, reçu le ${esc(dateCourte(e.recuLe))}</small>
              <div class="score">${barre(score / 100, score >= 80 ? 'ok' : score >= 50 ? '' : 'bad')}<span>${score} % complet</span></div>
              ${manque.length ? `<p class="manque">Manque : ${esc(manque.join(', '))}</p>` : ''}
              <div class="verif" data-verif="${esc(e.id)}"><div class="verif-tete">${icone('shield-check', { taille: 15 })} Vérification des photos…</div></div>
              <details><summary>Voir la fiche</summary>
                <dl class="fiche-courte">
                  ${e.description ? `<dt>Description</dt><dd>${esc(e.description)}</dd>` : ''}
                  ${e.notes ? `<dt>Notes privées</dt><dd>${esc(e.notes)}</dd>` : ''}
                  ${e.prix || e.montant ? `<dt>Prix</dt><dd>${dollars(e.prix)} ${esc(e.montant || '')} ${esc(e.montant ? e.devise : '')}</dd>` : ''}
                  ${e.adresse ? `<dt>Adresse</dt><dd>${esc(e.adresse)}</dd>` : ''}
                  ${e.lat ? `<dt>GPS</dt><dd><a href="https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}" target="_blank" rel="noopener">${e.lat}, ${e.lng}</a></dd>` : ''}
                  ${e.verifieLe ? `<dt>Visité le</dt><dd>${esc(dateCourte(e.verifieLe))}</dd>` : ''}
                </dl>
              </details>
            </div>
            <div class="soum-actions">
              <button class="btn sm" data-accepter="${esc(e.id)}">${icone('check', { taille: 14 })} Accepter</button>
              <button class="btn danger sm" data-refuser="${esc(e.id)}">${icone('x', { taille: 14 })} Refuser</button>
            </div>
          </article>`;
      }).join('')}
    </div>`;
  afficherPhotos(zone);
  const decider = async (id, statut, raison = '') => {
    const e = endroit(id);
    Object.assign(e, { statut, decideLe: new Date().toISOString(), raisonRefus: raison || undefined });
    await sauver('endroits', e);
  };
  zone.querySelectorAll('[data-accepter]').forEach((b) => { b.onclick = async () => { await decider(b.dataset.accepter, 'accepte'); toast('Endroit accepté'); router(); }; });
  zone.querySelectorAll('[data-refuser]').forEach((b) => {
    b.onclick = () => ouvrirModale('Refuser cet endroit ?', `<label class="champ"><span>Raison <small>optionnel, pour l'expliquer au contributeur</small></span><input name="raison" placeholder="Ex. : photo floue, endroit fermé…"></label>`, async (val) => {
      await decider(b.dataset.refuser, 'refuse', val.raison.trim());
      toast('Endroit refusé');
      router();
      return true;
    }, { ok: 'Refuser', danger: true });
  });
  // Vérification des photos, puis le bouton « Accepter toutes les fiches sûres ».
  const resultats = new Map();
  (async () => {
    const index = await indexPhotos();
    for (const e of liste) {
      const r = await verifierPhotos(e, index);
      resultats.set(e.id, r);
      const boite = zone.querySelector(`[data-verif="${CSS.escape(e.id)}"]`);
      if (!boite) continue;
      const titres = { vert: 'Photos vérifiées : rien à signaler', orange: 'Photos à regarder', rouge: 'Photo probablement pas la sienne' };
      const raisons = r.photos.flatMap((p) => p.raisons);
      boite.className = `verif ${r.niveau}`;
      boite.innerHTML = `
        <div class="verif-tete">${icone(r.niveau === 'vert' ? 'shield-check' : 'shield-alert', { taille: 15 })} ${r.photos.length ? titres[r.niveau] : 'Aucune photo'}</div>
        ${raisons.length ? `<ul>${[...new Set(raisons)].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${r.niveau !== 'vert' && r.photos.length ? `<div class="verif-photos">${r.photos.map((p) => `
          <div class="verif-photo ${p.niveau}"><img data-photo="${esc(p.id)}" alt="">
            <div class="chercher"><button type="button" data-chercher="${esc(p.id)}" data-moteur="google" title="Chercher cette photo sur Google Lens">Google</button><button type="button" data-chercher="${esc(p.id)}" data-moteur="tineye" title="Chercher cette photo sur TinEye">TinEye</button></div>
          </div>`).join('')}</div>` : ''}`;
      afficherPhotos(boite);
    }
    const surs = liste.filter((e) => resultats.get(e.id)?.niveau === 'vert' && e.lat && (e.description || '').length >= 20);
    const bouton = zone.querySelector('#accepter-verts');
    if (!bouton) return;
    bouton.disabled = !surs.length;
    bouton.innerHTML = `${icone('shield-check', { taille: 14 })} ${surs.length === 1 ? 'Accepter la fiche sûre' : surs.length ? `Accepter les ${surs.length} fiches sûres` : 'Aucune fiche sûre pour l\'instant'}`;
    bouton.onclick = async () => {
      for (const e of surs) await decider(e.id, 'accepte');
      toast(pluriel(surs.length, 'endroit accepté', 'endroits acceptés'));
      router();
    };
  })();
  zone.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-chercher]');
    if (b) chercherEnLigne(b.dataset.chercher, b.dataset.moteur);
  });
}

function ongletPaiements(zone, bilans) {
  const tries = [...etat.paiements].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const nom = (id) => etat.contributeurs.find((c) => c.id === id)?.nom || 'Contributeur supprimé';
  const dus = bilans.filter((x) => x.b.du > 0).sort((a, b) => b.b.du - a.b.du);
  zone.innerHTML = `
    <div class="grille-2">
      <section class="panel">
        <div class="panel-tete"><h3>À payer</h3></div>
        ${dus.length ? `<ul class="lignes">${dus.map(({ c, b }) => `<li><span class="avatar petit">${initiales(c.nom)}</span><span class="l-txt"><b>${esc(c.nom)}</b><small>${pluriel(b.acceptes, 'endroit')}${b.bonus ? `, bonus ${formatArgent(b.bonus)}` : ''}${b.commissions ? `, ventes ${formatArgent(b.commissions)}` : ''}</small></span><b class="l-montant">${formatArgent(b.du)}</b><button class="btn sm" data-payer="${esc(c.id)}">Payer</button></li>`).join('')}</ul>` : "<p class=\"vide-ligne\">Personne à payer pour l'instant.</p>"}
      </section>
      <section class="panel">
        <div class="panel-tete"><h3>Historique</h3></div>
        ${tries.length ? `<table class="tableau"><thead><tr><th>Date</th><th>Contributeur</th><th>Note</th><th class="num">Montant</th><th></th></tr></thead><tbody>
          ${tries.map((p) => `<tr><td>${esc(dateCourte(p.date))}</td><td>${esc(nom(p.contributeurId))}</td><td class="doux">${esc(p.note || '')}</td><td class="num">${formatArgent(nombre(p.montant))}</td><td><button class="ico-btn rouge" data-effacer-paiement="${esc(p.id)}" aria-label="Effacer">${icone('trash-2', { taille: 14 })}</button></td></tr>`).join('')}
        </tbody></table>` : '<p class="vide-ligne">Aucun paiement noté.</p>'}
      </section>
    </div>`;
  zone.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => formulairePaiement(b.dataset.payer); });
  zone.querySelectorAll('[data-effacer-paiement]').forEach((b) => {
    b.onclick = () => ouvrirModale('Effacer ce paiement ?', '<p>Le montant redeviendra « à payer ».</p>', async () => {
      await effacerEt('paiements', b.dataset.effacerPaiement);
      router();
    }, { ok: 'Effacer', danger: true });
  });
}

function ongletRegles(zone) {
  const r = etat.regles;
  zone.innerHTML = `
    <form class="panel regles" id="regles">
      <p class="aide">Ces règles servent à calculer ce que tu dois à chaque contributeur. Tu pourras les ajuster après tes tests.</p>
      <div class="form-grille">
        <label class="champ"><span>Par endroit accepté ($ CA)</span><input name="parEndroit" inputmode="decimal" value="${r.parEndroit}"></label>
        <label class="champ"><span>Pourcentage sur les ventes (%) <small>ex. : 0,5 ou 1</small></span><input name="pourcentage" inputmode="decimal" value="${r.pourcentage}"></label>
        <label class="champ"><span>Bonus ville complète ($ CA)</span><input name="bonusVille" inputmode="decimal" value="${r.bonusVille}"></label>
        <fieldset class="champ large"><span>Une ville complète <small>Activités = Visites, Expériences et Sport. Les trajets en plus remplacent les bars manquants ; un trajet complexe compte double.</small></span>
          <div class="cibles-ville">${GROUPES_VILLE.map(([k, nom]) => `<label class="champ"><span>${nom}</span><input name="cible-${k}" type="number" min="0" value="${r.cibles[k]}"></label>`).join('')}</div>
        </fieldset>
        <label class="champ"><span>Récompense des meilleurs</span><input name="recompenseVoyage" value="${esc(r.recompenseVoyage)}"></label>
        <label class="champ"><span>À partir de (endroits acceptés)</span><input name="seuilVoyage" type="number" min="1" value="${r.seuilVoyage}"></label>
      </div>
      <div class="pied-form"><button class="btn">${icone('save', { taille: 15 })} Enregistrer les règles</button></div>
    </form>`;
  zone.querySelector('#regles').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const nouvelles = {
      parEndroit: nombre(f.get('parEndroit')), pourcentage: nombre(f.get('pourcentage')), bonusVille: nombre(f.get('bonusVille')),
      cibles: Object.fromEntries(GROUPES_VILLE.map(([k]) => [k, Math.max(0, parseInt(f.get(`cible-${k}`), 10) || 0)])),
      recompenseVoyage: String(f.get('recompenseVoyage') || '').trim() || REGLES_DEFAUT.recompenseVoyage,
      seuilVoyage: Math.max(1, parseInt(f.get('seuilVoyage'), 10) || 1),
    };
    await db.ecrireReglage('reglesContrib', nouvelles);
    etat.regles = { ...REGLES_DEFAUT, ...nouvelles };
    toast('Règles enregistrées');
  };
}

// ---------- Mes données ----------
async function pageDonnees() {
  const nbPhotos = etat.endroits.reduce((n, e) => n + (e.photos?.length || 0), 0);
  const pays = uniques(etat.endroits.map((e) => e.pays));
  const cfg = await sync.lireConfig();
  const envoi = await sync.etat();
  app.innerHTML = `
    ${entete('Mes données', cfg ? 'Tes endroits arrivent tout seuls de ton cellulaire, par ton dossier GitHub privé.' : 'Branche ton cellulaire pour recevoir tes endroits tout seuls.')}
    <section class="panel lien-cell">
      <div class="panel-tete"><h3>${icone('refresh-cw', { taille: 16 })} Lien avec ton cellulaire</h3>${cfg ? `<span class="badge-ok">${icone('check', { taille: 13 })} Branché</span>` : ''}</div>
      ${cfg ? `
        <p class="doux">Dossier privé <b>${esc(cfg.depot)}</b>. Le Studio va chercher les nouveaux endroits à l'ouverture et toutes les 2 minutes. Tes voyages, contributeurs et paiements y sont aussi copiés.</p>
        <p class="aide" id="etat-sync">${esc(texteSync(envoi))}</p>
        <div class="head-actions gauche">
          <button class="btn sm" id="sync-maintenant">${icone('refresh-cw', { taille: 14 })} Synchroniser maintenant</button>
          <button class="btn ghost sm" id="sync-debrancher">Débrancher</button>
        </div>` : `
        <p class="doux">Colle ici la même clé que dans les Réglages de l'appli sur ton cell. Le Studio recevra alors chaque endroit que tu enregistres, avec ses photos.</p>
        <div class="form-grille">
          <label class="champ"><span>Dossier GitHub privé</span><input id="sync-depot" value="appli-voyage-donnees" spellcheck="false"></label>
          <label class="champ"><span>Clé d'accès GitHub</span><input id="sync-jeton" type="password" placeholder="github_pat_…" spellcheck="false"></label>
        </div>
        <p class="aide" id="sync-message"></p>
        <div class="head-actions gauche"><button class="btn sm" id="sync-brancher">${icone('link', { taille: 14 })} Brancher</button></div>`}
    </section>
    <div class="kpis kpis-3">
      <div class="kpi"><span>${icone('map-pin', { taille: 15 })} Endroits</span><b>${etat.endroits.length}</b><small>${pluriel(pays.length, 'pays', 'pays')}</small></div>
      <div class="kpi"><span>${icone('image', { taille: 15 })} Photos</span><b>${nbPhotos}</b><small>incluses dans les copies</small></div>
      <div class="kpi"><span>${icone('route', { taille: 15 })} Voyages</span><b>${etat.voyages.length}</b><small>et ${pluriel(etat.contributeurs.length, 'contributeur')}</small></div>
    </div>
    <div class="grille-2">
      <section class="panel">
        <div class="panel-tete"><h3>Importer un fichier</h3></div>
        <ol class="etapes-texte">
          <li>Sur le cell, ouvre l'appli, va dans <b>Réglages</b> et touche <b>Faire une copie de sauvegarde</b>.</li>
          <li>Envoie le fichier à ton ordi (courriel, AirDrop, Google Drive…).</li>
          <li>Dis de qui vient le fichier, puis choisis-le. Un fichier envoyé par l'appli des contributeurs est reconnu tout seul.</li>
        </ol>
        <label class="champ"><span>Ce fichier vient de</span>
          <select id="source">
            <option value="">Moi (mon cellulaire)</option>
            ${etat.contributeurs.map((c) => `<option value="${esc(c.id)}">${esc(c.nom)} (contributeur)</option>`).join('')}
          </select>
        </label>
        <p class="aide" id="aide-source">Tes endroits sont ajoutés ou mis à jour, et utilisables tout de suite.</p>
        <label class="btn btn-fichier">${icone('folder-open', { taille: 15 })} Choisir le fichier<input type="file" accept=".json,application/json" id="importer" hidden></label>
      </section>
      <section class="panel">
        <div class="panel-tete"><h3>Garder une copie</h3></div>
        <p class="doux">Tes voyages, contributeurs et paiements sont seulement dans ce navigateur. Télécharge une copie de temps en temps et garde-la dans ton Google Drive ou tes courriels.</p>
        <button class="btn ghost" id="exporter">${icone('download', { taille: 15 })} Télécharger une copie complète</button>
        <p class="aide">Pour la remettre : choisis-la ci-contre avec « Moi ».</p>
      </section>
    </div>`;
  if (cfg) {
    const p = app.querySelector('#etat-sync');
    const arret = sync.surChangement((e) => { if (document.body.contains(p)) p.textContent = texteSync(e); else arret(); });
    app.querySelector('#sync-maintenant').onclick = async (ev) => {
      ev.target.disabled = true;
      const n = await synchroniser(true);
      ev.target.disabled = false;
      toast(n === null ? 'La synchronisation n\'a pas marché' : n ? pluriel(n, 'nouvel endroit reçu', 'nouveaux endroits reçus') : 'Tout est à jour');
    };
    app.querySelector('#sync-debrancher').onclick = async () => { await sync.oublierConfig(); toast('Débranché'); router(); };
  } else {
    app.querySelector('#sync-brancher').onclick = async (ev) => {
      const msg = app.querySelector('#sync-message');
      ev.target.disabled = true;
      msg.textContent = 'Vérification…';
      const t = await sync.tester(app.querySelector('#sync-depot').value, app.querySelector('#sync-jeton').value);
      ev.target.disabled = false;
      if (!t.ok) { msg.textContent = t.message; return; }
      await sync.enregistrerConfig(t.depot, app.querySelector('#sync-jeton').value);
      msg.textContent = 'Branché ! Réception de tes endroits…';
      await synchroniser(true);
      await sync.toutMarquer(['voyages', 'contributeurs', 'paiements']);
      const contrib = etat.endroits.filter((e) => e.contributeurId);
      sync.marquer(contrib.map(sync.cheminEndroit), contrib.flatMap((e) => (e.photos || []).map(sync.cheminPhoto)));
      toast('Branché à ton cellulaire');
      router();
    };
  }
  const source = app.querySelector('#source');
  source.onchange = () => {
    app.querySelector('#aide-source').textContent = source.value
      ? 'Ses endroits arrivent dans « Contributeurs > À valider ». Ils seront utilisables une fois acceptés.'
      : 'Tes endroits sont ajoutés ou mis à jour, et utilisables tout de suite.';
  };
  app.querySelector('#importer').onchange = async (ev) => {
    const fichier = ev.target.files[0];
    if (!fichier) return;
    try {
      const donnees = JSON.parse(await fichier.text());
      let qui = source.value;
      if (donnees.type === 'contribution' && donnees.contributeur?.id) {
        qui = donnees.contributeur.id;
        if (!etat.contributeurs.some((c) => c.id === qui)) await sauver('contributeurs', { id: qui, nom: donnees.contributeur.nom || 'Contributeur', creeLe: new Date().toISOString() });
      }
      if (qui) {
        const n = await db.importerContribution(donnees, qui);
        await charger();
        const siens = etat.endroits.filter((e) => e.contributeurId === qui);
        sync.marquer(siens.map(sync.cheminEndroit), siens.flatMap((e) => (e.photos || []).map(sync.cheminPhoto)));
        toast(`${pluriel(n, 'nouvel endroit', 'nouveaux endroits')} à valider`);
        location.hash = '#/a-valider';
        return;
      }
      const n = await db.importerTout(donnees);
      await charger();
      toast(pluriel(n, 'endroit ajouté ou mis à jour', 'endroits ajoutés ou mis à jour'));
      router();
    } catch (err) {
      toast(err.message || 'Ce fichier ne peut pas être lu.');
    }
    ev.target.value = '';
  };
  app.querySelector('#exporter').onclick = async () => {
    const donnees = await db.exporterTout();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(donnees)], { type: 'application/json' }));
    a.download = `studio-voyages-copie-${aujourdhui()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
}

// ---------- Lien avec le cellulaire ----------
function texteSync(e) {
  const quand = e.dernier ? `Dernière synchronisation : ${new Date(e.dernier).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}.` : '';
  if (e.horsLigne) return `Pas d'internet en ce moment. ${quand}`;
  if (e.enAttente && e.erreur) return `${e.enAttente} élément(s) à envoyer : GitHub ne répond pas (${e.erreur}). ${quand}`;
  if (e.enAttente) return `Envoi de ${e.enAttente} élément(s)… ${quand}`;
  return quand || 'Prêt.';
}

// Reçoit les nouveautés du cellulaire, puis envoie ce que le Studio a changé.
// Retourne le nombre de nouveaux endroits (null si erreur).
let derniereSync = 0;
async function synchroniser(forcer = false) {
  if (!(await sync.lireConfig())) return 0;
  if (!forcer && Date.now() - derniereSync < 60000) return 0;
  derniereSync = Date.now();
  try {
    const { nouveaux } = await sync.recevoir();
    await charger();
    if (nouveaux) {
      toast(pluriel(nouveaux, 'nouvel endroit reçu du cellulaire', 'nouveaux endroits reçus du cellulaire'));
      // Ne pas redessiner une page où l'on est en train d'écrire.
      if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable && modale.hidden) router();
      else rendreSide();
    }
    sync.envoyerBientot(200);
    return nouveaux;
  } catch (_) {
    return null;
  }
}
setInterval(() => synchroniser(), 120000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') synchroniser(); });

// ---------- Démarrage ----------
// Permet d'installer le Studio comme une appli sur l'ordinateur (et de l'ouvrir sans internet).
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
window.addEventListener('hashchange', router);
app.addEventListener('dragstart', (ev) => {
  const e = ev.target.closest?.('[data-endroit]');
  const it = ev.target.closest?.('[data-item]');
  if (e) ev.dataTransfer.setData('text/plain', `e:${e.dataset.endroit}`);
  else if (it) ev.dataTransfer.setData('text/plain', `i:${it.dataset.item}`);
  else return;
  ev.dataTransfer.effectAllowed = 'move';
});
charger().then(() => { db.demanderStockagePersistant(); return router(); }).then(() => synchroniser(true)).catch((err) => {
  app.innerHTML = `<p class="vide-ligne">Erreur au démarrage : ${esc(err.message)}</p>`;
});
