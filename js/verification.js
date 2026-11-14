// Studio : l'outil anti-fraude pour les endroits envoyés par les contributeurs.
//
// Tout est gratuit, sans compte ni clé :
//  - les infos cachées des photos (appareil, date, GPS, logiciel), lues par l'appli des contributeurs ;
//  - les indices gardés par l'appli au moment de l'ajout (position du téléphone et sa précision,
//    fuseau horaire et langue du téléphone, temps passé sur la fiche) ;
//  - la comparaison avec tout ce que le Studio a déjà reçu (même photo, même texte, même endroit) ;
//  - OpenStreetMap, la carte libre : Overpass (les lieux autour du point) et Nominatim (le pays et la
//    ville du point, et la recherche du nom). Maximum une demande par seconde, résultats gardés.
//
// Ce que ça ne peut pas faire : prouver à 100 %. Un fraudeur très habile peut trafiquer son fichier.
// Le résultat est donc une note de confiance, avec des liens pour vérifier soi-même en un clic.

import * as db from './db.js';
import { distanceM } from './exif.js';

// ---------- Petits outils ----------
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const distTexte = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);
const aGps = (x) => x && x.lat != null && x.lat !== '' && x.lng != null && x.lng !== '';
const pt = (x) => ({ lat: +x.lat, lng: +x.lng });
const dureeTexte = (min) => (min < 60 ? `${Math.max(1, Math.round(min))} min` : min < 48 * 60 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} jours`);
const moisDepuis = (a, b) => (new Date(b) - new Date(a)) / 2.63e9;

// Mots qui ne disent rien du nom (« Restaurant Chez Paul » = « Chez Paul »).
const MOTS_VIDES = new Set(('the le la les l de du des d a au aux et and of restaurant resto cafe coffee bar pub hotel hostel guesthouse guest house auberge '
  + 'restaurante shop store boutique market marche street food rooftop club lounge bistro brasserie temple wat museum musee park parc beach plage').split(' '));
function mots(nom) {
  return sansAccents(nom).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((m) => m && !MOTS_VIDES.has(m));
}
// Ressemblance de deux noms, de 0 à 1.
export function ressemblance(a, b) {
  const A = mots(a); const B = mots(b);
  if (!A.length || !B.length) return 0;
  const ja = A.join(''); const jb = B.join('');
  if (ja === jb) return 1;
  if (ja.length >= 4 && jb.length >= 4 && (ja.includes(jb) || jb.includes(ja))) return 0.85;
  const sa = new Set(A); const sb = new Set(B);
  const communs = [...sa].filter((m) => sb.has(m)).length;
  return communs / Math.min(sa.size, sb.size) * (communs / Math.max(sa.size, sb.size)) ** 0.25;
}
// Ressemblance de deux textes (copier-coller), de 0 à 1.
function memeTexte(a, b) {
  const A = new Set(sansAccents(a).split(/\W+/).filter((m) => m.length > 2));
  const B = new Set(sansAccents(b).split(/\W+/).filter((m) => m.length > 2));
  if (A.size < 6 || B.size < 6) return 0;
  const communs = [...A].filter((m) => B.has(m)).length;
  return communs / Math.min(A.size, B.size);
}

// ---------- Pays : « Thaïlande », « Thailand » ou « TH » -> TH ----------
let tablePays = null;
export function codePays(nom) {
  if (!nom) return '';
  if (!tablePays) {
    tablePays = new Map();
    const fr = new Intl.DisplayNames(['fr'], { type: 'region' });
    const en = new Intl.DisplayNames(['en'], { type: 'region' });
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const x of L) for (const y of L) {
      const c = x + y;
      for (const d of [fr, en]) { try { const n = d.of(c); if (n && n !== c) tablePays.set(sansAccents(n).replace(/[^a-z]/g, ''), c); } catch (_) { /* code inconnu */ } }
    }
    for (const [n, c] of Object.entries({ usa: 'US', etatsunis: 'US', uk: 'GB', angleterre: 'GB', coree: 'KR', southkorea: 'KR', vietnam: 'VN', laos: 'LA', birmanie: 'MM', burma: 'MM' })) tablePays.set(n, c);
  }
  const cle = sansAccents(nom).replace(/[^a-z]/g, '');
  if (/^[a-z]{2}$/.test(cle)) return cle.toUpperCase();
  return tablePays.get(cle) || '';
}
export const nomPays = (code) => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code); } catch (_) { return code; } };

// ---------- Empreinte des photos (même photo réutilisée, même recadrée ou réduite) ----------
const empreintes = new Map();
export async function empreinte(id) {
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
export async function indexPhotos(endroits) {
  const index = [];
  for (const e of endroits) for (const id of e.photos || []) index.push({ id, endroitId: e.id, h: await empreinte(id) });
  return index;
}

// ---------- OpenStreetMap (gratuit, sans compte) ----------
let fileNominatim = Promise.resolve();
function nominatim(chemin) {
  // Règle d'OpenStreetMap : une demande par seconde au maximum.
  const tour = fileNominatim.then(() => new Promise((ok) => setTimeout(ok, 1100)));
  fileNominatim = tour;
  return tour.then(async () => {
    const r = await fetch(`https://nominatim.openstreetmap.org/${chemin}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`OSM ${r.status}`);
    return r.json();
  });
}
async function overpass(requete) {
  const serveurs = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let derniere;
  for (const s of serveurs) {
    try {
      const r = await fetch(s, { method: 'POST', body: `data=${encodeURIComponent(requete)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (r.ok) return r.json();
      derniere = new Error(`Overpass ${r.status}`);
    } catch (err) { derniere = err; }
  }
  throw derniere;
}
const nomsOsm = (t = {}) => [t.name, t['name:en'], t['name:fr'], t['int_name'], t['name:latin'], t.alt_name, t.official_name, t.brand, t.old_name].filter(Boolean);

// Va chercher ce qu'OpenStreetMap sait de cet endroit. Retourne un petit objet à garder dans la fiche.
export async function chercherSurLaCarte(e) {
  if (!aGps(e)) return null;
  const { lat, lng } = pt(e);
  const res = { le: new Date().toISOString(), autour: null, pays: '', paysNom: '', ville: '', adresse: '', trouve: null, ailleurs: null, erreur: '' };
  try {
    const inv = await nominatim(`reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=fr`);
    const a = inv.address || {};
    res.pays = (a.country_code || '').toUpperCase();
    res.paysNom = a.country || '';
    res.ville = a.city || a.town || a.village || a.municipality || a.county || a.state || '';
    res.adresse = inv.display_name || '';
    res.eau = !inv.address || inv.error ? true : false;
  } catch (err) { res.erreur = 'carte'; }
  if (e.categorie !== 'trajets') {
    try {
      const j = await overpass(`[out:json][timeout:20];nwr(around:350,${lat},${lng})[name];out tags center 400;`);
      const lieux = (j.elements || []).map((x) => ({ noms: nomsOsm(x.tags), lat: x.lat ?? x.center?.lat, lng: x.lon ?? x.center?.lon, type: x.tags?.amenity || x.tags?.tourism || x.tags?.shop || x.tags?.leisure || x.tags?.historic || '' }))
        .filter((x) => x.noms.length && x.lat != null);
      res.autour = lieux.filter((x) => x.type).length;
      let meilleur = null;
      for (const l of lieux) {
        const notes = l.noms.map((n) => ressemblance(e.nom, n));
        const r = Math.max(...notes);
        const nom = l.noms[notes.indexOf(r)];
        if (r >= 0.6 && (!meilleur || r > meilleur.r)) meilleur = { r, nom: nom === l.noms[0] ? nom : `${nom} (${l.noms[0]})`, lat: l.lat, lng: l.lng };
      }
      if (meilleur) res.trouve = { ...meilleur, m: Math.round(distanceM({ lat, lng }, meilleur)) };
    } catch (err) { res.erreur = res.erreur || 'autour'; }
    if (!res.trouve && e.nom) {
      try {
        const q = [e.nom, e.ville, e.pays].filter(Boolean).join(', ');
        const l = await nominatim(`search?format=jsonv2&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`);
        const bons = (l || []).map((x) => ({ nom: x.name || x.display_name, lat: +x.lat, lng: +x.lon }))
          .filter((x) => ressemblance(e.nom, x.nom) >= 0.6)
          .map((x) => ({ ...x, m: Math.round(distanceM({ lat, lng }, x)) }))
          .sort((a, b) => a.m - b.m);
        if (bons[0]) {
          if (bons[0].m <= 400) res.trouve = { ...bons[0], r: 0.8 };
          else res.ailleurs = bons[0];
        }
      } catch (err) { res.erreur = res.erreur || 'recherche'; }
    }
  }
  return res;
}

// ---------- L'analyse ----------
// ctx : { tous (tous les endroits du Studio), contributeur, index (empreintes des photos) }
// Résultat : { score, niveau, verdict, raison, questions[], photos[], points carte }
export const QUESTIONS = [
  ['photo', 'camera', 'La photo est-elle vraiment la sienne ?'],
  ['existe', 'map-pin', "L'endroit existe-t-il vraiment ?"],
  ['surplace', 'locate-fixed', 'Était-il vraiment sur place ?'],
  ['pays', 'globe', 'Vit-il vraiment dans ce pays ?'],
  ['serieux', 'shield-check', 'Le travail est-il sérieux ?'],
];
const POIDS = { rouge: 30, orange: 10, info: 0, vert: 0 };

export async function analyser(e, { tous, contributeur, index }) {
  const Q = Object.fromEntries(QUESTIONS.map(([k]) => [k, []]));
  const dire = (q, niveau, texte, poids = POIDS[niveau]) => Q[q].push({ niveau, texte, poids });
  const cree = e.creeLe || e.recuLe || new Date().toISOString();
  const pr = e.preuves || {};
  const osm = e.verifCarte || null;
  const siens = tous.filter((x) => x.contributeurId && x.contributeurId === e.contributeurId);
  const photos = [];

  // 1. La photo
  if (!e.photos?.length) dire('photo', 'rouge', 'Aucune photo.');
  for (const pid of e.photos || []) {
    const info = e.photosInfo?.[pid];
    const raisons = [];
    let n = 'vert';
    const marquer = (x, r, poids) => { raisons.push(r); if (x === 'rouge' || n === 'vert') n = x; dire('photo', x, r, poids); };
    if (!info) marquer('orange', "Envoyée sans les infos de la photo (ancienne version de l'appli).");
    else {
      if (info.source === 'camera') dire('photo', 'vert', "Prise avec l'appareil photo, directement dans l'appli.");
      if (!info.appareil && info.source !== 'camera') marquer('orange', "Aucun appareil photo dans le fichier : capture d'écran ou image d'Internet ?");
      if (info.appareil) dire('photo', 'vert', `Prise avec un ${info.appareil}.`);
      if (info.logiciel && /photoshop|lightroom|canva|snapseed|picsart|gimp|facetune|vsco|meitu|remini/i.test(info.logiciel)) marquer('orange', `Retouchée avec ${info.logiciel}.`);
      if (info.datePhoto) {
        const m = moisDepuis(info.datePhoto, cree);
        if (m > 18) marquer('rouge', `Photo prise en ${info.datePhoto.slice(0, 4)}, bien avant l'envoi.`, 20);
        else if (m > 1) marquer('orange', `Photo prise il y a ${Math.round(m)} mois.`);
      } else if (info.source === 'galerie' && info.dateFichier && moisDepuis(info.dateFichier, info.ajouteeLe || cree) > 6) {
        marquer('orange', 'Image ancienne, choisie dans la galerie.');
      }
      if (aGps(info) && aGps(e)) {
        const m = distanceM(info, pt(e));
        if (m > 1000) marquer('rouge', `Photo prise à ${distTexte(m)} de l'endroit.`);
        else dire('photo', 'vert', `La photo a été prise à ${distTexte(m)} de l'endroit.`);
      }
    }
    const h = await empreinte(pid);
    if (h && index) {
      const double = index.find((x) => x.id !== pid && x.endroitId !== e.id && x.h && ecartBits(x.h, h) <= 5);
      if (double) {
        const autre = tous.find((x) => x.id === double.endroitId);
        if ((autre?.creeLe || '') <= (e.creeLe || '')) marquer('rouge', `Même photo que « ${autre?.nom || 'un autre endroit'} », reçu avant.`, 40);
        else marquer('orange', `La même photo a été réutilisée plus tard pour « ${autre?.nom || 'un autre endroit'} ».`);
      }
    }
    photos.push({ id: pid, niveau: n, raisons });
  }
  if (e.photos?.length) dire('photo', 'info', 'Pour être certain : cherche la photo sur Google Lens ou TinEye (boutons plus bas). Si elle apparaît ailleurs, elle a été volée.');

  // 2. L'endroit existe ?
  const memePays = (code) => code && codePays(e.pays) && code === codePays(e.pays);
  if (!aGps(e)) dire('existe', 'rouge', 'Aucune position GPS : impossible de savoir où est cet endroit.');
  else if (!osm) dire('existe', 'info', 'Vérification sur la carte pas encore faite (il faut internet).');
  else {
    if (osm.erreur === 'carte' && !osm.pays) dire('existe', 'info', "La carte en ligne n'a pas répondu. Réessaie plus tard.");
    if (osm.pays && e.pays && codePays(e.pays) && !memePays(osm.pays)) dire('existe', 'rouge', `La position envoyée est en ${osm.paysNom || nomPays(osm.pays)}, pas en ${e.pays}.`);
    else if (osm.ville && e.ville && ressemblance(osm.ville, e.ville) < 0.5 && !sansAccents(osm.adresse).includes(sansAccents(e.ville))) dire('existe', 'orange', `La position est à ${osm.ville}, pas à ${e.ville}.`, 6);
    else if (osm.pays) dire('existe', 'vert', `La position est bien à ${[osm.ville, osm.paysNom].filter(Boolean).join(', ')}.`);
    if (osm.eau) dire('existe', 'rouge', 'La position ne correspond à aucune adresse (dans l\'eau ou en pleine nature ?).');
    if (e.categorie === 'trajets') dire('existe', 'info', 'Trajet : pas de vérification sur la carte.');
    else if (osm.trouve) dire('existe', 'vert', `Trouvé sur la carte OpenStreetMap à ${distTexte(osm.trouve.m)} : « ${osm.trouve.nom} ».`);
    else if (osm.ailleurs) dire('existe', 'rouge', `Un endroit qui porte ce nom existe, mais à ${distTexte(osm.ailleurs.m)} de la position envoyée.`, 25);
    else if (osm.autour === 0) dire('existe', 'orange', 'Aucun commerce ni lieu connu à moins de 350 m : endroit très isolé, ou position inventée ?', 14);
    else if (osm.autour != null) dire('existe', 'orange', `Pas trouvé sur OpenStreetMap (souvent normal pour un petit commerce, ${osm.autour} autres lieux connus autour). Vérifie sur Google Maps en un clic.`, 6);
  }
  // Déjà dans ta base ? (pour ne pas payer deux fois le même endroit)
  if (aGps(e)) {
    const deja = tous.find((x) => x.id !== e.id && x.statut !== 'refuse' && aGps(x) && distanceM(pt(x), pt(e)) < 120 && ressemblance(x.nom, e.nom) >= 0.7);
    if (deja) dire('serieux', 'rouge', `Déjà dans ta base : « ${deja.nom} »${deja.contributeurId ? (deja.contributeurId === e.contributeurId ? ', envoyé avant par la même personne' : ', envoyé par quelqu\'un d\'autre') : ', ajouté par toi'}. Ne paie pas deux fois.`, 40);
  }

  // 3. Sur place ?
  if (e.positionSource === 'telephone') {
    if (e.precision != null && e.precision > 1500) dire('surplace', 'orange', `Position du téléphone peu précise (à ${distTexte(e.precision)} près) : GPS éteint ou position approximative.`);
    else dire('surplace', 'vert', `Position prise par le téléphone sur place${e.precision != null ? `, précise à ${distTexte(e.precision)}` : ''}.`);
  } else if (e.positionSource === 'photo') dire('surplace', 'vert', 'Position tirée de la photo elle-même.');
  else if (aGps(e)) dire('surplace', 'orange', 'Position écrite à la main, pas prise par le téléphone.');
  const gpsPhoto = (e.photos || []).map((p) => e.photosInfo?.[p]).find(aGps);
  if (!gpsPhoto && e.photos?.length) dire('surplace', 'info', 'Les photos ne contiennent pas de position (normal sur certains iPhone).');
  if (pr.mobile === false) dire('surplace', 'orange', 'Fiche faite sur un ordinateur, pas sur un cellulaire.');
  // Fuseau horaire du téléphone comparé à la position : un fraudeur chez lui garde son heure à lui.
  if (pr.decalageMin != null && aGps(e)) {
    const attendu = +e.lng / 15;
    let d = pr.decalageMin / 60 - attendu;
    d = (((d + 12) % 24) + 24) % 24 - 12;
    const ecart = Math.abs(d);
    const utc = `UTC${pr.decalageMin >= 0 ? '+' : '-'}${Math.abs(pr.decalageMin / 60)}`;
    if (ecart > 3.5) {
      dire('surplace', 'rouge', `Son téléphone était à l'heure de ${pr.fuseau || utc} : il n'était probablement pas dans ce pays.`, 35);
      dire('pays', 'rouge', `Son téléphone est réglé sur l'heure de ${pr.fuseau || utc}, pas sur celle de ce pays.`, 0);
    }
    else if (ecart > 2.5) dire('surplace', 'orange', `Son téléphone était à l'heure de ${pr.fuseau || utc}, un peu loin de l'endroit.`);
    else dire('surplace', 'vert', `Son téléphone était à l'heure locale (${pr.fuseau || utc}).`);
  }
  // Déplacements impossibles : deux endroits trop loin l'un de l'autre pour le temps écoulé.
  if (aGps(e)) {
    for (const x of siens) {
      if (x.id === e.id || !aGps(x) || !x.creeLe || !e.creeLe || x.positionSource === undefined) continue;
      const min = Math.abs(new Date(e.creeLe) - new Date(x.creeLe)) / 60000;
      const km = distanceM(pt(x), pt(e)) / 1000;
      if (km > 60 && km / Math.max(min / 60, 0.05) > 400) { dire('surplace', 'rouge', `Impossible : « ${x.nom} » est à ${Math.round(km)} km, ajouté seulement ${dureeTexte(min)} avant ou après.`, 35); break; }
    }
    const memePoint = siens.filter((x) => x.id !== e.id && aGps(x) && distanceM(pt(x), pt(e)) < 12 && ressemblance(x.nom, e.nom) < 0.5);
    if (memePoint.length >= 2) dire('surplace', 'orange', `Même position exacte que ${memePoint.length} autres de ses endroits : fiches faites sans bouger, de chez lui ?`, 15);
  }

  // 4. Vit dans le pays ?
  const codeEndroit = osm?.pays || codePays(e.pays);
  const codeDit = codePays(contributeur?.pays);
  if (codeDit && codeEndroit && codeDit !== codeEndroit) dire('pays', 'orange', `Il dit vivre en ${contributeur.pays}, mais l'endroit est en ${nomPays(codeEndroit)}.`);
  else if (codeDit && codeEndroit) dire('pays', 'vert', `L'endroit est dans le pays où il dit vivre (${contributeur.pays}).`);
  else if (!contributeur?.pays) dire('pays', 'info', 'Tu n\'as pas noté son pays dans sa fiche de contributeur (bouton crayon).');
  const regionLangue = (pr.langue || '').split('-')[1]?.toUpperCase();
  if (regionLangue && codeEndroit && regionLangue === codeEndroit) dire('pays', 'vert', `Son téléphone est réglé pour ce pays (${pr.langue}).`);
  else if (regionLangue && codeEndroit && !['US', 'GB'].includes(regionLangue)) dire('pays', 'orange', `Son téléphone est réglé pour un autre pays (${pr.langue}, ${nomPays(regionLangue)}).`, 5);
  else if (pr.langue) dire('pays', 'info', `Langue de son téléphone : ${pr.langue}.`);
  const jours = new Set(siens.map((x) => (x.creeLe || '').slice(0, 10)).filter(Boolean));
  const dates = siens.map((x) => x.creeLe).filter(Boolean).sort();
  const etendue = dates.length > 1 ? (new Date(dates.at(-1)) - new Date(dates[0])) / 864e5 : 0;
  const paysSiens = new Set(siens.map((x) => codePays(x.pays)).filter(Boolean));
  if (siens.length >= 4 && jours.size >= 4 && etendue >= 14 && paysSiens.size <= 1) dire('pays', 'vert', `Ses ${siens.length} endroits sont dans le même pays, ajoutés sur ${jours.size} jours différents en ${Math.round(etendue)} jours : comportement de quelqu'un qui vit là.`);
  else if (siens.length >= 6 && jours.size === 1) dire('pays', 'orange', `Ses ${siens.length} endroits ont tous été ajoutés le même jour : touriste de passage, ou fait à la chaîne ?`);
  if (paysSiens.size >= 3) dire('pays', 'orange', `Ses endroits sont dans ${paysSiens.size} pays différents.`);
  dire('pays', 'info', "Aucun outil gratuit ne peut prouver où quelqu'un habite. Si tu as un doute, demande-lui un court appel vidéo devant l'endroit (bouton « Lui demander une preuve »).");

  // 5. Sérieux ?
  if (pr.secondes != null) {
    if (pr.secondes < 25) dire('serieux', 'orange', `Fiche remplie en ${pr.secondes} secondes seulement.`);
    else dire('serieux', 'vert', `Fiche remplie en ${pr.secondes < 90 ? `${pr.secondes} secondes` : `${Math.round(pr.secondes / 60)} minutes`}.`);
  }
  if (e.creeLe) {
    const t = new Date(e.creeLe);
    const rafale = siens.filter((x) => x.creeLe && Math.abs(new Date(x.creeLe) - t) < 10 * 60000).length;
    if (rafale >= 6) dire('serieux', 'orange', `${rafale} endroits ajoutés en 10 minutes : fait à la chaîne ?`, 12);
  }
  const desc = (e.description || '').trim();
  if (desc.length < 20) dire('serieux', 'orange', 'Description absente ou très courte.', 8);
  else {
    const copie = tous.find((x) => x.id !== e.id && memeTexte(x.description, desc) > 0.8);
    if (copie && (copie.creeLe || '') <= (e.creeLe || '')) dire('serieux', 'rouge', `Même texte que « ${copie.nom} », reçu avant : copier-coller.`, 25);
    else if (copie) dire('serieux', 'orange', `Le même texte a été réutilisé plus tard pour « ${copie.nom} ».`, 8);
    else dire('serieux', 'vert', 'Description écrite pour cet endroit.');
  }
  const decides = siens.filter((x) => x.statut === 'accepte' || x.statut === 'refuse');
  const refuses = decides.filter((x) => x.statut === 'refuse').length;
  if (decides.length >= 5 && refuses / decides.length >= 0.3) dire('serieux', 'orange', `Tu as déjà refusé ${refuses} de ses ${decides.length} endroits.`);
  else if (decides.length >= 5) dire('serieux', 'vert', `Historique propre : ${decides.length - refuses} de ses ${decides.length} endroits acceptés.`);

  // Note finale
  const tousPoints = Object.values(Q).flat();
  const score = Math.max(0, 100 - tousPoints.reduce((s, p) => s + (p.niveau === 'rouge' || p.niveau === 'orange' ? p.poids : 0), 0));
  const rouges = tousPoints.filter((p) => p.niveau === 'rouge');
  const niveau = rouges.length || score < 50 ? 'rouge' : score < 85 ? 'orange' : 'vert';
  const pire = rouges[0] || tousPoints.filter((p) => p.niveau === 'orange').sort((a, b) => b.poids - a.poids)[0];
  const questions = QUESTIONS.map(([cle, ico, titre]) => {
    const points = Q[cle];
    const n = points.some((p) => p.niveau === 'rouge') ? 'rouge' : points.some((p) => p.niveau === 'orange') ? 'orange' : points.some((p) => p.niveau === 'vert') ? 'vert' : 'info';
    return { cle, ico, titre, niveau: n, points };
  });
  return {
    score, niveau, questions, photos,
    verdict: { vert: 'Fiable', orange: 'À regarder', rouge: 'Fraude probable' }[niveau],
    raison: pire?.texte || 'Rien à signaler.',
    enLigne: !!osm,
    carte: { endroit: aGps(e) ? pt(e) : null, photo: gpsPhoto ? pt(gpsPhoto) : null, trouve: osm?.trouve || osm?.ailleurs || null },
  };
}

// Note de confiance d'un contributeur : moyenne de ses dernières vérifications et de ses refus.
export function confianceContributeur(c, tous) {
  const siens = tous.filter((x) => x.contributeurId === c.id);
  const notes = siens.map((x) => x.verifNote).filter((n) => n != null);
  const decides = siens.filter((x) => x.statut === 'accepte' || x.statut === 'refuse');
  if (!notes.length && !decides.length) return null;
  const moyenne = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 85;
  const tauxRefus = decides.length ? decides.filter((x) => x.statut === 'refuse').length / decides.length : 0;
  return Math.round(Math.max(0, Math.min(100, moyenne - tauxRefus * 40)));
}

// Liens pour vérifier soi-même, en un clic.
export const liens = {
  googleMaps: (e) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aGps(e) ? `${e.nom} ${e.lat},${e.lng}` : [e.nom, e.ville, e.pays].filter(Boolean).join(' '))}`,
  pointGps: (e) => `https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`,
  streetView: (e) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${e.lat},${e.lng}`,
  texte: (e) => `https://www.google.com/search?q=${encodeURIComponent(`"${(e.description || '').split(/\s+/).slice(0, 14).join(' ')}"`)}`,
};
export const MOTEURS_IMAGE = [
  ['google', 'Google Lens', 'https://lens.google.com/'],
  ['tineye', 'TinEye', 'https://tineye.com/'],
  ['bing', 'Bing', 'https://www.bing.com/visualsearch'],
  ['yandex', 'Yandex', 'https://yandex.com/images/'],
];

// Message tout prêt pour demander une preuve au contributeur.
export function messagePreuve(e, contributeur, langue = 'en') {
  const nom = contributeur?.nom?.split(' ')[0] || '';
  return langue === 'fr'
    ? `Bonjour ${nom}, merci pour « ${e.nom} » ! Avant de valider, j'ai besoin d'une petite preuve : peux-tu m'envoyer une courte vidéo (10 secondes) devant l'endroit, avec son nom visible, ou faire un appel vidéo rapide avec moi ? C'est une vérification que je fais pour tous les contributeurs. Merci !`
    : `Hi ${nom}, thanks for "${e.nom}"! Before I approve it, I need a quick proof: could you send me a short video (10 seconds) in front of the place, with its name visible, or do a quick video call with me? I do this check for every contributor. Thank you!`;
}
