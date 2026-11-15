import { describe, it, expect } from 'vitest';
import { analyserJour } from '../src/moteur/regles.js';
import { fusionnerReglages } from '../src/moteur/reglages.js';
import { messageMenusClaude } from '../src/moteur/menus-claude.js';
import { joursDeLaSemaine } from '../src/moteur/dates.js';

const R = fusionnerReglages({});
const lundi = '2026-11-16';
const planning = { moi: 'R', julie: 'M' };
const jours = joursDeLaSemaine(lundi).map((d) => analyserJour(d, planning, R));
const plats = {
  dahl: { id: 'dahl', nom: 'Dahl de lentilles corail, riz' },
  omelette: { id: 'omelette', nom: 'Omelette aux champignons, salade' },
};

const message = (o = {}) => messageMenusClaude({
  titreSemaine: '16 – 22 novembre', jours, depuis: lundi, plats, reglages: R, ...o,
});

describe('message pour choisir les menus avec Claude', () => {
  it('liste les repas à prévoir avec heure, convives, temps et étiquettes', () => {
    const t = message();
    expect(t).toContain('Voici notre semaine du 16 – 22 novembre');
    expect(t).toContain('**Lundi 16 novembre** (Julien : R · Julie : M)');
    expect(t).toMatch(/- Midi : 12h30 Julien · 45 min de cuisine/);
    expect(t).toMatch(/- Soir : 19h30 Julien, Julie, Martin · 120 min de cuisine · Jour de cuisine/);
    // Mardi : danse et volley -> dîner en plusieurs temps
    expect(t).toMatch(/\*\*Mardi 17 novembre\*\*.*Danse africaine \(Julie 19h00–20h15\)/);
    expect(t).toContain('En plusieurs temps');
  });

  it('commence au jour indiqué', () => {
    const t = message({ depuis: '2026-11-19' });
    expect(t).not.toContain('Lundi 16 novembre');
    expect(t).toContain('Jeudi 19 novembre');
  });

  it('signale les plats déjà décidés et les repas à ne pas prévoir', () => {
    const t = message({ menus: {
      '2026-11-16-soir': { platId: 'dahl', verrouille: true },
      '2026-11-17-soir': { platId: 'dahl', verrouille: true, reste: '2026-11-16-soir' },
      '2026-11-18-soir': { aucun: true, verrouille: true },
      '2026-11-19-soir': { platId: 'omelette' }, // simple proposition : ignorée
    } });
    expect(t).toContain('→ déjà décidé : Dahl de lentilles corail, riz\n');
    expect(t).toContain('→ déjà décidé : Dahl de lentilles corail, riz (♻️ restes du lundi soir)');
    expect(t).toContain('Pas de repas à prévoir : mercredi soir.');
    expect(t).not.toContain('Omelette');
  });

  it('reprend le stock ligne par ligne et les notes récentes', () => {
    const t = message({
      stock: { frigo: '⚠️ 2 courgettes\n- crème fraîche\n\n', congelateur: '', envies: 'Une soupe' },
      menus: { '2026-11-10-soir': { platId: 'omelette', note: 'refaire', martinAime: true } },
    });
    expect(t).toContain('## Frigo (⚠️ = à manger vite)\n- ⚠️ 2 courgettes\n- crème fraîche\n');
    expect(t).toContain('## Congélateur\n(rien de noté)');
    expect(t).toContain('- Omelette aux champignons, salade (mardi soir) : 👍 à refaire, 😋 Martin a aimé');
    expect(t).toContain('## Envies et contraintes\n- Une soupe');
  });
});
