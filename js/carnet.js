// « Mon voyage » : la petite appli privée du client (séparée de l'appli de Raph, aucune de ses données).
// Chaque soir (19 h par défaut), les choix du soir s'ouvrent : 1 hôtel sur 3, 1 resto sur 3, 1 activité sur 3.
// Quand il a choisi, la soirée est complétée. Le lendemain, ça recommence.
// Le lien ressemble à carnet.html?c=<carnet>#<clé>. Ajoutée à l'écran d'accueil, elle rouvre ce voyage.
// La clé ne quitte jamais le téléphone du client. Ses choix partent tout seuls à Raph, chiffrés.

import './clavier.js';
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
if (APERCU) {
  const retour = document.createElement('button');
  retour.type = 'button';
  retour.className = 'retour-apercu';
  retour.innerHTML = `${icone('chevron-left', { taille: 20 })}<span>Retour</span>`;
  retour.onclick = () => {
    if (history.length > 1) { history.back(); return; }
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

const choixDe = (quand, g) => etat.choix.soirs[quand]?.[g];
function choisir(quand, g, valeur) {
  const s = { ...(etat.choix.soirs[quand] || {}) };
  if (s[g] === valeur) delete s[g];
  else s[g] = valeur;
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
function meta(i) {
  const bouts = [];
  if (i.prix) bouts.push(`<span class="prix" aria-label="Budget ${i.prix} sur 4"><b>${'$'.repeat(i.prix)}</b>${'$'.repeat(4 - i.prix)}</span>`);
  if (i.confort) bouts.push(`<span>${icone('star', { taille: 13 })} ${i.confort}/5</span>`);
  if (i.montant) bouts.push(`<span>${esc(i.montant)} ${esc(i.devise || '')}</span>`);
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
const soirComplet = (s) => { const gs = groupesDuSoir(s.items); return gs.length > 0 && gs.every((g) => choixDe(s.quand, g) && choixDe(s.quand, g) !== 'aucun'); };

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
        ${d.actif ? '<span class="direct"><i></i> En repérage</span>' : '<span class="direct fini">Repérage terminé</span>'}
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
  const aide = soirComplet(liste[0]) ? '' : '<p class="aide-choix">Touchez votre préféré.</p>';
  return aide + liste.map((s, n) => {
    const gs = groupesDuSoir(s.items);
    const complet = soirComplet(s);
    const savoir = s.items.filter((i) => groupeDe(i) === 'savoir');
    return `
      <section class="soir ${n === 0 ? 'dernier' : ''}" data-soir="${esc(s.quand)}">
        <header class="soir-tete">
          <p class="soir-date"><span>Soir ${s.numero}</span> ${esc(commun.dateLongue(s.quand, d.fuseau))}${complet ? `<em class="complet">${icone('check', { taille: 13, epaisseur: 3 })} Complété</em>` : ''}</p>
        </header>
        ${gs.map((g) => {
          const options = s.items.filter((i) => groupeDe(i) === g);
          return `
            <div class="groupe" data-groupe-bloc="${g}">
              <h4>${icone(GROUPES[g].ico, { taille: 16 })} ${GROUPES[g].titre}</h4>
              <div class="minis">${options.map((i) => mini(i, s.quand, g)).join('')}</div>
            </div>`;
        }).join('')}
        ${savoir.length ? `
          <div class="groupe">
            <h4>${icone('info', { taille: 16 })} Bon à savoir</h4>
            <div class="minis">${savoir.map((i) => mini(i, s.quand, 'savoir')).join('')}</div>
          </div>` : ''}
      </section>`;
  }).join('');
}

// Une petite carte : on la touche pour la choisir. Le « i » ouvre la fiche complète.
function mini(i, quand, g) {
  const photo = i.photos?.[0];
  const moi = g !== 'savoir' && choixDe(quand, g) === i.id;
  const autre = g !== 'savoir' && choixDe(quand, g) && !moi;
  return `
    <article class="mini ${moi ? 'prise' : ''} ${autre ? 'pas-prise' : ''}" ${g !== 'savoir' ? `data-choisir="${esc(i.id)}" data-quand="${esc(quand)}" data-groupe="${g}" role="button" aria-pressed="${moi}"` : `data-ouvrir="${esc(i.id)}"`}>
      <div class="mini-photo ${photo ? '' : 'sans'}">
        ${photo ? `<img data-p="${esc(photo)}" alt="" loading="lazy">` : iconeCat(i.categorie, { taille: 26, epaisseur: 1.4 })}
        ${moi ? `<span class="sceau">${icone('check', { taille: 18, epaisseur: 3 })}</span>` : ''}
        <button class="mini-info" data-ouvrir="${esc(i.id)}" aria-label="Voir ${esc(i.nom)}">${icone('info', { taille: 15 })}</button>
      </div>
      <b>${esc(i.nom)}</b>
      <small>${etiquette(i)}${i.prix ? ` · ${'$'.repeat(i.prix)}` : ''}</small>
      ${i.mot ? `<p class="mini-mot">${esc(i.mot)}</p>` : ''}
    </article>`;
}

// « Mon voyage » : tout ce que le client a choisi, soir après soir.
function pageResume(liste) {
  const d = etat.donnees;
  const parSoir = [...liste].reverse().map((s) => ({ s, gs: groupesDuSoir(s.items).filter((g) => choixDe(s.quand, g)) })).filter((x) => x.gs.length);
  const ligne = (s, g) => {
    const v = choixDe(s.quand, g);
    const i = s.items.find((x) => x.id === v);
    return `
      <li ${i ? `data-ouvrir="${esc(i.id)}"` : ''}>
        <span class="vignette ${i?.photos?.length ? '' : 'sans'}">${i?.photos?.length ? `<img data-p="${esc(i.photos[0])}" alt="">` : icone(GROUPES[g].ico, { taille: 20 })}</span>
        <span class="ligne-txt"><b>${i ? esc(i.nom) : 'Aucun ne me plaisait'}</b><small>${GROUPES[g].court}${i ? ` · ${etiquette(i)}` : ''}</small></span>
        ${i ? `<span class="coche">${icone('check', { taille: 16, epaisseur: 2.6 })}</span>` : ''}
      </li>`;
  };
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
function ouvrirFiche(itemId) {
  const { i, s } = trouverItem(itemId);
  if (!i) return;
  const g = groupeDe(i);
  const carteUrl = lienCarte(i);
  const site = lienWeb(i.site);
  const moi = g !== 'savoir' && choixDe(s.quand, g) === i.id;
  feuille.innerHTML = `
    <div class="voile" data-fermer></div>
    <div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(i.nom)}">
      <button class="fermer" data-fermer aria-label="Fermer">${icone('x', { taille: 20 })}</button>
      ${i.photos?.length ? `<div class="fiche-photos defile">${i.photos.map((p) => `<img data-p="${esc(p)}" alt="">`).join('')}</div>${i.photos.length > 1 ? `<div class="points fiche-points">${i.photos.map((_, n) => `<i class="${n ? '' : 'on'}"></i>`).join('')}</div>` : ''}` : ''}
      <div class="fiche-corps">
        <p class="sur">${iconeCat(i.categorie, { taille: 14 })} ${etiquette(i)}</p>
        <h3>${esc(i.nom)}</h3>
        ${i.adresse || i.ville ? `<p class="adresse">${icone('map-pin', { taille: 14 })} ${esc([i.adresse, i.ville].filter(Boolean).join(', '))}</p>` : ''}
        ${i.depart || i.arrivee ? `<p class="adresse">${icone('route', { taille: 14 })} ${esc(i.depart || '?')} → ${esc(i.arrivee || '?')}</p>` : ''}
        ${meta(i)}
        ${i.mot ? `<blockquote class="mot-raph grand"><span class="avatar">${initiale(etat.donnees.raph)}</span><p>${esc(i.mot)}</p></blockquote>` : ''}
        ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ''}
        <div class="fiche-actions">
          ${g !== 'savoir' ? `<button class="choisir grand ${moi ? 'on' : ''}" data-choisir="${esc(i.id)}" data-quand="${esc(s.quand)}" data-groupe="${g}">${moi ? `${icone('check', { taille: 17, epaisseur: 2.8 })} Mon choix` : 'Je choisis celui-ci'}</button>` : ''}
          ${carteUrl ? `<a class="btn-doux" href="${esc(carteUrl)}" target="_blank" rel="noopener">${icone('map', { taille: 16 })} Carte</a>` : ''}
          ${site ? `<a class="btn-doux" href="${esc(site)}" target="_blank" rel="noopener">${icone('globe', { taille: 16 })} Site</a>` : ''}
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

document.addEventListener('click', (ev) => {
  const info = ev.target.closest('[data-ouvrir]');
  if (info && !feuille.contains(info) && (info.classList.contains('mini-info') || !ev.target.closest('[data-choisir]'))) { ev.stopPropagation(); ouvrirFiche(info.dataset.ouvrir); return; }
  const b = ev.target.closest('[data-choisir]');
  if (!b) return;
  ev.stopPropagation();
  const { quand, groupe } = b.dataset;
  const s = soirees().liste.find((x) => x.quand === quand);
  const avant = s && soirComplet(s);
  choisir(quand, groupe, b.dataset.choisir);
  vibrer();
  if (!feuille.hidden) fermerFiche();
  const haut = racine.querySelector(`[data-soir="${CSS.escape(quand)}"] [data-groupe-bloc="${groupe}"]`)?.getBoundingClientRect().top;
  redessinerContenu();
  const bloc = racine.querySelector(`[data-soir="${CSS.escape(quand)}"] [data-groupe-bloc="${groupe}"]`);
  if (bloc && haut != null) window.scrollBy(0, bloc.getBoundingClientRect().top - haut);
  if (s && soirComplet(s) && !avant) {
    const tete = racine.querySelector(`[data-soir="${CSS.escape(quand)}"] .soir-tete`);
    if (bloc) confettis(bloc);
    vibrer([18, 60, 18]);
    toast(`${icone('check', { taille: 16 })} Soirée complétée`);
    tete?.classList.add('fete');
  }
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
    const encoreLa = Object.fromEntries(Object.entries(etat.choix.soirs).filter(([, s]) => Object.values(s).every((v) => v === 'aucun' || ids.has(v))));
    etat.choix.soirs = { ...etat.donnees.choixDemo.soirs, ...encoreLa };
  }
  document.title = `Votre voyage${etat.donnees.ville ? ` · ${etat.donnees.ville}` : ''}`;
  rendre();
  signalerVisite();
  // Quand le client revient sur la page : on regarde s'il y a du nouveau, et on renvoie ses choix.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { rafraichir(true); signalerVisite(); } });
})();

if (!DANS_APPLI && 'serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
