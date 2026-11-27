// Ma carte de contact : une carte d'affaires numérique, comme celles des pros
// (photo, nom, titre, entreprise, cell, WhatsApp, courriel, site, Instagram, ville,
// code QR à scanner pour enregistrer le contact, et fichier contact .vcf à partager).
// Les couleurs viennent du style choisi (Réglages > Apparence) : la carte suit tous les styles.
import * as db from './db.js';
import { icone } from './icones.js';
import { MARQUE } from './marque.js';
import qrcode from '../vendor/qrcode/qrcode.js';

// Valeurs de départ tant que rien n'a été changé.
export const PAR_DEFAUT = { nom: 'Raphaël St-Laurent', titre: 'Fondateur', ville: 'Montréal, QC' };

const CHAMPS = {
  nom: 'nomFiche', titre: 'titreFiche', tel: 'telFiche', whatsapp: 'whatsappFiche', courriel: 'courrielFiche',
  site: 'siteFiche', insta: 'instaFiche', ville: 'villeFiche', photo: 'photoFiche',
};

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function lireCarte() {
  const c = {};
  for (const [k, cle] of Object.entries(CHAMPS)) c[k] = await db.lireReglage(cle, k === 'whatsapp' ? true : '');
  for (const [k, v] of Object.entries(PAR_DEFAUT)) if (!c[k]) c[k] = v;
  return c;
}

// ---------- Numéro de téléphone : affichage « +1 514 555-1234 », lien « +15145551234 » ----------
export function telInternational(tel) {
  const brut = String(tel || '').trim();
  const chiffres = brut.replace(/\D/g, '');
  if (!chiffres) return '';
  if (brut.startsWith('+')) return `+${chiffres}`;
  if (chiffres.length === 10) return `+1${chiffres}`;
  if (chiffres.length === 11 && chiffres[0] === '1') return `+${chiffres}`;
  return `+${chiffres}`;
}
export function telAffiche(tel) {
  const e = telInternational(tel);
  const m = e.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `+1 ${m[1]} ${m[2]}-${m[3]}` : e;
}
const siteUrl = (s) => { const t = String(s || '').trim(); return !t ? '' : /^https?:\/\//i.test(t) ? t : `https://${t}`; };
const siteAffiche = (s) => String(s || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
const instaNom = (s) => String(s || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
const initiales = (nom) => String(nom || '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '·';

// ---------- Fiche contact (vCard 3.0) : lue par iPhone, Android, Gmail, Outlook ----------
export function vcard(c, { avecPhoto = false } = {}) {
  const v = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const mots = String(c.nom || '').trim().split(/\s+/);
  const famille = mots.length > 1 ? mots.pop() : '';
  const prenom = mots.join(' ');
  const tel = telInternational(c.tel);
  const insta = instaNom(c.insta);
  const [villeSeule, province] = String(c.ville || '').split(',').map((x) => x.trim());
  const lignes = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${v(famille)};${v(prenom)};;;`, `FN:${v(c.nom)}`,
    MARQUE ? `ORG:${v(MARQUE)}` : '', c.titre ? `TITLE:${v(c.titre)}` : '',
    tel ? `TEL;TYPE=CELL,VOICE:${tel}` : '',
    c.courriel ? `EMAIL;TYPE=INTERNET,WORK:${v(c.courriel)}` : '',
    c.site ? `URL:${siteUrl(c.site)}` : '',
    insta ? `X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${insta}` : '',
    tel && c.whatsapp ? `X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/${tel.slice(1)}` : '',
    c.ville ? `ADR;TYPE=WORK:;;;${v(villeSeule)};${v(province || '')};;` : '',
    avecPhoto && c.photo ? `PHOTO;ENCODING=b;TYPE=JPEG:${c.photo.split(',')[1]}` : '',
    'END:VCARD',
  ];
  return lignes.filter(Boolean).join('\r\n');
}

// Code QR en SVG (toujours noir sur blanc : c'est ce que les caméras lisent le mieux).
function qrSvg(texte) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M');
  q.addData(texte, 'Byte');
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="Code QR"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}

// Photo : réduite à 320 px pour rester légère.
function reduirePhoto(fichier) {
  return new Promise((ok, non) => {
    const img = new Image();
    img.onload = () => {
      const t = 320;
      const cote = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = t; cv.height = t;
      cv.getContext('2d').drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, t, t);
      URL.revokeObjectURL(img.src);
      ok(cv.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = non;
    img.src = URL.createObjectURL(fichier);
  });
}

function nomFichier(c) {
  return `${String(c.nom || 'contact').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'contact'}.vcf`;
}

async function partagerFichier(c, toast) {
  const fichier = new File([vcard(c, { avecPhoto: true })], nomFichier(c), { type: 'text/vcard' });
  try {
    if (navigator.canShare?.({ files: [fichier] })) { await navigator.share({ files: [fichier], title: c.nom }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(fichier);
  a.download = fichier.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast?.('Fiche contact téléchargée');
}

// ---------- La page ----------
export async function pageCarte(zone, { toast } = {}) {
  let c = await lireCarte();
  let edition = false;

  const ligne = (href, ico, texte, detail, externe = false) => `
    <li><a class="cc-ligne" href="${esc(href)}" ${externe ? 'target="_blank" rel="noopener"' : ''}>
      <span class="cc-ico">${icone(ico, { taille: 18 })}</span>
      <span class="cc-texte"><b>${esc(texte)}</b><small>${esc(detail)}</small></span>
    </a></li>`;

  const vue = () => {
    const tel = telInternational(c.tel);
    const insta = instaNom(c.insta);
    const lignes = [
      tel ? ligne(`tel:${tel}`, 'phone', telAffiche(c.tel), 'Cellulaire') : '',
      tel && c.whatsapp ? ligne(`https://wa.me/${tel.slice(1)}`, 'message-circle', 'WhatsApp', 'Message, appel ou vidéo', true) : '',
      c.courriel ? ligne(`mailto:${c.courriel}`, 'mail', c.courriel, 'Courriel') : '',
      c.site ? ligne(siteUrl(c.site), 'globe', siteAffiche(c.site), 'Site web', true) : '',
      insta ? ligne(`https://instagram.com/${insta}`, 'instagram', `@${insta}`, 'Instagram', true) : '',
      c.ville ? `<li><div class="cc-ligne"><span class="cc-ico">${icone('map-pin', { taille: 18 })}</span><span class="cc-texte"><b>${esc(c.ville)}</b><small>Ville</small></span></div></li>` : '',
    ].join('');
    const manque = [!c.tel && 'cell', !c.courriel && 'courriel'].filter(Boolean);
    zone.innerHTML = `
      <article class="cc">
        <div class="cc-bandeau"><span>${esc(MARQUE)}</span></div>
        <div class="cc-tete">
          <div class="cc-avatar">${c.photo ? `<img src="${c.photo}" alt="">` : `<span>${esc(initiales(c.nom))}</span>`}</div>
          <h2 class="cc-nom">${esc(c.nom)}</h2>
          <p class="cc-titre">${esc([c.titre, MARQUE].filter(Boolean).join(' · '))}</p>
        </div>
        ${lignes ? `<ul class="cc-liste">${lignes}</ul>` : ''}
        <div class="cc-qr">
          ${qrSvg(vcard(c))}
          <p>Scannez pour m'ajouter à vos contacts</p>
        </div>
      </article>
      ${manque.length ? `<p class="cc-manque">${icone('info', { taille: 16 })}<span>Ajoute ton ${manque.join(' et ton ')} pour compléter la carte.</span></p>` : ''}
      <div class="deux">
        <button type="button" class="bouton-principal" id="cc-partager">${icone('share', { taille: 18 })} Partager</button>
        <button type="button" class="bouton-secondaire" id="cc-modifier">${icone('pencil', { taille: 18 })} Modifier</button>
      </div>`;
    zone.querySelector('#cc-partager').onclick = () => partagerFichier(c, toast);
    zone.querySelector('#cc-modifier').onclick = () => { edition = true; dessiner(); window.scrollTo(0, 0); };
  };

  const champ = (k, label, attrs = '') => `<label class="champ"><span>${label}</span><input data-champ="${k}" value="${esc(k === 'tel' && c.tel ? telAffiche(c.tel) : c[k])}" ${attrs}></label>`;
  const formulaire = () => {
    zone.innerHTML = `
      <form class="cc-form" id="cc-form">
        <div class="cc-photo">
          <div class="cc-avatar">${c.photo ? `<img src="${c.photo}" alt="">` : `<span>${esc(initiales(c.nom))}</span>`}</div>
          <div class="cc-photo-boutons">
            <label class="bouton-secondaire">${icone('camera', { taille: 17 })} ${c.photo ? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/*" id="cc-fichier" hidden></label>
            ${c.photo ? '<button type="button" class="lien" id="cc-sans-photo">Retirer la photo</button>' : ''}
          </div>
        </div>
        ${champ('nom', 'Nom', 'autocapitalize="words" autocomplete="name"')}
        ${champ('titre', 'Titre', 'autocapitalize="sentences" placeholder="Fondateur"')}
        <p class="cc-aide">Entreprise : <b>${esc(MARQUE)}</b> (se met à jour avec le nom de l'entreprise)</p>
        ${champ('tel', 'Cell', 'type="tel" autocomplete="tel" placeholder="514 555-1234"')}
        <label class="interrupteur">
          <span><b>Même numéro sur WhatsApp</b><small>Pratique pour les clients à l'étranger</small></span>
          <input type="checkbox" data-champ="whatsapp" ${c.whatsapp ? 'checked' : ''}>
          <i aria-hidden="true"></i>
        </label>
        ${champ('courriel', 'Courriel', 'type="email" inputmode="email" autocapitalize="off" autocomplete="email"')}
        ${champ('site', 'Site web', 'type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="monagence.com"')}
        ${champ('insta', 'Instagram', 'autocapitalize="off" autocorrect="off" placeholder="@"')}
        ${champ('ville', 'Ville', 'autocapitalize="words" placeholder="Montréal, QC"')}
        <div class="deux">
          <button type="button" class="bouton-secondaire" id="cc-annuler">Annuler</button>
          <button type="submit" class="bouton-principal">Enregistrer</button>
        </div>
      </form>`;
    const f = zone.querySelector('#cc-form');
    let photo = c.photo;
    zone.querySelector('#cc-fichier').onchange = async (ev) => {
      const fichier = ev.target.files?.[0];
      if (!fichier) return;
      try { photo = await reduirePhoto(fichier); f.querySelector('.cc-avatar').innerHTML = `<img src="${photo}" alt="">`; } catch (_) { toast?.('Photo illisible'); }
    };
    const retirer = zone.querySelector('#cc-sans-photo');
    if (retirer) retirer.onclick = () => { photo = ''; f.querySelector('.cc-avatar').innerHTML = `<span>${esc(initiales(c.nom))}</span>`; retirer.remove(); };
    zone.querySelector('#cc-annuler').onclick = () => { edition = false; dessiner(); };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const n = { photo };
      f.querySelectorAll('[data-champ]').forEach((el) => { n[el.dataset.champ] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
      if (n.tel) n.tel = telAffiche(n.tel);
      n.insta = instaNom(n.insta);
      for (const [k, cle] of Object.entries(CHAMPS)) await db.ecrireReglage(cle, n[k]);
      c = await lireCarte();
      edition = false;
      dessiner();
      window.scrollTo(0, 0);
      toast?.('Carte enregistrée');
    };
  };

  const dessiner = () => (edition ? formulaire() : vue());
  dessiner();
}
