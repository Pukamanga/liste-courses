import { useState } from 'preact/hooks';
import { useStore } from './store.js';
import { lundiDe, aujourdhui } from './moteur/dates.js';
import { Semaine } from './vues/Semaine.jsx';
import { Planning } from './vues/Planning.jsx';

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
        {onglet === 'semaine' && <Semaine lundi={lundi} setLundi={setLundi} />}
        {onglet === 'planning' && <Planning />}
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
