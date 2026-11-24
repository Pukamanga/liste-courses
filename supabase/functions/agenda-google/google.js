// Appels à Google (OAuth et API Agenda). `fetch` est injectable pour les tests.
import { FUSEAU, NOM_AGENDA } from './planning.js';

// Accès limité aux agendas créés par l'application (aucun accès aux autres agendas),
// plus l'adresse du compte Google (affichée dans les réglages).
export const SCOPES = 'https://www.googleapis.com/auth/calendar.app.created openid email';
const API = 'https://www.googleapis.com/calendar/v3';

export class ErreurGoogle extends Error {
  constructor(message, { statut = 0, raison = '', definitive = false } = {}) {
    super(message);
    this.statut = statut;
    this.raison = raison;
    this.definitive = definitive; // il faut reconnecter l'agenda
  }
}

async function corpsErreur(rep) {
  const texte = await rep.text().catch(() => '');
  try {
    const j = JSON.parse(texte);
    return { message: j.error?.message || j.error_description || j.error || texte, raison: j.error?.errors?.[0]?.reason || (typeof j.error === 'string' ? j.error : '') };
  } catch {
    return { message: texte || rep.statusText, raison: '' };
  }
}

export function creerGoogle({ clientId, clientSecret, redirectUri, fetch = globalThis.fetch }) {
  async function jetons(params) {
    const rep = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    });
    if (!rep.ok) {
      const e = await corpsErreur(rep);
      throw new ErreurGoogle(`Google a refusé l’accès (${e.message})`, {
        statut: rep.status, raison: e.raison, definitive: e.raison === 'invalid_grant',
      });
    }
    return rep.json();
  }

  async function api(jeton, methode, chemin, corps) {
    const rep = await fetch(API + chemin, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    if (rep.ok) return rep.status === 204 ? null : rep.json();
    const e = await corpsErreur(rep);
    throw new ErreurGoogle(`Google Agenda : ${e.message}`, { statut: rep.status, raison: e.raison });
  }

  return {
    urlAutorisation({ etat, email }) {
      const p = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline', // pour recevoir une clé longue durée
        prompt: 'consent',
        state: etat,
      });
      if (email) p.set('login_hint', email);
      return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
    },

    // → { refreshToken, accessToken, email }
    async echangerCode(code) {
      const r = await jetons({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
      let email = null;
      try { email = JSON.parse(atob(r.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || null; } catch { /* facultatif */ }
      return { refreshToken: r.refresh_token || null, accessToken: r.access_token, email };
    },

    // → { accessToken, refreshToken (nouvelle clé éventuelle) }
    async rafraichir(refreshToken) {
      const r = await jetons({ grant_type: 'refresh_token', refresh_token: refreshToken });
      return { accessToken: r.access_token, refreshToken: r.refresh_token || null };
    },

    async revoquer(jeton) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(jeton)}`, { method: 'POST' }).catch(() => {});
    },

    async agendaExiste(jeton, id) {
      try {
        await api(jeton, 'GET', `/calendars/${encodeURIComponent(id)}`);
        return true;
      } catch (e) {
        if ([403, 404].includes(e.statut)) return false;
        throw e;
      }
    },

    async creerAgenda(jeton) {
      const a = await api(jeton, 'POST', '/calendars', {
        summary: NOM_AGENDA,
        description: 'Postes de travail, mis à jour automatiquement par l’application.',
        timeZone: FUSEAU,
      });
      return a.id;
    },

    async supprimerAgenda(jeton, id) {
      try {
        await api(jeton, 'DELETE', `/calendars/${encodeURIComponent(id)}`);
      } catch (e) {
        if (![404, 410].includes(e.statut)) throw e;
      }
    },

    // Crée ou met à jour l'événement (identifiant fixe). Un événement supprimé reste connu de
    // Google (statut « cancelled ») : on le met alors à jour au lieu de le recréer.
    async ecrireEvenement(jeton, agenda, id, corps, existe) {
      const base = `/calendars/${encodeURIComponent(agenda)}/events`;
      const maj = () => api(jeton, 'PUT', `${base}/${id}`, corps);
      const creer = () => api(jeton, 'POST', base, { id, ...corps });
      if (existe) {
        try { return await maj(); } catch (e) { if (e.statut !== 404) throw e; }
        return creer();
      }
      try { return await creer(); } catch (e) { if (e.statut !== 409) throw e; }
      return maj();
    },

    async effacerEvenement(jeton, agenda, id) {
      try {
        await api(jeton, 'DELETE', `/calendars/${encodeURIComponent(agenda)}/events/${id}`);
      } catch (e) {
        if (![404, 410].includes(e.statut)) throw e; // déjà supprimé
      }
    },
  };
}

// Erreur passagère (quota, panne Google) : on réessaiera à la minute suivante
export function estPassagere(e) {
  return e instanceof ErreurGoogle && !e.definitive &&
    (e.statut === 429 || e.statut >= 500 || e.statut === 0 ||
      (e.statut === 403 && /rateLimit|userRateLimit|quotaExceeded/i.test(e.raison)));
}
