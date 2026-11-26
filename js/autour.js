// « Tu es ici ? » : les endroits connus autour de la position, d'après OpenStreetMap (gratuit, sans compte).
// On ne devine rien : on propose les endroits qui existent vraiment à quelques mètres,
// et Raph touche le bon. Seules les infos présentes dans OpenStreetMap sont remplies.

const SERVEURS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Étiquette OpenStreetMap → [catégorie, type, sous-type] de l'appli.
const CORRESP = {
  tourism: {
    hotel: ['hebergement', 'Hôtel'], motel: ['hebergement', 'Hôtel', 'Économique'], hostel: ['hebergement', 'Auberge'],
    guest_house: ['hebergement', "Chez l'habitant", "Maison d'hôtes"], apartment: ['hebergement', 'Location', 'Appartement'],
    chalet: ['hebergement', 'Location', 'Chalet'], camp_site: ['hebergement', 'Nature', 'Camping'],
    museum: ['visites', 'Art', 'Musée'], gallery: ['visites', 'Art', 'Galerie'], viewpoint: ['visites', 'Paysages', 'Point de vue'],
    attraction: ['visites'], zoo: ['experiences', 'Famille', 'Zoo'], aquarium: ['visites', 'Animaux', 'Aquarium'],
    theme_park: ['experiences', 'Famille', "Parc d'attractions"],
  },
  amenity: {
    restaurant: ['restos', 'Restaurant'], cafe: ['restos', 'Café', 'Café'], fast_food: ['restos', 'Rue'], food_court: ['restos', 'Rue', 'Food court'],
    ice_cream: ['restos', 'Café'], bar: ['nuit', 'Bar'], pub: ['nuit', 'Bar', 'Pub'], biergarten: ['nuit', 'Bar', 'Microbrasserie'],
    nightclub: ['nuit', 'Pour danser', 'Boîte de nuit'], theatre: ['nuit', 'Spectacle', 'Théâtre'], spa: ['experiences', 'Détente', 'Spa'],
    marketplace: ['visites', 'Ville', 'Marché'], place_of_worship: ['visites', 'Culture'],
  },
  shop: { bakery: ['restos', 'Café', 'Boulangerie'], pastry: ['restos', 'Café', 'Pâtisserie'] },
  leisure: {
    park: ['visites', 'Paysages'], beach_resort: ['visites', 'Paysages', 'Plage'], water_park: ['experiences', 'Famille', 'Parc aquatique'],
    sports_centre: ['sport'], fitness_centre: ['sport', 'Forme', 'Gym'], golf_course: ['sport', 'Autres', 'Golf'], spa: ['experiences', 'Détente', 'Spa'],
  },
  historic: { castle: ['visites', 'Culture', 'Château'], ruins: ['visites', 'Culture', 'Ruines'], monument: ['visites', 'Culture'], memorial: ['visites', 'Culture'] },
  natural: { beach: ['visites', 'Paysages', 'Plage'], waterfall: ['visites', 'Paysages', 'Cascade'], peak: ['visites', 'Paysages', 'Montagne'] },
};

export function categorieOSM(tags) {
  for (const [cle, valeurs] of Object.entries(CORRESP)) {
    const v = tags[cle];
    if (v && valeurs[v]) return valeurs[v];
  }
  if (tags.historic) return ['visites', 'Culture'];
  return null;
}

const distance = (a, b, c, d) => {
  const R = 6371000; const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r); const y = (c - a) * r;
  return Math.round(Math.sqrt(x * x + y * y) * R);
};

function adresse(t) {
  const rue = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  return [rue, t['addr:city'] || t['addr:suburb']].filter(Boolean).join(', ');
}
function site(t) {
  const s = t.website || t['contact:website'] || t.url || '';
  return /^https?:\/\//i.test(s) ? s : s ? `https://${s}` : '';
}

// Les endroits nommés dans un rayon (en mètres), du plus proche au plus loin.
export async function endroitsAutour(lat, lng, rayon = 60, { signal } = {}) {
  const filtres = Object.keys(CORRESP).map((k) => `nwr(around:${rayon},${lat},${lng})["name"]["${k}"];`).join('');
  const requete = `[out:json][timeout:12];(${filtres});out center tags 40;`;
  let donnees = null;
  for (const url of SERVEURS) {
    try {
      const r = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: requete }), signal });
      if (r.ok) { donnees = await r.json(); break; }
    } catch (err) { if (err?.name === 'AbortError') throw err; }
  }
  if (!donnees) throw new Error('hors-ligne');
  const vus = new Set();
  return (donnees.elements || [])
    .map((el) => {
      const t = el.tags || {};
      const la = el.lat ?? el.center?.lat; const lo = el.lon ?? el.center?.lon;
      const cat = categorieOSM(t);
      return {
        nom: t.name, categorie: cat?.[0] || '', type: cat?.[1] || '', sousType: cat?.[2] || '',
        adresse: adresse(t), telephone: t.phone || t['contact:phone'] || '', site: site(t),
        instagram: t['contact:instagram'] || '', facebook: t['contact:facebook'] || '', email: t.email || t['contact:email'] || '',
        lat: la, lng: lo, distance: la == null ? 9999 : distance(lat, lng, la, lo),
      };
    })
    .filter((e) => e.nom && e.categorie && !vus.has(e.nom) && vus.add(e.nom))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}

// Lien Google Maps long : le nom et la position sont écrits dedans (…/place/Nom/@45.5,-73.5,17z).
// Texte partagé depuis Google Maps : « Nom de l'endroit » puis le lien court sur la ligne suivante.
export function lireLienMaps(texte) {
  const t = String(texte || '').trim();
  const res = {};
  const url = (t.match(/https?:\/\/\S+/) || [])[0] || '';
  const avant = url ? t.slice(0, t.indexOf(url)).trim() : '';
  if (avant && avant.length < 120) res.nom = avant.split('\n')[0].replace(/[«»"]/g, '').trim();
  const place = url.match(/\/maps\/place\/([^/@?]+)/);
  if (place) { try { res.nom = decodeURIComponent(place[1].replace(/\+/g, ' ')); } catch (_) { /* rien */ } }
  const pos = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (pos) { res.lat = +pos[1]; res.lng = +pos[2]; }
  res.url = url;
  return res;
}
