// Synchronisation avec Supabase : envoi des modifications locales, lecture complète
// au démarrage et à la reconnexion, temps réel entre les deux téléphones.
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'preact/hooks';
import { appliquerDistants, enAttente, marquerEnvoyes, surEcritureLocale } from './store.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configure = Boolean(URL && CLE);
export const supabase = configure
  ? createClient(URL, CLE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

let statut = { etat: configure ? 'deconnecte' : 'local', message: '', attente: 0 };
const abonnes = new Set();
function majStatut(p) {
  statut = { ...statut, ...p, attente: enAttente().length };
  for (const f of abonnes) f(statut);
}

export function useSync() {
  const [s, setS] = useState(statut);
  useEffect(() => { abonnes.add(setS); setS(statut); return () => abonnes.delete(setS); }, []);
  return s;
}

const COLONNES = 'coll,id,data,updated_at,deleted';

async function tirer() {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase.from('docs').select(COLONNES)
      .order('coll').order('id').range(debut, debut + 999);
    if (error) throw error;
    lignes.push(...data);
    if (data.length < 1000) break;
  }
  appliquerDistants(lignes);
}

let envoiEnCours = false;
async function pousser() {
  if (envoiEnCours) return;
  envoiEnCours = true;
  try {
    for (;;) {
      const lot = enAttente().slice(0, 500);
      if (!lot.length) break;
      const { error } = await supabase.from('docs').upsert(
        lot.map(({ coll, id, data, updated_at, deleted }) => ({ coll, id, data, updated_at, deleted })),
        { onConflict: 'coll,id' },
      );
      if (error) throw error;
      marquerEnvoyes(lot);
    }
  } finally {
    envoiEnCours = false;
  }
}

function messageErreur(e) {
  if (e?.code === '42501' || /row-level security/i.test(e?.message || '')) {
    return 'Cette adresse n’est pas autorisée (table « membres » dans Supabase).';
  }
  return navigator.onLine ? `Erreur de synchronisation : ${e?.message || e}` : 'Hors connexion';
}

let canal = null;
let minuteur = null;

export async function synchroniser() {
  if (!configure || statut.etat === 'deconnecte') return;
  if (!navigator.onLine) { majStatut({ etat: 'horsligne', message: 'Hors connexion' }); return; }
  majStatut({ etat: 'synchro', message: '' });
  try {
    await pousser();
    await tirer();
    await pousser();
    majStatut({ etat: 'ok', message: '' });
  } catch (e) {
    majStatut({ etat: 'erreur', message: messageErreur(e) });
  }
}

function demarrerTempsReel() {
  if (canal) return;
  canal = supabase.channel('docs-famille')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, (p) => {
      if (p.new && p.new.coll) appliquerDistants([p.new]);
    })
    .subscribe((s) => {
      if (s === 'SUBSCRIBED') synchroniser(); // rattrape ce qui a été manqué pendant la coupure
    });
}

function arreterTempsReel() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
}

let initialise = false;
export function initialiserSync() {
  if (!configure || initialise) return;
  initialise = true;
  surEcritureLocale(() => {
    majStatut({});
    clearTimeout(minuteur);
    minuteur = setTimeout(() => statut.etat !== 'deconnecte' && navigator.onLine && pousser()
      .then(() => majStatut({ etat: 'ok', message: '' }))
      .catch((e) => majStatut({ etat: 'erreur', message: messageErreur(e) })), 400);
  });
  window.addEventListener('online', () => synchroniser());
  window.addEventListener('offline', () => majStatut({ etat: 'horsligne', message: 'Hors connexion' }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') synchroniser(); });
}

export function surSession(session) {
  if (!configure) return;
  if (session) {
    majStatut({ etat: 'synchro', email: session.user?.email });
    demarrerTempsReel();
    synchroniser();
  } else {
    arreterTempsReel();
    majStatut({ etat: 'deconnecte', email: null });
  }
}

// --- Connexion par e-mail (lien magique + code à 6 chiffres) ---
export async function envoyerLien(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
}

export async function verifierCode(email, code) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error) throw error;
}

export async function deconnecter() {
  await supabase.auth.signOut();
}
