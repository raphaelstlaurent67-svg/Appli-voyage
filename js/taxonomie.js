// Classement des endroits : catégorie > type > sous-type.
// Pour ajouter ou retirer un type ou un sous-type, il suffit de modifier cette liste.
// Les endroits déjà enregistrés gardent leurs valeurs, même si on retire un choix ici.

export const TAXONOMIE = {
  hebergement: {
    couleur: '#5b5bd6',
    nom: 'Hébergement', icone: '🛏️',
    types: {
      'Hôtel': ['Économique', '3 étoiles', 'Boutique', '4-5 étoiles', 'Tout-inclus', 'Historique'],
      'Auberge': ['Dortoir', 'Chambre privée', 'Capsule'],
      "Chez l'habitant": ['Gîte', "Maison d'hôtes", 'Ferme'],
      'Location': ['Appartement', 'Maison', 'Villa', 'Chalet'],
      'Nature': ['Camping', 'Glamping', 'Éco-lodge', 'Bungalow de plage', 'Cabane', 'Refuge'],
      'Traditionnel': ['Ryokan', 'Riad', 'Monastère'],
    },
  },
  restos: {
    couleur: '#e8590c',
    nom: 'Restos', icone: '🍜',
    types: {
      'Restaurant': ['Familial', 'Bistro', 'Gastronomique', 'International', 'Végé', 'Terrasse', 'Rooftop'],
      'Spécialité': ['Fruits de mer', 'Grillades', 'Pizza', 'Sushi', 'Tapas'],
      'Rue': ['Stand', 'Marché', 'Food truck', 'Food court'],
      'Café': ['Café', 'Boulangerie', 'Pâtisserie', 'Brunch', 'Salon de thé'],
      'Expérience': ['Cours de cuisine', 'Visite gourmande', "Repas chez l'habitant", 'Dégustation'],
    },
  },
  sport: {
    couleur: '#2f9e44',
    nom: 'Sport', icone: '🏃',
    types: {
      'Eau': ['Surf', 'Plongée', 'Snorkeling', 'Kayak', 'Paddle', 'Kitesurf', 'Rafting', 'Voile', 'Pêche'],
      'Montagne': ['Randonnée', 'Trek', 'Escalade', 'Vélo de montagne', 'Ski', 'Planche à neige'],
      'Raquette': ['Tennis', 'Pickleball', 'Padel', 'Badminton', 'Squash'],
      'Forme': ['Yoga', 'Gym', 'Course', 'Pilates'],
      'Sensations fortes': ['Tyrolienne', 'Parapente', 'Montgolfière', 'Saut en parachute', 'Quad', 'Karting'],
      'Combat': ['Boxe', 'Muay-thaï', 'Arts martiaux'],
      'Voir un match': ['Hockey', 'Soccer', 'Baseball', 'Basketball', 'Football'],
      'Autres': ['Golf', 'Équitation', 'Vélo en ville', 'Bowling'],
    },
  },
  visites: {
    couleur: '#b8860b',
    nom: 'Visites', icone: '🏛️',
    types: {
      'Culture': ['Vieille ville', 'Château', 'Palais', 'Église', 'Temple', 'Ruines', 'Village'],
      'Art': ['Musée', 'Galerie', 'Street art', 'Architecture'],
      'Paysages': ['Point de vue', 'Plage', 'Montagne', 'Cascade', 'Lac', 'Parc national', 'Île', 'Grotte'],
      'Ville': ['Quartier', 'Marché', 'Magasinage', 'Visite guidée'],
      'Excursion': ['Journée guidée', 'Croisière', 'Tour en bateau'],
      'Animaux': ['Safari', 'Sanctuaire', 'Aquarium', 'Observation'],
    },
  },
  experiences: {
    couleur: '#d6336c',
    nom: 'Expériences', icone: '✨',
    types: {
      'Détente': ['Spa', 'Massage', 'Bains thermaux'],
      'Atelier': ['Cuisine', 'Poterie', 'Peinture', 'Artisanat'],
      'Spirituel': ['Méditation', 'Retraite', 'Cérémonie'],
      'Famille': ["Parc d'attractions", 'Parc aquatique', 'Zoo'],
    },
  },
  nuit: {
    couleur: '#7048e8',
    nom: 'Vie nocturne', icone: '🌙',
    types: {
      'Bar': ['Cocktails', 'Vin', 'Microbrasserie', 'Rooftop', 'Speakeasy', 'Bar de plage', 'Pub'],
      'Pour danser': ['Boîte de nuit', 'Bar dansant', 'Beach party'],
      'Musique': ['Musique live', 'Jazz', 'Karaoké'],
      'Spectacle': ['Cabaret', 'Théâtre', 'Concert', 'Humour'],
    },
  },
  trajets: {
    couleur: '#1c7ed6',
    nom: 'Trajets', icone: '🚆',
    types: {
      'Avion': ['Régulier', 'Low-cost'],
      'Train': ['Grande vitesse', 'De nuit', 'Régional'],
      'Bus': ['Confort', 'De nuit', 'Local'],
      'Bateau': ['Traversier', 'Bateau rapide', 'Bateau privé'],
      'Voiture': ['Location', 'Chauffeur', 'Transfert aéroport'],
      'En ville': ['Métro', 'Taxi', 'Uber', 'Vélo', 'Scooter'],
    },
  },
  autre: {
    couleur: '#64748b',
    nom: 'Autre', icone: '📌',
    // Pas de type : pour les endroits qu'on ne sait pas encore où classer.
    types: {},
  },
};

// Valeur approximative de 1 unité de chaque monnaie en dollars canadiens.
export const TAUX_PAR_DEFAUT = {
  CAD: 1, USD: 1.37, EUR: 1.6, GBP: 1.85, CHF: 1.72, MXN: 0.075,
  DOP: 0.022, CRC: 0.0027, CUP: 0.057, JMD: 0.0087, BSD: 1.37, XCD: 0.51, GTQ: 0.18, BZD: 0.68, PAB: 1.37,
  PEN: 0.39, ARS: 0.0011, BRL: 0.25, COP: 0.00035, CLP: 0.0015, UYU: 0.034, BOB: 0.2,
  MAD: 0.15, TND: 0.47, EGP: 0.028, ZAR: 0.078, KES: 0.0106, TZS: 0.00055, XOF: 0.0024, MUR: 0.03,
  AUD: 0.91, NZD: 0.8, XPF: 0.0134, ISK: 0.011, NOK: 0.135, SEK: 0.145, DKK: 0.21, CZK: 0.065, HUF: 0.0041, PLN: 0.37, RON: 0.31, HRK: 0.21,
  JPY: 0.0093, KRW: 0.001, CNY: 0.19, TWD: 0.043, HKD: 0.175,
  THB: 0.041, VND: 0.000054, KHR: 0.00034, LAK: 0.000064, MMK: 0.00065,
  MYR: 0.31, SGD: 1.05, IDR: 0.000085, PHP: 0.024,
  INR: 0.016, LKR: 0.0046, NPR: 0.01, MVR: 0.089,
  AED: 0.37, SAR: 0.36, QAR: 0.37, OMR: 3.55, KWD: 4.47, BHD: 3.64, JOD: 1.93, ILS: 0.37,
  TRY: 0.033, GEL: 0.5, AMD: 0.0035, AZN: 0.8, KZT: 0.0027, KGS: 0.0157, UZS: 0.00011, TJS: 0.13, TMT: 0.39,
  MNT: 0.0004, BDT: 0.0113, BTN: 0.016, BND: 1.05, MOP: 0.17, PKR: 0.0049, AFN: 0.02,
};

// Monnaie proposée automatiquement selon le pays choisi.
export const DEVISE_DU_PAYS = {
  'Canada': 'CAD', 'États-Unis': 'USD', 'Mexique': 'MXN', 'Cuba': 'CUP', 'République dominicaine': 'DOP', 'Costa Rica': 'CRC',
  'Jamaïque': 'JMD', 'Bahamas': 'BSD', 'Guatemala': 'GTQ', 'Belize': 'BZD', 'Panama': 'USD', 'Porto Rico': 'USD',
  'Sainte-Lucie': 'XCD', 'Grenade': 'XCD', 'Antigua-et-Barbuda': 'XCD', 'Guadeloupe': 'EUR', 'Martinique': 'EUR',
  'Pérou': 'PEN', 'Argentine': 'ARS', 'Brésil': 'BRL', 'Colombie': 'COP', 'Chili': 'CLP', 'Uruguay': 'UYU', 'Bolivie': 'BOB', 'Équateur': 'USD',
  'France': 'EUR', 'Belgique': 'EUR', 'Luxembourg': 'EUR', 'Monaco': 'EUR', 'Espagne': 'EUR', 'Portugal': 'EUR', 'Italie': 'EUR', 'Grèce': 'EUR',
  'Allemagne': 'EUR', 'Autriche': 'EUR', 'Pays-Bas': 'EUR', 'Irlande': 'EUR', 'Finlande': 'EUR', 'Malte': 'EUR', 'Chypre': 'EUR', 'Croatie': 'EUR',
  'Slovénie': 'EUR', 'Slovaquie': 'EUR', 'Estonie': 'EUR', 'Lettonie': 'EUR', 'Lituanie': 'EUR', 'Monténégro': 'EUR', 'Andorre': 'EUR', 'Vatican': 'EUR', 'Saint-Marin': 'EUR',
  'Royaume-Uni': 'GBP', 'Suisse': 'CHF', 'Liechtenstein': 'CHF', 'Islande': 'ISK', 'Norvège': 'NOK', 'Suède': 'SEK', 'Danemark': 'DKK',
  'Tchéquie': 'CZK', 'Hongrie': 'HUF', 'Pologne': 'PLN', 'Roumanie': 'RON',
  'Maroc': 'MAD', 'Tunisie': 'TND', 'Égypte': 'EGP', 'Afrique du Sud': 'ZAR', 'Kenya': 'KES', 'Tanzanie': 'TZS', 'Sénégal': 'XOF', 'Maurice': 'MUR',
  'Australie': 'AUD', 'Nouvelle-Zélande': 'NZD', 'Polynésie française': 'XPF',
  'Japon': 'JPY', 'Corée du Sud': 'KRW', 'Chine': 'CNY', 'Taïwan': 'TWD', 'Hong Kong': 'HKD', 'Macao': 'MOP',
  'Thaïlande': 'THB', 'Vietnam': 'VND', 'Cambodge': 'USD', 'Laos': 'LAK', 'Myanmar': 'MMK',
  'Malaisie': 'MYR', 'Singapour': 'SGD', 'Indonésie': 'IDR', 'Philippines': 'PHP', 'Brunei': 'BND', 'Timor oriental': 'USD',
  'Inde': 'INR', 'Sri Lanka': 'LKR', 'Népal': 'NPR', 'Maldives': 'USD', 'Bhoutan': 'BTN', 'Bangladesh': 'BDT', 'Pakistan': 'PKR',
  'Afghanistan': 'AFN', 'Mongolie': 'MNT', 'Kazakhstan': 'KZT', 'Kirghizistan': 'KGS', 'Ouzbékistan': 'UZS',
  'Tadjikistan': 'TJS', 'Turkménistan': 'TMT', 'Géorgie': 'GEL', 'Arménie': 'AMD', 'Azerbaïdjan': 'AZN', 'Turquie': 'TRY',
  'Émirats arabes unis': 'AED', 'Arabie saoudite': 'SAR', 'Qatar': 'QAR', 'Oman': 'OMR', 'Koweït': 'KWD', 'Bahreïn': 'BHD',
  'Jordanie': 'JOD', 'Israël': 'ILS',
};

// Autres façons de joindre un endroit (en plus du téléphone), rangées dans « Plus de détails ».
export const CONTACTS = [
  ['whatsapp', 'WhatsApp'], ['email', 'Courriel'], ['site', 'Site web'], ['reservation', 'Lien de réservation'],
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['line', 'LINE'], ['wechat', 'WeChat'],
  ['kakao', 'KakaoTalk'], ['zalo', 'Zalo'],
];
// Montrés dans le formulaire seulement s'ils sont déjà remplis.
export const CONTACTS_RARES = ['line', 'wechat', 'kakao', 'zalo'];

// Nom de chaque monnaie, affiché à côté de son code.
export const NOMS_DEVISES = {
  CAD: 'Dollar canadien', USD: 'Dollar américain', EUR: 'Euro', GBP: 'Livre sterling', CHF: 'Franc suisse', MXN: 'Peso mexicain',
  DOP: 'Peso dominicain', CRC: 'Colón costaricien', CUP: 'Peso cubain', JMD: 'Dollar jamaïcain', BSD: 'Dollar des Bahamas', XCD: 'Dollar des Caraïbes orientales',
  GTQ: 'Quetzal', BZD: 'Dollar du Belize', PAB: 'Balboa', PEN: 'Sol péruvien', ARS: 'Peso argentin', BRL: 'Réal brésilien', COP: 'Peso colombien',
  CLP: 'Peso chilien', UYU: 'Peso uruguayen', BOB: 'Boliviano', MAD: 'Dirham marocain', TND: 'Dinar tunisien', EGP: 'Livre égyptienne',
  ZAR: 'Rand', KES: 'Shilling kényan', TZS: 'Shilling tanzanien', XOF: 'Franc CFA', MUR: 'Roupie mauricienne', AUD: 'Dollar australien',
  NZD: 'Dollar néo-zélandais', XPF: 'Franc pacifique', ISK: 'Couronne islandaise', NOK: 'Couronne norvégienne', SEK: 'Couronne suédoise',
  DKK: 'Couronne danoise', CZK: 'Couronne tchèque', HUF: 'Forint', PLN: 'Zloty', RON: 'Leu roumain', HRK: 'Kuna',
  JPY: 'Yen japonais', KRW: 'Won sud-coréen', CNY: 'Yuan chinois', TWD: 'Dollar taïwanais', HKD: 'Dollar de Hong Kong', MOP: 'Pataca de Macao',
  THB: 'Baht thaïlandais', VND: 'Dong vietnamien', KHR: 'Riel cambodgien', LAK: 'Kip laotien', MMK: 'Kyat birman',
  MYR: 'Ringgit malaisien', SGD: 'Dollar de Singapour', IDR: 'Roupie indonésienne', PHP: 'Peso philippin', BND: 'Dollar de Brunei',
  INR: 'Roupie indienne', LKR: 'Roupie srilankaise', NPR: 'Roupie népalaise', MVR: 'Rufiyaa des Maldives', BTN: 'Ngultrum du Bhoutan',
  BDT: 'Taka du Bangladesh', PKR: 'Roupie pakistanaise', AFN: 'Afghani',
  AED: 'Dirham des Émirats', SAR: 'Riyal saoudien', QAR: 'Riyal qatari', OMR: 'Rial omanais', KWD: 'Dinar koweïtien', BHD: 'Dinar de Bahreïn',
  JOD: 'Dinar jordanien', ILS: 'Shekel israélien', TRY: 'Livre turque', GEL: 'Lari géorgien', AMD: 'Dram arménien', AZN: 'Manat azerbaïdjanais',
  KZT: 'Tenge kazakh', KGS: 'Som kirghize', UZS: 'Sum ouzbek', TJS: 'Somoni tadjik', TMT: 'Manat turkmène', MNT: 'Tugrik mongol',
};

// Monnaies les plus courantes, montrées en premier.
export const DEVISES_FAVORITES = ['USD', 'EUR', 'MXN', 'GBP', 'CHF', 'JPY'];

// Spécialités culinaires selon le pays : remplacent la liste générale « Spécialité » des restos.
export const SPECIALITES_PAYS = {
  'Japon': ['Ramen', 'Sushi', 'Izakaya', 'Yakitori', 'Tempura', 'Okonomiyaki', 'Udon / soba', 'Wagyu', 'Kaiseki'],
  'Corée du Sud': ['BBQ coréen', 'Bibimbap', 'Poulet frit', 'Tteokbokki', 'Naengmyeon', 'Kimchi jjigae', 'Fruits de mer'],
  'Chine': ['Dim sum', 'Hot pot', 'Canard laqué', 'Nouilles tirées', 'Raviolis (jiaozi)', 'Cuisine du Sichuan'],
  'Taïwan': ['Soupe de nouilles au bœuf', 'Xiaolongbao', 'Bubble tea', 'Marché de nuit', 'Hot pot'],
  'Thaïlande': ['Pad thaï', 'Curry vert', 'Som tam', 'Tom yum', 'Khao soi', 'Mango sticky rice', 'Fruits de mer'],
  'Vietnam': ['Pho', 'Banh mi', 'Bun cha', 'Bun bo Hue', 'Cao lau', 'Café vietnamien', 'Fruits de mer'],
  'Cambodge': ['Amok', 'Lok lak', 'Nom banh chok', 'Kampot (poivre, crabe)'],
  'Laos': ['Laap', 'Khao piak sen', 'Sticky rice', 'Mok pa'],
  'Indonésie': ['Nasi goreng', 'Satay', 'Rendang', 'Babi guling', 'Gado-gado', 'Warung local'],
  'Malaisie': ['Nasi lemak', 'Laksa', 'Char kway teow', 'Roti canai', 'Satay'],
  'Singapour': ['Hawker centre', 'Chili crab', 'Hainanese chicken rice', 'Laksa'],
  'Philippines': ['Adobo', 'Lechon', 'Sinigang', 'Halo-halo', 'Fruits de mer'],
  'Inde': ['Curry', 'Thali', 'Biryani', 'Dosa', 'Street food (chaat)', 'Tandoori'],
  'Népal': ['Dal bhat', 'Momos', 'Thukpa', 'Newari'],
  'Sri Lanka': ['Rice & curry', 'Hoppers', 'Kottu roti', 'Fruits de mer'],
  'Canada': ['Poutine', 'Smoked meat', 'Bagels', 'Cabane à sucre', 'Fruits de mer', 'Brasserie', 'Cuisine du marché'],
  'États-Unis': ['Burger', 'BBQ', 'Pizza', 'Diner', 'Steakhouse', 'Brunch', 'Fruits de mer'],
  'Mexique': ['Tacos', 'Mole', 'Cochinita pibil', 'Ceviche', 'Tamales', 'Mezcalería'],
  'Cuba': ['Ropa vieja', 'Paladar', 'Sandwich cubain', 'Fruits de mer', 'Mojito'],
  'République dominicaine': ['La bandera', 'Mofongo', 'Sancocho', 'Fruits de mer', 'Comedor local'],
  'Costa Rica': ['Casado', 'Gallo pinto', 'Soda (resto local)', 'Ceviche', 'Café'],
  'Pérou': ['Ceviche', 'Lomo saltado', 'Nikkei', 'Anticuchos', 'Pisco sour', 'Cuisine andine'],
  'Argentine': ['Asado', 'Empanadas', 'Parrilla', 'Milanesa', 'Bar à vin (malbec)'],
  'Brésil': ['Churrascaria', 'Feijoada', 'Moqueca', 'Açaí', 'Pão de queijo'],
  'Colombie': ['Bandeja paisa', 'Arepas', 'Ajiaco', 'Café', 'Fruits tropicaux'],
  'France': ['Bistrot', 'Brasserie', 'Boulangerie', 'Fromagerie', 'Crêperie', 'Bouchon lyonnais', 'Bar à vin', 'Gastronomique'],
  'Italie': ['Pizza', 'Pâtes fraîches', 'Trattoria', 'Gelato', 'Osteria', 'Aperitivo', 'Fruits de mer'],
  'Espagne': ['Tapas', 'Paella', 'Pintxos', 'Jamón', 'Churros', 'Fruits de mer'],
  'Portugal': ['Pastel de nata', 'Bacalhau', 'Francesinha', 'Sardines grillées', 'Tasca', 'Fruits de mer'],
  'Grèce': ['Taverne', 'Gyros / souvlaki', 'Mezze', 'Poisson grillé', 'Moussaka'],
  'Royaume-Uni': ['Pub', 'Fish and chips', 'Sunday roast', 'Afternoon tea', 'Curry'],
  'Allemagne': ['Brasserie (Biergarten)', 'Currywurst', 'Schnitzel', 'Bretzel', 'Döner'],
  'Maroc': ['Tajine', 'Couscous', 'Pastilla', 'Thé à la menthe', 'Street food (médina)'],
  'Turquie': ['Kebab', 'Meze', 'Baklava', 'Pide', 'Petit-déjeuner turc'],
};
const SPECIALITES_MONDE = ['Cuisine locale', 'Plat typique', 'Fruits de mer', 'Grillades', 'Pizza', 'Burger', 'Brunch', 'Dessert'];

// Les sous-types d'un type : pour les spécialités des restos, ceux du pays choisi.
export function sousTypes(categorie, type, pays) {
  if (categorie === 'restos' && type === 'Spécialité') return SPECIALITES_PAYS[pays] || SPECIALITES_MONDE;
  return TAXONOMIE[categorie]?.types?.[type] || [];
}
