// Fiche de demande que Raph envoie à ses clients.
// Le client choisit ses pays, ses dates (comme pour un billet d'avion) et ses envies.
// À la fin, ses réponses deviennent un lien : en cliquant dessus, Raph crée le voyage dans le Studio.

import { paysDuContinent } from './monde.js';
import { icone } from './icones.js';
import { ENVIES, encoder, nuits } from './code-demande.js';

const fiche = document.getElementById('fiche');
const params = new URLSearchParams(location.search);
const POUR = params.get('pour') || ''; // courriel de Raph, ajouté au lien par le Studio
const POPULAIRES = ['Japon', 'Thaïlande', 'Vietnam', 'Corée du Sud', 'Indonésie', 'Philippines', 'Cambodge', 'Malaisie', 'Laos', 'Népal', 'Sri Lanka', 'Inde'];
const TOUS_PAYS = paysDuContinent('');
const ETAPES = ['Pays', 'Dates', 'Envies', 'Toi'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const date = (s) => new Date(`${s}T12:00:00`);
const ajouterJours = (s, n) => { const d = date(s); d.setDate(d.getDate() + n); return iso(d); };
const jolie = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? date(s).toLocaleDateString('fr-CA', opts) : '');
const COULEURS = ['#f0532f', '#2f80ed', '#16a34a', '#a855f7', '#e8a20c', '#0ea5a4', '#db2777', '#64748b'];

function duree(n) {
  if (!n) return '';
  const s = Math.floor(n / 7);
  const j = n % 7;
  const nuitsTxt = `${n} nuit${n > 1 ? 's' : ''}`;
  if (!s) return nuitsTxt;
  return `${nuitsTxt} · ${s} semaine${s > 1 ? 's' : ''}${j ? ` et ${j} jour${j > 1 ? 's' : ''}` : ''}`;
}

function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.classList.add('visible');
  clearTimeout(toast.m); toast.m = setTimeout(() => t.classList.remove('visible'), 2600);
}

// ---------- Réponses (gardées dans le navigateur au cas où la page se ferme) ----------
const vide = () => ({ f: 'demande', v: 1, pays: [], envies: {}, voyageurs: 2, style: 'moyen', nom: '', courriel: '', telephone: '', message: '' });
let d = vide();
try { const b = JSON.parse(localStorage.getItem('brouillonDemande') || 'null'); if (b?.f === 'demande') d = { ...vide(), ...b }; } catch (_) { /* rien */ }
const garder = () => { try { localStorage.setItem('brouillonDemande', JSON.stringify(d)); } catch (_) { /* rien */ } };
let etape = 0;
let paysActif = 0;
let moisAffiche = null;

// ---------- Rendu général ----------
function rendre() {
  fiche.innerHTML = `
    <header class="haut">
      <p class="sur">Voyage sur mesure</p>
      <h1>${['Où veux-tu aller ?', 'Quand pars-tu ?', "Qu'est-ce qui te fait envie ?", 'Comment te joindre ?'][etape]}</h1>
      <ol class="progres">${ETAPES.map((e, i) => `<li class="${i < etape ? 'fait' : i === etape ? 'ici' : ''}"><span>${i < etape ? icone('check', { taille: 13, epaisseur: 3 }) : i + 1}</span>${e}</li>`).join('')}</ol>
    </header>
    <section class="corps" id="corps"></section>
    <footer class="bas">
      ${etape ? `<button class="bouton secondaire" id="retour">${icone('chevron-left', { taille: 18 })} Retour</button>` : '<span></span>'}
      <button class="bouton" id="suivant">${etape === 3 ? `Envoyer ma demande ${icone('arrow-right', { taille: 18 })}` : `Continuer ${icone('arrow-right', { taille: 18 })}`}</button>
    </footer>`;
  [etapePays, etapeDates, etapeEnvies, etapeToi][etape](fiche.querySelector('#corps'));
  fiche.querySelector('#suivant').onclick = suivant;
  const r = fiche.querySelector('#retour');
  if (r) r.onclick = () => { etape--; rendre(); window.scrollTo(0, 0); };
}

function suivant() {
  if (etape === 0 && !d.pays.length) return toast('Choisis au moins un pays');
  if (etape === 1) {
    const sans = d.pays.find((p) => !p.debut || !p.fin);
    if (sans) { paysActif = d.pays.indexOf(sans); rendre(); return toast(`Choisis tes dates pour : ${sans.nom}`); }
  }
  if (etape === 3) return envoyer();
  etape++;
  if (etape === 1) { paysActif = Math.max(0, d.pays.findIndex((p) => !p.fin)); moisAffiche = null; }
  garder();
  rendre();
  window.scrollTo(0, 0);
}

// ---------- 1. Pays ----------
function etapePays(zone) {
  let recherche = '';
  const dessiner = () => {
    const choisis = d.pays.map((p) => p.nom);
    const q = sansAccents(recherche);
    const resultats = q ? TOUS_PAYS.filter((p) => sansAccents(p).includes(q)).slice(0, 12) : POPULAIRES;
    zone.innerHTML = `
      <p class="intro">Choisis un ou plusieurs pays, dans l'ordre où tu veux les visiter.</p>
      <label class="recherche">${icone('search', { taille: 18 })}<input id="cherche" type="search" placeholder="Chercher un pays" value="${esc(recherche)}" autocomplete="off"></label>
      <p class="petit-titre">${q ? 'Résultats' : 'Populaires'}</p>
      <div class="puces">${resultats.map((p) => `<button class="puce ${choisis.includes(p) ? 'choisie' : ''}" data-pays="${esc(p)}">${choisis.includes(p) ? icone('check', { taille: 15, epaisseur: 2.6 }) : icone('plus', { taille: 15 })}${esc(p)}</button>`).join('') || '<p class="doux">Aucun pays trouvé.</p>'}</div>
      ${d.pays.length ? `
        <p class="petit-titre">Ton trajet</p>
        <ol class="trajet">${d.pays.map((p, i) => `
          <li style="--c:${COULEURS[i % COULEURS.length]}">
            <span class="num">${i + 1}</span><b>${esc(p.nom)}</b>
            <span class="actions">
              <button data-monter="${i}" ${i ? '' : 'disabled'} aria-label="Plus tôt">${icone('arrow-up', { taille: 16 })}</button>
              <button data-descendre="${i}" ${i < d.pays.length - 1 ? '' : 'disabled'} aria-label="Plus tard">${icone('arrow-down', { taille: 16 })}</button>
              <button data-retirer="${i}" aria-label="Retirer">${icone('x', { taille: 16 })}</button>
            </span>
          </li>`).join('')}</ol>` : ''}`;
    const champ = zone.querySelector('#cherche');
    champ.oninput = () => { recherche = champ.value; dessiner(); const c = zone.querySelector('#cherche'); c.focus(); c.setSelectionRange(c.value.length, c.value.length); };
    zone.onclick = (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.pays) {
        const n = b.dataset.pays;
        const i = d.pays.findIndex((p) => p.nom === n);
        if (i >= 0) d.pays.splice(i, 1); else d.pays.push({ nom: n, debut: '', fin: '', incontournable: '' });
        recherche = '';
      } else if (b.dataset.monter) { const i = +b.dataset.monter; [d.pays[i - 1], d.pays[i]] = [d.pays[i], d.pays[i - 1]]; }
      else if (b.dataset.descendre) { const i = +b.dataset.descendre; [d.pays[i + 1], d.pays[i]] = [d.pays[i], d.pays[i + 1]]; }
      else if (b.dataset.retirer) d.pays.splice(+b.dataset.retirer, 1);
      else return;
      garder();
      dessiner();
    };
  };
  dessiner();
}

// ---------- 2. Dates : calendrier comme pour un billet d'avion ----------
function etapeDates(zone) {
  const aujourdhui = iso(new Date());
  const p = d.pays[paysActif];
  if (!moisAffiche) {
    const ref = p.debut || d.pays[paysActif - 1]?.fin || ajouterJours(aujourdhui, 30);
    moisAffiche = ref.slice(0, 7);
  }
  const couleurDe = (jour) => {
    for (let i = 0; i < d.pays.length; i++) {
      const x = d.pays[i];
      if (x.debut && jour >= x.debut && jour <= (x.fin || x.debut)) return i;
    }
    return -1;
  };
  const mois = (cle) => {
    const [a, m] = cle.split('-').map(Number);
    const premier = new Date(a, m - 1, 1);
    const decal = (premier.getDay() + 6) % 7; // lundi en premier
    const nb = new Date(a, m, 0).getDate();
    const cases = [];
    for (let i = 0; i < decal; i++) cases.push('<span></span>');
    for (let j = 1; j <= nb; j++) {
      const s = `${cle}-${String(j).padStart(2, '0')}`;
      const i = couleurDe(s);
      const x = d.pays[i];
      const classes = [s < aujourdhui ? 'passe' : '', i >= 0 ? 'pris' : '', x && s === x.debut ? 'debut' : '', x && s === (x.fin || x.debut) ? 'fin' : '', i === paysActif ? 'actif' : ''].join(' ');
      cases.push(`<button class="jour ${classes}" data-jour="${s}" ${s < aujourdhui ? 'disabled' : ''} style="${i >= 0 ? `--c:${COULEURS[i % COULEURS.length]}` : ''}">${j}</button>`);
    }
    return `
      <div class="mois">
        <p class="mois-nom">${premier.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</p>
        <div class="semaine">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('')}</div>
        <div class="grille-jours">${cases.join('')}</div>
      </div>`;
  };
  const suivantMois = (cle, n) => { const [a, m] = cle.split('-').map(Number); const x = new Date(a, m - 1 + n, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
  const total = d.pays.reduce((n, x) => n + nuits(x.debut, x.fin), 0);
  const debutVoyage = d.pays.map((x) => x.debut).filter(Boolean).sort()[0];
  const finVoyage = d.pays.map((x) => x.fin).filter(Boolean).sort().pop();

  zone.innerHTML = `
    <p class="intro">Pour chaque pays, touche ton jour d'arrivée, puis ton jour de départ.</p>
    <div class="onglets-pays">${d.pays.map((x, i) => `
      <button class="onglet-pays ${i === paysActif ? 'choisi' : ''}" data-pays-actif="${i}" style="--c:${COULEURS[i % COULEURS.length]}">
        <i></i><span><b>${esc(x.nom)}</b><small>${x.debut && x.fin ? `${jolie(x.debut, { day: 'numeric', month: 'short' })} → ${jolie(x.fin, { day: 'numeric', month: 'short' })}` : x.debut ? 'Choisis le départ' : 'À choisir'}</small></span>
      </button>`).join('')}</div>
    <div class="choix-dates" style="--c:${COULEURS[paysActif % COULEURS.length]}">
      <div class="case-date ${!p.debut || p.fin ? 'attend' : ''}"><small>Arrivée · ${esc(p.nom)}</small><b>${p.debut ? jolie(p.debut) : 'Choisis un jour'}</b></div>
      ${icone('arrow-right', { taille: 18 })}
      <div class="case-date ${p.debut && !p.fin ? 'attend' : ''}"><small>Départ</small><b>${p.fin ? jolie(p.fin) : '—'}</b></div>
      <div class="case-duree">${p.debut && p.fin ? duree(nuits(p.debut, p.fin)) : ''}</div>
    </div>
    <div class="calendrier">
      <button class="nav-mois" data-mois="-1" aria-label="Mois précédent">${icone('chevron-left', { taille: 20 })}</button>
      <div class="deux-mois">${mois(moisAffiche)}${mois(suivantMois(moisAffiche, 1))}</div>
      <button class="nav-mois" data-mois="1" aria-label="Mois suivant">${icone('chevron-right', { taille: 20 })}</button>
    </div>
    ${debutVoyage && finVoyage ? `
      <div class="ligne-temps">
        <p class="petit-titre">Ton voyage · ${jolie(debutVoyage, { day: 'numeric', month: 'long' })} au ${jolie(finVoyage, { day: 'numeric', month: 'long' })} · ${duree(nuits(debutVoyage, finVoyage))}</p>
        <div class="barre-temps">${d.pays.filter((x) => x.debut && x.fin).map((x) => {
          const i = d.pays.indexOf(x);
          const largeur = Math.max(4, (nuits(x.debut, x.fin) / Math.max(1, nuits(debutVoyage, finVoyage))) * 100);
          const gauche = (nuits(debutVoyage, x.debut) / Math.max(1, nuits(debutVoyage, finVoyage))) * 100;
          return `<span style="--c:${COULEURS[i % COULEURS.length]};left:${gauche}%;width:${largeur}%"><b>${esc(x.nom)}</b><small>${nuits(x.debut, x.fin)} n.</small></span>`;
        }).join('')}</div>
        <div class="semaines">${Array.from({ length: Math.ceil(nuits(debutVoyage, finVoyage) / 7) + 1 }, (_, k) => `<span style="left:${Math.min(100, (k * 7 / Math.max(1, nuits(debutVoyage, finVoyage))) * 100)}%">${k ? `S${k}` : ''}</span>`).join('')}</div>
      </div>` : ''}
    ${total ? '' : '<p class="doux">Astuce : le départ d\'un pays peut être le même jour que l\'arrivée dans le suivant.</p>'}`;

  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.paysActif) { paysActif = +b.dataset.paysActif; moisAffiche = (d.pays[paysActif].debut || moisAffiche + '-01').slice(0, 7); return etapeDates(zone); }
    if (b.dataset.mois) { moisAffiche = suivantMois(moisAffiche, +b.dataset.mois); return etapeDates(zone); }
    if (b.dataset.jour) {
      const j = b.dataset.jour;
      if (!p.debut || p.fin || j < p.debut) { p.debut = j; p.fin = ''; } else {
        p.fin = j === p.debut ? ajouterJours(j, 1) : j;
        // Le pays suivant commence par défaut le jour du départ.
        const n = d.pays[paysActif + 1];
        if (n && !n.debut) n.debut = p.fin;
        if (n && !n.fin) paysActif++;
      }
      garder();
      etapeDates(zone);
    }
  };
}

// ---------- 3. Envies ----------
function etapeEnvies(zone) {
  const total = d.pays.reduce((n, x) => n + nuits(x.debut, x.fin), 0);
  zone.innerHTML = `
    <p class="intro">Combien de fois veux-tu faire chaque chose pendant ton voyage de ${total} nuit${total > 1 ? 's' : ''} ? Laisse à 0 ce qui ne t'intéresse pas.</p>
    <div class="envies">${ENVIES.map(([k, nom, ico, ex]) => {
      const n = d.envies[k] || 0;
      return `
      <div class="envie ${n ? 'oui' : ''}">
        <span class="envie-ico">${icone(ico, { taille: 22 })}</span>
        <span class="envie-txt"><b>${esc(nom)}</b><small>${esc(ex)}</small></span>
        <span class="compteur">
          <button data-moins="${k}" ${n ? '' : 'disabled'} aria-label="Moins">−</button>
          <b>${n}</b>
          <button data-plus="${k}" aria-label="Plus">+</button>
        </span>
      </div>`;
    }).join('')}</div>
    <p class="petit-titre">Ce que tu veux absolument voir</p>
    ${d.pays.map((x, i) => `<label class="champ"><span>${esc(x.nom)}</span><textarea data-incontournable="${i}" rows="2" placeholder="Ex. : le Mont Fuji, un ryokan avec onsen, un match de sumo…">${esc(x.incontournable)}</textarea></label>`).join('')}
    <div class="deux">
      <div>
        <p class="petit-titre">Voyageurs</p>
        <span class="compteur grand"><button data-voyageurs="-1" ${d.voyageurs > 1 ? '' : 'disabled'}>−</button><b>${d.voyageurs}</b><button data-voyageurs="1">+</button></span>
      </div>
      <div>
        <p class="petit-titre">Style de voyage</p>
        <div class="seg">${[['eco', 'Économique'], ['moyen', 'Confort'], ['luxe', 'Luxe']].map(([k, l]) => `<button class="${d.style === k ? 'choisi' : ''}" data-style="${k}">${l}</button>`).join('')}</div>
      </div>
    </div>`;
  zone.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.plus) d.envies[b.dataset.plus] = Math.min(30, (d.envies[b.dataset.plus] || 0) + 1);
    else if (b.dataset.moins) d.envies[b.dataset.moins] = Math.max(0, (d.envies[b.dataset.moins] || 0) - 1);
    else if (b.dataset.voyageurs) d.voyageurs = Math.max(1, Math.min(30, d.voyageurs + +b.dataset.voyageurs));
    else if (b.dataset.style) d.style = b.dataset.style;
    else return;
    garder();
    etapeEnvies(zone);
  };
  zone.oninput = (ev) => { const i = ev.target.dataset.incontournable; if (i != null) { d.pays[+i].incontournable = ev.target.value; garder(); } };
}

// ---------- 4. Coordonnées et envoi ----------
function etapeToi(zone) {
  zone.innerHTML = `
    <p class="intro">Dernière étape ! Je te reviens avec une proposition d'itinéraire.</p>
    <label class="champ"><span>Ton nom</span><input data-champ="nom" value="${esc(d.nom)}" autocomplete="name" placeholder="Ex. : Julie Tremblay"></label>
    <label class="champ"><span>Ton courriel</span><input data-champ="courriel" type="email" value="${esc(d.courriel)}" autocomplete="email" placeholder="julie@exemple.com"></label>
    <label class="champ"><span>Téléphone ou WhatsApp <small>optionnel</small></span><input data-champ="telephone" type="tel" value="${esc(d.telephone)}" autocomplete="tel"></label>
    <label class="champ"><span>Autre chose à me dire ? <small>optionnel</small></span><textarea data-champ="message" rows="3" placeholder="Allergies, occasion spéciale, budget…">${esc(d.message)}</textarea></label>
    ${resume()}`;
  zone.oninput = (ev) => { const k = ev.target.dataset.champ; if (k) { d[k] = ev.target.value; garder(); } };
}

function resume() {
  const envies = ENVIES.filter(([k]) => d.envies[k]).map(([k, nom]) => `${nom} ×${d.envies[k]}`);
  return `
    <div class="resume">
      <p class="petit-titre">Ton résumé</p>
      <ul>
        ${d.pays.map((x) => `<li><b>${esc(x.nom)}</b> · ${jolie(x.debut, { day: 'numeric', month: 'short' })} → ${jolie(x.fin, { day: 'numeric', month: 'short', year: 'numeric' })} · ${nuits(x.debut, x.fin)} nuits</li>`).join('')}
        <li>${d.voyageurs} voyageur${d.voyageurs > 1 ? 's' : ''} · ${{ eco: 'Économique', moyen: 'Confort', luxe: 'Luxe' }[d.style]}</li>
        ${envies.length ? `<li>${esc(envies.join(' · '))}</li>` : ''}
      </ul>
    </div>`;
}

function texteMessage(lien) {
  const lignes = d.pays.map((x) => `- ${x.nom} : ${jolie(x.debut, { day: 'numeric', month: 'long' })} au ${jolie(x.fin, { day: 'numeric', month: 'long', year: 'numeric' })} (${nuits(x.debut, x.fin)} nuits)`);
  return `Bonjour ! Voici ma demande de voyage sur mesure.\n\n${lignes.join('\n')}\n${d.voyageurs} voyageur(s).\n\nToutes mes réponses (pays, dates, envies) sont dans ce lien :\n${lien}\n\n${d.nom}`;
}

async function envoyer() {
  if (!d.nom.trim()) return toast('Écris ton nom');
  if (!/.+@.+\..+/.test(d.courriel.trim()) && !d.telephone.trim()) return toast('Écris ton courriel (ou ton téléphone)');
  d.envoyeLe = new Date().toISOString();
  garder();
  const code = await encoder(d);
  const lien = `${new URL('studio/', location.href).href}#/demande/${code}`;
  const sujet = `Demande de voyage : ${d.pays.map((x) => x.nom).join(', ')} (${d.nom})`;
  const texte = texteMessage(lien);
  fiche.innerHTML = `
    <section class="merci">
      <span class="merci-ico">${icone('send', { taille: 30 })}</span>
      <h1>Presque fini !</h1>
      <p>Envoie-moi ta demande avec un des boutons ci-dessous. Je te reviens avec une proposition d'itinéraire.</p>
      ${resume()}
      <div class="boutons-envoi">
        ${POUR ? `<a class="bouton" href="mailto:${encodeURIComponent(POUR)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(texte)}">${icone('mail', { taille: 18 })} Envoyer par courriel</a>` : ''}
        ${navigator.share ? `<button class="bouton ${POUR ? 'secondaire' : ''}" id="partager">${icone('send', { taille: 18 })} Envoyer par message (WhatsApp, Messenger…)</button>` : ''}
        <button class="bouton secondaire" id="copier">${icone('copy', { taille: 18 })} Copier ma demande</button>
      </div>
      <button class="lien" id="modifier">Modifier mes réponses</button>
    </section>`;
  const p = fiche.querySelector('#partager');
  if (p) p.onclick = async () => { try { await navigator.share({ title: sujet, text: texte }); toast('Merci ! Demande envoyée'); } catch (_) { /* annulé */ } };
  fiche.querySelector('#copier').onclick = async () => {
    try { await navigator.clipboard.writeText(texte); toast('Copié ! Colle-le dans un courriel ou un message'); } catch (_) { prompt('Copie ce texte :', texte); }
  };
  fiche.querySelector('#modifier').onclick = () => { etape = 0; rendre(); };
  window.scrollTo(0, 0);
}

rendre();
