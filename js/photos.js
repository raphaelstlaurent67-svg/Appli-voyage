// Photos de voyage libres de droits (Unsplash : utilisation gratuite, même commerciale).
// Chaque photo est chargée directement depuis Unsplash. Pour en changer une, remplacer son identifiant
// (la partie après « photo- » dans l'adresse de l'image sur unsplash.com).

export const photo = (id, largeur = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${largeur}&q=70`;

// Une photo par pays (nom français, comme dans la fiche).
export const PHOTOS_PAYS = {
  Japon: '1526481280693-3bfa7568e0f3', // Pagode Chureito et mont Fuji, David Edelstein
  Thaïlande: '1506665531195-3566af2b4dfa', // Koh Phi Phi, Evan Krause
  France: '1499856871958-5b9627545d1a', // Paris, Léonard Cotte
  Italie: '1612698093158-e07ac200d44e', // Côte amalfitaine, Tom Podmore
  Espagne: '1688404808709-681acec3684b', // Séville, Taisia Karaseva
  Portugal: '1536663815808-535e2280d2c2', // Lisbonne, Tom Byrom
  Grèce: '1580502304784-8985b7eb7260', // Oia, Santorin, James Ting
  Mexique: '1501855901885-8b29fa615daf', // Côte mexicaine, Spencer Watson
  Cuba: '1584098178554-62be72fa42c5', // La Havane, Florian Wehde
  'République dominicaine': '1637576305711-23d3b0f72881', // Plage, David Anderson
  'États-Unis': '1496588152823-86ff7695e68f', // Pont de Brooklyn, Luca Bravo
  'Costa Rica': '1582218290380-ae58573670e3', // Côte du Pacifique, Max Bender
  Vietnam: '1528127269322-539801943592', // Baie d'Ha Long, Ammie Ngo
  Indonésie: '1555400038-63f5ba517a47', // Rizières de Bali, Niklas Weiss
  Maroc: '1597212618440-806262de4f6b', // Marrakech et l'Atlas, Paul Macallan
  Pérou: '1587595431973-160d0d94add1', // Machu Picchu, Eddie Kiszka
  'Corée du Sud': '1570191913384-7b4ff11716e7', // Séoul, Robson Hatsukami Morgan
};

// Photos qui défilent en fond quand aucun pays n'est choisi (et sur le site).
export const PHOTOS_FOND = [
  '1476514525535-07fb3b4ae5f1', // Lago di Braies, Luca Bravo
  '1506665531195-3566af2b4dfa', // Thaïlande
  '1555400038-63f5ba517a47', // Bali
  '1612698093158-e07ac200d44e', // Amalfi
  '1526481280693-3bfa7568e0f3', // Japon
  '1580502304784-8985b7eb7260', // Santorin
];

export const photoPays = (nom) => PHOTOS_PAYS[nom] || null;
