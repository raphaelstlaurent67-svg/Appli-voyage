// La page privée du client : son carnet de voyage, livré chaque soir.
// Le lien ressemble à carnet.html?c=<carnet>#<clé>. La clé ne quitte jamais le téléphone du client.
// Le client met des ❤, choisit où dormir, et c'est tout : ses choix partent tout seuls à Raph.

import { TAXONOMIE } from './taxonomie.js';
import { icone, iconeCat } from './icones.js';
import * as commun from './carnet-commun.js';
import * as pwa from './installer.js';

const racine = document.getElementById('carnet');
const feuille = document.getElementById('feuille');
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');

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
const vibrer = () => { try { navigator.vibrate?.(12); } catch (_) { /* rien */ } };

// ---------- Quel carnet ? ----------
let id = params.get('c');
let cle = location.hash.slice(1);
if (!DEMO) {
  if (id && cle) memoire.ecrire('carnet', { id, cle });
  else {
    const m = memoire.lire('carnet', null);
    if (m) { id = m.id; cle = m.cle; history.replaceState(null, '', `?c=${encodeURIComponent(id)}#${cle}`); }
  }
}
const cleLocale = DEMO ? 'demo-montreal' : id;

const etat = {
  donnees: null,
  onglet: 'soirees',
  choix: { coeurs: [], dormir: {}, mot: '', ...memoire.lire(`choix-${cleLocale}`, {}) },
  vus: new Set(memoire.lire(`vus-${cleLocale}`, [])),
};

// ---------- Copie locale (pour ouvrir le carnet même sans réseau) ----------
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

// ---------- Les choix du client ----------
// Gardés sur son téléphone, et envoyés (chiffrés) à Raph quelques secondes après.
let minuterieEnvoi = null;
function sauverChoix() {
  memoire.ecrire(`choix-${cleLocale}`, etat.choix);
  clearTimeout(minuterieEnvoi);
  minuterieEnvoi = setTimeout(envoyerChoix, 2500);
}
async function envoyerChoix() {
  if (DEMO || !id || !cle || !navigator.onLine) return;
  try {
    const canal = await commun.canalChoix(id, cle);
    const maintenant = new Date().toISOString();
    const paquet = { coeurs: etat.choix.coeurs, dormir: etat.choix.dormir, mot: etat.choix.mot || '', vuLe: maintenant, envoyeLe: maintenant };
    await fetch(`${commun.RELAIS}/${canal}`, { method: 'POST', body: commun.enBase64Url(await commun.chiffrerJson(cle, paquet)) });
    memoire.ecrire(`ping-${cleLocale}`, Date.now());
  } catch (_) { /* réessayé à la prochaine visite */ }
}
// Raph sait quand le client a ouvert son carnet (au plus une fois par demi-heure).
function signalerVisite() {
  if (Date.now() - memoire.lire(`ping-${cleLocale}`, 0) > 30 * 60 * 1000) envoyerChoix();
}

const aime = (itemId) => etat.choix.coeurs.includes(itemId);
function basculerCoeur(itemId) {
  etat.choix.coeurs = aime(itemId) ? etat.choix.coeurs.filter((x) => x !== itemId) : [...etat.choix.coeurs, itemId];
  sauverChoix();
  vibrer();
  return aime(itemId);
}
function basculerDormir(item) {
  const v = item.ville || 'ici';
  if (etat.choix.dormir[v] === item.id) delete etat.choix.dormir[v];
  else etat.choix.dormir[v] = item.id;
  sauverChoix();
  vibrer();
}

// ---------- Morceaux d'affichage ----------
const RUBRIQUES = {
  hebergement: ['Où dormir', 'Choisis ton préféré, rien ne presse.'],
  restos: ['Où manger', ''],
  visites: ['À voir', ''],
  experiences: ['À vivre', ''],
  nuit: ['Pour la soirée', ''],
  sport: ['Pour bouger', ''],
  trajets: ['Pour se déplacer', ''],
  autre: ['Autres trouvailles', ''],
};
const ORDRE = Object.keys(RUBRIQUES);

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

function boutonCoeur(i, classe = '') {
  const on = aime(i.id);
  return `<button class="coeur ${classe} ${on ? 'on' : ''}" data-coeur="${esc(i.id)}" aria-pressed="${on}" aria-label="${on ? 'Retirer de mes choix' : 'J’aime'}">${icone('heart', { taille: 22, epaisseur: 2 })}</button>`;
}
function boutonDormir(i) {
  const on = etat.choix.dormir[i.ville || 'ici'] === i.id;
  return `<button class="choisir ${on ? 'on' : ''}" data-dormir="${esc(i.id)}" aria-pressed="${on}">${on ? `${icone('check', { taille: 16, epaisseur: 2.6 })} Mon choix` : 'C’est mon choix'}</button>`;
}

function carte(i, rang, nouveau) {
  const photos = i.photos || [];
  return `
    <article class="trouvaille" data-ouvrir="${esc(i.id)}" style="--i:${rang}">
      <div class="trouvaille-photo ${photos.length ? '' : 'sans'}">
        ${photos.length ? `<div class="defile">${photos.map((p) => `<img data-p="${esc(p)}" alt="" loading="lazy">`).join('')}</div>` : `<span class="grand-ico">${iconeCat(i.categorie, { taille: 40, epaisseur: 1.3 })}</span>`}
        ${photos.length > 1 ? `<div class="points">${photos.map((_, n) => `<i class="${n ? '' : 'on'}"></i>`).join('')}</div>` : ''}
        <div class="badges">
          ${nouveau ? '<span class="badge nouveau">Nouveau</span>' : ''}
          ${i.coupDeCoeur ? `<span class="badge or">${icone('sparkles', { taille: 12 })} Coup de cœur de ${esc(etat.donnees.raph)}</span>` : ''}
        </div>
        ${boutonCoeur(i, 'flottant')}
      </div>
      <div class="trouvaille-corps">
        <p class="sur">${iconeCat(i.categorie, { taille: 14 })} ${etiquette(i)}${i.adresse ? ` <i>·</i> ${esc(i.adresse.split(',').slice(-1)[0].trim())}` : ''}</p>
        <h3>${esc(i.nom)}</h3>
        ${i.mot ? `<p class="mot-raph">« ${esc(i.mot)} »</p>` : i.description ? `<p class="desc">${esc(i.description)}</p>` : ''}
        <div class="pied-carte">${meta(i)}${i.categorie === 'hebergement' ? boutonDormir(i) : ''}</div>
      </div>
    </article>`;
}

function initiale(nom) { return esc((nom || 'R').trim().charAt(0).toUpperCase()); }

// ---------- Heures ----------
function quandLivraison(date) {
  const d = etat.donnees;
  const fuseau = d.fuseau || commun.FUSEAU_PAR_DEFAUT;
  const maintenant = new Date();
  const jour = commun.jourLocal(date, fuseau);
  const h = `${new Date(date).toLocaleTimeString('fr-CA', { timeZone: fuseau, hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(' h 00', ' h')}`;
  if (jour === commun.jourLocal(maintenant, fuseau)) return `Ce soir, ${h}`;
  if (jour === commun.jourLocal(new Date(maintenant.getTime() + 864e5), fuseau)) return `Demain, ${h}`;
  return `${commun.dateLongue(date, fuseau)}, ${h}`;
}
function compteARebours(date) {
  const ms = new Date(date) - Date.now();
  if (ms <= 0) return 'Ça arrive…';
  const min = Math.ceil(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h >= 24) return `dans ${Math.round(h / 24)} jour${h >= 36 ? 's' : ''}`;
  return h ? `dans ${h} h ${String(m).padStart(2, '0')}` : `dans ${m} min`;
}

// ---------- La page ----------
function soirees() {
  const d = etat.donnees;
  const maintenant = Date.now();
  const livres = d.items.filter((i) => new Date(i.livraison).getTime() <= maintenant);
  const enRoute = d.items.filter((i) => new Date(i.livraison).getTime() > maintenant);
  const groupes = new Map();
  for (const i of livres) {
    const k = i.livraison;
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(i);
  }
  const liste = [...groupes.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([quand, items], n) => ({ quand, items, numero: n + 1 }));
  return { livres, enRoute, liste: liste.reverse() };
}

function rendre() {
  const d = etat.donnees;
  const { livres, enRoute, liste } = soirees();
  const nbChoix = etat.choix.coeurs.filter((x) => d.items.some((i) => i.id === x)).length + Object.keys(etat.choix.dormir).length;
  const prochaine = enRoute.length
    ? enRoute.map((i) => i.livraison).sort()[0]
    : d.actif ? commun.prochaineLivraison(new Date(), d.heure ?? commun.HEURE_PAR_DEFAUT, d.fuseau || commun.FUSEAU_PAR_DEFAUT).toISOString() : null;
  const enRouteBientot = enRoute.filter((i) => i.livraison === prochaine);
  const couverture = d.couverture || [...livres].reverse().find((i) => i.photos?.length)?.photos[0];
  const titreVille = d.ville || 'Ton voyage';

  racine.innerHTML = `
    <header class="couv">
      ${couverture ? `<img class="couv-img" data-p="${esc(couverture)}" alt="">` : ''}
      <div class="couv-haut">
        <span class="marque">${icone('moon', { taille: 15 })} Voyage sur mesure</span>
        ${d.actif ? '<span class="direct"><i></i> En repérage</span>' : '<span class="direct fini">Repérage terminé</span>'}
      </div>
      <div class="couv-bas">
        <p class="surtitre">${d.prenom ? `Le carnet de ${esc(d.prenom)}` : 'Ton carnet de voyage'}</p>
        <h1>${esc(titreVille)}</h1>
        <p class="par"><span class="avatar">${initiale(d.raph)}</span><span>Préparé sur place par <b>${esc(d.raph)}</b>, juste pour toi</span></p>
      </div>
    </header>

    ${prochaine ? `
    <section class="rdv">
      <div class="rdv-lune">${icone('moon', { taille: 22 })}</div>
      <div class="rdv-texte">
        <p class="rdv-quand">${esc(quandLivraison(prochaine))}</p>
        <p class="rdv-sous"><b id="rebours">${esc(compteARebours(prochaine))}</b>${enRouteBientot.length ? ` · ${enRouteBientot.length} trouvaille${enRouteBientot.length > 1 ? 's' : ''} en route` : ` · ${esc(d.raph)} est sur le terrain`}</p>
      </div>
      ${enRouteBientot.length ? `<div class="rdv-icones">${ORDRE.filter((c) => enRouteBientot.some((i) => (i.categorie || 'autre') === c)).map((c) => `<span>${iconeCat(c, { taille: 16 })}</span>`).join('')}</div>` : ''}
    </section>` : ''}

    ${d.mot ? `
    <section class="lettre">
      <span class="avatar grand">${initiale(d.raph)}</span>
      <div><p class="lettre-de">Un mot de ${esc(d.raph)}</p><p>${esc(d.mot)}</p></div>
    </section>` : ''}

    <nav class="onglets" role="tablist">
      <button role="tab" data-onglet="soirees" class="${etat.onglet === 'soirees' ? 'on' : ''}">${icone('book-open', { taille: 16 })} Les soirées</button>
      <button role="tab" data-onglet="choix" class="${etat.onglet === 'choix' ? 'on' : ''}">${icone('heart', { taille: 16 })} Mes choix${nbChoix ? ` <span class="nb">${nbChoix}</span>` : ''}</button>
    </nav>

    <div id="contenu">${etat.onglet === 'choix' ? pageChoix() : pageSoirees(liste, livres)}</div>

    <footer class="pied">
      ${pwa.dejaInstallee() ? '' : `
      <section class="carte-douce" id="installer">
        <span class="rond-ico">${icone('download', { taille: 18 })}</span>
        <div><b>Garde ton carnet sur ton écran d’accueil</b><p id="aide-installer">Il s’ouvrira d’un seul geste, comme une appli.</p></div>
        <button class="btn-doux" id="bouton-installer">Ajouter</button>
      </section>`}
      <section class="carte-douce">
        <span class="rond-ico">${icone('send', { taille: 18 })}</span>
        <div><b>Un ami rêve de partir ?</b><p>${esc(d.raph)} peut lui préparer son voyage, sur place, comme pour toi.</p></div>
        <button class="btn-doux" id="partager">En parler</button>
      </section>
      <p class="signature">${icone('lock', { taille: 13 })} Carnet privé : seul ton lien l’ouvre.${DEMO ? ' <br>Démo : photos d’illustration.' : ''}</p>
    </footer>`;

  afficherPhotos(racine);
  brancher();
  // Ce qui est affiché comme « Nouveau » le sera encore à cette visite, plus la prochaine fois.
  for (const i of livres) etat.vus.add(i.id);
  memoire.ecrire(`vus-${cleLocale}`, [...etat.vus]);
  demarrerRebours(prochaine);
}

let premiereVue = null;
function pageSoirees(liste) {
  const d = etat.donnees;
  if (!premiereVue) premiereVue = new Set(etat.vus);
  if (!liste.length) {
    return `
      <div class="vide">
        <div class="vide-lune">${icone('moon', { taille: 34, epaisseur: 1.4 })}</div>
        <h2>Ton carnet se remplit bientôt</h2>
        <p>${esc(d.raph)} part sur le terrain pour toi. Chaque soir à ${commun.formatHeure(d.heure ?? 19)}, ses trouvailles du jour apparaissent ici.</p>
      </div>`;
  }
  let rang = 0;
  return liste.map(({ quand, items, numero }) => {
    const mot = commun.motDuSoir(items, { prenom: d.prenom, raph: d.raph, ville: d.ville, numero, cle: d.id });
    const nouveaux = items.filter((i) => !premiereVue.has(i.id)).length;
    const parCat = ORDRE.map((c) => [c, items.filter((i) => (TAXONOMIE[i.categorie] ? i.categorie : 'autre') === c)]).filter(([, l]) => l.length);
    return `
      <section class="soir">
        <header class="soir-tete">
          <p class="soir-date"><span>Soir ${numero}</span> ${esc(commun.dateLongue(quand, d.fuseau))}${nouveaux ? ` <em>${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''}</em>` : ''}</p>
          <h2>${esc(mot.titre)}</h2>
          <p class="soir-mot">${esc(mot.texte)}</p>
        </header>
        ${parCat.map(([c, l]) => `
          <div class="rubrique">
            <h4>${esc(RUBRIQUES[c][0])}${l.length > 1 && RUBRIQUES[c][1] ? `<small>${esc(RUBRIQUES[c][1])}</small>` : ''}</h4>
            <div class="grille">${l.map((i) => carte(i, rang++, !premiereVue.has(i.id))).join('')}</div>
          </div>`).join('')}
      </section>`;
  }).join('');
}

function pageChoix() {
  const d = etat.donnees;
  const parId = new Map(d.items.map((i) => [i.id, i]));
  const dormir = Object.entries(etat.choix.dormir).map(([ville, x]) => [ville, parId.get(x)]).filter(([, i]) => i);
  const coeurs = etat.choix.coeurs.map((x) => parId.get(x)).filter(Boolean);
  const ligne = (i) => `
    <li data-ouvrir="${esc(i.id)}">
      <span class="vignette ${i.photos?.length ? '' : 'sans'}">${i.photos?.length ? `<img data-p="${esc(i.photos[0])}" alt="">` : iconeCat(i.categorie, { taille: 20 })}</span>
      <span class="ligne-txt"><b>${esc(i.nom)}</b><small>${etiquette(i)}</small></span>
      ${boutonCoeur(i, 'petit')}
    </li>`;
  const vide = !dormir.length && !coeurs.length;
  return `
    <div class="choix">
      <div class="choix-tete">
        <h2>Ton voyage prend forme</h2>
        <p>${vide ? `Touche ${icone('heart', { taille: 14 })} sur ce qui te fait envie. Tout se range ici.` : `${esc(d.raph)} voit tes choix tout seul. Rien à envoyer, rien à répondre.`}</p>
      </div>
      ${dormir.length ? `
        <h4>${icone('bed-double', { taille: 16 })} Où tu dors</h4>
        <ul class="lignes">${dormir.map(([ville, i]) => `
          <li data-ouvrir="${esc(i.id)}">
            <span class="vignette ${i.photos?.length ? '' : 'sans'}">${i.photos?.length ? `<img data-p="${esc(i.photos[0])}" alt="">` : iconeCat('hebergement', { taille: 20 })}</span>
            <span class="ligne-txt"><b>${esc(i.nom)}</b><small>${esc(ville)}</small></span>
            <span class="coche">${icone('check', { taille: 16, epaisseur: 2.6 })}</span>
          </li>`).join('')}</ul>` : ''}
      ${coeurs.length ? `
        <h4>${icone('heart', { taille: 16 })} Tes coups de cœur</h4>
        <ul class="lignes">${ORDRE.flatMap((c) => coeurs.filter((i) => (TAXONOMIE[i.categorie] ? i.categorie : 'autre') === c)).map(ligne).join('')}</ul>` : ''}
      <label class="mot-client">
        <span>Un mot pour ${esc(d.raph)} <small>si tu veux</small></span>
        <textarea id="mot-client" rows="3" placeholder="Ex. : J’aimerais un resto avec terrasse pour notre anniversaire.">${esc(etat.choix.mot)}</textarea>
      </label>
    </div>`;
}

// ---------- Fiche détaillée ----------
function ouvrirFiche(itemId) {
  const i = etat.donnees.items.find((x) => x.id === itemId);
  if (!i) return;
  const carteUrl = lienCarte(i);
  const site = lienWeb(i.site);
  feuille.innerHTML = `
    <div class="voile" data-fermer></div>
    <div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(i.nom)}">
      <button class="fermer" data-fermer aria-label="Fermer">${icone('x', { taille: 20 })}</button>
      ${i.photos?.length ? `<div class="fiche-photos defile">${i.photos.map((p) => `<img data-p="${esc(p)}" alt="">`).join('')}</div>` : ''}
      <div class="fiche-corps">
        <p class="sur">${iconeCat(i.categorie, { taille: 14 })} ${etiquette(i)}</p>
        <h3>${esc(i.nom)}</h3>
        ${i.adresse || i.ville ? `<p class="adresse">${icone('map-pin', { taille: 14 })} ${esc([i.adresse, i.ville].filter(Boolean).join(', '))}</p>` : ''}
        ${i.depart || i.arrivee ? `<p class="adresse">${icone('route', { taille: 14 })} ${esc(i.depart || '?')} → ${esc(i.arrivee || '?')}</p>` : ''}
        ${meta(i)}
        ${i.mot ? `<blockquote class="mot-raph grand"><span class="avatar">${initiale(etat.donnees.raph)}</span><p>${esc(i.mot)}</p></blockquote>` : ''}
        ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ''}
        <div class="fiche-actions">
          ${boutonCoeur(i, 'large')}
          ${i.categorie === 'hebergement' ? boutonDormir(i) : ''}
          ${carteUrl ? `<a class="btn-doux" href="${esc(carteUrl)}" target="_blank" rel="noopener">${icone('map', { taille: 16 })} Carte</a>` : ''}
          ${site ? `<a class="btn-doux" href="${esc(site)}" target="_blank" rel="noopener">${icone('globe', { taille: 16 })} Site</a>` : ''}
        </div>
      </div>
    </div>`;
  feuille.hidden = false;
  requestAnimationFrame(() => feuille.classList.add('ouverte'));
  afficherPhotos(feuille);
  feuille.querySelectorAll('[data-fermer]').forEach((b) => { b.onclick = fermerFiche; });
}
function fermerFiche() {
  feuille.classList.remove('ouverte');
  setTimeout(() => { feuille.hidden = true; feuille.innerHTML = ''; }, 220);
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !feuille.hidden) fermerFiche(); });

// ---------- Interactions ----------
function majBoutons() {
  document.querySelectorAll('[data-coeur]').forEach((b) => {
    const on = aime(b.dataset.coeur);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  document.querySelectorAll('[data-dormir]').forEach((b) => {
    const i = etat.donnees.items.find((x) => x.id === b.dataset.dormir);
    const on = etat.choix.dormir[i.ville || 'ici'] === i.id;
    b.classList.toggle('on', on);
    b.innerHTML = on ? `${icone('check', { taille: 16, epaisseur: 2.6 })} Mon choix` : 'C’est mon choix';
  });
  const nb = etat.choix.coeurs.filter((x) => etat.donnees.items.some((i) => i.id === x)).length + Object.keys(etat.choix.dormir).length;
  const onglet = racine.querySelector('[data-onglet="choix"]');
  if (onglet) onglet.innerHTML = `${icone('heart', { taille: 16 })} Mes choix${nb ? ` <span class="nb">${nb}</span>` : ''}`;
}

document.addEventListener('click', (ev) => {
  const coeur = ev.target.closest('[data-coeur]');
  if (coeur) {
    ev.stopPropagation();
    const on = basculerCoeur(coeur.dataset.coeur);
    majBoutons();
    if (on) { coeur.classList.remove('eclat'); void coeur.offsetWidth; coeur.classList.add('eclat'); }
    if (on && etat.choix.coeurs.length === 1) toast(`${icone('heart', { taille: 16 })} Gardé dans « Mes choix »`);
    if (etat.onglet === 'choix' && !on) { racine.querySelector('#contenu').innerHTML = pageChoix(); afficherPhotos(racine); brancherChoix(); }
    return;
  }
  const dormir = ev.target.closest('[data-dormir]');
  if (dormir) {
    ev.stopPropagation();
    const i = etat.donnees.items.find((x) => x.id === dormir.dataset.dormir);
    basculerDormir(i);
    majBoutons();
    if (etat.choix.dormir[i.ville || 'ici'] === i.id) toast(`${icone('bed-double', { taille: 16 })} ${esc(i.nom)} : noté pour ${esc(etat.donnees.raph)}`);
    return;
  }
  const ouvrir = ev.target.closest('[data-ouvrir]');
  if (ouvrir && !feuille.contains(ouvrir)) ouvrirFiche(ouvrir.dataset.ouvrir);
});

function brancherChoix() {
  const t = racine.querySelector('#mot-client');
  if (t) t.oninput = () => { etat.choix.mot = t.value; sauverChoix(); };
}

function brancher() {
  racine.querySelectorAll('[data-onglet]').forEach((b) => {
    b.onclick = () => {
      if (etat.onglet === b.dataset.onglet) return;
      etat.onglet = b.dataset.onglet;
      racine.querySelectorAll('[data-onglet]').forEach((x) => x.classList.toggle('on', x === b));
      const { liste } = soirees();
      const zone = racine.querySelector('#contenu');
      zone.innerHTML = etat.onglet === 'choix' ? pageChoix() : pageSoirees(liste);
      zone.classList.remove('fondu'); void zone.offsetWidth; zone.classList.add('fondu');
      afficherPhotos(zone);
      brancherChoix();
      brancherDefile(zone);
    };
  });
  brancherChoix();
  brancherDefile(racine);
  const inst = racine.querySelector('#bouton-installer');
  if (inst) {
    inst.onclick = async () => {
      if (await pwa.installer()) return;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      racine.querySelector('#aide-installer').textContent = ios
        ? 'Touche le bouton Partager (le carré avec une flèche), puis « Sur l’écran d’accueil ».'
        : 'Dans le menu du navigateur (les 3 points), choisis « Ajouter à l’écran d’accueil ».';
      inst.hidden = true;
    };
  }
  racine.querySelector('#partager').onclick = async () => {
    const d = etat.donnees;
    const site = new URL('site/', location.href.split('?')[0]).href;
    const texte = `${d.raph} prépare mon voyage${d.ville ? ` à ${d.ville}` : ''} en allant sur place pour moi. Chaque soir à ${commun.formatHeure(d.heure ?? 19)}, je reçois ses trouvailles. Regarde :`;
    try {
      if (navigator.share) await navigator.share({ text: texte, url: site });
      else { await navigator.clipboard.writeText(`${texte} ${site}`); toast('Texte copié : colle-le à ton ami'); }
    } catch (_) { /* annulé */ }
  };
}

// Points sous les photos qui défilent.
function brancherDefile(zone) {
  zone.querySelectorAll('.trouvaille-photo').forEach((bloc) => {
    const d = bloc.querySelector('.defile');
    const points = bloc.querySelectorAll('.points i');
    if (!d || !points.length) return;
    d.addEventListener('scroll', () => {
      const n = Math.round(d.scrollLeft / d.clientWidth);
      points.forEach((p, k) => p.classList.toggle('on', k === n));
    }, { passive: true });
  });
}

// Le compte à rebours. À l'heure de la livraison, le carnet se recharge tout seul.
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
  }, 20000);
}

async function rafraichir(livraison = false) {
  try {
    const avant = etat.donnees ? soirees().livres.length : 0;
    etat.donnees = await chargerDonnees();
    premiereVue = null;
    if (feuille.hidden && !['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) rendre();
    const apres = soirees().livres.length;
    if (livraison && apres > avant) toast(`${icone('sparkles', { taille: 16 })} La livraison du soir est arrivée`);
  } catch (_) { /* on garde ce qui est affiché */ }
}

function erreur(titre, texte) {
  racine.innerHTML = `
    <div class="vide plein">
      <div class="vide-lune">${icone('lock', { taille: 30, epaisseur: 1.5 })}</div>
      <h2>${titre}</h2>
      <p>${texte}</p>
      <a class="btn-doux" href="?demo">Voir un exemple de carnet</a>
    </div>`;
}

// ---------- Démarrage ----------
(async () => {
  if (!DEMO && (!id || !cle)) {
    erreur('Ce carnet est privé', 'Il s’ouvre seulement avec le lien complet reçu de ton conseiller. Ouvre-le directement depuis son message.');
    return;
  }
  try {
    etat.donnees = await chargerDonnees();
  } catch (err) {
    if (err?.name === 'OperationError') erreur('Ce lien ne fonctionne pas', 'Le lien semble incomplet. Ouvre-le directement depuis le message reçu, sans le modifier.');
    else erreur('Ton carnet arrive bientôt', 'Il n’est pas encore en ligne, ou internet manque. Réessaie dans quelques minutes.');
    return;
  }
  document.title = `${etat.donnees.ville || 'Mon carnet'} · carnet de ${etat.donnees.prenom || 'voyage'}`;
  rendre();
  signalerVisite();
  // Quand le client revient sur la page : on regarde s'il y a du nouveau.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') rafraichir(true); });
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
