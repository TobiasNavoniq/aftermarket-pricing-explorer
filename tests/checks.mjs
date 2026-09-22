/* ==========================================================================
   Shared assertions

   Driven against a booted jsdom window by both harnesses in smoke.mjs, so the
   dev tree (ES modules + fetch) and the built single file are held to exactly
   the same behaviour. If they ever diverge, the bundler is wrong.

   These are behavioural checks, not unit tests: they click the real buttons
   and read the real DOM.
   ========================================================================== */

export async function runChecks(window, errors, warns) {
  const document = window.document;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const click = el => el.dispatchEvent(new window.Event('click', { bubbles: true }));

  const checks = [];
  const ok = (name, cond, extra = '') => checks.push({ name, pass: !!cond, extra });

  /* ---- boot ---- */
  ok('no script errors on load', errors.length === 0, errors.join(' | '));
  ok('no content-validation warnings', warns.length === 0, warns.join(' | '));
  ok('welcome screen visible', $('#ttWelcome').style.display !== 'none');
  ok('app body hidden', $('#ttAppBody').style.display === 'none');
  ok('canvas overview rendered from JSON', $$('#ttCanvasGrid .tt-cs-card').length === 9,
    'cards=' + $$('#ttCanvasGrid .tt-cs-card').length);
  ok('canvas card 4 shows Market Handover', /Market Handover/.test($$('#ttCanvasGrid .tt-cs-name')[3].textContent));
  ok('version stamp set', /^v\d+\.\d+\.\d+ /.test($('#verStamp').textContent), $('#verStamp').textContent);

  /* ---- matrix ---- */
  ok('9 step header cards', $$('#matrix .step-card').length === 9);
  ok('27 matrix cells', $$('#matrix .cell').length === 27, 'cells=' + $$('#matrix .cell').length);
  ok('canvas band has 5 phases', $$('#matrix .canvas-band .canvas-cell').length === 5);
  ok('ownership band has 9 pills', $$('#matrix .owner-band .owner-pill').length === 9);
  ok('live count starts at 0', $('#liveCount').textContent === '0');

  /* ---- start an engagement ---- */
  $('#ttWelcomeEng').value = 'Acme Motors RFP 2026';
  click($('#ttStartBtn'));
  ok('engagement started', $('#ttAppBody').style.display === '' && $('#ttWelcome').style.display === 'none');
  ok('engagement name in nav', $('#ttEngDisplay').textContent === 'Acme Motors RFP 2026', $('#ttEngDisplay').textContent);
  ok('engagement persisted to localStorage',
    JSON.parse(window.localStorage.getItem('thinktrooper_workshop_v1')).client === 'Acme Motors RFP 2026');

  /* ---- explainer ---- */
  click($$('#matrix .cell:not(.empty)')[0]);
  ok('explainer opens', $('#explainer').classList.contains('show'));
  ok('explainer has challenges', $$('#exChallenges .challenge').length > 0,
    'n=' + $$('#exChallenges .challenge').length);
  ok('explainer has workflow steps', $$('#explainer .ex-steps li').length === 4);
  ok('explainer has personas', $$('#explainer .persona').length > 0);
  ok('explainer has use cases', $$('#explainer .uc[data-uc]').length > 0);

  click($$('#explainer .uc[data-uc]')[0]);
  ok('use-case card opens', $('#ucDetail').classList.contains('show'));
  ok('use-case card has a process flow', $$('#ucDetail .uc3d-flow li').length > 0);
  const ucCode = $('#ucDetail .uc3d-code').textContent;

  /* ---- marking challenges ---- */
  const before = $$('#exChallenges .challenge').length;
  $$('#exChallenges .challenge').slice(0, 3).forEach(click);
  ok('live count is 3', $('#liveCount').textContent === '3', 'got ' + $('#liveCount').textContent);
  ok('explainer survived the re-render', $$('#exChallenges .challenge').length === before);
  ok('use-case card stayed open across the re-render',
    $('#ucDetail').classList.contains('show') && $('#ucDetail .uc3d-code').textContent === ucCode);
  ok('3 challenges marked in the explainer', $$('#exChallenges .challenge.on').length === 3);
  ok('matrix cell shows its tick badge', $$('#matrix .cell.has-ticks').length > 0);

  click($$('#explainer .ex-tier-filter .tf')[1]);
  ok('tier filter narrows the list', $$('#exChallenges .challenge').length <= before);
  click($$('#explainer .ex-tier-filter .tf')[0]);

  /* ---- heat map ---- */
  click($$('.tt-stage-tab')[1]);
  ok('heatmap panel active', $('#panel-heatmap').classList.contains('active'));
  ok('heatmap has 27 cells', $$('#heatmap .hm-cell').length === 27, 'n=' + $$('#heatmap .hm-cell').length);
  ok('heatmap step totals sum to 3',
    $$('#heatmap .hm-tot .v').reduce((a, e) => a + (+e.textContent), 0) === 3);
  ok('heatmap empty state cleared', $('#hmEmpty').innerHTML === '');

  /* ---- roadmap: five pricing phases ---- */
  click($$('.tt-stage-tab')[2]);
  ok('roadmap panel active', $('#panel-roadmap').classList.contains('active'));
  ok('roadmap has 5 phase columns', $$('#roadmap .road-col').length === 5,
    'n=' + $$('#roadmap .road-col').length);
  ok('phase columns are in canvas order',
    $$('#roadmap .rh-name').map(e => e.textContent).join('|') ===
    'Price Strategy|Price Setting|Price Steering|Price Execution|Price Transactions',
    $$('#roadmap .rh-name').map(e => e.textContent).join('|'));
  ok('roadmap lists 3 items', $$('#roadmap .ritem').length === 3, 'n=' + $$('#roadmap .ritem').length);
  ok('phase counts add up to 3',
    $$('#roadmap .rh-count').reduce((a, e) => a + (+e.textContent), 0) === 3);
  ok('summary strip shows the total', $('#prioSummary .ps-item .v').textContent === '3');
  ok('summary strip has total + 5 phases + steps in scope', $$('#prioSummary .ps-item').length === 7,
    'n=' + $$('#prioSummary .ps-item').length);
  ok('earlier stage tabs marked complete', $$('.tt-stage-tab.complete').length === 2);
  ok('detail panel starts closed', !$('#roadDetail').classList.contains('show'));

  /* ---- click a phase header ---- */
  const filledPhases = $$('#roadmap .road-col').filter(c => +c.querySelector('.rh-count').textContent > 0);
  const firstFilled = filledPhases[0];
  click(firstFilled.querySelector('.road-head'));
  ok('phase detail opens', $('#roadDetail').classList.contains('show'));
  ok('phase detail is a phase', $('#roadDetail .rd-eyebrow').textContent === 'Pricing phase',
    $('#roadDetail .rd-eyebrow').textContent);
  ok('phase detail lists its steps', $$('#roadDetail .rd-step').length > 0);
  ok('phase detail shows challenge descriptions', $$('#roadDetail .rd-jump-d').length > 0);
  ok('clicked phase header marked active', firstFilled.querySelector('.road-head').classList.contains('on'));

  /* ---- jump from the phase detail into a challenge ---- */
  click($$('#roadDetail .rd-jump')[0]);
  ok('challenge detail opens', /^Challenge C/.test($('#roadDetail .rd-eyebrow').textContent),
    $('#roadDetail .rd-eyebrow').textContent);
  ok('challenge detail names its step', /Process step/.test($('#roadDetail').textContent));
  ok('challenge detail shows the delivery stage', /Delivery stage/.test($('#roadDetail').textContent));
  ok('challenge detail lists reference use cases', $$('#roadDetail .rd-uc').length > 0);
  ok('phase header no longer active', $$('#roadmap .road-head.on').length === 0);
  ok('clicked challenge marked active', $$('#roadmap .ritem.on').length === 1);

  /* ---- clicking a challenge directly, and closing ---- */
  click($$('#roadmap .ritem')[2]);
  ok('a different challenge opens', $$('#roadmap .ritem.on').length === 1);
  click($$('#roadmap .ritem')[2]);
  ok('clicking the open item again closes the detail', !$('#roadDetail').classList.contains('show'));

  /* ---- technical recommendations accordion ---- */
  ok('tech recs render as an accordion', $$('#techIntegration .ti-block').length === 3,
    'n=' + $$('#techIntegration .ti-block').length);
  ok('tech recs start collapsed', $$('#techIntegration .ti-block.open').length === 0);
  click($$('#techIntegration .ti-btn')[0]);
  ok('clicking a heading expands it', $$('#techIntegration .ti-block.open').length === 1);
  ok('expanded block shows its items', $$('#techIntegration .ti-block.open .ti-item').length > 0);
  click($$('#techIntegration .ti-btn')[0]);
  ok('clicking again collapses it', $$('#techIntegration .ti-block.open').length === 0);

  /* ---- print report ---- */
  click($('#pdfBtn'));
  await new Promise(r => setTimeout(r, 120));
  const rpt = $('#reportMount');
  const pages = [...rpt.querySelectorAll('.rpt-page')];
  ok('report built', rpt.querySelector('.rpt-h1') !== null);
  ok('report names the engagement', /Acme Motors RFP 2026/.test(rpt.textContent));
  ok('report is summary + concentration + one page per phase in scope + recommendations',
    pages.length === 2 + filledPhases.length + 1,
    'pages=' + pages.length + ' phases=' + filledPhases.length);

  /* Page numbering is done by the browser via @page margin boxes, so what the
     test can check is that the rule was generated correctly, not the output. */
  const pageStyle = rpt.querySelector('style');
  ok('report generates an @page rule', pageStyle !== null);
  ok('@page sets A4 landscape', /@page\{size:A4 landscape/.test(pageStyle.textContent));
  ok('@page numbers pages with real counters',
    /counter\(page\)/.test(pageStyle.textContent) && /counter\(pages\)/.test(pageStyle.textContent));
  const footerLiteral = (pageStyle.textContent.match(/@bottom-left\{content:"([^"]*)"/) || [])[1];
  ok('@page running footer is a well-formed string literal', footerLiteral !== undefined,
    pageStyle.textContent.slice(0, 160));
  ok('@page running footer names the engagement',
    /ACME MOTORS RFP 2026/.test(footerLiteral || ''), footerLiteral);

  ok('exhibits are numbered continuously',
    [...rpt.querySelectorAll('.rpt-ex-n')].every((e, i) => e.textContent === 'EXHIBIT ' + (i + 1)),
    [...rpt.querySelectorAll('.rpt-ex-n')].map(e => e.textContent).join(' | '));
  ok('report has an executive summary headline', /concentrates in Price/.test(rpt.textContent));
  ok('report has 4 stat columns', rpt.querySelectorAll('.rpt-stat').length === 4);
  ok('report heat-map table has 3 tier rows + total', rpt.querySelectorAll('.rpt-hm tbody tr').length === 4);
  ok('report shows all 5 phases in the distribution', rpt.querySelectorAll('.rpt-phase').length === 5);
  ok('report ranks the steps in scope', rpt.querySelectorAll('.rpt-rank tbody tr').length >= 1);
  ok('report lists the marked challenges', rpt.querySelectorAll('.rpt-ch').length === 3);
  ok('report has technical recommendations', rpt.querySelectorAll('.ti-print-block').length === 3);
  ok('report masthead logo present', rpt.querySelector('.rpt-masthead') !== null);
  ok('report never says "0 operational processing"', !/\b0 (data|steering|operational)/.test(rpt.textContent),
    (rpt.textContent.match(/\b0 (data|steering|operational)[a-z ]*/) || [])[0]);
  window.dispatchEvent(new window.Event('afterprint'));
  ok('printing class removed after print', !document.body.classList.contains('printing'));

  /* ---- load a session file, with a name that would break the @page rule ----
     The engagement name is interpolated into a CSS content:"..." literal, so a
     quote or a backslash in it must not escape. Round-tripping it through the
     real .json import is also the only coverage of session loading. */
  const nasty = 'Bl\\ack "Forest" Motors \u2014 RFP 2026';
  const file = new window.File(
    [JSON.stringify({ v: 3, client: nasty, selected: { C101: true, C302: true } })],
    'session.json', { type: 'application/json' });
  const input = $('#loadFileInput');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 120));

  ok('session file loads the engagement name', $('#ttEngDisplay').textContent === nasty,
    $('#ttEngDisplay').textContent);
  ok('session file loads the selections', $('#liveCount').textContent === '2',
    $('#liveCount').textContent);
  ok('loaded session re-renders the roadmap', $$('#roadmap .ritem').length === 2);

  click($$('.tt-stage-tab')[2]);
  click($('#pdfBtn'));
  await new Promise(r => setTimeout(r, 120));
  const style2 = $('#reportMount').querySelector('style');
  const literal2 = (style2.textContent.match(/@bottom-left\{content:"([^"]*)"/) || [])[1];
  ok('@page rule survives quotes and backslashes in the name', literal2 !== undefined,
    style2.textContent.slice(0, 200));
  ok('quotes and backslashes are stripped from the footer',
    literal2 !== undefined && !/["\\]/.test(literal2) && /FOREST/.test(literal2), literal2);
  ok('the engagement name itself is not mangled in the report body',
    $('#reportMount').querySelector('.rpt-h1').textContent === nasty,
    $('#reportMount').querySelector('.rpt-h1').textContent);
  window.dispatchEvent(new window.Event('afterprint'));

  /* ---- reset selections ---- */
  $('#ttWelcomeEng').value = '';
  click($$('.tt-stage-tab')[0]);
  click($('#resetBtn'));
  ok('reset clears the ticks', $('#liveCount').textContent === '0');
  ok('reset keeps the engagement name', $('#ttEngDisplay').textContent === nasty,
    $('#ttEngDisplay').textContent);
  ok('heatmap shows its empty state again', /No challenges marked yet/.test($('#hmEmpty').textContent));

  /* ---- new engagement ---- */
  click($('#ttNewEng'));
  await new Promise(r => setTimeout(r, 50));
  ok('new engagement returns to the welcome screen',
    $('#ttWelcome').style.display === '' && $('#ttAppBody').style.display === 'none');
  ok('new engagement clears the name', $('#ttEngDisplay').textContent === 'No engagement');
  ok('new engagement wipes storage', window.localStorage.getItem('thinktrooper_workshop_v1') === null,
    String(window.localStorage.getItem('thinktrooper_workshop_v1')));

  const failed = checks.filter(c => !c.pass);
  checks.forEach(c => console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (!c.pass && c.extra ? '  -> ' + c.extra : '')));
  console.log(`\n  ${checks.length - failed.length}/${checks.length} passed`);
  return failed.length;
}
