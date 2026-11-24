// Calcul des événements Google Agenda à partir du planning de l'application.
// Module pur (sans Deno ni réseau) : utilisé par la fonction Supabase et par les tests.

// Recopie des réglages par défaut de l'application (src/moteur/reglages.js), limitée à ce
// qui sert ici. Un test vérifie qu'ils restent identiques.
export const DEFAUTS = {
  noms: { moi: 'Julien', julie: 'Julie' },
  postes: {
    M: { libelle: 'Matin', debut: '06:15', fin: '14:15' },
    S: { libelle: 'Soir', debut: '13:15', fin: '21:15' },
    M2: { libelle: 'Matin 2', debut: '08:30', fin: '16:30' },
    F: { libelle: 'Formation', debut: '09:00', fin: '17:00' },
    R: { libelle: 'Repos', debut: '', fin: '' },
    CA: { libelle: 'Congé', debut: '', fin: '' },
  },
};

// Une lettre par personne dans l'identifiant de l'événement (base32hex : 0-9 et a-v)
export const PERSONNES = { moi: 'a', julie: 'b' };
export const FUSEAU = 'Europe/Paris';
export const NOM_AGENDA = 'Planning travail';

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Réglages enregistrés (doc reglages/regles) fusionnés avec les défauts, comme dans l'app
export function regles(enregistres) {
  const e = enregistres && typeof enregistres === 'object' ? enregistres : {};
  const postesE = e.postes && typeof e.postes === 'object' ? e.postes : {};
  const postes = {};
  for (const code of new Set([...Object.keys(DEFAUTS.postes), ...Object.keys(postesE)])) {
    postes[code] = { ...(DEFAUTS.postes[code] || {}), ...(postesE[code] || {}) };
  }
  return { noms: { ...DEFAUTS.noms, ...(e.noms || {}) }, postes };
}

export function idEvenement(date, qui) {
  return `pt${date.replaceAll('-', '')}${PERSONNES[qui]}`;
}

function lendemain(date) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Événements voulus pour un jour : un par personne en poste avec des horaires
// (Repos, Congé ou poste sans horaire : rien).
export function evenementsDuJour(date, jour, R) {
  if (!DATE.test(date)) return [];
  const out = [];
  for (const qui of Object.keys(PERSONNES)) {
    const code = jour?.[qui];
    const p = code ? R.postes[code] : null;
    if (!p || !HEURE.test(p.debut || '') || !HEURE.test(p.fin || '')) continue;
    const finLe = p.fin <= p.debut ? lendemain(date) : date; // poste de nuit
    const corps = {
      summary: `${R.noms[qui] || qui} · ${p.libelle || code}`,
      description: `Poste ${code}. Mis à jour automatiquement par l’application : pour le changer, modifiez le planning dans l’application.`,
      start: { dateTime: `${date}T${p.debut}:00`, timeZone: FUSEAU },
      end: { dateTime: `${finLe}T${p.fin}:00`, timeZone: FUSEAU },
      reminders: { useDefault: false },
      status: 'confirmed',
    };
    out.push({ id: idEvenement(date, qui), date, corps, empreinte: JSON.stringify(corps) });
  }
  return out;
}

// Ce qu'il faut envoyer à Google pour passer de l'état déjà envoyé aux événements voulus.
// voulus : [{id, date, corps, empreinte}] ; envoyes : Map id → empreinte (mêmes dates)
export function planifier(voulus, envoyes) {
  const actions = [];
  const ids = new Set();
  for (const ev of voulus) {
    ids.add(ev.id);
    if (envoyes.get(ev.id) !== ev.empreinte) actions.push({ op: 'ecrire', existe: envoyes.has(ev.id), ...ev });
  }
  for (const id of envoyes.keys()) if (!ids.has(id)) actions.push({ op: 'effacer', id });
  return actions;
}

// Date du jour à Paris, décalée de n jours
export function dateParis(maintenant = new Date(), n = 0) {
  const j = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(maintenant);
  const d = new Date(`${j}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
