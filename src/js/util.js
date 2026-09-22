/* ==========================================================================
   Small shared helpers
   ========================================================================== */

/* Escape untrusted text before it goes into an innerHTML template.
   Used for anything the facilitator typed (engagement name) and for all
   content strings rendered into the print report. */
export function esc(s) {
  return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

/* Initials for a persona avatar: first letter of the first two words. */
export function initials(name) {
  return name.split(/[\s/]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('');
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

export const $ = id => document.getElementById(id);
