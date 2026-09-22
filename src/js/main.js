/* ==========================================================================
   Entry point

   Load content -> load the saved session -> wire the shell -> first render.

   Every state mutation goes through state.js, which notifies subscribers, so
   renderAll() below is the single re-render path. No view calls another view's
   render function directly.
   ========================================================================== */

import { loadContent } from './content.js';
import { loadSession, onChange, LS_OK } from './state.js';
import { initShell, openInitialScreen, renderCanvasOverview, switchTab } from './shell.js';
import { renderMatrix } from './views/matrix.js';
import { renderHeatmap } from './views/heatmap.js';
import { renderRoadmap } from './views/roadmap.js';
import { refreshExplainer } from './views/explainer.js';
import { initPrintTeardown } from './report.js';
import { toast } from './util.js';

function renderAll() {
  renderMatrix();
  renderHeatmap();
  renderRoadmap();
  refreshExplainer();
}

async function boot() {
  try {
    loadContent();
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<div style="font:14px/1.6 system-ui;padding:48px;max-width:720px;margin:0 auto">' +
      '<h1 style="font-size:20px;margin-bottom:12px">This file was not built</h1>' +
      '<p>The page content is missing: <b>' + err.message + '</b></p>' +
      '<p style="margin-top:12px"><code>src/index.html</code> is a template, not a runnable page. ' +
      'Build the standalone file and open that instead:</p>' +
      '<pre style="background:#f4f6f9;padding:12px;border-radius:8px;margin-top:8px">python tools/build.py</pre>' +
      '<p style="margin-top:8px">then open the newest file in <code>dist/</code>.</p>' +
      '</div>';
    return;
  }

  await loadSession();

  renderCanvasOverview();
  initShell();
  initPrintTeardown();
  onChange(renderAll);

  switchTab('matrix');
  renderAll();
  openInitialScreen();

  if (!LS_OK) {
    setTimeout(() => toast('Auto-save is off in this mode. Use "Export .json" to keep your work'), 700);
  }
}

boot();
