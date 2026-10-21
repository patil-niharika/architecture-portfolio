"""Regenerate every web image the site uses from the original sources.

    python tools/build_assets.py          # everything
    python tools/build_assets.py images   # homepage images + portrait only
    python tools/build_assets.py sheets   # viewer previews for the 24 PDF sheets only
    python tools/build_assets.py tiles    # high-resolution zoom tiles for the 24 sheets only

Inputs (never modified):
    assets/source/*      full-size project images
    pages/sheet-XX.pdf   the 24 original A3 sheets

Outputs:
    assets/img/<name>-<width>.avif / .webp   responsive homepage images
    assets/sheets/sheet-XX-<width>.webp      instant previews for the viewer
    assets/thumbnails/page-XX.webp           strip thumbnails
    assets/tiles/sheet-XX/<col>-<row>.webp   zoom tiles (TILE_WIDTH px wide sheet, TILE_SIZE px squares)

Needs: pip install pymupdf pillow   (Pillow 11.2+ for AVIF)
"""
import sys
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
IMG = ROOT / "assets" / "img"
SHEETS = ROOT / "assets" / "sheets"
THUMBS = ROOT / "assets" / "thumbnails"
TILES = ROOT / "assets" / "tiles"

PROJECT_IMAGES = {
    "exoskeletal": "exoskeletal-original.png",
    "samvedana": "samvedana-original.jpg",
    "mitti": "mitti-original.png",
    "saanidhya": "saanidhya-original.png",
    "working-drawings": "working-drawings-original.png",
    "selected-explorations": "selected-explorations-original.png",
    "thesis-research": "thesis-research-original.png",
}
IMAGE_WIDTHS = (640, 1024, 1600, 2048)
SHEET_WIDTHS = (1200, 2000, 3200)
THUMB_WIDTH = 480
TILE_WIDTH = 9600   # the whole A3 sheet at this width (~580 dpi); keep in step with TILES in site-data.js
TILE_SIZE = 1200    # tiles are cut on this grid
TILE_BLEED = 2      # each tile carries 2 extra px of its neighbours so no seam can show


def save_variants(im, stem, widths):
    im = im.convert("RGB")
    made = []
    for w in widths:
        if w > im.width:
            continue
        out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        out.save(IMG / f"{stem}-{w}.webp", "WEBP", quality=82, method=6)
        out.save(IMG / f"{stem}-{w}.avif", "AVIF", quality=60, speed=4)
        made.append(w)
    if im.width not in made and im.width < max(widths):
        # Source smaller than the largest size: publish it at native width as the top step.
        im.save(IMG / f"{stem}-{im.width}.webp", "WEBP", quality=82, method=6)
        im.save(IMG / f"{stem}-{im.width}.avif", "AVIF", quality=60, speed=4)
        made.append(im.width)
    print(f"  {stem}: {im.width}x{im.height} -> {made}")


def build_images():
    IMG.mkdir(parents=True, exist_ok=True)
    print("Project images")
    for stem, name in PROJECT_IMAGES.items():
        save_variants(Image.open(SRC / name), stem, IMAGE_WIDTHS)

    print("Portrait (from the About sheet)")
    doc = pymupdf.open(ROOT / "pages" / "sheet-02.pdf")
    largest = max(doc[0].get_images(full=True), key=lambda x: x[2] * x[3])
    pix = pymupdf.Pixmap(doc, largest[0])
    if pix.alpha or pix.n > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    portrait = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    save_variants(portrait, "portrait", (480, 800))


def build_sheets():
    SHEETS.mkdir(parents=True, exist_ok=True)
    THUMBS.mkdir(parents=True, exist_ok=True)
    print("Sheet previews")
    for n in range(1, 25):
        page = pymupdf.open(ROOT / "pages" / f"sheet-{n:02d}.pdf")[0]
        zoom = max(SHEET_WIDTHS) / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        big = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        sizes = []
        for w in SHEET_WIDTHS:
            im = big if w == big.width else big.resize((w, round(big.height * w / big.width)), Image.LANCZOS)
            f = SHEETS / f"sheet-{n:02d}-{w}.webp"
            im.save(f, "WEBP", quality=86, method=6)
            sizes.append(f"{f.stat().st_size // 1024}KB")
        thumb = big.resize((THUMB_WIDTH, round(big.height * THUMB_WIDTH / big.width)), Image.LANCZOS)
        thumb.save(THUMBS / f"page-{n:02d}.webp", "WEBP", quality=80, method=6)
        print(f"  sheet {n:02d}: {' / '.join(sizes)}")


def build_tiles():
    Image.MAX_IMAGE_PIXELS = None
    print(f"Zoom tiles ({TILE_WIDTH} px sheets, {TILE_SIZE} px tiles)")
    for n in range(1, 25):
        page = pymupdf.open(ROOT / "pages" / f"sheet-{n:02d}.pdf")[0]
        zoom = TILE_WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        big = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        del pix
        out = TILES / f"sheet-{n:02d}"
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob("*.webp"):
            old.unlink()
        total = 0
        for row, y in enumerate(range(0, big.height, TILE_SIZE)):
            for col, x in enumerate(range(0, big.width, TILE_SIZE)):
                box = (x, y, min(x + TILE_SIZE + TILE_BLEED, big.width), min(y + TILE_SIZE + TILE_BLEED, big.height))
                f = out / f"{col}-{row}.webp"
                big.crop(box).save(f, "WEBP", quality=80, method=5)
                total += f.stat().st_size
        print(f"  sheet {n:02d}: {big.width}x{big.height}, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("all", "images"):
        build_images()
    if what in ("all", "sheets"):
        build_sheets()
    if what in ("all", "tiles"):
        build_tiles()
