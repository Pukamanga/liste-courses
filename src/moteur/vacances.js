import { ajouterJours, depuisIso, versIso, jourSemaine } from './dates.js';

// Vacances scolaires zone A (académies de Besançon, Bordeaux, Clermont-Ferrand, Dijon,
// Grenoble, Limoges, Lyon, Poitiers). `debut` = premier jour sans école,
// `reprise` = jour de la rentrée (exclu). Modifiable dans les réglages.
// À VÉRIFIER chaque année sur education.gouv.fr.
export const VACANCES_ZONE_A = [
  { nom: 'Toussaint', debut: '2025-10-18', reprise: '2025-11-03' },
  { nom: 'Noël', debut: '2025-12-20', reprise: '2026-01-05' },
  { nom: 'Hiver', debut: '2026-02-07', reprise: '2026-02-23' },
  { nom: 'Printemps', debut: '2026-04-04', reprise: '2026-04-20' },
  { nom: 'Pont de l’Ascension', debut: '2026-05-14', reprise: '2026-05-18' },
  { nom: 'Été', debut: '2026-07-04', reprise: '2026-09-01' },
  { nom: 'Toussaint', debut: '2026-10-17', reprise: '2026-11-02' },
  { nom: 'Noël', debut: '2026-12-19', reprise: '2027-01-04' },
  { nom: 'Hiver', debut: '2027-02-13', reprise: '2027-03-01' },
  { nom: 'Printemps', debut: '2027-04-10', reprise: '2027-04-26' },
  { nom: 'Pont de l’Ascension', debut: '2027-05-06', reprise: '2027-05-10' },
  { nom: 'Été', debut: '2027-07-03', reprise: '2027-09-01' },
];

export function periodeVacances(iso, vacances = VACANCES_ZONE_A) {
  return vacances.find((v) => iso >= v.debut && iso < v.reprise) || null;
}

// Dimanche de Pâques (algorithme de Meeus/Jones/Butcher)
function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return versIso(new Date(annee, mois - 1, jour, 12));
}

export function joursFeries(annee) {
  const p = paques(annee);
  return {
    [`${annee}-01-01`]: 'Jour de l’an',
    [ajouterJours(p, 1)]: 'Lundi de Pâques',
    [`${annee}-05-01`]: 'Fête du travail',
    [`${annee}-05-08`]: 'Victoire 1945',
    [ajouterJours(p, 39)]: 'Ascension',
    [ajouterJours(p, 50)]: 'Lundi de Pentecôte',
    [`${annee}-07-14`]: 'Fête nationale',
    [`${annee}-08-15`]: 'Assomption',
    [`${annee}-11-01`]: 'Toussaint',
    [`${annee}-11-11`]: 'Armistice',
    [`${annee}-12-25`]: 'Noël',
  };
}

export function ferie(iso) {
  return joursFeries(depuisIso(iso).getFullYear())[iso] || null;
}

// Martin a école (et donc cantine) le lundi, mardi, jeudi et vendredi hors vacances et fériés.
export function jourEcole(iso, vacances = VACANCES_ZONE_A, joursEcole = [1, 2, 4, 5]) {
  if (!joursEcole.includes(jourSemaine(iso))) return false;
  if (periodeVacances(iso, vacances)) return false;
  return !ferie(iso);
}
