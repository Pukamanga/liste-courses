import { useState } from 'preact/hooks';
import { donnees, supprimer } from '../store.js';
import { enregistrerPlat } from '../actions.js';
import { statsNotes, tempsTotal } from '../moteur/proposition.js';
import { SAISONS, LIBELLES_SAISONS } from '../moteur/saisons.js';
import { rayonDe } from '../moteur/courses.js';

export const PROTEINES = {
  legumineuses: '🫘 Légumineuses', oeufs: '🥚 Œufs', laitier: '🧀 Fromage / laitages', soja: '🌱 Soja / tofu',
  poisson: '🐟 Poisson', viande: '🥩 Viande',
};
const UNITES = ['g', 'ml', 'pièce', 'tranche', 'gousse', 'botte', 'c. à soupe'];
const NOUVEAU = () => ({
  id: `plat-${Date.now()}`, nom: '', prep: 15, cuisson: 20, rechauffe: false, double: false,
  consistant: false, leger: false, martin: null, saisons: [], proteine: 'legumineuses', ingredients: [{ nom: '', qte: 100, unite: 'g' }],
});

export function resumePlat(p) {
  return [
    p.proteine && PROTEINES[p.proteine].split(' ')[0],
    `${tempsTotal(p)} min`,
    p.rechauffe && 'se réchauffe',
    p.double && 'en double',
    p.consistant && 'consistant',
    p.leger && 'léger',
    p.martin === 'aime' && 'Martin aime',
    p.martin === 'naimePas' && 'Martin n’aime pas',
    p.saisons?.length && p.saisons.length < 4 ? p.saisons.map((s) => LIBELLES_SAISONS[s]).join('/') : null,
  ].filter(Boolean).join(' · ');
}

export function Plats() {
  const [recherche, setRecherche] = useState('');
  const [edition, setEdition] = useState(null);
  const [filtre, setFiltre] = useState('');
  const plats = donnees('plats');
  const stats = statsNotes(donnees('menus'));

  if (edition) return <Formulaire initial={edition} onFini={() => setEdition(null)} />;

  const q = recherche.trim().toLowerCase();
  const liste = Object.values(plats)
    .filter((p) => !q || p.nom.toLowerCase().includes(q) || p.ingredients?.some((i) => i.nom.toLowerCase().includes(q)))
    .filter((p) => !filtre || p.proteine === filtre)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  return (
    <div>
      <div class="entete">
        <h1>Plats ({Object.keys(plats).length})</h1>
        <button class="btn principal petit" onClick={() => setEdition(NOUVEAU())}>+ Nouveau</button>
      </div>
      <input type="text" placeholder="Rechercher un plat ou un ingrédient" style="width:100%;margin-bottom:10px"
        value={recherche} onInput={(e) => setRecherche(e.target.value)} />
      <div class="rangee" style="margin-bottom:10px">
        <button class={`btn petit ${!filtre ? 'actif' : ''}`} onClick={() => setFiltre('')}>Tous</button>
        {Object.entries(PROTEINES).map(([k, l]) => (
          <button key={k} class={`btn petit ${filtre === k ? 'actif' : ''}`} onClick={() => setFiltre(filtre === k ? '' : k)}>{l}</button>
        ))}
      </div>
      <div class="carte liste-plats">
        {liste.map((p) => {
          const s = stats[p.id];
          return (
            <div class="plat-ligne" key={p.id} onClick={() => setEdition(structuredClone(p))} role="button">
              <div>
                <div>{p.nom}</div>
                <div class="doux petit-texte">{resumePlat(p)}</div>
              </div>
              {s && <div class="petit-texte" style="white-space:nowrap">
                {s.refaire ? `👍${s.refaire} ` : ''}{s.bof ? `😐${s.bof} ` : ''}{s.martin ? `😋${s.martin}` : ''}
              </div>}
            </div>
          );
        })}
        {liste.length === 0 && <p class="vide">Aucun plat.</p>}
      </div>
    </div>
  );
}

function Formulaire({ initial, onFini }) {
  const [p, setP] = useState(initial);
  const maj = (k, v) => setP({ ...p, [k]: v });
  const majIng = (idx, k, v) => maj('ingredients', p.ingredients.map((x, i) => (i === idx ? { ...x, [k]: v } : x)));
  const existe = !!donnees('plats')[p.id];

  const enregistrer = () => {
    if (!p.nom.trim()) return;
    enregistrerPlat({
      ...p,
      nom: p.nom.trim(),
      prep: Number(p.prep) || 0,
      cuisson: Number(p.cuisson) || 0,
      ingredients: p.ingredients.filter((i) => i.nom.trim()).map((i) => ({ ...i, nom: i.nom.trim(), qte: Number(i.qte) || 0 })),
    });
    onFini();
  };

  return (
    <div>
      <div class="entete">
        <h1>{existe ? 'Modifier le plat' : 'Nouveau plat'}</h1>
        <button class="btn petit" onClick={onFini}>Fermer</button>
      </div>
      <div class="carte">
        <label class="champ">Nom<input type="text" value={p.nom} onInput={(e) => maj('nom', e.target.value)} /></label>
        <div class="rangee" style="margin-top:8px">
          <label class="champ">Préparation (min)<input type="number" min="0" style="width:110px" value={p.prep} onInput={(e) => maj('prep', e.target.value)} /></label>
          <label class="champ">Cuisson (min)<input type="number" min="0" style="width:110px" value={p.cuisson} onInput={(e) => maj('cuisson', e.target.value)} /></label>
        </div>
        <h2>Étiquettes</h2>
        <div class="rangee">
          {[['rechauffe', 'Se réchauffe bien'], ['double', 'Se prépare en double'], ['consistant', 'Consistant'], ['leger', 'Léger']].map(([k, l]) => (
            <label class="case" key={k}><input type="checkbox" checked={!!p[k]} onChange={(e) => maj(k, e.target.checked)} />{l}</label>
          ))}
        </div>
        <label class="champ" style="margin-top:8px">Protéine principale
          <select value={p.proteine || ''} onChange={(e) => maj('proteine', e.target.value || null)}>
            <option value="">—</option>
            {Object.entries(PROTEINES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label class="champ" style="margin-top:8px">Martin
          <select value={p.martin || ''} onChange={(e) => maj('martin', e.target.value || null)}>
            <option value="">—</option><option value="aime">Martin aime</option><option value="naimePas">Martin n’aime pas</option>
          </select>
        </label>
        <h2>Saisons <span class="doux petit-texte">(aucune = toute l’année)</span></h2>
        <div class="rangee">
          {SAISONS.map((s) => (
            <label class="case" key={s}>
              <input type="checkbox" checked={p.saisons.includes(s)}
                onChange={(e) => maj('saisons', e.target.checked ? [...p.saisons, s] : p.saisons.filter((x) => x !== s))} />
              {LIBELLES_SAISONS[s]}
            </label>
          ))}
        </div>
        <h2>Ingrédients <span class="doux petit-texte">(quantité par personne)</span></h2>
        {p.ingredients.map((ing, idx) => (
          <div key={idx}>
            <div class="ingredient">
              <input type="text" placeholder="Ingrédient" value={ing.nom} onInput={(e) => majIng(idx, 'nom', e.target.value)} />
              <input type="number" step="any" min="0" value={ing.qte} onInput={(e) => majIng(idx, 'qte', e.target.value)} />
              <select value={ing.unite} onChange={(e) => majIng(idx, 'unite', e.target.value)}>
                {[...new Set([...UNITES, ing.unite])].map((u) => <option key={u}>{u}</option>)}
              </select>
              <button class="btn petit" aria-label="Retirer" onClick={() => maj('ingredients', p.ingredients.filter((_, i) => i !== idx))}>✕</button>
            </div>
            {ing.nom && <div class="doux petit-texte" style="margin:-2px 0 6px">{rayonDe(ing)}</div>}
          </div>
        ))}
        <button class="btn petit" onClick={() => maj('ingredients', [...p.ingredients, { nom: '', qte: 100, unite: 'g' }])}>+ Ingrédient</button>
        <div class="rangee" style="margin-top:16px;justify-content:space-between">
          <button class="btn principal" onClick={enregistrer} disabled={!p.nom.trim()}>Enregistrer</button>
          {existe && <button class="btn danger" onClick={() => { if (confirm(`Supprimer « ${p.nom} » ?`)) { supprimer('plats', p.id); onFini(); } }}>Supprimer</button>}
        </div>
      </div>
    </div>
  );
}
