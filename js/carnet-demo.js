// Démo du carnet client : un repérage à Montréal, pour montrer le concept.
// Ouvre carnet.html?demo. Les photos sont des photos d'illustration (Unsplash, gratuites).

import { livraisonDuJour } from './carnet-commun.js';

const u = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const JOUR = 24 * 3600 * 1000;

export function demo() {
  const fuseau = 'America/Toronto';
  const heure = 19;
  const maintenant = new Date();
  const ceSoir = livraisonDuJour(maintenant, heure, fuseau);
  // Si 19 h est passé, la livraison de ce soir est déjà arrivée ; la prochaine est demain.
  const base = ceSoir <= maintenant ? ceSoir.getTime() : ceSoir.getTime() - JOUR;
  const soir = (n) => new Date(base - (2 - n) * JOUR).toISOString(); // soir 0, 1, 2
  const prochaine = new Date(base + JOUR).toISOString();

  const items = [
    // Soir 1 : où dormir + une table
    {
      id: 'd1', categorie: 'hebergement', type: 'Hôtel', sousType: 'Boutique hôtel', nom: 'Hôtel William Gray', ville: 'Montréal', adresse: '421, rue Saint-Vincent, Vieux-Montréal',
      description: 'Deux maisons de pierre du 18e siècle reliées par une aile moderne, en plein cœur du Vieux-Montréal.',
      mot: 'Demande une chambre côté place Jacques-Cartier, au 6e. Le matin, tu te réveilles avec les cloches.', prix: 3, confort: 5, montant: '389', devise: 'CAD', coupDeCoeur: true,
      photos: [u('1611892440504-42a792e24d32'), u('1621293954908-907159247fc8')], livraison: soir(0),
    },
    {
      id: 'd2', categorie: 'hebergement', type: 'Hôtel', sousType: 'Hôtel historique', nom: 'Hôtel Nelligan', ville: 'Montréal', adresse: '106, rue Saint-Paul Ouest, Vieux-Montréal',
      description: 'Murs de briques et de pierres, et une terrasse sur le toit qui donne sur le fleuve.',
      mot: 'Le bar sur le toit est parfait pour ton premier soir. Plus classique que le William Gray.', prix: 3, confort: 4, montant: '329', devise: 'CAD',
      photos: [u('1618773928121-c32242e63f39'), u('1759038086403-c607d67bb245')], livraison: soir(0),
    },
    {
      id: 'd3', categorie: 'hebergement', type: 'Hôtel', sousType: 'Boutique hôtel', nom: 'Le Petit Hôtel', ville: 'Montréal', adresse: '168, rue Saint-Paul Ouest, Vieux-Montréal',
      description: 'Une vingtaine de chambres seulement, un café au rez-de-chaussée.',
      mot: 'Plus petit, plus chaleureux, et le meilleur rapport qualité-prix des trois.', prix: 2, confort: 4, montant: '249', devise: 'CAD',
      photos: [u('1759328257280-28bdb3050be3')], livraison: soir(0),
    },
    {
      id: 'd4', categorie: 'restos', type: 'Café', sousType: 'Café', nom: 'Olive et Gourmando', ville: 'Montréal', adresse: '351, rue Saint-Paul Ouest',
      description: 'Le café-boulangerie le plus aimé du Vieux-Montréal. Sandwichs chauds, pâtisseries maison.',
      mot: 'Prends le Cubain. Fais-moi confiance. Vas-y avant 10 h pour éviter la file.', prix: 2, confort: 3, coupDeCoeur: true,
      photos: [u('1570474640932-c5dfbeeb2706')], livraison: soir(0),
    },
    // Soir 2 : des tables et des points de vue
    {
      id: 'd5', categorie: 'restos', type: 'Rue', sousType: 'Stand', nom: 'St-Viateur Bagel', ville: 'Montréal', adresse: '263, rue Saint-Viateur Ouest, Mile End',
      description: 'Bagels roulés à la main et cuits au four à bois, ouvert jour et nuit.',
      mot: 'Mange-le encore chaud, debout sur le trottoir. Sésame, rien d’autre.', prix: 1, confort: 2,
      photos: [u('1687175452217-e4f8e523b5b5')], livraison: soir(1),
    },
    {
      id: 'd6', categorie: 'restos', type: 'Restaurant', sousType: 'Gastronomique', nom: 'Joe Beef', ville: 'Montréal', adresse: '2491, rue Notre-Dame Ouest, Petite-Bourgogne',
      description: 'Cuisine généreuse du marché, huîtres, homard. Une institution.',
      mot: 'Les réservations ouvrent 30 jours avant, à la minute près. Si tu le choisis, je m’en occupe.', prix: 4, confort: 4,
      photos: [u('1552566626-2d907dab0dff')], livraison: soir(1),
    },
    {
      id: 'd7', categorie: 'visites', type: 'Paysages', sousType: 'Point de vue', nom: 'Belvédère Kondiaronk', ville: 'Montréal', adresse: 'Parc du Mont-Royal',
      description: 'La plus belle vue sur le centre-ville, au sommet du mont Royal.',
      mot: 'Monte à pied par l’escalier (25 minutes), juste avant le coucher du soleil.', coupDeCoeur: true,
      photos: [u('1700682468403-7be8cb88f52f'), u('1695908887257-4ddc369928d6')], livraison: soir(1),
    },
    {
      id: 'd8', categorie: 'visites', type: 'Ville', sousType: 'Quartier typique', nom: 'Le Vieux-Montréal à pied', ville: 'Montréal', adresse: 'Rue Saint-Paul',
      description: 'Rues pavées, façades de pierre, petites places cachées.',
      mot: 'La rue Saint-Paul tôt le matin, avant tout le monde. C’est là que la ville est la plus belle.',
      photos: [u('1713274843574-8e1c514430b1'), u('1767290444122-5230a7fefef7')], livraison: soir(1),
    },
    // Soir 3 : la soirée
    {
      id: 'd9', categorie: 'nuit', type: 'Bar relax', sousType: 'Speakeasy', nom: 'Atwater Cocktail Club', ville: 'Montréal', adresse: '512, avenue Atwater, Saint-Henri',
      description: 'Bar à cocktails caché, entrée discrète par une ruelle.',
      mot: 'Laisse le barman choisir pour toi. Arrive avant 21 h ou réserve.', prix: 3, confort: 4,
      photos: [u('1434569842867-4d6d1d4d1ef0')], livraison: soir(2),
    },
    {
      id: 'd10', categorie: 'nuit', type: 'Bar relax', sousType: 'Cocktails', nom: 'Le Mal Nécessaire', ville: 'Montréal', adresse: '1106, boulevard Saint-Laurent, Quartier chinois',
      description: 'Bar tiki au sous-sol, cocktails servis dans des ananas.',
      mot: 'Plus festif. Parfait si tu veux une soirée qui finit tard.', prix: 2, confort: 3,
      photos: [u('1462539405390-d0bdb635c7d1')], livraison: soir(2),
    },
    {
      id: 'd11', categorie: 'visites', type: 'Paysages', sousType: 'Point de vue', nom: 'La Grande roue du Vieux-Port', ville: 'Montréal', adresse: 'Quai de l’Horloge, Vieux-Port',
      description: 'Cabines chauffées, vue sur le fleuve et le centre-ville.',
      mot: 'Vas-y au crépuscule. Le fleuve devient rose, c’est magique.', prix: 2,
      photos: [u('1662697581379-ca7a11629a19'), u('1532299039866-065669a2d5df')], livraison: soir(2),
    },
    // En route pour la prochaine livraison
    { id: 'd12', categorie: 'visites', type: 'Ville', sousType: 'Marché', nom: 'Marché Jean-Talon', ville: 'Montréal', photos: [], livraison: prochaine },
    { id: 'd13', categorie: 'restos', type: 'Restaurant', sousType: 'Local familial', nom: 'Schwartz’s', ville: 'Montréal', photos: [], livraison: prochaine },
    { id: 'd14', categorie: 'experiences', type: 'Détente', sousType: 'Spa', nom: 'Bota Bota', ville: 'Montréal', photos: [], livraison: prochaine },
  ];

  return {
    v: 1, id: 'demo-montreal', demo: true,
    prenom: 'Marc', raph: 'Raph', ville: 'Montréal', pays: 'Canada',
    mot: 'Salut Marc ! Je suis à Montréal pour toi cette semaine. Chaque soir à 19 h, je te livre ce que j’ai trouvé dans la journée. Mets un ❤ sur ce qui te plaît, quand tu veux. Pas besoin de me répondre.',
    heure, fuseau, actif: true,
    couverture: u('1757340347198-33cf38fc0a49'),
    misAJour: maintenant.toISOString(),
    items,
  };
}
