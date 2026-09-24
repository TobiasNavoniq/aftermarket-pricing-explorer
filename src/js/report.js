/* ==========================================================================
   Print report

   Builds a paginated report into #reportMount, adds body.printing (report.css
   hides everything else) and calls window.print(). The browser's "Save as PDF"
   destination is the deliverable; there is no PDF library and nothing leaves
   the machine.

   Layout follows the ThinkTrooper PDF house style: A4 landscape, opening on
   the concentration page as its intro, then one detail page per pricing phase
   in scope. (The executive-summary cover is parked; see summaryPage().) Every page carries an eyebrow, a headline sentence, a lead
   paragraph, numbered EXHIBIT blocks and a running footer. Every page also
   says something specific about this engagement -- that is the bar for adding
   one.

   Page numbering is the browser's, not ours: report.js injects an @page rule
   whose @bottom-left / @bottom-right margin boxes carry the running footer and
   "PAGE n OF N" via counter(page)/counter(pages). Blink honours those, so the
   numbers stay correct even when a section runs onto a second sheet. An
   earlier version counted pages in JS and was wrong the moment anything
   overflowed -- do not go back to that.

   Sections still force their own page breaks (.rpt-page), because one topic
   per sheet is the house style. Keep each one inside 186mm (A4 landscape less
   the 12mm margins) or it will spill; tools/pdfcheck.py measures this.

   Every string that can come from content JSON or from the facilitator is run
   through esc(): this HTML ends up in a document people hand on.

   The look follows the app, adapted for paper: exhibits are cards with a
   coloured top rule, the heat map uses the on-screen tile grid and ramp, and
   each phase page carries its canvas colour on --pc, as the roadmap columns
   do. report.css sets print-color-adjust:exact so Chrome keeps the fills; still
   remind the user to enable "Background graphics" for other browsers.
   ========================================================================== */

import { APP, LOGO_SRC } from './config.js';
import {
  TIERS, STEPS, CANVAS, OWNERS, LAYERS, STEP_CONTENT, CHALLENGES_BY_STEP,
  canvasOfStep, canvasGroups, layerColor
} from './content.js';
import {
  state, countAll, cellCount, stepCount, stepsInScope, countsByLayer,
  phaseBuckets, phaseCount, phasesInScope, stageOfLayer, isOn
} from './state.js';
import { esc, toast, $ } from './util.js';
import { technologyPrintHTML } from './views/technology.js';

export function exportPDF() {
  if (countAll() === 0) {
    toast('Mark some challenges first');
    return;
  }
  $('reportMount').innerHTML = buildReport();
  document.body.classList.add('printing');
  /* Let the browser lay the report out before opening the print dialog. */
  setTimeout(() => window.print(), 60);
}

export function initPrintTeardown() {
  window.addEventListener('afterprint', () => document.body.classList.remove('printing'));
}

/* ---------------------------------------------------------------- helpers */

function reportDate() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function engagementName() {
  return state.client || '(unnamed OEM / account)';
}

/* Exhibit numbers run continuously across the whole report, as in the house
   style. One counter, bumped by exhibit(). */
let exhibitNo = 0;
function exhibit(title, body, note) {
  exhibitNo += 1;
  return '<div class="rpt-ex">' +
    '<div class="rpt-ex-h"><span class="rpt-ex-n">EXHIBIT ' + exhibitNo + '</span>' + esc(title) + '</div>' +
    '<div class="rpt-ex-b">' + body + '</div>' +
    (note ? '<div class="rpt-ex-note">' + esc(note) + '</div>' : '') +
    '</div>';
}

/* `color` is the page's accent on --pc: a phase page takes its canvas colour,
   anything else falls back to teal in report.css. */
function page(inner, color) {
  return '<section class="rpt-page"' + (color ? ' style="--pc:' + color + '"' : '') + '>' + inner + '</section>';
}

/* Eyebrow, headline and lead are passed in already escaped. */
function pageHead(eyebrow, headline, lead) {
  return '<header class="rpt-head">' +
    '<div class="rpt-eyebrow rpt-sec-eyebrow">' + eyebrow + '</div>' +
    '<div class="rpt-headline">' + headline + '</div>' +
    '<p class="rpt-lead">' + lead + '</p></header>';
}

/* The running footer lives in the @page margin boxes, which is the only place
   the page counter is available. The engagement name changes per report, so
   the rule is generated here rather than sitting in report.css. */
function pageRule() {
  /* This string goes inside a CSS content:"..." literal, so a stray quote or
     backslash would break the whole rule. Strip both. */
  const running = [APP.tool, engagementName(), reportDate()]
    .join(' · ').toUpperCase().replace(/[\\"]/g, '');
  return '<style>@page{size:A4 landscape;margin:12mm;' +
    '@bottom-left{content:"' + running + '";font-family:Consolas,monospace;font-size:7pt;' +
    'letter-spacing:.09em;color:#7A8891}' +
    '@bottom-right{content:"PAGE " counter(page) " OF " counter(pages);' +
    'font-family:Consolas,monospace;font-size:7pt;font-weight:700;letter-spacing:.09em;color:#003B5C}' +
    '}</style>';
}

/* Parked with summaryPage(), its only caller. */
function statCol(label, value, note) {
  return '<div class="rpt-stat"><div class="rpt-stat-l">' + esc(label) + '</div>' +
    '<div class="rpt-stat-v">' + value + '</div>' +
    '<div class="rpt-stat-n">' + note + '</div></div>';
}

/* The tier carrying the most marked challenges, and how many. */
function heaviestTier() {
  let best = null;
  TIERS.forEach(t => {
    const n = STEPS.reduce((a, s) => a + cellCount(s.id, t.id), 0);
    if (!best || n > best.n) best = { tier: t, n };
  });
  return best;
}

function heaviestStep() {
  let best = null;
  STEPS.forEach(s => {
    const n = stepCount(s.id);
    if (!best || n > best.n) best = { step: s, n };
  });
  return best;
}

/* Parked with summaryPage(), its only caller. */
function heaviestPhase() {
  let best = null;
  CANVAS.forEach(cv => {
    const n = phaseCount(cv.id);
    if (!best || n > best.n) best = { phase: cv, n };
  });
  return best;
}

/* ------------------------------------------------------------ the report */

export function buildReport() {
  exhibitNo = 0;

  const total = countAll();
  if (total === 0) {
    return '<div class="rpt"><section class="rpt-page"><p class="rpt-empty">' +
      'No challenges have been marked yet. Mark applicable challenges in the matrix, ' +
      'then export the report.</p></section></div>';
  }

  const activePhases = CANVAS.filter(cv => phaseCount(cv.id) > 0);

  let h = pageRule() + '<div class="rpt">';
  /* summaryPage() and recommendationsPage() are parked, not called -- see
     their notes below. */
  h += page(concentrationPage(total));
  activePhases.forEach((cv, i) => {
    h += page(phasePage(cv, i + 1, activePhases.length, total), cv.color);
  });
  return h + '</div>';
}

/* The mix of logic layers behind a set of marked challenges, written out as
   prose and skipping the zeroes, so a phase with no operational work does not
   read "and 0 are operational processing". */
function layerProse(layers) {
  const label = { D: 'data and modelling', S: 'steering and governance', O: 'operational processing' };
  const parts = ['D', 'S', 'O'].filter(k => layers[k]).map(k => layers[k] + ' ' + label[k]);
  if (!parts.length) return 'nothing';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

const STAGE_NAME = { D: 'Diagnose', S: 'Transform', O: 'Execute' };

/* ---- PARKED: executive-summary cover ------------------------------------
   Not called by buildReport(). Review feedback was that the report should
   open on the concentration page as its intro, so this page -- the title band
   (logo masthead, INTERNAL eyebrow, engagement name, date), the executive
   summary headline and lead, the four stat columns and the phase-distribution
   exhibit -- is no longer built. Its helpers statCol(), heaviestPhase() and
   phaseTable() are parked with it, and its styles sit in the parked block at
   the end of report.css. To restore it, put h += page(summaryPage(total))
   back as the first page in buildReport(), and update the expected page count
   in tools/pdfcheck.py, the page checks in tests/checks.mjs and the page table
   in README.md.
   ---------------------------------------------------------------------- */

function summaryPage(total) {
  const topPhase = heaviestPhase();
  const topStep = heaviestStep();
  const topTier = heaviestTier();
  const byLayer = countsByLayer();
  const leadStage = ['D', 'S', 'O'].sort((a, b) => byLayer[b] - byLayer[a])[0];

  const headline = 'This RFP concentrates in ' + esc(topPhase.phase.name) +
    ', which carries ' + topPhase.n + ' of the ' + total + ' challenges marked.';

  const lead =
    total + ' challenges were marked across ' + stepsInScope() + ' of ' + STEPS.length +
    ' process steps and ' + phasesInScope() + ' of ' + CANVAS.length + ' pricing phases. ' +
    'The heaviest single step is ' + topStep.step.n + ' ' + esc(topStep.step.name) +
    ' with ' + topStep.n + '. By capability tier the weight sits at ' + esc(topTier.tier.name) +
    ' (' + topTier.n + '). The logic-layer mix is ' + layerProse(byLayer) +
    ', so the work leads with ' + STAGE_NAME[leadStage] + '. Nothing here is a commitment: ' +
    'it is a record of what this RFP or process asked for, read against the ' +
    STEPS.length + '-step aftermarket pricing canvas.';

  return '<div class="rpt-title-band">' +
      '<img class="rpt-masthead" src="' + LOGO_SRC + '" alt="' + esc(APP.name) + '">' +
      '<div class="rpt-eyebrow">' + esc(APP.name.toUpperCase()) + ' &middot; RFP &amp; PRICING PROCESS ANALYSIS &middot; INTERNAL</div>' +
      '<div class="rpt-h1">' + esc(engagementName()) + '</div>' +
      '<div class="rpt-sub">Aftermarket pricing process diagnostic &middot; ' + esc(reportDate()) + '</div>' +
    '</div>' +
    pageHead('Executive summary', headline, lead) +
    '<div class="rpt-stats">' +
      statCol('What was marked', total, 'Challenges across ' + stepsInScope() + ' of ' + STEPS.length + ' process steps.') +
      statCol('Where it concentrates', esc(topPhase.phase.name.replace('Price ', '')) + ' &middot; ' + topPhase.n,
        'Heaviest pricing phase. Heaviest step: ' + topStep.step.n + ' ' + esc(topStep.step.name) + '.') +
      statCol('How advanced', esc(topTier.tier.name.split(' ')[0]) + ' &middot; ' + topTier.n,
        'Capability tier carrying the most. ' + esc(topTier.tier.sub) + '.') +
      statCol('Delivery lead', esc(STAGE_NAME[leadStage]), esc(layerProse(byLayer)) + '.') +
    '</div>' +
    exhibit('Distribution across the five pricing phases', phaseTable(total),
      'Phases run in canvas order and match the band above the process matrix. A phase with ' +
      'nothing marked is not discussed further in this report.');
}

/* ---- page 1: where it concentrates, the report's intro ---- */

function concentrationPage(total) {
  const topStep = heaviestStep();
  const topTier = heaviestTier();
  const ranked = STEPS.map(s => ({ s, n: stepCount(s.id) }))
    .filter(r => r.n > 0)
    .sort((a, b) => b.n - a.n);

  const headline = 'Within the canvas, the weight lands on step ' + topStep.step.n + ' ' +
    esc(topStep.step.name) + ', at the ' + esc(topTier.tier.name) + ' tier.';

  const lead =
    'Read down the columns for where in the flow the requirements sit, and across the rows for ' +
    'how advanced the capability asked for is. Where a step or a tier carries little, that is as ' +
    'informative as where it carries much: it says this RFP is not asking for change there.';

  const rankRows = ranked.map((r, i) => {
    const cv = canvasOfStep(r.s.id);
    return '<tr><td class="rr-rank">' + (i + 1) + '</td>' +
      '<td class="rr-step"><b>' + r.s.n + '</b> ' + esc(r.s.name) + '</td>' +
      '<td><span class="rpt-tag" style="background:' + cv.color + '">' + esc(cv.name) + '</span></td>' +
      '<td class="rr-own">' + esc(OWNERS[r.s.owner].label) + '</td>' +
      '<td class="rr-n">' + r.n + '</td>' +
      '<td class="rr-bar"><span class="rpt-track"><span style="width:' + Math.round((r.n / ranked[0].n) * 100) +
        '%;background:' + cv.color + '"></span></span></td>' +
      '<td class="rr-share">' + Math.round((r.n / total) * 100) + '%</td></tr>';
  }).join('');

  return pageHead('Where the requirements concentrate', headline, lead) +
    exhibit('Requirement concentration by process step and capability tier', heatmapTable(total),
      'Cells count marked challenges. Shading is relative to the busiest cell, not an absolute scale.') +
    exhibit('Process steps in scope, ranked by weight',
      '<table class="rpt-rank"><thead><tr><th></th><th>Process step</th><th>Pricing phase</th>' +
      '<th>Owner</th><th>Marked</th><th></th><th>Share</th></tr></thead><tbody>' + rankRows + '</tbody></table>',
      'Steps with nothing marked are omitted. Bars are relative to the heaviest step.');
}

function heatmapTable(total) {
  let max = 0;
  const grid = {};
  TIERS.forEach(t => {
    grid[t.id] = {};
    STEPS.forEach(s => {
      const n = cellCount(s.id, t.id);
      grid[t.id][s.id] = n;
      if (n > max) max = n;
    });
  });

  /* Same geometry as the on-screen heat map (phase band, step cards, tier
     cards, tiles), plus the tier-total column the report has always carried. */
  let h = '<div class="rpt-hm" style="--steps:' + STEPS.length + '">';

  h += '<div class="rh-corner"></div>';
  canvasGroups().forEach(g => {
    h += '<div class="rh-phase" style="grid-column:span ' + g.steps.length + ';background:' + g.cv.color + '">' +
      esc(g.cv.name) + '</div>';
  });
  h += '<div class="rh-corner"></div>';

  h += '<div class="rh-corner rh-lab">Tier</div>';
  STEPS.forEach(s => {
    h += '<div class="rh-step"><span class="rh-n">' + s.n + '</span><span class="rh-name">' + esc(s.name) + '</span></div>';
  });
  h += '<div class="rh-step rh-sum"><span class="rh-n">Σ</span><span class="rh-name">Tier total</span></div>';

  TIERS.forEach(t => {
    h += '<div class="rh-tier"><b>' + esc(t.name) + '</b><span>' + esc(t.sub) + '</span></div>';
    STEPS.forEach(s => {
      const v = grid[t.id][s.id];
      h += '<div class="rh-cell hb' + heatBand(v, max) + '">' + v + '</div>';
    });
    h += '<div class="rh-tot">' + STEPS.reduce((a, s) => a + grid[t.id][s.id], 0) + '</div>';
  });

  h += '<div class="rh-corner rh-lab rh-foot">Step total</div>';
  STEPS.forEach(s => { h += '<div class="rh-tot">' + stepCount(s.id) + '</div>'; });
  h += '<div class="rh-tot rh-grand">' + total + '</div></div>';

  return h + heatLegend(max);
}

/* The on-screen ramp from views/heatmap.js, as a band number 0-4 that
   report.css maps to the --h1..--h4 tokens. Same thresholds, so a cell reads
   the same shade on paper as on screen. */
function heatBand(n, max) {
  if (n === 0) return 0;
  const r = n / max;
  return r <= 0.25 ? 1 : r <= 0.5 ? 2 : r <= 0.75 ? 3 : 4;
}

/* One swatch per band that actually occurs at this maximum, labelled with the
   counts it covers, so the key reads "1 · 2 · 3–4" rather than percentages. */
function heatLegend(max) {
  const bands = {};
  for (let n = 1; n <= max; n++) (bands[heatBand(n, max)] = bands[heatBand(n, max)] || []).push(n);
  const label = ns => ns.length > 1 ? ns[0] + '–' + ns[ns.length - 1] : String(ns[0]);
  return '<div class="rpt-hm-key"><span class="rk-lab">Marked per cell</span>' +
    '<span class="rk-sw hb0">0</span>' +
    Object.keys(bands).map(b => '<span class="rk-sw hb' + b + '">' + label(bands[b]) + '</span>').join('') +
    '</div>';
}

/* Parked with summaryPage(), its only caller. */
function phaseTable(total) {
  const buckets = phaseBuckets();
  const max = Math.max(1, ...CANVAS.map(cv => phaseCount(cv.id)));

  return '<div class="rpt-phases">' + CANVAS.map(cv => {
    const n = phaseCount(cv.id);
    const steps = STEPS.filter(s => s.canvas === cv.id);
    const layers = { D: 0, S: 0, O: 0 };
    buckets[cv.id].forEach(({ c }) => { layers[c.layer]++; });
    const mix = Object.keys(layers).filter(k => layers[k])
      .map(k => '<span class="rpt-mix" style="background:' + layerColor(k) + '">' + LAYERS[k].short + ' ' + layers[k] + '</span>')
      .join('') || '<span class="rpt-mix zero">none</span>';
    return '<div class="rpt-phase' + (n ? '' : ' zero') + '" style="--pc:' + cv.color + '">' +
      '<div class="rpt-phase-n">' + n + '</div>' +
      '<div class="rpt-phase-t">' + esc(cv.name) + '</div>' +
      '<div class="rpt-phase-s">Step' + (steps.length > 1 ? 's' : '') + ' ' + steps.map(s => s.n).join(', ') +
      ' &middot; ' + esc([...new Set(steps.map(s => OWNERS[s.owner].label))].join(' / ')) + '</div>' +
      '<div class="rpt-bar"><span style="width:' + Math.round((n / max) * 100) + '%"></span></div>' +
      '<div class="rpt-phase-mix">' + mix + '</div>' +
      '<div class="rpt-phase-share">' + (total ? Math.round((n / total) * 100) : 0) + '% of all marked</div>' +
      '</div>';
  }).join('') + '</div>';
}

/* ---- pages 2..n: one per pricing phase in scope ---- */

function phasePage(cv, index, phaseTotal, total) {
  const steps = STEPS.filter(s => s.canvas === cv.id);
  const n = phaseCount(cv.id);
  const stepsWithMarks = steps.filter(s => stepCount(s.id) > 0);
  const owners = [...new Set(steps.map(s => OWNERS[s.owner].label))].join(' / ');

  const layers = { D: 0, S: 0, O: 0 };
  phaseBuckets()[cv.id].forEach(({ c }) => { layers[c.layer]++; });
  const leadLayer = ['D', 'S', 'O'].sort((a, b) => layers[b] - layers[a])[0];
  const stage = stageOfLayer(leadLayer);

  const headline = esc(cv.name) + ' carries ' + n + ' of the ' + total +
    ' marked challenges, concentrated at step' + (stepsWithMarks.length > 1 ? 's ' : ' ') +
    stepsWithMarks.map(s => s.n).join(', ') + '.';

  const lead =
    esc(cv.name) + ' (' + esc(cv.sub) + ') covers step' + (steps.length > 1 ? 's ' : ' ') +
    esc(steps.map(s => s.n + ' ' + s.name).join(', ')) + ', owned by ' + esc(owners) + '. ' +
    'Of the ' + n + ' challenges marked here, the mix is ' + esc(layerProse(layers)) +
    ', which puts the centre of gravity of this phase in ' + (stage ? esc(stage.name) : 'delivery') + '.';

  const body = stepsWithMarks.map(s => {
    const content = STEP_CONTENT[s.id];
    const marked = CHALLENGES_BY_STEP[s.id].filter(c => isOn(c.id));
    return '<div class="rpt-step">' +
      '<div class="rpt-step-h"><span class="rsn">' + s.n + '</span>' + esc(s.name) +
      '<span class="rpt-tags"><span class="rpt-tag ghost">' + esc(OWNERS[s.owner].label) + '</span>' +
      '<span class="rpt-tag">' + marked.length + ' marked</span></span></div>' +
      (content ? '<div class="rpt-step-sum">' + esc(content.summary) + '</div>' : '') +
      '<div class="rpt-ch-grid">' + marked.map(c =>
        '<div class="rpt-ch"><span class="rpt-dot" style="background:' + layerColor(c.layer) + '"></span><div>' +
        '<div class="rpt-ch-t">' + esc(c.t) + '</div>' +
        '<div class="rpt-ch-tier">' + esc(c.id) + ' &middot; ' +
        esc(c.tiers.map(id => TIERS.find(t => t.id === id).name).join(', ')) + '</div>' +
        '<div class="rpt-ch-d">' + esc(c.d) + '</div></div></div>').join('') +
      '</div></div>';
  }).join('');

  return pageHead('Phase ' + index + ' of ' + phaseTotal + ' &middot; ' + esc(cv.name.toUpperCase()), headline, lead) +
    exhibit('Marked challenges in ' + cv.name + ', by process step', body,
      'Each dot is the logic layer: blue data and modelling, green steering and governance, amber operational processing.') +
    '<div class="rpt-facts">' +
      '<div class="rpt-fact"><span>Steps covered</span><b>' + steps.map(s => s.n).join(', ') + '</b></div>' +
      '<div class="rpt-fact"><span>Ownership</span><b>' + esc(owners) + '</b></div>' +
      '<div class="rpt-fact"><span>Share of all marked</span><b>' + (total ? Math.round((n / total) * 100) : 0) + '%</b></div>' +
      '<div class="rpt-fact"><span>Delivery lead</span><b>' + (stage ? esc(stage.name) : '—') + '</b></div>' +
    '</div>';
}

/* ---- PARKED: technical recommendations page ----------------------------
   Not called by buildReport(). The guidance is engagement-independent -- it
   reads identically whatever was marked -- so it was adding a page that said
   nothing about the engagement the report is about. Kept, with its content in
   content/technology.json and its screen twin in views/technology.js, so the
   decision is reversible: to restore it, call page(recommendationsPage()) at
   the end of buildReport() and update the expected page count in
   tools/pdfcheck.py and tests/checks.mjs.
   ---------------------------------------------------------------------- */

function recommendationsPage() {
  return '<div class="rpt-eyebrow rpt-sec-eyebrow">Technical recommendations &amp; attention points</div>' +
    '<div class="rpt-headline">Where to ground the pricing model, how to approach integration, ' +
      'and what to design in around security, data and operations.</div>' +
    '<p class="rpt-lead">These are recommendations and watch-outs to steer the deployment programme, ' +
      'not a checklist to score a vendor against. They apply to any organisation running this process ' +
      'at scale and are independent of what was marked in this engagement.</p>' +
    technologyPrintHTML();
}
