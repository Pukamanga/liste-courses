// Import d'un planning mensuel collé au format JSON :
// {"mois":"2026-11","jours":{"2026-11-01":{"moi":"M","julie":"S"}, ...}}
import { joursDuMois } from './dates.js';
import { CODES_POSTES } from './reglages.js';
import { avertissementSaisie } from './regles.js';

const ALIAS = { MATIN: 'M', SOIR: 'S', REPOS: 'R', CONGE: 'CA', 'CONGÉ': 'CA', C: 'CA', FORMATION: 'F' };

function code(v) {
  if (v == null || v === '') return null;
  const c = String(v).trim().toUpperCase();
  return ALIAS[c] || c;
}

export function analyserImport(texte, reglages, periodesGP = []) {
  const res = { mois: null, jours: {}, erreurs: [], avertissements: [], manquants: [] };
  let data;
  try {
    // tolère un bloc ```json … ``` copié depuis une conversation
    data = JSON.parse(String(texte).replace(/^\s*```(json)?/i, '').replace(/```\s*$/, ''));
  } catch (e) {
    res.erreurs.push(`JSON illisible : ${e.message}`);
    return res;
  }
  if (!data || typeof data !== 'object' || !/^\d{4}-\d{2}$/.test(data.mois || '')) {
    res.erreurs.push('Champ "mois" absent ou invalide (attendu : "AAAA-MM").');
    return res;
  }
  res.mois = data.mois;
  const jours = data.jours && typeof data.jours === 'object' ? data.jours : {};
  const valides = new Set(joursDuMois(data.mois));
  for (const [date, j] of Object.entries(jours)) {
    if (!valides.has(date)) {
      res.erreurs.push(`${date} n'appartient pas au mois ${data.mois}.`);
      continue;
    }
    const entree = {};
    const cles = Object.fromEntries(Object.entries(j || {}).map(([k, v]) => [k.toLowerCase(), v]));
    for (const p of ['moi', 'julie']) {
      const c = code(cles[p]);
      if (c == null) continue;
      if (!CODES_POSTES.includes(c)) res.erreurs.push(`${date} : poste "${cles[p]}" inconnu pour ${p}.`);
      else entree[p] = c;
    }
    if (cles.vtt === true) entree.vtt = true;
    res.jours[date] = entree;
    const w = avertissementSaisie(date, entree, reglages, periodesGP);
    if (w) res.avertissements.push(`${date} : ${w}`);
  }
  for (const d of valides) {
    const e = res.jours[d];
    if (!e) res.manquants.push(`${d} (jour absent)`);
    else {
      if (!e.moi) res.manquants.push(`${d} : poste de ${reglages.noms.moi} manquant`);
      if (!e.julie) res.manquants.push(`${d} : poste de ${reglages.noms.julie} manquant`);
    }
  }
  return res;
}
