// Utilitaires de dates « locales » au format ISO AAAA-MM-JJ (sans fuseau horaire).

export const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const pad = (n) => String(n).padStart(2, '0');

export function versIso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function depuisIso(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j, 12); // midi : évite les surprises de changement d'heure
}

export function ajouterJours(iso, n) {
  const d = depuisIso(iso);
  d.setDate(d.getDate() + n);
  return versIso(d);
}

export function jourSemaine(iso) {
  return depuisIso(iso).getDay(); // 0 = dimanche
}

export function moisDe(iso) {
  return Number(iso.slice(5, 7));
}

export function ecartJours(a, b) {
  return Math.round((depuisIso(b) - depuisIso(a)) / 86400000);
}

export function lundiDe(iso) {
  const js = jourSemaine(iso);
  return ajouterJours(iso, js === 0 ? -6 : 1 - js);
}

export function joursDeLaSemaine(lundi) {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

export function joursDuMois(mois) { // mois = 'AAAA-MM'
  const [a, m] = mois.split('-').map(Number);
  const n = new Date(a, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${mois}-${pad(i + 1)}`);
}

export function aujourdhui() {
  return versIso(new Date());
}

// '20:30' -> 1230 minutes
export function enMinutes(h) {
  if (h == null || h === '') return null;
  const [hh, mm] = String(h).split(':').map(Number);
  return hh * 60 + (mm || 0);
}

export function enHeure(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function libelleDate(iso) {
  const d = depuisIso(iso);
  return `${JOURS_LONGS[d.getDay()]} ${d.getDate()} ${MOIS_LONGS[d.getMonth()]}`;
}
