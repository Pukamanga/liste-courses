// Fait le lien entre le stockage et le moteur (réglages fusionnés, analyse des jours).
import { donnees, doc } from './store.js';
import { fusionnerReglages } from './moteur/reglages.js';
import { analyserJour } from './moteur/regles.js';
import { joursDeLaSemaine, ajouterJours } from './moteur/dates.js';

export function reglages() {
  return fusionnerReglages(doc('reglages', 'regles'));
}

export function periodesGP() {
  return Object.entries(donnees('gp')).map(([id, g]) => ({ id, ...g }));
}

export function analyser(date, R = reglages(), gp = periodesGP()) {
  return analyserJour(date, doc('jours', date) || {}, R, gp);
}

export function semaine(lundi) {
  const R = reglages();
  const gp = periodesGP();
  return joursDeLaSemaine(lundi).map((d) => analyser(d, R, gp));
}

// Créneaux de la semaine + quelques jours après (pour les restes)
export function creneauxAutour(lundi, joursEnPlus = 4) {
  const R = reglages();
  const gp = periodesGP();
  const dates = Array.from({ length: 7 + joursEnPlus }, (_, i) => ajouterJours(lundi, i));
  return dates.flatMap((d) => {
    const j = analyser(d, R, gp);
    return [j.creneaux.midi, j.creneaux.soir];
  });
}

export function nomDe(qui, R, gp = 0) {
  if (qui === 'gp') return gp > 1 ? `Grands-parents (${gp})` : 'Grand-parent';
  return R.noms[qui] || qui;
}
