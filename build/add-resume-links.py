#!/usr/bin/env python3
"""
Add clickable hyperlinks to the resume PDF.

The resume is exported from a word processor that writes no link annotations, so
"LinkedIn", the website, and the email address are dead text in the downloaded file.
This finds those strings by their actual glyph positions and attaches real links.

Re-run this after every resume re-export:

    python3 build/add-resume-links.py assets/docs/Jasper_Buntinx_Resume.pdf

Idempotent: it strips any existing link annotations before adding its own.
"""
import sys
import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import Link
from pypdf.generic import RectangleObject

TARGETS = [
    ("LinkedIn",                 "https://www.linkedin.com/in/jasper-buntinx/"),
    ("jasperbuntinx.com",        "https://jasperbuntinx.com"),
    ("Jasper_buntinx@tamu.edu",  "mailto:jasper_buntinx@tamu.edu"),
]
PAD = 1.5


def find_rect(textpage, needle):
    searcher = textpage.search(needle, match_case=True)
    hit = searcher.get_next()
    if hit is None:
        return None
    start, count = hit
    boxes = [textpage.get_charbox(i) for i in range(start, start + count)]
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def main(path):
    doc = pdfium.PdfDocument(path)
    rects = {}
    for page_index in range(len(doc)):
        tp = doc[page_index].get_textpage()
        for needle, uri in TARGETS:
            if needle in rects:
                continue
            r = find_rect(tp, needle)
            if r:
                rects[needle] = (page_index, r, uri)

    writer = PdfWriter()
    for page in PdfReader(path).pages:
        if "/Annots" in page:
            del page["/Annots"]        # drop stale links so re-runs stay clean
        writer.add_page(page)

    for needle, uri in TARGETS:
        if needle not in rects:
            print(f"  WARNING: {needle!r} not found, no link added")
            continue
        page_index, (l, b, r, t), uri = rects[needle]
        writer.add_annotation(
            page_number=page_index,
            annotation=Link(rect=RectangleObject((l - PAD, b - PAD, r + PAD, t + PAD)),
                            url=uri),
        )
        print(f"  linked {needle!r} -> {uri}")

    with open(path, "wb") as fh:
        writer.write(fh)

    check = PdfReader(path)
    n = sum(len(p.get("/Annots") or []) for p in check.pages)
    print(f"  {n} link annotation(s) now present in {path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets/docs/Jasper_Buntinx_Resume.pdf")
