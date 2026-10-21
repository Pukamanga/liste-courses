import { describe, it, expect } from 'vitest';
import { mettre, doc, appliquerDistants, enAttente, marquerEnvoyes, semer, supprimer, donnees } from '../src/store.js';

describe('stockage local et fusion (la plus récente gagne)', () => {
  it('une écriture locale est mise en attente puis marquée envoyée', () => {
    mettre('jours', '2026-11-02', { moi: 'M' });
    const att = enAttente().filter((d) => d.id === '2026-11-02');
    expect(att.length).toBe(1);
    marquerEnvoyes(att);
    expect(enAttente().some((d) => d.id === '2026-11-02')).toBe(false);
  });

  it('une donnée distante plus récente remplace la locale, une plus ancienne est ignorée', () => {
    mettre('jours', '2026-11-03', { moi: 'S' });
    const t = enAttente().find((d) => d.id === '2026-11-03').updated_at;
    appliquerDistants([{ coll: 'jours', id: '2026-11-03', data: { moi: 'R' }, updated_at: t - 1000, deleted: false }]);
    expect(doc('jours', '2026-11-03')).toEqual({ moi: 'S' });
    appliquerDistants([{ coll: 'jours', id: '2026-11-03', data: { moi: 'CA' }, updated_at: t + 1000, deleted: false }]);
    expect(doc('jours', '2026-11-03')).toEqual({ moi: 'CA' });
    expect(enAttente().some((d) => d.id === '2026-11-03')).toBe(false);
  });

  it('les plats de départ ne sont jamais envoyés tant qu’ils ne sont pas modifiés', () => {
    semer('plats', [{ id: 'test-seme', nom: 'Test' }]);
    expect(doc('plats', 'test-seme').nom).toBe('Test');
    expect(enAttente().some((d) => d.id === 'test-seme')).toBe(false);
    // une suppression venue de l'autre téléphone s'applique
    appliquerDistants([{ coll: 'plats', id: 'test-seme', data: {}, updated_at: 5, deleted: true }]);
    expect(donnees('plats')['test-seme']).toBeUndefined();
  });

  it('une suppression locale est une « pierre tombale » synchronisable', () => {
    mettre('gp', 'g1', { debut: '2026-11-01', fin: '2026-11-02', nb: 2 });
    supprimer('gp', 'g1');
    expect(doc('gp', 'g1')).toBeUndefined();
    expect(enAttente().find((d) => d.id === 'g1').deleted).toBe(true);
  });
});
