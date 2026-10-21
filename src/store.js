// Stockage local-first : chaque donnée est un « document » {coll, id, data, updated_at, deleted}.
// Les documents sont gardés dans localStorage ; la synchronisation (sync.js) pousse les
// modifications locales et applique les modifications distantes (la plus récente gagne).
import { useEffect, useState } from 'preact/hooks';

export const COLLECTIONS = ['jours', 'gp', 'plats', 'menus', 'courses', 'reglages'];
const CLE = 'repas:docs:v1';
const CLE_ATTENTE = 'repas:attente:v1';

function lire(cle, defaut) {
  try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; }
}

let docs = lire(CLE, {}); // { coll: { id: {data, updated_at, deleted} } }
let attente = lire(CLE_ATTENTE, {}); // { 'coll/id': true } modifications pas encore envoyées
for (const c of COLLECTIONS) docs[c] ||= {};

let version = 0;
const abonnes = new Set();
const ecouteursLocaux = new Set();
let cache = {};

function sauver() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLE, JSON.stringify(docs));
    localStorage.setItem(CLE_ATTENTE, JSON.stringify(attente));
  } catch (e) {
    console.error('Sauvegarde locale impossible', e);
  }
}

function notifier() {
  version++;
  cache = {};
  sauver();
  for (const f of abonnes) f(version);
}

// { id: data } sans les documents supprimés (mémorisé jusqu'au prochain changement)
export function donnees(coll) {
  if (!cache[coll]) {
    const out = {};
    for (const [id, d] of Object.entries(docs[coll] || {})) if (!d.deleted) out[id] = d.data;
    cache[coll] = out;
  }
  return cache[coll];
}

export function doc(coll, id) {
  const d = docs[coll]?.[id];
  return d && !d.deleted ? d.data : undefined;
}

function ecrire(coll, id, data, deleted = false) {
  const d = { data, updated_at: Date.now(), deleted };
  docs[coll][id] = d;
  attente[`${coll}/${id}`] = true;
  notifier();
  for (const f of ecouteursLocaux) f({ coll, id, ...d });
}

export function mettre(coll, id, data) { ecrire(coll, id, data); }

export function modifier(coll, id, partiel) {
  ecrire(coll, id, { ...(doc(coll, id) || {}), ...partiel });
}

export function supprimer(coll, id) {
  if (docs[coll][id]) ecrire(coll, id, docs[coll][id].data || {}, true);
}

// Plusieurs écritures, une seule notification
export function lot(ops) {
  const now = Date.now();
  const ecrits = [];
  for (const { coll, id, data, deleted = false } of ops) {
    const d = { data: data ?? docs[coll][id]?.data ?? {}, updated_at: now, deleted };
    docs[coll][id] = d;
    attente[`${coll}/${id}`] = true;
    ecrits.push({ coll, id, ...d });
  }
  notifier();
  for (const e of ecrits) for (const f of ecouteursLocaux) f(e);
}

// Documents fournis par le code (plats de départ) : date 0, jamais envoyés tant qu'ils ne sont pas modifiés.
// Quand `version` change, les documents de départ jamais modifiés (date 0) sont remplacés par la
// nouvelle liste ; ceux que vous avez modifiés ou supprimés sont conservés tels quels.
export function semer(coll, objets, version = 1) {
  const cleVersion = `repas:semis:${coll}`;
  let ancienne = 0;
  try { ancienne = Number(localStorage.getItem(cleVersion)) || 0; } catch { /* hors navigateur */ }
  let change = false;
  if (ancienne !== version) {
    const ids = new Set(objets.map((o) => o.id));
    for (const [id, d] of Object.entries(docs[coll])) {
      if (d.updated_at === 0 && !ids.has(id)) { delete docs[coll][id]; change = true; }
    }
  }
  for (const o of objets) {
    const d = docs[coll][o.id];
    if (!d || (ancienne !== version && d.updated_at === 0)) {
      docs[coll][o.id] = { data: o, updated_at: 0, deleted: false };
      change = true;
    }
  }
  try { localStorage.setItem(cleVersion, String(version)); } catch { /* hors navigateur */ }
  if (change) notifier();
}

// --- API pour la synchronisation ---
export function appliquerDistants(lignes) {
  let change = false;
  for (const l of lignes) {
    if (!COLLECTIONS.includes(l.coll)) continue;
    const local = docs[l.coll][l.id];
    if (local && local.updated_at >= Number(l.updated_at)) continue;
    docs[l.coll][l.id] = { data: l.data, updated_at: Number(l.updated_at), deleted: !!l.deleted };
    delete attente[`${l.coll}/${l.id}`];
    change = true;
  }
  if (change) notifier();
}

export function enAttente() {
  return Object.keys(attente).map((k) => {
    const [coll, ...reste] = k.split('/');
    const id = reste.join('/');
    return { coll, id, ...docs[coll]?.[id] };
  }).filter((d) => d.updated_at !== undefined);
}

export function marquerEnvoyes(liste) {
  for (const d of liste) {
    if (docs[d.coll]?.[d.id]?.updated_at === d.updated_at) delete attente[`${d.coll}/${d.id}`];
  }
  sauver();
}

export function surEcritureLocale(f) { ecouteursLocaux.add(f); return () => ecouteursLocaux.delete(f); }

export function exporterTout() { return JSON.parse(JSON.stringify(docs)); }

// Hook Preact : re-rend le composant à chaque changement
export function useStore() {
  const [, setV] = useState(version);
  useEffect(() => {
    abonnes.add(setV);
    return () => abonnes.delete(setV);
  }, []);
  return version;
}
