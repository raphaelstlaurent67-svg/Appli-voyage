// Le courriel du soir des carnets clients. Lancé par GitHub toutes les 30 minutes (gratuit).
// Voir .github/workflows/carnets-soir.yml pour les réglages.
//
// Pour l'essayer sans rien envoyer : ESSAI=1 écrit les courriels dans des fichiers .html.

import fs from 'node:fs/promises';
import {
  RELAIS, livraisonDuJour, motDuSoir, canalChoix, dechiffrerJson, deBase64Url, lienClient, formatHeure, dateLongue,
} from '../../js/carnet-commun.js';

const API = process.env.API_GITHUB || 'https://api.github.com';
const RELAIS_URL = process.env.RELAIS || RELAIS;
const CLE = process.env.DONNEES_CLE;
const DEPOT = process.env.DONNEES_DEPOT || `${process.env.PROPRIO || 'raphaelstlaurent67-svg'}/appli-voyage-donnees`;
const SITE = process.env.SITE || 'https://raphaelstlaurent67-svg.github.io/Appli-voyage/';
const ESSAI = !!process.env.ESSAI;
const RETARD_MAX = 4 * 3600 * 1000; // passé 4 h de retard, on n'envoie plus le courriel de ce soir-là

if (!CLE) {
  console.log('Pas de clé DONNEES_CLE : rien à faire. (Voir les explications dans le fichier du workflow.)');
  process.exit(0);
}

async function api(chemin, { methode = 'GET', corps } = {}) {
  const rep = await fetch(`${API}${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${CLE}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'carnets-soir' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  let donnees = null;
  try { donnees = await rep.json(); } catch (_) { /* vide */ }
  return { ok: rep.ok, statut: rep.status, donnees };
}

const arbre = await api(`/repos/${DEPOT}/git/trees/HEAD?recursive=1`);
if (!arbre.ok) {
  console.log(`Dossier privé illisible (${arbre.statut}). Vérifie le secret DONNEES_CLE.`);
  process.exit(arbre.statut === 409 ? 0 : 1);
}
const fichiers = new Map((arbre.donnees.tree || []).filter((f) => f.type === 'blob').map((f) => [f.path, f.sha]));

async function lireBlob(chemin) {
  const sha = fichiers.get(chemin);
  if (!sha) return null;
  const b = await api(`/repos/${DEPOT}/git/blobs/${sha}`);
  return b.ok ? Buffer.from(b.donnees.content, 'base64') : null;
}
async function lireJson(chemin) {
  const o = await lireBlob(chemin);
  try { return o ? JSON.parse(o.toString('utf8')) : null; } catch (_) { return null; }
}
async function ecrireJson(chemin, objet, message) {
  const contenu = Buffer.from(JSON.stringify(objet, null, 1)).toString('base64');
  const actuel = await api(`/repos/${DEPOT}/contents/${chemin}`);
  const r = await api(`/repos/${DEPOT}/contents/${chemin}`, { methode: 'PUT', corps: { message, content: contenu, ...(actuel.ok ? { sha: actuel.donnees.sha } : {}) } });
  if (!r.ok) console.log(`  écriture de ${chemin} impossible (${r.statut})`);
}

// ---------- Les choix du client ----------
async function rangerChoix(c) {
  try {
    const canal = await canalChoix(c.id, c.cle);
    const rep = await fetch(`${RELAIS_URL}/${canal}/json?poll=1&since=all`);
    if (!rep.ok) return;
    let plusRecent = null;
    for (const l of (await rep.text()).split('\n').filter(Boolean)) {
      try {
        const m = JSON.parse(l);
        if (m.event !== 'message' || !m.message) continue;
        const choix = await dechiffrerJson(c.cle, deBase64Url(m.message));
        if (!plusRecent || (choix.envoyeLe || '') > (plusRecent.envoyeLe || '')) plusRecent = choix;
      } catch (_) { /* illisible : ignoré */ }
    }
    if (!plusRecent) return;
    const chemin = `carnets-choix/${c.id}.json`;
    const deja = await lireJson(chemin);
    const connu = [deja?.choix?.recuLe, c.choix?.recuLe].filter(Boolean).sort().pop() || '';
    if ((plusRecent.envoyeLe || '') <= connu) return;
    await ecrireJson(chemin, { id: c.id, choix: { ...plusRecent, recuLe: plusRecent.envoyeLe } }, `Choix du client ${c.id}`);
    console.log(`  choix du client rangés (${plusRecent.coeurs?.length || 0} ❤)`);
  } catch (err) {
    console.log(`  choix : ${err.message}`);
  }
}

// ---------- Le courriel ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
const NOMS = { hebergement: 'Où dormir', restos: 'Où manger', visites: 'À voir', experiences: 'À vivre', nuit: 'Pour la soirée', sport: 'Pour bouger', trajets: 'Pour se déplacer' };

function courrielHtml({ c, mot, items, lien, photo }) {
  const prenom = c.client?.prenom || '';
  const lignes = items.map((i) => `
    <tr><td style="padding:10px 0;border-top:1px solid #2a2930;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a29da6;">${esc(NOMS[i.categorie] || 'Trouvaille')}${i.coupDeCoeur ? ' · <span style="color:#f4c88f;">coup de cœur</span>' : ''}</div>
      <div style="font-size:17px;font-weight:700;color:#f4f0ea;margin-top:2px;">${esc(i.nom)}</div>
      ${i.mot ? `<div style="font-size:15px;color:#d9d3cc;font-style:italic;margin-top:4px;">« ${esc(i.mot)} »</div>` : ''}
    </td></tr>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;background:#0e0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0d12;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#15141a;border-radius:20px;overflow:hidden;border:1px solid #26252d;">
  ${photo ? `<tr><td><img src="cid:photo-soir" alt="" width="560" style="display:block;width:100%;height:auto;max-height:320px;object-fit:cover;"></td></tr>` : ''}
  <tr><td style="padding:26px 26px 6px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f4c88f;">🌙 Ton carnet${c.ville ? ` · ${esc(c.ville)}` : ''}</div>
    <h1 style="margin:8px 0 0;font-size:26px;line-height:1.15;color:#f4f0ea;">${esc(mot.titre)}</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:#d9d3cc;">${esc(mot.texte)}</p>
  </td></tr>
  <tr><td style="padding:10px 26px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lignes}</table></td></tr>
  <tr><td align="center" style="padding:26px;">
    <a href="${esc(lien)}" style="display:inline-block;background:#ff7a59;color:#1a0d08;font-weight:800;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px;">Ouvrir mon carnet</a>
    <p style="margin:16px 0 0;font-size:13px;color:#79747e;">Pas besoin de répondre${prenom ? `, ${esc(prenom)}` : ''} : un ❤ dans ton carnet suffit, quand tu veux.</p>
  </td></tr>
</table>
<p style="font-size:12px;color:#5f5a64;margin:16px 0 0;">Tu reçois ce courriel parce que ${esc(c.raph || 'Raph')} prépare ton voyage, chaque soir à ${formatHeure(c.heure)}.</p>
</td></tr></table></body></html>`;
}
function courrielTexte({ c, mot, items, lien }) {
  return `${mot.titre}\n\n${mot.texte}\n\n${items.map((i) => `- ${i.nom}${i.mot ? ` : « ${i.mot} »` : ''}`).join('\n')}\n\nOuvrir mon carnet : ${lien}\n\nPas besoin de répondre : un ❤ dans ton carnet suffit, quand tu veux.\n${c.raph || 'Raph'}`;
}

let transport = null;
async function envoyer(message) {
  if (ESSAI) {
    const nom = `essai-courriel-${message.versId}.html`;
    await fs.writeFile(nom, message.html);
    console.log(`  (essai) courriel écrit dans ${nom}`);
    return true;
  }
  if (!process.env.COURRIEL_ADRESSE || !process.env.COURRIEL_MOT_DE_PASSE) {
    console.log('  pas de COURRIEL_ADRESSE / COURRIEL_MOT_DE_PASSE : courriel non envoyé');
    return false;
  }
  if (!transport) {
    const nodemailer = (await import('nodemailer')).default;
    transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.COURRIEL_ADRESSE, pass: process.env.COURRIEL_MOT_DE_PASSE } });
  }
  await transport.sendMail({
    from: { name: `${message.raph} · Voyage sur mesure`, address: process.env.COURRIEL_ADRESSE },
    to: message.a,
    subject: message.sujet,
    text: message.texte,
    html: message.html,
    attachments: message.photo ? [{ filename: 'photo.jpg', content: message.photo, cid: 'photo-soir' }] : [],
  });
  return true;
}

async function courrielDuSoir(c, maintenant) {
  if (!c.courrielSoir || !c.client?.courriel) return;
  const heure = c.heure ?? 19;
  const ce = livraisonDuJour(maintenant, heure, c.fuseau || 'America/Toronto');
  if (maintenant < ce || maintenant - ce > RETARD_MAX) return;
  const etatChemin = `carnets-envois/${c.id}.json`;
  const etat = (await lireJson(etatChemin)) || {};
  if ((etat.dernier || '') >= ce.toISOString()) return;
  const depuis = etat.dernier || '';
  const nouveaux = (c.items || []).filter((i) => i.livraison <= ce.toISOString() && i.livraison > depuis);
  if (!nouveaux.length) return;

  const items = [];
  for (const it of nouveaux) {
    const e = await lireJson(`endroits/${it.endroitId}.json`);
    if (e) items.push({ id: it.id, nom: e.nom, categorie: e.categorie, coupDeCoeur: !!e.coupDeCoeur, mot: it.mot, photos: e.photos || [] });
  }
  if (!items.length) return;
  const numero = new Set((c.items || []).filter((i) => i.livraison <= ce.toISOString()).map((i) => i.livraison)).size;
  const mot = motDuSoir(items, { prenom: c.client?.prenom, raph: c.raph || 'Raph', ville: c.ville, numero, cle: c.id });
  const lien = lienClient(SITE, c.id, c.cle);
  const premiere = items.find((i) => i.coupDeCoeur && i.photos.length) || items.find((i) => i.photos.length);
  const photo = premiere ? await lireBlob(`photos/${premiere.photos[0]}.jpg`) : null;
  const sujet = `🌙 ${mot.titre}${c.ville ? ` · ${c.ville}` : ''}`;
  const ok = await envoyer({
    versId: c.id, a: c.client.courriel, raph: c.raph || 'Raph', sujet,
    html: courrielHtml({ c, mot, items, lien, photo }), texte: courrielTexte({ c, mot, items, lien }), photo,
  });
  if (!ok) return;
  await ecrireJson(etatChemin, { id: c.id, dernier: ce.toISOString(), envoyeLe: maintenant.toISOString(), nb: items.length }, `Courriel du soir ${c.id}`);
  console.log(`  courriel du soir envoyé (${items.length} trouvaille${items.length > 1 ? 's' : ''}, ${dateLongue(ce, c.fuseau)})`);
}

// ---------- C'est parti ----------
const maintenant = process.env.MAINTENANT ? new Date(process.env.MAINTENANT) : new Date();
const carnets = [...fichiers.keys()].filter((p) => /^carnets\/[^/]+\.json$/.test(p));
console.log(`${carnets.length} carnet(s) trouvé(s).`);
for (const chemin of carnets) {
  const c = await lireJson(chemin);
  if (!c?.id || !c.cle) continue;
  console.log(`Carnet ${c.id} (${c.client?.prenom || 'sans nom'})`);
  await rangerChoix(c);
  try { await courrielDuSoir(c, maintenant); } catch (err) { console.log(`  courriel : ${err.message}`); }
}
