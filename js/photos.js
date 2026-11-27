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

// Quelques photos de plus par pays, pour la fiche quand on arrive avec un pays déjà choisi (?pays=).
// Toutes sur images.unsplash.com (licence Unsplash gratuite), jamais « Unsplash+ » qui est payant.
export const GALERIE_PAYS = {
  Japon: ['1526481280693-3bfa7568e0f3', '1545569341-9eb8b30979d9', '1542051841857-5f90071e7989'], // Fuji, pagode (Su San Lee), Shibuya (Jezael Melgoza)
  Thaïlande: ['1506665531195-3566af2b4dfa', '1519451241324-20b4ea2c4220', '1528181304800-259b08848526'], // Phi Phi, bateau (Robin Noguier), temples (Mathew Schwartz)
  Vietnam: ['1528127269322-539801943592', '1609412058473-c199497c3c5d', '1557750255-c76072a7aad1'], // Ha Long, rizières (Hoach Le Dinh), pagode (Rowan Heuvel)
  Indonésie: ['1555400038-63f5ba517a47', '1524675053444-52c3ca294ad2', '1505993597083-3bd19fb75e57'], // Bali, temple sur le lac (Steve Douglas), volcans (Pukpik)
  'Corée du Sud': ['1570191913384-7b4ff11716e7', '1785656573111-1f36b482ef71', '1762440775592-652b6e919eee'], // Séoul, palais (Stefan Szankowski), maisons colorées (Rina Kemppainen)
  France: ['1499856871958-5b9627545d1a', '1502602898657-3e91760cbb34', '1603378995290-8d4ce0495ddd'], // Paris, tour Eiffel (Chris Karidis), Arc de triomphe (Bastien Nvs)
  Italie: ['1612698093158-e07ac200d44e', '1516483638261-f4dbaf036963', '1518098268026-4e89f1a2cd8e'], // Amalfi, Manarola (Jack Ward), Toscane (Luca Micheli)
  Espagne: ['1688404808709-681acec3684b', '1509840841025-9088ba78a826', '1504019347908-b45f9b0b8dd5'], // Séville, Giralda (Henrique Ferreira), côte (Drew Dizzy Graham)
  Portugal: ['1536663815808-535e2280d2c2', '1555881400-74d7acaacd8b', '1562195168-c82fea0f0953'], // Lisbonne, Porto (Nick Karvounis), Sintra (Julia Solonina)
  Grèce: ['1580502304784-8985b7eb7260', '1603565816030-6b389eeb23cb', '1587974136998-4fcc253b6183'], // Oia, Acropole (Constantinos Kollias), Parga (Calin Stan)
  Mexique: ['1501855901885-8b29fa615daf', '1568402102990-bc541580b59f', '1580934738416-ad531f2920f7'], // côte, Chichén Itzá (Alex Azabache), Mexico (Pyro Jenka)
  Cuba: ['1584098178554-62be72fa42c5', '1786477186200-1e33caefa12e', '1783173690552-f3d16e6160ba'], // La Havane, Capitole (Ricardo IV Tamayo), rue (Alex G)
  'Costa Rica': ['1582218290380-ae58573670e3', '1620658927695-c33df6fb8130', '1643400812282-4ef456a7b352'], // côte, chutes (Marcelo Villalobos), plage (Luis Diego Aguilar)
  Pérou: ['1587595431973-160d0d94add1', '1526392060635-9d6019884377', '1764380246149-65b67c7c5cf3'], // Machu Picchu, brume (Willian Justen), lama (Samuel Quek)
  Maroc: ['1597212618440-806262de4f6b', '1538600838042-6a0c694ffab5', '1559586616-361e18714958'], // Marrakech, Chefchaouen (Mohammed), désert (Carlos Leret)
};
export const galeriePays = (nom) => GALERIE_PAYS[nom] || (PHOTOS_PAYS[nom] ? [PHOTOS_PAYS[nom]] : []);

export const photoPays = (nom) => PHOTOS_PAYS[nom] || null;
