import { useState } from 'preact/hooks';
import { doc, donnees, modifier } from '../store.js';
import { creneauxAutour, reglages } from '../calcul.js';
import { listeCourses, texteACopier, promptClaude, articlesVerifications, ajouterArticlesLibres } from '../moteur/courses.js';
import { joursDeLaSemaine, JOURS_LONGS, jourSemaine, moisDe } from '../moteur/dates.js';
import { NavSemaine, titreSemaine } from './Semaine.jsx';

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
  const creneaux = creneauxAutour(lundi, 3);
  const R = reglages();
  const verifs = R.verifications || [];
  const reponses = etat.verifs || {};
  const sansReponse = verifs.filter((v) => !reponses[v.id]);
  const groupes = ajouterArticlesLibres(
    listeCourses(creneaux, donnees('menus'), donnees('plats'), ids),
    articlesVerifications(verifs, reponses, moisDe(lundi)),
  );
  const repondre = (id, r) => modifier('courses', lundi, { verifs: { ...reponses, [id]: reponses[id] === r ? null : r } });
  // Avant toute copie : il faut avoir répondu aux questions
  const pret = () => {
    if (!sansReponse.length) return true;
    setToast('Réponds d’abord aux questions en haut de la liste');
    setTimeout(() => setToast(''), 2500);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  };
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
    if (!pret()) return;
    const ok = await copier(texteACopier(groupes, coches, extras));
    setToast(ok ? `${restants} article(s) copié(s) : collez-les dans Leclerc Drive` : 'Copie impossible');
    setTimeout(() => setToast(''), 2500);
  };

  const copierPrompt = async () => {
    if (!pret()) return;
    const menus = donnees('menus');
    const plats = donnees('plats');
    const repas = creneaux.filter((c) => ids.has(c.id) && menus[c.id]?.platId && plats[menus[c.id].platId])
      .map((c) => `${JOURS_LONGS[jourSemaine(c.date)]} ${c.repas} : ${plats[menus[c.id].platId].nom}`
        + ` (${c.personnes} pers.${menus[c.id].reste ? ', restes' : ''})`);
    const ok = await copier(promptClaude({
      groupes, coches, extras, titreSemaine: titreSemaine(lundi), repas,
      magasin: R.courses.magasin, consignes: R.courses.consignes,
    }));
    setToast(ok ? 'Prompt copié : collez-le dans Claude (avec Claude dans Chrome)' : 'Copie impossible');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div>
      <NavSemaine lundi={lundi} setLundi={setLundi}>
        <button class="btn principal petit" onClick={copierListe} disabled={!restants}>📋 Copier</button>
      </NavSemaine>
      <button class="btn" style="width:100%;margin-bottom:8px" onClick={copierPrompt} disabled={!restants}>
        🤖 Copier la liste avec le prompt Claude (Leclerc Drive)
      </button>
      {verifs.length > 0 && (
        <div class={`carte ${sansReponse.length ? 'a-repondre' : ''}`}>
          <h3>Avant de faire les courses {sansReponse.length ? `(${sansReponse.length} à répondre)` : '✓'}</h3>
          {verifs.map((v) => (
            <div key={v.id} class="verif">
              <div>{v.question}</div>
              <div class="rangee" style="margin-top:6px">
                <button class={`btn petit ${reponses[v.id] === 'reste' ? 'actif' : ''}`} onClick={() => repondre(v.id, 'reste')}>
                  {v.type === 'rappel' ? 'Pas besoin' : 'Oui, il en reste'}
                </button>
                <button class={`btn petit ${reponses[v.id] === 'acheter' ? 'actif' : ''}`} onClick={() => repondre(v.id, 'acheter')}>
                  {v.type === 'rappel' ? 'Oui, à ajouter' : 'Non, à racheter'}
                </button>
              </div>
              {reponses[v.id] === 'acheter' && (
                <div class="doux petit-texte" style="margin-top:4px">Ajouté : {articlesVerifications([v], reponses, moisDe(lundi)).map((a) => a.texte).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      )}
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
