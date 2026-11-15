// Message à coller dans le projet Claude « Menus de la semaine » : les repas à prévoir
// (calculés depuis le planning), le stock saisi dans l'app et les notes des repas récents.
import { JOURS_LONGS, MOIS_LONGS, depuisIso, ajouterJours } from './dates.js';

export const CHAMPS_STOCK = [
  { id: 'congelateur', titre: 'Congélateur', aide: 'Plats maison, légumes surgelés, poisson…' },
  { id: 'frigo', titre: 'Frigo', aide: 'Mettez ⚠️ devant ce qui doit être mangé vite' },
  { id: 'fruitsLegumes', titre: 'Fruits et légumes', aide: 'Avec les quantités approximatives' },
  { id: 'placard', titre: 'Placard', aide: 'Féculents, légumineuses, conserves… (facultatif)' },
  { id: 'envies', titre: 'Envies et contraintes', aide: 'Invités, envie de soupe, repas à l’extérieur…' },
];

const heure = (h) => String(h).replace(':', 'h').replace(/^0(?=\d)/, '');

function jourLong(iso) {
  const d = depuisIso(iso);
  return `${JOURS_LONGS[d.getDay()]} ${d.getDate()} ${MOIS_LONGS[d.getMonth()]}`;
}

function nom(qui, R, gp) {
  if (qui === 'gp') return gp > 1 ? `les grands-parents (${gp})` : 'un grand-parent';
  return R.noms[qui] || qui;
}

function libelleCreneau(id) {
  const d = depuisIso(id.slice(0, 10));
  return `${JOURS_LONGS[d.getDay()].toLowerCase()} ${id.endsWith('midi') ? 'midi' : 'soir'}`;
}

// Une ligne de liste par ligne saisie (les puces déjà tapées sont conservées)
function listeSaisie(texte) {
  const lignes = String(texte || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return '(rien de noté)';
  return lignes.map((l) => (/^[-•*]\s*/.test(l) ? `- ${l.replace(/^[-•*]\s*/, '')}` : `- ${l}`)).join('\n');
}

/**
 * @param {object} o
 * @param {string} o.titreSemaine  ex. « 16 – 22 novembre »
 * @param {object[]} o.jours       jours analysés de la semaine (analyserJour)
 * @param {string} o.depuis        date ISO du premier jour à prévoir (aujourd'hui pour la semaine en cours)
 * @param {object} o.menus         { idCreneau: menu }
 * @param {object} o.plats         { id: plat }
 * @param {object} o.reglages      réglages fusionnés
 * @param {object} [o.stock]       { congelateur, frigo, fruitsLegumes, placard, envies }
 */
export function messageMenusClaude({ titreSemaine, jours, depuis, menus = {}, plats = {}, reglages: R, stock = {} }) {
  const blocs = [];
  const sansRepas = [];
  for (const j of jours.filter((x) => x.date >= depuis)) {
    const infos = [`${R.noms.moi} : ${j.postes.moi}`, `${R.noms.julie} : ${j.postes.julie}`];
    for (const a of j.activites.filter((x) => !x.ignoree)) infos.push(`${a.nom} (${nom(a.qui, R)} ${heure(a.debut)}–${heure(a.fin)})`);
    const extra = [j.vacances && `vacances (${j.vacances})`, j.ferie && `férié (${j.ferie})`,
      j.incomplet && '⚠️ planning incomplet'].filter(Boolean);
    const lignes = [];
    for (const repas of ['midi', 'soir']) {
      const c = j.creneaux[repas];
      if (c.vide) continue;
      const m = menus[c.id];
      if (m?.aucun) { sansRepas.push(libelleCreneau(c.id)); continue; }
      const moments = c.moments.map((mo) => `${heure(mo.heure)} ${mo.qui.map((q) => nom(q, R, j.gp)).join(', ')}`).join(' ; ');
      const detail = [`${c.prepDispo} min de cuisine`, ...c.etiquettes].join(' · ');
      lignes.push(`- ${repas === 'midi' ? 'Midi' : 'Soir'} : ${moments} · ${detail}`);
      const plat = m?.platId && plats[m.platId];
      if (plat && m.verrouille) {
        lignes.push(`  → déjà décidé : ${plat.nom}${m.reste ? ` (♻️ restes du ${libelleCreneau(m.reste)})` : ''}`);
      }
    }
    if (!lignes.length) continue;
    blocs.push(`**${jourLong(j.date)}** (${infos.join(' · ')})${extra.length ? ` · ${extra.join(' · ')}` : ''}\n${lignes.join('\n')}`);
  }

  // Notes des repas des 14 derniers jours
  const debutNotes = ajouterJours(depuis, -14);
  const notes = Object.entries(menus)
    .filter(([id, m]) => id.slice(0, 10) >= debutNotes && id.slice(0, 10) < depuis && m?.platId && plats[m.platId] &&
      (m.note || m.martinAime))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, m]) => {
      const avis = [m.note === 'refaire' && '👍 à refaire', m.note === 'bof' && '😐 bof',
        m.martinAime && `😋 ${R.noms.martin} a aimé`].filter(Boolean).join(', ');
      return `- ${plats[m.platId].nom} (${libelleCreneau(id)}) : ${avis}`;
    });

  const parties = [
    `Voici notre semaine du ${titreSemaine}. Propose les menus en suivant les instructions du projet.`,
    `## Repas à prévoir\n${blocs.length ? blocs.join('\n\n') : '(aucun repas à prévoir)'}`
      + (sansRepas.length ? `\n\nPas de repas à prévoir : ${sansRepas.join(', ')}.` : ''),
  ];
  for (const ch of CHAMPS_STOCK.filter((x) => x.id !== 'envies')) {
    parties.push(`## ${ch.titre}${ch.id === 'frigo' ? ' (⚠️ = à manger vite)' : ''}\n${listeSaisie(stock[ch.id])}`);
  }
  if (notes.length) parties.push(`## Notes des repas récents\n${notes.join('\n')}`);
  parties.push(`## Envies et contraintes\n${listeSaisie(stock.envies)}`);
  return `${parties.join('\n\n')}\n`;
}
