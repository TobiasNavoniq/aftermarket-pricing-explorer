/* ==========================================================================
   View: Process Matrix

   The 9 steps x 3 tiers grid, with two header bands above it:
     - the pricing-canvas band, where one cell spans its grouped steps
     - the ownership band (HQ / Markets / both)

   Clicking a step header opens the explainer for the whole step (all tiers);
   clicking a cell opens it filtered to that tier.
   ========================================================================== */

import { TIERS, STEPS, OWNERS, LAYERS, canvasGroups, cellChallenges, layerColor } from '../content.js';
import { stepCount, cellCount, countAll } from '../state.js';
import { $ } from '../util.js';
import { openExplainer } from './explainer.js';

export function renderMatrix() {
  const mount = $('matrix');
  if (!mount) return;

  let h = '<div class="mx-scroll"><div class="mx" style="--steps:' + STEPS.length + '">';

  /* Canvas band: one cell per phase, spanning its steps. */
  h += '<div class="mx-band canvas-band"><div class="mx-rowlabel band-corner"><span class="bl">Pricing canvas ▸</span></div>';
  canvasGroups().forEach(g => {
    h += `<div class="canvas-cell" style="grid-column:span ${g.steps.length};background:${g.cv.color}">
      <div class="cc-name">${g.cv.name}</div><div class="cc-sub">${g.cv.sub}</div></div>`;
  });
  h += '</div>';

  /* Ownership band. */
  h += '<div class="mx-band owner-band"><div class="mx-rowlabel band-corner"><span class="bl">Ownership ▸</span></div>';
  STEPS.forEach(s => {
    const o = OWNERS[s.owner];
    h += `<div class="owner-cell"><span class="owner-pill" style="background:${o.color}">${o.label}</span></div>`;
  });
  h += '</div>';

  /* Step header cards, each badged with its marked-challenge count. */
  h += '<div class="mx-band step-band"><div class="mx-rowlabel step-corner"><span class="bl">Capability tier ▾</span></div>';
  STEPS.forEach(s => {
    const c = stepCount(s.id);
    h += `<div class="step-card" data-step="${s.id}">
      <span class="scount ${c === 0 ? 'zero' : ''}">${c}</span>
      <div class="sn">${s.n}</div><div class="sname">${s.name}</div></div>`;
  });
  h += '</div>';

  /* One row per tier. A cell shows how many challenges are tagged to it, the
     distinct logic layers present, and how many are currently marked. */
  TIERS.forEach(t => {
    h += `<div class="mx-band tier-row"><div class="mx-rowlabel tier-label"><div class="tn">${t.name}</div><div class="ts">${t.sub}</div></div>`;
    STEPS.forEach(s => {
      const chs = cellChallenges(s.id, t.id);
      const on = cellCount(s.id, t.id);
      const chips = [...new Set(chs.map(c => c.layer))]
        .map(l => `<span class="chip" style="background:${layerColor(l)}">${LAYERS[l].short}</span>`)
        .join('');
      const body = chs.length
        ? `<div class="cell-n">${chs.length}</div><div class="cell-foot">${chips}${on > 0 ? `<span class="tb">${on}✓</span>` : ''}</div>`
        : '<div class="cell-dash">—</div>';
      h += `<div class="cell ${on > 0 ? 'has-ticks' : ''} ${chs.length === 0 ? 'empty' : ''}" data-step="${s.id}" data-tier="${t.id}">${body}</div>`;
    });
    h += '</div>';
  });

  h += '</div></div>';
  mount.innerHTML = h;

  mount.querySelectorAll('.step-card[data-step]')
    .forEach(el => el.addEventListener('click', () => openExplainer(el.dataset.step, 'all')));
  mount.querySelectorAll('.cell[data-step]:not(.empty)')
    .forEach(el => el.addEventListener('click', () => openExplainer(el.dataset.step, el.dataset.tier)));

  const live = $('liveCount');
  if (live) live.textContent = countAll();
}
