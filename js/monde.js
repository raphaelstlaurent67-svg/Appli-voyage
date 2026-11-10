// Les pays du monde par continent (noms en français), et les villes principales
// des pays hors Asie qu'on risque de visiter. Les villes d'Asie sont dans lieux.js.
// On peut toujours écrire une autre ville directement dans l'appli.

import { VILLES as VILLES_ASIE, PAYS_ASIE, trierFr } from './lieux.js';

export const CONTINENTS = {
  'Amérique du Nord': [
    'Antigua-et-Barbuda', 'Bahamas', 'Barbade', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominique',
    'États-Unis', 'Grenade', 'Guatemala', 'Haïti', 'Honduras', 'Jamaïque', 'Mexique', 'Nicaragua', 'Panama',
    'Porto Rico', 'République dominicaine', 'Saint-Christophe-et-Niévès', 'Sainte-Lucie',
    'Saint-Vincent-et-les-Grenadines', 'Salvador', 'Trinité-et-Tobago', 'Guadeloupe', 'Martinique',
  ],
  'Amérique du Sud': [
    'Argentine', 'Bolivie', 'Brésil', 'Chili', 'Colombie', 'Équateur', 'Guyana', 'Guyane', 'Paraguay', 'Pérou',
    'Suriname', 'Uruguay', 'Venezuela',
  ],
  Europe: [
    'Albanie', 'Allemagne', 'Andorre', 'Autriche', 'Belgique', 'Biélorussie', 'Bosnie-Herzégovine', 'Bulgarie',
    'Chypre', 'Croatie', 'Danemark', 'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
    'Islande', 'Italie', 'Kosovo', 'Lettonie', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macédoine du Nord',
    'Malte', 'Moldavie', 'Monaco', 'Monténégro', 'Norvège', 'Pays-Bas', 'Pologne', 'Portugal', 'Roumanie',
    'Royaume-Uni', 'Russie', 'Saint-Marin', 'Serbie', 'Slovaquie', 'Slovénie', 'Suède', 'Suisse', 'Tchéquie',
    'Ukraine', 'Vatican',
  ],
  Afrique: [
    'Afrique du Sud', 'Algérie', 'Angola', 'Bénin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroun',
    'Cap-Vert', 'Centrafrique', 'Comores', 'Congo', "Côte d'Ivoire", 'Djibouti', 'Égypte', 'Érythrée',
    'Eswatini', 'Éthiopie', 'Gabon', 'Gambie', 'Ghana', 'Guinée', 'Guinée équatoriale', 'Guinée-Bissau',
    'Kenya', 'Lesotho', 'Liberia', 'Libye', 'Madagascar', 'Malawi', 'Mali', 'Maroc', 'Maurice', 'Mauritanie',
    'Mozambique', 'Namibie', 'Niger', 'Nigeria', 'Ouganda', 'République démocratique du Congo', 'Rwanda',
    'Sao Tomé-et-Principe', 'Sénégal', 'Seychelles', 'Sierra Leone', 'Somalie', 'Soudan', 'Soudan du Sud',
    'Tanzanie', 'Tchad', 'Togo', 'Tunisie', 'Zambie', 'Zimbabwe', 'La Réunion',
  ],
  Asie: PAYS_ASIE,
  Océanie: [
    'Australie', 'Fidji', 'Îles Cook', 'Îles Marshall', 'Îles Salomon', 'Kiribati', 'Micronésie', 'Nauru',
    'Nouvelle-Calédonie', 'Nouvelle-Zélande', 'Palaos', 'Papouasie-Nouvelle-Guinée', 'Polynésie française',
    'Samoa', 'Tonga', 'Tuvalu', 'Vanuatu',
  ],
};

const VILLES_AUTRES = {
  Canada: ['Banff', 'Calgary', 'Charlevoix', 'Edmonton', 'Gaspé', 'Gatineau', 'Halifax', 'Jasper', 'Laval', 'Longueuil',
    'Mont-Tremblant', 'Montréal', 'Ottawa', 'Québec', 'Rimouski', 'Saguenay', 'Sherbrooke', 'Tadoussac', 'Toronto',
    'Trois-Rivières', 'Vancouver', 'Victoria', 'Whistler', 'Winnipeg'],
  'États-Unis': ['Boston', 'Chicago', 'Hawaï', 'Las Vegas', 'Los Angeles', 'Miami', 'La Nouvelle-Orléans', 'New York',
    'San Francisco', 'Seattle', 'Washington'],
  Mexique: ['Cancún', 'Mexico', 'Oaxaca', 'Playa del Carmen', 'Puerto Vallarta', 'Tulum'],
  Cuba: ['La Havane', 'Trinidad', 'Varadero', 'Viñales'],
  'République dominicaine': ['Punta Cana', 'Saint-Domingue', 'Samaná'],
  France: ['Biarritz', 'Bordeaux', 'Lyon', 'Marseille', 'Nice', 'Paris', 'Strasbourg', 'Toulouse'],
  Espagne: ['Barcelone', 'Grenade', 'Ibiza', 'Madrid', 'Majorque', 'Séville', 'Valence'],
  Italie: ['Florence', 'Milan', 'Naples', 'Rome', 'Sicile', 'Venise', 'Côte amalfitaine'],
  Portugal: ['Algarve', 'Lisbonne', 'Madère', 'Porto', 'Açores'],
  'Royaume-Uni': ['Édimbourg', 'Londres', 'Manchester'],
  Grèce: ['Athènes', 'Crète', 'Mykonos', 'Santorin'],
  Maroc: ['Chefchaouen', 'Essaouira', 'Fès', 'Marrakech'],
  Pérou: ['Arequipa', 'Cuzco', 'Lima', 'Machu Picchu'],
  Colombie: ['Bogota', 'Carthagène', 'Medellín'],
  Australie: ['Brisbane', 'Cairns', 'Melbourne', 'Perth', 'Sydney'],
  'Nouvelle-Zélande': ['Auckland', 'Queenstown', 'Rotorua', 'Wellington'],
};

export const VILLES_MONDE = { ...VILLES_ASIE, ...VILLES_AUTRES };

// Pays proposés : ceux du continent choisi dans Réglages, ou tous.
export function paysDuContinent(continent) {
  if (continent && CONTINENTS[continent]) return trierFr(CONTINENTS[continent]);
  return trierFr([...new Set(Object.values(CONTINENTS).flat())]);
}
