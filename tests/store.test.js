import { describe, it, expect } from 'vitest';
import { mettre, doc, appliquerDistants, enAttente, marquerEnvoyes, semer, supprimer, donnees, lot } from '../src/store.js';

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

describe('mise à jour des plats de départ', () => {
  it('remplace les plats de départ non modifiés, garde ceux modifiés', () => {
    semer('plats', [{ id: 's-a', nom: 'A v1' }, { id: 's-b', nom: 'B v1' }, { id: 's-c', nom: 'C v1' }], 1);
    mettre('plats', 's-b', { id: 's-b', nom: 'B modifié' });
    semer('plats', [{ id: 's-a', nom: 'A v2' }, { id: 's-b', nom: 'B v2' }], 2);
    expect(doc('plats', 's-a').nom).toBe('A v2');
    expect(doc('plats', 's-b').nom).toBe('B modifié');
    expect(doc('plats', 's-c')).toBeUndefined();
  });
});

describe('écritures automatiques « douces »', () => {
  it('un verrou posé sur l’autre téléphone l’emporte sur une proposition automatique', () => {
    // les deux téléphones partent de la même version du repas
    appliquerDistants([{ coll: 'menus', id: 'x-soir', data: { platId: 'hachis', auto: true }, updated_at: 1000, deleted: false }]);
    // ce téléphone (pas encore au courant du verrou) remplace automatiquement le plat
    lot([{ coll: 'menus', id: 'x-soir', data: { platId: 'dahl', auto: true } }], { doux: true });
    const auto = doc('menus', 'x-soir');
    expect(auto.platId).toBe('dahl');
    // le verrou posé plus tôt sur l'autre téléphone (même avec une horloge en retard) arrive
    appliquerDistants([{ coll: 'menus', id: 'x-soir', data: { platId: 'hachis', verrouille: true }, updated_at: 1005, deleted: false }]);
    expect(doc('menus', 'x-soir')).toEqual({ platId: 'hachis', verrouille: true });
  });

  it('une écriture normale reste datée de maintenant', () => {
    lot([{ coll: 'menus', id: 'y-soir', data: { platId: 'dahl' } }]);
    expect(enAttente().find((d) => d.id === 'y-soir').updated_at).toBeGreaterThan(1e12);
  });
});
