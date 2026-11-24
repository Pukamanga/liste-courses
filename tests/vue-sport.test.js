// La vue SQL du projet Claude « Sport » recopie quelques règles par défaut de l'app :
// ce test vérifie qu'elles restent identiques à REGLAGES_DEFAUT.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { REGLAGES_DEFAUT } from '../src/moteur/reglages.js';

const sql = readFileSync(new URL('../supabase/vue-sport.sql', import.meta.url), 'utf8');
const bloc = (tag) => JSON.parse(sql.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`))[1]);
const garder = (o, cles) => Object.fromEntries(cles.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const CLES_ACTIVITE = ['nom', 'qui', 'jours', 'debut', 'fin', 'mois', 'consistant'];

describe('vue SQL planning sport', () => {
  it('a les mêmes postes que l’application', () => {
    const attendu = Object.fromEntries(Object.entries(REGLAGES_DEFAUT.postes)
      .map(([code, p]) => [code, garder(p, ['libelle', 'debut', 'fin'])]));
    expect(bloc('postes')).toEqual(attendu);
  });

  it('a les mêmes activités de Julien que l’application', () => {
    const attendu = REGLAGES_DEFAUT.activites.filter((a) => a.qui === 'moi').map((a) => garder(a, CLES_ACTIVITE));
    expect(bloc('activites')).toEqual(attendu);
  });

  it('a le même VTT ajouté à la main', () => {
    expect(bloc('vtt')).toEqual(garder(REGLAGES_DEFAUT.vttManuel, CLES_ACTIVITE));
  });
});
