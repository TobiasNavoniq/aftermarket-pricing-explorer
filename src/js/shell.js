/* ==========================================================================
   Application shell

   Owns everything outside the three analysis views: the top navigation and
   its session menu, the welcome screen, the stage nav, and the help panel.

   Two screens, never both: #ttWelcome (pick an engagement) and #ttAppBody
   (the three tabs). startAnalysis() swaps them.
   ========================================================================== */

import { APP } from './config.js';
import { STEPS, CANVAS } from './content.js';
import { state, setClient, resetEngagement, clearSelections, countAll, onChange } from './state.js';
import { exportSession, importSessionFile } from './session.js';
import { closeExplainer } from './views/explainer.js';
import { exportPDF } from './report.js';
import { $, toast } from './util.js';

const TAB_ORDER = ['matrix', 'heatmap', 'roadmap'];

/* ---- screens ---- */

export function startAnalysis() {
  const input = $('ttWelcomeEng');
  const name = input ? input.value.trim() : '';
  if (name && name !== state.client) setClient(name);
  $('ttWelcome').style.display = 'none';
  $('ttAppBody').style.display = '';
  updateEngagementDisplay();
}

function showWelcome() {
  $('ttAppBody').style.display = 'none';
  $('ttWelcome').style.display = '';
  const input = $('ttWelcomeEng');
  if (input) input.value = state.client || '';
  updateEngagementDisplay();
}

export function updateEngagementDisplay() {
  const el = $('ttEngDisplay');
  if (!el) return;
  const name = state.client || '';
  el.textContent = name || 'No engagement';
  el.classList.toggle('empty', !name);
}

/* ---- tabs ---- */

export function switchTab(name) {
  document.querySelectorAll('.panel')
    .forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));

  const idx = TAB_ORDER.indexOf(name);
  document.querySelectorAll('.tt-stage-tab').forEach((btn, i) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
    btn.classList.toggle('complete', i < idx);
  });
}

/* ---- welcome screen: the 9-step canvas grid, rendered from taxonomy.json
   so it can never drift from the matrix above it. ---- */

export function renderCanvasOverview() {
  const mount = $('ttCanvasGrid');
  if (!mount) return;
  mount.innerHTML = STEPS.map(s => {
    const cv = CANVAS.find(c => c.id === s.canvas);
    return '<div class="tt-cs-card" style="--cc:' + cv.color + '">' +
      '<div class="tt-cs-top"><span class="tt-cs-num">' + s.n + '</span>' +
      '<span class="tt-cs-phase" style="background:' + cv.tint + ';color:' + cv.color + '">' + cv.name + '</span></div>' +
      '<div class="tt-cs-name">' + s.name + '</div>' +
      '<div class="tt-cs-desc">' + s.blurb + '</div>' +
      '<div class="tt-cs-owner">Owner: ' + ownerLabel(s.owner) + '</div>' +
      '</div>';
  }).join('');
}

function ownerLabel(id) {
  return { hq: 'HQ', ctry: 'Markets', both: 'HQ + Markets' }[id] || id;
}

/* ---- help panel ---- */

export function openHelp() {
  const o = $('helpOverlay'); const p = $('helpPanel');
  if (o) o.classList.add('show');
  if (p) p.classList.add('show');
}

export function closeHelp() {
  const o = $('helpOverlay'); const p = $('helpPanel');
  if (o) o.classList.remove('show');
  if (p) p.classList.remove('show');
}

/* ---- session menu ---- */

let flashTimer;
function flash(msg) {
  const el = $('ttMenuFlash');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/* Clears the ticks but keeps the engagement name: re-running the same OEM
   from scratch is common, starting a different OEM is not. */
function resetSelections() {
  if (!confirm('Clear all marked challenges for this engagement? The engagement name is kept.')) return;
  clearSelections();
  closeExplainer();
  toast('Selections cleared');
}

async function newEngagement() {
  const ok = confirm('Start a new engagement? This clears the engagement name and all marked ' +
    'challenges, and wipes the saved session on this device.');
  if (!ok) return;
  await resetEngagement();
  closeExplainer();
  switchTab('matrix');
  showWelcome();
}

/* ---- wiring ---- */

export function initShell() {
  const menu = $('ttMenu');

  /* The nav shows the engagement name, which can change from anywhere:
     the welcome screen, a loaded .json, or New engagement. Subscribe rather
     than updating it at each call site and missing one. */
  onChange(updateEngagementDisplay);

  $('ttStartBtn').addEventListener('click', startAnalysis);
  $('ttWelcomeEng').addEventListener('keydown', e => { if (e.key === 'Enter') startAnalysis(); });

  $('ttMenuBtn').addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => menu.classList.remove('open'));

  $('ttNewEng').addEventListener('click', () => { menu.classList.remove('open'); newEngagement(); });

  $('ttSaveEng').addEventListener('click', () => {
    menu.classList.remove('open');
    exportSession();
    flash('Saved ✓');
  });

  $('ttLoadFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    importSessionFile(file).then(() => {
      menu.classList.remove('open');
      flash('Loaded ✓');
      /* A loaded session is work in progress: go straight to the analysis. */
      if (state.client || countAll() > 0) startAnalysis();
    }).catch(() => { /* toast already shown by importSessionFile */ });
    e.target.value = '';
  });

  $('ttHelpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpCloseBtn').addEventListener('click', closeHelp);
  $('helpOverlay').addEventListener('click', closeHelp);

  document.querySelectorAll('.tt-stage-tab')
    .forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  $('toExploreBtn').addEventListener('click', () => switchTab('matrix'));
  $('pdfBtn').addEventListener('click', exportPDF);
  $('saveFileBtn').addEventListener('click', exportSession);
  $('loadFileBtn').addEventListener('click', () => $('loadFileInput').click());
  $('resetBtn').addEventListener('click', resetSelections);
  $('loadFileInput').addEventListener('change', e => {
    if (e.target.files[0]) importSessionFile(e.target.files[0]).catch(() => {});
    e.target.value = '';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeExplainer(); closeHelp(); }
  });

  const stamp = 'v' + APP.version + ' · ' + APP.year;
  const verStamp = $('verStamp');
  if (verStamp) verStamp.textContent = stamp;
  const helpVer = $('helpVer');
  if (helpVer) helpVer.textContent = 'Version ' + APP.version + ' · ' + APP.year;
}

/* Called once after content and the saved session have loaded: an engagement
   already in progress skips the welcome screen. */
export function openInitialScreen() {
  updateEngagementDisplay();
  if (state.client || countAll() > 0) {
    const input = $('ttWelcomeEng');
    if (input) input.value = state.client || '';
    startAnalysis();
  }
}
