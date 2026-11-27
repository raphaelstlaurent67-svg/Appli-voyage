// Noms des pays en anglais, calculés par le navigateur (Intl.DisplayNames), à partir des noms français.
// Utilisé par la fiche de demande et par le site.
import { paysDuContinent } from './monde.js';

export const sansAccents = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const TOUS_PAYS = paysDuContinent('');
const CODES_MANQUANTS = { centrafrique: 'CF', congo: 'CG', guyane: 'GF', hongkong: 'HK', kirghizistan: 'KG', macao: 'MO', myanmar: 'MM', republiquedemocratiqueducongo: 'CD', vatican: 'VA' };
const EN_REMPLACE = { HK: 'Hong Kong', MO: 'Macao', MM: 'Myanmar', CD: 'DR Congo', CG: 'Congo', CI: "Côte d'Ivoire", PS: 'Palestine' };
export const NOM_EN = (() => {
  const m = {};
  try {
    const fr = new Intl.DisplayNames(['fr'], { type: 'region' });
    const en = new Intl.DisplayNames(['en'], { type: 'region' });
    const cle = (x) => sansAccents(x).replace(/[^a-z]/g, '');
    const codes = { ...CODES_MANQUANTS };
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const a of L) for (const b of L) { const c = a + b; const f = fr.of(c); if (f && f !== c && !codes[cle(f)]) codes[cle(f)] = c; }
    for (const p of TOUS_PAYS) { const c = codes[cle(p)]; if (c) m[p] = EN_REMPLACE[c] || en.of(c); }
  } catch (_) { /* vieux navigateur : on garde les noms français */ }
  return m;
})();
