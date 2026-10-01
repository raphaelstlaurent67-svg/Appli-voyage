// Classement des endroits : catégorie > type > sous-type.
// Pour ajouter ou retirer un type ou un sous-type, il suffit de modifier cette liste.
// Les endroits déjà enregistrés gardent leurs valeurs, même si on retire un choix ici.

export const TAXONOMIE = {
  hebergement: {
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
    nom: 'Expériences', icone: '✨',
    types: {
      'Détente': ['Spa', 'Massage', 'Onsen/bains chauds'],
      'Spirituel': ['Méditation', 'Retraite', 'Cérémonie', 'Séjour au monastère'],
      'Atelier': ['Poterie', 'Calligraphie', 'Couture', 'Batik'],
      'Famille': ["Parc d'attractions", 'Parc aquatique', 'Zoo'],
    },
  },
  nuit: {
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
};

export const PAYS = [
  'Japon', 'Corée du Sud', 'Chine', 'Taïwan', 'Hong Kong', 'Thaïlande', 'Vietnam', 'Cambodge', 'Laos',
  'Myanmar', 'Malaisie', 'Singapour', 'Indonésie', 'Philippines', 'Inde', 'Sri Lanka', 'Népal', 'Maldives',
];

// Valeur approximative de 1 unité de chaque monnaie en dollars canadiens.
// Modifiable dans l'écran Réglages de l'appli.
export const TAUX_PAR_DEFAUT = {
  CAD: 1, USD: 1.37, EUR: 1.5,
  JPY: 0.0093, KRW: 0.001, CNY: 0.19, TWD: 0.043, HKD: 0.175,
  THB: 0.041, VND: 0.000054, KHR: 0.00034, LAK: 0.000064, MMK: 0.00065,
  MYR: 0.31, SGD: 1.05, IDR: 0.000085, PHP: 0.024,
  INR: 0.016, LKR: 0.0046, NPR: 0.01, MVR: 0.089,
};

// Monnaie proposée automatiquement selon le pays choisi.
export const DEVISE_DU_PAYS = {
  'Japon': 'JPY', 'Corée du Sud': 'KRW', 'Chine': 'CNY', 'Taïwan': 'TWD', 'Hong Kong': 'HKD',
  'Thaïlande': 'THB', 'Vietnam': 'VND', 'Cambodge': 'USD', 'Laos': 'LAK', 'Myanmar': 'MMK',
  'Malaisie': 'MYR', 'Singapour': 'SGD', 'Indonésie': 'IDR', 'Philippines': 'PHP',
  'Inde': 'INR', 'Sri Lanka': 'LKR', 'Népal': 'NPR', 'Maldives': 'USD',
};

// Façons de joindre un endroit (en plus du téléphone).
export const CONTACTS = [
  ['whatsapp', 'WhatsApp'], ['email', 'Courriel'], ['site', 'Site web'], ['reservation', 'Lien de réservation'],
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['line', 'LINE'], ['wechat', 'WeChat'],
  ['kakao', 'KakaoTalk'], ['zalo', 'Zalo'], ['googleMaps', 'Lien Google Maps'],
];
