import { VACANCES_ZONE_A } from './vacances.js';

export const PERSONNES = ['moi', 'julie'];
export const CODES_POSTES = ['M', 'S', 'M2', 'F', 'R', 'CA'];

export const ETIQ = {
  EXPRESS: 'Express 15 min',
  AVANCE: 'Prêt à l’avance',
  PLUSIEURS: 'En plusieurs temps',
  CUISINE: 'Jour de cuisine',
  VTT: 'VTT',
  GP: 'Grands-parents',
};

// Toutes les règles de la famille. Chaque valeur est modifiable dans l'écran « Réglages ».
export const REGLAGES_DEFAUT = {
  noms: { moi: 'Moi', julie: 'Julie', martin: 'Martin' },
  postes: {
    M: { libelle: 'Matin', debut: '06:15', fin: '14:15', midi: 'travail', soir: 'maison' },
    S: { libelle: 'Soir', debut: '13:15', fin: '21:15', midi: 'maison', soir: 'travail' },
    M2: { libelle: 'Matin 2', debut: '08:30', fin: '16:30', midi: 'travail', soir: 'maison' },
    F: { libelle: 'Formation', debut: '09:00', fin: '17:00', midi: 'travail', soir: 'maison' },
    R: { libelle: 'Repos', debut: '', fin: '', midi: 'maison', soir: 'maison' },
    CA: { libelle: 'Congé', debut: '', fin: '', midi: 'maison', soir: 'maison' },
  },
  trajetMin: 15,
  heures: {
    dejeuner: '12:30',
    dejeunerAvantS: '12:00', // la personne en S part à 12h45
    diner: '19:30',
  },
  prep: {
    midiMaison: 45, // minutes de cuisine max pour un déjeuner à la maison
    midiAvantS: 30, // si seule la personne en S est là le matin
    soirMax: 45, // dîner d'un jour ordinaire
    jourCuisine: 120, // dîner d'un jour de cuisine
    seuilExpress: 20, // en dessous : « Express 15 min »
    seuilPretAvance: 10, // en dessous : « Prêt à l'avance »
  },
  regroupementMin: 15, // deux dîners à moins de 15 min d'écart = un seul moment
  regleMS: true, // avertir si tous les deux en M ou tous les deux en S (hors grands-parents)
  postesJourCuisine: ['R', 'CA', 'M'],
  joursEcole: [1, 2, 4, 5], // lundi, mardi, jeudi, vendredi
  portions: { adulte: 1, martin: 0.75, grandParent: 1, bonusVTT: 0.3 },
  antiRepetitionJours: 10,
  restesMax: 2,
  restesFenetreJours: 3,
  activites: [
    { id: 'danse', nom: 'Danse africaine', qui: 'julie', jours: [2], debut: '19:00', fin: '20:15', repas: 'soir', heureRepas: '20:30' },
    { id: 'volley-mardi', nom: 'Volley', qui: 'moi', jours: [2], debut: '20:30', fin: '22:30', repas: 'soir', heureRepas: '22:45' },
    { id: 'volley-jeudi', nom: 'Volley', qui: 'moi', jours: [4], debut: '20:00', fin: '22:00', repas: 'soir', heureRepas: '22:15' },
    { id: 'theatre', nom: 'Théâtre puis cité des arts', qui: 'martin', jours: [3], debut: '09:30', fin: '12:00', repas: 'midi', heureRepas: '12:15', prepMax: 15, horsVacances: true },
    { id: 'volley-martin', nom: 'Volley', qui: 'martin', jours: [6], debut: '10:00', fin: '11:30', horsVacances: true },
    { id: 'vtt', nom: 'VTT', qui: 'moi', jours: [2], debut: '08:30', fin: '12:00', mois: [4, 5, 6, 7, 8, 9, 10, 11], consistant: true },
  ],
  // Activité ajoutée quand la case « VTT » est cochée sur un jour
  vttManuel: { id: 'vtt-manuel', nom: 'VTT', qui: 'moi', debut: '08:30', fin: '12:00', consistant: true },
  vacances: VACANCES_ZONE_A,
};

// Fusion profonde « réglages enregistrés » + défauts (les tableaux enregistrés remplacent les défauts).
export function fusionnerReglages(enregistres) {
  const fusion = (def, val) => {
    if (val === undefined || val === null) return def;
    if (Array.isArray(def) || Array.isArray(val) || typeof def !== 'object' || typeof val !== 'object') return val;
    const out = { ...def };
    for (const k of Object.keys(val)) out[k] = fusion(def[k], val[k]);
    return out;
  };
  return fusion(structuredClone(REGLAGES_DEFAUT), enregistres || {});
}
