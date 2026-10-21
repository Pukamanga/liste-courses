// Liste de courses : ingrédients additionnés, regroupés par rayon.
import { normaliser } from './saisons.js';

export const RAYONS = [
  'Fruits et légumes', 'Boucherie / volaille', 'Poissonnerie', 'Crèmerie / fromages',
  'Charcuterie / traiteur', 'Boulangerie', 'Épicerie salée', 'Épicerie sucrée', 'Surgelés', 'Divers',
];

// Rayon par défaut des ingrédients courants (un ingrédient peut préciser son propre rayon).
const MOTS_RAYONS = [
  ['Fruits et légumes', ['ail', 'oignon', 'échalote', 'carotte', 'pomme de terre', 'champignon', 'persil', 'courgette',
    'aubergine', 'poivron', 'tomate', 'salade', 'poireau', 'navet', 'céleri', 'chou', 'brocoli', 'épinard', 'endive',
    'courge', 'potiron', 'concombre', 'haricot vert', 'citron', 'menthe', 'basilic', 'pomme', 'poire', 'fenouil',
    'radis', 'betterave', 'panais', 'mâche', 'petits pois', 'coriandre', 'gingembre']],
  ['Poissonnerie', ['saumon', 'cabillaud', 'colin', 'crevette', 'merlu', 'poisson frais']],
  ['Boucherie / volaille', ['bœuf', 'boeuf', 'veau', 'porc', 'poulet', 'dinde', 'agneau', 'steak', 'merguez', 'saucisse',
    'chair à saucisse', 'canard']],
  ['Charcuterie / traiteur', ['jambon', 'lardons', 'charcuterie', 'pâte brisée', 'pâte feuilletée', 'pâte à pizza', 'galette']],
  ['Crèmerie / fromages', ['lait', 'beurre', 'crème', 'œuf', 'oeuf', 'gruyère', 'emmental', 'parmesan', 'mozzarella',
    'reblochon', 'raclette', 'fromage', 'yaourt', 'comté', 'chèvre', 'feta']],
  ['Boulangerie', ['pain', 'baguette']],
  ['Surgelés', ['surgelé', 'poisson pané', 'frites']],
  ['Épicerie sucrée', ['sucre', 'chocolat', 'confiture', 'miel']],
  ['Épicerie salée', ['pâtes', 'spaghetti', 'coquillettes', 'lasagne', 'riz', 'semoule', 'lentille', 'pois chiche',
    'haricots rouges', 'farine', 'coulis', 'coulis de tomate', 'sauce tomate', 'concentré de tomate', 'sauce', 'huile', 'vinaigre', 'moutarde', 'bouillon', 'thon', 'olive',
    'lait de coco', 'curry', 'épice', 'pesto', 'tortilla', 'vin', 'cornichon', 'chapelure']],
];

export function rayonDe(ingredient) {
  if (ingredient.rayon && RAYONS.includes(ingredient.rayon)) return ingredient.rayon;
  const n = normaliser(ingredient.nom);
  let meilleur = null;
  for (const [rayon, mots] of MOTS_RAYONS) {
    for (const m of mots) {
      if (n.includes(m) && (!meilleur || m.length > meilleur.len)) meilleur = { rayon, len: m.length };
    }
  }
  return meilleur?.rayon || 'Divers';
}

export function arrondir(q, unite) {
  const u = normaliser(unite);
  if (u === 'g' || u === 'ml') {
    if (q >= 200) return Math.ceil(q / 50) * 50;
    return Math.ceil(q / 10) * 10;
  }
  if (u === 'kg' || u === 'l') return Math.ceil(q * 10) / 10;
  return Math.ceil(q - 1e-9); // pièces, tranches… : à l'unité supérieure
}

export function formaterQuantite(q, unite) {
  const u = normaliser(unite);
  if (u === 'g' && q >= 1000) return `${(q / 1000).toLocaleString('fr-FR')} kg`;
  if (u === 'ml' && q >= 1000) return `${(q / 1000).toLocaleString('fr-FR')} L`;
  if (!u || u === 'pièce' || u === 'pièces') return `${q}`;
  return `${q.toLocaleString('fr-FR')} ${unite}`;
}

/**
 * @param {Array} creneaux  créneaux de la semaine ET des jours suivants (pour compter les restes)
 * @param {Object} menus    { idCreneau: menu }
 * @param {Object} plats
 * @param {Set<string>} idsSemaine  créneaux dont on fait les courses
 * @returns {Array<{rayon, articles:[{cle, nom, quantite, unite, texte, plats:[]}]}>}
 */
export function listeCourses(creneaux, menus, plats, idsSemaine) {
  const parId = Object.fromEntries(creneaux.map((c) => [c.id, c]));
  const articles = {};
  for (const id of idsSemaine) {
    const m = menus[id];
    const c = parId[id];
    if (!m || m.deleted || !m.platId || m.reste || !c || c.vide) continue;
    const plat = plats[m.platId];
    if (!plat || plat.deleted) continue;
    // portions : le créneau lui-même + les créneaux qui mangent ses restes
    let portions = c.convives;
    for (const [rid, rm] of Object.entries(menus)) {
      if (rm && !rm.deleted && rm.reste === id && parId[rid]) portions += parId[rid].convives;
    }
    for (const ing of plat.ingredients || []) {
      if (!ing.nom) continue;
      const cle = `${normaliser(ing.nom)}|${normaliser(ing.unite)}`;
      const a = (articles[cle] ||= {
        cle, nom: ing.nom.trim(), unite: ing.unite || '', brut: 0, rayon: rayonDe(ing), plats: [],
      });
      a.brut += (Number(ing.qte) || 0) * portions;
      if (!a.plats.includes(plat.nom)) a.plats.push(plat.nom);
    }
  }
  const groupes = {};
  for (const a of Object.values(articles)) {
    a.quantite = arrondir(a.brut, a.unite);
    a.texte = a.quantite > 0 ? `${a.nom} — ${formaterQuantite(a.quantite, a.unite)}` : a.nom;
    (groupes[a.rayon] ||= []).push(a);
  }
  return RAYONS.filter((r) => groupes[r])
    .map((r) => ({ rayon: r, articles: groupes[r].sort((x, y) => x.nom.localeCompare(y.nom, 'fr')) }));
}

export function texteACopier(groupes, coches = {}, extras = []) {
  const lignes = [];
  for (const g of groupes) {
    for (const a of g.articles) if (!coches[a.cle]) lignes.push(a.texte);
  }
  for (const e of extras) if (!coches[`extra|${e}`]) lignes.push(e);
  return lignes.join('\n');
}
