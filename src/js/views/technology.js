/* ==========================================================================
   Technical Recommendations & Attention Points

   Advisory guidance for the deployment programme, written as recommendations
   and watch-outs for the organisation, not as vendor-evaluation criteria.
   Content lives in content/technology.json.

   This guidance is engagement-independent: it says the same thing whatever was
   marked. It therefore belongs in the report the facilitator hands on, not in
   the working surface, and it now renders only in the exported PDF, on its own
   final page (see technologyPrintHTML below, called from report.js).

   renderTechnology() is the on-screen accordion. It is PARKED, not dead: it is
   not mounted anywhere today, deliberately. To bring it back, put
   <div id="techIntegration"></div> into the roadmap panel in src/index.html and
   call renderTechnology() from views/roadmap.js. Its styles are parked
   alongside it at the end of src/css/roadmap.css.
   ========================================================================== */

import { TECHNOLOGY } from '../content.js';
import { $ } from '../util.js';

/* Which block ids are open. View-local, not persisted. */
const openBlocks = new Set();

export function renderTechnology() {
  const mount = $('techIntegration');
  if (!mount) return;
  const { screen, blocks } = TECHNOLOGY;

  mount.innerHTML = '<div class="ti-card">' +
    '<div class="ti-head">' +
      '<div class="ti-eyebrow">' + screen.eyebrow + '</div>' +
      '<div class="ti-title">' + screen.title + '</div>' +
      '<div class="ti-intro">' + screen.intro + '</div>' +
    '</div>' +
    '<div class="ti-acc">' +
    blocks.map(bl => {
      const isOpen = openBlocks.has(bl.key);
      return '<div class="ti-block' + (isOpen ? ' open' : '') + '">' +
        '<button class="ti-btn" data-block="' + bl.key + '" aria-expanded="' + isOpen + '">' +
          '<span class="ti-btn-t">' + bl.title + '</span>' +
          '<span class="ti-btn-lead">' + bl.lead + '</span>' +
          '<span class="ti-btn-n">' + bl.items.length + '</span>' +
          '<span class="ti-chev" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="ti-panel">' +
          bl.items.map(it =>
            '<div class="ti-item"><div class="ti-item-h">' + it.h + '</div>' +
            '<div class="ti-item-b">' + it.b + '</div></div>').join('') +
        '</div></div>';
    }).join('') +
    '</div></div>';

  mount.querySelectorAll('.ti-btn[data-block]').forEach(btn =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.block;
      if (openBlocks.has(key)) openBlocks.delete(key);
      else openBlocks.add(key);
      renderTechnology();
    })
  );
}

export function technologyPrintHTML() {
  const { print, blocks } = TECHNOLOGY;
  let h = '<div class="ti-print"><div class="ti-print-intro">' + print.intro + '</div>';
  blocks.forEach(bl => {
    h += '<div class="ti-print-block"><div class="ti-print-title">' + bl.title + '</div>' +
      '<div class="ti-print-lead">' + bl.lead + '</div>';
    bl.items.forEach(it => {
      h += '<div class="ti-print-item"><span class="ti-print-h">' + it.h + '.</span> ' + it.b + '</div>';
    });
    h += '</div>';
  });
  return h + '</div>';
}
