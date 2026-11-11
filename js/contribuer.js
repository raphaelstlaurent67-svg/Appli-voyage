// Appli des contributeurs : très simple. On ajoute un endroit (photos, catégorie, nom, position),
// puis on envoie tous ses nouveaux endroits à Raph en un fichier. Rien ne part sur internet sans
// que la personne appuie sur « Envoyer ». Les infos cachées des photos (appareil, date, GPS) sont
// lues AVANT de réduire la photo, pour que le Studio puisse vérifier qu'elle est authentique.

import { icone, iconeCat } from './icones.js';
import { lireExif } from './exif.js';

// ---------- Textes (anglais d'abord : les contributeurs viennent de partout) ----------
const TXT = {
  en: {
    bienvenue: 'Map the places only locals know.',
    bienvenueTxt: 'Walk your city. Photograph the places worth the trip. Each place accepted is paid.',
    tonNom: 'Your name', commencer: 'Begin',
    bonjour: (n) => `Hello ${n}`,
    resume: (n, a) => (n ? `${n} place${n > 1 ? 's' : ''} on your map${a ? `, ${a} not sent yet` : ''}` : 'Your map is empty. Start with one place.'),
    ajouter: 'Add a place', envoyer: (n) => `Send ${n} place${n > 1 ? 's' : ''}`,
    envoye: 'Sent', aEnvoyer: 'Not sent',
    regles: 'What makes a place accepted',
    r1: 'Your own photos, taken on the spot. Never photos found online.',
    r2: 'A real place you would recommend to a friend.',
    r3: 'The right category and the exact location.',
    nouvelEndroit: 'New place', modifier: 'Edit place',
    photos: 'Photos', prendre: 'Take a photo', galerie: 'From my photos',
    categorie: 'Category', nom: 'Name of the place', nomEx: 'e.g. Café Olimpico',
    pourquoi: 'Why go there?', pourquoiEx: 'What makes it special, what to order, best time to go…',
    prix: 'Price', ville: 'City', pays: 'Country',
    position: 'Location', maPosition: 'Use my location', positionOk: 'Location saved', positionAttente: 'Finding you…',
    positionPhoto: 'Location taken from the photo',
    positionErreur: 'Location unavailable. Allow it in your phone settings, or try again outside.',
    enregistrer: 'Save', annuler: 'Cancel', supprimer: 'Delete',
    manquePhoto: 'Add at least one photo', manqueCat: 'Choose a category', manqueNom: 'Write the name', manquePos: 'Add the location',
    enregistre: 'Place saved', supprime: 'Place deleted',
    pretEnvoi: 'Your file is ready. Send it to Raph by message or email.',
    telecharge: 'File downloaded. Send it to Raph by message or email.',
    rienAEnvoyer: 'Nothing new to send',
    cats: { hebergement: 'Stay', restos: 'Food', visites: 'Sights', experiences: 'Experiences', nuit: 'Nightlife', sport: 'Sport', trajets: 'Transport', autre: 'Other' },
    confirmeSuppr: 'Delete this place?',
    complexe: 'Complex route', complexeTxt: 'Several steps, or a place outside the city. Counts double.',
    trajetAide: 'Bus, metro, train, on foot? How long, how much, where to catch it.',
    ville100: (v) => `Complete ${v || 'your city'}`,
    villeTxt: 'A complete city earns a bonus. Extra routes can replace missing nightlife spots.',
    groupes: { restos: 'Food', hebergement: 'Stay', activites: 'Sights, experiences, sport', bars: 'Nightlife', trajets: 'Transport' },
    r4: 'Every now and then, a route: the best way to get somewhere (bus, train, on foot).',
  },
  fr: {
    bienvenue: 'Cartographiez les endroits que seuls les gens d’ici connaissent.',
    bienvenueTxt: 'Marchez dans votre ville. Photographiez les endroits qui valent le détour. Chaque endroit accepté est payé.',
    tonNom: 'Votre nom', commencer: 'Commencer',
    bonjour: (n) => `Bonjour ${n}`,
    resume: (n, a) => (n ? `${n} endroit${n > 1 ? 's' : ''} sur votre carte${a ? `, dont ${a} à envoyer` : ''}` : 'Votre carte est vide. Commencez par un endroit.'),
    ajouter: 'Ajouter un endroit', envoyer: (n) => `Envoyer ${n} endroit${n > 1 ? 's' : ''}`,
    envoye: 'Envoyé', aEnvoyer: 'À envoyer',
    regles: 'Ce qui fait qu’un endroit est accepté',
    r1: 'Vos propres photos, prises sur place. Jamais des photos trouvées sur internet.',
    r2: 'Un vrai endroit que vous conseilleriez à un ami.',
    r3: 'La bonne catégorie et la position exacte.',
    nouvelEndroit: 'Nouvel endroit', modifier: 'Modifier l’endroit',
    photos: 'Photos', prendre: 'Prendre une photo', galerie: 'Dans mes photos',
    categorie: 'Catégorie', nom: 'Nom de l’endroit', nomEx: 'Ex. : Café Olimpico',
    pourquoi: 'Pourquoi y aller ?', pourquoiEx: 'Ce qui le rend spécial, quoi commander, le meilleur moment…',
    prix: 'Prix', ville: 'Ville', pays: 'Pays',
    position: 'Position', maPosition: 'Utiliser ma position', positionOk: 'Position enregistrée', positionAttente: 'Recherche de votre position…',
    positionPhoto: 'Position prise dans la photo',
    positionErreur: 'Position indisponible. Autorisez-la dans les réglages du téléphone, ou réessayez dehors.',
    enregistrer: 'Enregistrer', annuler: 'Annuler', supprimer: 'Supprimer',
    manquePhoto: 'Ajoutez au moins une photo', manqueCat: 'Choisissez une catégorie', manqueNom: 'Écrivez le nom', manquePos: 'Ajoutez la position',
    enregistre: 'Endroit enregistré', supprime: 'Endroit supprimé',
    pretEnvoi: 'Votre fichier est prêt. Envoyez-le à Raph par message ou par courriel.',
    telecharge: 'Fichier téléchargé. Envoyez-le à Raph par message ou par courriel.',
    rienAEnvoyer: 'Rien de nouveau à envoyer',
    cats: { hebergement: 'Dormir', restos: 'Manger', visites: 'Visiter', experiences: 'Expériences', nuit: 'Sortir', sport: 'Sport', trajets: 'Transport', autre: 'Autre' },
    confirmeSuppr: 'Supprimer cet endroit ?',
    complexe: 'Trajet complexe', complexeTxt: 'Plusieurs étapes, ou un endroit hors de la ville. Compte double.',
    trajetAide: 'Bus, métro, train, à pied ? Combien de temps, combien ça coûte, où le prendre.',
    ville100: (v) => `Compléter ${v || 'votre ville'}`,
    villeTxt: 'Une ville complète donne un bonus. Des trajets en plus peuvent remplacer des endroits pour sortir.',
    groupes: { restos: 'Manger', hebergement: 'Dormir', activites: 'Visiter, expériences, sport', bars: 'Sortir', trajets: 'Transport' },
    r4: 'De temps en temps, un trajet : la meilleure façon de se rendre quelque part (bus, train, à pied).',
  },
};

// ---------- Petite base de données sur le téléphone ----------
function ouvrir() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open('contribution', 1);
    r.onupgradeneeded = () => { for (const m of ['endroits', 'photos']) r.result.createObjectStore(m, { keyPath: 'id' }); r.result.createObjectStore('reglages', { keyPath: 'cle' }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}
const base = ouvrir();
const tx = async (m, mode, f) => { const d = await base; return new Promise((ok, ko) => { const r = f(d.transaction(m, mode).objectStore(m)); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); };
const tous = (m) => tx(m, 'readonly', (s) => s.getAll());
const lire = (m, id) => tx(m, 'readonly', (s) => s.get(id));
const ecrire = (m, o) => tx(m, 'readwrite', (s) => s.put(o));
const effacer = (m, id) => tx(m, 'readwrite', (s) => s.delete(id));
const reglage = async (cle, defaut) => (await lire('reglages', cle))?.valeur ?? defaut;
const garderReglage = (cle, valeur) => ecrire('reglages', { cle, valeur });
const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------- Outils ----------
const app = document.getElementById('app');
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let langue = 'en';
const t = () => TXT[langue];
function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m; el.classList.add('visible');
  clearTimeout(toast.m); toast.m = setTimeout(() => el.classList.remove('visible'), 2600);
}
// Une ville complète (comme dans le Studio) : 60 restos, 30 hébergements, 30 activités, 20 bars, 10 trajets.
const CIBLES = [['restos', ['restos'], 60], ['hebergement', ['hebergement'], 30], ['activites', ['visites', 'experiences', 'sport'], 30], ['bars', ['nuit'], 20], ['trajets', ['trajets'], 10]];
function progresVille(endroits) {
  const n = Object.fromEntries(CIBLES.map(([k]) => [k, 0]));
  for (const e of endroits) { const g = CIBLES.find(([, cats]) => cats.includes(e.categorie)); if (g) n[g[0]] += g[0] === 'trajets' && e.complexe ? 2 : 1; }
  const cible = Object.fromEntries(CIBLES.map(([k, , c]) => [k, c]));
  const remplace = Math.min(Math.max(0, cible.bars - n.bars), Math.max(0, n.trajets - cible.trajets));
  n.bars += remplace; n.trajets -= remplace;
  return CIBLES.map(([k, , c]) => ({ k, n: n[k], c }));
}
const CATS = ['restos', 'visites', 'nuit', 'experiences', 'hebergement', 'sport', 'trajets', 'autre'];
const urls = new Map();
async function urlPhoto(id) {
  if (urls.has(id)) return urls.get(id);
  const p = await lire('photos', id);
  const u = p ? URL.createObjectURL(p.blob) : '';
  urls.set(id, u);
  return u;
}

// Réduit la photo (max 1600 px) pour qu'elle prenne moins de place.
function reduire(fichier) {
  return new Promise((ok) => {
    const img = new Image();
    const u = URL.createObjectURL(fichier);
    img.onload = () => {
      const r = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => ok(b || fichier), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(u); ok(fichier); };
    img.src = u;
  });
}

// ---------- Démarrage ----------
let profil = null;
async function demarrer() {
  const p = new URLSearchParams(location.search);
  langue = p.get('lang') || (await reglage('langue', null)) || (/^fr/i.test(navigator.language) ? 'fr' : 'en');
  profil = await reglage('profil', null);
  // Lien d'invitation du Studio : ?c=<identifiant>&n=<nom>
  if (p.get('c') && (!profil || profil.id !== p.get('c'))) {
    profil = { id: p.get('c'), nom: p.get('n') || profil?.nom || '' };
    if (profil.nom) await garderReglage('profil', profil);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  router();
}
window.addEventListener('hashchange', router);

function barreLangue() {
  return `<div class="langue">${['en', 'fr'].map((l) => `<button data-langue="${l}" class="${l === langue ? 'choisi' : ''}">${l.toUpperCase()}</button>`).join('')}</div>`;
}
function brancherLangue() {
  app.querySelectorAll('[data-langue]').forEach((b) => { b.onclick = async () => { langue = b.dataset.langue; await garderReglage('langue', langue); router(); }; });
}

async function router() {
  document.documentElement.lang = langue;
  if (!profil?.nom) return pageBienvenue();
  const [, page, id] = (location.hash || '#/').split('/');
  if (page === 'ajouter') return pageFormulaire(null);
  if (page === 'endroit') return pageFormulaire(id);
  return pageAccueil();
}

// ---------- Bienvenue ----------
function pageBienvenue() {
  app.innerHTML = `
    <section class="bienvenue">
      ${barreLangue()}
      <div class="bienvenue-corps">
        <span class="sceau">${icone('map-pin', { taille: 22 })}</span>
        <h1>${t().bienvenue}</h1>
        <p>${t().bienvenueTxt}</p>
        <form id="profil">
          <label class="champ"><span>${t().tonNom}</span><input name="nom" required autocomplete="name" value="${esc(profil?.nom)}"></label>
          <button class="bouton plein">${t().commencer}</button>
        </form>
      </div>
    </section>`;
  brancherLangue();
  app.querySelector('#profil').onsubmit = async (ev) => {
    ev.preventDefault();
    const nom = new FormData(ev.target).get('nom').trim();
    if (!nom) return;
    profil = { id: profil?.id || nouvelId(), nom };
    await garderReglage('profil', profil);
    router();
  };
}

// ---------- Accueil ----------
// La ville où il a le plus d'endroits, et ce qui manque pour la compléter.
function villeAccueil(liste) {
  const parVille = {};
  for (const e of liste) (parVille[e.ville || ''] ||= []).push(e);
  const ville = Object.keys(parVille).sort((a, b) => parVille[b].length - parVille[a].length)[0] ?? '';
  const lignes = progresVille(parVille[ville] || []);
  return `
    <section class="ville-prog">
      <h2>${esc(t().ville100(ville))}</h2>
      <p class="aide">${t().villeTxt}</p>
      ${lignes.map((l) => `<div class="vp-ligne"><span>${t().groupes[l.k]}</span><i><b style="width:${Math.round(Math.min(1, l.n / l.c) * 100)}%"></b></i><small>${Math.min(l.n, l.c)}/${l.c}</small></div>`).join('')}
    </section>`;
}
async function pageAccueil() {
  const liste = (await tous('endroits')).sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
  const aEnvoyer = liste.filter((e) => !e.envoyeLe || e.modifieLe > e.envoyeLe);
  app.innerHTML = `
    <header class="tete">
      <div><p class="petit">${esc(t().bonjour(profil.nom))}</p><h1>${esc(t().resume(liste.length, aEnvoyer.length))}</h1></div>
      ${barreLangue()}
    </header>
    <div class="actions">
      <a class="bouton plein" href="#/ajouter">${icone('camera', { taille: 20 })} ${t().ajouter}</a>
      ${aEnvoyer.length ? `<button class="bouton contour" id="envoyer">${icone('send', { taille: 18 })} ${t().envoyer(aEnvoyer.length)}</button>` : ''}
    </div>
    ${liste.length ? `<ul class="liste">${liste.map((e) => `
      <li><a href="#/endroit/${esc(e.id)}">
        <span class="vignette">${e.photos?.[0] ? `<img data-photo="${esc(e.photos[0])}" alt="">` : iconeCat(e.categorie, { taille: 22 })}</span>
        <span class="texte"><b>${esc(e.nom)}</b><small>${esc(t().cats[e.categorie] || '')}${e.ville ? `, ${esc(e.ville)}` : ''}</small></span>
        <span class="etat ${aEnvoyer.includes(e) ? '' : 'ok'}">${aEnvoyer.includes(e) ? t().aEnvoyer : t().envoye}</span>
      </a></li>`).join('')}</ul>` : ''}
    ${villeAccueil(liste)}
    <section class="regles">
      <h2>${t().regles}</h2>
      <ol><li>${t().r1}</li><li>${t().r2}</li><li>${t().r3}</li><li>${t().r4}</li></ol>
    </section>`;
  brancherLangue();
  for (const img of app.querySelectorAll('img[data-photo]')) img.src = await urlPhoto(img.dataset.photo);
  const b = app.querySelector('#envoyer');
  if (b) b.onclick = () => envoyer(aEnvoyer);
}

// ---------- Envoi : un fichier avec les endroits et leurs photos ----------
const versTexte = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
async function envoyer(endroits) {
  if (!endroits.length) { toast(t().rienAEnvoyer); return; }
  const photos = [];
  for (const e of endroits) for (const id of e.photos || []) { const p = await lire('photos', id); if (p) photos.push({ id, data: await versTexte(p.blob) }); }
  const maintenant = new Date().toISOString();
  const donnees = {
    format: 'appli-voyage', version: 1, type: 'contribution', exporteLe: maintenant,
    contributeur: { id: profil.id, nom: profil.nom },
    endroits: endroits.map(({ envoyeLe, ...e }) => e),
    photos,
  };
  const jour = maintenant.slice(0, 10);
  const nomFichier = `${profil.nom.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${jour}.json`;
  const fichier = new File([JSON.stringify(donnees)], nomFichier, { type: 'application/json' });
  let partage = false;
  if (navigator.canShare?.({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: nomFichier }); partage = true; } catch (err) { if (err.name === 'AbortError') return; }
  }
  if (!partage) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(fichier); a.download = nomFichier; a.click();
  }
  for (const e of endroits) await ecrire('endroits', { ...e, envoyeLe: maintenant });
  toast(partage ? t().pretEnvoi : t().telecharge);
  router();
}

// ---------- Ajouter ou modifier un endroit ----------
async function pageFormulaire(id) {
  const existant = id ? await lire('endroits', id) : null;
  const dernier = await reglage('dernierLieu', {});
  const f = existant ? structuredClone(existant) : { id: nouvelId(), nom: '', categorie: '', prix: 0, description: '', ville: dernier.ville || '', pays: dernier.pays || '', photos: [], photosInfo: {}, lat: null, lng: null };
  f.photosInfo = f.photosInfo || {};
  const nouvelles = []; // { id, blob, url }
  const retirees = [];

  app.innerHTML = `
    <header class="tete-form">
      <a class="retour" href="#/" aria-label="${t().annuler}">${icone('chevron-left', { taille: 22 })}</a>
      <h1>${existant ? t().modifier : t().nouvelEndroit}</h1>
    </header>
    <form id="form" class="form" novalidate>
      <section>
        <h2>${t().photos}</h2>
        <div class="photos" id="photos"></div>
        <div class="deux">
          <label class="bouton contour">${icone('camera', { taille: 18 })} ${t().prendre}<input type="file" accept="image/*" capture="environment" data-source="camera" hidden></label>
          <label class="bouton contour">${icone('image', { taille: 18 })} ${t().galerie}<input type="file" accept="image/*" multiple data-source="galerie" hidden></label>
        </div>
      </section>
      <section>
        <h2>${t().categorie}</h2>
        <div class="cats">${CATS.map((c) => `<button type="button" data-cat="${c}" class="${f.categorie === c ? 'choisi' : ''}">${iconeCat(c, { taille: 18 })}<span>${t().cats[c]}</span></button>`).join('')}</div>
        <div class="trajet-plus" ${f.categorie === 'trajets' ? '' : 'hidden'}>
          <p class="aide">${t().trajetAide}</p>
          <label class="interrupteur"><input type="checkbox" name="complexe" ${f.complexe ? 'checked' : ''}><span><b>${t().complexe}</b><small>${t().complexeTxt}</small></span></label>
        </div>
      </section>
      <label class="champ"><span>${t().nom}</span><input name="nom" value="${esc(f.nom)}" placeholder="${esc(t().nomEx)}"></label>
      <label class="champ"><span>${t().pourquoi}</span><textarea name="description" rows="3" placeholder="${esc(t().pourquoiEx)}">${esc(f.description)}</textarea></label>
      <section>
        <h2>${t().prix}</h2>
        <div class="prix">${[1, 2, 3, 4].map((n) => `<button type="button" data-prix="${n}" class="${f.prix === n ? 'choisi' : ''}">${'$'.repeat(n)}</button>`).join('')}</div>
      </section>
      <section>
        <h2>${t().position}</h2>
        <button type="button" class="bouton contour large" id="position">${icone('locate-fixed', { taille: 18 })} ${t().maPosition}</button>
        <p class="aide" id="etat-position"></p>
        <div class="deux">
          <label class="champ"><span>${t().ville}</span><input name="ville" value="${esc(f.ville)}"></label>
          <label class="champ"><span>${t().pays}</span><input name="pays" value="${esc(f.pays)}"></label>
        </div>
      </section>
      <div class="pied-form">
        ${existant ? `<button type="button" class="bouton danger" id="supprimer">${icone('trash-2', { taille: 18 })}</button>` : ''}
        <button class="bouton plein">${t().enregistrer}</button>
      </div>
    </form>`;

  const form = app.querySelector('#form');
  const etatPos = app.querySelector('#etat-position');
  const majPosition = (texte) => { etatPos.textContent = f.lat ? `${texte || t().positionOk} (${f.lat.toFixed(5)}, ${f.lng.toFixed(5)})` : (texte || ''); };
  majPosition();

  async function majPhotos() {
    const zone = app.querySelector('#photos');
    const actuelles = await Promise.all(f.photos.map(async (p) => ({ id: p, url: await urlPhoto(p) })));
    zone.innerHTML = [...actuelles, ...nouvelles].map((p) => `<div class="photo"><img src="${esc(p.url)}" alt=""><button type="button" data-retirer="${esc(p.id)}" aria-label="${t().supprimer}">${icone('x', { taille: 14 })}</button></div>`).join('');
  }
  majPhotos();

  form.querySelectorAll('input[type=file]').forEach((input) => {
    input.onchange = async () => {
      for (const fichier of input.files) {
        const info = (await lireExif(fichier)) || {};
        const pid = nouvelId();
        const blob = await reduire(fichier);
        f.photosInfo[pid] = { ...info, source: input.dataset.source, dateFichier: fichier.lastModified ? new Date(fichier.lastModified).toISOString() : '', ajouteeLe: new Date().toISOString(), nomFichier: fichier.name || '' };
        nouvelles.push({ id: pid, blob, url: URL.createObjectURL(blob) });
        // La position de la photo, si le téléphone l'a gardée, sert de position de l'endroit.
        if (!f.lat && info.lat != null) { f.lat = info.lat; f.lng = info.lng; f.positionSource = 'photo'; majPosition(t().positionPhoto); }
      }
      input.value = '';
      majPhotos();
    };
  });

  function prendrePosition() {
    if (!navigator.geolocation) { majPosition(t().positionErreur); return; }
    etatPos.textContent = t().positionAttente;
    navigator.geolocation.getCurrentPosition((p) => {
      f.lat = Math.round(p.coords.latitude * 1e6) / 1e6;
      f.lng = Math.round(p.coords.longitude * 1e6) / 1e6;
      f.precision = Math.round(p.coords.accuracy);
      f.positionSource = 'telephone';
      majPosition();
    }, () => { etatPos.textContent = t().positionErreur; }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  }
  app.querySelector('#position').onclick = prendrePosition;
  if (!existant) prendrePosition();

  form.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.cat) { f.categorie = b.dataset.cat; form.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('choisi', x === b)); form.querySelector('.trajet-plus').hidden = f.categorie !== 'trajets'; }
    if (b.dataset.prix) { const n = +b.dataset.prix; f.prix = f.prix === n ? 0 : n; form.querySelectorAll('[data-prix]').forEach((x) => x.classList.toggle('choisi', +x.dataset.prix === f.prix)); }
    if (b.dataset.retirer) {
      const pid = b.dataset.retirer;
      if (f.photos.includes(pid)) { f.photos = f.photos.filter((x) => x !== pid); retirees.push(pid); } else nouvelles.splice(nouvelles.findIndex((x) => x.id === pid), 1);
      delete f.photosInfo[pid];
      majPhotos();
    }
  });

  const supprimer = app.querySelector('#supprimer');
  if (supprimer) supprimer.onclick = async () => {
    if (!confirm(t().confirmeSuppr)) return;
    for (const p of existant.photos || []) await effacer('photos', p);
    await effacer('endroits', existant.id);
    toast(t().supprime);
    location.hash = '#/';
  };

  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    f.nom = v.nom.trim(); f.description = v.description.trim(); f.ville = v.ville.trim(); f.pays = v.pays.trim();
    f.complexe = f.categorie === 'trajets' && v.complexe === 'on';
    if (!f.photos.length && !nouvelles.length) { toast(t().manquePhoto); return; }
    if (!f.categorie) { toast(t().manqueCat); return; }
    if (!f.nom) { toast(t().manqueNom); form.nom.focus(); return; }
    if (!f.lat) { toast(t().manquePos); return; }
    for (const p of nouvelles) { await ecrire('photos', { id: p.id, blob: p.blob }); f.photos.push(p.id); }
    for (const p of retirees) await effacer('photos', p);
    const maintenant = new Date().toISOString();
    f.creeLe = f.creeLe || maintenant;
    f.modifieLe = maintenant;
    f.verifieLe = f.verifieLe || maintenant.slice(0, 10);
    await ecrire('endroits', f);
    await garderReglage('dernierLieu', { ville: f.ville, pays: f.pays });
    navigator.storage?.persist?.();
    toast(t().enregistre);
    location.hash = '#/';
  };
}

demarrer();
