// Liste de courses : ingrédients additionnés, regroupés par rayon.
import { normaliser } from './saisons.js';

export const RAYONS = [
  'Fruits et légumes', 'Boucherie / volaille', 'Poissonnerie', 'Crèmerie / fromages',
  'Traiteur / charcuterie', 'Boulangerie', 'Épicerie salée', 'Épicerie sucrée', 'Surgelés', 'Divers',
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
  ['Traiteur / charcuterie', ['jambon', 'lardons', 'charcuterie', 'pâte brisée', 'pâte feuilletée', 'pâte à pizza', 'galette',
    'houmous', 'falafel', 'tofu', 'gnocchi']],
  ['Crèmerie / fromages', ['lait', 'beurre', 'crème', 'œuf', 'oeuf', 'gruyère', 'emmental', 'parmesan', 'mozzarella',
    'reblochon', 'raclette', 'fromage', 'yaourt', 'comté', 'chèvre', 'feta', 'ricotta', 'cheddar']],
  ['Boulangerie', ['pain', 'baguette']],
  ['Surgelés', ['surgelé', 'poisson pané', 'frites']],
  ['Épicerie sucrée', ['sucre', 'chocolat', 'confiture', 'miel']],
  ['Épicerie salée', ['pâtes', 'spaghetti', 'coquillettes', 'lasagne', 'riz', 'semoule', 'lentille', 'pois chiche',
    'haricots rouges', 'farine', 'coulis', 'coulis de tomate', 'sauce tomate', 'concentré de tomate', 'sauce', 'huile', 'vinaigre', 'moutarde', 'bouillon', 'thon', 'olive',
    'lait de coco', 'curry', 'épice', 'pesto', 'tortilla', 'vin', 'cornichon', 'chapelure', 'boulgour', 'quinoa',
    'polenta', 'nouilles', 'pois cassés', 'ras el hanout', 'sauce soja']],
];

export function rayonDe(ingredient) {
  if (ingredient.rayon && RAYONS.includes(ingredient.rayon)) return ingredient.rayon;
  const n = normaliser(ingredient.nom);
  if (n.includes('surgel')) return 'Surgelés';
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

/**
 * Prompt à coller dans Claude (avec accès au navigateur) pour remplir le panier Leclerc Drive.
 * @param {Object} o
 * @param {Array} o.groupes        résultat de listeCourses
 * @param {Object} o.coches        articles déjà à la maison (exclus)
 * @param {string[]} o.extras      articles ajoutés à la main
 * @param {string} o.titreSemaine  ex. « 2 – 8 novembre »
 * @param {string[]} o.repas       ex. ['Lundi soir : Dahl de lentilles (3 pers.)']
 * @param {string} [o.magasin]
 * @param {string} [o.consignes]
 */
export function promptClaude({ groupes, coches = {}, extras = [], titreSemaine, repas = [], magasin, consignes }) {
  const lignes = [];
  for (const g of groupes) {
    const articles = g.articles.filter((a) => !coches[a.cle]);
    if (!articles.length) continue;
    lignes.push(`\n### ${g.rayon}`);
    for (const a of articles) lignes.push(`- ${a.texte}  (pour : ${a.plats.join(', ')})`);
  }
  const plus = extras.filter((e) => !coches[`extra|${e}`]);
  if (plus.length) {
    lignes.push('\n### En plus');
    for (const e of plus) lignes.push(`- ${e}`);
  }

  return `Fais nos courses de la semaine du ${titreSemaine} sur Leclerc Drive, avec le navigateur.

## Avant de commencer
- Ouvre https://www.leclercdrive.fr. Le magasin est ${magasin ? `« ${magasin} »` : 'celui déjà sélectionné sur notre compte'}.
- Nous devrions être déjà connectés. Sinon, arrête-toi et demande-moi de me connecter : ne saisis jamais d'identifiant ni de mot de passe.
- Regarde d'abord le panier actuel : n'ajoute pas ce qui y est déjà.

## Comment choisir chaque produit (dans cet ordre)
1. **Bio en priorité** (marque Bio Village de Leclerc ou autre produit bio). Si le bio coûte plus du double du produit conventionnel équivalent, prends le conventionnel et signale-le.
2. **Nutri-Score A ou B** de préférence ; évite les Nutri-Score D et E quand une alternative existe.
3. **Bon score Yuka** : Yuka n'est pas consultable sur le site, alors applique ses critères en lisant la fiche produit : bon Nutri-Score, bio, **pas d'additifs à risque** (notamment nitrites et nitrates E249 à E252, E171, BHA E320, BHT E321, carraghénanes E407, glutamate E621, édulcorants), liste d'ingrédients courte, produit peu transformé.
4. Fruits et légumes : bio, origine France si possible, au poids le plus proche de la quantité demandée.
5. **Quantités** : elles couvrent toute la semaine. Arrondis au conditionnement supérieur le plus proche, sans gros surplus pour les produits frais.
6. Produit introuvable ou indisponible : prends l'équivalent le plus proche qui respecte les règles ci-dessus, sinon passe-le, et note-le.

## Important
- **Ne valide pas la commande**, ne choisis pas de créneau de retrait et ne paie pas : arrête-toi au panier.
- À la fin, donne-moi un récapitulatif : pour chaque produit ajouté, le nom exact, la quantité, le prix, bio oui/non, le Nutri-Score ; puis les remplacements, les produits non trouvés, et le total du panier.
${consignes ? `\n## Nos consignes en plus\n${consignes}\n` : ''}
## Liste de courses (déjà sans ce que nous avons à la maison)
${lignes.join('\n')}

## Pour info, les repas prévus
${repas.map((r) => `- ${r}`).join('\n')}
`;
}
