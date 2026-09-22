# HANDOFF MEMORY — Vistex Aftermarket Pricing Explorer
*Use this to seed a new chat or Project. Everything needed to continue is below.*

---

## 1. WHO / CONTEXT
- **You:** Ruud Schmeink, Managing Partner, Navoniq Group BV (pricing strategy & profit optimization consultancy, Eindhoven).
- **Engagement:** Navoniq is strategic advisory partner to **Vistex** (SAP-native pricing/rebate software). This work supports Vistex's aftermarket-parts pricing go-to-market (GTM).
- **Brand to use for this tool:** Vistex skin — VISTEX_BLUE `#003B5C`, teal `#008CA8`. (Distinct from Navoniq's own navy `#0E2841` / teal `#4698A5`.)

---

## 2. WHAT WAS BUILT (the deliverable)
**File:** `/mnt/user-data/outputs/Vistex_Aftermarket_Pricing_Explorer.html`
A single self-contained, Vistex-branded interactive HTML tool — a workshop/advisory instrument that maps the end-to-end aftermarket pricing process, lets a facilitator mark client pain points, and produces a heat map + roadmap + branded PDF.

### Structure (THIS IS THE CURRENT SPINE — v2, 9-step)
- **Horizontal axis = 9 process steps** (replaced an earlier 5-phase version):
  1. Price Structure Definition
  2. Initial Price Creation
  3. Central Price Adjustments
  4. HQ → Country Handover
  5. Market Price Derivation
  6. Market Price Changes
  7. Campaigns & Special Prices
  8. Price Publication & Distribution
  9. Audit, History & Compliance
- **Two header bands above the steps:**
  - **5-phase "pricing canvas" grouping band** (Price Strategy / Setting / Steering / Execution / Transactions) spanning grouped step-columns. Mapping: s1→strategy; s2,s3→setting; s4,s5→steering; s6,s7→execution; s8,s9→transactions.
  - **Ownership band:** HQ / Countries / HQ+Countries per step (renamed from AG/Market). Steps 1–4 = HQ; 5–7 = Countries; 8–9 = HQ+Countries.
- **Vertical axis = 3 capability tiers:** Advanced Optimisation (Pricing AI & Analytics) / Integrated Management (Business Management) / Foundational Operations (Pricing Officers).
- **Matrix = 9 steps × 3 tiers = 27 cells.**
- **Logic layers (color chips):** 🔵 D = Data/Modelling/Optimisation; 🟢 S = Steering/Management/Monitoring; 🟠 O = Operational Processing/Integration.

### Features (all working, QA'd, no JS errors)
1. **Process Matrix** — click a CELL → best-practice **explainer panel** appears below; click a STEP HEADER → jumps to challenge drawer.
2. **Explainer panel** (per cell): summary, tier lens, best-practice workflow (numbered), personas (9 defined), Vistex capability, and **clickable reference use cases** that expand into a **3D detail card** (purpose, process flow, actors, trigger, inputs, outputs, "why it matters").
3. **Challenge drawer** — tickable challenge library (~51 challenges, codes C101–C905, re-tagged to the 9 steps). Drawer closes via a **bottom "Close" button** (top-X was removed) + live count.
4. **Pain Heat Map** — 9-step × 3-tier teal-intensity grid with step totals.
5. **Priority Roadmap** — marked challenges auto-sequenced into Diagnose (D-layer) → Transform (S-layer) → Execute (O-layer), with summary strip.
6. **Technology & Integration** — full-width section below the roadmap boxes AND at end of PDF. Two columns: (1) Functional Capabilities (real-life client data, functional performance/forecast precision, requirement-overlap), (2) System Integration & Performance (SAP & non-SAP integration points, IT-security, job runtimes, frequencies/planning cycles).
7. **Persistence:** auto-save to localStorage + window.storage; **Save session (.json)** download + **Load session** upload for portability. (Earlier bug: relied only on window.storage which is undefined in standalone/downloaded file → fixed.)
8. **Export PDF report** — built-in branded print-to-PDF (engagement name, summary, heat map table, challenges by step, roadmap, Technology & Integration). Page-breaks tuned (no orphaned headings, no split bullets, sections flow). Reminder: enable "Background graphics" in print dialog.

### 9 personas defined
Pricing Strategy Lead, Product/Portfolio Pricing Manager, Pricing Analyst, Market/Country Pricer, Key Account/Sales Manager, Controller/Finance, Data Science/Optimisation, Pricing Operations/IT, System Admin/Key User.

---

## 3. CRITICAL RULE — ANONYMISATION
**All content is generalised and traceable to NO source client.** The challenge library, use cases, and Technology & Integration text are composed from 5 RFPs but fully anonymised. Specifically REMOVED and must stay out:
- Client names: BMW, Honda (HMEL), Volvo CE, Knorr-Bremse/Bendix, Volkswagen, **Porsche/"PAG"**.
- Client system/term tokens: ATLAS, Faktura, Herstellkosten, Neuteil, Kampagnenpreismanagement, Pfandpreis, Marktpreiskalkulation, Arbeitsvorräten.
- "PAG" (Porsche AG) must be rendered generically as "the client's production data" / "the client requirement landscape."
- Even code comments were scrubbed. Always run an anonymity sweep before shipping.

---

## 4. SOURCE RFP CORPUS (mined, all in /mnt/user-data/uploads/)
Generalised, never named in outputs. Cross-RFP convergence = the GTM thesis (same pains recur across all 5: multi-tier price cascade, cost-change responsiveness, margin-floor/corridor governance, segmentation, competitive web-scraping, pre-release simulation, approval workflow, audit trail 10–15yr, kits/BOM/supersession, FX/multi-currency, AI/ML guidance, SAP/ERP+S/4HANA integration).
- `RfP_Apollo_Revenue_Management_SW.pdf` (Knorr-Bremse) + `Atachment_1_Knorr_Bremse_Business_Requirements_Catalogue...xlsx` (91 business reqs, 9 modules)
- `VW__GlobalPricingSystem_approved_1_.pdf` (15 capabilities, 4 groups, weighted)
- `VOLVO_Construction_RFI_Parts_Price_1_.xlsx` (15 requirement areas)
- `HONDA_250703_Vendor_RFP_-_User_stories_1_.pdf` (5 use cases, ~40 FRs, ELP→CLP→DN→HCP waterfall)
- `BMW_AM_Parts_Process_Mapping_v00127012026.pptx` (source of the 9-step process; the Vistex 5-phase canvas slide)

---

## 5. CURRENT OPEN TASK — PowerPoint teaser deck
**Goal:** A short PPTX "teaser" (NOT a full manual) explaining the HTML tool in a few slides.
**Decisions already made:**
- **5–6 slides.**
- Audience: **both/flexible** (Vistex internal enablement + client-facing).
- **Embed real screenshots** of the tool (capture from the HTML: matrix, explainer + 3D use-case card, heat map, roadmap + Technology & Integration band).
- **Use the Vistex template:** `/mnt/user-data/uploads/BMW_AM_Parts_Process_Mapping_v00127012026.pptx` (5 slides, 16:9, 12192000×6858000 EMU). Extract its theme/master/layouts/logo placement and build on top of it. NOTE: confirm with Ruud this is the intended template (it's the BMW process-mapping deck, which is the Vistex-styled file in this corpus).

**Not yet started:** the deck itself.

### Suggested teaser flow (proposed, adjust with Ruud)
1. Cover / title — "Aftermarket Pricing Explorer" + one-line positioning.
2. The problem — aftermarket pricing pain is universal & repeatable (the cross-RFP thesis).
3. The tool at a glance — the 9-step × 3-tier matrix screenshot + what it does.
4. How it works — explainer + 3D use-case card + tick challenges (screenshot).
5. The output — heat map + prioritised roadmap (screenshot).
6. Close — Technology & Integration depth + call to action.

---

## 6. PROJECT / NEW-CHAT NOTES
- Ruud asked to turn this chat into a Project — that's done from the Claude app sidebar (assistant can't convert a chat). Start a new Project, then paste/upload this handoff file to seed it. The uploaded RFPs, the template PPTX, and the delivered HTML persist in outputs/uploads and can be re-referenced.
- **Toolchain note (Ruud's standard):** pptxgenjs (Node) for PowerPoint, python-pptx also fine; LibreOffice/pdftoppm for visual QA; puppeteer for HTML screenshots (chrome at /home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome). A Navoniq house-style skill exists at /mnt/skills/user/navoniq-pptx/ but THIS tool/deck uses the **Vistex** skin, not Navoniq.

---

## 7. KEY FILE PATHS
- **Deliverable (tool):** `/mnt/user-data/outputs/Vistex_Aftermarket_Pricing_Explorer.html`
- **Vistex template for deck:** `/mnt/user-data/uploads/BMW_AM_Parts_Process_Mapping_v00127012026.pptx`
- **RFPs:** `/mnt/user-data/uploads/` (see §4)
- **This handoff:** `/mnt/user-data/outputs/HANDOFF_Vistex_Aftermarket_Explorer.md`
