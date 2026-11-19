// « À venir » et « Réglages d'envoi » d'un voyage sur mesure.
// Le même bloc sert dans l'appli (cellulaire, onglet Clients) et dans le Studio (ordinateur).
// Raph voit ce qui part au client, et quand. Il peut changer l'ordre, remplacer ou retirer un endroit
// jusqu'à la dernière minute. Tout se recalcule tout seul selon les réglages du client.

import { icone, iconeCat } from './icones.js';
import { TAXONOMIE } from './taxonomie.js';
import {
  GROUPES_CHOIX, NOMS_JOURS, QUOTAS_DEFAUT, TOUS_LES_JOURS, HEURE_PAR_DEFAUT,
  reglagesEnvoi, groupePour, estEnvoye, dateLongue, jourLocal,
} from './carnet-commun.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORDRE = Object.keys(GROUPES_CHOIX);
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0]; // la semaine commence le lundi
const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;
const COURTS = { dormir: ['hôtel', 'hôtels'], manger: ['resto', 'restos'], faire: ['activité', 'activités'], sortir: ['bar', 'bars'] };

export const HEURES = [7, 8, 9, 12, 17, 18, 19, 20, 21, 22];
export const FUSEAUX = [
  ['America/Toronto', 'Montréal, Toronto, New York'],
  ['America/Vancouver', 'Vancouver, Los Angeles'],
  ['Europe/Paris', 'Paris, Bruxelles, Genève'],
  ['Europe/London', 'Londres'],
  ['America/Mexico_City', 'Mexico'],
  ['Asia/Tokyo', 'Tokyo, Séoul'],
  ['Asia/Bangkok', 'Bangkok, Hanoï'],
  ['Asia/Singapore', 'Singapour, Manille, Bali'],
  ['Asia/Kathmandu', 'Katmandou'],
  ['Australia/Sydney', 'Sydney'],
];

// « 3 hôtels · 3 restos · 3 activités, tous les jours à 19 h »
export function resumeReglages(c) {
  const r = reglagesEnvoi(c);
  const quoi = ORDRE.filter((g) => r.quotas[g] > 0).map((g) => `${r.quotas[g]} ${COURTS[g][r.quotas[g] > 1 ? 1 : 0]}`).join(' · ') || 'rien';
  const quand = r.jours.length === 7 ? 'tous les jours' : ORDRE_JOURS.filter((j) => r.jours.includes(j)).map((j) => NOMS_JOURS[j].toLowerCase()).join(', ');
  return `${quoi}, ${quand} à ${r.heure} h`;
}

// Quand part un envoi, dit simplement (« Ce soir, 19 h · dans 2 h 10 »).
function quandEnvoi(iso, fuseau) {
  const maintenant = new Date();
  const jour = jourLocal(iso, fuseau);
  const h = new Date(iso).toLocaleTimeString('fr-CA', { timeZone: fuseau, hour: 'numeric', minute: '2-digit' }).replace(' h 00', ' h');
  let titre;
  if (jour === jourLocal(maintenant, fuseau)) titre = `Ce soir, ${h}`;
  else if (jour === jourLocal(new Date(maintenant.getTime() + 864e5), fuseau)) titre = `Demain, ${h}`;
  else titre = `${dateLongue(iso, fuseau).replace(/^./, (x) => x.toUpperCase())}, ${h}`;
  const min = Math.ceil((new Date(iso) - maintenant) / 60000);
  const dans = min < 60 ? `dans ${min} min` : min < 24 * 60 ? `dans ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : '';
  return { titre, dans };
}

// ---------- Réglages d'envoi ----------
export function blocReglages(c) {
  const r = reglagesEnvoi(c);
  return `
    <div class="av-reglages">
      <p class="av-etiquette">Choix par envoi</p>
      ${ORDRE.map((g) => `
        <div class="av-quota">
          <span class="av-quota-nom">${icone(GROUPES_CHOIX[g].ico, { taille: 17 })}<span><b>${GROUPES_CHOIX[g].titre}</b><small>${g === 'sortir' ? 'bars (sinon avec les activités)' : g === 'faire' ? 'visites, expériences' + (r.quotas.sortir > 0 ? '' : ', bars') : COURTS[g][1]}</small></span></span>
          <span class="av-pas">
            <button type="button" data-quota="${g}" data-pas="-1" aria-label="Moins" ${r.quotas[g] <= 0 ? 'disabled' : ''}>${icone('minus', { taille: 16 })}</button>
            <b>${r.quotas[g]}</b>
            <button type="button" data-quota="${g}" data-pas="1" aria-label="Plus" ${r.quotas[g] >= 9 ? 'disabled' : ''}>${icone('plus', { taille: 16 })}</button>
          </span>
        </div>`).join('')}
      <p class="av-etiquette">Quels jours</p>
      <div class="av-jours">${ORDRE_JOURS.map((j) => `<button type="button" class="${r.jours.includes(j) ? 'on' : ''}" data-jour="${j}" aria-pressed="${r.jours.includes(j)}">${NOMS_JOURS[j]}</button>`).join('')}</div>
      <div class="av-deux">
        <label class="av-champ"><span>Heure d'envoi</span><select data-reglage="heure">${HEURES.map((h) => `<option value="${h}" ${h === r.heure ? 'selected' : ''}>${h} h${h === HEURE_PAR_DEFAUT ? ' (conseillé)' : ''}</option>`).join('')}</select></label>
        <label class="av-champ"><span>Heure de chez lui</span><select data-reglage="fuseau">${FUSEAUX.map(([f, nom]) => `<option value="${f}" ${f === r.fuseau ? 'selected' : ''}>${esc(nom)}</option>`).join('')}</select></label>
      </div>
    </div>`;
}

export function brancherReglages(zone, c, { sauver, recharger }) {
  const envoi = () => { c.envoi = { quotas: { ...QUOTAS_DEFAUT, ...(c.envoi?.quotas || {}) }, jours: [...(c.envoi?.jours?.length ? c.envoi.jours : TOUS_LES_JOURS)] }; return c.envoi; };
  zone.querySelectorAll('[data-quota]').forEach((b) => {
    b.onclick = async () => {
      const e = envoi();
      e.quotas[b.dataset.quota] = Math.max(0, Math.min(9, (e.quotas[b.dataset.quota] || 0) + +b.dataset.pas));
      await sauver(); recharger();
    };
  });
  zone.querySelectorAll('[data-jour]').forEach((b) => {
    b.onclick = async () => {
      const e = envoi();
      const j = +b.dataset.jour;
      e.jours = e.jours.includes(j) ? e.jours.filter((x) => x !== j) : [...e.jours, j];
      if (!e.jours.length) e.jours = [j]; // au moins un jour
      await sauver(); recharger();
    };
  });
  zone.querySelectorAll('[data-reglage]').forEach((s) => {
    s.onchange = async () => {
      if (s.dataset.reglage === 'heure') c.heure = +s.value; else c.fuseau = s.value;
      await sauver(); recharger();
    };
  });
}

// ---------- À venir ----------
// endroits : Map id → endroit. Retourne le HTML du bloc.
export function blocAVenir(c, endroits, { montrer = 4, prenom = 'ton client' } = {}) {
  const r = reglagesEnvoi(c);
  const groupe = (i) => groupePour(endroits.get(i.endroitId)?.categorie, r.quotas);
  const attente = c.items.filter((i) => endroits.has(i.endroitId) && !estEnvoye(i));
  const envois = [...new Set(attente.filter((i) => i.livraison).map((i) => i.livraison))].sort();
  const reserve = attente.filter((i) => !i.livraison);
  const ligne = (i, envoi) => {
    const e = endroits.get(i.endroitId);
    const memes = attente.filter((x) => x.livraison && groupe(x) === groupe(i));
    const k = memes.indexOf(i);
    return `
      <li class="av-item" data-item="${esc(i.id)}">
        <span class="av-vignette">${e.photos?.length ? `<img data-photo="${esc(e.photos[0])}" alt="">` : iconeCat(e.categorie, { taille: 20 })}</span>
        <span class="av-txt">
          <b>${esc(e.nom)}</b>
          <small>${esc(e.sousType || e.type || TAXONOMIE[e.categorie]?.nom || '')}${e.photos?.length ? ` · ${pluriel(e.photos.length, 'photo')}` : ' · sans photo'}</small>
          <button type="button" class="av-mot" data-mot="${esc(i.id)}">${i.mot ? `« ${esc(i.mot)} »` : `+ Petit conseil pour ${esc(prenom)}`}</button>
        </span>
        <span class="av-actions">
          ${envoi ? `<button type="button" data-monter="${esc(i.id)}" aria-label="Plus tôt" title="Plus tôt" ${k <= 0 ? 'disabled' : ''}>${icone('arrow-up', { taille: 15 })}</button>
          <button type="button" data-descendre="${esc(i.id)}" aria-label="Plus tard" title="Plus tard" ${k < 0 || k >= memes.length - 1 ? 'disabled' : ''}>${icone('arrow-down', { taille: 15 })}</button>
          <button type="button" data-remplacer="${esc(i.id)}" aria-label="Remplacer" title="Remplacer par un autre">${icone('refresh-cw', { taille: 15 })}</button>` : ''}
          <button type="button" data-retirer="${esc(i.id)}" aria-label="Retirer" title="Retirer">${icone('x', { taille: 15 })}</button>
        </span>
      </li>`;
  };
  const carteEnvoi = (iso, n) => {
    const items = attente.filter((i) => i.livraison === iso);
    const q = quandEnvoi(iso, r.fuseau);
    const gs = [...ORDRE, 'savoir'].filter((g) => items.some((i) => groupe(i) === g));
    return `
      <article class="av-envoi ${n === 0 ? 'prochain' : ''}">
        <header class="av-envoi-tete">
          <span><b>${esc(q.titre)}</b>${q.dans ? `<small>${esc(q.dans)}</small>` : ''}</span>
          ${n === 0 ? `<button type="button" class="av-maintenant" data-envoyer="${esc(iso)}">${icone('send', { taille: 14 })} Envoyer maintenant</button>` : ''}
        </header>
        ${gs.map((g) => {
          const liste = items.filter((i) => groupe(i) === g);
          const titre = g === 'savoir' ? 'Bon à savoir' : GROUPES_CHOIX[g].titre;
          return `
            <p class="av-groupe">${icone(g === 'savoir' ? 'info' : GROUPES_CHOIX[g].ico, { taille: 14 })} ${titre}${g === 'savoir' ? '' : ` <em class="${liste.length >= r.quotas[g] ? 'plein' : ''}">${liste.length}/${r.quotas[g]}</em>`}</p>
            <ul class="av-liste">${liste.map((i) => ligne(i, iso)).join('')}</ul>`;
        }).join('')}
      </article>`;
  };
  const autres = envois.slice(montrer);
  return `
    <div class="av">
      <p class="av-resume">${icone('settings', { taille: 14 })} ${esc(resumeReglages(c))}</p>
      ${envois.length ? envois.slice(0, montrer).map(carteEnvoi).join('') : `
        <p class="av-vide">${icone('inbox', { taille: 22 })}<span><b>Rien en attente</b></span></p>`}
      ${autres.length ? `<p class="av-suite">Ensuite : ${pluriel(attente.filter((i) => autres.includes(i.livraison)).length, 'endroit')} sur ${pluriel(autres.length, 'autre envoi', 'autres envois')}, jusqu'au ${esc(dateLongue(autres[autres.length - 1], r.fuseau))}.</p>` : ''}
      ${reserve.length ? `
        <article class="av-envoi reserve">
          <header class="av-envoi-tete"><span><b>De côté</b><small>pas envoyé</small></span></header>
          <ul class="av-liste">${reserve.map((i) => ligne(i, null)).join('')}</ul>
        </article>` : ''}
    </div>`;
}

// Les gestes dans « À venir ». choisirEndroit(options) → Promise<id> ; editerMot(item) → Promise<texte|null>.
export function brancherAVenir(zone, c, endroits, { sauver, recharger, choisirEndroit, editerMot, ajouterItem, toast = () => {} }) {
  const r = reglagesEnvoi(c);
  const groupe = (i) => groupePour(endroits.get(i.endroitId)?.categorie, r.quotas);
  const item = (id) => c.items.find((i) => i.id === id);
  const echanger = (a, b) => {
    const ia = c.items.indexOf(a);
    const ib = c.items.indexOf(b);
    [c.items[ia], c.items[ib]] = [c.items[ib], c.items[ia]];
  };
  const memes = (i) => c.items.filter((x) => endroits.has(x.endroitId) && !estEnvoye(x) && x.livraison && groupe(x) === groupe(i));
  const fini = async (message) => { await sauver(); if (message) toast(message); recharger(); };

  zone.querySelectorAll('[data-monter]').forEach((b) => { b.onclick = () => { const i = item(b.dataset.monter); const m = memes(i); const k = m.indexOf(i); if (k > 0) { echanger(i, m[k - 1]); fini(); } }; });
  zone.querySelectorAll('[data-descendre]').forEach((b) => { b.onclick = () => { const i = item(b.dataset.descendre); const m = memes(i); const k = m.indexOf(i); if (k >= 0 && k < m.length - 1) { echanger(i, m[k + 1]); fini(); } }; });
  zone.querySelectorAll('[data-retirer]').forEach((b) => { b.onclick = () => { c.items = c.items.filter((x) => x.id !== b.dataset.retirer); fini('Retiré'); }; });
  zone.querySelectorAll('[data-mot]').forEach((b) => {
    b.onclick = async () => {
      const i = item(b.dataset.mot);
      const texte = await editerMot(i);
      if (texte === null || texte === undefined) return;
      i.mot = texte.trim();
      fini();
    };
  });
  zone.querySelectorAll('[data-envoyer]').forEach((b) => {
    b.onclick = () => {
      const t = new Date().toISOString();
      for (const i of c.items) if (i.livraison === b.dataset.envoyer) i.livraison = t;
      fini('Envoyé : il le voit déjà');
    };
  });
  zone.querySelectorAll('[data-remplacer]').forEach((b) => {
    b.onclick = async () => {
      const i = item(b.dataset.remplacer);
      const g = groupe(i);
      const ville = endroits.get(i.endroitId)?.ville || c.ville || '';
      // Les autres de la file (même catégorie, envoyés plus tard), puis ses endroits pas encore dans le voyage.
      const enFile = c.items.filter((x) => x !== i && !estEnvoye(x) && x.livraison && x.livraison > i.livraison && groupe(x) === g);
      const dans = new Set(c.items.map((x) => x.endroitId));
      const libres = [...endroits.values()]
        .filter((e) => !dans.has(e.id) && !e.contributeurId && !e.essai && groupePour(e.categorie, r.quotas) === g)
        .sort((a, b) => (b.ville === ville) - (a.ville === ville) || (b.creeLe || '').localeCompare(a.creeLe || ''));
      const options = [
        ...enFile.map((x) => ({ id: `item:${x.id}`, nom: endroits.get(x.endroitId).nom, detail: `déjà prévu : ${quandEnvoi(x.livraison, r.fuseau).titre}` })),
        ...libres.map((e) => ({ id: `endroit:${e.id}`, nom: e.nom, detail: [e.sousType || e.type, e.ville].filter(Boolean).join(', ') })),
      ];
      if (!options.length) { toast('Aucun autre endroit de ce genre pour l\'instant'); return; }
      const choix = await choisirEndroit({ titre: `Remplacer ${endroits.get(i.endroitId).nom}`, options });
      if (!choix) return;
      if (choix.startsWith('item:')) { echanger(i, item(choix.slice(5))); fini('Remplacé. L\'autre part plus tard.'); return; }
      // Un nouvel endroit prend sa place ; l'ancien retourne à la fin de la file (rien n'est perdu).
      const nouveau = ajouterItem(c, choix.slice(8));
      c.items = c.items.filter((x) => x !== nouveau);
      c.items.splice(c.items.indexOf(i), 0, nouveau);
      c.items = c.items.filter((x) => x !== i).concat(i);
      fini('Remplacé. L\'autre part plus tard.');
    };
  });
}

// Les endroits de Raph pas encore dans ce voyage, pour la même ville.
export function endroitsAAjouter(c, endroits) {
  const dans = new Set(c.items.map((i) => i.endroitId));
  const ville = (c.ville || '').trim().toLowerCase();
  return [...endroits.values()].filter((e) => !dans.has(e.id) && !e.contributeurId && !e.essai && (!ville || (e.ville || '').trim().toLowerCase() === ville))
    .sort((a, b) => (a.creeLe || '').localeCompare(b.creeLe || ''));
}
