/* ==========================================================================
   View: Step explainer

   Opens underneath the matrix when a step header or a cell is clicked. It is
   where the facilitator actually works: read what "good" looks like at this
   step, then tick the challenges the OEM's RFP or process points to.

   Sections, top to bottom:
     header       step number, canvas phase, ownership, active tier
     summary      step-content.json -> summary + best
     challenges   tickable list, filterable by tier
     workflow     best-practice steps + the personas who run them
     use cases    reference codes that expand into the 3D detail card

   `ui` below is view-local and deliberately not persisted: which panel happens
   to be open is not part of the engagement record.
   ========================================================================== */

import {
  TIERS, STEPS, OWNERS, LAYERS, USECASES, PERSONAS, STEP_CONTENT,
  CHALLENGES_BY_STEP, canvasOfStep, layerColor, tierById
} from '../content.js';
import { isOn, toggleChallenge } from '../state.js';
import { $, initials } from '../util.js';

const ui = { stepId: null, tierId: 'all', openUseCase: null };

export function openExplainer(stepId, tierId) {
  ui.stepId = stepId;
  ui.tierId = tierId || 'all';
  ui.openUseCase = null;
  renderExplainer();
  const ex = $('explainer');
  ex.classList.add('show');
  ex.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function closeExplainer() {
  const ex = $('explainer');
  if (ex) ex.classList.remove('show');
  ui.stepId = null;
}

/* Re-render only if a step is actually open. Called by the global re-render
   after any state change, so ticking a challenge updates the counts in place. */
export function refreshExplainer() {
  if (ui.stepId) renderExplainer();
}

function renderExplainer() {
  const s = STEPS.find(x => x.id === ui.stepId);
  const content = s && STEP_CONTENT[s.id];
  if (!s || !content) return;

  const tid = ui.tierId || 'all';
  const cv = canvasOfStep(s.id);
  const owner = OWNERS[s.owner];

  const all = CHALLENGES_BY_STEP[s.id];
  const shown = tid === 'all' ? all : all.filter(ch => ch.tiers.includes(tid));
  const marked = shown.filter(ch => isOn(ch.id)).length;
  const tierLabel = tid === 'all' ? 'All tiers' : tierById(tid).name;

  const workflow = content.steps.map(x => '<li>' + x + '</li>').join('');

  const personas = content.personas.map(key => {
    const p = PERSONAS[key];
    return '<div class="persona"><div class="pav" style="background:' + p.color + '">' + initials(p.name) + '</div>' +
      '<div><div class="pn">' + p.name + '</div><div class="pd">' + p.desc + '</div></div></div>';
  }).join('');

  const useCases = s.ucs.map(u => {
    const uc = USECASES[u];
    return '<button class="uc" data-uc="' + u + '">' + u + ' · ' + (uc ? uc.name : u) + '</button>';
  }).join('');

  let tierFilter = '<button class="tf ' + (tid === 'all' ? 'active' : '') + '" data-tf="all">All tiers</button>';
  TIERS.forEach(t => {
    tierFilter += '<button class="tf ' + (tid === t.id ? 'active' : '') + '" data-tf="' + t.id + '">' + t.name + '</button>';
  });

  const tick = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  const challengeList = shown.map(c => {
    const tiers = c.tiers.map(id => tierById(id).name.split(' ')[0]).join(' · ');
    return '<div class="challenge ' + (isOn(c.id) ? 'on' : '') + '" data-ch="' + c.id + '">' +
      '<div class="cbox">' + tick + '</div>' +
      '<div class="cmain"><div class="ctitle">' + c.t + '</div><div class="cdesc">' + c.d + '</div>' +
      '<div class="cmeta"><span class="layer-chip" style="background:' + layerColor(c.layer) + '">' + LAYERS[c.layer].short + '</span>' +
      '<span class="tier-tag">' + tiers + '</span></div></div></div>';
  }).join('') || '<div class="empty-state" style="padding:24px">No challenges tagged to this tier for this step.</div>';

  $('explainer').innerHTML = `
    <div class="ex-card">
      <div class="ex-head">
        <div class="ex-num">${s.n}</div>
        <div class="ex-titles">
          <div class="ex-step">${s.name}</div>
          <div class="ex-meta">
            <span class="ex-tag" style="background:${cv.color}">${cv.name}</span>
            <span class="ex-tag" style="background:${owner.color}">${owner.label}</span>
            <span class="ex-tier">Tier: <b>${tierLabel}</b></span>
          </div>
        </div>
        <button class="ex-close" id="exClose" aria-label="Close">&times;</button>
      </div>
      <div class="ex-body">
        <div class="ex-summary">${content.summary} ${content.best}</div>
        <div class="ex-mark-sec">
          <div class="ex-mark-head">
            <div class="ex-mark-title">Mark challenges that match this OEM&apos;s RFP or process</div>
            <div class="ex-tier-filter">${tierFilter}</div>
          </div>
          <div id="exChallenges">${challengeList}</div>
        </div>
        <div class="ex-grid">
          <div>
            <div class="ex-sec-label">Best-practice workflow</div>
            <ol class="ex-steps">${workflow}</ol>
          </div>
          <div>
            <div class="ex-sec-label">Who works on this step</div>
            ${personas}
          </div>
        </div>
        <div class="ex-uc-sec">
          <div class="ex-sec-label">Reference use cases <span class="uc-hint">(click to expand)</span></div>
          <div class="ex-uc-note">Each code below is an internal process reference: a concrete capability that may address what this OEM&apos;s RFP is asking for at this step.</div>
          <div class="uc-wrap">${useCases}</div>
          <div id="ucDetail" class="uc-detail"></div>
        </div>
        <div class="ex-actions">
          <button class="btn ghost" id="exCloseBtn">Close</button>
          <span class="ex-chcount"><b>${marked}</b> of ${shown.length} challenges marked${tid === 'all' ? ' across all tiers' : ' at this tier'}</span>
        </div>
      </div>
    </div>`;

  $('exClose').addEventListener('click', closeExplainer);
  $('exCloseBtn').addEventListener('click', closeExplainer);
  document.querySelectorAll('#explainer .uc[data-uc]')
    .forEach(b => b.addEventListener('click', () => toggleUseCase(b.dataset.uc)));
  document.querySelectorAll('#explainer .ex-tier-filter .tf')
    .forEach(b => b.addEventListener('click', () => { ui.tierId = b.dataset.tf; renderExplainer(); }));
  document.querySelectorAll('#exChallenges .challenge')
    .forEach(el => el.addEventListener('click', () => toggleChallenge(el.dataset.ch)));

  /* The panel was just rebuilt, so re-open whichever use case was expanded. */
  if (ui.openUseCase) {
    const keep = ui.openUseCase;
    ui.openUseCase = null;
    toggleUseCase(keep, { scroll: false });
  }
}

/* The 3D reference use-case card. Clicking the same code again closes it. */
function toggleUseCase(code, opts) {
  const uc = USECASES[code];
  const box = $('ucDetail');
  if (!uc || !box) return;

  if (ui.openUseCase === code) {
    ui.openUseCase = null;
    box.classList.remove('show');
    box.innerHTML = '';
    markActiveUseCase();
    return;
  }
  ui.openUseCase = code;

  box.innerHTML = `
    <div class="uc3d">
      <div class="uc3d-spine"></div>
      <div class="uc3d-body">
        <button class="uc3d-close" id="ucClose" aria-label="Close">&times;</button>
        <div class="uc3d-code">${uc.code}</div>
        <div class="uc3d-name">${uc.name}</div>
        <div class="uc3d-purpose">${uc.purpose}</div>
        <div class="uc3d-grid">
          <div class="uc3d-col">
            <div class="uc3d-lab">Process flow</div>
            <ol class="uc3d-flow">${uc.flow.map(f => '<li>' + f + '</li>').join('')}</ol>
          </div>
          <div class="uc3d-col">
            <div class="uc3d-lab">Actors</div>
            <div class="uc3d-actors">${uc.actors.map(a => '<span class="uc-actor">' + a + '</span>').join('')}</div>
            <div class="uc3d-lab" style="margin-top:14px">Trigger</div>
            <p class="uc3d-text">${uc.trigger}</p>
            <div class="uc3d-lab" style="margin-top:14px">Inputs</div>
            <p class="uc3d-text">${uc.inputs}</p>
            <div class="uc3d-lab" style="margin-top:14px">Outputs</div>
            <p class="uc3d-text">${uc.outputs}</p>
          </div>
        </div>
        <div class="uc3d-pain"><span class="uc3d-pain-lab">Why it matters across the industry</span><p>${uc.pain}</p></div>
      </div>
    </div>`;
  box.classList.add('show');
  $('ucClose').addEventListener('click', () => toggleUseCase(code));
  markActiveUseCase();
  if (!opts || opts.scroll !== false) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function markActiveUseCase() {
  document.querySelectorAll('#explainer .uc[data-uc]')
    .forEach(b => b.classList.toggle('uc-on', b.dataset.uc === ui.openUseCase));
}
