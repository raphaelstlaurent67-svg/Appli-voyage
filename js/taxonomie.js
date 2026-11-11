// Classement des endroits : catégorie > type > sous-type.
// Pour ajouter ou retirer un type ou un sous-type, il suffit de modifier cette liste.
// Les endroits déjà enregistrés gardent leurs valeurs, même si on retire un choix ici.

export const TAXONOMIE = {
  hebergement: {
    couleur: '#5b5bd6',
    nom: 'Hébergement', icone: '🛏️',
    types: {
      'Auberge': ['Dortoir', 'Chambre privée', 'Auberge festive', 'Auberge tranquille', 'Capsule'],
      'Hôtel': ['Économique', '3 étoiles', 'Boutique hôtel', '4-5 étoiles', 'Resort', 'Hôtel historique'],
      "Chez l'habitant": ['Guesthouse', 'Homestay', "Maison d'hôtes", 'Minshuku', 'Ferme'],
      'Location': ['Appartement/Airbnb', 'Maison', 'Villa privée'],
      'Traditionnel': ['Ryokan', 'Séjour au temple', 'Hanok (Corée)'],
      'Nature': ['Bungalow de plage', 'Eco-lodge', 'Camping', 'Glamping', 'Cabane dans les arbres', 'Bateau-maison'],
    },
  },
  restos: {
    couleur: '#e8590c',
    nom: 'Restos', icone: '🍜',
    types: {
      'Rue': ['Stand', 'Marché de nuit', 'Food court', 'Food truck'],
      'Restaurant': ['Local familial', 'Chaîne locale', 'International', 'Végé/végane', 'Halal', 'Gastronomique', 'Rooftop'],
      'Spécialité': ['Ramen', 'Sushi', 'BBQ coréen', 'Hot pot', 'Dim sum', 'Pho', 'Curry', 'Fruits de mer'],
      'Café': ['Café', 'Café à thème (chats…)', 'Salon de thé', 'Pâtisserie', 'Bar à jus'],
      'Expérience': ['Cours de cuisine', 'Visite gourmande', "Repas chez l'habitant", 'Dîner-croisière'],
    },
  },
  sport: {
    couleur: '#2f9e44',
    nom: 'Sport', icone: '🏃',
    types: {
      'Raquette': ['Tennis', 'Pickleball', 'Padel', 'Badminton', 'Squash', 'Ping-pong'],
      'Eau': ['Surf', 'Plongée', 'Snorkeling', 'Kayak', 'Paddle', 'Kitesurf', 'Rafting', 'Voile', 'Pêche', 'Jet ski'],
      'Montagne': ['Randonnée', 'Trek', 'Escalade', 'Vélo de montagne', 'Ski', 'Snowboard'],
      'Combat': ['Muay-thaï', 'Boxe', 'Kung-fu', 'Karaté', 'Taekwondo'],
      'Forme': ['Yoga', 'Pilates', 'Gym', 'Course', 'CrossFit'],
      'Sensations fortes': ['Zipline', "Saut à l'élastique", 'Parapente', 'Montgolfière', 'Quad', 'Karting'],
      'Autres': ['Golf', 'Équitation', 'Vélo en ville', 'Bowling'],
      'Voir un match': ['Sumo', 'Baseball', 'Soccer', 'Muay-thaï', 'Cricket'],
    },
  },
  visites: {
    couleur: '#b8860b',
    nom: 'Visites', icone: '🏛️',
    types: {
      'Culture': ['Temple', 'Pagode', 'Palais', 'Château', 'Ruines', 'Vieille ville', 'Village traditionnel'],
      'Art': ['Musée', 'Galerie', 'Statue', 'Street art', 'Architecture'],
      'Paysages': ['Point de vue', 'Montagne', 'Volcan', 'Cascade', 'Rizière', 'Lac', 'Grotte', 'Plage', 'Île'],
      'Randonnée': ['Facile', 'Moyenne', 'Difficile', 'Plusieurs jours'],
      'Animaux': ['Safari', 'Sanctuaire éthique', 'Aquarium', "Observation d'oiseaux", 'Plongée avec des animaux'],
      'Ville': ['Quartier typique', 'Marché', 'Centre commercial', 'Tour avec vue', 'Visite guidée'],
      'Excursion': ['Croisière', 'Tour en bateau', "Tour d'îles", 'Journée guidée'],
    },
  },
  experiences: {
    couleur: '#d6336c',
    nom: 'Expériences', icone: '✨',
    types: {
      'Détente': ['Spa', 'Massage', 'Onsen/bains chauds'],
      'Spirituel': ['Méditation', 'Retraite', 'Cérémonie', 'Séjour au monastère'],
      'Atelier': ['Poterie', 'Calligraphie', 'Couture', 'Batik'],
      'Famille': ["Parc d'attractions", 'Parc aquatique', 'Zoo'],
    },
  },
  nuit: {
    couleur: '#7048e8',
    nom: 'Vie nocturne', icone: '🌙',
    types: {
      'Bar relax': ['Lounge', 'Cocktails', 'Speakeasy', 'Rooftop', 'Vin', 'Whisky', 'Saké', 'Micro-brasserie', 'Bar de plage', 'Pub'],
      'Pour danser': ['Boîte de nuit', 'Club électro', 'Club hip-hop', 'Bar dansant', 'Beach party', 'Pool party'],
      'Musique': ['Musique live', 'Jazz', 'Karaoké'],
      'Local': ['Izakaya', 'Bar de ruelle', 'Pojangmacha', 'Bar à bière de rue'],
      'Spectacle': ['Cabaret', 'Théâtre traditionnel', "Marionnettes sur l'eau"],
      'Autres': ['Bar à thème', 'Bar LGBTQ+', 'Tournée des bars'],
    },
  },
  trajets: {
    couleur: '#1c7ed6',
    nom: 'Trajets', icone: '🚆',
    types: {
      'Avion': ['Low-cost', 'Régulier'],
      'Train': ['Grande vitesse', 'De nuit', 'Régional'],
      'Bus': ['VIP', 'De nuit', 'Local'],
      'Bateau': ['Ferry', 'Bateau rapide', 'Bateau privé'],
      'En ville': ['Métro', 'Taxi', 'Grab/Uber', 'Tuk-tuk', 'Moto-taxi', 'Scooter', 'Vélo'],
      'Privé': ['Chauffeur', 'Voiture de location', 'Transfert aéroport'],
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
// Modifiable dans l'écran Réglages de l'appli.
export const TAUX_PAR_DEFAUT = {
  CAD: 1, USD: 1.37, EUR: 1.5,
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

// Nom de chaque monnaie, affiché à côté de son code.
export const NOMS_DEVISES = {
  CAD: 'Dollar canadien', USD: 'Dollar américain', EUR: 'Euro',
  JPY: 'Yen japonais', KRW: 'Won sud-coréen', CNY: 'Yuan chinois', TWD: 'Dollar taïwanais', HKD: 'Dollar de Hong Kong', MOP: 'Pataca de Macao',
  THB: 'Baht thaïlandais', VND: 'Dong vietnamien', KHR: 'Riel cambodgien', LAK: 'Kip laotien', MMK: 'Kyat birman',
  MYR: 'Ringgit malaisien', SGD: 'Dollar de Singapour', IDR: 'Roupie indonésienne', PHP: 'Peso philippin', BND: 'Dollar de Brunei',
  INR: 'Roupie indienne', LKR: 'Roupie srilankaise', NPR: 'Roupie népalaise', MVR: 'Rufiyaa des Maldives', BTN: 'Ngultrum du Bhoutan',
  BDT: 'Taka du Bangladesh', PKR: 'Roupie pakistanaise', AFN: 'Afghani',
  AED: 'Dirham des Émirats', SAR: 'Riyal saoudien', QAR: 'Riyal qatari', OMR: 'Rial omanais', KWD: 'Dinar koweïtien', BHD: 'Dinar de Bahreïn',
  JOD: 'Dinar jordanien', ILS: 'Shekel israélien', TRY: 'Livre turque', GEL: 'Lari géorgien', AMD: 'Dram arménien', AZN: 'Manat azerbaïdjanais',
  KZT: 'Tenge kazakh', KGS: 'Som kirghize', UZS: 'Sum ouzbek', TJS: 'Somoni tadjik', TMT: 'Manat turkmène', MNT: 'Tugrik mongol',
};

// Monnaies des pays où tu vas le plus, montrées en premier.
export const DEVISES_FAVORITES = ['JPY', 'THB', 'KRW', 'NPR', 'PHP', 'VND'];

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
