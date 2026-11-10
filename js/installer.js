// Bouton « Installer sur mon ordi » : met l'appli sur le bureau (Chrome, Edge).
// Si le navigateur ne propose pas l'installation tout seul, on explique comment faire.

let invite = null;
const abonnes = new Set();
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); invite = ev; abonnes.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { invite = null; abonnes.forEach((f) => f()); });

export const dejaInstallee = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const EXPLICATION = {
  fr: "Dans Chrome : clique sur les 3 points en haut à droite, puis « Caster, enregistrer et partager », puis « Installer la page en tant qu'appli ». Dans Edge : les 3 points, puis « Applications », puis « Installer ce site en tant qu'application ». Sur iPhone : bouton Partager, puis « Sur l'écran d'accueil ».",
  en: 'In Chrome: click the 3 dots at the top right, then "Cast, save and share", then "Install page as app". In Edge: the 3 dots, then "Apps", then "Install this site as an app". On iPhone: Share button, then "Add to Home Screen".',
};

// Renvoie true si l'installation a été lancée, false s'il faut suivre l'explication.
export async function installer() {
  if (!invite) return false;
  const i = invite;
  invite = null;
  await i.prompt();
  await i.userChoice.catch(() => null);
  return true;
}

export const peutInstallerDirect = () => !!invite;
export const quandChange = (f) => { abonnes.add(f); return () => abonnes.delete(f); };
