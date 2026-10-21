import { useState, useEffect } from 'preact/hooks';
import { useStore, semer, doc } from './store.js';
import { PLATS_DEPART } from './moteur/plats-depart.js';
import { Plats } from './vues/Plats.jsx';
import { Courses } from './vues/Courses.jsx';
import { Repas } from './vues/Repas.jsx';
import { proposerSemaine } from './actions.js';
import { Reglages } from './vues/Reglages.jsx';
import { Connexion } from './vues/Connexion.jsx';
import { configure, supabase, initialiserSync, surSession, useSync } from './sync.js';
import { lundiDe, aujourdhui, joursDeLaSemaine } from './moteur/dates.js';
import { Semaine } from './vues/Semaine.jsx';
import { Planning } from './vues/Planning.jsx';

semer('plats', PLATS_DEPART);

const ONGLETS = [
  { id: 'semaine', libelle: 'Semaine', icone: '🍽️' },
  { id: 'planning', libelle: 'Planning', icone: '📅' },
  { id: 'plats', libelle: 'Plats', icone: '📖' },
  { id: 'courses', libelle: 'Courses', icone: '🛒' },
  { id: 'reglages', libelle: 'Réglages', icone: '⚙️' },
];

function sessionHorsLigneConnue() {
  try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch { return false; }
}

function useSession() {
  const [session, setSession] = useState(configure ? undefined : 'local');
  useEffect(() => {
    if (!configure) return;
    initialiserSync();
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); surSession(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); surSession(s); });
    // Hors connexion, la vérification de session peut traîner : on ouvre l'app avec les données locales
    const secours = setTimeout(() => setSession((s) => (s === undefined ? (sessionHorsLigneConnue() ? 'horsligne' : null) : s)), 3000);
    return () => { clearTimeout(secours); data.subscription.unsubscribe(); };
  }, []);
  return session;
}

function Bandeau() {
  const s = useSync();
  if (s.etat === 'local') return <div class="bandeau">Mode local : Supabase n’est pas configuré, rien n’est synchronisé.</div>;
  if (s.etat === 'erreur' || s.etat === 'horsligne') {
    return <div class="bandeau">{s.message}{s.attente ? ` — ${s.attente} modification(s) en attente` : ''}</div>;
  }
  return null;
}

export function App() {
  useStore();
  const session = useSession();
  const [onglet, setOnglet] = useState(() => sessionStorage.getItem('onglet') || 'semaine');
  const [lundi, setLundi] = useState(lundiDe(aujourdhui()));
  const aller = (id) => { setOnglet(id); try { sessionStorage.setItem('onglet', id); } catch {} window.scrollTo(0, 0); };

  if (session === undefined) return <div class="appli"><main><p class="doux">Chargement…</p></main></div>;
  if (session === null && !(sessionHorsLigneConnue() && !navigator.onLine)) return <Connexion />;

  return (
    <div class="appli">
      <Bandeau />
      <main>
        {onglet === 'semaine' && (
          <Semaine lundi={lundi} setLundi={setLundi} Repas={Repas}
            actions={<button class="btn principal petit" onClick={() => {
              const deja = joursDeLaSemaine(lundi).some((d) => doc('menus', `${d}-midi`)?.platId || doc('menus', `${d}-soir`)?.platId);
              if (!deja || confirm('Refaire les propositions non verrouillées et non notées de la semaine ?')) proposerSemaine(lundi, true);
            }}>Proposer</button>} />
        )}
        {onglet === 'planning' && <Planning />}
        {onglet === 'plats' && <Plats />}
        {onglet === 'courses' && <Courses lundi={lundi} setLundi={setLundi} />}
        {onglet === 'reglages' && <Reglages />}
      </main>
      <nav class="onglets">
        {ONGLETS.map((o) => (
          <button key={o.id} class={onglet === o.id ? 'actif' : ''} onClick={() => aller(o.id)}>
            <span aria-hidden="true">{o.icone}</span>{o.libelle}
          </button>
        ))}
      </nav>
    </div>
  );
}
