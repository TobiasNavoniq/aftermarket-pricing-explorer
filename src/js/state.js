/* ==========================================================================
   Session state & persistence

   State is deliberately tiny: the engagement name plus the set of marked
   challenge ids. Everything on screen is derived from it, so a session file
   stays a few kilobytes and survives content edits.

   Persistence is best-effort. localStorage is the primary store when the file
   is opened normally; some contexts (private browsing, certain file:// setups,
   email-attachment sandboxes) block it, so we detect that up front and fall
   back to in-memory. window.storage is a secondary store, only used when the
   file happens to run inside a host that provides one.

   Views never mutate state directly: they call a mutator here, which persists
   and then notifies subscribers, so every view re-renders from one source.
   ========================================================================== */

import { STORAGE_KEY, SESSION_FORMAT, APP } from './config.js';
import { CHALLENGE_BY_ID, CHALLENGES_BY_STEP, STEPS, CANVAS, ROADMAP_PHASES, cellChallenges } from './content.js';

export const state = {
  client: '',       // engagement / OEM name
  selected: {}      // { [challengeId]: true }
};

/* ---- change notification ---- */
const listeners = [];
export function onChange(fn) { listeners.push(fn); }
function emit() { listeners.forEach(fn => fn()); }

/* ---- storage availability ---- */
export let LS_OK = false;
(function probeLocalStorage() {
  try {
    const k = '__ape_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    LS_OK = true;
  } catch (e) {
    LS_OK = false;
  }
})();

const hasHostStore = () =>
  typeof window !== 'undefined' && window.storage && typeof window.storage.set === 'function';

export async function save() {
  const payload = JSON.stringify({ selected: state.selected, client: state.client });
  if (LS_OK) { try { localStorage.setItem(STORAGE_KEY, payload); } catch (e) { /* quota or blocked */ } }
  if (hasHostStore()) { try { await window.storage.set(STORAGE_KEY, payload, false); } catch (e) { /* host store unavailable */ } }
}

export async function loadSession() {
  if (hasHostStore()) {
    try {
      const r = await window.storage.get(STORAGE_KEY, false);
      if (r && r.value) { applySnapshot(JSON.parse(r.value)); return; }
    } catch (e) { /* fall through to localStorage */ }
  }
  if (LS_OK) {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) applySnapshot(JSON.parse(v));
    } catch (e) { /* corrupt payload: start clean rather than break */ }
  }
}

async function clearStore() {
  if (LS_OK) { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ } }
  if (hasHostStore() && window.storage.delete) {
    try { await window.storage.delete(STORAGE_KEY, false); } catch (e) { /* ignore */ }
  }
}

/* Read a saved payload (auto-save or imported file) into state.
   Add migrations here if SESSION_FORMAT ever changes. */
export function applySnapshot(d) {
  if (!d) return;
  state.selected = d.selected || {};
  state.client = d.client || '';
}

export function snapshot() {
  return {
    v: SESSION_FORMAT,
    version: APP.version,
    savedAt: new Date().toISOString(),
    client: state.client,
    selected: state.selected
  };
}

/* ---- mutators: the only supported way to change state ---- */

export function setClient(name) {
  state.client = name;
  save();
  emit();
}

export function toggleChallenge(id) {
  if (state.selected[id]) delete state.selected[id];
  else state.selected[id] = true;
  save();
  emit();
}

export function clearSelections() {
  state.selected = {};
  save();
  emit();
}

export async function resetEngagement() {
  state.selected = {};
  state.client = '';
  await clearStore();
  emit();
}

export function replaceSession(d) {
  applySnapshot(d);
  save();
  emit();
}

/* ---- derived counts, used by every view ---- */
export const isOn = id => !!state.selected[id];
export const countAll = () => Object.keys(state.selected).length;
export const stepCount = sid => CHALLENGES_BY_STEP[sid].filter(c => isOn(c.id)).length;
export const cellCount = (sid, tid) => cellChallenges(sid, tid).filter(c => isOn(c.id)).length;
export const stepsInScope = () => STEPS.filter(s => stepCount(s.id) > 0).length;

/* Marked challenges bucketed by logic layer: D -> Diagnose, S -> Transform,
   O -> Execute. Shared by the roadmap view and the print report. */
export function countsByLayer() {
  const by = { D: 0, S: 0, O: 0 };
  Object.keys(state.selected).forEach(id => {
    const c = CHALLENGE_BY_ID[id];
    if (c) by[c.layer]++;
  });
  return by;
}

/* Marked challenges grouped by pricing-canvas phase, in step order.
   This is what the roadmap and the report are organised by: the phases are
   already a sequence (Strategy -> Setting -> Steering -> Execution ->
   Transactions), and they are the same five headings the matrix is banded by,
   so the roadmap reads as a continuation of the matrix rather than a second,
   competing taxonomy. */
export function phaseBuckets() {
  const buckets = {};
  CANVAS.forEach(cv => { buckets[cv.id] = []; });
  STEPS.forEach(s =>
    CHALLENGES_BY_STEP[s.id].forEach(c => {
      if (isOn(c.id)) buckets[s.canvas].push({ c, s });
    })
  );
  return buckets;
}

export const phaseCount = pid =>
  STEPS.filter(s => s.canvas === pid).reduce((a, s) => a + stepCount(s.id), 0);

export const phasesInScope = () => CANVAS.filter(cv => phaseCount(cv.id) > 0).length;

/* The delivery stage a challenge implies, from its logic layer: data work
   before steering, steering before operations. Shown per challenge rather than
   used as the top-level grouping. */
const STAGE_OF_LAYER = { D: 'diagnose', S: 'transform', O: 'execute' };
export const stageOfLayer = layer => ROADMAP_PHASES.find(p => p.id === STAGE_OF_LAYER[layer]);
