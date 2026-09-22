/* ==========================================================================
   Session files (.json download / upload)

   The reliable way to keep, move or hand over an engagement. Auto-save is a
   convenience; this is the record.
   ========================================================================== */

import { APP } from './config.js';
import { snapshot, replaceSession, state } from './state.js';
import { toast } from './util.js';

export function exportSession() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
  const safe = (state.client || 'engagement').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'engagement';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${APP.name}_Workshop_${safe}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Session saved to file');
}

/* Resolves once the file has been read, so the shell can decide whether to
   jump straight into the app. Rejects on an unreadable file. */
export function importSessionFile(file) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        replaceSession(JSON.parse(rd.result));
        toast('Session loaded from file');
        resolve();
      } catch (e) {
        toast('Could not read that file');
        reject(e);
      }
    };
    rd.onerror = () => { toast('Could not read that file'); reject(rd.error); };
    rd.readAsText(file);
  });
}
