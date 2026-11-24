// Agenda Google : dialogue avec la fonction Supabase « agenda-google ».
// L'envoi des postes vers Google se fait côté Supabase, même téléphone éteint.
import { supabase } from './sync.js';

const FONCTION = 'agenda-google';

async function appeler(action, extra = {}) {
  const { data, error } = await supabase.functions.invoke(FONCTION, { body: { action, ...extra } });
  if (error) {
    let message = error.message;
    try { message = (await error.context.json()).erreur || message; } catch { /* réponse non JSON */ }
    if (/Failed to send|NOT_FOUND|404/i.test(`${message} ${error.context?.status || ''}`)) {
      message = 'La fonction « agenda-google » n’est pas encore déployée sur Supabase (voir le README).';
    }
    throw new Error(message);
  }
  return data;
}

export const statutAgenda = () => appeler('statut');

export async function connecterAgenda() {
  const { url } = await appeler('connecter', { retour: window.location.href });
  window.location.assign(url); // page d'autorisation Google, puis retour dans l'application
}

export const deconnecterAgenda = () => appeler('deconnecter');

// Au retour de Google, l'adresse se termine par #agenda=ok (ou #agenda=erreur&agenda_message=…)
export const retourAgenda = (() => {
  if (typeof window === 'undefined' || !window.location.hash.includes('agenda=')) return null;
  const p = new URLSearchParams(window.location.hash.slice(1));
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return p.get('agenda') === 'ok'
    ? { ok: true, message: 'Agenda Google connecté : vos postes y arrivent d’ici une minute ou deux.' }
    : { ok: false, message: p.get('agenda_message') || 'La connexion à Google a échoué.' };
})();
