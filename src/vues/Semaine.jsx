import { useState } from 'preact/hooks';
import { doc, modifier } from '../store.js';
import { semaine, reglages, nomDe } from '../calcul.js';
import { ajouterJours, libelleDate, aujourdhui, depuisIso, MOIS_LONGS, lundiDe } from '../moteur/dates.js';
import { ETIQ } from '../moteur/reglages.js';

export const CLASSES_ETIQ = {
  [ETIQ.EXPRESS]: 'Express', [ETIQ.AVANCE]: 'Avance', [ETIQ.PLUSIEURS]: 'Plusieurs',
  [ETIQ.CUISINE]: 'Cuisine', [ETIQ.VTT]: 'VTT', [ETIQ.GP]: 'GP',
};

export function titreSemaine(lundi) {
  const fin = ajouterJours(lundi, 6);
  const a = depuisIso(lundi), b = depuisIso(fin);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MOIS_LONGS[b.getMonth()]}`
    : `${a.getDate()} ${MOIS_LONGS[a.getMonth()]} – ${b.getDate()} ${MOIS_LONGS[b.getMonth()]}`;
}

export function NavSemaine({ lundi, setLundi, children }) {
  return (
    <div class="entete">
      <div class="nav">
        <button class="rond" aria-label="Semaine précédente" onClick={() => setLundi(ajouterJours(lundi, -7))}>‹</button>
        <h1 onClick={() => setLundi(lundiDe(aujourdhui()))}>{titreSemaine(lundi)}</h1>
        <button class="rond" aria-label="Semaine suivante" onClick={() => setLundi(ajouterJours(lundi, 7))}>›</button>
      </div>
      {children}
    </div>
  );
}

export function Etiquettes({ liste }) {
  return <span class="rangee">{liste.map((e) => <span key={e} class={`puce ${CLASSES_ETIQ[e] || ''}`}>{e}</span>)}</span>;
}

export function Semaine({ lundi, setLundi, Repas, actions }) {
  const R = reglages();
  const auj = aujourdhui();
  const [voirPasses, setVoirPasses] = useState(false);
  // Semaine en cours : la liste commence aujourd'hui, les jours passés sont repliés
  const tous = semaine(lundi);
  const passes = lundi === lundiDe(auj) ? tous.filter((j) => j.date < auj) : [];
  const jours = voirPasses ? tous : tous.filter((j) => !passes.includes(j));
  const incomplets = jours.filter((j) => j.incomplet).length;

  return (
    <div>
      <NavSemaine lundi={lundi} setLundi={setLundi}>{actions}</NavSemaine>
      {incomplets > 0 && <div class="alerte">{incomplets} jour(s) sans planning complet : saisissez-les dans « Planning ».</div>}
      {passes.length > 0 && (
        <button class="btn petit" style="margin-bottom:10px" onClick={() => setVoirPasses(!voirPasses)}>
          {voirPasses ? 'Masquer les jours passés' : `Voir les jours passés (${passes.length}) pour noter les repas`}
        </button>
      )}
      {jours.map((j) => (
        <div key={j.date} class={`carte ${j.date === auj ? 'aujourdhui' : ''} ${j.date < auj ? 'passe' : ''}`}>
          <div class="jour-titre">
            <h3>{libelleDate(j.date)}</h3>
            <span class="rangee">
              {j.jourCuisine && <span class="puce Cuisine">{ETIQ.CUISINE}</span>}
              {j.vacances && <span class="puce">Vacances</span>}
              {j.ferie && <span class="puce">{j.ferie}</span>}
            </span>
          </div>
          <div class="postes-jour">
            {R.noms.moi} : <b>{j.postes.moi}</b> · {R.noms.julie} : <b>{j.postes.julie}</b>
            {j.activites.filter((a) => !a.ignoree).map((a) => <span key={a.id}> · {a.nom} ({nomDe(a.qui, R)} {a.debut}–{a.fin})</span>)}
          </div>
          {j.avertissements.map((w) => <div class="alerte" key={w}>⚠️ {w}</div>)}
          {['midi', 'soir'].map((repas) => (
            <Creneau key={repas} c={j.creneaux[repas]} jour={j} R={R} Repas={Repas} />
          ))}
        </div>
      ))}
    </div>
  );
}

const ACCORD = { julie: 'absente' };

function Creneau({ c, jour, R, Repas }) {
  const j = doc('jours', c.date) || {};
  const absent = (qui) => !!j[`${qui}Absent`]?.[c.repas];
  // Case affichée si la personne mangerait normalement à la maison à ce repas (ou est déjà marquée absente)
  const possible = (qui) => absent(qui) || (qui === 'martin'
    ? c.repas === 'soir' || !jour.ecole
    : R.postes[jour.postes[qui]]?.[c.repas] === 'maison');
  const basculer = (qui) => {
    const cle = `${qui}Absent`;
    modifier('jours', c.date, { [cle]: { ...(j[cle] || {}), [c.repas]: !absent(qui) } });
  };
  const personnes = ['moi', 'julie', 'martin'].filter(possible);
  return (
    <div class="creneau">
      <div class="creneau-tete">
        <div>
          <b>{c.repas === 'midi' ? '☀️ Midi' : '🌙 Soir'}</b>
          {c.vide
            ? <div class="vide">Personne à la maison</div>
            : <div class="moments">{c.moments.map((m) => (
                <div key={m.heure}><b>{m.heure}</b> · {m.qui.map((q) => nomDe(q, R, jour.gp)).join(', ')}</div>
              ))}</div>}
        </div>
        {!c.vide && <span class="prep">⏱ {c.prepDispo} min</span>}
      </div>
      {c.etiquettes.length > 0 && <div style="margin-top:6px"><Etiquettes liste={c.etiquettes} /></div>}
      {c.avertissements.map((w) => <div class="alerte" key={w}>⚠️ {w}</div>)}
      {personnes.length > 0 && (
        <div class="rangee" style="margin-top:6px;gap:12px">
          {personnes.map((qui) => (
            <label class="case doux" key={qui}>
              <input type="checkbox" checked={absent(qui)} onChange={() => basculer(qui)} /> {R.noms[qui]} {ACCORD[qui] || 'absent'}
            </label>
          ))}
        </div>
      )}
      {Repas && !c.vide && <Repas c={c} />}
    </div>
  );
}
