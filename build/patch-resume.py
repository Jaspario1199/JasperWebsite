#!/usr/bin/env python3
"""
Patch the resume PDF's text at the content-stream level.

    python3 build/patch-resume.py build/src/resume-source.pdf assets/docs/Jasper_Buntinx_Resume.pdf

Why this exists: the resume is authored elsewhere and exported to PDF, so small
corrections would otherwise mean a round trip through the source document. This
edits the drawn glyphs directly, leaving typography, fonts, and every other line
untouched.

TIED TO ONE EXPORT (the November 2026 one-page export). The glyph IDs are
subset-font specific, so a new export will not match and the script fails loudly
rather than corrupt the file. Re-derive by decoding the TJ runs against the
font's ToUnicode CMap; the decode happens at run time, so a new export usually
only needs the font resource and size in EDITS updated (this export draws the
header dates at 10 pt, the August one at 9 pt).

Each edit replaces one whole text run (one drawn line). Right-aligned runs
(header dates) end flush at the right margin, so the text matrix is shifted by
the width change to hold that edge. Left-aligned runs (bullet text) keep their
start point and simply get shorter or longer, so only use them on a run with
room to spare, such as the last line of a wrapped bullet.

Current edit: education "Aug 2023 - Aug 2027" becomes "Aug 2023 - 2027",
because the public site carries no graduation month (see the graduation-date
policy in the application workspace). The resume itself now carries the 30%
cycle-time figure, so the earlier body-text correction is no longer needed.
"""
import re
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject

# (font resource, size, alignment, old run, new run)
EDITS = [
    ("/F10", 10, "right", "Aug 2023 - Aug 2027", "Aug 2023 - 2027"),
]


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

    for font, size, align, old, new in EDITS:
        ch, rev, w = font_tables(page, font)
        missing = sorted(set(c for c in new if c not in rev))
        if missing:
            sys.exit(f"ERROR: {font} subset lacks glyphs {missing!r} needed for {new!r}")
        pat = (r"BT\n1 0 0 1 0 792 Tm\n" + re.escape(font) + rf" {size} Tf\n\[([^\]]*)\] TJ\nET")
        hit = None
        for m in re.finditer(pat, data):
            gids, kern = tj_glyphs(m.group(1))
            if "".join(ch.get(g, "?") for g in gids) == old:
                hit = (m, gids, kern)
                break
        if hit is None:
            sys.exit(f"ERROR: run {old!r} not found in {font} {size}pt; this is a different export")

        m, gids, kern = hit
        old_adv = (sum(w[g] for g in gids) - kern) / 1000 * size
        new_adv = sum(w[rev[c]] for c in new) / 1000 * size
        shift = old_adv - new_adv if align == "right" else 0.0
        new_hex = "".join(f"{rev[c]:04x}" for c in new)
        data = data.replace(m.group(0), (
            f"BT\n1 0 0 1 {shift:.6f} 792 Tm\n{font} {size} Tf\n[<{new_hex}> 0] TJ\nET"), 1)
        print(f"  {old[:40]!r} -> {new[:40]!r}  ({old_adv:.2f}pt to {new_adv:.2f}pt, shifted {shift:.2f}pt)")

    writer = PdfWriter(clone_from=src)
    stream = DecodedStreamObject()
    stream.set_data(data.encode("latin-1"))
    writer.pages[0].replace_contents(stream)
    writer.write(dst)

    out = PdfReader(dst)
    text = out.pages[0].extract_text()
    probes = [(e[4], True) for e in EDITS] + [(e[3], False) for e in EDITS]
    for probe, want in probes + [("Aug 2027", False), ("70\u201380", False), ("Interphase", True)]:
        ok = (probe in text) == want
        print(f"  {'OK  ' if ok else 'FAIL'} {probe[:48]!r} present={probe in text}")
        if not ok:
            sys.exit("verification failed")
    print(f"  {len(out.pages)} page(s), "
          f"{sum(len(p.get('/Annots') or []) for p in out.pages)} link annotations kept")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
