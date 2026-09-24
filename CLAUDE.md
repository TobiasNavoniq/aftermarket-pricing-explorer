# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

An internal, client-side diagnostic tool (no backend, no framework) that maps an
OEM's aftermarket pricing process across 9 steps × 3 capability tiers. A
consultant opens it, ticks the challenges an RFP points to, and exports a heat
map, a roadmap and a branded PDF. See `README.md` for the domain model.

The repository is a **source tree that compiles to one standalone HTML file**:

- `src/index.html` + `src/css/` + `src/js/` + `content/` is what you edit.
- `dist/Automotive_AM_PricingExplorer_v<version>.html` is the only runnable
  artefact — it opens from `file://`, with no server and no network.

There is deliberately **no dev server**. Edit, `python tools/build.py`, reopen.
`src/index.html` on its own is a template and renders a "not built" notice.

## Hard rules

1. **Never edit anything in `dist/`.** It is generated. Change the source and
   rebuild.
2. **Never put subject-matter content in JS or HTML.** Steps, challenges, use
   cases, personas and the technical recommendations live in `content/*.json`.
   If you find yourself typing a challenge title into a `.js` file, stop.
3. **Anonymisation is non-negotiable.** No client names and no client-specific
   system or process terms anywhere in `content/`, `src/` or `tests/` —
   including code comments. The exclusion list is in
   `HANDOFF_Vistex_Aftermarket_Explorer.md`. Sweep before shipping a build.
4. **Do not add a framework, a bundler or npm runtime dependencies.** The tool
   must keep building with Python alone and running offline from `file://`.
   `jsdom` is a dev dependency for tests only.
5. **Run `npm test` after any change to `src/` or `content/`**, and
   `python tools/pdfcheck.py` after any change that touches the report or print
   CSS.

## Architecture

```
content/*.json  →  (inlined by build.py as window.__APP_CONTENT__)
                        ↓
                   content.js (read + validate + index)
                        ↓
                   state.js (session, persistence, derived counts and groupings)
                        ↓  onChange
                   main.js → renderAll()
                        ↓
      views/matrix · views/explainer · views/heatmap · views/roadmap · views/technology
                        ↓
                   report.js (print/PDF)
```

**One re-render path.** Views never call each other's render functions and never
mutate state directly. They call a mutator in `state.js`, which persists and
notifies subscribers; `main.js` subscribes `renderAll()`, and `shell.js`
subscribes the nav's engagement-name display. Anything that must react to a
state change subscribes — do not update it at each call site and miss one.

**View-local UI state stays in the view.** Which explainer step is open, which
roadmap detail is showing, which technology block is expanded: all module-local.
`state.js` holds only the engagement record — the name and the marked challenge
ids.

**`content.js` exports `let`, not `const`.** The bindings are filled in by
`loadContent()`; ES module live bindings mean importers see the real values.
Do not "fix" them to `const`.

**Every surface must say something about the engagement.** Technical
Recommendations & Attention Points reads identically whatever was marked, so it
is shown nowhere: not on the roadmap tab, not in the PDF. Five things are
**parked** — present, commented as such, not called: `renderTechnology()` in
`views/technology.js`, its styles at the end of `roadmap.css`,
`recommendationsPage()` in `report.js`, and the executive-summary cover —
`summaryPage()` (with its helpers `statCol()`, `heaviestPhase()`,
`phaseTable()`) in `report.js` and its styles in the parked block at the end
of `report.css`. The cover was dropped on review feedback so the report opens
on the concentration page. `content/technology.json` stays as the content
source. Do not delete any of it, and do not "helpfully" re-mount it; each file
records how to if it is ever wanted back. Apply the same test to
anything new: if a page or panel would read the same for every engagement, it
does not earn its place.

**The roadmap groups by pricing phase, not by delivery stage.** The five canvas
phases are the same bands that sit above the matrix, so the roadmap continues
the matrix rather than introducing a second taxonomy. Diagnose / Transform /
Execute still exists — it is derived from a challenge's logic layer and shown on
the challenge detail (`stageOfLayer` in `state.js`). Do not promote it back to
the top-level grouping.

## The bundler's constraints

`tools/build.py` flattens the ES modules into one IIFE by deleting import and
export statements and concatenating. That works only because of three rules,
each enforced with a hard build error:

- **Dependency order** is declared in `JS_MODULES` in `build.py`. Add a new
  module there as well as importing it normally.
- **Top-level names must be globally unique** across all modules — everything
  ends up in one scope.
- **Only plain import/export forms.** `import { a } from './x.js'` and
  `export const|let|var|function|class`. No `export default`, no `export *`, no
  renaming (`import { a as b }`). To use a different name, rename it at source.

Same for CSS: a new stylesheet goes both in the `<link>` list in
`src/index.html` **and** in `CSS_FILES` in `build.py`, in the same position.

`python tools/build.py --check` validates all of this without writing anything.

## Print and PDF rules

These caused real, silent bugs. Do not undo them.

- **Page numbers come from `@page` margin boxes**, in a `<style>` that
  `report.js` generates (`pageRule`), using `counter(page)`/`counter(pages)`.
  Blink supports this. An earlier version counted pages in JS and was wrong the
  moment any section overflowed.
- **Never write an unqualified `@media (max-width: …)` for anything that
  prints.** Such a query also matches while printing, where the width in play is
  the browser window's, not the paper's — a narrow window reflowed the report
  and silently added pages. Use `@media screen and (max-width: …)`.
- **`base.css` sets `html,body{height:100%}` for the app shell.** `report.css`
  resets it for print; leave that reset in.
- **Each `.rpt-page` section must fit inside 186mm** (A4 landscape less the 12mm
  margins) or it spills onto a second sheet and the one-topic-per-sheet house
  style breaks. `tools/pdfcheck.py` measures this.
- The engagement name is interpolated into a CSS `content:"…"` literal, so
  quotes and backslashes are stripped in `pageRule`. The test covers it.

## Conventions

- **Styling**: `src/css/tokens.css` holds every colour, font stack and shadow.
  Reach for a token before writing a hex value. The shell chrome (`--shell*`)
  and the tool surfaces (`--navy`, `--teal`, …) are deliberately separate
  palettes.
- **Three font stacks on purpose**: `--font-ui` (Inter) for the shell chrome,
  `--font-body` (system UI stack) for the tool and the report, and
  `--font-figure` (Consolas first) for figures and tracked labels in the PDF.
  The report avoids webfonts so print output is stable offline.
- **Rendering** is template strings into `innerHTML`. That is the existing idiom
  — match it rather than introducing another. Run anything the user typed, and
  everything that reaches the report, through `esc()` from `util.js`.
- **Comments explain why, not what.** Each module has an intent header; keep
  that density.
- **`STORAGE_KEY` in `config.js` must not change casually.** Renaming it orphans
  every session already auto-saved in a colleague's browser. If a breaking
  session-format change is unavoidable, bump `SESSION_FORMAT` and migrate in
  `applySnapshot()`.

## Commands

```bash
python tools/build.py          # -> dist/
python tools/build.py --open   # build and open in the browser
python tools/build.py --check  # validate sources, write nothing
npm test                       # jsdom smoke test, module tree + built file
npm test dev                   # one target only
python tools/pdfcheck.py       # render the PDF and check pagination
```

## Gotchas

- jsdom has no layout engine, so `npm test` can check what the report says but
  not how it paginates. That is `pdfcheck.py`'s job — run it for report changes.
- jsdom does not execute `<script type="module">`, which is why the `dev` test
  target strips the script tag and imports `main.js` through Node, injecting the
  content payload the same way the build does.
- The PDF relies on the browser print dialog with **Background graphics**
  enabled. Without it the heat map prints white.
- `main.py` at the repository root is an unrelated PyCharm scaffold file.
