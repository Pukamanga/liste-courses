// Fonction Supabase « agenda-google » : synchronise le planning avec Google Agenda.
//
// Appels :
//   POST {action: "statut" | "connecter" | "deconnecter"}  depuis l'application (jeton de session)
//   GET  ?code=…&state=…                                    retour de Google après l'autorisation
//   POST {action: "traiter"}                                pg_cron, chaque minute s'il y a du travail
//
// Secrets à définir dans Supabase (Edge Functions → Secrets) : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_DB_URL sont fournis automatiquement.
// Déployée sans vérification du jeton (--no-verify-jwt) : Google et pg_cron n'en ont pas.
// L'application est authentifiée ici même ; « traiter » ne fait qu'envoyer ce qui est en attente.
import postgres from 'npm:postgres@3.4.5';
import { creerGoogle } from './google.js';
import { demarrerConnexion, deconnecter, estMembre, statut, terminerConnexion, traiter } from './synchro.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const SUPABASE_URL = env('SUPABASE_URL').replace(/\/$/, '');
const URL_FONCTION = `${SUPABASE_URL}/functions/v1/agenda-google`;

const sql = postgres(env('SUPABASE_DB_URL'), { prepare: false, max: 3 });
const q = (texte: string, params: unknown[] = []) => sql.unsafe(texte, params as never[]);

const googleConfigure = Boolean(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET'));
const google = creerGoogle({
  clientId: env('GOOGLE_CLIENT_ID'),
  clientSecret: env('GOOGLE_CLIENT_SECRET'),
  redirectUri: URL_FONCTION,
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Adresse e-mail de la personne connectée à l'application (vérifiée par Supabase Auth)
async function utilisateur(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  if (!/^Bearer .+/.test(auth)) return null;
  const rep = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: req.headers.get('apikey') || env('SUPABASE_ANON_KEY') },
  });
  if (!rep.ok) return null;
  const u = await rep.json();
  return u?.email || null;
}

function page(titre: string, texte: string) {
  const e = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(titre)}</title>` +
      `<body style="font-family:system-ui;padding:24px"><h2>${e(titre)}</h2><p>${e(texte)}</p></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

// Retour de Google : on termine la connexion puis on renvoie vers l'application
async function retourGoogle(url: URL) {
  let r;
  try {
    r = await terminerConnexion({
      q, google,
      etat: url.searchParams.get('state'),
      code: url.searchParams.get('code'),
      erreur: url.searchParams.get('error'),
    });
  } catch (e) {
    console.error('connexion', e);
    return page('Connexion impossible', `${(e as Error).message}`);
  }
  if (!r.retour) return page('Connexion impossible', r.message);
  const dest = new URL(r.retour);
  dest.hash = new URLSearchParams(r.ok ? { agenda: 'ok' } : { agenda: 'erreur', agenda_message: r.message }).toString();
  return Response.redirect(dest.toString(), 303);
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  try {
    if (req.method === 'GET') return await retourGoogle(url);
    if (req.method !== 'POST') return json({ erreur: 'Méthode non prise en charge' }, 405);

    const corps = await req.json().catch(() => ({}));
    const action = corps?.action;

    if (action === 'traiter') {
      if (!googleConfigure) return json({ statut: 'google_non_configure' });
      const travail = traiter({ q, google }).catch((e) => console.error('traitement', e));
      // Réponse immédiate à pg_cron ; le traitement continue en tâche de fond
      if (typeof EdgeRuntime !== 'undefined') { EdgeRuntime.waitUntil(travail); return json({ statut: 'lance' }); }
      return json(await travail);
    }

    const email = await utilisateur(req);
    if (!email) return json({ erreur: 'Connexion à l’application requise' }, 401);
    if (!(await estMembre(q, email))) return json({ erreur: 'Cette adresse n’est pas autorisée' }, 403);

    if (action === 'statut') return json({ googleConfigure, moi: email, membres: await statut({ q }) });
    if (!googleConfigure) return json({ erreur: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants dans les secrets Supabase' }, 500);
    if (action === 'connecter') {
      return json({ url: await demarrerConnexion({ q, google, email, retour: String(corps.retour || ''), urlFonction: URL_FONCTION }) });
    }
    if (action === 'deconnecter') {
      await deconnecter({ q, google, email });
      return json({ ok: true });
    }
    return json({ erreur: 'Action inconnue' }, 400);
  } catch (e) {
    console.error(e);
    return json({ erreur: (e as Error).message || String(e) }, 500);
  }
});
