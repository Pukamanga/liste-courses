import { useState } from 'preact/hooks';
import { doc, modifier, lot, mettre, supprimer } from '../store.js';
import { reglages, periodesGP, analyser } from '../calcul.js';
import { joursDuMois, jourSemaine, JOURS_COURTS, MOIS_LONGS, aujourdhui, moisDe, depuisIso } from '../moteur/dates.js';
import { CODES_POSTES } from '../moteur/reglages.js';
import { avertissementSaisie } from '../moteur/regles.js';
import { periodeVacances, ferie } from '../moteur/vacances.js';
import { analyserImport } from '../moteur/import.js';

const CYCLE = [...CODES_POSTES, ''];

function moisVoisin(mois, n) {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function Planning() {
  const [mois, setMois] = useState(() => aujourdhui().slice(0, 7));
  const [importOuvert, setImportOuvert] = useState(false);
  const R = reglages();
  const gp = periodesGP();
  const jours = joursDuMois(mois);
  const [a, m] = mois.split('-').map(Number);

  const tourner = (date, qui) => {
    const actuel = doc('jours', date)?.[qui] || '';
    const suivant = CYCLE[(CYCLE.indexOf(actuel) + 1) % CYCLE.length];
    modifier('jours', date, { [qui]: suivant || null });
  };
  // Mardi d'avril à novembre : VTT automatique, la case permet de l'annuler (vtt = false)
  const basculerVTT = (date, auto) => {
    const v = doc('jours', date)?.vtt;
    modifier('jours', date, { vtt: auto ? (v === false ? null : false) : !v });
  };

  const saisis = jours.filter((d) => doc('jours', d)?.moi && doc('jours', d)?.julie).length;

  return (
    <div>
      <div class="entete">
        <div class="nav">
          <button class="rond" aria-label="Mois précédent" onClick={() => setMois(moisVoisin(mois, -1))}>‹</button>
          <h1>{MOIS_LONGS[m - 1]} {a}</h1>
          <button class="rond" aria-label="Mois suivant" onClick={() => setMois(moisVoisin(mois, 1))}>›</button>
        </div>
        <button class="btn petit" onClick={() => setImportOuvert(!importOuvert)}>Importer</button>
      </div>

      {importOuvert && <Import mois={mois} onFini={(mo) => { setImportOuvert(false); if (mo) setMois(mo); }} />}

      <p class="doux">Touchez une case pour faire défiler M → S → M2 → F → R → CA. {saisis}/{jours.length} jours complets.</p>

      <div class="grille">
        <div class="entete-grille"><span></span><span>{R.noms.moi}</span><span>{R.noms.julie}</span><span>VTT</span></div>
        {jours.map((d) => {
          const j = doc('jours', d) || {};
          const js = jourSemaine(d);
          const vac = periodeVacances(d, R.vacances);
          const fer = ferie(d);
          const w = avertissementSaisie(d, j, R, gp);
          const gpJour = gp.some((g) => d >= g.debut && d <= g.fin);
          const vttAuto = R.activites.some((x) => x.qui === 'moi' && x.consistant && (x.jours || []).includes(js) &&
            (!x.mois || x.mois.includes(moisDe(d))));
          const vttDemande = j.vtt || (vttAuto && j.vtt !== false);
          return (
            <div key={d} class={`ligne-jour ${js === 0 || js === 6 ? 'we' : ''}`}>
              <div class="date">
                <b>{JOURS_COURTS[js]} {depuisIso(d).getDate()}</b>
                <small>{[fer ? 'férié' : vac ? 'vacances' : '', gpJour ? 'GP' : ''].filter(Boolean).join(' · ')}</small>
              </div>
              <button class={`poste ${j.moi || ''}`} onClick={() => tourner(d, 'moi')} aria-label={`${R.noms.moi} le ${d}`}>{j.moi || '·'}</button>
              <button class={`poste ${j.julie || ''}`} onClick={() => tourner(d, 'julie')} aria-label={`${R.noms.julie} le ${d}`}>{j.julie || '·'}</button>
              <button class={`vtt ${vttDemande ? 'on' : ''} ${vttDemande && !analyser(d, R, gp).vtt ? 'annule' : ''}`}
                onClick={() => basculerVTT(d, vttAuto)}
                title={vttAuto ? 'VTT du mardi (automatique, annulé si en poste)' : 'VTT ce jour'}>🚵</button>
              {w && <div class="ligne-alerte">⚠️ {w} — hors période grands-parents</div>}
            </div>
          );
        })}
      </div>

      <GrandsParents />
    </div>
  );
}

function Import({ mois, onFini }) {
  const [texte, setTexte] = useState('');
  const [res, setRes] = useState(null);
  const R = reglages();
  const exemple = JSON.stringify({ mois, jours: { [`${mois}-01`]: { moi: 'M', julie: 'S' } } });

  const valider = () => {
    lot(Object.entries(res.jours).map(([date, j]) => ({
      coll: 'jours', id: date, data: { ...(doc('jours', date) || {}), ...j },
    })));
    onFini(res.mois);
  };

  return (
    <div class="carte">
      <h3>Importer un planning (JSON)</h3>
      <p class="doux petit-texte">Format : <code>{exemple}</code></p>
      <textarea value={texte} onInput={(e) => { setTexte(e.target.value); setRes(null); }} placeholder="Collez ici le JSON produit par Claude" />
      <div class="rangee" style="margin-top:8px">
        <button class="btn" onClick={() => setRes(analyserImport(texte, R, periodesGP()))}>Vérifier</button>
        <button class="btn" onClick={() => onFini(null)}>Annuler</button>
      </div>
      {res && (
        <div style="margin-top:8px">
          {res.erreurs.map((e) => <div class="erreur petit-texte">✖ {e}</div>)}
          {res.avertissements.map((e) => <div class="alerte">⚠️ {e}</div>)}
          {res.manquants.length > 0 && (
            <details>
              <summary class="petit-texte">{res.manquants.length} élément(s) manquant(s)</summary>
              {res.manquants.map((e) => <div class="doux petit-texte">{e}</div>)}
            </details>
          )}
          {res.mois && (
            <p class="petit-texte">{Object.keys(res.jours).length} jour(s) lisible(s) pour {res.mois}.
              {res.erreurs.length > 0 && ' Les lignes en erreur seront ignorées.'}</p>
          )}
          {res.mois && Object.keys(res.jours).length > 0 && (
            <button class="btn principal" onClick={valider}>Valider l’import</button>
          )}
        </div>
      )}
    </div>
  );
}

function GrandsParents() {
  const gp = periodesGP().sort((x, y) => x.debut.localeCompare(y.debut));
  const [form, setForm] = useState({ debut: '', fin: '', nb: 2 });
  const ajouter = () => {
    if (!form.debut || !form.fin || form.fin < form.debut) return;
    mettre('gp', `gp-${Date.now()}`, { debut: form.debut, fin: form.fin, nb: Number(form.nb) || 2 });
    setForm({ debut: '', fin: '', nb: 2 });
  };
  return (
    <div class="carte" style="margin-top:12px">
      <h3>Grands-parents à la maison</h3>
      <p class="doux petit-texte">Ils s’ajoutent à tous les repas pris à la maison et peuvent garder Martin (pas d’avertissement M/S).</p>
      {gp.map((g) => (
        <div class="rangee" key={g.id} style="justify-content:space-between;margin:6px 0">
          <span>Du {g.debut} au {g.fin} · {g.nb} pers.</span>
          <button class="btn petit danger" onClick={() => supprimer('gp', g.id)}>Retirer</button>
        </div>
      ))}
      <div class="rangee" style="margin-top:8px">
        <label class="champ">Début<input type="date" value={form.debut} onInput={(e) => setForm({ ...form, debut: e.target.value })} /></label>
        <label class="champ">Fin<input type="date" value={form.fin} onInput={(e) => setForm({ ...form, fin: e.target.value })} /></label>
        <label class="champ">Nombre<input type="number" min="1" max="6" style="width:70px" value={form.nb} onInput={(e) => setForm({ ...form, nb: e.target.value })} /></label>
        <button class="btn" style="align-self:flex-end" onClick={ajouter} disabled={!form.debut || !form.fin || form.fin < form.debut}>Ajouter</button>
      </div>
    </div>
  );
}
