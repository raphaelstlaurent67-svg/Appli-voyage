// Idées concrètes montrées au client quand il touche une envie (« Culture et visites », etc.),
// selon le pays choisi. Chaque idée : « français|anglais ». Le client peut en cocher quelques-unes ;
// elles arrivent dans le Studio avec sa demande.
// Pour ajouter un pays : copier un bloc et changer les idées. Un pays absent reçoit les idées générales.

export const IDEES = {
  Japon: {
    visites: ['Temples de Kyoto et le Fushimi Inari|Kyoto temples and Fushimi Inari', 'Château de Himeji|Himeji Castle', 'Quartier d’Asakusa à Tokyo|Asakusa, Tokyo', 'Mémorial de la paix d’Hiroshima|Hiroshima Peace Memorial'],
    restos: ['Sushis au marché de Tsukiji|Sushi at Tsukiji market', 'Ramen dans un petit comptoir|Ramen at a tiny counter', 'Izakaya avec les gens du coin|Izakaya with locals', 'Street food d’Osaka à Dotonbori|Osaka street food in Dotonbori'],
    experiences: ['Nuit dans un ryokan traditionnel|Night in a traditional ryokan', 'Cérémonie du thé|Tea ceremony', 'Cours pour faire ses sushis|Sushi-making class', 'Combat de sumo|Sumo tournament'],
    sport: ['Ascension du mont Fuji (été)|Climbing Mount Fuji (summer)', 'Sentier Kumano Kodo|Kumano Kodo trail', 'Ski dans la poudreuse d’Hokkaido|Powder skiing in Hokkaido', 'Vélo sur la Shimanami Kaido|Cycling the Shimanami Kaido'],
    nuit: ['Ruelles de Golden Gai à Tokyo|Golden Gai alleys, Tokyo', 'Karaoké en salle privée|Private karaoke room', 'Bar à whisky japonais|Japanese whisky bar', 'Vue de nuit depuis Shibuya Sky|Night view from Shibuya Sky'],
    nature: ['Forêt de bambous d’Arashiyama|Arashiyama bamboo forest', 'Cerisiers en fleurs (fin mars, avril)|Cherry blossoms (late March, April)', 'Cerfs de Nara|Nara’s deer', 'Lacs autour du mont Fuji|Lakes around Mount Fuji'],
    detente: ['Onsen à Hakone|Onsen in Hakone', 'Plages d’Okinawa|Okinawa beaches', 'Jardins zen de Kyoto|Kyoto zen gardens', 'Village de Shirakawa-go|Shirakawa-go village'],
  },
  Thaïlande: {
    visites: ['Grand Palais et Wat Pho à Bangkok|Grand Palace and Wat Pho, Bangkok', 'Temples d’Ayutthaya|Ayutthaya temples', 'Temple blanc de Chiang Rai|White Temple, Chiang Rai', 'Vieille ville de Chiang Mai|Chiang Mai old city'],
    restos: ['Street food de Yaowarat (Chinatown)|Yaowarat street food (Chinatown)', 'Marchés de nuit de Chiang Mai|Chiang Mai night markets', 'Vrai pad thaï et som tam|Real pad thai and som tam', 'Fruits de mer sur la plage|Seafood on the beach'],
    experiences: ['Cours de cuisine thaïe|Thai cooking class', 'Refuge éthique pour éléphants|Ethical elephant sanctuary', 'Combat de muay thaï|Muay thai fight', 'Marché flottant|Floating market'],
    sport: ['Plongée à Koh Tao|Diving in Koh Tao', 'Kayak dans la baie de Phang Nga|Kayaking Phang Nga Bay', 'Escalade à Railay|Rock climbing in Railay', 'Randonnée dans les villages du Nord|Trekking northern villages'],
    nuit: ['Rooftops de Bangkok|Bangkok rooftop bars', 'Khao San Road|Khao San Road', 'Soirée sur la plage à Koh Phangan|Beach party on Koh Phangan', 'Bars à cocktails de Thonglor|Thonglor cocktail bars'],
    nature: ['Îles Phi Phi|Phi Phi Islands', 'Parc national de Khao Sok|Khao Sok National Park', 'Montagnes de Pai|Pai mountains', 'Archipel de Koh Lanta|Koh Lanta islands'],
    detente: ['Massage thaï traditionnel|Traditional Thai massage', 'Plages de Koh Samui|Koh Samui beaches', 'Hôtel en bord de mer à Krabi|Beachfront stay in Krabi', 'Retraite de yoga|Yoga retreat'],
  },
  'Corée du Sud': {
    visites: ['Palais Gyeongbokgung en hanbok|Gyeongbokgung Palace in hanbok', 'Village de Bukchon|Bukchon Hanok Village', 'Zone démilitarisée (DMZ)|Demilitarized Zone (DMZ)', 'Temples de Gyeongju|Gyeongju temples'],
    restos: ['Barbecue coréen|Korean barbecue', 'Marché de Gwangjang|Gwangjang Market', 'Poissons du marché de Jagalchi à Busan|Jagalchi fish market, Busan', 'Bibimbap à Jeonju|Bibimbap in Jeonju'],
    experiences: ['Séjour dans un temple bouddhiste|Buddhist temple stay', 'Spa coréen (jjimjilbang)|Korean spa (jjimjilbang)', 'Cours de cuisine kimchi|Kimchi-making class', 'Quartiers de la K-pop|K-pop neighbourhoods'],
    sport: ['Randonnée au mont Hallasan (Jeju)|Hiking Hallasan (Jeju)', 'Parc national de Seoraksan|Seoraksan National Park', 'Vélo le long du fleuve Han|Cycling along the Han River', 'Surf à Yangyang|Surfing in Yangyang'],
    nuit: ['Quartier de Hongdae|Hongdae nightlife', 'Itaewon|Itaewon', 'Soju dans une tente de rue (pojangmacha)|Soju in a street tent (pojangmacha)', 'Marché de nuit de Myeongdong|Myeongdong night market'],
    nature: ['Île de Jeju|Jeju Island', 'Plage de Haeundae à Busan|Haeundae Beach, Busan', 'Champs de thé de Boseong|Boseong tea fields', 'Feuillages d’automne|Autumn foliage'],
    detente: ['Village coloré de Gamcheon|Gamcheon colourful village', 'Cafés à thème de Séoul|Seoul theme cafés', 'Spa traditionnel|Traditional spa', 'Côte de Jeju|Jeju coastline'],
  },
  Vietnam: {
    visites: ['Vieille ville de Hoi An|Hoi An old town', 'Cité impériale de Hué|Hue Imperial City', 'Vieux quartier de Hanoï|Hanoi Old Quarter', 'Tunnels de Cu Chi|Cu Chi tunnels'],
    restos: ['Pho au petit matin à Hanoï|Early-morning pho in Hanoi', 'Banh mi à Hoi An|Banh mi in Hoi An', 'Café à l’œuf|Egg coffee', 'Street food de Saïgon en scooter|Saigon street food by scooter'],
    experiences: ['Croisière dans la baie d’Ha Long|Ha Long Bay cruise', 'Vêtements sur mesure à Hoi An|Tailor-made clothes in Hoi An', 'Cours de cuisine au marché|Market cooking class', 'Lanternes de la pleine lune|Full-moon lantern night'],
    sport: ['Boucle de Ha Giang à moto|Ha Giang loop by motorbike', 'Randonnée dans les rizières de Sapa|Trekking Sapa rice terraces', 'Grottes de Phong Nha|Phong Nha caves', 'Kayak dans la baie de Lan Ha|Kayaking Lan Ha Bay'],
    nuit: ['Bia hoi au coin de la rue|Street-corner bia hoi', 'Rooftops de Saïgon|Saigon rooftops', 'Rue Ta Hien à Hanoï|Ta Hien Street, Hanoi', 'Marché de nuit de Hoi An|Hoi An night market'],
    nature: ['Ninh Binh et la « baie d’Ha Long terrestre »|Ninh Binh, “Ha Long Bay on land”', 'Delta du Mékong|Mekong Delta', 'Col de Hai Van|Hai Van Pass', 'Île de Phu Quoc|Phu Quoc Island'],
    detente: ['Plages de Da Nang|Da Nang beaches', 'Resort à Phu Quoc|Resort in Phu Quoc', 'Massage aux herbes|Herbal massage', 'Bains de boue à Nha Trang|Mud baths in Nha Trang'],
  },
  Népal: {
    visites: ['Place Durbar de Katmandou|Kathmandu Durbar Square', 'Stupa de Boudhanath|Boudhanath Stupa', 'Ville médiévale de Bhaktapur|Medieval Bhaktapur', 'Lumbini, lieu de naissance de Bouddha|Lumbini, birthplace of Buddha'],
    restos: ['Momos maison|Homemade momos', 'Dal bhat dans un village|Dal bhat in a village', 'Cuisine newar à Patan|Newari food in Patan', 'Thé masala avec vue sur les montagnes|Masala tea with a mountain view'],
    experiences: ['Vol panoramique au-dessus de l’Everest|Everest scenic flight', 'Cours de méditation|Meditation course', 'Séjour chez l’habitant|Homestay', 'Cérémonie de l’aarti à Pashupatinath|Aarti ceremony at Pashupatinath'],
    sport: ['Trek du camp de base de l’Everest|Everest Base Camp trek', 'Tour des Annapurnas|Annapurna Circuit', 'Parapente à Pokhara|Paragliding in Pokhara', 'Rafting sur la Trisuli|Rafting the Trisuli'],
    nuit: ['Bars de Thamel|Thamel bars', 'Musique live à Pokhara|Live music in Pokhara', 'Lakeside de Pokhara|Pokhara lakeside', 'Rooftop face aux temples|Rooftop facing the temples'],
    nature: ['Safari au parc de Chitwan|Chitwan National Park safari', 'Lever de soleil à Sarangkot|Sunrise at Sarangkot', 'Lac Phewa|Phewa Lake', 'Vallée du Langtang|Langtang Valley'],
    detente: ['Lodge au bord du lac à Pokhara|Lakeside lodge in Pokhara', 'Yoga au pied de l’Himalaya|Yoga at the foot of the Himalayas', 'Massage ayurvédique|Ayurvedic massage', 'Village de Bandipur|Bandipur village'],
  },
  Philippines: {
    visites: ['Intramuros à Manille|Intramuros, Manila', 'Rizières de Banaue|Banaue rice terraces', 'Ville coloniale de Vigan|Colonial Vigan', 'Collines de chocolat à Bohol|Chocolate Hills, Bohol'],
    restos: ['Lechon de Cebu|Cebu lechon', 'Adobo et halo-halo|Adobo and halo-halo', 'Poissons grillés sur la plage|Grilled fish on the beach', 'Marché de Manille|Manila market'],
    experiences: ['Tour des îles en bangka à El Nido|Island hopping in El Nido', 'Rivière souterraine de Puerto Princesa|Puerto Princesa underground river', 'Tarsiers de Bohol|Bohol tarsiers', 'Fête locale (fiesta)|Local fiesta'],
    sport: ['Plongée à Coron|Diving in Coron', 'Surf à Siargao|Surfing in Siargao', 'Canyoning à Kawasan|Canyoning at Kawasan Falls', 'Nager avec les requins-baleines|Swimming with whale sharks'],
    nuit: ['Plage de Boracay au coucher du soleil|Boracay at sunset', 'Poblacion à Manille|Poblacion, Manila', 'Soirée à Siargao|Siargao nights', 'Bars de plage à El Nido|El Nido beach bars'],
    nature: ['Lagons d’El Nido|El Nido lagoons', 'Lacs de Coron|Coron lakes', 'Île de Siquijor|Siquijor Island', 'Chutes de Kawasan|Kawasan Falls'],
    detente: ['White Beach à Boracay|White Beach, Boracay', 'Bungalow sur l’eau|Overwater bungalow', 'Île privée près de Palawan|Private island near Palawan', 'Massage hilot|Hilot massage'],
  },
  Indonésie: {
    visites: ['Temple de Borobudur au lever du soleil|Borobudur at sunrise', 'Temple d’Uluwatu|Uluwatu Temple', 'Prambanan|Prambanan', 'Palais de Yogyakarta|Yogyakarta palace'],
    restos: ['Nasi goreng au warung|Nasi goreng at a warung', 'Babi guling à Ubud|Babi guling in Ubud', 'Fruits de mer à Jimbaran|Seafood at Jimbaran', 'Café de Bali|Balinese coffee'],
    experiences: ['Danse kecak au coucher du soleil|Kecak dance at sunset', 'Cérémonie dans un temple balinais|Balinese temple ceremony', 'Atelier de batik|Batik workshop', 'Dragons de Komodo|Komodo dragons'],
    sport: ['Lever de soleil sur le volcan Batur|Sunrise hike on Mount Batur', 'Surf à Canggu|Surfing in Canggu', 'Plongée à Raja Ampat|Diving in Raja Ampat', 'Snorkeling aux îles Gili|Snorkelling in the Gili Islands'],
    nuit: ['Beach clubs de Seminyak|Seminyak beach clubs', 'Soirée à Canggu|Canggu nights', 'Bars de Gili Trawangan|Gili Trawangan bars', 'Coucher de soleil à Uluwatu|Sunset at Uluwatu'],
    nature: ['Rizières de Tegallalang|Tegallalang rice terraces', 'Nusa Penida|Nusa Penida', 'Volcan Bromo|Mount Bromo', 'Chutes d’eau du nord de Bali|North Bali waterfalls'],
    detente: ['Villa avec piscine à Ubud|Pool villa in Ubud', 'Yoga à Ubud|Yoga in Ubud', 'Spa balinais|Balinese spa', 'Plages des îles Gili|Gili Islands beaches'],
  },
  France: {
    visites: ['Louvre et musée d’Orsay|Louvre and Musée d’Orsay', 'Château de Versailles|Palace of Versailles', 'Mont-Saint-Michel|Mont-Saint-Michel', 'Châteaux de la Loire|Loire Valley castles'],
    restos: ['Bistro parisien|Parisian bistro', 'Bouchon lyonnais|Lyon bouchon', 'Marché provençal|Provençal market', 'Fromagerie et boulangerie de quartier|Neighbourhood cheese shop and bakery'],
    experiences: ['Dégustation en Bourgogne ou à Bordeaux|Wine tasting in Burgundy or Bordeaux', 'Cours de pâtisserie|Pastry class', 'Croisière sur la Seine|Seine river cruise', 'Champs de lavande (juillet)|Lavender fields (July)'],
    sport: ['Randonnée à Chamonix|Hiking in Chamonix', 'Gorges du Verdon en kayak|Kayaking the Verdon Gorge', 'Vélo dans la vallée de la Loire|Cycling the Loire Valley', 'Ski dans les Alpes|Skiing in the Alps'],
    nuit: ['Bars du Marais|Bars in Le Marais', 'Cabaret parisien|Parisian cabaret', 'Bar à vin à Bordeaux|Wine bar in Bordeaux', 'Soirée sur les quais de Seine|Evening on the Seine banks'],
    nature: ['Calanques de Marseille|Calanques near Marseille', 'Côte d’Étretat|Étretat cliffs', 'Corse|Corsica', 'Villages du Luberon|Luberon villages'],
    detente: ['Côte d’Azur, Nice et Antibes|French Riviera, Nice and Antibes', 'Village de Provence|Provence village', 'Spa à Évian|Spa in Évian', 'Plages de Biarritz|Biarritz beaches'],
  },
  Italie: {
    visites: ['Colisée et Forum romain|Colosseum and Roman Forum', 'Musée des Offices à Florence|Uffizi Gallery, Florence', 'Musées du Vatican et chapelle Sixtine|Vatican Museums and Sistine Chapel', 'Pompéi|Pompeii'],
    restos: ['Vraie pizza napolitaine|Real Neapolitan pizza', 'Trattoria romaine (carbonara, cacio e pepe)|Roman trattoria (carbonara, cacio e pepe)', 'Gelato artisanal|Artisan gelato', 'Marché de Bologne|Bologna food market'],
    experiences: ['Cours pour faire ses pâtes fraîches|Fresh pasta-making class', 'Dégustation de vins en Toscane|Wine tasting in Tuscany', 'Gondole à Venise|Gondola in Venice', 'Opéra aux arènes de Vérone|Opera at the Verona Arena'],
    sport: ['Randonnée dans les Dolomites|Hiking the Dolomites', 'Sentier des Cinque Terre|Cinque Terre trail', 'Vélo en Toscane|Cycling in Tuscany', 'Kayak sur la côte amalfitaine|Kayaking the Amalfi Coast'],
    nuit: ['Aperitivo à Milan|Aperitivo in Milan', 'Trastevere à Rome|Trastevere, Rome', 'Bars à vin de Florence|Florence wine bars', 'Spritz au bord du Grand Canal|Spritz by the Grand Canal'],
    nature: ['Lac de Côme|Lake Como', 'Collines du Val d’Orcia|Val d’Orcia hills', 'Côte amalfitaine|Amalfi Coast', 'Sardaigne|Sardinia'],
    detente: ['Plages des Pouilles|Puglia beaches', 'Terme di Saturnia|Saturnia hot springs', 'Agritourisme en Toscane|Farm stay in Tuscany', 'Île de Capri|Capri Island'],
  },
  Espagne: {
    visites: ['Sagrada Família à Barcelone|Sagrada Família, Barcelona', 'Alhambra de Grenade|Alhambra, Granada', 'Musée du Prado à Madrid|Prado Museum, Madrid', 'Alcazar de Séville|Alcázar of Seville'],
    restos: ['Tournée des bars à tapas|Tapas bar crawl', 'Pintxos à Saint-Sébastien|Pintxos in San Sebastián', 'Paella à Valence|Paella in Valencia', 'Marché de la Boqueria|La Boqueria market'],
    experiences: ['Spectacle de flamenco|Flamenco show', 'Œuvres de Gaudí|Gaudí architecture', 'Cours de paella|Paella class', 'Dégustation dans la Rioja|Wine tasting in La Rioja'],
    sport: ['Chemin de Compostelle (une partie)|Camino de Santiago (a section)', 'Caminito del Rey|Caminito del Rey', 'Surf au Pays basque|Surfing in the Basque Country', 'Randonnée dans les Pyrénées|Hiking the Pyrenees'],
    nuit: ['Souper tardif et sortie à Madrid|Late dinner and night out in Madrid', 'Soirées d’Ibiza|Ibiza nights', 'Bars du quartier gothique|Gothic Quarter bars', 'Terrasses de Séville|Seville terraces'],
    nature: ['Îles Canaries|Canary Islands', 'Majorque|Mallorca', 'Picos de Europa|Picos de Europa', 'Costa Brava|Costa Brava'],
    detente: ['Plages de Majorque|Mallorca beaches', 'Bains arabes à Grenade|Arab baths in Granada', 'Village blanc d’Andalousie|White village in Andalusia', 'Ménorque|Menorca'],
  },
  Portugal: {
    visites: ['Tour de Belém à Lisbonne|Belém Tower, Lisbon', 'Palais de Sintra|Sintra palaces', 'Bibliothèque et ponts de Porto|Porto’s bookshop and bridges', 'Ville d’Évora|Évora'],
    restos: ['Pastéis de nata tout chauds|Warm pastéis de nata', 'Sardines grillées|Grilled sardines', 'Francesinha à Porto|Francesinha in Porto', 'Marché Time Out de Lisbonne|Time Out Market, Lisbon'],
    experiences: ['Soirée de fado|Fado night', 'Caves de porto|Port wine cellars', 'Tramway 28 à Lisbonne|Tram 28 in Lisbon', 'Croisière sur le Douro|Douro River cruise'],
    sport: ['Surf à Ericeira ou Nazaré|Surfing in Ericeira or Nazaré', 'Sentier des Sept Vallées suspendues|Seven Hanging Valleys trail', 'Randonnée aux Açores|Hiking in the Azores', 'Kayak dans les grottes de Benagil|Kayaking Benagil caves'],
    nuit: ['Bairro Alto à Lisbonne|Bairro Alto, Lisbon', 'Rooftops avec vue sur le Tage|Rooftops over the Tagus', 'Bars de Porto au bord de l’eau|Porto riverside bars', 'Soirée à Lagos|Nights in Lagos'],
    nature: ['Falaises de l’Algarve|Algarve cliffs', 'Vallée du Douro|Douro Valley', 'Îles des Açores|Azores islands', 'Madère|Madeira'],
    detente: ['Plages de l’Algarve|Algarve beaches', 'Quinta dans les vignes|Vineyard quinta stay', 'Village de Comporta|Comporta village', 'Piscines naturelles de Madère|Madeira natural pools'],
  },
  Grèce: {
    visites: ['Acropole d’Athènes|Acropolis of Athens', 'Monastères des Météores|Meteora monasteries', 'Delphes|Delphi', 'Palais de Knossos en Crète|Knossos Palace, Crete'],
    restos: ['Taverne au bord de l’eau|Seaside taverna', 'Souvlaki et gyros|Souvlaki and gyros', 'Poisson frais du jour|Fresh catch of the day', 'Mezzés et ouzo|Meze and ouzo'],
    experiences: ['Coucher de soleil à Oia (Santorin)|Sunset in Oia, Santorini', 'Croisière entre les îles|Island-hopping cruise', 'Cours de cuisine grecque|Greek cooking class', 'Dégustation de vins volcaniques|Volcanic wine tasting'],
    sport: ['Gorges de Samaria en Crète|Samaria Gorge, Crete', 'Plongée à Milos|Diving in Milos', 'Kayak autour de Milos|Kayaking around Milos', 'Randonnée à Santorin|Hiking Santorini'],
    nuit: ['Mykonos|Mykonos', 'Rooftops face à l’Acropole|Rooftops facing the Acropolis', 'Bars de plage à Ios|Ios beach bars', 'Psiri à Athènes|Psiri, Athens'],
    nature: ['Plage de Navagio à Zante|Navagio Beach, Zakynthos', 'Lagune de Balos|Balos Lagoon', 'Île de Milos|Milos Island', 'Péninsule du Péloponnèse|Peloponnese'],
    detente: ['Plages de Naxos|Naxos beaches', 'Hôtel troglodyte à Santorin|Cave hotel in Santorini', 'Village de Paros|Paros village', 'Corfou|Corfu'],
  },
  Islande: {
    visites: ['Cercle d’or|Golden Circle', 'Église Hallgrímskirkja|Hallgrímskirkja church', 'Parc de Þingvellir|Þingvellir National Park', 'Musées de Reykjavik|Reykjavík museums'],
    restos: ['Agneau islandais|Icelandic lamb', 'Soupe de homard|Lobster soup', 'Hot-dog de Reykjavik|Reykjavík hot dog', 'Pain cuit dans la terre chaude|Geothermal rye bread'],
    experiences: ['Aurores boréales (sept. à mars)|Northern lights (Sept. to March)', 'Grotte de glace|Ice cave', 'Observation des baleines|Whale watching', 'Plongée entre deux continents à Silfra|Snorkelling between continents at Silfra'],
    sport: ['Randonnée sur un glacier|Glacier hike', 'Trek du Laugavegur|Laugavegur trek', 'Balade à cheval islandais|Icelandic horse ride', 'Motoneige sur le glacier|Snowmobiling on a glacier'],
    nuit: ['Bars de Laugavegur à Reykjavik|Laugavegur bars, Reykjavík', 'Concert à Harpa|Concert at Harpa', 'Brasserie artisanale|Craft brewery', 'Soirée sous les aurores|Night under the northern lights'],
    nature: ['Plage de sable noir de Reynisfjara|Reynisfjara black sand beach', 'Lagune glaciaire de Jökulsárlón|Jökulsárlón glacier lagoon', 'Chutes de Skógafoss et Seljalandsfoss|Skógafoss and Seljalandsfoss waterfalls', 'Péninsule de Snæfellsnes|Snæfellsnes Peninsula'],
    detente: ['Blue Lagoon|Blue Lagoon', 'Sky Lagoon|Sky Lagoon', 'Sources chaudes naturelles|Natural hot springs', 'Bains de Mývatn|Mývatn Nature Baths'],
  },
  Mexique: {
    visites: ['Chichén Itzá|Chichén Itzá', 'Pyramides de Teotihuacan|Teotihuacan pyramids', 'Musée Frida Kahlo|Frida Kahlo Museum', 'Ruines de Tulum au bord de la mer|Tulum ruins by the sea'],
    restos: ['Tacos al pastor de rue|Street tacos al pastor', 'Mole à Oaxaca|Mole in Oaxaca', 'Marché de Mexico|Mexico City market', 'Ceviche sur la plage|Ceviche on the beach'],
    experiences: ['Baignade dans un cenote|Swimming in a cenote', 'Jour des Morts (début novembre)|Day of the Dead (early November)', 'Cours de cuisine mexicaine|Mexican cooking class', 'Lutte mexicaine (lucha libre)|Lucha libre wrestling'],
    sport: ['Plongée à Cozumel|Diving in Cozumel', 'Nager avec les tortues à Akumal|Swimming with turtles in Akumal', 'Canyon du Cuivre|Copper Canyon', 'Surf à Puerto Escondido|Surfing in Puerto Escondido'],
    nuit: ['Mezcal à Oaxaca|Mezcal in Oaxaca', 'Quartiers Roma et Condesa à Mexico|Roma and Condesa, Mexico City', 'Playa del Carmen|Playa del Carmen', 'Mariachis place Garibaldi|Mariachis at Plaza Garibaldi'],
    nature: ['Lagune de Bacalar|Bacalar Lagoon', 'Île Holbox|Holbox Island', 'Papillons monarques (hiver)|Monarch butterflies (winter)', 'Hierve el Agua|Hierve el Agua'],
    detente: ['Plages de Tulum|Tulum beaches', 'Tout-inclus sur la Riviera Maya|All-inclusive on the Riviera Maya', 'Temazcal (bain de vapeur maya)|Temazcal (Mayan steam bath)', 'Isla Mujeres|Isla Mujeres'],
  },
  Cuba: {
    visites: ['Vieille Havane|Old Havana', 'Ville coloniale de Trinidad|Colonial Trinidad', 'Cienfuegos|Cienfuegos', 'Santiago de Cuba|Santiago de Cuba'],
    restos: ['Paladar (resto familial)|Paladar (family restaurant)', 'Ropa vieja et riz aux haricots|Ropa vieja with rice and beans', 'Mojito à la Bodeguita|Mojito at La Bodeguita', 'Langouste grillée|Grilled lobster'],
    experiences: ['Balade en vieille voiture américaine|Ride in a classic American car', 'Cours de salsa|Salsa class', 'Plantation de tabac à Viñales|Tobacco farm in Viñales', 'Musique live dans la rue|Live street music'],
    sport: ['Randonnée à Viñales|Hiking in Viñales', 'Plongée à la baie des Cochons|Diving at the Bay of Pigs', 'Vélo dans la campagne|Cycling the countryside', 'Chutes d’El Nicho|El Nicho waterfalls'],
    nuit: ['Casa de la Música|Casa de la Música', 'Malecón au coucher du soleil|Malecón at sunset', 'Escaliers de la musique à Trinidad|Trinidad music steps', 'Fábrica de Arte Cubano|Fábrica de Arte Cubano'],
    nature: ['Vallée de Viñales|Viñales Valley', 'Cayo Santa María|Cayo Santa María', 'Baracoa|Baracoa', 'Parc Topes de Collantes|Topes de Collantes park'],
    detente: ['Plages de Varadero|Varadero beaches', 'Cayo Coco|Cayo Coco', 'Playa Ancón|Playa Ancón', 'Casa particular avec terrasse|Casa particular with a terrace'],
  },
  'République dominicaine': {
    visites: ['Zone coloniale de Saint-Domingue|Santo Domingo Colonial Zone', 'Altos de Chavón|Altos de Chavón', 'Fortaleza Ozama|Fortaleza Ozama', 'Trois Yeux (Los Tres Ojos)|Los Tres Ojos caves'],
    restos: ['La bandera (riz, haricots, viande)|La bandera (rice, beans, meat)', 'Poisson frit sur la plage|Fried fish on the beach', 'Mangú au déjeuner|Mangú for breakfast', 'Cacao et café locaux|Local cacao and coffee'],
    experiences: ['Baleines à Samaná (janv. à mars)|Whales in Samaná (Jan. to March)', 'Île Saona en catamaran|Saona Island by catamaran', 'Cours de merengue|Merengue class', 'Fabrique de cigares|Cigar factory'],
    sport: ['Kitesurf à Cabarete|Kitesurfing in Cabarete', 'Chutes de Damajagua|Damajagua waterfalls', 'Pico Duarte|Pico Duarte', 'Plongée à Bayahibe|Diving in Bayahibe'],
    nuit: ['Bachata dans un colmado|Bachata at a colmado', 'Bars de Cabarete|Cabarete bars', 'Zone coloniale le soir|Colonial Zone at night', 'Soirée à Punta Cana|Punta Cana nights'],
    nature: ['Playa Rincón|Playa Rincón', 'Parc Los Haitises|Los Haitises park', 'Cascade El Limón|El Limón waterfall', 'Bahía de las Águilas|Bahía de las Águilas'],
    detente: ['Tout-inclus à Punta Cana|All-inclusive in Punta Cana', 'Las Terrenas|Las Terrenas', 'Spa face à la mer|Oceanfront spa', 'Île Catalina|Catalina Island'],
  },
  'États-Unis': {
    visites: ['Statue de la Liberté et musées de New York|Statue of Liberty and New York museums', 'Grand Canyon|Grand Canyon', 'Golden Gate à San Francisco|Golden Gate, San Francisco', 'Musées Smithsonian à Washington|Smithsonian museums, Washington'],
    restos: ['Pizza new-yorkaise|New York pizza', 'Barbecue au Texas|Texas barbecue', 'Cuisine cajun à La Nouvelle-Orléans|Cajun food in New Orleans', 'Food trucks de Los Angeles|Los Angeles food trucks'],
    experiences: ['Comédie musicale à Broadway|Broadway musical', 'Match de la NBA ou de la NFL|NBA or NFL game', 'Studios de cinéma à Hollywood|Hollywood film studios', 'Route 66|Route 66'],
    sport: ['Parc de Yosemite|Yosemite National Park', 'Randonnée à Zion|Hiking in Zion', 'Surf en Californie|Surfing in California', 'Ski au Colorado|Skiing in Colorado'],
    nuit: ['Jazz à La Nouvelle-Orléans|Jazz in New Orleans', 'Spectacle à Las Vegas|Show in Las Vegas', 'Rooftops de Manhattan|Manhattan rooftops', 'Bars country à Nashville|Country bars in Nashville'],
    nature: ['Parc de Yellowstone|Yellowstone', 'Côte de Big Sur|Big Sur coast', 'Monument Valley|Monument Valley', 'Hawaï|Hawaii'],
    detente: ['Plages de Miami|Miami beaches', 'Keys de Floride|Florida Keys', 'Vignobles de Napa Valley|Napa Valley vineyards', 'Spa à Palm Springs|Spa in Palm Springs'],
  },
  Canada: {
    visites: ['Vieux-Québec|Old Quebec', 'Colline du Parlement à Ottawa|Parliament Hill, Ottawa', 'Chutes du Niagara|Niagara Falls', 'Stanley Park à Vancouver|Stanley Park, Vancouver'],
    restos: ['Cabane à sucre|Sugar shack', 'Smoked meat à Montréal|Montreal smoked meat', 'Homard des Maritimes|Maritime lobster', 'Sushis de Vancouver|Vancouver sushi'],
    experiences: ['Observation des baleines à Tadoussac|Whale watching in Tadoussac', 'Ours polaires à Churchill|Polar bears in Churchill', 'Train à travers les Rocheuses|Train through the Rockies', 'Festival de Montréal|Montreal festival'],
    sport: ['Lac Louise et Moraine à Banff|Lake Louise and Moraine Lake, Banff', 'Ski à Whistler|Skiing in Whistler', 'Canot dans le parc Algonquin|Canoeing in Algonquin Park', 'Sentier Cabot à Cap-Breton|Cabot Trail, Cape Breton'],
    nuit: ['Boulevard Saint-Laurent à Montréal|Saint-Laurent Boulevard, Montreal', 'Distillerie de Toronto|Toronto’s Distillery District', 'Pubs de St. John’s|St. John’s pubs', 'Microbrasseries de Québec|Quebec City microbreweries'],
    nature: ['Rocheuses canadiennes|Canadian Rockies', 'Île de Vancouver|Vancouver Island', 'Gros-Morne à Terre-Neuve|Gros Morne, Newfoundland', 'Fjord du Saguenay|Saguenay Fjord'],
    detente: ['Spa nordique|Nordic spa', 'Îles de la Madeleine|Magdalen Islands', 'Chalet au bord d’un lac|Lakeside cabin', 'Sources chaudes de Banff|Banff hot springs'],
  },
  'Costa Rica': {
    visites: ['Volcan Arenal|Arenal Volcano', 'San José et son théâtre national|San José and its National Theatre', 'Volcan Poás|Poás Volcano', 'Ville de Liberia|Liberia'],
    restos: ['Gallo pinto au déjeuner|Gallo pinto for breakfast', 'Casado dans une soda|Casado at a soda', 'Fruits tropicaux|Tropical fruit', 'Visite de plantation de café|Coffee farm tour'],
    experiences: ['Tyrolienne dans la canopée|Canopy zip-line', 'Ponts suspendus de Monteverde|Monteverde hanging bridges', 'Tortues qui pondent à Tortuguero|Nesting turtles in Tortuguero', 'Observation de paresseux|Sloth spotting'],
    sport: ['Surf à Tamarindo|Surfing in Tamarindo', 'Rafting sur la Pacuare|Rafting the Pacuare', 'Randonnée au Corcovado|Hiking in Corcovado', 'Canyoning à La Fortuna|Canyoning in La Fortuna'],
    nuit: ['Tamarindo le soir|Tamarindo nights', 'Bars de plage à Santa Teresa|Santa Teresa beach bars', 'Puerto Viejo et sa musique reggae|Puerto Viejo reggae', 'Barrio Escalante à San José|Barrio Escalante, San José'],
    nature: ['Parc Manuel Antonio|Manuel Antonio park', 'Rivière Celeste|Río Celeste', 'Forêt de nuages de Monteverde|Monteverde cloud forest', 'Péninsule d’Osa|Osa Peninsula'],
    detente: ['Sources chaudes d’Arenal|Arenal hot springs', 'Plages de Nosara|Nosara beaches', 'Retraite de yoga à Santa Teresa|Yoga retreat in Santa Teresa', 'Écolodge dans la jungle|Jungle eco-lodge'],
  },
  Pérou: {
    visites: ['Machu Picchu|Machu Picchu', 'Cusco et la Vallée sacrée|Cusco and the Sacred Valley', 'Centre historique de Lima|Historic Lima', 'Lignes de Nazca|Nazca Lines'],
    restos: ['Ceviche à Lima|Ceviche in Lima', 'Grande table de Lima (Central, Maido)|Fine dining in Lima (Central, Maido)', 'Lomo saltado|Lomo saltado', 'Marché de San Pedro à Cusco|San Pedro market, Cusco'],
    experiences: ['Île flottante des Uros (lac Titicaca)|Uros floating islands, Lake Titicaca', 'Cours de pisco sour|Pisco sour class', 'Village de tisserands|Weaving village', 'Train vers le Machu Picchu|Train to Machu Picchu'],
    sport: ['Chemin de l’Inca|Inca Trail', 'Montagne arc-en-ciel|Rainbow Mountain', 'Trek du Salkantay|Salkantay trek', 'Sandboard à Huacachina|Sandboarding in Huacachina'],
    nuit: ['Barranco à Lima|Barranco, Lima', 'Bars à pisco|Pisco bars', 'Miraflores le soir|Miraflores at night', 'Cusco la nuit|Cusco nightlife'],
    nature: ['Canyon de Colca et les condors|Colca Canyon and condors', 'Amazonie à Puerto Maldonado|Amazon near Puerto Maldonado', 'Lac Titicaca|Lake Titicaca', 'Oasis de Huacachina|Huacachina oasis'],
    detente: ['Lodge dans la Vallée sacrée|Sacred Valley lodge', 'Plages de Máncora|Máncora beaches', 'Bains thermaux d’Aguas Calientes|Aguas Calientes hot springs', 'Paracas et îles Ballestas|Paracas and Ballestas Islands'],
  },
  Maroc: {
    visites: ['Médina de Fès|Fez medina', 'Jardin Majorelle à Marrakech|Majorelle Garden, Marrakech', 'Mosquée Hassan II à Casablanca|Hassan II Mosque, Casablanca', 'Kasbah d’Aït-Ben-Haddou|Aït Benhaddou kasbah'],
    restos: ['Tajine et couscous du vendredi|Tagine and Friday couscous', 'Place Jemaa el-Fna le soir|Jemaa el-Fnaa square at night', 'Thé à la menthe sur une terrasse|Mint tea on a terrace', 'Pastilla de Fès|Fez pastilla'],
    experiences: ['Nuit dans le désert à Merzouga|Night in the desert at Merzouga', 'Hammam traditionnel|Traditional hammam', 'Cours de cuisine marocaine|Moroccan cooking class', 'Souks et artisans|Souks and artisans'],
    sport: ['Randonnée dans l’Atlas|Hiking the Atlas', 'Dromadaire dans les dunes|Camel ride in the dunes', 'Surf à Taghazout|Surfing in Taghazout', 'Mont Toubkal|Mount Toubkal'],
    nuit: ['Rooftops de Marrakech|Marrakech rooftops', 'Soirée gnaoua à Essaouira|Gnawa night in Essaouira', 'Bars de Casablanca|Casablanca bars', 'Feu de camp dans le désert|Desert campfire'],
    nature: ['Chefchaouen, la ville bleue|Chefchaouen, the blue city', 'Gorges du Todra|Todra Gorge', 'Cascades d’Ouzoud|Ouzoud Falls', 'Vallée de l’Ourika|Ourika Valley'],
    detente: ['Riad avec patio à Marrakech|Riad with a patio in Marrakech', 'Plage d’Essaouira|Essaouira beach', 'Spa et hammam de luxe|Luxury spa and hammam', 'Oasis de Skoura|Skoura oasis'],
  },
  Égypte: {
    visites: ['Pyramides de Gizeh et le Sphinx|Pyramids of Giza and the Sphinx', 'Grand Musée égyptien|Grand Egyptian Museum', 'Temples de Louxor et Karnak|Luxor and Karnak temples', 'Abou Simbel|Abu Simbel'],
    restos: ['Koshari au Caire|Koshari in Cairo', 'Falafels (ta’ameya)|Falafel (ta’ameya)', 'Souper sur le Nil|Dinner on the Nile', 'Bazar Khan el-Khalili|Khan el-Khalili bazaar'],
    experiences: ['Croisière sur le Nil|Nile cruise', 'Montgolfière à Louxor|Hot-air balloon in Luxor', 'Felouque au coucher du soleil|Felucca at sunset', 'Vallée des Rois|Valley of the Kings'],
    sport: ['Plongée dans la mer Rouge|Diving in the Red Sea', 'Mont Sinaï au lever du soleil|Mount Sinai at sunrise', 'Kitesurf à El Gouna|Kitesurfing in El Gouna', 'Quad dans le désert|Desert quad biking'],
    nuit: ['Spectacle son et lumière aux pyramides|Sound and light show at the pyramids', 'Café traditionnel au Caire|Traditional café in Cairo', 'Soirée à Charm el-Cheikh|Sharm el-Sheikh nights', 'Danse soufie (tanoura)|Sufi dance (tanoura)'],
    nature: ['Désert Blanc|White Desert', 'Oasis de Siwa|Siwa Oasis', 'Village nubien à Assouan|Nubian village in Aswan', 'Récifs de Ras Mohammed|Ras Mohammed reefs'],
    detente: ['Plages de Hurghada|Hurghada beaches', 'Resort à Charm el-Cheikh|Resort in Sharm el-Sheikh', 'Dahab|Dahab', 'Hôtel au bord du Nil à Assouan|Nile-side hotel in Aswan'],
  },
};

// Idées générales, quand le pays n'est pas encore choisi (ou pas dans la liste).
export const IDEES_GENERALES = {
  visites: ['Sites classés à l’UNESCO|UNESCO World Heritage sites', 'Musées incontournables|Must-see museums', 'Visite guidée de la vieille ville|Guided old town tour', 'Temples, églises et monuments|Temples, churches and monuments'],
  restos: ['Street food et marchés|Street food and markets', 'Restos où mangent les gens du coin|Restaurants where locals eat', 'Une grande table pour une occasion|A fine dining night out', 'Cours de cuisine locale|Local cooking class'],
  experiences: ['Spectacle traditionnel|Traditional show', 'Atelier avec un artisan|Workshop with an artisan', 'Séjour chez l’habitant|Homestay', 'Festival local|Local festival'],
  sport: ['Randonnée d’une journée|Day hike', 'Plongée ou snorkeling|Diving or snorkelling', 'Surf ou kayak|Surfing or kayaking', 'Vélo|Cycling'],
  nuit: ['Bars sur les toits|Rooftop bars', 'Musique live|Live music', 'Bars à cocktails|Cocktail bars', 'Boîte de nuit|Nightclub'],
  nature: ['Parcs nationaux|National parks', 'Plages sauvages|Wild beaches', 'Volcans et montagnes|Volcanoes and mountains', 'Observation des animaux|Wildlife watching'],
  detente: ['Journées à la plage|Beach days', 'Spa et massages|Spa and massages', 'Sources chaudes|Hot springs', 'Hôtel avec piscine|Hotel with a pool'],
};

const partie = (x, langue) => { const [fr, en] = x.split('|'); return langue === 'en' ? en || fr : fr; };

// Les idées d'une envie pour un pays : [{ fr, texte }] (fr : ce qui est gardé ; texte : ce qu'on affiche).
export function ideesPour(pays, envie, langue = 'fr') {
  const liste = (pays && IDEES[pays]?.[envie]) || IDEES_GENERALES[envie] || [];
  return liste.map((x) => ({ fr: partie(x, 'fr'), texte: partie(x, langue) }));
}

export const aDesIdees = (pays) => Boolean(IDEES[pays]);

// Traduit une idée gardée (en français) dans l'autre langue, pour l'affichage.
export function traduireIdee(fr, langue) {
  if (langue !== 'en') return fr;
  for (const bloc of [...Object.values(IDEES), IDEES_GENERALES]) {
    for (const liste of Object.values(bloc)) for (const x of liste) if (x.split('|')[0] === fr) return partie(x, 'en');
  }
  return fr;
}
