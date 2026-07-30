#!/usr/bin/env python3
"""
Patch the resume PDF's text at the content-stream level.

    python3 build/patch-resume.py SOURCE.pdf assets/docs/Jasper_Buntinx_Resume.pdf

Why this exists: the resume is authored elsewhere and exported to PDF, so small
corrections would otherwise mean a round trip through the source document. This
edits the drawn glyphs directly, leaving typography, fonts, and every other line
untouched.

TIED TO ONE EXPORT. The glyph IDs below are subset-font specific, so a new export
will not match and the script will fail loudly rather than corrupt the file.
Re-derive them by decoding the TJ runs against each font's ToUnicode CMap.

Two edits:
  1. Education date "August 2023 - December 2027" becomes "August 2023 - 2027".
     That run ends flush at the right margin, so it is shortened and its text
     matrix shifted right by the width removed to hold that edge.
  2. "AggiesCreate" becomes "Aggies Create". Inserting a space widens the line by
     the space advance; verified beforehand that the line has room.
"""
import re
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject

SIZE = 8.0


def font_tables(page, name):
    """Return (gid -> char, char -> gid, gid -> width) for one font resource."""
    f = page["/Resources"]["/Font"][name].get_object()
    cmap = f["/ToUnicode"].get_data().decode("latin-1")
    gid2ch = {}
    for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", cmap):
        if len(dst) >= 4 and len(src) == 4:
            gid2ch[int(src, 16)] = "".join(
                chr(int(dst[i:i + 4], 16)) for i in range(0, len(dst), 4))

    widths, W = {}, [x.get_object() for x in f["/DescendantFonts"][0].get_object()["/W"]]
    i = 0
    while i < len(W):
        if isinstance(W[i + 1], list):
            for k, w in enumerate(W[i + 1]):
                widths[int(W[i]) + k] = float(w)
            i += 2
        else:
            for g in range(int(W[i]), int(W[i + 1]) + 1):
                widths[g] = float(W[i + 2])
            i += 3
    return gid2ch, {c: g for g, c in gid2ch.items()}, widths


def tj_glyphs(body):
    """Flatten a TJ array body into glyph ids and total kerning adjustment."""
    gids, kern = [], 0.0
    for tok in re.finditer(r"<([0-9A-Fa-f]+)>|(-?[\d.]+)", body):
        if tok.group(1):
            h = tok.group(1)
            gids += [int(h[i:i + 4], 16) for i in range(0, len(h), 4)]
        else:
            kern += float(tok.group(2))
    return gids, kern


def main(src, dst):
    reader = PdfReader(src)
    page = reader.pages[0]
    data = page.get_contents().get_data().decode("latin-1")

    bold_ch, bold_rev, bold_w = font_tables(page, "/F10")
    body_ch, body_rev, body_w = font_tables(page, "/F2")

    # ---- edit 1: education date, right-aligned so it must be shifted ----
    hit = None
    for m in re.finditer(r"BT\n1 0 0 1 0 792 Tm\n/F10 8 Tf\n\[([^\]]*)\] TJ\nET", data):
        gids, kern = tj_glyphs(m.group(1))
        if "".join(bold_ch.get(g, "?") for g in gids) == "August 2023 - December 2027":
            hit = (m, gids, kern)
            break
    if hit is None:
        sys.exit("ERROR: education date run not found; this is a different export")

    m, gids, kern = hit
    old_adv = (sum(bold_w[g] for g in gids) - kern) / 1000 * SIZE
    new = "August 2023 - 2027"
    new_adv = sum(bold_w[bold_rev[c]] for c in new) / 1000 * SIZE
    shift = old_adv - new_adv
    data = data.replace(m.group(0), (
        f"BT\n1 0 0 1 {shift:.6f} 792 Tm\n/F10 8 Tf\n"
        f"[<{''.join(f'{bold_rev[c]:04x}' for c in new)}> 0] TJ\nET"), 1)
    print(f"  date  -> {new!r}  ({old_adv:.2f}pt to {new_adv:.2f}pt, shifted {shift:.2f}pt)")

    # ---- edit 2: insert the missing space, left-aligned so no shift needed ----
    space = body_rev[" "]
    target = None
    for m in re.finditer(r"\[([^\]]*)\] TJ", data):
        gids, _ = tj_glyphs(m.group(1))
        text = "".join(body_ch.get(g, "?") for g in gids)
        if "AggiesCreate" in text:
            target = (m, gids, text)
            break
    if target is None:
        sys.exit("ERROR: 'AggiesCreate' run not found")

    m, gids, text = target
    at = text.index("AggiesCreate") + len("Aggies")
    patched = gids[:at] + [space] + gids[at:]
    data = data.replace(
        m.group(0), f"[<{''.join(f'{g:04x}' for g in patched)}> 0] TJ", 1)
    print(f"  space -> 'Aggies Create'  (line grew {body_w[space] / 1000 * SIZE:.2f}pt)")

    writer = PdfWriter(clone_from=src)
    stream = DecodedStreamObject()
    stream.set_data(data.encode("latin-1"))
    writer.pages[0].replace_contents(stream)
    writer.write(dst)

    out = PdfReader(dst).pages[0].extract_text()
    for probe, want in (("August 2023 - 2027", True), ("Aggies Create", True),
                        ("December 2027", False), ("AggiesCreate", False)):
        ok = (probe in out) == want
        print(f"  {'OK  ' if ok else 'FAIL'} {probe!r} present={probe in out}")
        if not ok:
            sys.exit("verification failed")
    print(f"  {sum(len(p.get('/Annots') or []) for p in PdfReader(dst).pages)} link annotations kept")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
