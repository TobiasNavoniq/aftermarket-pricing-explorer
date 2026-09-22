#!/usr/bin/env python3
"""
Build the standalone, single-file distribution of the Aftermarket Pricing Explorer.

The source tree is split up so it can be edited (JSON content, separate
stylesheets, ES modules). The only runnable artefact is one self-contained
.html file that opens from a file:// URL -- double-click it, email it, drop it
on a shared drive. No server, no install, no network. This script is the one
step between the two:

  src/index.html + src/css/*.css + src/js/**/*.js + content/*.json + assets/logo.png
      ->  dist/Automotive_AM_PricingExplorer_v<version>.html

src/index.html is a template and is not runnable on its own: it carries no
content and links to nothing that a browser can load off disk.

Steps:
  1. Concatenate the stylesheets, in the order src/index.html links them, into one
     <style> block.
  2. Bundle the ES modules into a single IIFE (see bundle_js below).
  3. Inline the content JSON as window.__APP_CONTENT__, which is the only
     way content.js ever gets its data.
  4. Inline the logo as a base64 data URI.

Usage:
    python tools/build.py              # build
    python tools/build.py --open       # build, then open it in the browser
    python tools/build.py --check      # validate only, write nothing
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# Cascade order. Must match the <link> order in src/index.html.
CSS_FILES = [
    "tokens.css",
    "base.css",
    "shell.css",
    "components.css",
    "matrix.css",
    "explainer.css",
    "heatmap.css",
    "roadmap.css",
    "report.css",
]

# Dependency order: a module may only use names declared above it.
# Add new modules here as well as importing them normally in the source.
JS_MODULES = [
    "config.js",
    "util.js",
    "content.js",
    "state.js",
    "session.js",
    "views/technology.js",
    "views/explainer.js",
    "views/matrix.js",
    "views/heatmap.js",
    "views/roadmap.js",
    "report.js",
    "shell.js",
    "main.js",
]

# Keys here must match the keys applyContent() reads in src/js/content.js.
CONTENT_FILES = {
    "taxonomy": "taxonomy.json",
    "challenges": "challenges.json",
    "stepContent": "step-content.json",
    "useCases": "use-cases.json",
    "technology": "technology.json",
}

LOGO = "assets/logo.png"

IMPORT_RE = re.compile(r"^import\s[\s\S]*?\sfrom\s+['\"][^'\"]+['\"];[ \t]*\n", re.M)
BARE_IMPORT_RE = re.compile(r"^import\s+['\"][^'\"]+['\"];[ \t]*\n", re.M)
EXPORT_LIST_RE = re.compile(r"^export\s*\{[^}]*\}\s*;?[ \t]*\n", re.M)
EXPORT_KEYWORD_RE = re.compile(r"^export\s+(?=(?:default\s+)?(?:const|let|var|function|async|class)\b)", re.M)
DECL_RE = re.compile(r"^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", re.M)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def app_version() -> str:
    """Single source of truth: APP.version in src/js/config.js."""
    m = re.search(r"version:\s*'([^']+)'", read(ROOT / "src/js/config.js"))
    if not m:
        sys.exit("ERROR: could not find APP.version in src/js/config.js")
    return m.group(1)


def bundle_css() -> str:
    parts = []
    for name in CSS_FILES:
        path = ROOT / "src/css" / name
        if not path.exists():
            sys.exit(f"ERROR: missing stylesheet {path}")
        parts.append(f"/* ---- {name} ---- */\n{read(path)}")
    return "\n".join(parts)


def bundle_js() -> str:
    """Flatten the ES modules into one IIFE.

    The modules are concatenated into a single shared scope, so import/export
    statements are simply removed. That works because two rules are enforced:

      * JS_MODULES above is in dependency order;
      * no two modules declare the same top-level name (checked below, and a
        collision is a hard build error rather than a silent overwrite).

    Only the plain forms are supported -- `import { a } from './x.js'` and
    `export const|let|var|function|class`. Default exports, `export * from`
    and renaming (`as`) are not, deliberately: keeping the module style boring
    is what lets the build stay a 200-line script with no npm dependency.
    """
    seen: dict[str, str] = {}
    chunks = []
    for name in JS_MODULES:
        path = ROOT / "src/js" / name
        if not path.exists():
            sys.exit(f"ERROR: missing module {path}")
        src = read(path)

        for m in DECL_RE.finditer(src):
            ident = m.group(1)
            if ident in seen:
                sys.exit(
                    f"ERROR: top-level name '{ident}' is declared in both "
                    f"{seen[ident]} and {name}. The bundle puts every module in "
                    f"one scope, so top-level names must be unique. Rename one."
                )
            seen[ident] = name

        if re.search(r"^export\s+default\b", src, re.M):
            sys.exit(f"ERROR: {name} uses `export default`, which the bundler does not support.")
        if re.search(r"^export\s+\*", src, re.M):
            sys.exit(f"ERROR: {name} uses `export *`, which the bundler does not support.")
        # A renaming import would bundle without complaint and then throw
        # ReferenceError at runtime, so reject it at build time instead.
        for imp in IMPORT_RE.findall(src):
            if re.search(r"\bas\b", imp):
                sys.exit(
                    f"ERROR: {name} renames an import (`... as ...`), which the bundler "
                    f"does not support:\n    {imp.strip()}\n"
                    f"Rename the export at its source instead."
                )

        src = IMPORT_RE.sub("", src)
        src = BARE_IMPORT_RE.sub("", src)
        src = EXPORT_LIST_RE.sub("", src)
        src = EXPORT_KEYWORD_RE.sub("", src)
        chunks.append(f"/* ---- {name} ---- */\n{src.strip()}\n")

    body = "\n".join(chunks)
    return "(function(){\n'use strict';\n\n" + body + "\n})();"


def bundle_content() -> str:
    data = {}
    for key, filename in CONTENT_FILES.items():
        path = ROOT / "content" / filename
        if not path.exists():
            sys.exit(f"ERROR: missing content file {path}")
        try:
            data[key] = json.loads(read(path))
        except json.JSONDecodeError as e:
            sys.exit(f"ERROR: {filename} is not valid JSON: {e}")
    # </script> inside a string literal would close the inline script tag early.
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return "window.__APP_CONTENT__=" + payload + ";"


def logo_data_uri() -> str:
    path = ROOT / LOGO
    if not path.exists():
        sys.exit(f"ERROR: missing {path}")
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def build(check_only: bool = False) -> Path | None:
    version = app_version()
    html = read(ROOT / "src/index.html")

    css = bundle_css()
    js = bundle_js()
    content = bundle_content()
    logo = logo_data_uri()

    # 1. Replace the whole run of local <link rel="stylesheet"> tags with one
    #    <style>. The Google Fonts link is left alone: it is remote, and the
    #    font stacks in tokens.css fall back cleanly when it cannot load.
    link_block = re.compile(
        r'(?:[ \t]*<link rel="stylesheet" href="css/[^"]+">\n)+'
    )
    if not link_block.search(html):
        sys.exit('ERROR: could not find the css <link> block in src/index.html')
    html = link_block.sub("<style>\n" + css + "\n</style>\n", html, count=1)

    # 2 + 3. Replace the module script with the inlined content and bundle.
    script_tag = '<script type="module" src="js/main.js"></script>'
    if script_tag not in html:
        sys.exit(f"ERROR: could not find {script_tag} in src/index.html")
    html = html.replace(
        script_tag,
        "<script>\n" + content + "\n</script>\n<script>\n" + js + "\n</script>",
        1,
    )

    # 4. Inline the logo wherever it is referenced (markup and bundled JS).
    html = html.replace(LOGO, logo)

    banner = (
        "<!--\n"
        f"  ThinkTrooper - RFP & Pricing Process Analyzer, v{version}\n"
        "  BUILT FILE - do not edit.\n"
        "  Generated from the source tree by tools/build.py. Any change made here\n"
        "  is lost on the next build. Edit content/*.json, src/css/* or src/js/*\n"
        "  and rebuild.\n"
        "-->\n"
    )
    html = html.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + banner, 1)

    out = DIST / f"Automotive_AM_PricingExplorer_v{version}.html"
    if check_only:
        print(f"OK  content, css and js all bundle cleanly (v{version}, would write {out.name})")
        return None

    DIST.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Built {out.relative_to(ROOT)}  ({len(html) / 1024:.0f} KB)")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="validate the sources without writing dist/")
    ap.add_argument("--open", action="store_true", help="open the built file in the default browser")
    args = ap.parse_args()
    out = build(check_only=args.check)
    if out and args.open:
        webbrowser.open(out.as_uri())


if __name__ == "__main__":
    main()
