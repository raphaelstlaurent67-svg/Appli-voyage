// Site web public : la page « Devenir contributeur ».
// Les éclaireurs : des gens de confiance qui partent repérer une destination. Voyage payé + un cachet par mission (GAINS).
// Inscription : pour l'instant, la demande part au courriel de js/contact.js (FormSubmit, gratuit, sans compte).
// Plus tard, quand le nom de domaine sera acheté, on branchera de vrais comptes (avec mot de passe).

import './clavier.js';
import { icone, iconeCat } from './icones.js';
import { photo, PHOTOS_FOND } from './photos.js';
import { MARQUE } from './marque.js';
import { CONTACT } from './contact.js';

const GAINS = { cachet: '1 000', devise: '' };
const ENDROITS_PAR_VILLE = 150;

const TXT = {
  fr: {
    navComment: 'Comment ça marche', navGains: 'Ce que vous recevez', navQualite: 'Qualité', navFaq: 'Questions',
    cta: 'Je suis partant', ctaCourt: 'Partant', voirComment: 'Comment ça marche',
    surtitre: 'Éclaireurs',
    titre: 'Partez en voyage. On paie le voyage.',
    sousTitre: "Vous partez repérer une destination pour nos clients : hôtels, restos, activités. Le vol et l'hébergement sont payés, plus un cachet à la fin de la mission.",
    chiffres: [['0 $', 'de votre poche : vol et hébergement payés'], ['1 000 $', 'par mission terminée'], ['150', 'endroits à repérer par ville'], ['2 min', 'pour ajouter un endroit']],
    commentSur: 'Comment ça marche', commentTitre: 'Une mission, quatre étapes',
    e1t: 'On choisit la destination', e1p: 'Ensemble : la ville, les dates et ce que nos clients recherchent.',
    e2t: 'Vous partez', e2p: "Le vol et l'hébergement sont réservés et payés pour vous.",
    e3t: 'Vous repérez', e3p: 'Sur place : une photo, la catégorie et quelques mots par endroit, depuis votre cellulaire. La position se prend toute seule.',
    e4t: 'Vous êtes payé', e4p: 'Le cachet est versé par virement à la fin de la mission, une fois les endroits vérifiés.',
    gainsSur: 'Ce que vous recevez', gainsTitre: 'Pour chaque mission',
    gainsTexte: '',
    g1t: () => 'Le voyage', g1s: 'payé', g1p: "Le vol aller-retour et l'hébergement pendant la mission.",
    g2t: (n, d) => `${n} $ ${d}`, g2s: 'par mission', g2p: () => 'Versé à la fin de la mission, une fois les endroits vérifiés.',
    g3t: (n) => `${n}`, g3s: 'endroits par ville', g3p: 'Restos, hébergement, activités, bars et trajets : ce que nos clients veulent savoir.',
    chercheSur: 'Ce que nous cherchons', chercheTitre: 'Les endroits que vous recommanderiez à un ami',
    chercheTexte: 'Pas les attrapes-touristes. Les adresses que les gens du coin connaissent, avec une vraie photo et quelques mots honnêtes.',
    cats: [['restos', 'Restos et cuisine de rue', 'Du petit comptoir au restaurant chic.'], ['hebergement', 'Hébergement', 'Hôtels, auberges, maisons d\'hôtes.'], ['experiences', 'Activités', 'Ce qui vaut vraiment le détour.'], ['nuit', 'Bars et sorties', 'Où les gens du coin vont le soir.'], ['trajets', 'Trajets', 'Comment se rendre d\'un endroit à l\'autre, et combien ça coûte.']],
    qualiteSur: 'Notre exigence', qualiteTitre: 'Chaque endroit est vérifié',
    qualiteTexte: 'Nos clients comptent sur nous. Chaque endroit est vérifié avant la fin de la mission.',
    regles: [['camera', 'Photos prises sur place', 'Des photos à vous, prises sur place. Les images trouvées sur Internet sont détectées et refusées.'], ['map-pin', 'Position réelle', 'La position GPS de votre cellulaire confirme que vous étiez sur place.'], ['pencil', 'Vos propres mots', 'Une description écrite par vous. Le copier-coller est refusé.'], ['ban', 'Tolérance zéro', 'Une fausse fiche, et la mission s\'arrête.']],
    inscSur: 'Partant ?', inscTitre: 'Dites-nous où vous aimeriez aller',
    inscTexte: 'Nous vous recontactons pour choisir la destination et les dates ensemble.',
    rassure: ['Vol et hébergement payés', '1 000 $ par mission', 'Sans engagement'],
    f: { prenom: 'Prénom', nom: 'Nom', courriel: 'Courriel', whatsapp: 'WhatsApp', optionnel: 'optionnel', ville: 'Votre ville', pays: 'Votre pays', depuis: 'Vous y habitez depuis', depuisOpts: ['Moins d\'un an', '1 à 3 ans', 'Plus de 3 ans', 'J\'y suis né(e)'], langues: 'Langues parlées', languesEx: 'Ex. : français, anglais', lien: 'Instagram ou autre profil', motivation: 'Quelles destinations vous intéressent ?', accepte: 'J\'accepte que mes endroits soient vérifiés, et qu\'une fausse fiche arrête la mission.', envoyer: 'Envoyer', deja: 'Déjà éclaireur ?', ouvrir: 'Ouvrir mon appli' },
    erreurs: { prenom: 'Écrivez votre prénom.', courriel: 'Écrivez un courriel valide.', ville: 'Écrivez votre ville et votre pays.', accepte: 'Cochez la case pour continuer.' },
    envoi: 'Envoi…', merciT: 'Merci ! Votre demande est reçue.', merciP: "Nous vous recontactons d'ici quelques jours.",
    bientotT: 'Les inscriptions ouvrent très bientôt.', bientotP: 'Votre demande n\'a pas pu être envoyée pour l\'instant. Revenez dans quelques jours : merci de votre intérêt !',
    echecT: 'Oups, l\'envoi n\'a pas fonctionné.', echecP: 'Vérifiez votre connexion internet et réessayez.', reessayer: 'Réessayer',
    faqSur: 'Questions', faqTitre: 'Les questions fréquentes',
    faq: [
      ['Qui peut partir ?', 'Des gens de confiance, débrouillards, qui aiment découvrir et prennent de belles photos.'],
      ['Combien de temps dure une mission ?', 'Environ une à deux semaines par ville, selon la destination.'],
      ['Qu\'est-ce qui est payé ?', 'Le vol aller-retour et l\'hébergement pendant la mission, plus le cachet de 1 000 $ à la fin.'],
      ['Combien de temps pour ajouter un endroit ?', 'Environ deux minutes, sur place : une photo, la catégorie, quelques mots. La position se prend toute seule.'],
            ['Est-ce que je dois installer une application ?', 'Non. Votre accès s\'ouvre dans le navigateur de votre cellulaire, et vous pouvez l\'ajouter à votre écran d\'accueil.'],
    ],
    lienVoyageurs: 'Pour les voyageurs', credits: 'Photos : Unsplash',
  },
  en: {
    navComment: 'How it works', navGains: 'What you get', navQualite: 'Quality', navFaq: 'Questions',
    cta: "I'm in", ctaCourt: "I'm in", voirComment: 'How it works',
    surtitre: 'Scouts',
    titre: 'Go on a trip. We pay for it.',
    sousTitre: 'You scout a destination for our clients: hotels, restaurants, activities. Flights and lodging are paid, plus a fee at the end of the mission.',
    chiffres: [['$0', 'out of pocket: flights and lodging paid'], ['$1,000', 'per completed mission'], ['150', 'places to scout per city'], ['2 min', 'to add a place']],
    commentSur: 'How it works', commentTitre: 'One mission, four steps',
    e1t: 'We pick the destination', e1p: 'Together: the city, the dates and what our clients are looking for.',
    e2t: 'You go', e2p: 'Flights and lodging are booked and paid for you.',
    e3t: 'You scout', e3p: 'On the spot: a photo, the category and a few words per place, from your phone. Your location is added automatically.',
    e4t: 'You get paid', e4p: 'The fee is sent by transfer at the end of the mission, once the places are checked.',
    gainsSur: 'What you get', gainsTitre: 'For every mission',
    gainsTexte: '',
    g1t: () => 'The trip', g1s: 'paid', g1p: 'Round-trip flight and lodging during the mission.',
    g2t: (n, d) => `$${n.replace(' ', ',')} ${d}`, g2s: 'per mission', g2p: () => 'Paid at the end of the mission, once the places are checked.',
    g3t: (n) => `${n}`, g3s: 'places per city', g3p: 'Food, stays, activities, bars and routes: what our clients want to know.',
    chercheSur: 'What we look for', chercheTitre: 'The places you would recommend to a friend',
    chercheTexte: 'Not tourist traps. The spots locals know, with a real photo and a few honest words.',
    cats: [['restos', 'Restaurants and street food', 'From tiny counters to fine dining.'], ['hebergement', 'Places to stay', 'Hotels, hostels, guesthouses.'], ['experiences', 'Activities', 'What is truly worth the trip.'], ['nuit', 'Bars and nightlife', 'Where locals go at night.'], ['trajets', 'Getting around', 'How to get from one place to another, and what it costs.']],
    qualiteSur: 'Our standard', qualiteTitre: 'Every place is checked',
    qualiteTexte: 'Our clients count on us. Every place is checked before the mission ends.',
    regles: [['camera', 'Photos taken on site', 'Your own photos, taken on the spot. Pictures found online are detected and rejected.'], ['map-pin', 'Real location', 'Your phone\'s GPS confirms you were there.'], ['pencil', 'Your own words', 'A description you wrote yourself. Copy-paste gets rejected.'], ['ban', 'Zero tolerance', 'One fake entry and the mission stops.']],
    inscSur: 'Interested?', inscTitre: 'Tell us where you would like to go',
    inscTexte: 'We will get back to you to pick the destination and dates together.',
    rassure: ['Flights and lodging paid', '$1,000 per mission', 'No commitment'],
    f: { prenom: 'First name', nom: 'Last name', courriel: 'Email', whatsapp: 'WhatsApp', optionnel: 'optional', ville: 'Your city', pays: 'Your country', depuis: 'You have lived there for', depuisOpts: ['Less than a year', '1 to 3 years', 'More than 3 years', 'I was born there'], langues: 'Languages spoken', languesEx: 'E.g. English, Thai', lien: 'Instagram or other profile', motivation: 'Which destinations interest you?', accepte: 'I agree that my places will be checked, and that a fake entry stops the mission.', envoyer: 'Send', deja: 'Already a scout?', ouvrir: 'Open my app' },
    erreurs: { prenom: 'Enter your first name.', courriel: 'Enter a valid email.', ville: 'Enter your city and country.', accepte: 'Tick the box to continue.' },
    envoi: 'Sending…', merciT: 'Thank you! Your request is in.', merciP: 'We will get back to you within a few days.',
    bientotT: 'Sign-ups open very soon.', bientotP: 'Your request could not be sent just yet. Please come back in a few days: thank you for your interest!',
    echecT: 'Oops, that did not go through.', echecP: 'Check your internet connection and try again.', reessayer: 'Try again',
    faqSur: 'Questions', faqTitre: 'Frequently asked questions',
    faq: [
      ['Who can go?', 'Trusted, resourceful people who love discovering places and take good photos.'],
      ['How long is a mission?', 'About one to two weeks per city, depending on the destination.'],
      ['What is paid for?', 'The round-trip flight and lodging during the mission, plus the $1,000 fee at the end.'],
      ['How long does it take to add a place?', 'About two minutes, on the spot: a photo, the category, a few words. Your location is added automatically.'],
            ['Do I need to install an app?', 'No. Your access opens in your phone\'s browser, and you can add it to your home screen.'],
    ],
    lienVoyageurs: 'For travelers', credits: 'Photos: Unsplash',
  },
};

let langue = 'fr';
try { langue = localStorage.getItem('langueSite') || (/^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en'); } catch (_) { /* rien */ }
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brouillon = {};
let etatEnvoi = ''; // '', 'envoi', 'ok', 'bientot', 'echec'

function formulaire() {
  const t = TXT[langue].f;
  const form = document.getElementById('form-insc');
  if (etatEnvoi && etatEnvoi !== 'echec') {
    const T = TXT[langue];
    const [titre, texte] = etatEnvoi === 'envoi' ? [T.envoi, ''] : etatEnvoi === 'ok' ? [T.merciT, T.merciP] : [T.bientotT, T.bientotP];
    form.innerHTML = `<div class="merci-insc"><span class="merci-ico">${icone(etatEnvoi === 'bientot' ? 'clock' : 'check', { taille: 28, epaisseur: 2.4 })}</span><h3>${esc(titre)}</h3>${texte ? `<p>${esc(texte)}</p>` : ''}</div>`;
    return;
  }
  const champ = (nom, label, { type = 'text', requis = false, opt = false, plein = false, ex = '', auto = '' } = {}) => `
    <label class="champ-s ${plein ? 'plein' : ''}"><span>${esc(label)}${opt ? ` <small>${esc(t.optionnel)}</small>` : ''}</span>
      <input name="${nom}" type="${type}" ${requis ? 'required' : ''} ${auto ? `autocomplete="${auto}"` : ''} placeholder="${esc(ex)}" value="${esc(brouillon[nom] || '')}"></label>`;
  form.innerHTML = `
    <h3>${esc(TXT[langue].inscTitre)}</h3>
    ${etatEnvoi === 'echec' ? `<p class="erreur-envoi">${esc(TXT[langue].echecT)} ${esc(TXT[langue].echecP)}</p>` : ''}
    <div class="grille-form">
      ${champ('prenom', t.prenom, { requis: true, auto: 'given-name' })}
      ${champ('nom', t.nom, { auto: 'family-name' })}
      ${champ('courriel', t.courriel, { type: 'email', requis: true, plein: true, auto: 'email' })}
      ${champ('whatsapp', t.whatsapp, { type: 'tel', opt: true, auto: 'tel' })}
      ${champ('langues', t.langues, { ex: t.languesEx })}
      ${champ('ville', t.ville, { requis: true, auto: 'address-level2' })}
      ${champ('pays', t.pays, { requis: true, auto: 'country-name' })}
      <label class="champ-s plein"><span>${esc(t.depuis)}</span><select name="depuis">${t.depuisOpts.map((o, i) => `<option value="${i}" ${String(brouillon.depuis ?? 2) === String(i) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
      ${champ('lien', t.lien, { opt: true, plein: true, ex: '@...' })}
      <label class="champ-s plein"><span>${esc(t.motivation)} <small>${esc(t.optionnel)}</small></span><textarea name="motivation" rows="3">${esc(brouillon.motivation || '')}</textarea></label>
      <label class="case-s plein"><input type="checkbox" name="accepte" ${brouillon.accepte ? 'checked' : ''}><span>${esc(t.accepte)}</span></label>
    </div>
    <p class="erreur-champ" id="erreur" hidden></p>
    <button class="bouton grand plein">${esc(t.envoyer)}${icone('arrow-right', { taille: 18 })}</button>
    <p class="deja">${esc(t.deja)} <a href="../contribuer.html">${esc(t.ouvrir)}</a></p>`;
  form.oninput = () => { const v = Object.fromEntries(new FormData(form)); Object.assign(brouillon, v, { accepte: !!v.accepte }); };
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const E = TXT[langue].erreurs;
    const err = !v.prenom.trim() ? E.prenom : !/^\S+@\S+\.\S+$/.test(v.courriel.trim()) ? E.courriel : !v.ville.trim() || !v.pays.trim() ? E.ville : !v.accepte ? E.accepte : '';
    const boite = form.querySelector('#erreur');
    if (err) { boite.textContent = err; boite.hidden = false; return; }
    const pour = (CONTACT.courriel || '').trim();
    if (!pour) { etatEnvoi = 'bientot'; formulaire(); return; }
    etatEnvoi = 'envoi'; formulaire();
    try {
      const rep = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(pour)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouvel éclaireur : ${v.prenom.trim()} (${v.ville.trim()}, ${v.pays.trim()})`,
          _template: 'box', _captcha: 'false',
          Prénom: v.prenom.trim(), Nom: v.nom.trim() || '—', email: v.courriel.trim(), WhatsApp: v.whatsapp.trim() || '—',
          Ville: v.ville.trim(), Pays: v.pays.trim(), 'Y habite depuis': TXT.fr.f.depuisOpts[+v.depuis] || '—',
          Langues: v.langues.trim() || '—', Profil: v.lien.trim() || '—', 'Endroit préféré': v.motivation.trim() || '—',
          'Langue du site': langue, 'Fuseau horaire': Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
        }),
      });
      const r = await rep.json().catch(() => ({}));
      etatEnvoi = rep.ok && String(r.success) !== 'false' ? 'ok' : 'echec';
    } catch (_) { etatEnvoi = 'echec'; }
    formulaire();
  };
}

function afficher() {
  const t = TXT[langue];
  document.documentElement.lang = langue;
  document.title = `${t.surtitre} · ${MARQUE}`;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  document.querySelectorAll('[data-marque]').forEach((el) => { el.textContent = MARQUE; });
  document.querySelectorAll('[data-langue]').forEach((b) => b.classList.toggle('choisi', b.dataset.langue === langue));
  document.getElementById('chiffres').innerHTML = t.chiffres.map(([n, txt]) => `<div><b>${esc(n)}</b><span>${esc(txt)}</span></div>`).join('');
  const g = GAINS;
  document.getElementById('gains-liste').innerHTML = [
    ['plane', t.g1t(), t.g1s, t.g1p, false],
    ['banknote', t.g2t(g.cachet, g.devise).trim(), t.g2s, t.g2p(), true],
    ['map-pin', t.g3t(ENDROITS_PAR_VILLE), t.g3s, t.g3p, false],
  ].map(([ico, titre, sous, p, hi]) => `<div class="gain ${hi ? 'hi' : ''}"><span class="gain-ico">${icone(ico, { taille: 22 })}</span><b>${esc(titre)}</b><small>${esc(sous)}</small><p>${esc(p)}</p></div>`).join('');
  document.getElementById('categories').innerHTML = t.cats.map(([k, titre, p]) => `<li><span class="cat-ico">${iconeCat(k, { taille: 22 })}</span><div><b>${esc(titre)}</b><p>${esc(p)}</p></div></li>`).join('');
  document.getElementById('regles-qualite').innerHTML = t.regles.map(([ico, titre, p]) => `<li><span>${icone(ico, { taille: 20 })}</span><div><b>${esc(titre)}</b><p>${esc(p)}</p></div></li>`).join('');
  document.getElementById('rassure-insc').innerHTML = t.rassure.map((x) => `<li>${icone('check', { taille: 18, epaisseur: 2.6 })}<span>${esc(x)}</span></li>`).join('');
  document.getElementById('faq-liste').innerHTML = t.faq.map(([q, r]) => `<details><summary>${esc(q)}${icone('chevron-down', { taille: 18 })}</summary><p>${esc(r)}</p></details>`).join('');
  formulaire();
}

document.querySelectorAll('[data-ico]').forEach((el) => {
  const grand = el.closest('.etapes');
  el.innerHTML = icone(el.dataset.ico, { taille: grand ? 22 : el.classList.contains('marque-ico') ? 17 : 18, epaisseur: el.classList.contains('marque-ico') ? 2.2 : 2 });
});
document.querySelectorAll('[data-langue]').forEach((b) => {
  b.onclick = () => { langue = b.dataset.langue; try { localStorage.setItem('langueSite', langue); } catch (_) { /* rien */ } afficher(); };
});
afficher();

// Couverture : une photo de voyage, avec un zoom lent.
const fond = document.getElementById('fond-couverture');
if (fond) {
  const img = new Image();
  img.src = photo(PHOTOS_FOND[1], 2000);
  img.onload = () => { const c = document.createElement('div'); c.className = 'fond-img'; c.style.backgroundImage = `url("${img.src}")`; fond.append(c); requestAnimationFrame(() => c.classList.add('visible')); };
}
