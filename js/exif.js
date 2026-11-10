// Lit les informations cachées dans une photo JPEG (EXIF) : l'appareil, la date de la prise,
// la position GPS et le logiciel qui l'a modifiée. Une photo prise avec un téléphone les a
// presque toujours ; une image copiée d'internet ou une capture d'écran n'en a presque jamais.
// Elles servent dans le Studio pour vérifier que la photo vient bien du contributeur.

export async function lireExif(fichier) {
  try {
    const tampon = await fichier.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(tampon);
    if (v.getUint16(0) !== 0xffd8) return null; // pas un JPEG
    let pos = 2;
    while (pos + 4 < v.byteLength) {
      const marqueur = v.getUint16(pos);
      const taille = v.getUint16(pos + 2);
      if (marqueur === 0xffe1 && v.getUint32(pos + 4) === 0x45786966) return lireTiff(v, pos + 10);
      if ((marqueur & 0xff00) !== 0xff00 || marqueur === 0xffda) break;
      pos += 2 + taille;
    }
  } catch (_) { /* fichier illisible : pas d'infos */ }
  return null;
}

function lireTiff(v, debut) {
  const petit = v.getUint16(debut) === 0x4949; // « II » = petit-boutiste
  const u16 = (o) => v.getUint16(debut + o, petit);
  const u32 = (o) => v.getUint32(debut + o, petit);
  const texte = (o, n) => {
    let s = '';
    for (let i = 0; i < n; i++) { const c = v.getUint8(debut + o + i); if (!c) break; s += String.fromCharCode(c); }
    return s.trim();
  };
  const lireIfd = (o) => {
    const tags = {};
    const n = u16(o);
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12;
      const tag = u16(e); const type = u16(e + 2); const nb = u32(e + 4);
      const valeurOff = (type === 2 && nb > 4) || (type === 5) ? u32(e + 8) : e + 8;
      if (type === 2) tags[tag] = texte(nb > 4 ? u32(e + 8) : e + 8, nb);
      else if (type === 3) tags[tag] = u16(e + 8);
      else if (type === 4) tags[tag] = u32(e + 8);
      else if (type === 5) tags[tag] = Array.from({ length: nb }, (_, k) => u32(valeurOff + k * 8) / (u32(valeurOff + k * 8 + 4) || 1));
    }
    return tags;
  };
  const ifd0 = lireIfd(u32(4));
  const exif = ifd0[0x8769] ? lireIfd(ifd0[0x8769]) : {};
  const gps = ifd0[0x8825] ? lireIfd(ifd0[0x8825]) : {};
  const deg = (t) => (Array.isArray(t) ? t[0] + (t[1] || 0) / 60 + (t[2] || 0) / 3600 : null);
  let lat = deg(gps[2]); let lng = deg(gps[4]);
  if (lat != null && gps[1] === 'S') lat = -lat;
  if (lng != null && gps[3] === 'W') lng = -lng;
  if (lat === 0 && lng === 0) { lat = null; lng = null; }
  const date = (exif[0x9003] || ifd0[0x132] || '').replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  return {
    appareil: [ifd0[0x10f], ifd0[0x110]].filter(Boolean).join(' ').trim() || '',
    datePhoto: /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 19).replace(' ', 'T') : '',
    logiciel: ifd0[0x131] || '',
    lat: lat != null ? Math.round(lat * 1e6) / 1e6 : null,
    lng: lng != null ? Math.round(lng * 1e6) / 1e6 : null,
  };
}

// Distance en mètres entre deux points GPS.
export function distanceM(a, b) {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}
