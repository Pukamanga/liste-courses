import { describe, it, expect } from 'vitest';
import { analyserJour } from '../src/moteur/regles.js';
import { fusionnerReglages, ETIQ } from '../src/moteur/reglages.js';
import { proposer, compatible, scoreSaison, statsNotes, scorer } from '../src/moteur/proposition.js';
import { estDeSaison, saisonDuMois } from '../src/moteur/saisons.js';
import { joursDeLaSemaine } from '../src/moteur/dates.js';

const R = fusionnerReglages({});

const plat = (id, extra) => ({ id, nom: id, prep: 10, cuisson: 10, saisons: [], ingredients: [], ...extra });
const PLATS = Object.fromEntries([
  plat('hachis', { prep: 25, cuisson: 30, rechauffe: true, double: true, consistant: true }),
  plat('omelette', { prep: 5, cuisson: 5 }),
  plat('pates', { prep: 5, cuisson: 10 }),
  plat('soupe', { prep: 15, cuisson: 20, rechauffe: true }),
  plat('quiche', { prep: 15, cuisson: 30, rechauffe: true }),
  plat('salade', { prep: 10, cuisson: 0, leger: true }),
  plat('croque', { prep: 5, cuisson: 10 }),
  plat('gratin', { prep: 15, cuisson: 25, rechauffe: true }),
].map((p) => [p.id, p]));

function creneauxSemaine(planning, lundi = '2026-11-02') {
  return joursDeLaSemaine(lundi).flatMap((d) => {
    const j = analyserJour(d, planning[d] || { moi: 'R', julie: 'R' }, R);
    return [j.creneaux.midi, j.creneaux.soir];
  });
}

describe('compatibilité avec l’étiquette du créneau', () => {
  const express = { etiquettes: [ETIQ.EXPRESS], prepDispo: 15 };
  const plusieurs = { etiquettes: [ETIQ.PLUSIEURS], prepDispo: 45 };
  const avance = { etiquettes: [ETIQ.AVANCE], prepDispo: 0 };
  it('express : le temps total doit tenir dans le temps disponible', () => {
    expect(compatible(PLATS.omelette, express)).toBe(true);
    expect(compatible(PLATS.hachis, express)).toBe(false);
  });
  it('en plusieurs temps / prêt à l’avance : il faut un plat qui se réchauffe', () => {
    expect(compatible(PLATS.pates, plusieurs)).toBe(false);
    expect(compatible(PLATS.soupe, plusieurs)).toBe(true);
    expect(compatible(PLATS.hachis, avance)).toBe(true);
    expect(compatible(PLATS.omelette, avance)).toBe(false);
  });
});

describe('enchaînement des restes', () => {
  // Lundi : Julie en M -> jour de cuisine ; mardi : moi en M2, Julie en S -> dîner normal mais pas jour de cuisine
  const planning = {
    '2026-11-02': { moi: 'S', julie: 'M' },
    '2026-11-03': { moi: 'M2', julie: 'S' },
    '2026-11-04': { moi: 'M2', julie: 'S' },
    '2026-11-05': { moi: 'M2', julie: 'S' },
  };
  const creneaux = creneauxSemaine(planning);

  it('un plat en double un jour de cuisine remplit un ou deux créneaux suivants', () => {
    const plats = { hachis: PLATS.hachis, omelette: PLATS.omelette, pates: PLATS.pates, croque: PLATS.croque };
    const res = proposer(creneaux, plats, {}, R, { graine: 't' });
    expect(res['2026-11-02-soir'].platId).toBe('hachis');
    const restes = Object.entries(res).filter(([, m]) => m?.reste === '2026-11-02-soir').map(([id]) => id);
    expect(restes.length).toBeGreaterThanOrEqual(1);
    expect(restes.length).toBeLessThanOrEqual(R.restesMax);
    for (const id of restes) {
      expect(id > '2026-11-02-soir').toBe(true);
      expect(res[id].platId).toBe('hachis');
    }
  });

  it('les restes vont en priorité aux soirs en plusieurs temps', () => {
    const p = { '2026-11-02': { moi: 'S', julie: 'M' }, '2026-11-03': { moi: 'M', julie: 'R' } };
    const cr = creneauxSemaine(p);
    const mardi = cr.find((c) => c.id === '2026-11-03-soir');
    expect(mardi.etiquettes).toContain(ETIQ.PLUSIEURS);
    const res = proposer(cr, { hachis: PLATS.hachis, omelette: PLATS.omelette, soupe: PLATS.soupe }, {}, R, { graine: 'x' });
    expect(res['2026-11-02-soir'].platId).toBe('hachis');
    expect(res['2026-11-03-soir'].reste).toBe('2026-11-02-soir');
  });

  it('pas le même plat deux fois en 10 jours (hors restes)', () => {
    const res = proposer(creneaux, PLATS, {}, R, { graine: 'y' });
    const parPlat = {};
    for (const [id, m] of Object.entries(res)) {
      if (!m?.platId || m.reste) continue;
      (parPlat[m.platId] ||= []).push(id);
    }
    // Avec assez de plats compatibles, aucune répétition sur la semaine
    const beaucoup = Object.fromEntries(Array.from({ length: 30 }, (_, i) =>
      [`p${i}`, plat(`p${i}`, { prep: 5, cuisson: 5, rechauffe: true })]));
    const res3 = proposer(creneaux, beaucoup, {}, R, { graine: 'w' });
    const ids = Object.values(res3).filter((m) => m?.platId && !m.reste).map((m) => m.platId);
    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
    const historique = { '2026-10-28-soir': { platId: 'omelette' } };
    const res2 = proposer(creneaux.slice(0, 2), PLATS, historique, R, { graine: 'y' });
    expect(Object.values(res2).some((m) => m?.platId === 'omelette')).toBe(false);
    expect(Object.keys(parPlat).length).toBeGreaterThan(3);
  });

  it('un créneau verrouillé est conservé, « Autre idée » exclut le plat refusé', () => {
    const menus = {
      '2026-11-02-midi': { platId: 'croque', verrouille: true },
      '2026-11-05-soir': { platId: 'pates', refus: ['quiche', 'gratin', 'soupe'] },
    };
    const res = proposer(creneaux, PLATS, menus, R, { graine: 'z', effacer: true });
    expect(res['2026-11-02-midi'].platId).toBe('croque');
    expect(['quiche', 'gratin', 'soupe']).not.toContain(res['2026-11-05-soir'].platId);
  });

  it('les plats bien notés passent devant', () => {
    const cr = creneauxSemaine({ '2026-11-02': { moi: 'M2', julie: 'S' } }).slice(1, 2);
    const plats = { omelette: PLATS.omelette, pates: PLATS.pates };
    const notes = {};
    for (let i = 1; i <= 3; i++) {
      notes[`2026-09-0${i}-soir`] = { platId: 'pates', note: 'refaire' };
      notes[`2026-09-1${i}-soir`] = { platId: 'omelette', note: 'bof' };
    }
    expect(statsNotes(notes).pates.refaire).toBe(3);
    const res = proposer(cr, plats, notes, R, { graine: 'n' });
    expect(res[cr[0].id].platId).toBe('pates');
  });
});

describe('saisonnalité', () => {
  it('calendrier des fruits et légumes', () => {
    expect(estDeSaison('courgettes', 7)).toBe(true);
    expect(estDeSaison('courgette', 1)).toBe(false);
    expect(estDeSaison('poireau', 1)).toBe(true);
    expect(estDeSaison('tomates cerises', 12)).toBe(false);
    expect(estDeSaison('coulis de tomate', 12)).toBeNull(); // produit transformé : neutre
    expect(estDeSaison('pâtes', 1)).toBeNull();
    expect(estDeSaison('pomme de terre', 3)).toBe(true);
    expect(saisonDuMois(1)).toBe('hiver');
    expect(saisonDuMois(7)).toBe('ete');
  });

  it('une ratatouille marque plus de points en juillet qu’en janvier, un pot-au-feu l’inverse', () => {
    const ratatouille = plat('rata', { saisons: ['ete'], ingredients: [{ nom: 'courgette' }, { nom: 'aubergine' }, { nom: 'tomate' }] });
    const potaufeu = plat('pot', { saisons: ['hiver', 'automne'], ingredients: [{ nom: 'poireau' }, { nom: 'navet' }, { nom: 'carotte' }] });
    expect(scoreSaison(ratatouille, 7)).toBeGreaterThan(scoreSaison(ratatouille, 1));
    expect(scoreSaison(potaufeu, 1)).toBeGreaterThan(scoreSaison(potaufeu, 7));
  });

  it('la proposition de janvier évite les plats d’été', () => {
    const rata = plat('rata', { saisons: ['ete'], ingredients: [{ nom: 'courgette' }, { nom: 'aubergine' }] });
    const soupe = plat('soupe', { saisons: ['hiver'], ingredients: [{ nom: 'poireau' }] });
    const cr = [analyserJour('2027-01-06', { moi: 'M2', julie: 'S' }, R).creneaux.soir];
    const res = proposer(cr, { rata, soupe }, {}, R, { graine: 'a' });
    expect(res[cr[0].id].platId).toBe('soupe');
  });
});

describe('viande et équilibre', () => {
  const veg = plat('veg', { proteine: 'legumineuses' });
  const viande = plat('viande', { proteine: 'viande', martin: 'aime', consistant: true });

  it('la viande n’est proposée que quand les grands-parents sont là', () => {
    const sans = [analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R).creneaux.soir];
    expect(proposer(sans, { veg, viande }, {}, R, { graine: 'v' })[sans[0].id].platId).toBe('veg');
    const avec = [analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R, [{ debut: '2026-11-01', fin: '2026-11-05', nb: 2 }]).creneaux.soir];
    expect(proposer(avec, { veg, viande }, {}, R, { graine: 'v' })[avec[0].id].platId).toBe('viande');
  });

  it('la règle viande se désactive dans les réglages', () => {
    const R2 = fusionnerReglages({ viandeAvecGrandsParentsSeulement: false });
    const cr = [analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R2).creneaux.soir];
    expect(proposer(cr, { veg, viande }, {}, R2, { graine: 'v' })[cr[0].id].platId).toBe('viande');
  });

  it('on varie la source de protéines d’un repas à l’autre', () => {
    const cr = creneauxSemaine({ '2026-11-02': { moi: 'R', julie: 'S' } }).slice(0, 2);
    const plats = {
      a1: plat('a1', { proteine: 'oeufs' }), a2: plat('a2', { proteine: 'oeufs' }),
      b1: plat('b1', { proteine: 'legumineuses' }),
    };
    const menus = { [cr[0].id]: { platId: 'a1', verrouille: true } };
    const res = proposer(cr, plats, menus, R, { graine: 'p' });
    expect(res[cr[1].id].platId).toBe('b1');
  });
});

describe('plats que Julie aime', () => {
  it('favorisés quand Julie mange à la maison', () => {
    const a = plat('a', {}), b = plat('b', { julieAime: true });
    const avec = [analyserJour('2026-11-02', { moi: 'M2', julie: 'R' }, R).creneaux.soir];
    const sans = [analyserJour('2026-11-02', { moi: 'R', julie: 'S' }, R).creneaux.soir];
    const scoreB = (cr) => scorer(b, cr[0], { stats: {}, graine: 'j', dernieresDates: () => null, reglages: R })
      - scorer(a, cr[0], { stats: {}, graine: 'j', dernieresDates: () => null, reglages: R });
    expect(scoreB(avec) - scoreB(sans)).toBeCloseTo(1.5, 1);
  });
});

describe('plats supprimés', () => {
  it('un repas dont le plat n’existe plus est re-proposé', () => {
    const cr = [analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R).creneaux.soir];
    const menus = { [cr[0].id]: { platId: 'raclette-disparue', auto: true } };
    const res = proposer(cr, { omelette: PLATS.omelette }, menus, R, { graine: 's' });
    expect(res[cr[0].id].platId).toBe('omelette');
  });
});
