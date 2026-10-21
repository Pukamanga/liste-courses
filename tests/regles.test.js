import { describe, it, expect } from 'vitest';
import { analyserJour, avertissementSaisie, activitesDuJour } from '../src/moteur/regles.js';
import { REGLAGES_DEFAUT, ETIQ, fusionnerReglages } from '../src/moteur/reglages.js';
import { jourEcole, ferie } from '../src/moteur/vacances.js';

const R = fusionnerReglages({});
const GP = [{ debut: '2026-11-01', fin: '2026-11-08', nb: 2 }];

describe('qui mange où et à quelle heure', () => {
  it('lundi d’école, moi en S, Julie en M', () => {
    const j = analyserJour('2026-11-02', { moi: 'S', julie: 'M' }, R);
    expect(j.ecole).toBe(true);
    const { midi, soir } = j.creneaux;
    expect(midi.moments).toEqual([{ heure: '12:00', qui: ['moi'] }]); // Martin à la cantine
    expect(midi.prepDispo).toBe(30);
    expect(soir.moments).toEqual([{ heure: '19:30', qui: ['julie', 'martin'] }]); // moi en S : dîner au travail
    expect(soir.convives).toBe(1.75);
  });

  it('les postes M, M2 et F mangent au travail à midi', () => {
    for (const code of ['M', 'M2', 'F']) {
      const j = analyserJour('2026-11-02', { moi: code, julie: 'R' }, R);
      expect(j.creneaux.midi.moments[0].qui).toEqual(['julie']);
      expect(j.creneaux.soir.moments[0].qui).toContain('moi');
    }
  });

  it('les deux au travail un jour d’école : pas de déjeuner à la maison', () => {
    const j = analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R);
    expect(j.creneaux.midi.moments[0].qui).toEqual(['julie']);
    const k = analyserJour('2026-11-02', { moi: 'M2', julie: 'F' }, R);
    expect(k.creneaux.midi.vide).toBe(true);
  });

  it('mercredi : Martin à la maison, déjeuner rapide à 12h15 après le théâtre', () => {
    const j = analyserJour('2026-11-04', { moi: 'R', julie: 'M2' }, R);
    const midi = j.creneaux.midi;
    expect(midi.moments).toEqual([{ heure: '12:15', qui: ['moi', 'martin'] }]);
    expect(midi.prepDispo).toBe(15);
    expect(midi.etiquettes).toContain(ETIQ.EXPRESS);
  });

  it('Martin déjeune à la maison le week-end, en vacances et les jours fériés', () => {
    expect(analyserJour('2026-11-07', { moi: 'R', julie: 'R' }, R).creneaux.midi.martin).toBe(true);
    expect(analyserJour('2026-10-20', { moi: 'R', julie: 'M' }, R).creneaux.midi.martin).toBe(true);
    expect(ferie('2026-05-01')).toBe('Fête du travail');
    expect(jourEcole('2026-05-01', R.vacances)).toBe(false);
    expect(analyserJour('2026-05-01', { moi: 'R', julie: 'M' }, R).creneaux.midi.martin).toBe(true);
  });

  it('pendant les vacances, le théâtre du mercredi est ignoré', () => {
    const j = analyserJour('2026-10-21', { moi: 'R', julie: 'M' }, R);
    expect(j.activites.find((a) => a.id === 'theatre').ignoree).toBe(true);
    expect(j.creneaux.midi.moments[0].heure).toBe('12:30');
  });

  it('interrupteur « Martin absent » par repas', () => {
    const j = analyserJour('2026-11-07', { moi: 'R', julie: 'R', martinAbsent: { soir: true } }, R);
    expect(j.creneaux.midi.martin).toBe(true);
    expect(j.creneaux.soir.martin).toBe(false);
    expect(j.creneaux.soir.moments[0].qui).toEqual(['moi', 'julie']);
  });
});

describe('activités du soir et dîner en plusieurs temps', () => {
  it('mardi : Martin 19h30, Julie après la danse 20h30, moi après le volley 22h45', () => {
    const j = analyserJour('2026-11-03', { moi: 'M', julie: 'R' }, R);
    expect(j.creneaux.soir.moments).toEqual([
      { heure: '19:30', qui: ['martin'] },
      { heure: '20:30', qui: ['julie'] },
      { heure: '22:45', qui: ['moi'] },
    ]);
    expect(j.creneaux.soir.etiquettes).toContain(ETIQ.PLUSIEURS);
    expect(j.creneaux.soir.avertissements).toEqual([]);
  });

  it('jeudi : volley, dîner vers 22h15', () => {
    const j = analyserJour('2026-11-05', { moi: 'R', julie: 'S' }, R);
    expect(j.creneaux.soir.moments).toEqual([
      { heure: '19:30', qui: ['martin'] },
      { heure: '22:15', qui: ['moi'] },
    ]);
  });

  it('une activité du soir est ignorée si la personne est en S', () => {
    const j = analyserJour('2026-11-03', { moi: 'S', julie: 'M' }, R);
    const volley = j.activites.find((a) => a.id === 'volley-mardi');
    expect(volley.ignoree).toBe(true);
    expect(volley.raison).toMatch(/S/);
    expect(j.activites.find((a) => a.id === 'danse').ignoree).toBeFalsy();
    // Julie à la danse : personne avec Martin à 19h30, et le repas doit être prêt à l'avance
    expect(j.creneaux.soir.moments.map((m) => m.heure)).toEqual(['19:30', '20:30']);
    expect(j.creneaux.soir.etiquettes).toContain(ETIQ.AVANCE);
    expect(j.creneaux.soir.avertissements[0]).toMatch(/Aucun adulte/);
  });

  it('la danse est ignorée si Julie est en S', () => {
    const acts = activitesDuJour('2026-11-03', { moi: 'R', julie: 'S' }, R);
    expect(acts.find((a) => a.id === 'danse').ignoree).toBe(true);
  });
});

describe('étiquettes des créneaux', () => {
  it('jour de cuisine si l’un est en R, CA ou M', () => {
    for (const code of ['R', 'CA', 'M']) {
      const j = analyserJour('2026-11-02', { moi: code, julie: 'S' }, R);
      expect(j.jourCuisine).toBe(true);
      expect(j.creneaux.soir.etiquettes).toContain(ETIQ.CUISINE);
      expect(j.creneaux.soir.prepDispo).toBe(R.prep.jourCuisine);
    }
    const j = analyserJour('2026-11-02', { moi: 'M2', julie: 'S' }, R);
    expect(j.jourCuisine).toBe(false);
    expect(j.creneaux.soir.prepDispo).toBe(45);
  });

  it('VTT du mardi matin (avril–novembre) : repas consistants, déjeuner prêt à l’avance avant un poste S', () => {
    const j = analyserJour('2026-11-03', { moi: 'S', julie: 'M' }, R);
    expect(j.vtt).toBe(true);
    expect(j.creneaux.midi.etiquettes).toEqual(expect.arrayContaining([ETIQ.VTT, ETIQ.AVANCE]));
    expect(j.creneaux.midi.convives).toBeCloseTo(1.3);
  });

  it('VTT ignoré en décembre et si je suis du matin', () => {
    expect(analyserJour('2026-12-01', { moi: 'R', julie: 'S' }, R).vtt).toBe(false);
    expect(analyserJour('2026-11-03', { moi: 'M', julie: 'R' }, R).vtt).toBe(false);
  });

  it('le VTT du mardi peut être décoché', () => {
    expect(analyserJour('2026-11-03', { moi: 'S', julie: 'M', vtt: false }, R).vtt).toBe(false);
  });

  it('case VTT cochée un jour de repos', () => {
    const j = analyserJour('2026-11-02', { moi: 'R', julie: 'S', vtt: true }, R);
    expect(j.vtt).toBe(true);
    expect(j.creneaux.soir.etiquettes).toContain(ETIQ.VTT);
  });
});

describe('règle M/S et grands-parents', () => {
  it('avertit si tous les deux en M ou en S', () => {
    expect(avertissementSaisie('2026-11-02', { moi: 'M', julie: 'M' }, R, [])).toMatch(/M/);
    expect(avertissementSaisie('2026-11-02', { moi: 'S', julie: 'S' }, R, [])).toMatch(/S/);
    expect(avertissementSaisie('2026-11-02', { moi: 'M', julie: 'S' }, R, [])).toBeNull();
    expect(avertissementSaisie('2026-11-02', { moi: 'R', julie: 'R' }, R, [])).toBeNull();
    expect(analyserJour('2026-11-02', { moi: 'S', julie: 'S' }, R).avertissements.length).toBe(1);
  });

  it('pas d’avertissement pendant une période « Grands-parents à la maison »', () => {
    expect(avertissementSaisie('2026-11-02', { moi: 'M', julie: 'M' }, R, GP)).toBeNull();
    const j = analyserJour('2026-11-02', { moi: 'M', julie: 'M' }, R, GP);
    expect(j.avertissements).toEqual([]);
  });

  it('la règle se désactive dans les réglages', () => {
    const R2 = fusionnerReglages({ regleMS: false });
    expect(avertissementSaisie('2026-11-02', { moi: 'M', julie: 'M' }, R2, [])).toBeNull();
  });

  it('les grands-parents s’ajoutent aux repas pris à la maison', () => {
    const j = analyserJour('2026-11-02', { moi: 'M', julie: 'M' }, R, GP);
    expect(j.gp).toBe(2);
    expect(j.creneaux.midi.vide).toBe(false);
    expect(j.creneaux.midi.personnes).toBe(2);
    expect(j.creneaux.soir.personnes).toBe(5);
    expect(j.creneaux.soir.convives).toBeCloseTo(4.75);
    expect(j.creneaux.soir.etiquettes).toContain(ETIQ.GP);
    // ils peuvent garder Martin : pas d'avertissement le mardi de danse
    const k = analyserJour('2026-11-03', { moi: 'S', julie: 'M' }, R, GP);
    expect(k.creneaux.soir.avertissements).toEqual([]);
  });

  it('un poste manquant est signalé', () => {
    const j = analyserJour('2026-11-02', { moi: 'M' }, R);
    expect(j.incomplet).toBe(true);
    expect(j.avertissements[0]).toMatch(/non saisi/);
  });

  it('les défauts reflètent les horaires des postes', () => {
    expect(REGLAGES_DEFAUT.postes.S).toMatchObject({ debut: '13:15', fin: '21:15' });
    expect(REGLAGES_DEFAUT.postes.M2).toMatchObject({ debut: '08:30', fin: '16:30' });
  });
});
