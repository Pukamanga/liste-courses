// Actions sur les menus (proposition, « Autre idée », choix manuel, notes).
import { donnees, doc, lot, mettre, modifier } from './store.js';
import { reglages, creneauxAutour } from './calcul.js';
import { proposer, restesDe, propositionValide } from './moteur/proposition.js';
import { lundiDe, aujourdhui, ajouterJours } from './moteur/dates.js';

const pareil = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Ne touche jamais aux jours passés (ce qui a été mangé reste dans l'historique)
export function proposerSemaine(lundi, effacer = false) {
  const auj = aujourdhui();
  const creneaux = creneauxAutour(lundi, 0).filter((c) => c.date >= auj);
  const menus = donnees('menus');
  const res = proposer(creneaux, donnees('plats'), menus, reglages(), { graine: lundi, effacer });
  const ops = [];
  for (const [id, m] of Object.entries(res)) {
    if (m === null) { if (menus[id]) ops.push({ coll: 'menus', id, deleted: true }); continue; }
    if (!pareil(menus[id], m)) ops.push({ coll: 'menus', id, data: m });
  }
  if (ops.length) lot(ops);
  return ops.length;
}

// Retire les restes (non verrouillés) qui dépendent d'un créneau
function opsEffacerRestes(idCreneau) {
  const menus = donnees('menus');
  return restesDe(idCreneau, menus)
    .filter((id) => !menus[id].verrouille)
    .map((id) => ({ coll: 'menus', id, deleted: true }));
}

export function autreIdee(c) {
  const m = doc('menus', c.id) || {};
  let refus = [...(m.refus || [])];
  if (m.platId && !refus.includes(m.platId)) refus.push(m.platId);
  if (refus.length > Object.keys(donnees('plats')).length - 2) refus = m.platId ? [m.platId] : [];
  lot([...opsEffacerRestes(c.id), { coll: 'menus', id: c.id, data: { refus } }]);
  proposerSemaine(lundiDe(c.date));
}

export function choisir(c, platId) {
  const m = doc('menus', c.id) || {};
  lot([...opsEffacerRestes(c.id), { coll: 'menus', id: c.id, data: { refus: m.refus || [], platId, verrouille: true, reste: null } }]);
}

export function pasDeRepas(c) {
  lot([...opsEffacerRestes(c.id), { coll: 'menus', id: c.id, data: { aucun: true, verrouille: true } }]);
}

export function vider(c) {
  lot([...opsEffacerRestes(c.id), { coll: 'menus', id: c.id, deleted: true }]);
}

export function basculerVerrou(c) {
  const m = doc('menus', c.id);
  if (m) modifier('menus', c.id, { verrouille: !m.verrouille });
}

export function noter(c, note) {
  const m = doc('menus', c.id);
  if (m) modifier('menus', c.id, { note: m.note === note ? null : note });
}

export function basculerMartinAime(c) {
  const m = doc('menus', c.id);
  if (m) modifier('menus', c.id, { martinAime: !m.martinAime });
}

export function enregistrerPlat(plat) {
  mettre('plats', plat.id, plat);
}

// Au démarrage : remplace les propositions à venir devenues contraires aux règles
// (plat supprimé, viande hors grands-parents), sur la semaine en cours et la suivante.
export function nettoyerPropositions() {
  const auj = aujourdhui();
  const plats = donnees('plats');
  const R = reglages();
  let n = 0;
  for (const lundi of [lundiDe(auj), ajouterJours(lundiDe(auj), 7)]) {
    const menus = donnees('menus');
    const aRevoir = creneauxAutour(lundi, 0).some((c) => {
      const m = menus[c.id];
      return c.date >= auj && m?.platId && !m.verrouille && !m.note && !m.martinAime &&
        !propositionValide(m, c, plats, R);
    });
    if (aRevoir) n += proposerSemaine(lundi);
  }
  return n;
}
