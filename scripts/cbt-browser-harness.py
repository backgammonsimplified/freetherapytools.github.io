#!/usr/bin/env python3
"""Render scoped QMD with Pandoc and serve real site assets for fallback runtime QA.

This is explicitly NOT a Quarto production render or a substitute for shell/TOC QA.
Usage: python scripts/cbt-browser-harness.py [--port 8766]
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
import argparse
import mimetypes
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
ROUTES = ["/learn/cbt-anxiety/safety-behaviours-exposure.html", "/tool-finder/", *[f"/tool-finder/{tool}/" for tool in ["avoidance", "safety-behaviours", "exposure", "box-breathing"]]]

def pages():
    pandoc = shutil.which("pandoc") or "C:/Program Files/Quarto/bin/tools/pandoc.exe"
    rendered = {}
    css = ["bs-shared.css", "bs-components.css", "bs-learn.css", "skill-apps.css", "skill-progress.css", "cbt-practice.css"]
    scripts = ["site-path.js", "skill-progress.js", "cbt-practice.js", "therapy-calendar.js", "skill-finder-apps.js", "skill-practice-apps.js", "skill-quick-tools.js", "tool-finder.js"]
    for route in ROUTES:
        source = SITE / (route.strip("/") + "/index.qmd" if route.endswith("/") else route.lstrip("/").replace(".html", ".qmd"))
        result = subprocess.run([pandoc, str(source), "--from=markdown", "--to=html5", "--toc", "--standalone", "--wrap=none"], capture_output=True, text=True, encoding="utf-8", check=True)
        body = re.search(r"<body>(.*)</body>", result.stdout, re.S).group(1)
        rendered[route] = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="therapy-site-base" content="BASE">' + ''.join(f'<link rel="stylesheet" href="BASE/assets/{name}">' for name in css) + '<style>body{font:16px/1.5 system-ui;margin:0;color:#263743;background:#fbfaf6}main{max-width:1152px;margin:auto;padding:16px;min-width:0}*,*::before,*::after{box-sizing:border-box}img{max-width:100%;height:auto}button,input,textarea{font:inherit}a{color:#285f77}.harness-note{padding:8px;background:#fff2d8}#TOC{max-width:100%;overflow-wrap:anywhere}</style>' + ''.join(f'<script src="BASE/assets/{name}" defer></script>' for name in scripts) + '</head><body><div class="harness-note">Runtime QA harness: Pandoc content and real site assets; Quarto navigation/theme not rendered.</div><main>' + body + '</main></body></html>'
    return rendered

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        route = urlsplit(self.path).path
        base = "/freetherapytools.github.io" if route.startswith("/freetherapytools.github.io/") else ""
        route = route[len(base):]
        if route in self.server.pages:
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write(self.server.pages[route].replace("BASE", base).encode()); return
        target = (SITE / route.lstrip("/")).resolve()
        if not target.is_relative_to(SITE.resolve()) or not target.is_file():
            self.send_error(404); return
        self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(target)[0] or "application/octet-stream"); self.end_headers(); self.wfile.write(target.read_bytes())
    def log_message(self, *_):
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--port", type=int, default=8766); args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.pages = pages()
    print(f"Runtime QA harness on http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()
