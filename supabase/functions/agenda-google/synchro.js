// Logique de la fonction agenda-google, indépendante de Deno.
// `q(texte, parametres)` exécute une requête SQL et renvoie les lignes.
import { regles, evenementsDuJour, planifier, dateParis } from './planning.js';
import { estPassagere } from './google.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HISTORIQUE_JOURS = 30; // lors d'une resynchronisation complète, on ne revoit pas le passé plus ancien
const DUREE_DEMANDE_MIN = 15; // délai pour terminer l'autorisation Google

export async function estMembre(q, email) {
  const r = await q('select 1 from public.membres where lower(email) = lower($1)', [email || '']);
  return r.length > 0;
}

function jetonAleatoire() {
  const o = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(o, (x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Connexion / déconnexion d'un agenda
// ---------------------------------------------------------------------------

export async function demarrerConnexion({ q, google, email, retour, urlFonction }) {
  const u = new URL(retour);
  if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) throw new Error('Adresse de retour refusée');
  u.hash = '';
  // La fonction note sa propre adresse : la tâche planifiée (pg_cron) l'appelle ensuite
  await q('update agenda.config set url = $1 where id = 1', [urlFonction]);
  await q(`delete from agenda.demandes where cree_le < now() - interval '1 day'`);
  const etat = jetonAleatoire();
  await q('insert into agenda.demandes (jeton, email, retour) values ($1, $2, $3)', [etat, email, u.toString()]);
  return google.urlAutorisation({ etat, email });
}

// Retour de Google après l'autorisation. → { retour, ok, message }
export async function terminerConnexion({ q, google, etat, code, erreur }) {
  const [d] = etat ? await q(
    `delete from agenda.demandes where jeton = $1 returning email, retour, cree_le > now() - make_interval(mins => $2) as valide`,
    [etat, DUREE_DEMANDE_MIN],
  ) : [];
  if (!d) return { retour: null, ok: false, message: 'Demande inconnue ou déjà utilisée : relancez la connexion depuis l’application.' };
  const fin = (ok, message) => ({ retour: d.retour, ok, message });
  if (!d.valide) return fin(false, 'La demande a expiré : relancez la connexion.');
  if (erreur || !code) return fin(false, erreur === 'access_denied' ? 'Autorisation refusée.' : `Google : ${erreur || 'pas de code reçu'}`);

  let refreshToken, emailGoogle, agenda, ancien;
  try {
    let accessToken;
    ({ refreshToken, accessToken, email: emailGoogle } = await google.echangerCode(code));
    if (!refreshToken) return fin(false, 'Google n’a pas fourni de clé longue durée : relancez la connexion.');
    [ancien] = await q('select calendar_id from agenda.comptes where email = $1', [d.email]);
    agenda = ancien?.calendar_id;
    if (!agenda || !(await google.agendaExiste(accessToken, agenda))) agenda = await google.creerAgenda(accessToken);
  } catch (e) {
    return fin(false, e.message);
  }
  if (ancien && ancien.calendar_id !== agenda) await q('delete from agenda.etat where email = $1', [d.email]);

  await q(
    `insert into agenda.comptes (email, google_email, refresh_token, calendar_id, connecte_le, erreur, bloque)
     values ($1, $2, $3, $4, now(), null, false)
     on conflict (email) do update set google_email = excluded.google_email, refresh_token = excluded.refresh_token,
       calendar_id = excluded.calendar_id, connecte_le = now(), erreur = null, bloque = false`,
    [d.email, emailGoogle, refreshToken, agenda],
  );
  await q('select agenda.tout_resynchroniser()');
  return fin(true, '');
}

export async function deconnecter({ q, google, email }) {
  const [c] = await q('select refresh_token, calendar_id from agenda.comptes where email = $1', [email]);
  if (!c) return;
  try {
    const { accessToken } = await google.rafraichir(c.refresh_token);
    await google.supprimerAgenda(accessToken, c.calendar_id); // l'agenda dédié disparaît du compte Google
  } catch { /* clé déjà révoquée : l'agenda reste, à supprimer à la main */ }
  await google.revoquer(c.refresh_token);
  await q('delete from agenda.comptes where email = $1', [email]);
}

export async function statut({ q }) {
  return q(
    `select m.email, c.google_email, c.connecte_le, c.derniere_synchro, c.erreur, coalesce(c.bloque, false) as bloque,
            c.email is not null as connecte
       from public.membres m left join agenda.comptes c on lower(c.email) = lower(m.email)
      order by m.email`,
  );
}

// ---------------------------------------------------------------------------
// Traitement de la file d'attente (appelé chaque minute par pg_cron s'il y a du travail)
// ---------------------------------------------------------------------------

export async function traiter({ q, google, maintenant = new Date(), budgetMs = 100_000 }) {
  const fin = Date.now() + budgetMs;
  const jeton = jetonAleatoire();
  const pris = await q(
    `update agenda.config set verrou_jusqu = now() + interval '3 minutes', verrou_jeton = $1
      where id = 1 and verrou_jusqu < now() returning id`, [jeton]);
  if (!pris.length) return { statut: 'occupe' };
  try {
    const file = await q('select cle, n::text as n from agenda.file');
    if (!file.length) return { statut: 'vide' };

    const [reg] = await q(`select data from public.docs where coll = 'reglages' and id = 'regles' and not deleted`);
    const R = regles(reg?.data);
    const tout = file.some((f) => f.cle === '*');
    const depuis = dateParis(maintenant, -HISTORIQUE_JOURS);
    const dates = new Set(file.map((f) => f.cle).filter((c) => DATE.test(c)));
    if (tout) {
      const lignes = await q(
        `select id as d from public.docs where coll = 'jours' and id >= $1
         union select date from agenda.etat where date >= $1`, [depuis]);
      for (const l of lignes) if (DATE.test(l.d)) dates.add(l.d);
    }
    const listeDates = JSON.stringify([...dates]);
    const jours = new Map((await q(
      `select id, data, deleted from public.docs
        where coll = 'jours' and id in (select jsonb_array_elements_text($1::text::jsonb))`, [listeDates],
    )).map((l) => [l.id, l.deleted ? {} : l.data]));
    const voulus = [...dates].flatMap((d) => evenementsDuJour(d, jours.get(d), R));

    const comptes = await q('select email, refresh_token, calendar_id from agenda.comptes where not bloque');
    const res = await Promise.all(comptes.map((c) => synchroniserCompte({ q, google, c, listeDates, voulus, fin })));
    const complet = res.every((r) => r.complet);
    if (complet) {
      // Seules les demandes lues au début sont retirées : une modification arrivée entre-temps reste à traiter
      await q(
        `delete from agenda.file f using jsonb_to_recordset($1::text::jsonb) as x(cle text, n text)
          where f.cle = x.cle and f.n = x.n::bigint`, [JSON.stringify(file)]);
    }
    return { statut: complet ? 'fait' : 'a_reprendre', dates: dates.size, comptes: res };
  } finally {
    await q(`update agenda.config set verrou_jusqu = '-infinity' where id = 1 and verrou_jeton = $1`, [jeton]);
  }
}

async function noterErreur(q, email, message, bloque = false) {
  await q('update agenda.comptes set erreur = $2, bloque = bloque or $3 where email = $1', [email, message, bloque]);
}

async function synchroniserCompte({ q, google, c, listeDates, voulus, fin }) {
  let acces;
  try {
    const r = await google.rafraichir(c.refresh_token);
    acces = r.accessToken;
    if (r.refreshToken) await q('update agenda.comptes set refresh_token = $2 where email = $1', [c.email, r.refreshToken]);
  } catch (e) {
    const definitive = !!e.definitive;
    await noterErreur(q, c.email, definitive ? 'L’accès à Google a été retiré ou a expiré : reconnectez l’agenda.' : e.message, definitive);
    return { email: c.email, complet: definitive }; // passagère ou réglage Google à corriger : on réessaiera
  }

  const envoyes = new Map((await q(
    `select event_id, empreinte from agenda.etat
      where email = $1 and date in (select jsonb_array_elements_text($2::text::jsonb))`, [c.email, listeDates],
  )).map((l) => [l.event_id, l.empreinte]));
  const actions = planifier(voulus, envoyes);

  let faits = 0;
  let derniereErreur = null;
  for (const a of actions) {
    if (Date.now() > fin) return { email: c.email, complet: false, faits };
    try {
      if (a.op === 'ecrire') {
        await google.ecrireEvenement(acces, c.calendar_id, a.id, a.corps, a.existe);
        await q(
          `insert into agenda.etat (email, event_id, date, empreinte) values ($1, $2, $3, $4)
           on conflict (email, event_id) do update set date = excluded.date, empreinte = excluded.empreinte`,
          [c.email, a.id, a.date, a.empreinte]);
      } else {
        await google.effacerEvenement(acces, c.calendar_id, a.id);
        await q('delete from agenda.etat where email = $1 and event_id = $2', [c.email, a.id]);
      }
      faits++;
    } catch (e) {
      if (estPassagere(e) || e.statut === 401) {
        await noterErreur(q, c.email, e.message);
        return { email: c.email, complet: false, faits };
      }
      if (e.statut === 403 || e.statut === 404) {
        await noterErreur(q, c.email, 'L’agenda « Planning travail » est introuvable : reconnectez l’agenda.', true);
        return { email: c.email, complet: true, faits };
      }
      derniereErreur = e.message; // événement refusé : on passe au suivant
    }
  }
  await q('update agenda.comptes set derniere_synchro = now(), erreur = $2 where email = $1', [c.email, derniereErreur]);
  return { email: c.email, complet: true, faits };
}
