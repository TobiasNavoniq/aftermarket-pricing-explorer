/* ==========================================================================
   View: Pain Heat Map

   Same 9 x 3 geometry as the matrix (it reuses the .mx grid classes), but the
   cells are shaded by how many challenges were marked. Shading is relative to
   the busiest cell in the current session, not to an absolute scale, so the
   pattern stays readable whether 5 or 50 challenges are marked.
   ========================================================================== */

import { TIERS, STEPS, canvasGroups, cellChallenges } from '../content.js';
import { countAll, cellCount, stepCount } from '../state.js';
import { $ } from '../util.js';

/* Intensity ramp, keyed off the share of the busiest cell. Returns the CSS
   custom properties from tokens.css so a re-skin only touches that file. */
function shade(n, max) {
  if (n === 0) return { bg: '#F7FAFB', col: '#B7C3CA' };
  const r = n / max;
  if (r <= 0.25) return { bg: 'var(--h1)', col: '#0A4257' };
  if (r <= 0.50) return { bg: 'var(--h2)', col: '#06303F' };
  if (r <= 0.75) return { bg: 'var(--h3)', col: '#fff' };
  return { bg: 'var(--h4)', col: '#fff' };
}

export function renderHeatmap() {
  const mount = $('heatmap');
  const empty = $('hmEmpty');
  if (!mount || !empty) return;

  if (countAll() === 0) {
    mount.innerHTML = '';
    empty.innerHTML = '<div class="empty-state"><div class="big">No challenges marked yet</div>' +
      'Open the Process Matrix and tick the challenges this OEM&apos;s RFP or process points to. ' +
      'The heat map will populate here.</div>';
    return;
  }
  empty.innerHTML = '';

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

  let h = '<div class="mx-scroll"><div class="mx hm" style="--steps:' + STEPS.length + '">';

  h += '<div class="mx-band canvas-band"><div class="mx-rowlabel band-corner"></div>';
  canvasGroups().forEach(g => {
    h += '<div class="canvas-cell" style="grid-column:span ' + g.steps.length + ';background:' + g.cv.color + '">' +
      '<div class="cc-name">' + g.cv.name + '</div></div>';
  });
  h += '</div>';

  h += '<div class="mx-band step-band"><div class="mx-rowlabel step-corner"><span class="bl">Tier</span></div>';
  STEPS.forEach(s => {
    h += '<div class="hm-h"><div class="hh-n">' + s.n + '</div><div class="hh-name">' + s.name + '</div></div>';
  });
  h += '</div>';

  TIERS.forEach(t => {
    h += '<div class="mx-band tier-row"><div class="mx-rowlabel tier-label">' +
      '<div class="tn">' + t.name + '</div><div class="ts">' + t.sub + '</div></div>';
    STEPS.forEach(s => {
      const n = grid[t.id][s.id];
      const total = cellChallenges(s.id, t.id).length;
      const sh = shade(n, max);
      h += '<div class="hm-cell" style="background:' + sh.bg + ';color:' + sh.col +
        ';border-color:' + (n > 0 ? 'transparent' : 'var(--line)') + '">' +
        '<div class="v">' + n + '</div><div class="of">/' + total + '</div></div>';
    });
    h += '</div>';
  });

  h += '<div class="mx-band foot-row"><div class="mx-rowlabel tot-corner">Step total</div>';
  STEPS.forEach(s => { h += '<div class="hm-tot"><div class="v">' + stepCount(s.id) + '</div></div>'; });
  h += '</div>';

  h += '</div></div>';
  mount.innerHTML = h;
}
