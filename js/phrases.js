// Phrases utiles sur place, par langue : le texte, et comment le dire (prononciation à la française).
// La voix du téléphone peut aussi les lire (bouton haut-parleur), sans internet sur iPhone.

export const PHRASES = [
  ['bonjour', 'Bonjour'],
  ['merci', 'Merci'],
  ['svp', 'S’il vous plaît'],
  ['pardon', 'Excusez-moi'],
  ['langue', 'Parlez-vous anglais ?'],
  ['agence', 'Je travaille pour une agence de voyage du Québec.'],
  ['recommande', 'Je recommande des endroits à mes clients.'],
  ['numero', 'Puis-je avoir votre numéro de téléphone ?'],
  ['whatsapp', 'Avez-vous WhatsApp ?'],
  ['carte', 'Avez-vous une carte d’affaires ?'],
  ['proprio', 'Puis-je parler au propriétaire ?'],
  ['chambre', 'Puis-je voir une chambre ?'],
  ['photo', 'Puis-je prendre une photo ?'],
  ['prix', 'Combien ça coûte ?'],
  ['delicieux', 'C’était délicieux !'],
  ['aurevoir', 'Au revoir'],
];

export const PITCH_FR = 'Bonjour ! Je travaille pour une agence de voyage du Québec, au Canada. Je visite les endroits en personne pour les recommander à mes clients. Puis-je avoir votre numéro de téléphone ou WhatsApp ? J’aimerais vous envoyer des clients.';

export const LANGUES = {
  en: {
    nom: 'Anglais', voix: 'en-US',
    phrases: {
      bonjour: ['Hello', 'hélo'],
      merci: ['Thank you', 'tank you'],
      svp: ['Please', 'pliz'],
      pardon: ['Excuse me', 'ekskiouz mi'],
      langue: ['Do you speak French?', 'dou you spik frènnch'],
      agence: ['I work for a travel agency from Quebec.', 'aï weurk for a travel éjennsi from kouibèk'],
      recommande: ['I recommend places to my clients.', 'aï rékomennd pléssiz tou maï klaïennts'],
      numero: ['Could I have your phone number?', 'koud aï hav yor fone nomber'],
      whatsapp: ['Do you have WhatsApp?', 'dou you hav ouatsap'],
      carte: ['Do you have a business card?', 'dou you hav a bizness kard'],
      proprio: ['Could I speak to the owner?', 'koud aï spik tou zi ôneur'],
      chambre: ['Could I see a room?', 'koud aï si a roum'],
      photo: ['May I take a photo?', 'méi aï téik a foto'],
      prix: ['How much is it?', 'haou motch iz it'],
      delicieux: ['It was delicious!', 'it ouaz dilicheuss'],
      aurevoir: ['Goodbye!', 'goudbaï'],
    },
    pitch: 'Hello! I work for a travel agency from Quebec, Canada. I visit places in person to recommend them to my clients. Could I have your phone number or WhatsApp? I would like to send you clients.',
  },
  es: {
    nom: 'Espagnol', voix: 'es-ES',
    phrases: {
      bonjour: ['Hola', 'ola'],
      merci: ['Gracias', 'grassias'],
      svp: ['Por favor', 'por fabor'],
      pardon: ['Disculpe', 'diskoulpé'],
      langue: ['¿Habla inglés?', 'abla inglèss'],
      agence: ['Trabajo para una agencia de viajes de Quebec.', 'trabarro para ouna arrénnssia dé biarrèss dé kébèk'],
      recommande: ['Recomiendo lugares a mis clientes.', 'rékomiénndo lougarèss a miss kliénntèss'],
      numero: ['¿Me puede dar su número de teléfono?', 'mé pouédé dar sou nouméro dé téléfono'],
      whatsapp: ['¿Tiene WhatsApp?', 'tiéné ouatsap'],
      carte: ['¿Tiene una tarjeta de presentación?', 'tiéné ouna tarrèta dé préssénntassionn'],
      proprio: ['¿Puedo hablar con el dueño?', 'pouédo ablar konn èl douégno'],
      chambre: ['¿Puedo ver una habitación?', 'pouédo bèr ouna abitassionn'],
      photo: ['¿Puedo tomar una foto?', 'pouédo tomar ouna foto'],
      prix: ['¿Cuánto cuesta?', 'kouannto kouèsta'],
      delicieux: ['¡Estaba delicioso!', 'èstaba délissioso'],
      aurevoir: ['¡Adiós!', 'adioss'],
    },
    pitch: '¡Hola! Trabajo para una agencia de viajes de Quebec, en Canadá. Visito los lugares en persona para recomendarlos a mis clientes. ¿Me puede dar su número de teléfono o WhatsApp? Me gustaría enviarle clientes.',
  },
  pt: {
    nom: 'Portugais', voix: 'pt-BR',
    phrases: {
      bonjour: ['Olá', 'ola'],
      merci: ['Obrigado', 'obrigadou'],
      svp: ['Por favor', 'pour favor'],
      pardon: ['Com licença', 'kõ lissénnssa'],
      langue: ['Fala inglês?', 'fala inglêss'],
      agence: ['Trabalho para uma agência de viagens do Quebec.', 'trabalyou para ouma ajénnssia dji viajẽss dou kébèk'],
      recommande: ['Recomendo lugares aos meus clientes.', 'rékomẽdou lougarèss aouss méouss kliẽtchiss'],
      numero: ['Pode me dar o seu número de telefone?', 'podji mi dar ou séou noumérou dji téléfoni'],
      whatsapp: ['Tem WhatsApp?', 'tẽ ouatsap'],
      carte: ['Tem um cartão de visita?', 'tẽ oum kartão dji vizita'],
      proprio: ['Posso falar com o dono?', 'posso falar kõ ou donou'],
      chambre: ['Posso ver um quarto?', 'posso vér oum kouartou'],
      photo: ['Posso tirar uma foto?', 'posso tchirar ouma foto'],
      prix: ['Quanto custa?', 'kouanntou kousta'],
      delicieux: ['Estava delicioso!', 'ichtava délissiozou'],
      aurevoir: ['Tchau!', 'tchaou'],
    },
    pitch: 'Olá! Trabalho para uma agência de viagens do Quebec, no Canadá. Visito os lugares pessoalmente para recomendá-los aos meus clientes. Pode me dar o seu número de telefone ou WhatsApp? Gostaria de lhe enviar clientes.',
  },
  it: {
    nom: 'Italien', voix: 'it-IT',
    phrases: {
      bonjour: ['Buongiorno', 'bouonn-djorno'],
      merci: ['Grazie', 'gratsié'],
      svp: ['Per favore', 'pèr favoré'],
      pardon: ['Mi scusi', 'mi skouzi'],
      langue: ['Parla inglese?', 'parla innglézé'],
      agence: ['Lavoro per un’agenzia di viaggi del Québec.', 'lavoro pèr ounadjenntsia di viaddji dèl kébèk'],
      recommande: ['Consiglio dei posti ai miei clienti.', 'konnsilyo déi posti aï miéi kliènnti'],
      numero: ['Posso avere il suo numero di telefono?', 'posso avéré il souo nouméro di téléfono'],
      whatsapp: ['Ha WhatsApp?', 'a ouatsap'],
      carte: ['Ha un biglietto da visita?', 'a oun bilyétto da vizita'],
      proprio: ['Posso parlare con il proprietario?', 'posso parlaré konn il propriétario'],
      chambre: ['Posso vedere una camera?', 'posso védéré ouna kaméra'],
      photo: ['Posso fare una foto?', 'posso faré ouna foto'],
      prix: ['Quanto costa?', 'kouannto kosta'],
      delicieux: ['Era delizioso!', 'éra délitsiozo'],
      aurevoir: ['Arrivederci!', 'arrivédèrtchi'],
    },
    pitch: 'Buongiorno! Lavoro per un’agenzia di viaggi del Québec, in Canada. Visito i posti di persona per consigliarli ai miei clienti. Posso avere il suo numero di telefono o WhatsApp? Vorrei mandarle dei clienti.',
  },
  de: {
    nom: 'Allemand', voix: 'de-DE',
    phrases: {
      bonjour: ['Guten Tag', 'gouten tak'],
      merci: ['Danke', 'danké'],
      svp: ['Bitte', 'bité'],
      pardon: ['Entschuldigung', 'ènntchouldigoung'],
      langue: ['Sprechen Sie Englisch?', 'chprèchen zi èngliche'],
      agence: ['Ich arbeite für ein Reisebüro aus Québec.', 'ich arbaïté fur aïn raïzébuero aouss kébèk'],
      recommande: ['Ich empfehle meinen Kunden Orte.', 'ich èmpfélé maïnen kounden orté'],
      numero: ['Kann ich Ihre Telefonnummer haben?', 'kann ich iré téléfonnoumer haben'],
      whatsapp: ['Haben Sie WhatsApp?', 'haben zi ouatsap'],
      carte: ['Haben Sie eine Visitenkarte?', 'haben zi aïné vizitènkarté'],
      proprio: ['Kann ich mit dem Besitzer sprechen?', 'kann ich mit dèm bézitser chprèchen'],
      chambre: ['Kann ich ein Zimmer sehen?', 'kann ich aïn tsimmer zéen'],
      photo: ['Darf ich ein Foto machen?', 'darf ich aïn foto marren'],
      prix: ['Was kostet das?', 'vass kostet dass'],
      delicieux: ['Es war köstlich!', 'èss var keustlich'],
      aurevoir: ['Auf Wiedersehen!', 'aouf vidèrzéen'],
    },
    pitch: 'Guten Tag! Ich arbeite für ein Reisebüro aus Québec in Kanada. Ich besuche Orte persönlich, um sie meinen Kunden zu empfehlen. Kann ich Ihre Telefonnummer oder WhatsApp haben? Ich würde Ihnen gern Kunden schicken.',
  },
  el: {
    nom: 'Grec', voix: 'el-GR',
    phrases: {
      bonjour: ['Γεια σας', 'ya sass'],
      merci: ['Ευχαριστώ', 'éfkharisto'],
      svp: ['Παρακαλώ', 'parakalo'],
      pardon: ['Συγγνώμη', 'signomi'],
      langue: ['Μιλάτε αγγλικά;', 'milaté anglika'],
      agence: ['Δουλεύω για ένα ταξιδιωτικό γραφείο από το Κεμπέκ.', 'doulévo ya éna taxidiotiko grafio apo to kébèk'],
      recommande: ['Προτείνω μέρη στους πελάτες μου.', 'protino méri stouss pélatèss mou'],
      numero: ['Μπορώ να έχω το τηλέφωνό σας;', 'boro na ékho to tiléfono sass'],
      whatsapp: ['Έχετε WhatsApp;', 'ékhété ouatsap'],
      carte: ['Έχετε κάρτα;', 'ékhété karta'],
      proprio: ['Μπορώ να μιλήσω με τον ιδιοκτήτη;', 'boro na milisso mé tonn idioktiti'],
      chambre: ['Μπορώ να δω ένα δωμάτιο;', 'boro na dho éna dhomatio'],
      photo: ['Μπορώ να βγάλω μια φωτογραφία;', 'boro na vgalo mia fotografia'],
      prix: ['Πόσο κοστίζει;', 'posso kostizi'],
      delicieux: ['Ήταν πεντανόστιμο!', 'itann pénntanostimo'],
      aurevoir: ['Αντίο!', 'adio'],
    },
    pitch: 'Γεια σας! Δουλεύω για ένα ταξιδιωτικό γραφείο από το Κεμπέκ, στον Καναδά. Επισκέπτομαι μέρη για να τα προτείνω στους πελάτες μου. Μπορώ να έχω το τηλέφωνό σας ή το WhatsApp σας; Θα ήθελα να σας στείλω πελάτες.',
  },
  ja: {
    nom: 'Japonais', voix: 'ja-JP',
    phrases: {
      bonjour: ['こんにちは', 'konnitchiwa'],
      merci: ['ありがとうございます', 'arigatô gozaïmass'],
      svp: ['お願いします', 'onégaï chimass'],
      pardon: ['すみません', 'soumimassèn'],
      langue: ['英語を話せますか？', 'éigo o hanassémass ka'],
      agence: ['ケベックの旅行会社で働いています。', 'kébèkkou no ryokô gaïcha dé hataraïté imass'],
      recommande: ['お客様にお店を紹介しています。', 'okyakousama ni omisé o chôkaï chité imass'],
      numero: ['電話番号を教えていただけますか？', 'dennwa bangô o ochiété itadakémass ka'],
      whatsapp: ['LINEはありますか？', 'raïnn wa arimass ka'],
      carte: ['名刺はありますか？', 'méichi wa arimass ka'],
      proprio: ['オーナーさんと話せますか？', 'ônâ-sann to hanassémass ka'],
      chambre: ['部屋を見せていただけますか？', 'héya o missété itadakémass ka'],
      photo: ['写真を撮ってもいいですか？', 'chachinn o totté mo ii dèss ka'],
      prix: ['いくらですか？', 'ikoura dèss ka'],
      delicieux: ['とても美味しかったです！', 'totémo oïchikatta dèss'],
      aurevoir: ['さようなら', 'sayônara'],
    },
    pitch: 'こんにちは！カナダ・ケベックの旅行会社で働いています。お客様におすすめするために、実際にお店を訪れています。電話番号かLINEを教えていただけますか？お客様をご紹介したいです。',
  },
};

// Langue parlée selon le pays (anglais par défaut ; null = on parle français).
const PAR_PAYS = {
  es: ['Espagne', 'Mexique', 'Cuba', 'République dominicaine', 'Costa Rica', 'Pérou', 'Argentine', 'Colombie', 'Chili', 'Uruguay', 'Bolivie', 'Équateur', 'Guatemala', 'Panama', 'Honduras', 'Nicaragua', 'Salvador', 'Paraguay', 'Venezuela', 'Porto Rico'],
  pt: ['Portugal', 'Brésil', 'Cap-Vert'],
  it: ['Italie', 'Saint-Marin', 'Vatican'],
  de: ['Allemagne', 'Autriche', 'Liechtenstein'],
  el: ['Grèce', 'Chypre'],
  ja: ['Japon'],
  fr: ['France', 'Belgique', 'Monaco', 'Luxembourg', 'Guadeloupe', 'Martinique', 'Polynésie française', 'Sénégal', 'Tunisie', 'Maroc', 'Haïti', 'Canada'],
};
export function langueDuPays(pays) {
  for (const [l, liste] of Object.entries(PAR_PAYS)) if (liste.includes(pays)) return l;
  return 'en';
}
export const voixPays = (langue, pays) => (langue === 'es' && pays !== 'Espagne' ? 'es-MX' : langue === 'pt' && pays === 'Portugal' ? 'pt-PT' : LANGUES[langue]?.voix || 'en-US');

// Numéros d'urgence (seulement ceux qu'on connaît bien).
const EUROPE_112 = ['France', 'Belgique', 'Luxembourg', 'Monaco', 'Espagne', 'Portugal', 'Italie', 'Grèce', 'Allemagne', 'Autriche', 'Pays-Bas', 'Irlande', 'Finlande', 'Malte', 'Chypre', 'Croatie', 'Slovénie', 'Slovaquie', 'Estonie', 'Lettonie', 'Lituanie', 'Suisse', 'Islande', 'Norvège', 'Suède', 'Danemark', 'Tchéquie', 'Hongrie', 'Pologne', 'Roumanie', 'Bulgarie', 'Guadeloupe', 'Martinique'];
export function urgences(pays) {
  if (['Canada', 'États-Unis', 'Mexique', 'République dominicaine', 'Costa Rica', 'Panama', 'Porto Rico'].includes(pays)) return [['Urgences', '911']];
  if (EUROPE_112.includes(pays)) return [['Urgences', '112']];
  if (pays === 'Royaume-Uni') return [['Urgences', '999']];
  if (pays === 'Japon') return [['Police', '110'], ['Ambulance', '119']];
  if (pays === 'Australie') return [['Urgences', '000']];
  if (pays === 'Nouvelle-Zélande') return [['Urgences', '111']];
  return [];
}
