// Calendrier des fruits et légumes de France (mois de pleine saison, 1 = janvier).
const T = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const PRODUITS_SAISON = {
  // Légumes
  ail: T, oignon: T, échalote: T, carotte: T, 'pomme de terre': T, champignon: T, persil: T,
  asperge: [4, 5, 6],
  aubergine: [6, 7, 8, 9],
  betterave: [7, 8, 9, 10, 11, 12, 1, 2, 3],
  brocoli: [6, 7, 8, 9, 10, 11],
  céleri: [9, 10, 11, 12, 1, 2, 3],
  'chou-fleur': [9, 10, 11, 12, 1, 2, 3, 4],
  chou: [10, 11, 12, 1, 2, 3],
  'chou de bruxelles': [10, 11, 12, 1, 2],
  concombre: [5, 6, 7, 8, 9],
  courge: [9, 10, 11, 12, 1, 2],
  potiron: [9, 10, 11, 12, 1, 2],
  courgette: [5, 6, 7, 8, 9, 10],
  endive: [10, 11, 12, 1, 2, 3, 4],
  épinard: [3, 4, 5, 6, 9, 10, 11],
  fenouil: [6, 7, 8, 9, 10],
  'haricot vert': [6, 7, 8, 9],
  salade: [4, 5, 6, 7, 8, 9, 10],
  mâche: [10, 11, 12, 1, 2, 3],
  navet: [10, 11, 12, 1, 2, 3],
  panais: [10, 11, 12, 1, 2, 3],
  'petits pois': [5, 6, 7],
  poireau: [9, 10, 11, 12, 1, 2, 3, 4],
  poivron: [7, 8, 9, 10],
  radis: [4, 5, 6, 7],
  tomate: [6, 7, 8, 9],
  'tomate cerise': [6, 7, 8, 9],
  topinambour: [10, 11, 12, 1, 2, 3],
  maïs: [8, 9],
  // Fruits
  pomme: [8, 9, 10, 11, 12, 1, 2, 3, 4],
  poire: [8, 9, 10, 11, 12, 1],
  fraise: [5, 6, 7],
  cerise: [6, 7],
  abricot: [6, 7, 8],
  pêche: [6, 7, 8, 9],
  melon: [6, 7, 8, 9],
  prune: [7, 8, 9],
  raisin: [8, 9, 10],
  figue: [8, 9, 10],
  framboise: [6, 7, 8, 9],
  rhubarbe: [4, 5, 6],
  kiwi: [11, 12, 1, 2, 3],
  clémentine: [11, 12, 1, 2],
  citron: T,
};

export const SAISONS = ['printemps', 'ete', 'automne', 'hiver'];
export const LIBELLES_SAISONS = { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' };

export function saisonDuMois(mois) {
  if (mois >= 3 && mois <= 5) return 'printemps';
  if (mois >= 6 && mois <= 8) return 'ete';
  if (mois >= 9 && mois <= 11) return 'automne';
  return 'hiver';
}

export function normaliser(nom) {
  return String(nom || '').trim().toLowerCase();
}

// Retrouve le produit de saison correspondant à un nom d'ingrédient
// (« tomates cerises » -> « tomate cerise », « courgettes » -> « courgette »).
const TRANSFORME = /coulis|sauce|concentré|surgel|conserve|jus |pesto|confiture|séché|en boîte/;

export function produitDe(nomIngredient) {
  const n = normaliser(nomIngredient);
  if (TRANSFORME.test(n)) return null;
  if (PRODUITS_SAISON[n]) return n;
  const sing = n.split(' ').map((m) => m.replace(/[sx]$/, '')).join(' ');
  if (PRODUITS_SAISON[sing]) return sing;
  // le nom le plus long contenu dans l'ingrédient (« chou-fleur » avant « chou »)
  const cles = Object.keys(PRODUITS_SAISON).sort((a, b) => b.length - a.length);
  return cles.find((c) => new RegExp(`(^|[ '])${c}s?($| )`).test(n)) || null;
}

// true / false pour un fruit ou légume connu, null si l'ingrédient n'est pas un produit frais suivi.
export function estDeSaison(nomIngredient, mois) {
  const p = produitDe(nomIngredient);
  if (!p) return null;
  return PRODUITS_SAISON[p].includes(mois);
}

export function produitsDuMois(mois) {
  return Object.entries(PRODUITS_SAISON)
    .filter(([, ms]) => ms.includes(mois) && ms.length < 12)
    .map(([n]) => n);
}
