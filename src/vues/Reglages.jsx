import { useState } from 'preact/hooks';
import { mettre, doc, exporterTout } from '../store.js';
import { reglages } from '../calcul.js';
import { CODES_POSTES } from '../moteur/reglages.js';
import { JOURS_COURTS } from '../moteur/dates.js';
import { useSync, deconnecter, synchroniser, configure } from '../sync.js';

// Enregistre une clé de premier niveau des réglages (les autres restent aux valeurs par défaut)
function majCle(cle, valeur) {
  mettre('reglages', 'regles', { ...(doc('reglages', 'regles') || {}), [cle]: valeur });
}

const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];
const nombre = (v) => (v === '' ? 0 : Number(v));

function Nombre({ libelle, valeur, onChange, largeur = 80 }) {
  return (
    <label class="champ">{libelle}
      <input type="number" min="0" step="any" style={`width:${largeur}px`} value={valeur} onChange={(e) => onChange(nombre(e.target.value))} />
    </label>
  );
}

function Heure({ libelle, valeur, onChange }) {
  return (
    <label class="champ">{libelle}
      <input type="time" value={valeur || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Reglages() {
  const R = reglages();
  const sync = useSync();
  const set = (cle, sous, v) => majCle(cle, { ...R[cle], [sous]: v });

  return (
    <div>
      <div class="entete"><h1>Réglages</h1></div>

      <div class="carte">
        <h3>Compte et synchronisation</h3>
        {configure ? (
          <>
            <p class="doux">Connecté : {sync.email || '—'} · {({ ok: 'synchronisé', synchro: 'synchronisation…', horsligne: 'hors connexion', erreur: 'erreur' })[sync.etat] || sync.etat}
              {sync.attente ? ` · ${sync.attente} en attente` : ''}</p>
            {sync.message && <p class="erreur petit-texte">{sync.message}</p>}
            <div class="rangee">
              <button class="btn petit" onClick={synchroniser}>Synchroniser</button>
              <button class="btn petit" onClick={deconnecter}>Se déconnecter</button>
            </div>
          </>
        ) : <p class="doux">Mode local (Supabase non configuré) : les données restent sur ce téléphone.</p>}
      </div>

      <details class="carte">
        <summary>Prénoms</summary>
        <div class="rangee">
          {['moi', 'julie', 'martin'].map((k) => (
            <label class="champ" key={k}>{k}<input type="text" style="width:110px" value={R.noms[k]} onChange={(e) => set('noms', k, e.target.value.trim() || k)} /></label>
          ))}
        </div>
      </details>

      <details class="carte">
        <summary>Postes</summary>
        <p class="doux petit-texte">« Midi / soir » : où la personne mange quand elle est dans ce poste.</p>
        {CODES_POSTES.map((c) => {
          const p = R.postes[c];
          const majP = (k, v) => majCle('postes', { ...R.postes, [c]: { ...p, [k]: v } });
          return (
            <div key={c} style="border-top:1px solid var(--ligne);padding:8px 0">
              <b class={`poste ${c}`} style="display:inline-block;padding:2px 8px;height:auto">{c}</b> {p.libelle}
              <div class="rangee" style="margin-top:6px">
                <Heure libelle="Début" valeur={p.debut} onChange={(v) => majP('debut', v)} />
                <Heure libelle="Fin" valeur={p.fin} onChange={(v) => majP('fin', v)} />
                {['midi', 'soir'].map((r) => (
                  <label class="champ" key={r}>{r === 'midi' ? 'Midi' : 'Soir'}
                    <select value={p[r]} onChange={(e) => majP(r, e.target.value)}>
                      <option value="maison">maison</option><option value="travail">travail</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        <label class="case" style="margin-top:8px">
          <input type="checkbox" checked={R.regleMS} onChange={(e) => majCle('regleMS', e.target.checked)} />
          Avertir si nous sommes tous les deux en M ou en S (hors grands-parents)
        </label>
        <p class="doux petit-texte" style="margin-bottom:4px">Postes qui font un « jour de cuisine » :</p>
        <div class="rangee">
          {CODES_POSTES.map((c) => (
            <label class="case" key={c}>
              <input type="checkbox" checked={R.postesJourCuisine.includes(c)}
                onChange={(e) => majCle('postesJourCuisine', e.target.checked ? [...R.postesJourCuisine, c] : R.postesJourCuisine.filter((x) => x !== c))} />{c}
            </label>
          ))}
        </div>
      </details>

      <details class="carte">
        <summary>Heures des repas et temps de cuisine</summary>
        <div class="rangee">
          <Heure libelle="Déjeuner" valeur={R.heures.dejeuner} onChange={(v) => set('heures', 'dejeuner', v)} />
          <Heure libelle="Déjeuner avant un S" valeur={R.heures.dejeunerAvantS} onChange={(v) => set('heures', 'dejeunerAvantS', v)} />
          <Heure libelle="Dîner" valeur={R.heures.diner} onChange={(v) => set('heures', 'diner', v)} />
          <Nombre libelle="Trajet (min)" valeur={R.trajetMin} onChange={(v) => majCle('trajetMin', v)} />
        </div>
        <h2>Temps de préparation (minutes)</h2>
        <div class="rangee">
          <Nombre libelle="Midi à la maison" valeur={R.prep.midiMaison} onChange={(v) => set('prep', 'midiMaison', v)} />
          <Nombre libelle="Midi avant un S" valeur={R.prep.midiAvantS} onChange={(v) => set('prep', 'midiAvantS', v)} />
          <Nombre libelle="Soir ordinaire" valeur={R.prep.soirMax} onChange={(v) => set('prep', 'soirMax', v)} />
          <Nombre libelle="Jour de cuisine" valeur={R.prep.jourCuisine} onChange={(v) => set('prep', 'jourCuisine', v)} />
          <Nombre libelle="Seuil « Express »" valeur={R.prep.seuilExpress} onChange={(v) => set('prep', 'seuilExpress', v)} />
          <Nombre libelle="Seuil « Prêt à l’avance »" valeur={R.prep.seuilPretAvance} onChange={(v) => set('prep', 'seuilPretAvance', v)} />
          <Nombre libelle="Regrouper les dîners à moins de (min)" valeur={R.regroupementMin} onChange={(v) => majCle('regroupementMin', v)} />
        </div>
      </details>

      <details class="carte">
        <summary>Activités</summary>
        <Activites R={R} />
      </details>

      <details class="carte">
        <summary>Proposition et portions</summary>
        <div class="rangee">
          <Nombre libelle="Pas le même plat avant (jours)" valeur={R.antiRepetitionJours} onChange={(v) => majCle('antiRepetitionJours', v)} />
          <Nombre libelle="Créneaux de restes max" valeur={R.restesMax} onChange={(v) => majCle('restesMax', v)} />
          <Nombre libelle="Restes mangés sous (jours)" valeur={R.restesFenetreJours} onChange={(v) => majCle('restesFenetreJours', v)} />
          <Nombre libelle="Portion Martin" valeur={R.portions.martin} onChange={(v) => set('portions', 'martin', v)} />
          <Nombre libelle="Portion grand-parent" valeur={R.portions.grandParent} onChange={(v) => set('portions', 'grandParent', v)} />
          <Nombre libelle="Portion en plus les jours de VTT" valeur={R.portions.bonusVTT} onChange={(v) => set('portions', 'bonusVTT', v)} />
        </div>
        <label class="case" style="margin:8px 0">
          <input type="checkbox" checked={R.viandeAvecGrandsParentsSeulement}
            onChange={(e) => majCle('viandeAvecGrandsParentsSeulement', e.target.checked)} />
          Viande seulement quand les grands-parents sont là
        </label>
        <p class="doux petit-texte">Jours d’école (cantine) :</p>
        <JoursSemaine valeur={R.joursEcole} onChange={(v) => majCle('joursEcole', v)} />
      </details>

      <details class="carte">
        <summary>Courses Leclerc Drive</summary>
        <p class="doux petit-texte">Utilisés par le bouton « Copier la liste avec le prompt Claude ».</p>
        <label class="champ">Magasin Leclerc Drive
          <input type="text" placeholder="ex. E.Leclerc Drive …" value={R.courses.magasin}
            onChange={(e) => set('courses', 'magasin', e.target.value.trim())} />
        </label>
        <label class="champ" style="margin-top:8px">Consignes en plus pour Claude
          <textarea style="min-height:90px;font-family:inherit" placeholder="ex. Lait d’avoine plutôt que lait de vache. Budget max 120 €."
            value={R.courses.consignes} onChange={(e) => set('courses', 'consignes', e.target.value.trim())} />
        </label>
      </details>

      <details class="carte">
        <summary>Vacances scolaires (zone A)</summary>
        <EditeurJSON valeur={R.vacances} onChange={(v) => majCle('vacances', v)}
          aide='Liste de {"nom", "debut" (1er jour sans école), "reprise" (jour de la rentrée)}. À vérifier sur education.gouv.fr.'
          valider={(v) => Array.isArray(v) && v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.debut) && /^\d{4}-\d{2}-\d{2}$/.test(x.reprise))} />
      </details>

      <details class="carte">
        <summary>Sauvegarde</summary>
        <p class="doux petit-texte">Télécharge toutes les données (planning, plats, menus…) au format JSON.</p>
        <div class="rangee">
          <button class="btn petit" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(exporterTout(), null, 1)], { type: 'application/json' }));
            const a = Object.assign(document.createElement('a'), { href: url, download: `repas-${new Date().toISOString().slice(0, 10)}.json` });
            a.click(); URL.revokeObjectURL(url);
          }}>Exporter</button>
          <button class="btn petit danger" onClick={() => { if (confirm('Revenir aux règles par défaut ?')) mettre('reglages', 'regles', {}); }}>Réinitialiser les règles</button>
        </div>
      </details>
    </div>
  );
}

function JoursSemaine({ valeur = [], onChange }) {
  return (
    <div class="rangee">
      {ORDRE_JOURS.map((j) => (
        <label class="case" key={j}>
          <input type="checkbox" checked={valeur.includes(j)} onChange={(e) => onChange(e.target.checked ? [...valeur, j] : valeur.filter((x) => x !== j))} />
          {JOURS_COURTS[j]}
        </label>
      ))}
    </div>
  );
}

function Activites({ R }) {
  const acts = R.activites;
  const maj = (i, k, v) => majCle('activites', acts.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  const qui = { moi: R.noms.moi, julie: R.noms.julie, martin: R.noms.martin };
  return (
    <div>
      <p class="doux petit-texte">Une activité est ignorée si son horaire chevauche le poste de la personne (ex. volley un jour en S).
        « Repas » : le repas décalé par l’activité, pris à « heure du repas ».</p>
      {acts.map((a, i) => (
        <div key={a.id} style="border-top:1px solid var(--ligne);padding:8px 0">
          <div class="rangee">
            <input type="text" style="flex:1" value={a.nom} onChange={(e) => maj(i, 'nom', e.target.value)} />
            <select value={a.qui} onChange={(e) => maj(i, 'qui', e.target.value)}>
              {Object.entries(qui).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <button class="btn petit danger" onClick={() => majCle('activites', acts.filter((_, j) => j !== i))}>✕</button>
          </div>
          <JoursSemaine valeur={a.jours} onChange={(v) => maj(i, 'jours', v)} />
          <div class="rangee">
            <Heure libelle="Début" valeur={a.debut} onChange={(v) => maj(i, 'debut', v)} />
            <Heure libelle="Fin" valeur={a.fin} onChange={(v) => maj(i, 'fin', v)} />
            <label class="champ">Repas
              <select value={a.repas || ''} onChange={(e) => maj(i, 'repas', e.target.value || null)}>
                <option value="">—</option><option value="midi">midi</option><option value="soir">soir</option>
              </select>
            </label>
            {a.repas && <Heure libelle="Heure du repas" valeur={a.heureRepas} onChange={(v) => maj(i, 'heureRepas', v)} />}
            {a.repas === 'midi' && <Nombre libelle="Cuisine max (min)" valeur={a.prepMax ?? ''} onChange={(v) => maj(i, 'prepMax', v || null)} />}
          </div>
          <div class="rangee">
            <label class="case"><input type="checkbox" checked={!!a.consistant} onChange={(e) => maj(i, 'consistant', e.target.checked)} />Repas consistants (sport)</label>
            <label class="case"><input type="checkbox" checked={!!a.horsVacances} onChange={(e) => maj(i, 'horsVacances', e.target.checked)} />Pas pendant les vacances</label>
            <label class="champ">Mois (ex. 4-11)
              <input type="text" style="width:90px" value={a.mois ? `${a.mois[0]}-${a.mois[a.mois.length - 1]}` : ''}
                onChange={(e) => {
                  const m = e.target.value.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
                  if (!m) return maj(i, 'mois', null);
                  const [d, f] = [Number(m[1]), Number(m[2])];
                  const liste = [];
                  for (let x = d; ; x = (x % 12) + 1) { liste.push(x); if (x === f || liste.length > 12) break; }
                  maj(i, 'mois', liste);
                }} />
            </label>
          </div>
        </div>
      ))}
      <button class="btn petit" onClick={() => majCle('activites', [...acts, { id: `act-${Date.now()}`, nom: 'Nouvelle activité', qui: 'moi', jours: [], debut: '18:00', fin: '19:00', repas: null }])}>
        + Activité
      </button>
    </div>
  );
}

function EditeurJSON({ valeur, onChange, aide, valider }) {
  const [texte, setTexte] = useState(() => JSON.stringify(valeur, null, 1));
  const [erreur, setErreur] = useState('');
  return (
    <div>
      <p class="doux petit-texte">{aide}</p>
      <textarea value={texte} onInput={(e) => { setTexte(e.target.value); setErreur(''); }} style="min-height:220px" />
      <button class="btn petit" onClick={() => {
        try {
          const v = JSON.parse(texte);
          if (valider && !valider(v)) throw new Error('format inattendu');
          onChange(v); setErreur('Enregistré.');
        } catch (e) { setErreur(`Non enregistré : ${e.message}`); }
      }}>Enregistrer</button>
      {erreur && <span class="petit-texte"> {erreur}</span>}
    </div>
  );
}
