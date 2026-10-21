"""Build the email-friendly portfolio PDF from the 24 original sheets.

The originals in pages/ are never modified. This makes a separate, single-file
copy for sending by email or uploading to job portals: every raster image is
downsampled to TARGET_DPI at its printed size and re-encoded as JPEG. Vector
linework and live text are left untouched, so drawings stay sharp.

Usage:  python tools/compact_pdf.py            (writes Niharika-Patil-Portfolio.pdf)
Needs:  pip install pymupdf pillow
"""
import io
import sys
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Niharika-Patil-Portfolio.pdf"
TARGET_DPI = float(sys.argv[1]) if len(sys.argv) > 1 else 150
JPEG_QUALITY = int(sys.argv[2]) if len(sys.argv) > 2 else 76
MIN_SIDE = 320  # leave small graphics (icons, rules) alone


def placement_width_pt(page, xref):
    # Sheets are merged from separate files, so each image lives on one page only.
    return max((r.width for r in page.get_image_rects(xref)), default=0.0)


def to_pil(pix):
    if pix.n - pix.alpha >= 4:  # CMYK
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    if pix.alpha:
        pix = pymupdf.Pixmap(pix, 0)
    mode = "L" if pix.n == 1 else "RGB"
    return Image.frombytes(mode, (pix.width, pix.height), pix.samples)


def main():
    doc = pymupdf.open()
    for i in range(1, 25):
        doc.insert_pdf(pymupdf.open(ROOT / "pages" / f"sheet-{i:02d}.pdf"))
    doc.set_metadata({"title": "Niharika Patil — Architecture Portfolio 2022–2026",
                      "author": "Niharika Patil",
                      "subject": "Selected works, B.Arch, BMS College of Architecture Design and Planning"})

    seen, saved = set(), 0
    for page in doc:
        for info in page.get_images(full=True):
            xref, smask = info[0], info[1]
            if xref in seen:
                continue
            seen.add(xref)
            w, h = info[2], info[3]
            if max(w, h) < MIN_SIDE or doc.xref_get_key(xref, "ImageMask")[1] == "true":
                continue
            width_pt = placement_width_pt(page, xref)
            if not width_pt:
                continue
            dpi = w / (width_pt / 72)
            scale = min(1.0, TARGET_DPI / dpi)
            nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
            before = len(doc.xref_stream_raw(xref)) + (len(doc.xref_stream_raw(smask)) if smask else 0)

            base = to_pil(pymupdf.Pixmap(doc, xref))
            if (nw, nh) != base.size:
                base = base.resize((nw, nh), Image.LANCZOS)
            buf = io.BytesIO()
            base.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            jpg = buf.getvalue()

            new_mask = None
            if smask:
                mask = to_pil(pymupdf.Pixmap(doc, smask)).convert("L")
                if mask.getextrema()[0] < 250:  # real transparency, keep it
                    new_mask = mask.resize((nw, nh), Image.LANCZOS) if mask.size != (nw, nh) else mask

            mask_jpg = b""
            if new_mask is not None:
                mbuf = io.BytesIO()
                new_mask.save(mbuf, "JPEG", quality=88, optimize=True)
                mask_jpg = mbuf.getvalue()

            if len(jpg) + len(mask_jpg) >= before:
                continue

            doc.update_stream(xref, jpg, compress=False)
            for key, val in (("Filter", "/DCTDecode"), ("Width", str(nw)), ("Height", str(nh)),
                             ("BitsPerComponent", "8"),
                             ("ColorSpace", "/DeviceGray" if base.mode == "L" else "/DeviceRGB"),
                             ("DecodeParms", "null"), ("Decode", "null"), ("Intent", "null")):
                doc.xref_set_key(xref, key, val)
            if smask and new_mask is None:
                doc.xref_set_key(xref, "SMask", "null")
            elif new_mask is not None:
                doc.update_stream(smask, mask_jpg, compress=False)
                for key, val in (("Filter", "/DCTDecode"), ("Width", str(nw)), ("Height", str(nh)),
                                 ("BitsPerComponent", "8"), ("ColorSpace", "/DeviceGray"),
                                 ("DecodeParms", "null"), ("Decode", "null"), ("Matte", "null")):
                    doc.xref_set_key(smask, key, val)
            saved += before - len(jpg) - len(mask_jpg)

    doc.save(OUT, garbage=4, deflate=True, clean=True)
    print(f"{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB (images trimmed by {saved / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
