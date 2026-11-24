// Synchronisation Google Agenda : calcul des événements, déclencheur SQL et traitement de la
// file d'attente, testés sur un vrai Postgres (PGlite) avec un faux Google.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { REGLAGES_DEFAUT } from '../src/moteur/reglages.js';
import { DEFAUTS, regles, evenementsDuJour, planifier, idEvenement, dateParis } from '../supabase/functions/agenda-google/planning.js';
import { creerGoogle, ErreurGoogle } from '../supabase/functions/agenda-google/google.js';
import { traiter, demarrerConnexion, terminerConnexion, deconnecter, statut, estMembre } from '../supabase/functions/agenda-google/synchro.js';

const lire = (f) => readFileSync(new URL(`../supabase/${f}`, import.meta.url), 'utf8');
const R = regles();

describe('événements calculés', () => {
  it('reprend les postes et prénoms par défaut de l’application', () => {
    const postes = Object.fromEntries(Object.entries(REGLAGES_DEFAUT.postes)
      .map(([c, p]) => [c, { libelle: p.libelle, debut: p.debut, fin: p.fin }]));
    expect(DEFAUTS.postes).toEqual(postes);
    expect(DEFAUTS.noms).toEqual({ moi: REGLAGES_DEFAUT.noms.moi, julie: REGLAGES_DEFAUT.noms.julie });
  });

  it('crée un événement par personne au travail, dans chaque agenda', () => {
    const ev = evenementsDuJour('2026-12-01', { moi: 'M', julie: 'S', vtt: true }, R);
    expect(ev.map((e) => [e.id, e.corps.summary, e.corps.start.dateTime, e.corps.end.dateTime])).toEqual([
      ['pt20261201a', 'Julien · Matin', '2026-12-01T06:15:00', '2026-12-01T14:15:00'],
      ['pt20261201b', 'Julie · Soir', '2026-12-01T13:15:00', '2026-12-01T21:15:00'],
    ]);
    expect(ev[0].corps.start.timeZone).toBe('Europe/Paris');
    expect(ev[0].corps.reminders).toEqual({ useDefault: false });
  });

  it('ne crée rien pour Repos, Congé, un jour vide ou un code inconnu', () => {
    expect(evenementsDuJour('2026-12-01', { moi: 'R', julie: 'CA' }, R)).toEqual([]);
    expect(evenementsDuJour('2026-12-01', {}, R)).toEqual([]);
    expect(evenementsDuJour('2026-12-01', undefined, R)).toEqual([]);
    expect(evenementsDuJour('2026-12-01', { moi: 'X' }, R)).toEqual([]);
  });

  it('suit les horaires et prénoms modifiés dans les réglages', () => {
    const R2 = regles({ noms: { julie: 'Ju' }, postes: { M: { debut: '06:00' }, N: { libelle: 'Nuit', debut: '21:00', fin: '06:00' } } });
    const [m] = evenementsDuJour('2026-12-31', { moi: 'M' }, R2);
    expect(m.corps.start.dateTime).toBe('2026-12-31T06:00:00');
    expect(m.corps.end.dateTime).toBe('2026-12-31T14:15:00');
    const [n] = evenementsDuJour('2026-12-31', { julie: 'N' }, R2);
    expect(n.corps.summary).toBe('Ju · Nuit');
    expect(n.corps.end.dateTime).toBe('2027-01-01T06:00:00'); // poste de nuit : finit le lendemain
  });

  it('utilise des identifiants acceptés par Google (base32hex, 5 à 1024 caractères)', () => {
    for (const qui of ['moi', 'julie']) expect(idEvenement('2026-01-09', qui)).toMatch(/^[0-9a-v]{5,1024}$/);
  });

  it('n’envoie que les différences', () => {
    const voulus = evenementsDuJour('2026-12-01', { moi: 'M', julie: 'S' }, R);
    const [a, b] = voulus;
    const envoyes = new Map([[a.id, a.empreinte], [b.id, 'ancien'], ['pt20261202a', 'x']]);
    expect(planifier(voulus, envoyes).map((x) => [x.op, x.id, x.existe])).toEqual([
      ['ecrire', b.id, true],
      ['effacer', 'pt20261202a', undefined],
    ]);
    expect(planifier(voulus, new Map()).map((x) => [x.op, x.existe])).toEqual([['ecrire', false], ['ecrire', false]]);
  });

  it('calcule la date du jour à Paris', () => {
    expect(dateParis(new Date('2026-11-24T23:30:00Z'))).toBe('2026-11-25');
    expect(dateParis(new Date('2026-03-01T12:00:00Z'), -1)).toBe('2026-02-28');
  });
});

describe('client Google', () => {
  function faux(reponses) {
    const appels = [];
    const fetch = async (url, init = {}) => {
      appels.push(`${init.method || 'GET'} ${url.replace('https://www.googleapis.com/calendar/v3', '')}`);
      const [status, corps] = reponses.shift();
      return new Response(status === 204 ? null : JSON.stringify(corps), { status });
    };
    return { appels, g: creerGoogle({ clientId: 'id', clientSecret: 's', redirectUri: 'https://f', fetch }) };
  }

  it('met à jour un événement déjà connu de Google au lieu de le recréer', async () => {
    const { appels, g } = faux([[409, { error: { message: 'exists' } }], [200, {}]]);
    await g.ecrireEvenement('t', 'cal@x', 'pt1', { summary: 'a' }, false);
    expect(appels).toEqual(['POST /calendars/cal%40x/events', 'PUT /calendars/cal%40x/events/pt1']);
  });

  it('recrée un événement disparu', async () => {
    const { appels, g } = faux([[404, {}], [200, {}]]);
    await g.ecrireEvenement('t', 'c', 'pt1', {}, true);
    expect(appels).toEqual(['PUT /calendars/c/events/pt1', 'POST /calendars/c/events']);
  });

  it('accepte l’effacement d’un événement déjà supprimé', async () => {
    const { g } = faux([[410, { error: { message: 'deleted' } }]]);
    await expect(g.effacerEvenement('t', 'c', 'pt1')).resolves.toBeUndefined();
  });

  it('signale une clé retirée comme définitive', async () => {
    const { g } = faux([[400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }]]);
    const e = await g.rafraichir('r').catch((x) => x);
    expect(e).toBeInstanceOf(ErreurGoogle);
    expect(e.definitive).toBe(true);
  });

  it('demande un accès hors ligne limité aux agendas de l’application', () => {
    const { g } = faux([]);
    const u = new URL(g.urlAutorisation({ etat: 'abc', email: 'moi@example.com' }));
    expect(u.searchParams.get('scope')).toContain('calendar.app.created');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('state')).toBe('abc');
  });
});

// --- Base de données ---------------------------------------------------------

let db;
const q = async (texte, params = []) => (await db.query(texte, params)).rows;

async function mettreDoc(coll, id, data, deleted = false) {
  await q(
    `insert into public.docs (coll, id, data, updated_at, deleted) values ($1, $2, $3::jsonb, $4, $5)
     on conflict (coll, id) do update set data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted`,
    [coll, id, JSON.stringify(data), Date.now(), deleted]);
}
const file = async () => (await q('select cle, n from agenda.file order by cle')).map((l) => [l.cle, Number(l.n)]);

// Faux Google : garde les événements de chaque agenda en mémoire
function fauxGoogle() {
  const agendas = {}; // jeton (= compte) → { id: corps }
  const g = {
    appels: 0,
    panne: null, // fonction (op) → erreur à lancer
    agendas,
    rafraichir: async (r) => { if (g.panne?.('rafraichir')) throw g.panne('rafraichir'); return { accessToken: r, refreshToken: null }; },
    ecrireEvenement: async (jeton, cal, id, corps) => {
      g.appels++;
      if (g.panne?.('ecrire')) throw g.panne('ecrire');
      (agendas[cal] ||= {})[id] = corps;
      await g.pendant?.();
    },
    effacerEvenement: async (jeton, cal, id) => { g.appels++; delete agendas[cal]?.[id]; },
    urlAutorisation: ({ etat }) => `https://google/auth?state=${etat}`,
    echangerCode: async (code) => ({ refreshToken: `r-${code}`, accessToken: `a-${code}`, email: `${code}@gmail.com` }),
    agendaExiste: async (jeton, id) => id in agendas,
    creerAgenda: async (jeton) => { const id = `cal-${jeton}`; agendas[id] = {}; return id; },
    supprimerAgenda: async (jeton, id) => { delete agendas[id]; },
    revoquer: async () => {},
  };
  return g;
}

async function connecter(google, email, code) {
  const url = await demarrerConnexion({ q, google, email, retour: 'https://exemple.github.io/liste-courses/', urlFonction: 'https://ref.supabase.co/functions/v1/agenda-google' });
  return terminerConnexion({ q, google, etat: new URL(url).searchParams.get('state'), code });
}

beforeAll(async () => {
  db = new PGlite();
  // Ce que Supabase fournit (rôles, auth, publication temps réel)
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create publication supabase_realtime;
  `);
  await db.exec(lire('schema.sql'));
  await db.exec(lire('agenda-google.sql'));
  await db.exec(lire('agenda-google.sql')); // ré-exécutable
}, 60_000);

beforeEach(async () => {
  await db.exec(`truncate public.docs, agenda.file, agenda.demandes, agenda.comptes cascade;
    update agenda.config set url = null, verrou_jusqu = '-infinity';`);
});

describe('déclencheur sur le planning', () => {
  it('note le jour modifié, seulement si un poste change', async () => {
    await mettreDoc('jours', '2026-12-01', { moi: 'M' });
    const [[cle, n]] = await file();
    expect(cle).toBe('2026-12-01');
    await mettreDoc('jours', '2026-12-01', { moi: 'M', vtt: true }); // la case VTT ne change rien à l'agenda
    expect((await file())[0][1]).toBe(n);
    await mettreDoc('jours', '2026-12-01', { moi: 'S', vtt: true });
    expect((await file())[0][1]).toBeGreaterThan(n);
  });

  it('revoit tout quand les horaires ou les prénoms changent, pas pour le reste des réglages', async () => {
    await mettreDoc('reglages', 'regles', { trajetMin: 20 });
    await q('truncate agenda.file');
    await mettreDoc('reglages', 'regles', { trajetMin: 25 });
    expect(await file()).toEqual([]);
    await mettreDoc('reglages', 'regles', { trajetMin: 25, postes: { M: { debut: '06:00' } } });
    expect((await file()).map((x) => x[0])).toEqual(['*']);
  });

  it('ignore les autres collections', async () => {
    await mettreDoc('menus', '2026-12-01-midi', { platId: 'x' });
    expect(await file()).toEqual([]);
  });
});

describe('connexion d’un agenda', () => {
  it('crée l’agenda dédié, garde la clé et demande une synchronisation complète', async () => {
    const g = fauxGoogle();
    const r = await connecter(g, 'moi@example.com', 'julien');
    expect(r).toEqual({ retour: 'https://exemple.github.io/liste-courses/', ok: true, message: '' });
    const [c] = await q('select google_email, refresh_token, calendar_id from agenda.comptes');
    expect(c).toEqual({ google_email: 'julien@gmail.com', refresh_token: 'r-julien', calendar_id: 'cal-a-julien' });
    expect((await file()).map((x) => x[0])).toEqual(['*']);
    expect((await q('select url from agenda.config'))[0].url).toBe('https://ref.supabase.co/functions/v1/agenda-google');
  });

  it('réutilise l’agenda existant à la reconnexion', async () => {
    const g = fauxGoogle();
    await connecter(g, 'moi@example.com', 'julien');
    await connecter(g, 'moi@example.com', 'julien2');
    expect(Object.keys(g.agendas)).toEqual(['cal-a-julien']);
  });

  it('refuse une demande inconnue, déjà utilisée ou expirée', async () => {
    const g = fauxGoogle();
    expect((await terminerConnexion({ q, google: g, etat: 'faux', code: 'x' })).ok).toBe(false);
    const url = await demarrerConnexion({ q, google: g, email: 'moi@example.com', retour: 'https://a.b/', urlFonction: 'u' });
    const etat = new URL(url).searchParams.get('state');
    await q(`update agenda.demandes set cree_le = now() - interval '1 hour'`);
    expect(await terminerConnexion({ q, google: g, etat, code: 'x' })).toMatchObject({ ok: false, retour: 'https://a.b/' });
    expect((await terminerConnexion({ q, google: g, etat, code: 'x' })).retour).toBe(null);
  });

  it('refuse une adresse de retour non sécurisée', async () => {
    await expect(demarrerConnexion({ q, google: fauxGoogle(), email: 'm', retour: 'http://pirate.example/', urlFonction: 'u' }))
      .rejects.toThrow();
  });

  it('liste les membres et leur état, et vérifie l’appartenance', async () => {
    await connecter(fauxGoogle(), 'moi@example.com', 'julien');
    const s = await statut({ q });
    expect(s.map((m) => [m.email, m.connecte, m.google_email])).toEqual([
      ['julie@example.com', false, null],
      ['moi@example.com', true, 'julien@gmail.com'],
    ]);
    expect(await estMembre(q, 'MOI@example.com')).toBe(true);
    expect(await estMembre(q, 'autre@example.com')).toBe(false);
  });

  it('supprime l’agenda et la clé à la déconnexion', async () => {
    const g = fauxGoogle();
    await connecter(g, 'moi@example.com', 'julien');
    await deconnecter({ q, google: g, email: 'moi@example.com' });
    expect(g.agendas).toEqual({});
    expect(await q('select * from agenda.comptes')).toEqual([]);
  });
});

describe('envoi vers Google', () => {
  const demain = dateParis(new Date(), 1);
  const resume = (g, cal) => Object.fromEntries(Object.entries(g.agendas[cal] || {}).map(([id, c]) => [id, c.summary]));

  it('remplit les deux agendas avec les postes des deux, puis suit les modifications', async () => {
    const g = fauxGoogle();
    await mettreDoc('jours', demain, { moi: 'M', julie: 'R' });
    await connecter(g, 'moi@example.com', 'julien');
    await connecter(g, 'julie@example.com', 'julie');
    expect(await traiter({ q, google: g })).toMatchObject({ statut: 'fait' });
    const idM = idEvenement(demain, 'moi');
    const idJ = idEvenement(demain, 'julie');
    expect(resume(g, 'cal-a-julien')).toEqual({ [idM]: 'Julien · Matin' });
    expect(resume(g, 'cal-a-julie')).toEqual({ [idM]: 'Julien · Matin' });
    expect(await file()).toEqual([]);

    await mettreDoc('jours', demain, { moi: 'S', julie: 'M2' });
    await traiter({ q, google: g });
    expect(resume(g, 'cal-a-julie')).toEqual({ [idM]: 'Julien · Soir', [idJ]: 'Julie · Matin 2' });

    await mettreDoc('jours', demain, { moi: 'CA', julie: 'M2' });
    await traiter({ q, google: g });
    expect(resume(g, 'cal-a-julien')).toEqual({ [idJ]: 'Julie · Matin 2' });

    // Rien à refaire : aucun appel à Google
    const avant = g.appels;
    await q(`select agenda.tout_resynchroniser()`);
    expect(await traiter({ q, google: g })).toMatchObject({ statut: 'fait' });
    expect(g.appels).toBe(avant);
  });

  it('met à jour tous les événements quand un horaire change', async () => {
    const g = fauxGoogle();
    await mettreDoc('jours', demain, { moi: 'M' });
    await connecter(g, 'moi@example.com', 'julien');
    await traiter({ q, google: g });
    await mettreDoc('reglages', 'regles', { postes: { M: { debut: '06:00' } } });
    await traiter({ q, google: g });
    expect(g.agendas['cal-a-julien'][idEvenement(demain, 'moi')].start.dateTime).toBe(`${demain}T06:00:00`);
  });

  it('garde à traiter une modification arrivée pendant l’envoi', async () => {
    const g = fauxGoogle();
    await mettreDoc('jours', demain, { moi: 'M' });
    await connecter(g, 'moi@example.com', 'julien');
    g.pendant = async () => { g.pendant = null; await mettreDoc('jours', demain, { moi: 'S' }); };
    await traiter({ q, google: g });
    expect((await file()).map((x) => x[0])).toEqual([demain]);
    await traiter({ q, google: g });
    expect(resume(g, 'cal-a-julien')).toEqual({ [idEvenement(demain, 'moi')]: 'Julien · Soir' });
  });

  it('ne lance pas deux traitements en même temps', async () => {
    await q(`update agenda.config set verrou_jusqu = now() + interval '1 minute'`);
    expect(await traiter({ q, google: fauxGoogle() })).toEqual({ statut: 'occupe' });
  });

  it('réessaie plus tard en cas de quota dépassé', async () => {
    const g = fauxGoogle();
    await mettreDoc('jours', demain, { moi: 'M' });
    await connecter(g, 'moi@example.com', 'julien');
    g.panne = (op) => op === 'ecrire' && new ErreurGoogle('quota', { statut: 429 });
    expect(await traiter({ q, google: g })).toMatchObject({ statut: 'a_reprendre' });
    expect((await file()).length).toBeGreaterThan(0);
    g.panne = null;
    expect(await traiter({ q, google: g })).toMatchObject({ statut: 'fait' });
    expect((await q('select erreur from agenda.comptes'))[0].erreur).toBe(null);
  });

  it('demande de reconnecter l’agenda si Google a retiré l’accès', async () => {
    const g = fauxGoogle();
    await mettreDoc('jours', demain, { moi: 'M' });
    await connecter(g, 'moi@example.com', 'julien');
    g.panne = (op) => op === 'rafraichir' && new ErreurGoogle('invalid_grant', { statut: 400, definitive: true });
    expect(await traiter({ q, google: g })).toMatchObject({ statut: 'fait' });
    const [c] = await q('select bloque, erreur from agenda.comptes');
    expect(c.bloque).toBe(true);
    expect(c.erreur).toMatch(/reconnectez/);
    // La reconnexion débloque et renvoie tout
    g.panne = null;
    await connecter(g, 'moi@example.com', 'julien');
    await traiter({ q, google: g });
    expect(resume(g, 'cal-a-julien')).toEqual({ [idEvenement(demain, 'moi')]: 'Julien · Matin' });
  });
});

describe('échec chez Google pendant la connexion', () => {
  it('renvoie vers l’application avec le message', async () => {
    const g = fauxGoogle();
    g.echangerCode = async () => { throw new ErreurGoogle('Google a refusé l’accès (invalid_client)', { statut: 401 }); };
    const r = await connecter(g, 'moi@example.com', 'x');
    expect(r).toMatchObject({ ok: false, retour: 'https://exemple.github.io/liste-courses/', message: expect.stringMatching(/invalid_client/) });
    expect(await q('select * from agenda.comptes')).toEqual([]);
  });
});
