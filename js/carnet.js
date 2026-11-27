// « Mon voyage » : la petite appli privée du client (séparée de l'appli de Raph, aucune de ses données).
// Chaque soir (19 h par défaut), les choix du soir s'ouvrent : 1 hôtel sur 3, 1 resto sur 3, 1 activité sur 3.
// Quand il a choisi, la soirée est complétée. Le lendemain, ça recommence.
// Le lien ressemble à carnet.html?c=<carnet>#<clé>. Ajoutée à l'écran d'accueil, elle rouvre ce voyage.
// La clé ne quitte jamais le téléphone du client. Ses choix partent tout seuls à Raph, chiffrés.

import './clavier.js';
import { tirerPourRecharger } from './tirer.js';
tirerPourRecharger();
import { TAXONOMIE } from './taxonomie.js';
import { icone, iconeCat } from './icones.js';
import * as commun from './carnet-commun.js';
import * as pwa from './installer.js';
import { MARQUE } from './marque.js';

const racine = document.getElementById('carnet');
const feuille = document.getElementById('feuille');
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
const DANS_APPLI = window.self !== window.top || params.has('appli');
if (DANS_APPLI) document.documentElement.classList.add('dans-appli');
// Aperçu : Raph regarde depuis son appli ou le Studio. Bouton Retour, et rien ne part au client.
// Le lien du client n'a jamais « apercu » : lui ne voit pas ce bouton.
const APERCU = params.has('apercu');
if (APERCU) document.documentElement.classList.add('apercu');
// La démo a aussi son Retour (montrée depuis le site ou l'appli).
if (APERCU || DEMO) {
  const retour = document.createElement('button');
  retour.type = 'button';
  retour.className = 'retour-apercu';
  retour.innerHTML = `${icone('chevron-left', { taille: 20 })}<span>Retour</span>`;
  retour.onclick = () => {
    if (history.length > 1) { history.back(); return; }
    if (!APERCU) { location.href = './site/'; return; }
    window.close();
    setTimeout(() => { location.href = './#/clients'; }, 300);
  };
  document.body.appendChild(retour);
}

// ---------- Petits outils ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const memoire = {
  lire(k, defaut) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : defaut; } catch (_) { return defaut; } },
  ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* navigation privée : tant pis */ } },
};
function toast(message) {
  const t = document.getElementById('toast');
  t.innerHTML = message;
  t.classList.add('visible');
  clearTimeout(toast.minuterie);
  toast.minuterie = setTimeout(() => t.classList.remove('visible'), 2800);
}
const vibrer = (motif = 12) => { try { navigator.vibrate?.(motif); } catch (_) { /* rien */ } };
const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

// ---------- Quel voyage ? ----------
let id = params.get('c');
let cle = location.hash.slice(1);
if (!DEMO && !APERCU) {
  if (id && cle) memoire.ecrire('carnet', { id, cle });
  else {
    // Ouvert depuis l'écran d'accueil : on rouvre le voyage gardé sur ce téléphone.
    const m = memoire.lire('carnet', null);
    if (m && (!id || m.id === id)) { id = m.id; cle = m.cle; history.replaceState(null, '', `?c=${encodeURIComponent(id)}${DANS_APPLI ? '&appli' : ''}#${cle}`); }
  }
}
const cleLocale = DEMO ? 'demo-montreal' : APERCU ? `apercu-${id}` : id;

// Démo : chaque chargement repart à zéro (jamais pour un vrai client).
if (DEMO) memoire.ecrire(`choix-${cleLocale}`, {});
const lireChoixLocaux = () => {
  const c = memoire.lire(`choix-${cleLocale}`, {});
  return { soirs: c.soirs || {}, mot: c.mot || '', messages: c.messages || [] };
};
const etat = {
  donnees: null,
  onglet: 'soirees',
  choix: lireChoixLocaux(),
};

// ---------- Copie locale (pour ouvrir le voyage même sans réseau) ----------
const CACHE = 'carnet-donnees';
const cleCache = (k) => `${location.origin}/__carnet/${k}`;
async function mettreEnCache(k, octets) {
  try { const c = await caches.open(CACHE); await c.put(cleCache(k), new Response(octets)); } catch (_) { /* pas grave */ }
}
async function lireCache(k) {
  try { const c = await caches.open(CACHE); const r = await c.match(cleCache(k)); return r ? new Uint8Array(await r.arrayBuffer()) : null; } catch (_) { return null; }
}

async function chargerDonnees() {
  if (DEMO) return (await import('./carnet-demo.js')).demo();
  let octets = null;
  try {
    const r = await fetch(`${commun.urlPublique(id)}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
    if (r.ok) { octets = new Uint8Array(await r.arrayBuffer()); mettreEnCache(`c-${id}`, octets); }
  } catch (_) { /* pas de réseau */ }
  if (!octets) octets = await lireCache(`c-${id}`);
  if (!octets) throw new Error('introuvable');
  return commun.dechiffrerJson(cle, octets);
}

// Photos : chiffrées comme le reste. On les déchiffre ici, sur le téléphone du client.
const urls = new Map();
function urlPhoto(p) {
  if (/^https?:/.test(p)) return Promise.resolve(p);
  if (!urls.has(p)) {
    urls.set(p, (async () => {
      let octets = await lireCache(`p-${p}`);
      if (!octets) {
        const r = await fetch(commun.urlPublique(id, p));
        if (!r.ok) return '';
        octets = new Uint8Array(await r.arrayBuffer());
        mettreEnCache(`p-${p}`, octets);
      }
      return URL.createObjectURL(new Blob([await commun.dechiffrer(cle, octets)], { type: 'image/jpeg' }));
    })().catch(() => ''));
  }
  return urls.get(p);
}
function afficherPhotos(zone) {
  zone.querySelectorAll('img[data-p]').forEach(async (img) => {
    const url = await urlPhoto(img.dataset.p);
    if (url) { img.onload = () => img.classList.add('prete'); img.src = url; }
  });
}

// ---------- Les groupes de choix ----------
const GROUPES = commun.GROUPES_CHOIX;
const ORDRE_GROUPES = Object.keys(GROUPES);
const groupeDe = (i) => i.groupe || commun.groupeDeCategorie(i.categorie);

// ---------- Les choix du client ----------
// Gardés sur son téléphone, et envoyés (chiffrés) à Raph quelques secondes après.
let minuterieEnvoi = null;
function sauverChoix() {
  memoire.ecrire(`choix-${cleLocale}`, etat.choix);
  clearTimeout(minuterieEnvoi);
  minuterieEnvoi = setTimeout(envoyerChoix, 2000);
}
async function envoyerChoix() {
  if (DEMO || APERCU || !id || !cle || !navigator.onLine) return;
  try {
    const canal = await commun.canalChoix(id, cle);
    const maintenant = new Date().toISOString();
    const messages = etat.choix.messages || [];
    const paquet = { soirs: etat.choix.soirs, mot: messages.length ? messages[messages.length - 1].texte : etat.choix.mot || '', messages, vuLe: maintenant, envoyeLe: maintenant };
    await fetch(`${commun.RELAIS}/${canal}`, { method: 'POST', body: commun.enBase64Url(await commun.chiffrerJson(cle, paquet)) });
    memoire.ecrire(`ping-${cleLocale}`, Date.now());
  } catch (_) { /* réessayé à la prochaine visite */ }
}
// À chaque visite, on renvoie ses choix (le relais les garde 12 h) : Raph les retrouve toujours.
function signalerVisite() {
  if (APERCU) return;
  if (Date.now() - memoire.lire(`ping-${cleLocale}`, 0) > 20 * 60 * 1000) envoyerChoix();
}

const choixDe = (quand, g) => commun.listeChoix(etat.choix.soirs[quand]?.[g]).filter((v) => v !== 'aucun');
const aChoisi = (quand, g, id) => choixDe(quand, g).includes(id);
// Toucher : choisit (jusqu'à 2 par groupe ; un 3e remplace le plus ancien), toucher encore : retire.
function choisir(quand, g, valeur) {
  const s = { ...(etat.choix.soirs[quand] || {}) };
  let l = choixDe(quand, g);
  if (l.includes(valeur)) l = l.filter((v) => v !== valeur);
  else l = [...l, valeur].slice(-commun.MAX_CHOIX);
  if (l.length) s[g] = l; else delete s[g];
  etat.choix.soirs = { ...etat.choix.soirs, [quand]: s };
  sauverChoix();
}

// ---------- Morceaux d'affichage ----------
function lienCarte(i) {
  if (i.lienMaps) return i.lienMaps;
  if (i.lat) return `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`;
  const q = [i.nom, i.adresse, i.ville].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}
const lienWeb = (v) => (!v ? '' : /^https?:/i.test(v) ? v : `https://${v}`);
// Niveau de prix : « $$$ Haut de gamme », sans signes gris à côté (c'était illisible).
const NIVEAUX_PRIX = ['', 'Petit budget', 'Prix moyen', 'Haut de gamme', 'Luxe'];
const niveauPrix = (i) => (i.prix ? `<span class="prix"><b>${'$'.repeat(i.prix)}</b>${NIVEAUX_PRIX[i.prix] || ''}</span>` : '');
const parNuit = (i) => (i.categorie === 'hebergement' ? ' / nuit' : '');
const montant = (i) => (i.montant ? `${esc(i.montant)} ${esc(i.devise || '')}${parNuit(i)}`.replace(/\s+\//, ' /') : '');
function meta(i) {
  const bouts = [];
  if (i.prix) bouts.push(niveauPrix(i));
  if (i.montant) bouts.push(`<span>${montant(i)}</span>`);
  if (i.confort) bouts.push(`<span>${icone('star', { taille: 13 })} ${i.confort}/5</span>`);
  if (i.duree) bouts.push(`<span>${icone('clock', { taille: 13 })} ${esc(i.duree)}</span>`);
  return bouts.length ? `<div class="meta">${bouts.join('<i>·</i>')}</div>` : '';
}
const etiquette = (i) => esc(i.sousType || i.type || TAXONOMIE[i.categorie]?.nom || '');
const initiale = (nom) => esc((nom || 'R').trim().charAt(0).toUpperCase());

// ---------- Heures ----------
function quandLivraison(date) {
  const d = etat.donnees;
  const fuseau = d.fuseau || commun.FUSEAU_PAR_DEFAUT;
  const maintenant = new Date();
  const jour = commun.jourLocal(date, fuseau);
  const h = new Date(date).toLocaleTimeString('fr-CA', { timeZone: fuseau, hour: 'numeric', minute: '2-digit' }).replace(' h 00', ' h');
  if (jour === commun.jourLocal(maintenant, fuseau)) return `Ce soir, ${h}`;
  if (jour === commun.jourLocal(new Date(maintenant.getTime() + 864e5), fuseau)) return `Demain, ${h}`;
  return `${commun.dateLongue(date, fuseau)}, ${h}`;
}
// « 9 mars au 16 mars »
function periode(d) {
  if (!d.debut) return '';
  const f = (x, annee) => new Date(`${x}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', ...(annee ? { year: 'numeric' } : {}) });
  if (!d.fin) return `Dès le ${f(d.debut, true)}`;
  const [a, b] = [new Date(`${d.debut}T12:00:00`), new Date(`${d.fin}T12:00:00`)];
  const debut = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? String(a.getDate()) : f(d.debut);
  return `${debut} au ${f(d.fin, true)}`;
}
function compteARebours(date) {
  const s = Math.max(0, Math.floor((new Date(date) - Date.now()) / 1000));
  if (s >= 48 * 3600) return `${Math.round(s / 86400)} jours`;
  const deux = (n) => String(n).padStart(2, '0');
  return `${deux(Math.floor(s / 3600))}:${deux(Math.floor(s / 60) % 60)}:${deux(s % 60)}`;
}

// ---------- Les soirées ----------
function soirees() {
  const d = etat.donnees;
  const maintenant = Date.now();
  const livres = d.items.filter((i) => new Date(i.livraison).getTime() <= maintenant);
  const enRoute = d.items.filter((i) => new Date(i.livraison).getTime() > maintenant);
  const groupes = new Map();
  for (const i of livres) {
    if (!groupes.has(i.livraison)) groupes.set(i.livraison, []);
    groupes.get(i.livraison).push(i);
  }
  const liste = [...groupes.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([quand, items], n) => ({ quand, items, numero: n + 1 }));
  return { livres, enRoute, liste: liste.reverse() };
}
const groupesDuSoir = (items) => ORDRE_GROUPES.filter((g) => items.some((i) => groupeDe(i) === g));
const repondu = (quand, g) => commun.listeChoix(etat.choix.soirs[quand]?.[g]).length > 0; // choisi, ou « aucun »
const soirComplet = (s) => { const gs = groupesDuSoir(s.items); return gs.length > 0 && gs.every((g) => repondu(s.quand, g)); };

// ---------- La page ----------
function rendre() {
  const d = etat.donnees;
  const { livres, enRoute, liste } = soirees();
  const completes = liste.filter(soirComplet).length;
  const prochaine = enRoute.length
    ? enRoute.map((i) => i.livraison).sort()[0]
    : d.actif ? commun.prochaineLivraison(new Date(), d.heure ?? commun.HEURE_PAR_DEFAUT, d.fuseau || commun.FUSEAU_PAR_DEFAUT).toISOString() : null;
  const couverture = d.couverture || [...livres].reverse().find((i) => i.photos?.length)?.photos[0];

  const destination = [d.ville, d.pays].filter(Boolean).join(' · ');
  racine.innerHTML = `
    <header class="couv">
      ${couverture ? `<img class="couv-img" data-p="${esc(couverture)}" alt="">` : ''}
      <div class="couv-haut">
        <span class="marque">${esc(MARQUE)}</span>
        ${d.actif ? '<span class="direct"><i></i> En repérage</span>' : ''}
      </div>
      <div class="couv-bas">
        <h1>Votre voyage</h1>
        ${destination ? `<p class="destination">${esc(destination)}</p>` : ''}
        ${periode(d) ? `<p class="periode">${esc(periode(d))}</p>` : ''}
      </div>
    </header>

    <section class="etat">
      <div class="etat-compte"><b>${d.items.length}</b><span>${d.items.length > 1 ? 'endroits repérés' : 'endroit repéré'}</span></div>
      ${prochaine ? `
      <div class="etat-rebours">
        <span>Prochain envoi</span>
        <b id="rebours">${esc(compteARebours(prochaine))}</b>
        <small>${esc(quandLivraison(prochaine))}</small>
      </div>` : ''}
    </section>

    <nav class="onglets" role="tablist">
      <button role="tab" data-onglet="soirees" class="${etat.onglet === 'soirees' ? 'on' : ''}">Sélections</button>
      <button role="tab" data-onglet="choix" class="${etat.onglet === 'choix' ? 'on' : ''}">Mes choix</button>
      <button role="tab" data-onglet="message" class="${etat.onglet === 'message' ? 'on' : ''}">Message</button>
    </nav>

    <div id="contenu">${contenuOnglet(liste)}</div>

    <footer class="pied">
      ${pwa.dejaInstallee() || DANS_APPLI || APERCU ? '' : `
      <section class="carte-douce" id="installer">
        <span class="rond-ico">${icone('download', { taille: 18 })}</span>
        <div><b>Ajouter à l’écran d’accueil</b><p id="aide-installer"></p></div>
        <button class="btn-doux" id="bouton-installer">Ajouter</button>
      </section>`}
      <p class="signature">${icone('lock', { taille: 13 })} Voyage privé${DEMO ? ' · Démo' : ''}</p>
    </footer>`;

  afficherPhotos(racine);
  brancher();
  demarrerRebours(prochaine);
}

const contenuOnglet = (liste) => (etat.onglet === 'choix' ? pageResume(liste) : etat.onglet === 'message' ? pageMessage() : pageSoirees(liste));

function pageSoirees(liste) {
  const d = etat.donnees;
  if (!liste.length) {
    return `
      <div class="vide">
        <div class="vide-lune">${icone('moon', { taille: 34, epaisseur: 1.4 })}</div>
        <h2>Vos sélections arrivent bientôt</h2>
        <p>Chaque soir à ${commun.formatHeure(d.heure ?? 19)}</p>
      </div>`;
  }
  return liste.map((s, n) => {
    const gs = ORDRE_PARCOURS.filter((g) => s.items.some((i) => groupeDe(i) === g));
    const complet = soirComplet(s);
    const faits = gs.filter((g) => repondu(s.quand, g)).length;
    const savoir = s.items.filter((i) => groupeDe(i) === 'savoir');
    const resume = gs.map((g) => {
      const pris = choixDe(s.quand, g).map((v) => s.items.find((x) => x.id === v)).filter(Boolean);
      return `<li>${icone(GROUPES[g].ico, { taille: 16 })}<span><small>${GROUPES[g].titre}</small><b>${pris.length ? pris.map((i) => esc(i.nom)).join(' · ') : 'Aucun'}</b></span></li>`;
    }).join('');
    return `
      <section class="soir ${n === 0 ? 'dernier' : ''}" data-soir="${esc(s.quand)}">
        <header class="soir-tete">
          <p class="soir-date"><span>Soir ${s.numero}</span> ${esc(commun.dateLongue(s.quand, d.fuseau))}${complet ? `<em class="complet">${icone('check', { taille: 13, epaisseur: 3 })} Complété</em>` : ''}</p>
        </header>
        ${gs.length ? (complet ? `
          <ul class="resume-soir">${resume}</ul>
          <button class="btn-doux btn-large" data-commencer="${esc(s.quand)}">${icone('pencil', { taille: 16 })} Modifier mes choix</button>` : `
          <div class="invitation">
            <div class="invitation-photos">${s.items.filter((i) => i.photos?.length && groupeDe(i) !== 'savoir').slice(0, 3).map((i) => `<img data-p="${esc(i.photos[0])}" alt="">`).join('')}</div>
            <b>${pluriel(s.items.filter((i) => groupeDe(i) !== 'savoir').length, 'trouvaille')} à découvrir</b>
            <p>${gs.map((g) => GROUPES[g].titre).join(' · ')}</p>
            <button class="btn-plein" data-commencer="${esc(s.quand)}">${faits ? 'Continuer' : 'Commencer'} ${icone('arrow-right', { taille: 18 })}</button>
            <small>${pluriel(gs.length, 'étape')} · environ 2 minutes</small>
          </div>`) : ''}
        ${savoir.length ? `
          <div class="groupe">
            <h4>${icone('info', { taille: 16 })} Bon à savoir</h4>
            <div class="minis">${savoir.map((i) => mini(i)).join('')}</div>
          </div>` : ''}
      </section>`;
  }).join('');
}

// « Bon à savoir » : une petite carte qui ouvre la fiche.
function mini(i) {
  const photo = i.photos?.[0];
  return `
    <article class="mini" data-ouvrir="${esc(i.id)}">
      <div class="mini-photo ${photo ? '' : 'sans'}">
        ${photo ? `<img data-p="${esc(photo)}" alt="" loading="lazy">` : iconeCat(i.categorie, { taille: 26, epaisseur: 1.4 })}
      </div>
      <b>${esc(i.nom)}</b>
      <small>${etiquette(i)}</small>
      ${i.mot ? `<p class="mini-mot">${esc(i.mot)}</p>` : ''}
    </article>`;
}

// ---------- Le parcours du soir : une étape par groupe, 0, 1 ou 2 choix ----------
const ORDRE_PARCOURS = ['faire', 'dormir', 'manger', 'sortir'];
const parcours = { quand: null, etapes: [], k: 0, zone: null };
function ouvrirParcours(quand) {
  const s = soirees().liste.find((x) => x.quand === quand);
  if (!s) return;
  parcours.quand = quand;
  parcours.etapes = ORDRE_PARCOURS.filter((g) => s.items.some((i) => groupeDe(i) === g));
  const premiere = parcours.etapes.findIndex((g) => !repondu(quand, g));
  parcours.k = soirComplet(s) || premiere < 0 ? 0 : premiere;
  let z = document.getElementById('parcours');
  if (!z) { z = document.createElement('div'); z.id = 'parcours'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-modal', 'true'); document.body.appendChild(z); brancherParcours(z); }
  parcours.zone = z;
  z.hidden = false;
  document.documentElement.classList.add('parcours-ouvert');
  dessinerEtape(0);
  requestAnimationFrame(() => z.classList.add('ouvert'));
  try { history.pushState({ parcours: 1 }, ''); } catch (_) { /* rien */ }
}
function fermerParcours(depuisHistorique = false) {
  const z = parcours.zone;
  if (!z || z.hidden) return;
  z.classList.remove('ouvert');
  document.documentElement.classList.remove('parcours-ouvert');
  setTimeout(() => { z.hidden = true; z.innerHTML = ''; }, 260);
  if (!depuisHistorique && history.state?.parcours) history.back();
  redessinerContenu();
}
window.addEventListener('popstate', () => { if (parcours.zone && !parcours.zone.hidden) fermerParcours(true); });

function carteChoix(i, g) {
  const pris = aChoisi(parcours.quand, g, i.id);
  const site = lienWeb(i.site);
  const carte = lienCarte(i);
  return `
    <article class="option-choix ${pris ? 'prise' : ''}" data-prendre="${esc(i.id)}" role="button" aria-pressed="${pris}">
      <div class="oc-photo ${i.photos?.length ? '' : 'sans'}">
        ${i.photos?.length ? `<img data-p="${esc(i.photos[0])}" alt="">` : iconeCat(i.categorie, { taille: 34, epaisseur: 1.3 })}
        <span class="oc-coche">${icone('check', { taille: 20, epaisseur: 3 })}</span>
        ${i.coupDeCoeur ? `<span class="oc-coeur">${icone('heart', { taille: 13 })} Coup de cœur</span>` : ''}
      </div>
      <div class="oc-corps">
        <b>${esc(i.nom)}</b>
        <small>${etiquette(i)}${i.ville ? ` · ${esc(i.ville)}` : ''}</small>
        ${meta(i)}
        ${i.mot ? `<p class="oc-mot"><span class="avatar">${initiale(etat.donnees.raph)}</span>${esc(i.mot)}</p>` : ''}
        <div class="oc-liens">
          ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener" data-lien>${icone('globe', { taille: 15 })} Site web</a>` : ''}
          ${carte ? `<a href="${esc(carte)}" target="_blank" rel="noopener" data-lien>${icone('map', { taille: 15 })} Carte</a>` : ''}
          <button type="button" data-ouvrir="${esc(i.id)}">${icone('info', { taille: 15 })} Détails</button>
        </div>
      </div>
    </article>`;
}

function dessinerEtape(sens) {
  const z = parcours.zone;
  const s = soirees().liste.find((x) => x.quand === parcours.quand);
  if (!s) { fermerParcours(); return; }
  const n = parcours.etapes.length;
  if (parcours.k >= n) { dessinerFin(s); return; }
  const g = parcours.etapes[parcours.k];
  const options = s.items.filter((i) => groupeDe(i) === g);
  const nb = choixDe(parcours.quand, g).length;
  const derniere = parcours.k === n - 1;
  z.innerHTML = `
    <div class="pc-haut">
      <button class="pc-rond" data-pc="fermer" aria-label="Fermer">${icone('x', { taille: 20 })}</button>
      <div class="pc-barres">${parcours.etapes.map((x, k) => `<i class="${k < parcours.k ? 'fait' : k === parcours.k ? 'ici' : ''}"></i>`).join('')}</div>
      <span class="pc-num">${parcours.k + 1}/${n}</span>
    </div>
    <div class="pc-etape ${sens > 0 ? 'de-droite' : sens < 0 ? 'de-gauche' : 'apparait'}">
      <p class="pc-sur">${icone(GROUPES[g].ico, { taille: 16 })} Soir ${s.numero}</p>
      <h2>${GROUPES[g].titre}</h2>
      <p class="pc-aide">Choisissez-en 1 ou 2. Ou aucun.</p>
      <div class="pc-options">${options.map((i) => carteChoix(i, g)).join('')}</div>
    </div>
    <div class="pc-bas">
      ${parcours.k > 0 ? `<button class="pc-retour" data-pc="retour" aria-label="Étape précédente">${icone('chevron-left', { taille: 22 })}</button>` : ''}
      <button class="btn-plein pc-suivant" data-pc="suivant">${nb ? `${derniere ? 'Terminer' : 'Suivant'} · ${pluriel(nb, 'choix', 'choix')}` : 'Aucun ne me plaît'} ${icone(derniere && nb ? 'check' : 'arrow-right', { taille: 18 })}</button>
    </div>`;
  afficherPhotos(z);
  z.querySelector('.pc-etape').scrollTop = 0;
  z.scrollTop = 0;
}

function dessinerFin(s) {
  const z = parcours.zone;
  const lignes = parcours.etapes.map((g) => {
    const pris = choixDe(s.quand, g).map((v) => s.items.find((x) => x.id === v)).filter(Boolean);
    return `<li>${icone(GROUPES[g].ico, { taille: 18 })}<span><small>${GROUPES[g].titre}</small><b>${pris.length ? pris.map((i) => esc(i.nom)).join(' · ') : 'Aucun'}</b></span></li>`;
  }).join('');
  z.innerHTML = `
    <div class="pc-haut"><button class="pc-rond" data-pc="fermer" aria-label="Fermer">${icone('x', { taille: 20 })}</button><div class="pc-barres">${parcours.etapes.map(() => '<i class="fait"></i>').join('')}</div><span class="pc-num"></span></div>
    <div class="pc-etape pc-fin de-droite">
      <div class="pc-sceau">${icone('check', { taille: 38, epaisseur: 2.6 })}</div>
      <h2>C’est noté !</h2>
      <p class="pc-aide">${esc(etat.donnees.raph || 'Votre conseiller')} reçoit vos choix.</p>
      <ul class="resume-soir">${lignes}</ul>
    </div>
    <div class="pc-bas"><button class="btn-plein pc-suivant" data-pc="fermer">Fermer</button></div>`;
  confettis(z.querySelector('.pc-sceau'));
  vibrer([18, 60, 18]);
}

function allerEtape(delta) {
  const n = parcours.etapes.length;
  const k = parcours.k + delta;
  if (k < 0 || k > n) return;
  if (delta > 0 && parcours.k < n) {
    const g = parcours.etapes[parcours.k];
    if (!choixDe(parcours.quand, g).length) {
      // Aucun ne lui plaît : on le note, l'étape est faite.
      const soir = { ...(etat.choix.soirs[parcours.quand] || {}), [g]: ['aucun'] };
      etat.choix.soirs = { ...etat.choix.soirs, [parcours.quand]: soir };
      sauverChoix();
    }
  }
  parcours.k = k;
  vibrer(8);
  dessinerEtape(delta);
}

function brancherParcours(z) {
  z.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-lien]')) return; // Site web, Carte : s'ouvrent normalement
    const info = ev.target.closest('[data-ouvrir]');
    if (info) { ev.stopPropagation(); ouvrirFiche(info.dataset.ouvrir); return; }
    const pc = ev.target.closest('[data-pc]');
    if (pc) {
      ev.stopPropagation();
      if (pc.dataset.pc === 'fermer') fermerParcours();
      else if (pc.dataset.pc === 'retour') allerEtape(-1);
      else allerEtape(1);
      return;
    }
    const carte = ev.target.closest('[data-prendre]');
    if (!carte) return;
    ev.stopPropagation();
    const g = parcours.etapes[parcours.k];
    const avant = choixDe(parcours.quand, g);
    if (!avant.includes(carte.dataset.prendre) && avant.length >= commun.MAX_CHOIX) toast('2 au maximum : le premier est retiré');
    choisir(parcours.quand, g, carte.dataset.prendre);
    vibrer();
    // Mise à jour sur place (pas de saut) : les coches et le bouton.
    const pris = choixDe(parcours.quand, g);
    z.querySelectorAll('[data-prendre]').forEach((c) => { const on = pris.includes(c.dataset.prendre); c.classList.toggle('prise', on); c.setAttribute('aria-pressed', on); });
    carte.classList.remove('rebond'); void carte.offsetWidth; carte.classList.add('rebond');
    const derniere = parcours.k === parcours.etapes.length - 1;
    z.querySelector('.pc-suivant').innerHTML = `${pris.length ? `${derniere ? 'Terminer' : 'Suivant'} · ${pluriel(pris.length, 'choix', 'choix')}` : 'Aucun ne me plaît'} ${icone(derniere && pris.length ? 'check' : 'arrow-right', { taille: 18 })}`;
  });
  // Glisser à gauche / à droite pour changer d'étape.
  let x0 = null; let y0 = null;
  z.addEventListener('touchstart', (ev) => { if (ev.touches.length === 1) { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; } }, { passive: true });
  z.addEventListener('touchend', (ev) => {
    if (x0 == null) return;
    const t = ev.changedTouches[0];
    const dx = t.clientX - x0; const dy = t.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) allerEtape(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// « Mon voyage » : tout ce que le client a choisi, soir après soir.
function pageResume(liste) {
  const d = etat.donnees;
  const parSoir = [...liste].reverse().map((s) => ({ s, gs: groupesDuSoir(s.items).filter((g) => choixDe(s.quand, g).length) })).filter((x) => x.gs.length);
  const ligne = (s, g) => choixDe(s.quand, g).map((v) => {
    const i = s.items.find((x) => x.id === v);
    return `
      <li ${i ? `data-ouvrir="${esc(i.id)}"` : ''}>
        <span class="vignette ${i?.photos?.length ? '' : 'sans'}">${i?.photos?.length ? `<img data-p="${esc(i.photos[0])}" alt="">` : icone(GROUPES[g].ico, { taille: 20 })}</span>
        <span class="ligne-txt"><b>${i ? esc(i.nom) : 'Aucun ne me plaisait'}</b><small>${GROUPES[g].court}${i ? ` · ${etiquette(i)}` : ''}</small></span>
        ${i ? `<span class="coche">${icone('check', { taille: 16, epaisseur: 2.6 })}</span>` : ''}
      </li>`;
  }).join('');
  return `
    <div class="choix">
      <div class="choix-tete">
        <h2>Mes choix</h2>
        ${parSoir.length ? '' : '<p>Aucun choix pour l’instant.</p>'}
      </div>
      ${parSoir.map(({ s, gs }) => `
        <h4>Soir ${s.numero} <small>${esc(commun.dateLongue(s.quand, d.fuseau))}</small></h4>
        <ul class="lignes">${gs.map((g) => ligne(s, g)).join('')}</ul>`).join('')}
    </div>`;
}

// « Message » : écrire à Raph, dans l'appli (chiffré, comme les choix) ou par texto.
function pageMessage() {
  const d = etat.donnees;
  const messages = etat.choix.messages || [];
  const tel = String(d.raphTel || '').replace(/[^\d+]/g, '');
  const heure = (iso) => new Date(iso).toLocaleString('fr-CA', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  return `
    <div class="contact">
      <div class="contact-tete">
        <span class="avatar grand">${initiale(d.raph)}</span>
        <div><b>${esc(d.raph)}</b><small>Votre conseiller voyage</small></div>
        ${tel || DEMO ? `<a class="btn-doux" ${DEMO ? 'href="#" data-demo-sms' : `href="sms:${esc(tel)}"`}>${icone('message-circle', { taille: 16 })} Texto</a>` : ''}
      </div>
      <div class="fil">
        ${messages.length ? messages.map((m) => `<div class="bulle"><p>${esc(m.texte)}</p><small>${esc(heure(m.le))} · ${icone('check', { taille: 12, epaisseur: 2.6 })} Envoyé</small></div>`).join('') : `
        <p class="fil-vide">Écrivez à ${esc(d.raph)} ici.</p>`}
      </div>
      <form class="ecrire" id="ecrire">
        <textarea id="texte-message" rows="1" placeholder="Votre message à ${esc(d.raph)}…" enterkeyhint="send"></textarea>
        <button type="submit" class="envoyer" aria-label="Envoyer">${icone('send', { taille: 18 })}</button>
      </form>
    </div>`;
}

// ---------- Fiche détaillée ----------
function trouverItem(itemId) {
  for (const s of soirees().liste) { const i = s.items.find((x) => x.id === itemId); if (i) return { i, s }; }
  return {};
}
const lienInsta = (v) => (!v ? '' : /^https?:/i.test(v) ? v : `https://instagram.com/${String(v).replace(/^@/, '')}`);
// Les infos pratiques, une par ligne.
function infos(i) {
  const l = [];
  const ligne = (ico, titre, valeur) => l.push(`<li>${icone(ico, { taille: 18 })}<div><span>${titre}</span><b>${valeur}</b></div></li>`);
  if (i.prix || i.montant) ligne('wallet', 'Prix', [i.montant ? montant(i) : '', i.prix ? `<span class="prix"><b>${'$'.repeat(i.prix)}</b>${NIVEAUX_PRIX[i.prix]}</span>` : ''].filter(Boolean).join(' · '));
  if (i.confort) ligne('star', 'Confort', `${i.confort}/5`);
  if (i.duree) ligne('clock', 'Durée', esc(i.duree));
  if (i.adresse || i.ville) ligne('map-pin', 'Adresse', esc([i.adresse, i.ville].filter(Boolean).join(', ')));
  if (i.depart || i.arrivee) ligne('route', 'Trajet', `${esc(i.depart || '?')} → ${esc(i.arrivee || '?')}`);
  if (i.telephone) ligne('phone', 'Téléphone', esc(i.telephone));
  return l.length ? `<ul class="fiche-infos">${l.join('')}</ul>` : '';
}
function ouvrirFiche(itemId) {
  const { i, s } = trouverItem(itemId);
  if (!i) return;
  const g = groupeDe(i);
  const carteUrl = lienCarte(i);
  const site = lienWeb(i.site);
  const insta = lienInsta(i.instagram);
  const tel = (i.telephone || '').replace(/[^\d+]/g, '');
  feuille.innerHTML = `
    <div class="voile" data-fermer></div>
    <div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(i.nom)}">
      <button class="fermer" data-fermer aria-label="Fermer">${icone('x', { taille: 20 })}</button>
      ${i.photos?.length ? `<div class="fiche-photos defile">${i.photos.map((p) => `<img data-p="${esc(p)}" alt="">`).join('')}</div>${i.photos.length > 1 ? `<div class="points fiche-points">${i.photos.map((_, n) => `<i class="${n ? '' : 'on'}"></i>`).join('')}</div>` : ''}` : ''}
      <div class="fiche-corps">
        <p class="sur">${iconeCat(i.categorie, { taille: 14 })} ${etiquette(i)}${i.coupDeCoeur ? ` · ${icone('heart', { taille: 13 })} Coup de cœur` : ''}</p>
        <h3>${esc(i.nom)}</h3>
        ${i.mot ? `<blockquote class="mot-raph grand"><span class="avatar">${initiale(etat.donnees.raph)}</span><p>${esc(i.mot)}</p></blockquote>` : ''}
        ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ''}
        ${infos(i)}
        <div class="fiche-actions">
          ${carteUrl ? `<a class="btn-doux" href="${esc(carteUrl)}" target="_blank" rel="noopener">${icone('map', { taille: 16 })} Carte</a>` : ''}
          ${site ? `<a class="btn-doux" href="${esc(site)}" target="_blank" rel="noopener">${icone('globe', { taille: 16 })} Site web</a>` : ''}
          ${insta ? `<a class="btn-doux" href="${esc(insta)}" target="_blank" rel="noopener">${icone('instagram', { taille: 16 })} Instagram</a>` : ''}
          ${tel ? `<a class="btn-doux" href="tel:${esc(tel)}">${icone('phone', { taille: 16 })} Appeler</a>` : ''}
        </div>
      </div>
    </div>`;
  feuille.hidden = false;
  requestAnimationFrame(() => feuille.classList.add('ouverte'));
  afficherPhotos(feuille);
  const d = feuille.querySelector('.fiche-photos');
  const points = feuille.querySelectorAll('.fiche-points i');
  if (d && points.length) d.addEventListener('scroll', () => { const n = Math.round(d.scrollLeft / d.clientWidth); points.forEach((p, k) => p.classList.toggle('on', k === n)); }, { passive: true });
  feuille.querySelectorAll('[data-fermer]').forEach((b) => { b.onclick = fermerFiche; });
}
function fermerFiche() {
  feuille.classList.remove('ouverte');
  setTimeout(() => { feuille.hidden = true; feuille.innerHTML = ''; }, 220);
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !feuille.hidden) fermerFiche(); });

// ---------- La petite fête de fin de soirée ----------
function confettis(zone) {
  const couleurs = ['#f4c88f', '#ff7a59', '#f4f0ea', '#e8a26a'];
  const boite = document.createElement('div');
  boite.className = 'confettis';
  boite.innerHTML = Array.from({ length: 26 }, (_, k) => `<i style="--x:${Math.round(Math.cos(k) * (60 + (k * 37) % 120))}px;--y:${-Math.round(80 + (k * 53) % 140)}px;--r:${(k * 47) % 360}deg;--d:${(k % 6) * 40}ms;background:${couleurs[k % 4]}"></i>`).join('');
  zone.appendChild(boite);
  setTimeout(() => boite.remove(), 1600);
}

// ---------- Interactions ----------
function redessinerContenu() {
  const { liste } = soirees();
  const zone = racine.querySelector('#contenu');
  zone.innerHTML = contenuOnglet(liste);
  afficherPhotos(zone);
  brancherMessage();
}

// Une photo qui ne charge pas (hors ligne) : on cache l'icône d'image brisée.
document.addEventListener('error', (ev) => { if (ev.target?.tagName === 'IMG') ev.target.classList.add('img-ko'); }, true);

document.addEventListener('click', (ev) => {
  if (parcours.zone && parcours.zone.contains(ev.target)) return;
  const go = ev.target.closest('[data-commencer]');
  if (go) { ev.stopPropagation(); ouvrirParcours(go.dataset.commencer); return; }
  const info = ev.target.closest('[data-ouvrir]');
  if (info && !feuille.contains(info)) { ev.stopPropagation(); ouvrirFiche(info.dataset.ouvrir); }
});

function brancherMessage() {
  const f = racine.querySelector('#ecrire');
  if (!f) return;
  const t = f.querySelector('textarea');
  const ajuster = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; };
  t.oninput = ajuster;
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const texte = t.value.trim();
    if (!texte) return;
    etat.choix.messages = [...(etat.choix.messages || []), { id: Date.now().toString(36), texte, le: new Date().toISOString() }];
    memoire.ecrire(`choix-${cleLocale}`, etat.choix);
    clearTimeout(minuterieEnvoi);
    envoyerChoix();
    vibrer();
    toast(`${icone('check', { taille: 16 })} Message envoyé à ${esc(etat.donnees.raph)}`);
    redessinerContenu();
  };
  const demo = racine.querySelector('[data-demo-sms]');
  if (demo) demo.onclick = (ev) => { ev.preventDefault(); toast('Démo : ouvre un texto vers le cell de Raph'); };
}

function brancher() {
  racine.querySelectorAll('[data-onglet]').forEach((b) => {
    b.onclick = () => {
      if (etat.onglet === b.dataset.onglet) return;
      etat.onglet = b.dataset.onglet;
      racine.querySelectorAll('[data-onglet]').forEach((x) => x.classList.toggle('on', x === b));
      redessinerContenu();
      const zone = racine.querySelector('#contenu');
      zone.classList.remove('fondu'); void zone.offsetWidth; zone.classList.add('fondu');
    };
  });
  brancherMessage();
  const inst = racine.querySelector('#bouton-installer');
  if (inst) {
    inst.onclick = async () => {
      if (await pwa.installer()) return;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      racine.querySelector('#aide-installer').textContent = ios
        ? 'Touchez le bouton Partager (le carré avec une flèche), puis « Sur l’écran d’accueil ».'
        : 'Dans le menu du navigateur (les 3 points), choisissez « Ajouter à l’écran d’accueil ».';
      inst.hidden = true;
    };
  }
}

// Le compte à rebours. À l'heure de la livraison, la page se recharge toute seule.
let minuterieRebours = null;
function demarrerRebours(prochaine) {
  clearInterval(minuterieRebours);
  if (!prochaine) return;
  minuterieRebours = setInterval(async () => {
    const el = document.getElementById('rebours');
    if (el) el.textContent = compteARebours(prochaine);
    if (new Date(prochaine) <= Date.now()) {
      clearInterval(minuterieRebours);
      await rafraichir(true);
    }
  }, 1000);
}

async function rafraichir(livraison = false) {
  try {
    const avant = etat.donnees ? soirees().livres.length : 0;
    etat.donnees = await chargerDonnees();
    if (feuille.hidden && !['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) rendre();
    const apres = soirees().livres.length;
    if (livraison && apres > avant) toast(`${icone('sparkles', { taille: 16 })} Vos sélections du soir sont arrivées`);
  } catch (_) { /* on garde ce qui est affiché */ }
}

function erreur(titre, texte) {
  racine.innerHTML = `
    <div class="vide plein">
      <div class="vide-lune">${icone('lock', { taille: 30, epaisseur: 1.5 })}</div>
      <h2>${titre}</h2>
      <p>${texte}</p>
      <a class="btn-doux" href="?demo${DANS_APPLI ? '&appli' : ''}">Voir un exemple</a>
    </div>`;
}

// ---------- Démarrage ----------
(async () => {
  if (!DEMO && (!id || !cle)) {
    erreur('Ce voyage est privé', 'Ouvrez le lien reçu de votre conseiller.');
    return;
  }
  try {
    etat.donnees = await chargerDonnees();
  } catch (err) {
    if (err?.name === 'OperationError') erreur('Ce lien ne fonctionne pas', 'Ouvrez le lien complet reçu de votre conseiller.');
    else erreur('Votre voyage arrive bientôt', 'Réessayez dans quelques minutes.');
    return;
  }
  // Démo : les soirées passées sont déjà complétées ; les choix faits à la main restent par-dessus.
  if (DEMO && etat.donnees.choixDemo) {
    const ids = new Set(etat.donnees.items.map((i) => i.id));
    const encoreLa = Object.fromEntries(Object.entries(etat.choix.soirs).filter(([, s]) => Object.values(s).every((v) => commun.listeChoix(v).every((x) => x === 'aucun' || ids.has(x)))));
    etat.choix.soirs = { ...etat.donnees.choixDemo.soirs, ...encoreLa };
  }
  document.title = `Votre voyage${etat.donnees.ville ? ` · ${etat.donnees.ville}` : ''}`;
  rendre();
  signalerVisite();
  // Quand le client revient sur la page : on regarde s'il y a du nouveau, et on renvoie ses choix.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { rafraichir(true); signalerVisite(); } });
})();

if (!DANS_APPLI && 'serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
