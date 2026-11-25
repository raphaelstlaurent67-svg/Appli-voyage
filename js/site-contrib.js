// Site web public : la page « Devenir contributeur ».
// Les montants affichés sont dans GAINS ci-dessous : change-les ici s'ils changent dans le Studio (Contributeurs > Règles).
// Inscription : pour l'instant, la demande part au courriel de js/contact.js (FormSubmit, gratuit, sans compte).
// Plus tard, quand le nom de domaine sera acheté, on branchera de vrais comptes (avec mot de passe).

import './clavier.js';
import { icone, iconeCat } from './icones.js';
import { photo, PHOTOS_FOND } from './photos.js';
import { MARQUE } from './marque.js';
import { CONTACT } from './contact.js';

const GAINS = { parEndroit: 1, bonusVille: 75, pourcentage: 1, seuilVoyage: 300, devise: 'CAD' };
const ENDROITS_PAR_VILLE = 150;

const TXT = {
  fr: {
    navComment: 'Comment ça marche', navGains: 'Vos gains', navQualite: 'Qualité', navFaq: 'Questions',
    cta: 'Créer mon compte', ctaCourt: "M'inscrire", voirComment: 'Comment ça marche',
    surtitre: 'Programme des contributeurs',
    titre: 'Faites découvrir votre ville. Soyez payé pour ça.',
    sousTitre: 'Vous connaissez les meilleurs restos, bars, hôtels et activités de chez vous ? Ajoutez-les depuis votre cellulaire et recevez de l\'argent pour chaque endroit accepté.',
    chiffres: [['150', 'endroits par ville à découvrir'], ['5', 'catégories : restos, hébergement, activités, bars, trajets'], ['2 min', 'pour ajouter un endroit'], ['100 %', 'en ligne, depuis votre cellulaire']],
    commentSur: 'Comment ça marche', commentTitre: 'Quatre étapes, aucune paperasse',
    e1t: 'Créez votre compte', e1p: 'Dites-nous où vous habitez. Nous validons chaque profil, puis vous recevez votre accès personnel.',
    e2t: 'Ajoutez vos endroits', e2p: 'Sur place, prenez une photo, choisissez la catégorie, écrivez pourquoi y aller. La position se prend toute seule.',
    e3t: 'Nous vérifions', e3p: 'Chaque endroit est vérifié par notre équipe. Les fiches complètes et honnêtes sont acceptées.',
    e4t: 'Vous êtes payé', e4p: 'Par PayPal, Wise ou virement, pour chaque endroit accepté, plus vos bonus.',
    gainsSur: 'Vos gains', gainsTitre: 'Plus vous contribuez, plus vous gagnez',
    gainsTexte: 'Trois façons de gagner, qui s\'additionnent.',
    g1t: (n, d) => `${n} $ ${d}`, g1s: 'par endroit accepté', g1p: 'Chaque resto, hôtel, bar, activité ou trajet que nous acceptons.',
    g2t: (n, d) => `${n} $ ${d}`, g2s: 'par ville complète', g2p: (n) => `Un bonus quand votre ville atteint ses ${n} endroits, toutes catégories confondues.`,
    g3t: (n) => `${n} %`, g3s: 'des ventes', g3p: 'Quand un voyage vendu utilise vos endroits, vous touchez une part, à vie.',
    g4t: 'Un voyage', g4s: (n) => `à rabais dès ${n} endroits`, g4p: 'Les contributeurs les plus actifs voyagent avec nous à prix réduit.',
    chercheSur: 'Ce que nous cherchons', chercheTitre: 'Les endroits que vous recommanderiez à un ami',
    chercheTexte: 'Pas les attrapes-touristes. Les adresses que les gens du coin connaissent, avec une vraie photo et quelques mots honnêtes.',
    cats: [['restos', 'Restos et cuisine de rue', 'Du petit comptoir au restaurant chic.'], ['hebergement', 'Hébergement', 'Hôtels, auberges, maisons d\'hôtes.'], ['experiences', 'Activités', 'Ce qui vaut vraiment le détour.'], ['nuit', 'Bars et sorties', 'Où les gens du coin vont le soir.'], ['trajets', 'Trajets', 'Comment se rendre d\'un endroit à l\'autre, et combien ça coûte.']],
    qualiteSur: 'Notre exigence', qualiteTitre: 'Chaque endroit est vérifié',
    qualiteTexte: 'Nos voyageurs comptent sur nous. C\'est pourquoi nous vérifions chaque endroit reçu avant de le payer.',
    regles: [['camera', 'Photos prises sur place', 'Des photos à vous, prises sur place. Les images trouvées sur Internet sont détectées et refusées.'], ['map-pin', 'Position réelle', 'La position GPS de votre cellulaire confirme que vous étiez sur place.'], ['pencil', 'Vos propres mots', 'Une description écrite par vous. Le copier-coller est refusé.'], ['ban', 'Tolérance zéro', 'Une fausse fiche, et le compte est fermé, sans paiement.']],
    inscSur: 'Inscription', inscTitre: 'Rejoignez les contributeurs',
    inscTexte: 'C\'est gratuit. Nous validons chaque profil à la main, puis vous recevez votre accès personnel par courriel.',
    rassure: ['Gratuit, sans engagement', 'Vous ajoutez des endroits quand vous voulez', 'Payé pour chaque endroit accepté'],
    f: { prenom: 'Prénom', nom: 'Nom', courriel: 'Courriel', whatsapp: 'WhatsApp', optionnel: 'optionnel', ville: 'Votre ville', pays: 'Votre pays', depuis: 'Vous y habitez depuis', depuisOpts: ['Moins d\'un an', '1 à 3 ans', 'Plus de 3 ans', 'J\'y suis né(e)'], langues: 'Langues parlées', languesEx: 'Ex. : français, anglais', lien: 'Instagram ou autre profil', motivation: 'Quel est votre endroit préféré dans votre ville, et pourquoi ?', accepte: 'J\'accepte que mes endroits soient vérifiés, et qu\'une fausse fiche entraîne la fermeture de mon compte.', envoyer: 'Créer mon compte', deja: 'Déjà contributeur ?', ouvrir: 'Ouvrir mon appli' },
    erreurs: { prenom: 'Écrivez votre prénom.', courriel: 'Écrivez un courriel valide.', ville: 'Écrivez votre ville et votre pays.', accepte: 'Cochez la case pour continuer.' },
    envoi: 'Envoi…', merciT: 'Merci ! Votre demande est reçue.', merciP: 'Nous vérifions chaque profil à la main. Vous recevrez votre accès personnel par courriel d\'ici quelques jours.',
    bientotT: 'Les inscriptions ouvrent très bientôt.', bientotP: 'Votre demande n\'a pas pu être envoyée pour l\'instant. Revenez dans quelques jours : merci de votre intérêt !',
    echecT: 'Oups, l\'envoi n\'a pas fonctionné.', echecP: 'Vérifiez votre connexion internet et réessayez.', reessayer: 'Réessayer',
    faqSur: 'Questions', faqTitre: 'Les questions fréquentes',
    faq: [
      ['Qui peut devenir contributeur ?', 'Toute personne qui habite dans une ville et la connaît bien. Nous cherchons des gens du coin, pas des touristes de passage.'],
      ['Comment suis-je payé ?', 'Par PayPal, Wise ou virement bancaire, selon votre pays. Vous voyez à tout moment ce que vous avez gagné.'],
      ['Combien de temps pour ajouter un endroit ?', 'Environ deux minutes, sur place : une photo, la catégorie, quelques mots. La position se prend toute seule.'],
      ['Pourquoi un endroit peut-il être refusé ?', 'Photo floue ou pas prise sur place, description trop courte, endroit fermé ou déjà dans notre carte. Nous vous expliquons toujours pourquoi.'],
      ['Est-ce que je dois installer une application ?', 'Non. Votre accès s\'ouvre dans le navigateur de votre cellulaire, et vous pouvez l\'ajouter à votre écran d\'accueil.'],
    ],
    lienVoyageurs: 'Pour les voyageurs', credits: 'Photos : Unsplash',
  },
  en: {
    navComment: 'How it works', navGains: 'Earnings', navQualite: 'Quality', navFaq: 'Questions',
    cta: 'Create my account', ctaCourt: 'Sign up', voirComment: 'How it works',
    surtitre: 'Contributor program',
    titre: 'Share your city. Get paid for it.',
    sousTitre: 'Do you know the best restaurants, bars, hotels and activities where you live? Add them from your phone and earn money for every place we accept.',
    chiffres: [['150', 'places to uncover in every city'], ['5', 'categories: food, stays, activities, bars, getting around'], ['2 min', 'to add a place'], ['100 %', 'online, from your phone']],
    commentSur: 'How it works', commentTitre: 'Four steps, no paperwork',
    e1t: 'Create your account', e1p: 'Tell us where you live. We review every profile, then send you your personal access.',
    e2t: 'Add your places', e2p: 'On the spot, take a photo, pick the category, say why it\'s worth it. Your location is added automatically.',
    e3t: 'We check', e3p: 'Our team checks every place. Complete, honest entries get accepted.',
    e4t: 'You get paid', e4p: 'By PayPal, Wise or bank transfer, for every accepted place, plus your bonuses.',
    gainsSur: 'Earnings', gainsTitre: 'The more you share, the more you earn',
    gainsTexte: 'Three ways to earn, and they add up.',
    g1t: (n, d) => `$${n} ${d}`, g1s: 'per accepted place', g1p: 'Every restaurant, hotel, bar, activity or route we accept.',
    g2t: (n, d) => `$${n} ${d}`, g2s: 'per complete city', g2p: (n) => `A bonus when your city reaches its ${n} places, across all categories.`,
    g3t: (n) => `${n} %`, g3s: 'of sales', g3p: 'When a trip we sell uses your places, you get a share, for life.',
    g4t: 'A trip', g4s: (n) => `at a discount from ${n} places`, g4p: 'Our most active contributors travel with us at a reduced price.',
    chercheSur: 'What we look for', chercheTitre: 'The places you would recommend to a friend',
    chercheTexte: 'Not tourist traps. The spots locals know, with a real photo and a few honest words.',
    cats: [['restos', 'Restaurants and street food', 'From tiny counters to fine dining.'], ['hebergement', 'Places to stay', 'Hotels, hostels, guesthouses.'], ['experiences', 'Activities', 'What is truly worth the trip.'], ['nuit', 'Bars and nightlife', 'Where locals go at night.'], ['trajets', 'Getting around', 'How to get from one place to another, and what it costs.']],
    qualiteSur: 'Our standard', qualiteTitre: 'Every place is checked',
    qualiteTexte: 'Our travelers count on us. That is why we check every place before paying for it.',
    regles: [['camera', 'Photos taken on site', 'Your own photos, taken on the spot. Pictures found online are detected and rejected.'], ['map-pin', 'Real location', 'Your phone\'s GPS confirms you were there.'], ['pencil', 'Your own words', 'A description you wrote yourself. Copy-paste gets rejected.'], ['ban', 'Zero tolerance', 'One fake entry and the account is closed, unpaid.']],
    inscSur: 'Sign up', inscTitre: 'Join our contributors',
    inscTexte: 'It\'s free. We review every profile by hand, then email you your personal access.',
    rassure: ['Free, no commitment', 'Add places whenever you want', 'Paid for every accepted place'],
    f: { prenom: 'First name', nom: 'Last name', courriel: 'Email', whatsapp: 'WhatsApp', optionnel: 'optional', ville: 'Your city', pays: 'Your country', depuis: 'You have lived there for', depuisOpts: ['Less than a year', '1 to 3 years', 'More than 3 years', 'I was born there'], langues: 'Languages spoken', languesEx: 'E.g. English, Thai', lien: 'Instagram or other profile', motivation: 'What is your favorite place in your city, and why?', accepte: 'I agree that my places will be checked, and that a fake entry gets my account closed.', envoyer: 'Create my account', deja: 'Already a contributor?', ouvrir: 'Open my app' },
    erreurs: { prenom: 'Enter your first name.', courriel: 'Enter a valid email.', ville: 'Enter your city and country.', accepte: 'Tick the box to continue.' },
    envoi: 'Sending…', merciT: 'Thank you! Your request is in.', merciP: 'We review every profile by hand. You will get your personal access by email within a few days.',
    bientotT: 'Sign-ups open very soon.', bientotP: 'Your request could not be sent just yet. Please come back in a few days: thank you for your interest!',
    echecT: 'Oops, that did not go through.', echecP: 'Check your internet connection and try again.', reessayer: 'Try again',
    faqSur: 'Questions', faqTitre: 'Frequently asked questions',
    faq: [
      ['Who can become a contributor?', 'Anyone who lives in a city and knows it well. We are looking for locals, not people passing through.'],
      ['How do I get paid?', 'By PayPal, Wise or bank transfer, depending on your country. You can see what you have earned at any time.'],
      ['How long does it take to add a place?', 'About two minutes, on the spot: a photo, the category, a few words. Your location is added automatically.'],
      ['Why would a place be rejected?', 'Blurry photo or not taken on site, description too short, place closed or already on our map. We always tell you why.'],
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
          _subject: `Nouveau contributeur : ${v.prenom.trim()} (${v.ville.trim()}, ${v.pays.trim()})`,
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
    ['map-pin', t.g1t(g.parEndroit, g.devise), t.g1s, t.g1p, false],
    ['trophy', t.g2t(g.bonusVille, g.devise), t.g2s, t.g2p(ENDROITS_PAR_VILLE), true],
    ['percent', t.g3t(g.pourcentage), t.g3s, t.g3p, false],
    ['plane', t.g4t, t.g4s(g.seuilVoyage), t.g4p, false],
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
