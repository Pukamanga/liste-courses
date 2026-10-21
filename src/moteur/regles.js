// Moteur de règles : à partir des postes d'un jour, déduit qui mange où, à quelle heure,
// combien de temps on a pour cuisiner et quelles étiquettes portent les créneaux.
import { jourSemaine, moisDe, enMinutes, enHeure } from './dates.js';
import { jourEcole, periodeVacances, ferie } from './vacances.js';
import { PERSONNES, ETIQ } from './reglages.js';

export const REPAS = ['midi', 'soir'];
const MATIN_FIN = enMinutes('12:00');

export function idCreneau(date, repas) {
  return `${date}-${repas}`;
}

export function grandsParentsLe(date, periodes = []) {
  const p = periodes.find((g) => !g.deleted && g.debut && g.fin && date >= g.debut && date <= g.fin);
  return p ? Math.max(0, Number(p.nb ?? 2)) : 0;
}

function chevauche(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

// Activités du jour, chacune marquée `ignoree` (avec la raison) le cas échéant.
export function activitesDuJour(date, jour, reglages) {
  const js = jourSemaine(date);
  const mois = moisDe(date);
  const vacances = !!periodeVacances(date, reglages.vacances) || !!ferie(date);
  const liste = (reglages.activites || [])
    .filter((a) => (a.jours || []).includes(js))
    .filter((a) => !a.mois || a.mois.includes(mois))
    .map((a) => ({ ...a }));
  if (jour?.vtt && !liste.some((a) => a.qui === 'moi' && a.consistant)) {
    liste.push({ ...reglages.vttManuel });
  }
  for (const a of liste) {
    if (a.qui === 'martin') {
      if (a.horsVacances && vacances) { a.ignoree = true; a.raison = 'vacances'; }
      continue;
    }
    const code = jour?.[a.qui];
    const p = reglages.postes[code];
    if (p?.debut && p?.fin &&
        chevauche(enMinutes(a.debut), enMinutes(a.fin), enMinutes(p.debut), enMinutes(p.fin))) {
      a.ignoree = true;
      a.raison = `en poste (${code})`;
    }
  }
  return liste;
}

function arriveeMaison(code, reglages) {
  const p = reglages.postes[code];
  if (!p?.fin) return 0; // repos / congé : à la maison toute la journée
  return enMinutes(p.fin) + reglages.trajetMin;
}

// Minutes utilisables par un adulte pour cuisiner entre `depuis` et `jusqua`,
// en retirant le temps passé à une activité (trajet compris).
function fenetreCuisine(depuis, jusqua, activites, trajet) {
  let segments = [[depuis, jusqua]];
  for (const a of activites) {
    const d = enMinutes(a.debut) - trajet;
    const f = enMinutes(a.fin) + trajet;
    segments = segments.flatMap(([s, e]) => {
      if (!chevauche(s, e, d, f)) return [[s, e]];
      return [[s, Math.min(e, d)], [Math.max(s, f), e]].filter(([x, y]) => y > x);
    });
  }
  // On ne peut cuisiner que dans le dernier segment avant le repas (ce qui est fait avant
  // une activité relève du « prêt à l'avance »).
  const dernier = segments.filter(([, e]) => e === jusqua).pop();
  return dernier ? dernier[1] - dernier[0] : 0;
}

function grouperMoments(entrees, ecart) {
  const tri = [...entrees].sort((a, b) => a.min - b.min);
  const moments = [];
  for (const e of tri) {
    const dernier = moments[moments.length - 1];
    if (dernier && e.min - dernier.min <= ecart) dernier.qui.push(e.qui);
    else moments.push({ min: e.min, qui: [e.qui] });
  }
  return moments.map((m) => ({ heure: enHeure(m.min), qui: m.qui }));
}

function portions(qui, reglages, vtt) {
  const p = reglages.portions;
  return qui.reduce((s, q) => {
    if (q === 'martin') return s + p.martin;
    if (q === 'gp') return s;
    return s + p.adulte + (q === 'moi' && vtt ? p.bonusVTT : 0);
  }, 0);
}

/**
 * Analyse un jour.
 * @param {string} date  AAAA-MM-JJ
 * @param {{moi?:string, julie?:string, vtt?:boolean, martinAbsent?:{midi?:boolean, soir?:boolean}}} jour
 * @param {object} reglages  réglages fusionnés (voir REGLAGES_DEFAUT)
 * @param {Array<{debut:string, fin:string, nb:number}>} periodesGP
 */
export function analyserJour(date, jour = {}, reglages, periodesGP = []) {
  const avertissements = [];
  const postes = {};
  for (const p of PERSONNES) {
    const code = jour[p];
    if (code && reglages.postes[code]) postes[p] = code;
    else {
      postes[p] = 'R';
      avertissements.push(`Poste de ${reglages.noms[p]} non saisi (considéré en repos)`);
    }
  }
  const incomplet = avertissements.length > 0;
  const gp = grandsParentsLe(date, periodesGP);
  const ecole = jourEcole(date, reglages.vacances, reglages.joursEcole);
  const vacances = periodeVacances(date, reglages.vacances);
  const nomFerie = ferie(date);

  if (reglages.regleMS && !incomplet && postes.moi === postes.julie && ['M', 'S'].includes(postes.moi)) {
    if (!gp) avertissements.push(`Tous les deux en ${postes.moi} : qui s'occupe de ${reglages.noms.martin} ?`);
  }

  const activites = activitesDuJour(date, jour, reglages);
  const actives = activites.filter((a) => !a.ignoree);
  const vtt = actives.some((a) => a.qui === 'moi' && a.consistant);
  const cuisiniers = PERSONNES.filter((p) => reglages.postesJourCuisine.includes(postes[p]));
  const jourCuisine = cuisiniers.length > 0;
  const trajet = reglages.trajetMin;
  const actDe = (qui) => actives.filter((a) => a.qui === qui);
  const absent = jour.martinAbsent || {};

  // ---------- Midi ----------
  const midi = (() => {
    const qui = PERSONNES.filter((p) => reglages.postes[postes[p]].midi === 'maison');
    const martinMaison = !ecole && !absent.midi;
    if (martinMaison) qui.push('martin');
    if (gp) qui.push('gp');
    const actMidi = actives.find((a) => a.repas === 'midi' && qui.includes(a.qui));
    const enS = qui.filter((p) => postes[p] === 'S');
    const heure = actMidi?.heureRepas || (enS.length ? reglages.heures.dejeunerAvantS : reglages.heures.dejeuner);
    const h = enMinutes(heure);
    const warn = [];

    // Temps de cuisine : meilleur cuisinier disponible le matin
    const options = [];
    if (gp) options.push(reglages.prep.midiMaison);
    for (const p of qui.filter((q) => PERSONNES.includes(q))) {
      const plafond = postes[p] === 'S' ? reglages.prep.midiAvantS : reglages.prep.midiMaison;
      options.push(Math.min(plafond, fenetreCuisine(0, h, actDe(p), trajet)));
    }
    let prepDispo = options.length ? Math.max(...options) : 0;
    if (actMidi?.prepMax != null) prepDispo = Math.min(prepDispo, actMidi.prepMax);
    if (martinMaison && !gp && !qui.some((q) => PERSONNES.includes(q))) {
      warn.push(`${reglages.noms.martin} à la maison à midi sans adulte`);
    }
    return { qui, heure, prepDispo, warn };
  })();

  // ---------- Soir ----------
  const soir = (() => {
    const entrees = [];
    const hDiner = enMinutes(reglages.heures.diner);
    for (const p of PERSONNES) {
      if (reglages.postes[postes[p]].soir !== 'maison') continue;
      const act = actDe(p).find((a) => a.repas === 'soir');
      entrees.push({ qui: p, min: act ? enMinutes(act.heureRepas) : hDiner });
    }
    if (!absent.soir) entrees.push({ qui: 'martin', min: hDiner });
    if (gp) entrees.push({ qui: 'gp', min: hDiner });
    const moments = grouperMoments(entrees, reglages.regroupementMin);
    const qui = entrees.map((e) => e.qui);
    const warn = [];
    let prepDispo = 0;
    if (moments.length) {
      const h = enMinutes(moments[0].heure);
      const plafond = jourCuisine ? reglages.prep.jourCuisine : reglages.prep.soirMax;
      const options = [];
      if (gp) options.push(plafond);
      for (const p of PERSONNES) {
        if (!qui.includes(p)) continue;
        const depuis = arriveeMaison(postes[p], reglages);
        options.push(Math.min(plafond, fenetreCuisine(Math.min(depuis, h), h, actDe(p), trajet)));
      }
      prepDispo = options.length ? Math.max(...options) : 0;
      // Quelqu'un est-il là pour Martin à son heure de dîner ?
      if (qui.includes('martin') && !gp) {
        const present = PERSONNES.some((p) => qui.includes(p) &&
          arriveeMaison(postes[p], reglages) <= hDiner &&
          !actDe(p).some((a) => chevauche(enMinutes(a.debut) - trajet, enMinutes(a.fin) + trajet, hDiner, hDiner + 30)));
        if (!present) warn.push(`Aucun adulte avec ${reglages.noms.martin} au dîner de ${reglages.heures.diner}`);
      }
    }
    return { qui, moments, prepDispo, warn };
  })();

  const creer = (repas, d) => {
    const moments = repas === 'midi'
      ? (d.qui.length ? [{ heure: d.heure, qui: d.qui }] : [])
      : d.moments;
    const vide = moments.length === 0;
    const etiquettes = [];
    if (!vide) {
      if (repas === 'soir' && jourCuisine) etiquettes.push(ETIQ.CUISINE);
      if (d.prepDispo < reglages.prep.seuilPretAvance) etiquettes.push(ETIQ.AVANCE);
      else if (d.prepDispo <= reglages.prep.seuilExpress) etiquettes.push(ETIQ.EXPRESS);
      if (moments.length > 1) etiquettes.push(ETIQ.PLUSIEURS);
      if (vtt && d.qui.includes('moi')) etiquettes.push(ETIQ.VTT);
      if (gp) etiquettes.push(ETIQ.GP);
    }
    return {
      id: idCreneau(date, repas),
      date,
      repas,
      moments,
      personnes: d.qui.filter((q) => q !== 'gp').length + (d.qui.includes('gp') ? gp : 0),
      convives: portions(d.qui, reglages, vtt) + (d.qui.includes('gp') ? gp * reglages.portions.grandParent : 0),
      martin: d.qui.includes('martin'),
      prepDispo: vide ? 0 : d.prepDispo,
      etiquettes,
      avertissements: d.warn,
      vide,
    };
  };

  return {
    date,
    postes,
    incomplet,
    ecole,
    vacances: vacances?.nom || null,
    ferie: nomFerie,
    gp,
    activites,
    vtt,
    jourCuisine,
    cuisiniers,
    avertissements,
    creneaux: { midi: creer('midi', midi), soir: creer('soir', soir) },
  };
}

// Avertissement de saisie pour la règle M/S (utilisé par la grille et l'import).
export function avertissementSaisie(date, jour, reglages, periodesGP) {
  if (!reglages.regleMS || !jour?.moi || !jour?.julie) return null;
  if (jour.moi !== jour.julie || !['M', 'S'].includes(jour.moi)) return null;
  if (grandsParentsLe(date, periodesGP)) return null;
  return `Tous les deux en ${jour.moi}`;
}
