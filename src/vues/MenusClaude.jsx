import { useState } from 'preact/hooks';
import { doc, donnees, modifier } from '../store.js';
import { reglages } from '../calcul.js';
import { messageMenusClaude, CHAMPS_STOCK } from '../moteur/menus-claude.js';
import { aujourdhui, libelleDate } from '../moteur/dates.js';
import { copier } from '../presse-papiers.js';

// Stock partagé entre les deux téléphones : un seul document, mis à jour d'une semaine à l'autre.
const ID_STOCK = 'stock';

export function MenusClaude({ lundi, titre, jours }) {
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState({}); // saisies pas encore enregistrées
  const [toast, setToast] = useState('');
  const stock = doc('courses', ID_STOCK) || {};
  const valeur = (id) => brouillon[id] ?? stock[id] ?? '';

  const enregistrer = () => {
    if (!Object.keys(brouillon).length) return { ...stock };
    const nouveau = { ...stock, ...brouillon, misAJour: aujourdhui() };
    modifier('courses', ID_STOCK, nouveau);
    setBrouillon({});
    return nouveau;
  };

  const copierMessage = async () => {
    const s = enregistrer();
    const auj = aujourdhui();
    const texte = messageMenusClaude({
      titreSemaine: titre, jours, depuis: lundi > auj ? lundi : auj,
      menus: donnees('menus'), plats: donnees('plats'), reglages: reglages(), stock: s,
    });
    const ok = await copier(texte);
    setToast(ok ? 'Message copié : collez-le dans le projet « Menus de la semaine »' : 'Copie impossible');
    setTimeout(() => setToast(''), 3000);
  };

  if (!ouvert) {
    return (
      <button class="btn" style="width:100%;margin-bottom:10px" onClick={() => setOuvert(true)}>
        🤖 Choisir les menus avec Claude
      </button>
    );
  }

  return (
    <div class="carte">
      <div class="jour-titre">
        <h3>🤖 Menus avec Claude</h3>
        <button class="btn petit" onClick={() => { enregistrer(); setOuvert(false); }}>Fermer</button>
      </div>
      <p class="doux">
        Notez ce qu’il reste à la maison. Les repas à prévoir de la semaine du {titre} sont ajoutés
        automatiquement d’après le planning.
        {stock.misAJour && ` Stock mis à jour le ${libelleDate(stock.misAJour).toLowerCase()}.`}
      </p>
      {CHAMPS_STOCK.map((ch) => (
        <label class="champ stock" key={ch.id}>
          <span><b>{ch.titre}</b> · {ch.aide}</span>
          <textarea value={valeur(ch.id)} rows={3}
            onInput={(e) => setBrouillon({ ...brouillon, [ch.id]: e.target.value })}
            onBlur={enregistrer} />
        </label>
      ))}
      <button class="btn principal" style="width:100%;margin-top:4px" onClick={copierMessage}>
        📋 Copier le message pour Claude
      </button>
      {toast && <div class="toast">{toast}</div>}
    </div>
  );
}
