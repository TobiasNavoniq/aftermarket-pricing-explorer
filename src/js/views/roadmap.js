/* ==========================================================================
   View: Priority Roadmap

   The marked challenges laid out across the five pricing-canvas phases, in the
   same order and the same colours as the band above the matrix: Price Strategy
   -> Setting -> Steering -> Execution -> Transactions. The roadmap therefore
   reads as a continuation of the matrix rather than a second taxonomy.

   Two things are clickable, both writing into the one detail panel underneath:
     - a phase header  -> what the phase covers, the steps it spans, and every
                          challenge marked inside it, with descriptions
     - a challenge     -> that challenge on its own, with the step context and
                          the reference use cases that bear on it

   Sequencing has not been thrown away, it has moved down a level: each
   challenge carries the delivery stage its logic layer implies (Diagnose /
   Transform / Execute), shown on the challenge detail.

   The reference use cases at the foot of a challenge detail are disclosure
   buttons: one opens its detail inline, right under itself, so nobody has to
   scroll to find it. Clicking it again closes it; one is open at a time.

   `detail` and `openUc` are view-local and not persisted. `openUc` is dropped
   whenever the detail it sits in changes, and when a change of marks leaves
   no marked step that references it.

   The Technical Recommendations card used to sit below these columns. It is
   engagement-independent guidance, so it now appears only in the exported PDF
   report; see src/js/views/technology.js.
   ========================================================================== */

import {
  CANVAS, STEPS, LAYERS, STEP_CONTENT, USECASES, CHALLENGES_BY_STEP,
  OWNERS, layerColor, tierById
} from '../content.js';
import { countAll, isOn, stepCount, stepsInScope, phaseBuckets, phaseCount, stageOfLayer } from '../state.js';
import { $ } from '../util.js';

const detail = { kind: null, id: null };
let openUc = null;

/* A use case is on the roadmap while any step that references it has
   something marked. */
function ucOnRoadmap(code) {
  return STEPS.some(s => (s.ucs || []).includes(code) && stepCount(s.id) > 0);
}

export function renderRoadmap() {
  const road = $('roadmap');
  const empty = $('roadEmpty');
  const summary = $('prioSummary');
  if (!road || !empty || !summary) return;

  const total = countAll();
  if (total === 0) {
    road.innerHTML = '';
    summary.innerHTML = '';
    detail.kind = null;
    openUc = null;
    renderDetail();
    empty.innerHTML = '<div class="empty-state"><div class="big">Nothing to sequence yet</div>' +
      'Mark applicable challenges in the matrix to lay them out across the five pricing phases.</div>';
    return;
  }
  empty.innerHTML = '';

  const buckets = phaseBuckets();

  summary.innerHTML =
    '<div class="ps-item"><div class="v red">' + total + '</div><div class="l">Challenges marked</div></div>' +
    CANVAS.map(cv =>
      '<div class="ps-item"><div class="v" style="color:' + cv.color + '">' + phaseCount(cv.id) + '</div>' +
      '<div class="l">' + cv.name.replace('Price ', '') + '</div></div>').join('') +
    '<div class="ps-item"><div class="v">' + stepsInScope() + '/' + STEPS.length + '</div><div class="l">Steps in scope</div></div>';

  road.innerHTML = CANVAS.map(cv => {
    const items = buckets[cv.id];
    const steps = STEPS.filter(s => s.canvas === cv.id);
    const head =
      '<button class="road-head" data-phase="' + cv.id + '" style="--pc:' + cv.color + '">' +
      '<span class="rh-name">' + cv.name + '</span>' +
      '<span class="rh-sub">' + cv.sub + '</span>' +
      '<span class="rh-steps">Step' + (steps.length > 1 ? 's' : '') + ' ' + steps.map(s => s.n).join(', ') + '</span>' +
      '<span class="rh-count' + (items.length ? '' : ' zero') + '">' +
      (items.length ? items.length + ' marked' : 'none marked') + '</span>' +
      '</button>';
    const list = items.length
      ? items.map(({ c, s }) =>
          '<button class="ritem" data-ch="' + c.id + '">' +
          '<span class="ri-t">' + c.t + '</span>' +
          '<span class="ri-meta"><span class="ri-layer" style="background:' + layerColor(c.layer) + '">' +
          LAYERS[c.layer].short + '</span>' +
          '<span class="ri-step">Step ' + s.n + ' · ' + s.name + '</span></span>' +
          '</button>').join('')
      : '<div class="road-empty">Nothing marked in this phase.</div>';
    return '<div class="road-col" style="--pc:' + cv.color + '">' + head + '<div class="road-list">' + list + '</div></div>';
  }).join('');

  road.querySelectorAll('.road-head[data-phase]')
    .forEach(el => el.addEventListener('click', () => openDetail('phase', el.dataset.phase)));
  road.querySelectorAll('.ritem[data-ch]')
    .forEach(el => el.addEventListener('click', () => openDetail('challenge', el.dataset.ch)));

  if (openUc && !ucOnRoadmap(openUc)) openUc = null;
  renderDetail();
}

/* Clicking the thing that is already open closes it. */
function openDetail(kind, id) {
  if (detail.kind === kind && detail.id === id) { detail.kind = null; detail.id = null; }
  else { detail.kind = kind; detail.id = id; }
  openUc = null;
  renderDetail();
  if (detail.kind) $('roadDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDetail() {
  detail.kind = null;
  detail.id = null;
  openUc = null;
  renderDetail();
}

/* The re-render replaces the button, so hand focus back to its successor or
   a keyboard user is dropped to the top of the page. */
function toggleUc(code) {
  openUc = openUc === code ? null : code;
  renderDetail();
  const btn = document.querySelector('#roadDetail .rd-uc[data-uc="' + code + '"]');
  if (btn) btn.focus();
}

function markActiveRoadmap() {
  document.querySelectorAll('#roadmap .road-head[data-phase]')
    .forEach(el => el.classList.toggle('on', detail.kind === 'phase' && el.dataset.phase === detail.id));
  document.querySelectorAll('#roadmap .ritem[data-ch]')
    .forEach(el => el.classList.toggle('on', detail.kind === 'challenge' && el.dataset.ch === detail.id));
}

function renderDetail() {
  const box = $('roadDetail');
  if (!box) return;

  if (!detail.kind) {
    box.classList.remove('show');
    box.innerHTML = '';
    markActiveRoadmap();
    return;
  }

  const body = detail.kind === 'phase' ? phaseDetail(detail.id) : challengeDetail(detail.id);
  if (!body) { closeDetail(); return; }

  box.innerHTML = body;
  box.classList.add('show');
  const close = $('rdClose');
  if (close) close.addEventListener('click', closeDetail);
  box.querySelectorAll('.rd-jump[data-ch]')
    .forEach(el => el.addEventListener('click', () => openDetail('challenge', el.dataset.ch)));
  box.querySelectorAll('.rd-uc[data-uc]')
    .forEach(el => el.addEventListener('click', () => toggleUc(el.dataset.uc)));
  markActiveRoadmap();
}

function detailShell(color, eyebrow, title, meta, inner) {
  return '<div class="rd-card" style="--pc:' + color + '">' +
    '<div class="rd-head">' +
    '<div class="rd-titles"><div class="rd-eyebrow">' + eyebrow + '</div>' +
    '<div class="rd-title">' + title + '</div>' +
    '<div class="rd-meta">' + meta + '</div></div>' +
    '<button class="rd-close" id="rdClose" aria-label="Close">&times;</button>' +
    '</div><div class="rd-body">' + inner + '</div></div>';
}

function phaseDetail(phaseId) {
  const cv = CANVAS.find(c => c.id === phaseId);
  if (!cv) return null;
  const steps = STEPS.filter(s => s.canvas === cv.id);
  const owners = [...new Set(steps.map(s => OWNERS[s.owner].label))].join(' / ');

  const meta =
    '<span class="rd-tag" style="background:' + cv.color + '">' + cv.sub + '</span>' +
    '<span class="rd-tag ghost">' + owners + '</span>' +
    '<span class="rd-count">' + phaseCount(cv.id) + ' marked across ' + steps.length +
    ' step' + (steps.length > 1 ? 's' : '') + '</span>';

  const inner = steps.map(s => {
    const content = STEP_CONTENT[s.id];
    const marked = CHALLENGES_BY_STEP[s.id].filter(c => isOn(c.id));
    const list = marked.length
      ? '<div class="rd-list">' + marked.map(c =>
          '<button class="rd-jump" data-ch="' + c.id + '">' +
          '<span class="rd-dot" style="background:' + layerColor(c.layer) + '"></span>' +
          '<span><span class="rd-jump-t">' + c.t + '</span>' +
          '<span class="rd-jump-d">' + c.d + '</span></span></button>').join('') + '</div>'
      : '<div class="rd-none">Nothing marked at this step.</div>';
    return '<div class="rd-step">' +
      '<div class="rd-step-h"><span class="rd-step-n">' + s.n + '</span>' + s.name +
      '<span class="rd-step-c">' + stepCount(s.id) + ' marked</span></div>' +
      (content ? '<div class="rd-step-sum">' + content.summary + '</div>' : '') +
      list + '</div>';
  }).join('');

  return detailShell(cv.color, 'Pricing phase', cv.name, meta, inner);
}

function challengeDetail(challengeId) {
  let found = null;
  STEPS.forEach(s => CHALLENGES_BY_STEP[s.id].forEach(c => { if (c.id === challengeId) found = { c, s }; }));
  if (!found) return null;

  const { c, s } = found;
  const cv = CANVAS.find(x => x.id === s.canvas);
  const stage = stageOfLayer(c.layer);
  const content = STEP_CONTENT[s.id];
  const tiers = c.tiers.map(id => tierById(id).name).join(' · ');

  const meta =
    '<span class="rd-tag" style="background:' + cv.color + '">' + cv.name + '</span>' +
    '<span class="rd-tag" style="background:' + layerColor(c.layer) + '">' + LAYERS[c.layer].label + '</span>' +
    '<span class="rd-tag ghost">' + OWNERS[s.owner].label + '</span>' +
    '<span class="rd-count">' + c.id + '</span>';

  const useCases = (s.ucs || []).map(u => {
    const uc = USECASES[u];
    if (!uc) return '';
    const open = openUc === uc.code;
    return '<button class="rd-uc' + (open ? ' on' : '') + '" data-uc="' + uc.code + '" aria-expanded="' + open + '"' +
      ' aria-controls="rdUc-' + uc.code + '"><b>' + uc.code + ' · ' + uc.name + '</b>' + uc.purpose + '</button>' +
      (open ? useCaseDetail(uc) : '');
  }).join('');

  const inner =
    '<div class="rd-lead">' + c.d + '</div>' +
    '<div class="rd-grid">' +
      '<div>' +
        '<div class="rd-lab">Where it sits</div>' +
        '<div class="rd-fact"><span>Process step</span><b>' + s.n + ' · ' + s.name + '</b></div>' +
        '<div class="rd-fact"><span>Capability tier</span><b>' + tiers + '</b></div>' +
        '<div class="rd-fact"><span>Delivery stage</span><b>' + (stage ? stage.name : '—') + '</b></div>' +
        (stage ? '<div class="rd-stage">' + stage.blurb + '</div>' : '') +
      '</div>' +
      '<div>' +
        '<div class="rd-lab">What good looks like at this step</div>' +
        (content ? '<p class="rd-text">' + content.best + '</p>' : '') +
      '</div>' +
    '</div>' +
    (useCases ? '<div class="rd-lab rd-lab-top">Reference use cases for this step</div>' + useCases : '');

  return detailShell(cv.color, 'Challenge ' + c.id, c.t, meta, inner);
}

/* Everything content/use-cases.json holds for one use case bar the code, name
   and purpose, which its button already shows. */
function useCaseDetail(uc) {
  return '<div class="rd-uc-detail" id="rdUc-' + uc.code + '" role="region" aria-label="' + uc.code + ' ' + uc.name + '">' +
    '<div class="rd-grid">' +
      '<div>' +
        '<div class="rd-lab">Process flow</div>' +
        '<ol class="rd-uc-flow">' + uc.flow.map(f => '<li>' + f + '</li>').join('') + '</ol>' +
      '</div>' +
      '<div>' +
        '<div class="rd-lab">Actors</div>' +
        '<div class="rd-meta rd-uc-actors">' + uc.actors.map(a => '<span class="rd-tag ghost">' + a + '</span>').join('') + '</div>' +
        '<div class="rd-fact"><span>Trigger</span><b>' + uc.trigger + '</b></div>' +
        '<div class="rd-fact"><span>Inputs</span><b>' + uc.inputs + '</b></div>' +
        '<div class="rd-fact"><span>Outputs</span><b>' + uc.outputs + '</b></div>' +
      '</div>' +
    '</div>' +
    '<div class="rd-stage"><b>Why it matters across the industry</b> ' + uc.pain + '</div>' +
    '</div>';
}
