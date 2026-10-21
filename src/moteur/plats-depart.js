// Base de départ : plats familiaux, majoritairement végétariens et équilibrés
// (légumes + protéine + féculent). Quantités PAR PERSONNE (adulte).
// `proteine` : legumineuses | oeufs | laitier | soja | poisson | viande.
// Les plats « viande » ne sont proposés que lorsque les grands-parents sont là (réglable).
// Tout est modifiable dans l'écran « Plats ».

// À incrémenter quand cette liste change : les plats de départ jamais modifiés sont alors mis à jour.
export const VERSION_PLATS = 6;

const i = (nom, qte, unite = 'g') => ({ nom, qte, unite });
const A = ['automne'], H = ['hiver'], E = ['ete'];
const AH = ['automne', 'hiver'], PE = ['printemps', 'ete'], EA = ['ete', 'automne'];
const PA = ['printemps', 'automne'], AHP = ['automne', 'hiver', 'printemps'];

const plat = (id, nom, prep, cuisson, options, ingredients) => ({
  id, nom, prep, cuisson,
  rechauffe: false, double: false, consistant: false, leger: false, martin: null, julieAime: false, saisons: [], proteine: null,
  ...options, ingredients,
});

export const PLATS_DEPART = [
  // ---------- Légumineuses ----------
  plat('dahl', 'Dahl de lentilles corail, riz', 10, 25, { proteine: 'legumineuses', rechauffe: true, double: true, saisons: AH },
    [i('Lentilles corail', 70), i('Lait de coco', 60, 'ml'), i('Carotte', 80), i('Épinards surgelés', 60), i('Oignon', 0.25, 'pièce'), i('Riz', 60)]),
  plat('chili-sin-carne', 'Chili sin carne, riz', 15, 35, { proteine: 'legumineuses', rechauffe: true, double: true, consistant: true, saisons: AH },
    [i('Haricots rouges', 130), i('Coulis de tomate', 120), i('Carotte', 60), i('Oignon', 0.25, 'pièce'), i('Épices chili', 1), i('Riz', 70)]),
  plat('curry-pois-chiches', 'Curry de pois chiches aux épinards, riz', 15, 25, { proteine: 'legumineuses', rechauffe: true, double: true, saisons: PA },
    [i('Pois chiches', 120), i('Lait de coco', 80, 'ml'), i('Épinards', 100), i('Oignon', 0.25, 'pièce'), i('Curry', 2), i('Riz', 70)]),
  plat('lentilles-oeuf', 'Lentilles vertes aux carottes, œuf mollet', 15, 30, { proteine: 'legumineuses', rechauffe: true, double: true, consistant: true, saisons: AH },
    [i('Lentilles vertes', 80), i('Carotte', 100), i('Oignon', 0.25, 'pièce'), i('Œufs', 1, 'pièce')]),
  plat('couscous-legumes', 'Couscous aux légumes et pois chiches', 25, 45, { proteine: 'legumineuses', rechauffe: true, double: true, consistant: true, martin: 'aime', saisons: EA },
    [i('Semoule semi-complète', 80), i('Pois chiches', 80), i('Carotte', 80), i('Courgette', 100), i('Navet', 50), i('Ras el hanout', 1)]),
  plat('hachis-lentilles', 'Hachis parmentier aux lentilles', 25, 30, { proteine: 'legumineuses', rechauffe: true, double: true, consistant: true, martin: 'aime', saisons: AH },
    [i('Lentilles vertes', 60), i('Carotte', 60), i('Oignon', 0.25, 'pièce'), i('Pomme de terre', 250), i('Lait', 50, 'ml'), i('Beurre', 10), i('Comté râpé', 20)]),
  plat('bolo-lentilles', 'Spaghetti au quinoa, bolognaise de lentilles', 15, 30, { proteine: 'legumineuses', rechauffe: true, double: true, consistant: true, martin: 'aime' },
    [i('Spaghetti au quinoa bio', 100), i('Lentilles corail', 40), i('Coulis de tomate', 120), i('Carotte', 50), i('Oignon', 0.25, 'pièce'), i('Parmesan', 10)]),
  plat('soupe-pois-casses', 'Soupe de pois cassés, pain complet', 15, 50, { proteine: 'legumineuses', rechauffe: true, double: true, saisons: H },
    [i('Pois cassés', 70), i('Carotte', 60), i('Oignon', 0.25, 'pièce'), i('Pain complet', 60)]),
  plat('minestrone', 'Minestrone aux haricots blancs et petites pâtes', 20, 35, { proteine: 'legumineuses', rechauffe: true, double: true, leger: true, saisons: AH },
    [i('Poireau', 80), i('Carotte', 80), i('Céleri', 40), i('Haricots blancs', 100), i('Coulis de tomate', 80), i('Petites pâtes semi-complètes', 30), i('Pain complet', 50)]),
  plat('veloute-potiron-lentilles', 'Velouté potiron-lentilles corail au lait de coco, graines de courge', 15, 30, { proteine: 'legumineuses', rechauffe: true, double: true, leger: true, martin: 'aime', saisons: A },
    [i('Potiron', 250), i('Lentilles corail', 50), i('Lait de coco', 50, 'ml'), i('Oignon', 0.25, 'pièce'), i('Graines de courge', 10), i('Pain complet', 50)]),
  plat('falafels', 'Falafels, taboulé et sauce yaourt', 20, 15, { proteine: 'legumineuses', martin: 'aime', saisons: PE },
    [i('Falafels', 5, 'pièce'), i('Boulgour', 60), i('Tomate', 80), i('Concombre', 80), i('Yaourt nature', 0.5, 'pièce'), i('Menthe', 0.1, 'botte')]),
  plat('houmous-crudites', 'Houmous, crudités et pain pita', 15, 0, { proteine: 'legumineuses', leger: true },
    [i('Houmous', 80), i('Carotte', 80), i('Concombre', 80), i('Pain pita', 1, 'pièce'), i('Feta', 30)]),
  plat('wraps-haricots', 'Wraps haricots rouges, crudités et fromage', 10, 5, { proteine: 'legumineuses', leger: true, martin: 'aime', saisons: PE },
    [i('Tortillas complètes', 2, 'pièce'), i('Haricots rouges', 80), i('Salade', 30), i('Tomate', 60), i('Cheddar râpé', 20)]),
  plat('salade-lentilles', 'Salade de lentilles, œuf et crudités', 15, 25, { proteine: 'legumineuses', leger: true, saisons: E },
    [i('Lentilles vertes', 60), i('Œufs', 1, 'pièce'), i('Tomate', 100), i('Concombre', 60), i('Échalote', 0.25, 'pièce')]),

  // ---------- Œufs ----------
  plat('omelette', 'Omelette aux champignons, salade', 5, 10, { proteine: 'oeufs', leger: true },
    [i('Œufs', 2.5, 'pièce'), i('Champignons de Paris', 60), i('Salade', 40), i('Pain complet', 50)]),
  plat('quiche-poireaux', 'Quiche aux poireaux et salade', 15, 40, { proteine: 'oeufs', rechauffe: true, martin: 'aime', saisons: AH },
    [i('Pâte brisée', 0.25, 'pièce'), i('Poireau', 150), i('Œufs', 1, 'pièce'), i('Crème fraîche', 40, 'ml'), i('Comté râpé', 20), i('Salade', 40)]),
  plat('quiche-courgette', 'Quiche courgette-chèvre et salade', 15, 40, { proteine: 'oeufs', rechauffe: true, saisons: E },
    [i('Pâte brisée', 0.25, 'pièce'), i('Courgette', 150), i('Œufs', 1, 'pièce'), i('Crème fraîche', 40, 'ml'), i('Fromage de chèvre', 30), i('Salade', 40)]),
  plat('frittata', 'Frittata pommes de terre et épinards', 15, 20, { proteine: 'oeufs', rechauffe: true, saisons: PA },
    [i('Œufs', 2, 'pièce'), i('Pomme de terre', 150), i('Épinards', 80), i('Parmesan', 10)]),
  plat('shakshuka', 'Shakshuka (œufs à la tomate et poivron), pain', 10, 20, { proteine: 'oeufs', saisons: EA },
    [i('Œufs', 2, 'pièce'), i('Tomate', 150), i('Poivron', 80), i('Oignon', 0.25, 'pièce'), i('Pain complet', 60)]),
  plat('galettes', 'Galettes complètes œuf-fromage-champignons', 10, 10, { proteine: 'oeufs', martin: 'aime' },
    [i('Galettes de sarrasin', 2, 'pièce'), i('Œufs', 1, 'pièce'), i('Emmental râpé', 30), i('Champignons de Paris', 50), i('Salade', 30)]),

  // ---------- Fromage / laitages ----------
  plat('lasagnes-epinards', 'Lasagnes épinards-ricotta', 25, 40, { proteine: 'laitier', rechauffe: true, double: true, martin: 'aime' },
    [i('Pâtes à lasagnes', 70), i('Épinards surgelés', 150), i('Ricotta', 60), i('Coulis de tomate', 100), i('Mozzarella', 30)]),
  plat('gratin-dauphinois', 'Gratin dauphinois, salade et œuf dur', 20, 60, { proteine: 'laitier', rechauffe: true, consistant: true, martin: 'aime', saisons: AH },
    [i('Pomme de terre', 300), i('Crème fraîche', 50, 'ml'), i('Lait', 80, 'ml'), i('Œufs', 1, 'pièce'), i('Salade', 40)]),
  plat('gratin-chou-fleur', 'Gratin de chou-fleur et pommes de terre', 15, 35, { proteine: 'laitier', rechauffe: true, double: true, martin: 'naimePas', julieAime: true, saisons: AH },
    [i('Chou-fleur', 200), i('Pomme de terre', 150), i('Lait', 100, 'ml'), i('Farine', 10), i('Beurre', 10), i('Comté râpé', 30)]),
  plat('endives-comte', 'Gratin d’endives au comté, riz', 15, 30, { proteine: 'laitier', rechauffe: true, julieAime: true, saisons: H },
    [i('Endive', 2, 'pièce'), i('Lait', 100, 'ml'), i('Farine', 10), i('Beurre', 10), i('Comté râpé', 35), i('Riz', 50)]),
  plat('risotto', 'Risotto aux champignons', 10, 25, { proteine: 'laitier', saisons: AH },
    [i('Riz arborio', 80), i('Champignons de Paris', 120), i('Parmesan', 25), i('Bouillon de légumes', 0.25, 'cube'), i('Oignon', 0.25, 'pièce')]),
  plat('pizza-legumes', 'Pizza maison aux légumes', 15, 15, { proteine: 'laitier', martin: 'aime' },
    [i('Pâte à pizza', 0.33, 'pièce'), i('Coulis de tomate', 50), i('Mozzarella', 60), i('Champignons de Paris', 40), i('Olives', 10), i('Salade', 30)]),
  plat('gnocchis', 'Gnocchis poêlés, sauce tomate et mozzarella', 5, 10, { proteine: 'laitier', martin: 'aime' },
    [i('Gnocchis', 150), i('Coulis de tomate', 80), i('Mozzarella', 40), i('Salade', 30)]),
  plat('coquillettes-pois', 'Coquillettes, petits pois et emmental', 5, 10, { proteine: 'laitier', martin: 'aime' },
    [i('Coquillettes semi-complètes', 90), i('Petits pois surgelés', 80), i('Emmental râpé', 25), i('Beurre', 5)]),
  plat('pates-pesto', 'Pâtes au pesto, haricots verts et parmesan', 10, 12, { proteine: 'laitier', saisons: E },
    [i('Pâtes semi-complètes', 100), i('Pesto', 30), i('Haricots verts', 100), i('Parmesan', 15)]),
  plat('salade-quinoa', 'Salade de quinoa, feta, concombre et tomate', 15, 15, { proteine: 'laitier', leger: true, saisons: E },
    [i('Quinoa', 60), i('Feta', 50), i('Concombre', 80), i('Tomate', 100), i('Olives', 10)]),
  plat('ratatouille', 'Ratatouille, semoule et œuf au plat', 25, 45, { proteine: 'oeufs', rechauffe: true, double: true, saisons: E },
    [i('Courgette', 120), i('Aubergine', 100), i('Poivron', 80), i('Tomate', 120), i('Oignon', 0.5, 'pièce'), i('Semoule semi-complète', 60), i('Œufs', 1, 'pièce')]),
  plat('courgettes-farcies-veg', 'Courgettes farcies boulgour-chèvre', 25, 35, { proteine: 'laitier', rechauffe: true, double: true, saisons: E },
    [i('Courgette', 250), i('Boulgour', 50), i('Fromage de chèvre', 40), i('Tomate', 80)]),
  plat('polenta', 'Polenta crémeuse, champignons et œuf', 10, 15, { proteine: 'oeufs', saisons: A },
    [i('Polenta', 70), i('Champignons de Paris', 120), i('Œufs', 1, 'pièce'), i('Parmesan', 15)]),

  // ---------- Quenelles et béchamel (Julie aime) ----------
  plat('quenelles-tomate', 'Quenelles nature gratinées à la sauce tomate, salade', 10, 25, { proteine: 'oeufs', rechauffe: true, julieAime: true },
    [i('Quenelles nature', 2, 'pièce'), i('Coulis de tomate', 120), i('Emmental râpé', 15), i('Salade', 40)]),
  plat('quenelles-champignons', 'Quenelles nature, béchamel aux champignons, riz', 15, 25, { proteine: 'oeufs', rechauffe: true, julieAime: true },
    [i('Quenelles nature', 2, 'pièce'), i('Champignons de Paris', 100), i('Lait', 120, 'ml'), i('Farine', 10), i('Beurre', 10), i('Riz', 50)]),
  plat('quenelles-brochet', 'Quenelles de brochet sauce Nantua, riz et salade', 5, 25, { proteine: 'poisson', julieAime: true },
    [i('Quenelles de brochet', 2, 'pièce'), i('Sauce Nantua', 100), i('Riz', 60), i('Salade', 40)]),
  plat('gratin-poireaux', 'Gratin de poireaux à la béchamel, œufs durs et pommes de terre', 20, 30, { proteine: 'oeufs', rechauffe: true, julieAime: true, saisons: AH },
    [i('Poireau', 200), i('Œufs', 1.5, 'pièce'), i('Pomme de terre', 150), i('Lait', 120, 'ml'), i('Farine', 12), i('Beurre', 10)]),
  plat('cannellonis', 'Cannellonis épinards-ricotta à la béchamel', 25, 35, { proteine: 'laitier', rechauffe: true, double: true, julieAime: true },
    [i('Cannellonis', 60), i('Épinards surgelés', 150), i('Ricotta', 60), i('Lait', 120, 'ml'), i('Farine', 12), i('Beurre', 10)]),
  plat('moussaka-lentilles', 'Moussaka végétarienne aux lentilles', 30, 45, { proteine: 'legumineuses', rechauffe: true, double: true, julieAime: true, saisons: EA },
    [i('Aubergine', 200), i('Lentilles vertes', 50), i('Coulis de tomate', 100), i('Oignon', 0.25, 'pièce'), i('Lait', 100, 'ml'), i('Farine', 10), i('Beurre', 10)]),
  plat('gratin-pates-brocoli', 'Gratin de pâtes semi-complètes, brocoli et béchamel', 15, 25, { proteine: 'laitier', rechauffe: true, double: true, julieAime: true, saisons: EA },
    [i('Pâtes semi-complètes', 80), i('Brocoli', 150), i('Lait', 120, 'ml'), i('Farine', 10), i('Beurre', 10), i('Emmental râpé', 15)]),

  // ---------- Soja ----------
  plat('wok-tofu', 'Wok de légumes et tofu, nouilles', 15, 10, { proteine: 'soja', leger: true },
    [i('Tofu nature', 100), i('Carotte', 80), i('Champignons de Paris', 60), i('Poireau', 60), i('Nouilles', 80), i('Sauce soja', 10, 'ml')]),
  plat('bowl-tofu', 'Bol de riz, tofu mariné et légumes croquants', 15, 15, { proteine: 'soja', leger: true, saisons: PE },
    [i('Tofu fumé', 100), i('Riz', 60), i('Carotte', 60), i('Concombre', 80), i('Radis', 40), i('Sauce soja', 10, 'ml')]),

  // ---------- Poisson ----------
  plat('saumon-riz', 'Saumon, riz et brocolis', 10, 20, { proteine: 'poisson', leger: true, saisons: EA },
    [i('Pavé de saumon', 120), i('Riz', 60), i('Brocoli', 150)]),
  plat('papillote-cabillaud', 'Cabillaud en papillote, légumes et riz', 10, 20, { proteine: 'poisson', leger: true, saisons: PE },
    [i('Dos de cabillaud', 130), i('Courgette', 100), i('Tomate', 80), i('Citron', 0.25, 'pièce'), i('Riz', 60)]),
  plat('colin-puree', 'Filet de colin, purée de carottes', 10, 25, { proteine: 'poisson', martin: 'aime', saisons: AH },
    [i('Filet de colin', 130), i('Carotte', 150), i('Pomme de terre', 100), i('Beurre', 10)]),

  // ---------- Viande (quand les grands-parents sont là) ----------
  plat('poulet-roti', 'Poulet rôti, pommes de terre et haricots verts', 15, 75, { proteine: 'viande', rechauffe: true, double: true, consistant: true, martin: 'aime' },
    [i('Poulet fermier', 0.25, 'pièce'), i('Pomme de terre', 250), i('Haricots verts', 100)]),
  plat('hachis-parmentier', 'Hachis parmentier au bœuf', 25, 30, { proteine: 'viande', rechauffe: true, double: true, consistant: true, martin: 'aime', saisons: AH },
    [i('Bœuf haché', 110), i('Pomme de terre', 250), i('Carotte', 50), i('Lait', 50, 'ml'), i('Beurre', 10), i('Comté râpé', 20)]),
  plat('blanquette', 'Blanquette de veau, riz', 30, 90, { proteine: 'viande', rechauffe: true, double: true, consistant: true, saisons: AH },
    [i('Veau (blanquette)', 170), i('Carotte', 100), i('Champignons de Paris', 60), i('Crème fraîche', 30, 'ml'), i('Riz', 70)]),
  plat('bourguignon', 'Bœuf bourguignon, pommes de terre', 30, 150, { proteine: 'viande', rechauffe: true, double: true, consistant: true, saisons: AH },
    [i('Bœuf à braiser', 180), i('Carotte', 100), i('Champignons de Paris', 60), i('Oignon', 0.5, 'pièce'), i('Vin rouge', 80, 'ml'), i('Pomme de terre', 200)]),
  plat('pot-au-feu', 'Pot-au-feu', 30, 180, { proteine: 'viande', rechauffe: true, double: true, consistant: true, saisons: H },
    [i('Bœuf pot-au-feu', 180), i('Carotte', 100), i('Poireau', 100), i('Navet', 80), i('Pomme de terre', 150)]),
  plat('poulet-basquaise', 'Poulet basquaise, riz', 20, 45, { proteine: 'viande', rechauffe: true, double: true, saisons: EA },
    [i('Cuisses de poulet', 180), i('Poivron', 100), i('Tomate', 100), i('Oignon', 0.5, 'pièce'), i('Riz', 70)]),
  plat('tomates-farcies', 'Tomates farcies, riz', 25, 45, { proteine: 'viande', rechauffe: true, double: true, martin: 'aime', saisons: E },
    [i('Tomate', 250), i('Chair à saucisse', 90), i('Riz', 60)]),
  plat('quiche-lorraine', 'Quiche lorraine et salade', 15, 40, { proteine: 'viande', rechauffe: true, martin: 'aime', saisons: AHP },
    [i('Pâte brisée', 0.25, 'pièce'), i('Lardons', 40), i('Œufs', 1, 'pièce'), i('Crème fraîche', 50, 'ml'), i('Salade', 40)]),
];
