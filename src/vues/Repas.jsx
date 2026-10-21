import { useState } from 'preact/hooks';
import { doc, donnees } from '../store.js';
import { autreIdee, choisir, pasDeRepas, vider, basculerVerrou, noter, basculerMartinAime, proposerSemaine } from '../actions.js';
import { restesDe, tempsTotal } from '../moteur/proposition.js';
import { aujourdhui, lundiDe, JOURS_LONGS, jourSemaine } from '../moteur/dates.js';

function libelleCreneau(id) {
  const date = id.slice(0, 10);
  return `${JOURS_LONGS[jourSemaine(date)].toLowerCase()} ${id.endsWith('midi') ? 'midi' : 'soir'}`;
}

export function Repas({ c }) {
  const [choix, setChoix] = useState(false);
  const m = doc('menus', c.id);
  const plats = donnees('plats');
  const plat = m?.platId ? plats[m.platId] : null;
  const passe = c.date <= aujourdhui();

  if (choix) {
    const tries = Object.values(plats).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return (
      <div class="plat">
        <select style="width:100%" onChange={(e) => { if (e.target.value) choisir(c, e.target.value); setChoix(false); }}>
          <option value="">— Choisir un plat —</option>
          {tries.map((p) => <option key={p.id} value={p.id}>{p.nom} ({tempsTotal(p)} min)</option>)}
        </select>
        <div class="rangee" style="margin-top:6px">
          <button class="btn petit" onClick={() => { pasDeRepas(c); setChoix(false); }}>Pas de repas à prévoir</button>
          <button class="btn petit" onClick={() => setChoix(false)}>Annuler</button>
        </div>
      </div>
    );
  }

  if (m?.aucun) {
    return (
      <div class="plat">
        <span class="vide">Pas de repas à prévoir</span>{' '}
        <button class="btn petit" onClick={() => vider(c)}>Annuler</button>
      </div>
    );
  }

  if (!plat) {
    return (
      <div class="plat rangee">
        <span class="vide">Pas encore d’idée</span>
        <button class="btn petit" onClick={() => proposerSemaine(lundiDe(c.date))}>Proposer</button>
        <button class="btn petit" onClick={() => setChoix(true)}>Choisir…</button>
      </div>
    );
  }

  const restes = restesDe(c.id, donnees('menus'));
  return (
    <div class={`plat ${m.verrouille ? 'verrou' : ''}`}>
      <div class="plat-nom">{m.reste ? '♻️ ' : ''}{plat.nom}</div>
      <div class="doux petit-texte">
        {m.reste
          ? `Restes du ${libelleCreneau(m.reste)} — à réchauffer`
          : `${plat.prep} min de préparation + ${plat.cuisson} min de cuisson${plat.rechauffe ? ' · se réchauffe bien' : ''}`}
        {restes.length > 0 && <div>Cuisiner en double : aussi pour {restes.map(libelleCreneau).join(', ')}</div>}
      </div>
      <div class="rangee" style="margin-top:8px">
        <button class={`btn petit ${m.verrouille ? 'actif' : ''}`} onClick={() => basculerVerrou(c)} aria-pressed={!!m.verrouille}>
          {m.verrouille ? '🔒 Verrouillé' : '🔓 Verrouiller'}
        </button>
        {!m.verrouille && <button class="btn petit" onClick={() => autreIdee(c)}>🎲 Autre idée</button>}
        <button class="btn petit" onClick={() => setChoix(true)}>Choisir…</button>
      </div>
      {passe && !m.reste && (
        <div class="rangee" style="margin-top:8px">
          <button class={`btn petit ${m.note === 'refaire' ? 'actif' : ''}`} onClick={() => noter(c, 'refaire')}>👍 À refaire</button>
          <button class={`btn petit ${m.note === 'bof' ? 'actif' : ''}`} onClick={() => noter(c, 'bof')}>😐 Bof</button>
          {c.martin && (
            <button class={`btn petit ${m.martinAime ? 'actif' : ''}`} onClick={() => basculerMartinAime(c)}>😋 Martin a aimé</button>
          )}
        </div>
      )}
    </div>
  );
}
