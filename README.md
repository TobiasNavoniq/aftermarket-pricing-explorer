# Aftermarket Pricing Explorer

**ThinkTrooper · Aftermarket Pricing Explorer**

An internal diagnostic for analysing an OEM's aftermarket (spare-parts) pricing
process or an incoming RFP. It maps the process across **9 steps × 3 capability
tiers**, lets you mark which challenges the RFP points to, and turns that into a
pain heat map, a roadmap across the five pricing phases, and a branded PDF
report.

> **Internal tool.** It is never shown to the OEM. All content is generalised
> and traceable to no source client — see [Anonymisation](#anonymisation).

---

## Quick start

| I want to… | Do this |
| --- | --- |
| **Use** the tool | Open the newest file in `dist/` — double-click, no install, no server, no network. |
| **Change** content or code | Edit `content/*.json`, `src/css/*` or `src/js/*`, then `python tools/build.py` |
| **Change and see it** | `python tools/build.py --open` — builds and opens it in the browser |
| **Check** nothing is broken | `npm test` (behaviour) and `python tools/pdfcheck.py` (PDF layout) |

There is no dev server and nothing to install to build. The tool is **one
self-contained HTML file**: the build inlines the CSS, the JS, the content JSON
and the logo into a single page that runs from a `file://` URL. Edit, rebuild,
reopen — that is the whole loop, and Python 3 is all it needs.

```bash
python tools/build.py          # -> dist/Automotive_AM_PricingExplorer_v<version>.html
python tools/build.py --open   # ...and open it
python tools/build.py --check  # validate the sources, write nothing
```

`src/index.html` is the build's **template**, not a runnable page. Opening it
directly shows a "this file was not built" notice.

---

## Repository layout

```
content/                Editable subject-matter content — the part that changes most.
  taxonomy.json           Tiers, logic layers, the 5 canvas phases, owners, the 9 steps,
                          delivery stages, personas, tier lenses.
  challenges.json         The challenge library (C101…C905).
  step-content.json       Per-step explainer copy: summary, workflow, personas.
  use-cases.json          Reference use cases U01…U25.
  technology.json         Technical recommendations & attention points.
src/index.html          Page structure and narrative copy. Build template, not runnable.
src/css/                One stylesheet per concern, loaded in cascade order.
src/js/                 ES modules.
  config.js               Version, storage key, logo path.
  content.js              Reads + validates the inlined content, exposes lookups.
  state.js                Session state, persistence, derived counts and groupings.
  session.js              .json export / import.
  util.js                 esc, toast, small helpers.
  report.js               The print/PDF report.
  shell.js                Nav, welcome screen, tabs, help panel.
  main.js                 Entry point and the single re-render path.
  views/                  matrix, explainer, heatmap, roadmap, technology.
assets/logo.png         Inlined as a data URI at build time.
tools/build.py          Source tree → single standalone HTML.
tools/pdfcheck.py       Renders the PDF with headless Chrome and checks pagination.
tests/                  jsdom smoke test, run against the module tree and the build.
dist/                   Built, shippable files. Never edit these by hand.
```

---

## How the tool works

**Horizontal axis — 9 process steps**

1. Price Structure Definition
2. Initial Price Creation
3. Central Price Adjustments
4. HQ → Market Handover
5. Market Price Derivation
6. Market Price Changes
7. Campaigns & Special Prices
8. Price Publication & Distribution
9. Audit, History & Compliance

Above them sit two header bands: the **5-phase pricing canvas** (Price Strategy
/ Setting / Steering / Execution / Transactions), each spanning its grouped
steps, and an **ownership band** (HQ / Markets / HQ + Markets).

**Vertical axis — 3 capability tiers**

- Advanced Optimisation (Pricing AI & Analytics)
- Integrated Management (Business Management)
- Foundational Operations (Pricing Officers)

**Logic layers** tag every challenge:

| Layer | Meaning | Delivery stage it implies |
| --- | --- | --- |
| 🔵 **D** | Data / Modelling / Optimisation | Diagnose |
| 🟢 **S** | Steering / Management / Monitoring | Transform |
| 🟠 **O** | Operational Processing / Integration | Execute |

Diagnose → Transform → Execute is shown per challenge, not used as the
top-level grouping: the roadmap is organised by pricing phase so it reads as a
continuation of the matrix rather than a second, competing taxonomy.

### The three stages

1. **Process Matrix** — click a cell to open the explainer: what "good" looks
   like at that step and tier, the best-practice workflow, who works on it, and
   the reference use cases. Tick the challenges the OEM's RFP points to, right
   there.
2. **Pain Heat Map** — where the requirements concentrate, by step and tier.
   Shading is relative to the busiest cell in the current session.
3. **Priority Roadmap** — the marked challenges laid out across the five
   pricing phases. Both levels are clickable:
   - a **phase header** opens what that phase covers, the steps it spans, and
     every challenge marked inside it with its description;
   - a **challenge** opens its own detail: where it sits, the delivery stage its
     logic layer implies, what good looks like at that step, and the reference
     use cases that bear on it.

**Technical Recommendations & Attention Points** is no longer shown anywhere —
not on this tab and not in the report. It is engagement-independent boilerplate:
it reads identically whatever you marked, so it told a reader nothing about the
engagement the output is about. The content is still in
`content/technology.json` and both renderers are parked, not deleted, so it can
be brought back in one step — see the notes in `src/js/views/technology.js` and
`src/js/report.js`.

### Sessions

- **Auto-save** to `localStorage`, per browser, per device. Silently unavailable
  in private browsing and some `file://` contexts — the tool detects this and
  says so rather than losing work quietly.
- **Export / Load `.json`** is the reliable record: a few kB holding just the
  engagement name and the marked challenge ids. Use it to move between machines
  or hand an engagement to a colleague.

---

## The PDF report

**Export PDF report** on the Roadmap tab builds a paginated report and opens the
browser's print dialog; choose "Save as PDF". **Enable "Background graphics"**,
or the heat-map shading and the header bars print white.

It follows the ThinkTrooper PDF house style — A4 landscape, tracked uppercase
eyebrows, a headline sentence and a lead paragraph per page, numbered EXHIBIT
blocks and a running footer with `PAGE n OF N`. One section per sheet:

| Page | Content |
| --- | --- |
| 1 | Where the requirements concentrate, the report's intro — **Exhibit 1**: heat map by step × tier, **Exhibit 2**: steps ranked by weight |
| 2…n | One page per pricing phase in scope — marked challenges by step, with a fact strip |

The executive-summary cover that used to open the report is parked, not
deleted: see `summaryPage()` in `src/js/report.js`.

Headline and lead sentences are generated from the marked selections, so the
report states what this engagement actually shows. That is the bar for a page
earning its place: if it would read the same for every engagement, it does not
belong in the report.

`python tools/pdfcheck.py` renders it with headless Chrome and asserts it
paginates to exactly one sheet per section, in landscape, with correct page
numbers, at several browser window widths.

---

## Editing content

Almost every change is a JSON edit, then a rebuild.

| To change… | Edit |
| --- | --- |
| A step's name, owner, phase, welcome blurb | `content/taxonomy.json` → `steps` |
| A phase's name, colour or tint | `content/taxonomy.json` → `canvas` |
| The wording of a challenge | `content/challenges.json` |
| What a step's explainer says | `content/step-content.json` |
| A reference use case | `content/use-cases.json` |
| The technical recommendations | `content/technology.json` |
| Colours, fonts, spacing | `src/css/tokens.css` first — most of it is there |

`content.js` validates the content on every load and logs a console warning for
any unknown step id, tier, layer, persona, use case or duplicate challenge id.
Keep the browser console open while editing; `npm test` fails if any warning
appears.

Adding a challenge, for example:

```json
{
  "id": "C112",
  "step": "s1",
  "t": "Short title shown in the list",
  "d": "One or two sentences describing the pain.",
  "layer": "S",
  "tiers": ["int", "fnd"]
}
```

`id` must be unique, `step` must exist in `taxonomy.json`, `layer` is `D`/`S`/`O`,
and `tiers` are any of `adv`/`int`/`fnd`.

Longer narrative copy — the welcome screen, the help panel — lives in
`src/index.html`, because it is prose rather than structured data.

---

## Testing

```bash
npm install                  # jsdom, once; only needed for the tests
npm test                     # 90 behavioural checks, run twice
npm test dev                 # the ES module tree only
python tools/pdfcheck.py     # PDF pagination, needs Chrome/Edge + pypdf
```

`npm test` boots the tool in jsdom twice — once as real ES modules, once as the
built single file — and runs the same assertions against both, so a bundler bug
surfaces immediately rather than in front of a client. `pdfcheck.py` covers what
jsdom cannot: how the report actually lands on paper.

---

## Releasing

1. Bump `APP.version` in `src/js/config.js` (the single source of truth; the
   build reads it and names the output file after it).
2. `npm test` and `python tools/pdfcheck.py`
3. `python tools/build.py`
4. Hand over the new `dist/Automotive_AM_PricingExplorer_v<version>.html`.

`dist/` also keeps `Automotive_AM_PricingExplorer_v0.2.0-prerefactor.html`, the
original single-file version this repository was restructured from, for
reference only.

---

## Anonymisation

**All content is generalised and traceable to no source client.** The challenge
library, use cases and technical recommendations were composed from five RFPs
and fully anonymised. Client names and client-specific system or process terms
must stay out of `content/`, `src/` and `tests/`, **including comments**.

Run an anonymity sweep before shipping any build. Background and the full
exclusion list are in `HANDOFF_Vistex_Aftermarket_Explorer.md`.

---

## Known gaps

- The engagement name can only be set on the welcome screen. Renaming an
  engagement mid-session means starting a new one.
- The heat map and roadmap have no export of their own; the PDF report is the
  only output format.
- The webfonts load from Google Fonts, so the built file falls back to the
  system UI stack when offline. Everything else works offline, including the
  PDF, which deliberately uses the system stack anyway.
- A pricing phase with an unusually large number of marked challenges can push
  its report page past one sheet. `tools/pdfcheck.py` will catch it.

---

## Browser support

Current Chrome, Edge, Firefox or Safari. The tool is client-side only: nothing
you type or tick leaves the browser, and there is no backend and no tracking.
