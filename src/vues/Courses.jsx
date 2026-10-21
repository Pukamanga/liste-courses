import { useState } from 'preact/hooks';
import { doc, donnees, modifier } from '../store.js';
import { creneauxAutour } from '../calcul.js';
import { listeCourses, texteACopier } from '../moteur/courses.js';
import { joursDeLaSemaine } from '../moteur/dates.js';
import { NavSemaine } from './Semaine.jsx';

async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = texte;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

export function Courses({ lundi, setLundi }) {
  const [nouvel, setNouvel] = useState('');
  const [toast, setToast] = useState('');
  const etat = doc('courses', lundi) || {};
  const coches = etat.coches || {};
  const extras = etat.extras || [];
  const ids = new Set(joursDeLaSemaine(lundi).flatMap((d) => [`${d}-midi`, `${d}-soir`]));
  const groupes = listeCourses(creneauxAutour(lundi, 3), donnees('menus'), donnees('plats'), ids);
  const total = groupes.reduce((n, g) => n + g.articles.length, 0) + extras.length;
  const restants = groupes.reduce((n, g) => n + g.articles.filter((a) => !coches[a.cle]).length, 0)
    + extras.filter((e) => !coches[`extra|${e}`]).length;

  const cocher = (cle) => modifier('courses', lundi, { coches: { ...coches, [cle]: !coches[cle] } });
  const ajouter = () => {
    const v = nouvel.trim();
    if (v && !extras.includes(v)) modifier('courses', lundi, { extras: [...extras, v] });
    setNouvel('');
  };
  const retirer = (e) => modifier('courses', lundi, { extras: extras.filter((x) => x !== e) });
  const copierListe = async () => {
    const ok = await copier(texteACopier(groupes, coches, extras));
    setToast(ok ? `${restants} article(s) copié(s) : collez-les dans Leclerc Drive` : 'Copie impossible');
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div>
      <NavSemaine lundi={lundi} setLundi={setLundi}>
        <button class="btn principal petit" onClick={copierListe} disabled={!restants}>📋 Copier</button>
      </NavSemaine>
      <p class="doux">{restants} à acheter sur {total}. Cochez ce que vous avez déjà : ce ne sera pas copié.</p>
      {total === 0 && <div class="carte vide">Aucun repas prévu cette semaine : lancez « Proposer » dans l’onglet Semaine.</div>}
      {groupes.map((g) => (
        <div class="carte" key={g.rayon}>
          <h3>{g.rayon}</h3>
          {g.articles.map((a) => (
            <label key={a.cle} class={`article ${coches[a.cle] ? 'coche' : ''}`}>
              <input type="checkbox" checked={!!coches[a.cle]} onChange={() => cocher(a.cle)} />
              <span class="nom">{a.texte}<br /><span class="doux petit-texte">{a.plats.join(', ')}</span></span>
            </label>
          ))}
        </div>
      ))}
      <div class="carte">
        <h3>En plus</h3>
        {extras.map((e) => (
          <div class={`article ${coches[`extra|${e}`] ? 'coche' : ''}`} key={e}>
            <input type="checkbox" checked={!!coches[`extra|${e}`]} onChange={() => cocher(`extra|${e}`)} />
            <span class="nom">{e}</span>
            <button class="btn petit" aria-label="Retirer" onClick={() => retirer(e)}>✕</button>
          </div>
        ))}
        <form class="rangee" style="margin-top:8px" onSubmit={(ev) => { ev.preventDefault(); ajouter(); }}>
          <input type="text" style="flex:1" placeholder="Lait, fruits, papier toilette…" value={nouvel} onInput={(e) => setNouvel(e.target.value)} />
          <button class="btn" type="submit">Ajouter</button>
        </form>
      </div>
      {toast && <div class="toast">{toast}</div>}
    </div>
  );
}
