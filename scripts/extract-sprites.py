#!/usr/bin/env python3
"""Extract canon sprites and sketchbook extras from assets-src/*.pdf into transparent PNGs.

Usage: python3 scripts/extract-sprites.py
Needs: poppler's pdftoppm, Pillow, numpy, scipy.

Crop boxes are given in 100-dpi pixel coordinates of the notebook pages (619 px wide for a 445 pt page),
or, for the sketchbook, as fractions of the page. `erase` rectangles blank out neighbouring handwriting.
Only the drawings listed here are ever cropped; private journal text on sketchbook pages is never read or kept.
"""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "sketches"
DPI = 300
SCALE = DPI / 100            # crop boxes below are in 100-dpi pixels
MAX_SIDE = 720               # downscale big drawings so the whole library stays small
INK = (29, 29, 27)

# id, pdf, page, box(x0,y0,x1,y1) in 100dpi px, erase boxes, facing, source note, folder
CANON = [
    ("cube",                 "tails_trip", 2, (182, 594, 392, 794), [], "right", "tails_trip p2, the cube beside Brock", ""),
    ("brock",                "tails_trip", 2, (366, 460, 508, 730), [], "right", "tails_trip p2 (drawn facing front)", ""),
    ("tot-polka-dot",        "tails_trip", 4, (150, 470, 445, 775), [(378, 752, 450, 790)], "right", "tails_trip p4 (Patrick's own Taylor edition only)", ""),
    ("scissors-chris-steve", "tails_trip", 5, (150, 500, 415, 718), [], "right", "tails_trip p5", ""),
    ("robo-seal",            "tails_trip", 8, (200, 655, 345, 732), [], "right", "tails_trip p8 (labels left to the Sketch Artist)", ""),
    ("scout",                "tails_trip", 8, (345, 680, 482, 728), [], "left", "tails_trip p8 (smartwatch is an overlay drawn by the Sketch Artist)", ""),
    ("data-lake",            "tails_trip", 7, (68, 502, 432, 748), [(15, 535, 132, 602), (335, 505, 470, 590), (412, 572, 440, 668), (15, 735, 210, 800), (290, 745, 400, 800)], "right", "tails_trip p7 (lake and rising structure; margin notes erased)", ""),
    ("tower-of-two",         "prime_pics", 1, (150, 190, 325, 415), [], "right", "prime_pics p1", ""),
    ("dig-in-the-dots",      "prime_pics", 1, (128, 553, 302, 665), [], "right", "prime_pics p1", ""),
    ("sieve-grid",           "primeland_notes", 4, (194, 164, 360, 328), [], "right", "primeland_notes p4", ""),
    ("portal-box-open",      "primeland_notes", 1, (250, 144, 464, 294), [], "right", "primeland_notes p1", ""),
]

# sketchbook extras: id, page, box as fractions (x0,y0,x1,y1) of the page, erase (fractions), note
def tile(col, row, x0, y0, x1, y1):
    """Convert a box measured on the 3-per-row contact sheet (371x495 tiles) into page fractions."""
    return (x0 / 371, y0 / 495, x1 / 371, y1 / 495)

EXTRAS = [
    ("robot-at-the-smog-check", 21, tile(2, 1, 58, 20, 336, 492), [tile(2, 1, 245, 45, 362, 140)], "sketchbook p21"),
    ("big-boss-bottle-nose-dolphin", 30, tile(2, 0, 88, 78, 234, 410), [], "sketchbook p30"),
    ("kinetic-coyote", 3, tile(0, 0, 55, 25, 225, 355), [], "sketchbook p3 (drawn sideways on the page)"),
    ("sperm-whale", 4, tile(1, 0, 113, 10, 265, 490), [], "sketchbook p4"),
    ("howling-wolf", 6, tile(2, 0, 178, 28, 358, 255), [], "sketchbook p6"),
    ("bird-falcon", 13, tile(0, 1, 86, 345, 240, 480), [tile(0, 1, 168, 395, 250, 470)], "sketchbook p13"),
    ("maka", 18, tile(1, 1, 82, 225, 262, 402), [], "sketchbook p18 (a clock inside the body: never use for Scout)"),
    ("stag-p22", 22, tile(0, 0, 98, 368, 232, 482), [], "sketchbook p22 (crop starts below the page's journal text)"),
    ("umbrella", 29, tile(1, 0, 66, 38, 224, 220), [], "sketchbook p29"),
    ("pickle-jar", 29, tile(1, 0, 248, 93, 356, 250), [], "sketchbook p29"),
    ("stag-p33", 33, tile(0, 1, 56, 45, 210, 190), [], "sketchbook p33"),
]

_cache = {}
def render(pdf, page, dpi=DPI):
    key = (pdf, page)
    if key not in _cache:
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(page), "-l", str(page), "-gray", "-png",
                            str(SRC / f"{pdf}.pdf"), f"{d}/p"], check=True, stderr=subprocess.DEVNULL)
            f = next(Path(d).glob("p*.png"))
            _cache[key] = np.array(Image.open(f).convert("L"))
    return _cache[key]

def to_sprite(gray):
    """Gray crop -> RGBA with near-black ink on transparent paper. Grid, dots and ruled lines are far lighter than ink."""
    g = gray.astype(np.float32)
    alpha = np.clip((165.0 - g) / (165.0 - 95.0), 0, 1)          # ramp: <=95 solid ink, >=165 paper
    solid = alpha > 0.5
    # drop specks smaller than a few pen widths (stray grid-line fragments)
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=2))
    sizes = ndimage.sum(solid, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= 40
    alpha = alpha * keep[lab]
    h, w = alpha.shape
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = INK
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    return rgba

def finish(rgba, name):
    im = Image.fromarray(rgba, "RGBA")
    bbox = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if bbox is None:
        return None
    pad = 6
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    im = im.crop(bbox)
    if max(im.size) > MAX_SIDE:
        r = MAX_SIDE / max(im.size)
        im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    return im

def extract(pdf, page, box, erase, name, scale_px):
    gray = render(pdf, page).copy()
    H, W = gray.shape
    x0, y0, x1, y1 = [int(round(v)) for v in scale_px(box, W, H)]
    for e in erase:
        ex0, ey0, ex1, ey1 = [int(round(v)) for v in scale_px(e, W, H)]
        gray[max(0, ey0):ey1, max(0, ex0):ex1] = 255
    crop = gray[max(0, y0):y1, max(0, x0):x1]
    return finish(to_sprite(crop), name)

def main():
    missing = [p for p in {c[1] for c in CANON} | {"sketchbook"} if not (SRC / f"{p}.pdf").exists()]
    if missing:
        sys.exit(f"missing PDFs in assets-src/: {missing}")
    (OUT / "extras").mkdir(parents=True, exist_ok=True)
    manifest, extras, todo = [], [], []
    px = lambda b, W, H: tuple(v * SCALE for v in b)
    fr = lambda b, W, H: (b[0] * W, b[1] * H, b[2] * W, b[3] * H)
    for (id_, pdf, page, box, erase, facing, source, _f) in CANON:
        im = extract(pdf, page, box, erase, id_, px)
        if im is None:
            todo.append(f"- `{id_}` ({source}): crop came out empty; redraw it.")
            continue
        im.save(OUT / f"{id_}.png", optimize=True)
        manifest.append({"id": id_, "file": f"{id_}.png", "width": im.width, "height": im.height,
                         "anchor": {"x": im.width // 2, "y": im.height}, "facing": facing, "source": source})
    for (id_, page, box, erase, source) in EXTRAS:
        im = extract("sketchbook", page, box, erase, id_, fr)
        if im is None:
            todo.append(f"- `{id_}` ({source}): crop came out empty; redraw it.")
            continue
        im.save(OUT / "extras" / f"{id_}.png", optimize=True)
        extras.append({"id": id_, "file": f"extras/{id_}.png", "width": im.width, "height": im.height, "source": source})
    (OUT / "sketches.json").write_text(json.dumps({"sprites": manifest, "extras": extras}, indent=2) + "\n")
    print(f"{len(manifest)} canon sprites, {len(extras)} extras; todo: {len(todo)}")
    if todo:
        (SRC / "sprite-todo.md").write_text("# Sprites that could not be isolated\n\n" + "\n".join(todo) + "\n")

if __name__ == "__main__":
    main()
