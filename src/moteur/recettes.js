// Recettes des plats de départ, au Thermomix autant que possible (TM5 / TM6, bol 2,2 L).
// Quantités pour 4 portions environ. Notation : durée / température / sens inverse / vitesse.
// « Varoma » comme température fonctionne sur TM5 et TM6 (sur TM6, 120 °C convient aussi pour rissoler).
// Le riz « au panier » : 1,2 L d'eau salée dans le bol, 250 g de riz dans le panier cuisson,
// 18 min / Varoma / vit. 4 (le Varoma peut cuire autre chose au-dessus en même temps).

const RIZ = 'Riz : 1,2 L d’eau salée dans le bol, 250 g de riz dans le panier cuisson, 18 min / Varoma / vit. 4. Réserver au chaud et vider le bol.';
const BECHAMEL = (lait = 500, farine = 40, beurre = 40) =>
  `Béchamel : ${lait} g de lait, ${farine} g de farine, ${beurre} g de beurre, sel, poivre, muscade : 7 min / 90 °C / vit. 4.`;
const PUREE = 'Purée : 1 kg de pommes de terre en morceaux, 300 g de lait, 200 g d’eau, sel, fouet en place : 25 min / 100 °C / vit. 1. Ajouter 40 g de beurre : 20 s / vit. 3 (fouet).';
const OIGNON = 'Oignon coupé en deux + 20 g d’huile d’olive : 5 s / vit. 5, puis 3 min / Varoma / vit. 1.';
const SAUCE_TOMATE = 'Sauce tomate : 1 gousse d’ail 3 s / vit. 7, 20 g d’huile 2 min / Varoma / vit. 1, 480 g de coulis de tomate, origan, sel : 10 min / 100 °C / vit. 1.';
const PATES = (g) => `Pâtes : 1,3 L d’eau salée, 10 min / 100 °C / vit. 1, ajouter ${g} g de pâtes par l’orifice : temps du paquet / 100 °C / sens inverse / vit. 1. Égoutter (garder un peu d’eau de cuisson).`;

export const RECETTES = {
  dahl: [RIZ, OIGNON,
    '2 c. à café de curry ou garam masala : 1 min / Varoma / vit. 1.',
    'Ajouter 280 g de lentilles corail rincées, 2 carottes en rondelles, 400 ml de lait de coco, 500 g d’eau, sel : 20 min / 100 °C / sens inverse / vit. mijotage.',
    'Ajouter 240 g d’épinards surgelés : 5 min / 100 °C / sens inverse / vit. mijotage.'],
  'chili-sin-carne': [RIZ,
    'Oignon + 2 carottes en morceaux : 5 s / vit. 5. 20 g d’huile : 3 min / Varoma / vit. 1.',
    '2 c. à café d’épices chili (cumin, paprika) : 1 min / Varoma / vit. 1.',
    'Ajouter 520 g de haricots rouges égouttés, 480 g de coulis de tomate, sel : 20 min / 100 °C / sens inverse / vit. mijotage.'],
  'curry-pois-chiches': [RIZ, OIGNON,
    '2 c. à café de curry : 1 min / Varoma / vit. 1.',
    'Ajouter 480 g de pois chiches égouttés, 320 ml de lait de coco, 100 g d’eau, sel : 15 min / 100 °C / sens inverse / vit. mijotage.',
    'Ajouter 400 g d’épinards frais : 5 min / 100 °C / sens inverse / vit. mijotage.'],
  'lentilles-oeuf': [OIGNON,
    'Ajouter 320 g de lentilles vertes rincées, 400 g de carottes en rondelles, 900 g d’eau, thym, laurier : 30 min / 100 °C / sens inverse / vit. mijotage. Saler en fin de cuisson.',
    'Pendant les 12 dernières minutes, poser 4 œufs dans le Varoma (mollets ; ajuster selon leur taille), puis les passer sous l’eau froide.'],
  'couscous-legumes': [OIGNON,
    '1 c. à soupe de ras el hanout : 1 min / Varoma / vit. 1.',
    'Ajouter 320 g de carottes et 200 g de navets en morceaux, 320 g de pois chiches égouttés, 1 L d’eau, 1 cube de bouillon : 15 min / 100 °C / sens inverse / vit. mijotage.',
    'Ajouter 400 g de courgettes en gros morceaux : 10 min / 100 °C / sens inverse / vit. mijotage.',
    'Semoule : verser le même volume de bouillon chaud sur 320 g de semoule, couvrir 5 min, égrainer avec une noisette de beurre.'],
  'hachis-lentilles': [
    'Oignon + 2 carottes : 5 s / vit. 5. 20 g d’huile : 3 min / Varoma / vit. 1. Ajouter 240 g de lentilles vertes, 650 g d’eau, thym : 25 min / 100 °C / sens inverse / vit. mijotage. Saler, réserver dans le plat.',
    PUREE,
    'Étaler la purée sur les lentilles, parsemer de comté : 20 min au four à 200 °C.'],
  'bolo-lentilles': [
    'Parmesan en morceaux : 10 s / vit. 10, réserver.',
    'Oignon + 1 carotte : 5 s / vit. 5. 20 g d’huile : 3 min / Varoma / vit. 1.',
    'Ajouter 160 g de lentilles corail, 480 g de coulis de tomate, 250 g d’eau, origan, sel : 20 min / 100 °C / sens inverse / vit. mijotage.',
    'Spaghetti au quinoa à la casserole (les spaghetti longs tiennent mal dans le bol). Servir avec le parmesan.'],
  'soupe-pois-casses': [OIGNON,
    'Ajouter 280 g de pois cassés rincés, 2 carottes en morceaux, 1,2 L d’eau : 45 min / 100 °C / vit. 1.',
    'Saler, mixer 1 min en montant progressivement de vit. 5 à 10. Servir avec le pain.'],
  minestrone: [
    'Poireau, 2 carottes et 1 branche de céleri en morceaux : 5 s / vit. 4. 20 g d’huile : 3 min / Varoma / vit. 1.',
    'Ajouter 320 g de coulis de tomate, 1 L d’eau, 1 cube de bouillon : 15 min / 100 °C / sens inverse / vit. 1.',
    'Ajouter 400 g de haricots blancs égouttés et 120 g de petites pâtes : temps des pâtes / 100 °C / sens inverse / vit. 1.'],
  'veloute-potiron-lentilles': [OIGNON,
    'Ajouter 1 kg de potiron en morceaux, 200 g de lentilles corail, 200 ml de lait de coco, 500 g d’eau, sel : 25 min / 100 °C / vit. 1.',
    'Mixer 1 min en montant progressivement de vit. 5 à 10.',
    'Graines de courge dorées 2 min à la poêle sèche.'],
  falafels: [
    'Sauce yaourt : quelques feuilles de menthe 5 s / vit. 7, ajouter 2 yaourts, un filet de citron, sel : 10 s / vit. 3. Réserver.',
    'Taboulé : verser 360 g d’eau bouillante salée sur 240 g de boulgour, couvrir 10 min. Couper tomates, concombre et menthe en petits dés au couteau (au Thermomix, ils partent en purée).',
    'Falafels au four selon le paquet.'],
  'houmous-crudites': [
    'Houmous maison (au lieu du houmous du commerce) : 1 gousse d’ail 3 s / vit. 7 ; ajouter 400 g de pois chiches égouttés, 60 g de purée de sésame (tahini), le jus d’un citron, 60 g d’eau, 30 g d’huile d’olive, cumin, sel : 1 min / vit. 5 à 8.',
    'Carottes : 4 s / vit. 5 (râpées grossièrement). Concombre en bâtonnets, feta en dés, pain pita chaud.'],
  'wraps-haricots': [
    'Haricots rouges égouttés, cumin, un filet de citron, sel : 5 s / vit. 4 (écrasé grossier).',
    'Tartiner les tortillas, ajouter salade, tomate et cheddar, rouler.'],
  'salade-lentilles': [
    'Lentilles : 240 g de lentilles vertes, 700 g d’eau, laurier : 25 min / 100 °C / sens inverse / vit. mijotage ; 4 œufs dans le Varoma pendant toute la cuisson (durs). Égoutter, refroidir.',
    'Vinaigrette : 1 échalote 3 s / vit. 5, 1 c. à café de moutarde, 20 g de vinaigre, 50 g d’huile, sel : 10 s / vit. 3.',
    'Mélanger avec tomates et concombre en dés.'],
  omelette: [
    'Champignons : 3 s / vit. 4, puis 10 g de beurre, 6 min / Varoma / sens inverse / vit. 1. Réserver.',
    'Œufs battus avec sel et poivre, cuire à la poêle, garnir avec les champignons.'],
  'quiche-poireaux': [
    'Pâte brisée maison (facultatif) : 250 g de farine, 125 g de beurre froid, 1 pincée de sel, 60 g d’eau : 20 s / vit. 6.',
    'Poireaux en tronçons : 5 s / vit. 4. 20 g de beurre : 10 min / Varoma / sens inverse / vit. 1.',
    'Appareil : 4 œufs, 160 ml de crème, 80 g de comté, sel, poivre : 10 s / vit. 4.',
    'Garnir la pâte, 35-40 min au four à 180 °C.'],
  'quiche-courgette': [
    'Pâte brisée maison (facultatif) : 250 g de farine, 125 g de beurre froid, 1 pincée de sel, 60 g d’eau : 20 s / vit. 6.',
    'Courgettes en morceaux : 3 s / vit. 4. 20 g d’huile : 8 min / Varoma / sens inverse / vit. 1.',
    'Appareil : 4 œufs, 160 ml de crème, sel, poivre : 10 s / vit. 4. Garnir, émietter le chèvre, 35-40 min à 180 °C.'],
  frittata: [
    '500 g d’eau dans le bol, 600 g de pommes de terre en dés dans le Varoma : 20 min / Varoma / vit. 1.',
    'Faire tomber les épinards à la poêle, ajouter les pommes de terre.',
    'Œufs + parmesan + sel : 10 s / vit. 4. Verser dans la poêle, cuire doucement puis finir 5 min sous le gril.'],
  shakshuka: [
    'Oignon + 1 poivron en morceaux : 4 s / vit. 5. 20 g d’huile : 5 min / Varoma / vit. 1.',
    'Ajouter 600 g de tomates en morceaux, cumin, paprika, sel : 15 min / Varoma / sens inverse / vit. 1, sans le gobelet (gobelet remplacé par le panier) pour réduire.',
    'Verser dans une poêle, creuser des puits, y casser les œufs, couvrir 6-8 min. Servir avec le pain.'],
  'croque-monsieur': [
    BECHAMEL(250, 25, 25),
    'Champignons émincés au couteau, poêlés 5 min.',
    'Tartiner le pain de mie de béchamel, garnir de champignons et d’emmental, refermer, un peu de béchamel et d’emmental dessus : 10-12 min au four à 200 °C.'],
  galettes: [
    'Champignons : 3 s / vit. 4, puis 10 g de beurre, 6 min / Varoma / sens inverse / vit. 1.',
    'Galettes à la poêle : œuf au centre, emmental, champignons, replier les bords.'],
  'lasagnes-epinards': [
    'Farce : 600 g d’épinards surgelés décongelés et bien pressés, 240 g de ricotta, sel, poivre, muscade : 10 s / vit. 4.',
    SAUCE_TOMATE,
    'Alterner sauce tomate, plaques, farce ; finir par la sauce et la mozzarella : 35 min au four à 180 °C.'],
  'gratin-dauphinois': [
    '1 gousse d’ail : 3 s / vit. 7.',
    'Ajouter 1,2 kg de pommes de terre en fines rondelles (mandoline), 320 g de lait, 200 ml de crème, sel, poivre, muscade : 15 min / 90 °C / sens inverse / vit. mijotage.',
    'Verser dans un plat beurré : 30 min au four à 180 °C. Œufs durs à part (10 min à l’eau bouillante).'],
  'gratin-chou-fleur': [
    '500 g d’eau dans le bol, chou-fleur en bouquets et pommes de terre en morceaux dans le Varoma : 20 min / Varoma / vit. 1. Vider le bol.',
    BECHAMEL(), 'Ajouter 80 g de comté : 10 s / vit. 3.',
    'Napper les légumes : 20 min au four à 200 °C.'],
  'endives-comte': [
    '1,2 L d’eau salée dans le bol, 200 g de riz dans le panier, 8 endives dans le Varoma : 22 min / Varoma / vit. 4. Bien égoutter les endives.',
    BECHAMEL(), 'Ajouter 100 g de comté : 10 s / vit. 3.',
    'Napper les endives : 20 min au four à 200 °C.'],
  risotto: [
    'Parmesan en morceaux : 10 s / vit. 10, réserver.',
    'Oignon + 30 g d’huile : 5 s / vit. 5, puis 3 min / Varoma / vit. 1. Ajouter 400 g de champignons émincés : 4 min / Varoma / sens inverse / vit. 1.',
    'Ajouter 320 g de riz arborio : 2 min / Varoma / sens inverse / vit. 1.',
    'Ajouter 900 g d’eau + 1 cube de bouillon : 16 min / 100 °C / sens inverse / vit. mijotage, sans le gobelet (panier sur le couvercle).',
    'Ajouter le parmesan, laisser reposer 2 min dans un plat.'],
  'pizza-legumes': [
    'Pâte : 300 g d’eau, 1 sachet de levure boulangère, 1 c. à café de sucre : 2 min / 37 °C / vit. 2. Ajouter 500 g de farine, 1 c. à café de sel, 20 g d’huile : 2 min / mode pétrin. Laisser lever 1 h.',
    'Sauce : 1 gousse d’ail 3 s / vit. 7, coulis de tomate, origan : 5 min / 100 °C / vit. 1.',
    'Étaler, garnir (sauce, mozzarella, champignons, olives) : 12-15 min au four à 250 °C.'],
  gnocchis: [SAUCE_TOMATE,
    'Dorer les gnocchis à la poêle, napper de sauce, mozzarella par-dessus, 5 min sous le gril.'],
  'coquillettes-pois': [
    'Pâtes et petits pois ensemble : 1,3 L d’eau salée, 10 min / 100 °C / vit. 1 ; ajouter 360 g de coquillettes et 320 g de petits pois surgelés : temps du paquet / 100 °C / sens inverse / vit. 1.',
    'Égoutter, ajouter le beurre et l’emmental.'],
  'carbonara-veg': [
    'Parmesan en morceaux (80 g) : 10 s / vit. 10. Ajouter 2 œufs entiers, 3 jaunes et beaucoup de poivre : 10 s / vit. 4. Réserver dans un saladier.',
    PATES(400),
    'Pendant ce temps, faire bien dorer 250 g de tofu fumé en petits dés à la poêle, 8-10 min, avec un filet d’huile (option : une pincée de paprika fumé). C’est lui qui remplace le lard.',
    'Hors du feu, dans le saladier : pâtes + tofu + mélange œufs-parmesan, remuer vite en ajoutant l’eau de cuisson petit à petit jusqu’à une sauce crémeuse. Pas de crème : œuf, fromage et eau des pâtes suffisent.'],
  'salade-quinoa': [
    '1 L d’eau salée dans le bol, 240 g de quinoa rincé dans le panier : 15 min / Varoma / vit. 4. Refroidir.',
    'Vinaigrette : jus de citron, 50 g d’huile d’olive, sel, poivre : 10 s / vit. 3.',
    'Mélanger avec concombre, tomates (en dés au couteau), feta et olives.'],
  ratatouille: [OIGNON,
    'Ajouter 1 kg de légumes en dés de 2 cm (courgette, aubergine, poivron, tomate), 1 gousse d’ail, herbes de Provence, sel : 30 min / 100 °C / sens inverse / vit. mijotage, sans le gobelet (panier sur le couvercle) pour évaporer.',
    'Semoule : même volume d’eau bouillante salée sur 240 g de semoule, couvrir 5 min. Œufs au plat à la poêle.'],
  'courgettes-farcies-veg': [
    'Boulgour : 400 g d’eau salée, 200 g de boulgour : 12 min / 100 °C / sens inverse / vit. mijotage. Réserver.',
    'Évider 4 courgettes coupées en deux. Chair des courgettes + 1 tomate : 3 s / vit. 4, puis 5 min / Varoma / sens inverse / vit. 1.',
    'Mélanger avec le boulgour et le chèvre émietté, farcir : 35 min au four à 180 °C.'],
  polenta: [
    'Parmesan en morceaux : 10 s / vit. 10, réserver.',
    'Champignons : 3 s / vit. 4, puis 15 g de beurre, 6 min / Varoma / sens inverse / vit. 1. Réserver.',
    'Polenta : 1 L d’eau + 1 cube de bouillon : 8 min / 100 °C / vit. 1 ; verser 280 g de polenta instantanée par l’orifice, moteur en marche : 5 min / 90 °C / vit. 3. Ajouter le parmesan.',
    'Servir avec les champignons et un œuf au plat.'],
  'quenelles-tomate': [OIGNON,
    'Ajouter 480 g de coulis de tomate, herbes, sel : 10 min / 100 °C / vit. 1.',
    'Quenelles dans un plat, napper de sauce, emmental : 20-25 min au four à 200 °C (elles gonflent).'],
  'quenelles-champignons': [RIZ,
    'Champignons : 3 s / vit. 4, puis 10 g de beurre, 8 min / Varoma / sens inverse / vit. 1. Réserver.',
    BECHAMEL(), 'Ajouter les champignons : 1 min / 90 °C / sens inverse / vit. mijotage.',
    'Quenelles dans un plat, napper : 20-25 min au four à 200 °C.'],
  'quenelles-brochet': [RIZ,
    'Quenelles dans un plat, napper de sauce Nantua : 20-25 min au four à 200 °C (elles gonflent). Servir avec le riz et une salade.'],
  'gratin-poireaux': [
    '500 g d’eau dans le bol, poireaux en tronçons et pommes de terre en rondelles dans le Varoma : 25 min / Varoma / vit. 1 ; ajouter 6 œufs sur le plateau du Varoma pour les 15 dernières minutes (durs). Vider le bol.',
    BECHAMEL(),
    'Plat : légumes, œufs durs en quartiers, béchamel : 20 min au four à 200 °C.'],
  cannellonis: [
    'Farce : 600 g d’épinards surgelés décongelés et bien pressés, 240 g de ricotta, sel, poivre, muscade : 10 s / vit. 4.',
    BECHAMEL(600, 45, 45),
    'Farcir les cannellonis crus, les coucher dans un plat, napper généreusement de béchamel (ils cuisent dedans) : 35 min au four à 180 °C.'],
  'moussaka-lentilles': [
    'Aubergines en tranches, badigeonnées d’huile : 20 min au four à 200 °C.',
    OIGNON,
    'Ajouter 200 g de lentilles vertes, 400 g de coulis de tomate, 450 g d’eau, cumin, cannelle, sel : 25 min / 100 °C / sens inverse / vit. mijotage. Réserver.',
    BECHAMEL(400, 35, 35),
    'Alterner aubergines et lentilles, finir par la béchamel : 30 min au four à 180 °C.'],
  'gratin-pates-brocoli': [
    'Pâtes et brocoli ensemble : 1,3 L d’eau salée, 10 min / Varoma / vit. 1 ; ajouter 320 g de pâtes dans le bol et le brocoli en bouquets dans le Varoma : temps du paquet / Varoma / sens inverse / vit. 1. Égoutter, vider le bol.',
    BECHAMEL(),
    'Mélanger pâtes, brocoli et béchamel, parsemer d’emmental : 20 min au four à 200 °C.'],
  'wok-tofu': [
    'Sauce : 1 gousse d’ail et 1 morceau de gingembre 3 s / vit. 7 ; ajouter 40 g de sauce soja, 1 c. à soupe de miel, 100 g d’eau, 1 c. à café de maïzena : 3 min / 90 °C / vit. 3.',
    'Faire sauter au wok le tofu en dés, puis les légumes émincés, ajouter les nouilles cuites et la sauce.'],
  'bowl-tofu': [RIZ,
    'Carottes : 4 s / vit. 5 (râpées grossièrement).',
    'Tofu fumé en dés mariné 10 min dans la sauce soja, doré à la poêle. Servir sur le riz avec carottes, concombre et radis.'],
  'saumon-riz': [
    'Repas complet en une fois : 1,2 L d’eau salée dans le bol, 250 g de riz dans le panier, brocoli en bouquets dans le Varoma, pavés de saumon sur le plateau du Varoma : 20 min / Varoma / vit. 4.'],
  'papillote-cabillaud': [
    '1,2 L d’eau salée dans le bol, 250 g de riz dans le panier ; papillotes (cabillaud, rondelles de courgette et de tomate, citron, sel) dans le Varoma : 20 min / Varoma / vit. 4.'],
  'colin-puree': [
    '500 g d’eau dans le bol, 600 g de carottes et 400 g de pommes de terre en morceaux dans le panier, colin en papillote dans le Varoma : 25 min / Varoma / vit. 4.',
    'Vider l’eau, remettre les légumes avec 40 g de beurre et un peu de lait, sel : 20 s / vit. 5.'],
  'poulet-roti': [
    'Poulet et pommes de terre au four (1 h 15 à 200 °C).',
    'Haricots verts : 500 g d’eau dans le bol, haricots dans le Varoma : 20-25 min / Varoma / vit. 1.'],
  'hachis-parmentier': [
    'Oignon + 1 carotte : 5 s / vit. 5. 20 g d’huile : 3 min / Varoma / vit. 1. Ajouter 450 g de bœuf haché : 8 min / Varoma / sens inverse / vit. mijotage. Saler, réserver dans le plat.',
    PUREE,
    'Purée sur la viande, comté : 20 min au four à 200 °C.'],
  blanquette: [
    'Oignon : 5 s / vit. 5. Ajouter 700 g de veau en morceaux, 400 g de carottes en rondelles, 600 g d’eau, 1 cube de bouillon, bouquet garni : 60 min / 100 °C / sens inverse / vit. mijotage.',
    'Ajouter 250 g de champignons : 10 min / 100 °C / sens inverse / vit. mijotage.',
    'Hors du feu, lier avec la crème (et un jaune d’œuf). Riz à part, à la casserole.'],
  bourguignon: [
    'Oignon : 5 s / vit. 5. 30 g d’huile : 3 min / Varoma / vit. 1. Ajouter 720 g de bœuf en cubes : 5 min / Varoma / sens inverse / vit. mijotage.',
    'Ajouter 1 c. à soupe de farine, 320 ml de vin rouge, 200 g d’eau, bouquet garni : 60 min / 100 °C / sens inverse / vit. mijotage.',
    'Ajouter carottes et champignons : 30 min / 100 °C / sens inverse / vit. mijotage. Pommes de terre à la vapeur à part.'],
  'pot-au-feu': [
    'Trop volumineux pour le bol du Thermomix : à la cocotte (3 h à petit frémissement).',
    'Au Thermomix, la sauce : 1 échalote 3 s / vit. 5, moutarde, cornichons, vinaigre, huile : 5 s / vit. 4.'],
  'poulet-basquaise': [RIZ,
    'Oignon + 2 poivrons en morceaux : 4 s / vit. 5. 20 g d’huile : 5 min / Varoma / vit. 1.',
    'Ajouter 700 g de poulet en morceaux (désossé), 400 g de tomates en morceaux, piment d’Espelette, sel : 30 min / 100 °C / sens inverse / vit. mijotage.'],
  'tomates-farcies': [
    'Oignon + persil : 5 s / vit. 5. Ajouter 360 g de chair à saucisse et la pulpe des tomates égouttée : 10 s / sens inverse / vit. 4.',
    'Farcir les tomates, riz cru au fond du plat avec un peu d’eau : 45 min au four à 180 °C.'],
  'quiche-lorraine': [
    'Pâte brisée maison (facultatif) : 250 g de farine, 125 g de beurre froid, 1 pincée de sel, 60 g d’eau : 20 s / vit. 6.',
    'Appareil : 4 œufs, 200 ml de crème, sel, poivre : 10 s / vit. 4.',
    'Lardons poêlés sur la pâte, verser l’appareil : 35-40 min au four à 180 °C.'],
};

// Ajoute la recette (texte) et l'indicateur Thermomix aux plats de départ
export function avecRecettes(plats) {
  return plats.map((p) => {
    const etapes = RECETTES[p.id];
    if (!etapes) return p;
    return { ...p, recette: etapes.map((e, n) => `${n + 1}. ${e}`).join('\n'), thermomix: etapes.some((e) => /vit\.|Varoma/.test(e)) };
  });
}
