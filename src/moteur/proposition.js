// Proposition automatique des repas, sans IA : filtres stricts + score.
import { ecartJours, moisDe } from './dates.js';
import { ETIQ } from './reglages.js';
import { saisonDuMois, estDeSaison } from './saisons.js';

export const NOTES = { REFAIRE: 'refaire', BOF: 'bof' };

export function tempsTotal(plat) {
  return (Number(plat.prep) || 0) + (Number(plat.cuisson) || 0);
}

// Statistiques de notes par plat à partir de l'historique des menus.
export function statsNotes(menus) {
  const stats = {};
  for (const m of Object.values(menus || {})) {
    if (!m || m.deleted || !m.platId) continue;
    const s = (stats[m.platId] ||= { refaire: 0, bof: 0, martin: 0 });
    if (m.note === NOTES.REFAIRE) s.refaire++;
    if (m.note === NOTES.BOF) s.bof++;
    if (m.martinAime) s.martin++;
  }
  return stats;
}

// Score saisonnier : étiquettes de saison du plat + fruits et légumes de saison du mois.
export function scoreSaison(plat, mois) {
  let s = 0;
  const saisons = plat.saisons || [];
  if (saisons.length && saisons.length < 4) s += saisons.includes(saisonDuMois(mois)) ? 2 : -4;
  let dans = 0, hors = 0;
  for (const ing of plat.ingredients || []) {
    const r = estDeSaison(ing.nom, mois);
    if (r === true) dans++;
    if (r === false) hors++;
  }
  return s + Math.min(dans, 3) * 0.5 - hors * 2;
}

export function compatible(plat, creneau) {
  const e = creneau.etiquettes;
  if (e.includes(ETIQ.AVANCE) || e.includes(ETIQ.PLUSIEURS)) {
    if (!plat.rechauffe) return false;
    // Prêt à l'avance : préparé plus tôt, le temps disponible ne compte pas
    if (e.includes(ETIQ.AVANCE)) return true;
  }
  return tempsTotal(plat) <= Math.max(creneau.prepDispo, 0);
}

// Petit hasard déterministe (même entrée = même résultat sur les deux téléphones)
function hasard(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function scorer(plat, creneau, ctx) {
  const e = creneau.etiquettes;
  let s = scoreSaison(plat, moisDe(creneau.date));
  const st = ctx.stats[plat.id] || { refaire: 0, bof: 0, martin: 0 };
  s += Math.min(st.refaire, 3) * 1.5 - Math.min(st.bof, 3) * 2;
  if (creneau.martin) {
    s += Math.min(st.martin, 3);
    if (plat.martin === 'aime') s += 2;
    if (plat.martin === 'naimePas') s -= 4;
  }
  if (e.includes(ETIQ.VTT)) s += (plat.consistant ? 3 : 0) - (plat.leger ? 2 : 0);
  // Viande : seulement quand les grands-parents sont là
  if (plat.proteine === 'viande' && ctx.reglages?.viandeAvecGrandsParentsSeulement !== false) {
    s += e.includes(ETIQ.GP) ? 2 : -8;
  }
  // Équilibre : varier la source de protéines d'un repas à l'autre
  if (plat.proteine && (ctx.proteinesRecentes || []).includes(plat.proteine)) s -= 1.5;
  if (e.includes(ETIQ.CUISINE)) s += (plat.double ? 4 : 0) + (tempsTotal(plat) >= 45 ? 1 : 0);
  if (e.includes(ETIQ.PLUSIEURS)) s += 1;
  if (e.includes(ETIQ.EXPRESS) && tempsTotal(plat) <= 15) s += 1;
  if (creneau.repas === 'soir' && creneau.moments?.some((m) => m.heure >= '22:00') && plat.leger) s += 0.5;
  // Variété : pénalité douce si servi il y a moins de 3 semaines
  const derniere = ctx.dernieresDates(plat.id, creneau.date);
  if (derniere != null && derniere < 21) s -= 1.5;
  s += hasard(`${ctx.graine}|${creneau.id}|${plat.id}`) * 1.5;
  return Math.round(s * 100) / 100;
}

/**
 * Propose les repas d'une période.
 * @param {Array} creneaux   créneaux (voir analyserJour), dans l'ordre chronologique
 * @param {Object} plats     { id: plat }
 * @param {Object} menus     { idCreneau: menu } — historique + menus déjà en place
 * @param {Object} reglages
 * @param {Object} options   { graine, effacer: bool (réinitialiser les créneaux non verrouillés) }
 * @returns {Object} nouveaux menus { idCreneau: { platId, reste, verrouille, refus, auto } }
 */
export function proposer(creneaux, plats, menus, reglages, options = {}) {
  const graine = options.graine || 'famille';
  const liste = Object.values(plats).filter((p) => p && !p.deleted);
  const ids = new Set(creneaux.map((c) => c.id));
  const parId = Object.fromEntries(creneaux.map((c) => [c.id, c]));
  const resultat = {};
  const estNote = (m) => m && (m.note || m.martinAime);

  // 1. Ce qu'on garde : verrouillés, notés, « pas de repas » (+ en mode remplir, tout ce qui existe)
  for (const c of creneaux) {
    const m = menus[c.id];
    if (!m || m.deleted || (!m.platId && !m.aucun)) continue;
    if (options.effacer && !m.verrouille && !estNote(m) && !m.aucun) continue;
    resultat[c.id] = { ...m };
  }
  // un reste dont la source n'est plus là disparaît
  for (const [id, m] of Object.entries(resultat)) {
    if (m.reste && ids.has(m.reste) && resultat[m.reste]?.platId !== m.platId && !m.verrouille) delete resultat[id];
  }

  // Dates de service par plat (historique hors période + période en cours), hors restes
  const servis = () => {
    const parPlat = {};
    const tout = { ...menus };
    for (const id of ids) delete tout[id];
    Object.assign(tout, resultat);
    for (const [id, m] of Object.entries(tout)) {
      if (!m || m.deleted || !m.platId || m.reste) continue;
      (parPlat[m.platId] ||= []).push(id.slice(0, 10));
    }
    return parPlat;
  };
  const stats = statsNotes(menus);

  const placerRestes = (source, plat) => {
    if (!plat.double) return;
    const idx = creneaux.indexOf(source);
    const candidats = creneaux.slice(idx + 1)
      .filter((c) => !c.vide && !resultat[c.id] && ecartJours(source.date, c.date) <= reglages.restesFenetreJours)
      .filter((c) => plat.rechauffe || !(c.etiquettes.includes(ETIQ.AVANCE) || c.etiquettes.includes(ETIQ.PLUSIEURS)))
      .map((c, i) => {
        const e = c.etiquettes;
        const besoin = e.includes(ETIQ.PLUSIEURS) || e.includes(ETIQ.AVANCE) || e.includes(ETIQ.EXPRESS);
        return { c, rang: besoin ? 2 : e.includes(ETIQ.CUISINE) ? 0 : 1, i };
      })
      .sort((a, b) => b.rang - a.rang || a.i - b.i);
    let n = 0;
    for (const { c, rang } of candidats) {
      if (n >= reglages.restesMax) break;
      if (rang === 0 && n > 0) break; // un jour de cuisine ne reçoit des restes qu'à défaut d'autre chose
      resultat[c.id] = { platId: plat.id, reste: source.id, verrouille: false, auto: true };
      n++;
    }
  };

  // 2. Les restes des plats déjà en place (verrouillés) sont replacés en premier
  for (const c of creneaux) {
    const m = resultat[c.id];
    if (m?.platId && !m.reste && plats[m.platId] && !creneaux.some((x) => resultat[x.id]?.reste === c.id)) {
      if (c.etiquettes.includes(ETIQ.CUISINE)) placerRestes(c, plats[m.platId]);
    }
  }

  // 3. Remplissage chronologique
  for (const c of creneaux) {
    if (c.vide || resultat[c.id]) continue;
    const parPlat = servis();
    const dernieresDates = (platId, date) => {
      const ds = (parPlat[platId] || []).map((d) => Math.abs(ecartJours(d, date)));
      return ds.length ? Math.min(...ds) : null;
    };
    // protéines des deux derniers repas déjà prévus avant ce créneau
    const proteinesRecentes = creneaux.slice(0, creneaux.indexOf(c)).reverse()
      .map((x) => plats[resultat[x.id]?.platId]?.proteine).filter(Boolean).slice(0, 2);
    const ctx = { stats, graine, dernieresDates, reglages, proteinesRecentes };
    const refus = new Set(menus[c.id]?.refus || []);
    const pasRecent = (p) => {
      const d = dernieresDates(p.id, c.date);
      return d == null || d >= reglages.antiRepetitionJours;
    };
    const essais = [
      (p) => !refus.has(p.id) && compatible(p, c) && pasRecent(p),
      (p) => !refus.has(p.id) && compatible(p, c),
      (p) => !refus.has(p.id) && pasRecent(p),
      (p) => !refus.has(p.id),
    ];
    let choix = null;
    for (const filtre of essais) {
      const cands = liste.filter(filtre);
      if (!cands.length) continue;
      choix = cands
        .map((p) => ({ p, s: scorer(p, c, ctx) }))
        .sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id))[0].p;
      break;
    }
    if (!choix) continue;
    resultat[c.id] = { platId: choix.id, reste: null, verrouille: false, auto: true, refus: menus[c.id]?.refus || [] };
    if (c.etiquettes.includes(ETIQ.CUISINE)) placerRestes(c, choix);
  }

  // Les créneaux sortis de la proposition sont renvoyés à null (à effacer)
  for (const c of creneaux) if (!resultat[c.id] && menus[c.id]?.platId) resultat[c.id] = null;
  return resultat;
}

// Créneaux qui mangent les restes d'un créneau source.
export function restesDe(sourceId, menus) {
  return Object.entries(menus || {})
    .filter(([, m]) => m && !m.deleted && m.reste === sourceId)
    .map(([id]) => id);
}
