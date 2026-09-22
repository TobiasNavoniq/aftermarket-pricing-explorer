/* ==========================================================================
   Smoke test

   Boots the tool twice in jsdom and runs the same assertions against both:

     dev   src/index.html + the real ES modules, with content/*.json injected
           the same way the build injects it
     dist  the bundled single file from tools/build.py

   That pairing is the point. The dev tree is what you edit; the dist file is
   what you hand over. Running one set of checks against both catches a
   bundler bug the moment it appears, instead of in front of a client.

   Usage:
     npm install          # jsdom, once
     npm test             # both targets
     node tests/smoke.mjs dev
     node tests/smoke.mjs dist
   ========================================================================== */

import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runChecks } from './checks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'http://localhost/';

function collectors() {
  const errors = [], warns = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  vc.on('warn', (...a) => warns.push('console.warn: ' + a.join(' ')));
  return { errors, warns, vc };
}

/* jsdom gives us no layout and no print dialog; stub what the tool calls. */
function stub(w) {
  w.Element.prototype.scrollIntoView = function () {};
  w.print = () => {};
  w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};
}

/* ---- target: the built single file ---- */
async function bootDist() {
  const dir = path.join(ROOT, 'dist');
  /* Newest by mtime, not by name: dist/ also holds superseded releases, and
     version strings do not sort correctly once a component reaches 10. */
  const builds = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith('.html'))
        .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
    : [];
  if (!builds.length) throw new Error('no build in dist/ -- run: python tools/build.py');
  const file = path.join(dir, builds[0].f);
  console.log('  target: dist/' + builds[0].f);

  const { errors, warns, vc } = collectors();
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {
    runScripts: 'dangerously', pretendToBeVisual: true, url: URL_BASE, virtualConsole: vc, beforeParse: stub
  });
  await new Promise(r => setTimeout(r, 300));
  return { window: dom.window, errors, warns };
}

/* ---- target: the dev module tree ----
   jsdom does not execute <script type="module">, so the module script is
   stripped and main.js is imported by Node instead, with jsdom's window
   installed as the globals. The content payload is assembled here exactly as
   tools/build.py assembles it, which is what makes this a fair comparison
   against the dist target. Keep CONTENT_FILES below in step with build.py. */
const CONTENT_FILES = {
  taxonomy: 'taxonomy.json',
  challenges: 'challenges.json',
  stepContent: 'step-content.json',
  useCases: 'use-cases.json',
  technology: 'technology.json'
};

async function bootDev() {
  console.log('  target: src/index.html + src/js (ES modules)');
  const { errors, warns, vc } = collectors();
  const html = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8')
    .replace('<script type="module" src="js/main.js"></script>', '');

  const dom = new JSDOM(html, { pretendToBeVisual: true, url: URL_BASE, virtualConsole: vc });
  const { window } = dom;
  stub(window);

  window.__APP_CONTENT__ = Object.fromEntries(
    Object.entries(CONTENT_FILES).map(([key, file]) =>
      [key, JSON.parse(fs.readFileSync(path.join(ROOT, 'content', file), 'utf8'))])
  );

  for (const k of ['window', 'document', 'localStorage', 'Blob', 'FileReader', 'URL', 'confirm'])
    globalThis[k] = k === 'window' ? window : window[k];

  /* Cache-bust so both targets can run in one process. */
  await import(pathToFileURL(path.join(ROOT, 'src/js/main.js')).href + '?t=' + Date.now());
  await new Promise(r => setTimeout(r, 300));
  return { window, errors, warns };
}

const TARGETS = { dev: bootDev, dist: bootDist };

const requested = process.argv[2];
const names = requested ? [requested] : ['dev', 'dist'];
let failures = 0;

for (const name of names) {
  const boot = TARGETS[name];
  if (!boot) {
    console.error(`unknown target "${name}" (expected: dev, dist)`);
    process.exit(2);
  }
  console.log(`\n=== ${name} ===`);
  try {
    const { window, errors, warns } = await boot();
    failures += await runChecks(window, errors, warns);
  } catch (e) {
    console.error('  BOOT FAILED: ' + e.stack);
    failures += 1;
  }
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall targets passed');
process.exit(failures ? 1 : 0);
