import { useState } from 'preact/hooks';
import { useStore, semer, doc } from './store.js';
import { PLATS_DEPART } from './moteur/plats-depart.js';
import { Plats } from './vues/Plats.jsx';
import { Courses } from './vues/Courses.jsx';
import { Repas } from './vues/Repas.jsx';
import { proposerSemaine } from './actions.js';
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

export function App() {
  useStore();
  const [onglet, setOnglet] = useState(() => sessionStorage.getItem('onglet') || 'semaine');
  const [lundi, setLundi] = useState(lundiDe(aujourdhui()));
  const aller = (id) => { setOnglet(id); try { sessionStorage.setItem('onglet', id); } catch {} window.scrollTo(0, 0); };

  return (
    <div class="appli">
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
