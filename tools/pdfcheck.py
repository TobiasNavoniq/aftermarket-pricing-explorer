#!/usr/bin/env python3
"""
Render the PDF report with headless Chrome and check it paginated correctly.

The jsdom smoke test in tests/ has no layout engine, so it can check what the
report *says* but not how it lands on paper. This does the other half: it drives
a real Chrome, prints to PDF, and asserts one sheet per report section.

Two bugs that only this catches, both of which shipped silently before:
  * an unqualified `@media (max-width: ...)` query also matches while printing,
    where the width in play is the browser window's, not the paper's -- a narrow
    window reflowed the report and added pages;
  * a section that grows past the 186mm printable height splits in two, so the
    house-style "one topic per sheet" quietly stops holding.

It runs the build first, seeds a session into localStorage, clicks the export
button and prints at several window widths. Page numbering itself comes from
@page counters, so it is correct by construction -- what is checked here is the
page *count*.

Usage:
    python tools/pdfcheck.py            # build, render, check
    python tools/pdfcheck.py --keep     # also leave the PDF for inspection

Needs Chrome (or Edge) and `pip install pypdf`. Exits 0 and says so if neither
is available, so it can sit in a pipeline without becoming a hard dependency.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

# A spread of challenges that puts something in every pricing phase, so the
# report exercises every page type.
SAMPLE = [
    "C101", "C103", "C105", "C107", "C202", "C206", "C208", "C211",
    "C302", "C303", "C306", "C402", "C403", "C501", "C503", "C505",
    "C507", "C601", "C604", "C702", "C705", "C707", "C801", "C803",
    "C902", "C904",
]
SAMPLE_CLIENT = "Northwind Commercial Vehicles \u2014 Global Parts Pricing RFP 2026"

# Window widths to print at. The narrow one is the regression guard.
WIDTHS = [800, 1280, 1920]

PRINTABLE_MM = 186  # A4 landscape (210mm) less the 12mm top and bottom margins


def find_chrome() -> str | None:
    for path in CHROME_CANDIDATES:
        if Path(path).exists():
            return path
    return None


def newest_build() -> Path:
    builds = sorted((ROOT / "dist").glob("*.html"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not builds:
        sys.exit("ERROR: no build in dist/ -- run: python tools/build.py")
    return builds[0]


def make_harness(build: Path, out: Path) -> Path:
    """The built file with a session seeded and the export button auto-clicked."""
    html = build.read_text(encoding="utf-8")
    seed = (
        "<script>(function(){localStorage.setItem('thinktrooper_workshop_v1',"
        + json.dumps(json.dumps({"client": SAMPLE_CLIENT,
                                 "selected": {c: True for c in SAMPLE}}))
        + ");window.print=function(){};})();</script>"
    )
    trigger = (
        "<script>setTimeout(function(){"
        "document.getElementById('pdfBtn').click();},400);</script></body>"
    )
    html = html.replace("<body>", "<body>" + seed, 1).replace("</body>", trigger, 1)
    out.write_text(html, encoding="utf-8")
    return out


def render(chrome: str, harness: Path, pdf: Path, width: int) -> None:
    subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox",
         f"--window-size={width},900", "--virtual-time-budget=9000",
         "--no-pdf-header-footer", f"--print-to-pdf={pdf}", harness.as_uri()],
        check=True, capture_output=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--keep", action="store_true", help="keep the rendered PDF and print its path")
    args = ap.parse_args()

    chrome = find_chrome()
    if not chrome:
        print("SKIP  no Chrome or Edge found; pagination not checked")
        return
    try:
        import pypdf
    except ImportError:
        print("SKIP  pypdf not installed (pip install pypdf); pagination not checked")
        return

    subprocess.run([sys.executable, str(ROOT / "tools" / "build.py")], check=True)
    build = newest_build()
    print(f"  rendering {build.name} with {Path(chrome).name}")

    tmp = Path(tempfile.mkdtemp(prefix="apepdf_"))
    harness = make_harness(build, tmp / "harness.html")

    # 1 executive summary + 1 concentration + one page per pricing phase in scope.
    phases = {json.loads((ROOT / "content" / "taxonomy.json").read_text(encoding="utf-8"))
              ["steps"][int(c[1]) - 1]["canvas"] for c in SAMPLE}
    expected = 2 + len(phases)

    failures = []
    for width in WIDTHS:
        pdf = tmp / f"report_{width}.pdf"
        render(chrome, harness, pdf, width)
        reader = pypdf.PdfReader(str(pdf))
        pages = len(reader.pages)

        box = reader.pages[0].mediabox
        landscape = float(box.width) > float(box.height)
        # No \b after the total: in the extracted stream the running footer text
        # butts straight up against it ("PAGE 1 OF 8RFP & PRICING ..."), and
        # digit-then-letter is not a word boundary.
        numbering = [bool(re.search(rf"PAGE {i + 1} OF {pages}(?!\d)", page.extract_text()))
                     for i, page in enumerate(reader.pages)]

        status = "ok " if pages == expected and landscape and all(numbering) else "FAIL"
        print(f"  {status} window {width:>4}px -> {pages} pages "
              f"(expected {expected}), landscape={landscape}, numbering={'ok' if all(numbering) else 'BROKEN'}")
        if pages != expected:
            failures.append(f"{width}px produced {pages} pages, expected {expected} "
                            f"(a section overran the {PRINTABLE_MM}mm printable height, "
                            f"or a media query reflowed the report)")
        if not landscape:
            failures.append(f"{width}px produced portrait pages")
        if not all(numbering):
            failures.append(f"{width}px has wrong page numbering on page(s) "
                            + ", ".join(str(i + 1) for i, okay in enumerate(numbering) if not okay))

    if args.keep:
        print(f"  PDFs kept in {tmp}")

    if failures:
        print("\nFAILED:")
        for f in failures:
            print("  - " + f)
        sys.exit(1)
    print(f"\nOK  report paginates to {expected} pages at every window width")


if __name__ == "__main__":
    main()
