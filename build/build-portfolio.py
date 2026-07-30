#!/usr/bin/env python3
"""
Render build/portfolio.html to the downloadable portfolio PDF.

    python3 build/build-portfolio.py

Serves the repo root so relative asset paths resolve, prints at 8.5x11in with
background graphics on, then verifies the page count.
"""
import functools, http.server, socketserver, threading, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/docs/Jasper_Buntinx_Project_Portfolio.pdf"
PORT = 8231

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        page = b.new_page()
        page.goto(f"http://127.0.0.1:{PORT}/build/portfolio.html", wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(path=str(OUT), width="8.5in", height="11in",
                 print_background=True, margin={k: "0" for k in ("top","bottom","left","right")})
        b.close()
finally:
    srv.shutdown()

r = PdfReader(OUT)
box = r.pages[0].mediabox
print(f"{OUT.name}: {len(r.pages)} pages, {box.width/72:.2f} x {box.height/72:.2f} in")
if len(r.pages) != 6:
    sys.exit(f"ERROR: expected 6 pages, got {len(r.pages)}")
