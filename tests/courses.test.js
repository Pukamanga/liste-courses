import { describe, it, expect } from 'vitest';
import { listeCourses, rayonDe, texteACopier, arrondir } from '../src/moteur/courses.js';
import { analyserImport } from '../src/moteur/import.js';
import { fusionnerReglages } from '../src/moteur/reglages.js';

const R = fusionnerReglages({});

describe('liste de courses', () => {
  const plats = {
    hachis: { id: 'hachis', nom: 'Hachis', ingredients: [
      { nom: 'Pomme de terre', qte: 250, unite: 'g' }, { nom: 'Bœuf haché', qte: 120, unite: 'g' }] },
    omelette: { id: 'omelette', nom: 'Omelette', ingredients: [{ nom: 'Œufs', qte: 2.5, unite: 'pièce' }] },
  };
  const creneaux = [
    { id: 'a-soir', convives: 2, vide: false },
    { id: 'b-soir', convives: 1, vide: false },
    { id: 'c-midi', convives: 2, vide: false },
  ];
  const menus = {
    'a-soir': { platId: 'hachis' },
    'b-soir': { platId: 'hachis', reste: 'a-soir' },
    'c-midi': { platId: 'omelette' },
  };

  it('additionne les quantités, restes compris, et regroupe par rayon', () => {
    const g = listeCourses(creneaux, menus, plats, new Set(['a-soir', 'b-soir', 'c-midi']));
    const tout = Object.fromEntries(g.flatMap((x) => x.articles.map((a) => [a.nom, a])));
    expect(tout['Pomme de terre'].quantite).toBe(750); // 250 g x (2 + 1)
    expect(tout['Bœuf haché'].quantite).toBe(400); // 360 -> arrondi
    expect(tout['Œufs'].quantite).toBe(5);
    expect(g.map((x) => x.rayon)).toEqual(['Fruits et légumes', 'Boucherie / volaille', 'Crèmerie / fromages']);
  });

  it('texte à copier sans les articles cochés', () => {
    const g = listeCourses(creneaux, menus, plats, new Set(['a-soir', 'c-midi']));
    const t = texteACopier(g, { 'œufs|pièce': true }, ['Papier toilette']);
    expect(t).toContain('Pomme de terre — 750 g');
    expect(t).not.toContain('Œufs');
    expect(t).toContain('Papier toilette');
  });

  it('rayons et arrondis', () => {
    expect(rayonDe({ nom: 'Coulis de tomate' })).toBe('Épicerie salée');
    expect(rayonDe({ nom: 'Lait de coco' })).toBe('Épicerie salée');
    expect(rayonDe({ nom: 'Pommes de terre' })).toBe('Fruits et légumes');
    expect(rayonDe({ nom: 'Truc', rayon: 'Surgelés' })).toBe('Surgelés');
    expect(arrondir(0.75, 'pièce')).toBe(1);
    expect(arrondir(123, 'g')).toBe(130);
  });
});

describe('import JSON du planning', () => {
  it('valide, signale avertissements et jours manquants', () => {
    const texte = '```json\n' + JSON.stringify({
      mois: '2026-11',
      jours: {
        '2026-11-01': { moi: 'M', julie: 'S' },
        '2026-11-02': { moi: 'S', julie: 's' },
        '2026-11-03': { moi: 'X', julie: 'R' },
        '2026-12-01': { moi: 'R', julie: 'R' },
      },
    }) + '\n```';
    const r = analyserImport(texte, R, []);
    expect(r.mois).toBe('2026-11');
    expect(r.jours['2026-11-02']).toEqual({ moi: 'S', julie: 'S' });
    expect(r.avertissements).toEqual(['2026-11-02 : Tous les deux en S']);
    expect(r.erreurs.length).toBe(2); // code X + date hors mois
    expect(r.manquants).toContain('2026-11-04 (jour absent)');
    expect(r.manquants).toContain('2026-11-03 : poste de Moi manquant');
  });

  it('refuse un JSON illisible', () => {
    expect(analyserImport('{pas du json', R).erreurs[0]).toMatch(/illisible/);
  });
});

describe('prompt Claude pour Leclerc Drive', () => {
  it('contient les règles, la liste sans les articles cochés et les repas', async () => {
    const { promptClaude } = await import('../src/moteur/courses.js');
    const groupes = [{ rayon: 'Fruits et légumes', articles: [
      { cle: 'carotte|g', texte: 'Carotte — 500 g', plats: ['Dahl'] },
      { cle: 'oignon|pièce', texte: 'Oignon — 2', plats: ['Dahl'] },
    ] }];
    const p = promptClaude({
      groupes, coches: { 'oignon|pièce': true }, extras: ['Bananes'], titreSemaine: '2 – 8 novembre',
      repas: ['Lundi soir : Dahl (3 pers.)'], magasin: 'Leclerc Drive Test', consignes: 'Pas de lait de vache.',
    });
    expect(p).toContain('Carotte — 500 g  (pour : Dahl)');
    expect(p).not.toContain('Oignon — 2');
    expect(p).toContain('- Bananes');
    expect(p).toMatch(/Bio en priorité/);
    expect(p).toMatch(/Nutri-Score A ou B/);
    expect(p).toMatch(/Ne valide pas la commande/);
    expect(p).toContain('« Leclerc Drive Test »');
    expect(p).toContain('Pas de lait de vache.');
    expect(p).toContain('- Lundi soir : Dahl (3 pers.)');
  });

  it('rayons des nouveaux ingrédients', () => {
    expect(rayonDe({ nom: 'Petits pois surgelés' })).toBe('Surgelés');
    expect(rayonDe({ nom: 'Tofu fumé' })).toBe('Traiteur / charcuterie');
    expect(rayonDe({ nom: 'Ricotta' })).toBe('Crèmerie / fromages');
    expect(rayonDe({ nom: 'Boulgour' })).toBe('Épicerie salée');
  });
});
