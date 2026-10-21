// Actions sur les menus (proposition, « Autre idée », choix manuel, notes).
import { donnees, doc, lot, mettre, modifier } from './store.js';
import { reglages, creneauxAutour } from './calcul.js';
import { proposer, restesDe } from './moteur/proposition.js';
import { lundiDe } from './moteur/dates.js';

const pareil = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function proposerSemaine(lundi, effacer = false) {
  const creneaux = creneauxAutour(lundi, 0);
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
