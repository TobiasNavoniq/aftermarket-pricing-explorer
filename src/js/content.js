/* ==========================================================================
   Content loader

   All editable subject-matter content lives in /content/*.json. Nothing in
   this file or in the views hard-codes a step, a challenge or a use case.

   The JSON is never fetched at runtime. tools/build.py reads the files and
   inlines them as window.__APP_CONTENT__, so the built page is one file that
   works from a file:// URL with no server and no network. Editing content
   therefore means: edit the JSON, rebuild, reopen.

   The exported bindings below are `let`, assigned once by loadContent(). ES
   module live bindings mean every importing module sees the filled-in value,
   so views can keep reading `STEPS` as if it were a plain constant.
   ========================================================================== */

export let TIERS = [];          // capability tiers, top to bottom of the matrix
export let LAYERS = {};         // logic layers D / S / O
export let CANVAS = [];         // the 5 pricing-canvas phases
export let OWNERS = {};         // HQ / Markets / both
export let STEPS = [];          // the 9 process steps, left to right
export let ROADMAP_PHASES = []; // Diagnose / Transform / Execute
export let PERSONAS = {};
export let TIER_LENS = {};
export let STEP_CONTENT = {};   // per-step explainer copy
export let USECASES = {};
export let TECHNOLOGY = {};
export let CHALLENGES = [];

/* Derived indexes, rebuilt by indexContent(). */
export let CHALLENGE_BY_ID = {};
export let CHALLENGES_BY_STEP = {};

export function loadContent() {
  const raw = window.__APP_CONTENT__;
  if (!raw) throw new Error('window.__APP_CONTENT__ is missing');
  applyContent(raw);
  return raw;
}

function applyContent(raw) {
  const t = raw.taxonomy;
  TIERS = t.tiers;
  LAYERS = t.layers;
  CANVAS = t.canvas;
  OWNERS = t.owners;
  STEPS = t.steps;
  ROADMAP_PHASES = t.roadmapPhases;
  PERSONAS = t.personas;
  TIER_LENS = t.tierLens;

  CHALLENGES = raw.challenges;
  STEP_CONTENT = raw.stepContent;
  USECASES = raw.useCases;
  TECHNOLOGY = raw.technology;

  indexContent();
  validateContent();
}

function indexContent() {
  CHALLENGE_BY_ID = {};
  CHALLENGES.forEach(c => { CHALLENGE_BY_ID[c.id] = c; });
  CHALLENGES_BY_STEP = {};
  STEPS.forEach(s => { CHALLENGES_BY_STEP[s.id] = CHALLENGES.filter(c => c.step === s.id); });
}

/* Non-fatal consistency check. Content is hand-edited JSON, so a typo in a
   step id or layer code is the most likely way to break the tool. Warn loudly
   in the console rather than failing silently with an empty column. */
function validateContent() {
  const stepIds = new Set(STEPS.map(s => s.id));
  const tierIds = new Set(TIERS.map(t => t.id));
  const problems = [];

  STEPS.forEach(s => {
    if (!CANVAS.some(c => c.id === s.canvas)) problems.push(`step ${s.id}: unknown canvas "${s.canvas}"`);
    if (!OWNERS[s.owner]) problems.push(`step ${s.id}: unknown owner "${s.owner}"`);
    if (!STEP_CONTENT[s.id]) problems.push(`step ${s.id}: no entry in step-content.json`);
    (s.ucs || []).forEach(u => { if (!USECASES[u]) problems.push(`step ${s.id}: unknown use case "${u}"`); });
  });
  Object.entries(STEP_CONTENT).forEach(([id, c]) => {
    (c.personas || []).forEach(p => { if (!PERSONAS[p]) problems.push(`step-content ${id}: unknown persona "${p}"`); });
  });
  CHALLENGES.forEach(c => {
    if (!stepIds.has(c.step)) problems.push(`challenge ${c.id}: unknown step "${c.step}"`);
    if (!LAYERS[c.layer]) problems.push(`challenge ${c.id}: unknown layer "${c.layer}"`);
    (c.tiers || []).forEach(t => { if (!tierIds.has(t)) problems.push(`challenge ${c.id}: unknown tier "${t}"`); });
  });
  const seen = new Set();
  CHALLENGES.forEach(c => { if (seen.has(c.id)) problems.push(`challenge ${c.id}: duplicate id`); seen.add(c.id); });

  if (problems.length) console.warn('[content] %d problem(s) found:\n- %s', problems.length, problems.join('\n- '));
  return problems;
}

/* ---- Lookups used across the views ---- */
export const stepById = id => STEPS.find(s => s.id === id);
export const tierById = id => TIERS.find(t => t.id === id);
export const canvasOfStep = id => CANVAS.find(c => c.id === stepById(id).canvas);
export const layerColor = l => LAYERS[l].color;

/* Steps grouped under their canvas phase, in step order. Drives the spanning
   canvas band above the matrix and the heat map. */
export function canvasGroups() {
  return CANVAS
    .map(cv => ({ cv, steps: STEPS.filter(s => s.canvas === cv.id) }))
    .filter(g => g.steps.length);
}

/* Challenges tagged to a given matrix cell (step x tier). */
export function cellChallenges(stepId, tierId) {
  return CHALLENGES_BY_STEP[stepId].filter(c => c.tiers.includes(tierId));
}
