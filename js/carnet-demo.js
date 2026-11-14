// Démo du carnet client : un repérage à Montréal, pour montrer le concept.
// Ouvre carnet.html?demo. Les photos sont des photos d'illustration (Unsplash, gratuites).
// La démo avance toute seule : chaque soir à 19 h, une nouvelle soirée de choix apparaît,
// tirée d'une réserve de vrais endroits de Montréal (pas d'hôtels tous les soirs).

import { livraisonDuJour } from './carnet-commun.js';

const u = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const JOUR = 24 * 3600 * 1000;

// La réserve : 6 hôtels, 6 restos, 6 activités.
const RESERVE = [
  ['d1', { categorie: 'hebergement', type: 'Hôtel', sousType: 'Boutique hôtel', nom: 'Hôtel William Gray', adresse: '421, rue Saint-Vincent, Vieux-Montréal', description: 'Deux maisons de pierre du 18e siècle reliées par une aile moderne, en plein cœur du Vieux-Montréal.', mot: 'Demande une chambre côté place Jacques-Cartier, au 6e. Le matin, tu te réveilles avec les cloches.', prix: 3, confort: 5, montant: '389', devise: 'CAD', coupDeCoeur: true, photos: [u('1611892440504-42a792e24d32'), u('1621293954908-907159247fc8')] }],
  ['d2', { categorie: 'hebergement', type: 'Hôtel', sousType: 'Hôtel historique', nom: 'Hôtel Nelligan', adresse: '106, rue Saint-Paul Ouest, Vieux-Montréal', description: 'Murs de briques et de pierres, et une terrasse sur le toit qui donne sur le fleuve.', mot: 'Le bar sur le toit est parfait pour ton premier soir.', prix: 3, confort: 4, montant: '329', devise: 'CAD', photos: [u('1618773928121-c32242e63f39'), u('1759038086403-c607d67bb245')] }],
  ['d3', { categorie: 'hebergement', type: 'Hôtel', sousType: 'Boutique hôtel', nom: 'Le Petit Hôtel', adresse: '168, rue Saint-Paul Ouest, Vieux-Montréal', description: 'Une vingtaine de chambres seulement, un café au rez-de-chaussée.', mot: 'Plus petit, plus chaleureux, et le meilleur rapport qualité-prix.', prix: 2, confort: 4, montant: '249', devise: 'CAD', photos: [u('1759328257280-28bdb3050be3')] }],
  ['d4', { categorie: 'restos', type: 'Café', sousType: 'Café', nom: 'Olive et Gourmando', adresse: '351, rue Saint-Paul Ouest', description: 'Le café-boulangerie le plus aimé du Vieux-Montréal.', mot: 'Prends le Cubain. Fais-moi confiance. Vas-y avant 10 h pour éviter la file.', prix: 2, confort: 3, coupDeCoeur: true, photos: [u('1570474640932-c5dfbeeb2706')] }],
  ['d5', { categorie: 'restos', type: 'Rue', sousType: 'Stand', nom: 'St-Viateur Bagel', adresse: '263, rue Saint-Viateur Ouest, Mile End', description: 'Bagels roulés à la main et cuits au four à bois, ouvert jour et nuit.', mot: 'Mange-le encore chaud, debout sur le trottoir. Sésame, rien d’autre.', prix: 1, confort: 2, photos: [u('1687175452217-e4f8e523b5b5')] }],
  ['d6', { categorie: 'restos', type: 'Restaurant', sousType: 'Gastronomique', nom: 'Joe Beef', adresse: '2491, rue Notre-Dame Ouest, Petite-Bourgogne', description: 'Cuisine généreuse du marché, huîtres, homard. Une institution.', mot: 'Les réservations ouvrent 30 jours avant. Si tu le choisis, je m’en occupe.', prix: 4, confort: 4, photos: [u('1552566626-2d907dab0dff')] }],
  ['d7', { categorie: 'visites', type: 'Paysages', sousType: 'Point de vue', nom: 'Belvédère Kondiaronk', adresse: 'Parc du Mont-Royal', description: 'La plus belle vue sur le centre-ville, au sommet du mont Royal.', mot: 'Monte à pied par l’escalier (25 minutes), juste avant le coucher du soleil.', coupDeCoeur: true, photos: [u('1700682468403-7be8cb88f52f'), u('1695908887257-4ddc369928d6')] }],
  ['d8', { categorie: 'visites', type: 'Ville', sousType: 'Quartier typique', nom: 'Le Vieux-Montréal à pied', adresse: 'Rue Saint-Paul', description: 'Rues pavées, façades de pierre, petites places cachées.', mot: 'La rue Saint-Paul tôt le matin, avant tout le monde.', photos: [u('1713274843574-8e1c514430b1'), u('1767290444122-5230a7fefef7')] }],
  ['d9', { categorie: 'visites', type: 'Paysages', sousType: 'Point de vue', nom: 'La Grande roue du Vieux-Port', adresse: 'Quai de l’Horloge, Vieux-Port', description: 'Cabines chauffées, vue sur le fleuve et le centre-ville.', mot: 'Vas-y au crépuscule. Le fleuve devient rose.', prix: 2, photos: [u('1662697581379-ca7a11629a19'), u('1532299039866-065669a2d5df')] }],
  ['d10', { categorie: 'hebergement', type: 'Hôtel', sousType: '4-5 étoiles', nom: 'Le Germain Montréal', adresse: '2050, rue Mansfield, Centre-ville', description: 'Hôtel design au centre-ville, à deux pas de la rue Sainte-Catherine.', mot: 'Si tu veux être au centre de tout pour magasiner. Lits incroyables.', prix: 3, confort: 5, montant: '359', devise: 'CAD', photos: [u('1765547090903-348b711f0eee')] }],
  ['d11', { categorie: 'hebergement', type: 'Hôtel', sousType: 'Boutique hôtel', nom: 'Hôtel Gault', adresse: '449, rue Sainte-Hélène, Vieux-Montréal', description: 'Ancien entrepôt de 1871, grandes fenêtres et béton brut.', mot: 'Le plus calme du Vieux. Parfait pour bien dormir.', prix: 3, confort: 4, montant: '299', devise: 'CAD', photos: [u('1778205015308-1ed324aea202')] }],
  ['d12', { categorie: 'hebergement', type: 'Hôtel', sousType: 'Hôtel historique', nom: 'Hôtel Place d’Armes', adresse: '55, rue Saint-Jacques, Vieux-Montréal', description: 'Face à la basilique Notre-Dame, avec un spa et une terrasse sur le toit.', mot: 'La vue sur la basilique depuis le toit, le soir, c’est fou.', prix: 3, confort: 4, montant: '319', devise: 'CAD', photos: [u('1631049307264-da0ec9d70304')] }],
  ['d13', { categorie: 'restos', type: 'Restaurant', sousType: 'Local familial', nom: 'Schwartz’s', adresse: '3895, boulevard Saint-Laurent, Plateau', description: 'Le smoked meat le plus célèbre de Montréal, depuis 1928.', mot: 'Medium fat, avec un cornichon et un cream soda. Rien d’autre.', prix: 1, confort: 2, photos: [u('1570560258879-af7f8e1447ac')] }],
  ['d14', { categorie: 'restos', type: 'Restaurant', sousType: 'Local familial', nom: 'L’Express', adresse: '3927, rue Saint-Denis, Plateau', description: 'Bistro parisien ouvert depuis 1980, ouvert tard.', mot: 'Os à moelle et tartare. Réserve, c’est toujours plein.', prix: 3, confort: 3, coupDeCoeur: true, photos: [u('1592494804071-faea15d93a8a')] }],
  ['d15', { categorie: 'restos', type: 'Restaurant', sousType: 'Gastronomique', nom: 'Le Club Chasse et Pêche', adresse: '423, rue Saint-Claude, Vieux-Montréal', description: 'Une adresse feutrée, cuisine de terroir revisitée.', mot: 'Pour une soirée spéciale. Demande une banquette.', prix: 4, confort: 5, photos: [u('1531973819741-e27a5ae2cc7b')] }],
  ['d16', { categorie: 'nuit', type: 'Bar relax', sousType: 'Speakeasy', nom: 'Atwater Cocktail Club', adresse: '512, avenue Atwater, Saint-Henri', description: 'Bar à cocktails caché, entrée discrète par une ruelle.', mot: 'Laisse le barman choisir pour toi. Arrive avant 21 h.', prix: 3, confort: 4, photos: [u('1434569842867-4d6d1d4d1ef0')] }],
  ['d17', { categorie: 'visites', type: 'Ville', sousType: 'Marché', nom: 'Marché Jean-Talon', adresse: '7070, avenue Henri-Julien, Petite-Italie', description: 'Le grand marché à ciel ouvert : fruits, fromages, épices.', mot: 'Le samedi matin, avec un café de chez Caffè Italia juste à côté.', photos: [u('1756326948036-a87e9492c020')] }],
  ['d18', { categorie: 'nuit', type: 'Bar relax', sousType: 'Cocktails', nom: 'Le Mal Nécessaire', adresse: '1106, boulevard Saint-Laurent, Quartier chinois', description: 'Bar tiki au sous-sol, cocktails servis dans des ananas.', mot: 'Plus festif. Parfait si tu veux une soirée qui finit tard.', prix: 2, confort: 3, photos: [u('1462539405390-d0bdb635c7d1')] }],
];

const groupe = (cat) => (cat === 'hebergement' ? 'dormir' : cat === 'restos' ? 'manger' : 'faire');
const parGroupe = (g) => RESERVE.filter(([, o]) => groupe(o.categorie) === g);

// Mélange toujours pareil pour un même nombre (la démo est la même pour tout le monde, le même jour).
function melange(liste, graine) {
  const l = [...liste];
  let x = (graine * 2654435761) >>> 0 || 1;
  for (let i = l.length - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    const j = x % (i + 1);
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

// Les 3 endroits d'un groupe : ce soir les 3 premiers du mélange du jour, hier les 3 autres.
// Comme ça, les deux soirées affichées n'ont jamais les mêmes endroits, et tout change chaque jour.
function troisPour(g, numero, hier) {
  const m = melange(parGroupe(g), numero * 7 + g.length);
  return hier ? m.slice(3, 6) : m.slice(0, 3);
}

export function demo() {
  const fuseau = 'America/Toronto';
  const heure = 19;
  const maintenant = new Date();
  const ceSoir = livraisonDuJour(maintenant, heure, fuseau);
  // Si 19 h est passé, la livraison de ce soir est arrivée ; sinon la plus récente est celle d'hier.
  const derniere = ceSoir <= maintenant ? ceSoir.getTime() : ceSoir.getTime() - JOUR;
  const numero = Math.round(derniere / JOUR); // change chaque soir
  const SOIRS = 2; // on montre les 2 dernières soirées

  const items = [];
  const choixDemo = { soirs: {} };
  for (let k = SOIRS - 1; k >= 0; k--) {
    const n = numero - k;
    const quand = new Date(derniere - k * JOUR).toISOString();
    const groupes = n % 3 === 1 ? ['manger', 'faire'] : ['dormir', 'manger', 'faire']; // pas d'hôtel un soir sur trois
    const choisis = {};
    for (const g of groupes) {
      const trois = troisPour(g, numero, k > 0);
      trois.forEach(([id, o]) => items.push({ id: `${id}-${n}`, ville: 'Montréal', livraison: quand, ...o, photos: o.photos || [] }));
      choisis[g] = `${trois[n % 3][0]}-${n}`;
    }
    if (k > 0) choixDemo.soirs[quand] = choisis; // les soirées passées sont complétées
  }
  // En route pour la prochaine livraison
  const prochaine = new Date(derniere + JOUR).toISOString();
  const cats = (numero + 1) % 3 === 1 ? ['restos', 'restos', 'restos', 'visites', 'experiences', 'visites'] : ['hebergement', 'hebergement', 'hebergement', 'restos', 'restos', 'restos', 'visites', 'experiences', 'visites'];
  cats.forEach((categorie, k) => items.push({ id: `p${k}`, ville: 'Montréal', livraison: prochaine, categorie, nom: '…', photos: [] }));

  return {
    v: 1, id: 'demo-montreal', demo: true,
    prenom: 'Marc', raph: 'Raph', ville: 'Montréal', pays: 'Canada',
    mot: '',
    choixDemo,
    heure, fuseau, actif: true,
    couverture: u('1757340347198-33cf38fc0a49'),
    misAJour: maintenant.toISOString(),
    items,
  };
}
