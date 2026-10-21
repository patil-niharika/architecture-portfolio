"""Write index.html from tools/index.template.html.

Fills in the responsive <picture> tags (AVIF + WebP at every width that exists in
assets/img) and the project rows, so markup and image files never drift apart.

    python tools/render_index.py
    python tools/render_index.py --site https://<user>.github.io/<repo>/   # if the address changes
"""
import argparse
import html
import re
from datetime import date
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "tools" / "index.template.html"
SITE = "https://patil-niharika.github.io/arch-portfolio/"
VERSION = "20261021-v9"
MARK = (ROOT / "tools" / "np-mark.inline.svg").read_text(encoding="utf-8").strip()

PROJECTS = [
    dict(n="01", page=4, sheets=5, img="exoskeletal", type="STADIUM DESIGN", title=["EXOSKELETAL", "CIRCUIT"],
         subtitle="40,000 Capacity Football Stadium", fig="CIRCULATION AS ARCHITECTURE",
         teaser="Reimagining a 40,000-seat football stadium through exposed circulation towers, crowd behaviour and an exoskeletal system.",
         facts=["SEM 07", "BENGALURU", "36 ACRES"]),
    dict(n="02", page=9, sheets=4, img="samvedana", type="INSTITUTIONAL DESIGN", title=["SAMVEDANA"],
         subtitle="Arts Institute for the Visually Impaired", fig="DESIGNING THROUGH THE SENSES",
         teaser="An arts institute on the contoured Chitrakala Parishath site, shaped by sensory cues, interconnected levels and independent navigation.",
         facts=["SEM 06", "BENGALURU", "3.4 ACRES"]),
    dict(n="03", page=13, sheets=3, img="mitti", type="CULTURAL DESIGN", title=["MITTI"],
         subtitle="Pottery Community Centre and Gallery", fig="THE ARCHITECTURE OF MAKING",
         teaser="A centre in Bengaluru’s Pottery Town for production, display and year-round sale — sustaining the craft and the artisans behind it.",
         facts=["SEM 05", "BENGALURU", "2.08 ACRES"]),
    dict(n="04", page=16, sheets=3, img="saanidhya", type="URBAN DESIGN", title=["SAANIDHYA"],
         subtitle="Melukote Spatial Ethnography Centre", fig="MEMORY, CULTURE AND PLACE",
         teaser="Reviving a neglected waterbody and translating Melukote’s living heritage into spaces of cultural exchange.",
         facts=["SEM 08", "MELUKOTE", "4.43 ACRES"]),
    dict(n="05", page=19, sheets=2, img="working-drawings", type="TECHNICAL DRAFTING", title=["WORKING", "DRAWINGS"],
         subtitle="Construction drawing sets", fig="FROM CONCEPT TO DETAIL",
         teaser="Excavation, foundation, staircase, plinth beam, electrical, lintel and plumbing drawings — the coordination beneath the built form.",
         facts=["SEM 06—07", "TECHNICAL"]),
    dict(n="06", page=21, sheets=3, img="selected-explorations", type="RESEARCH & CREATIVE WORK", title=["SELECTED", "EXPLORATIONS"],
         subtitle="Models, sketching, painting, photography", fig="BEYOND THE DRAWING BOARD",
         teaser="Physical models, sketching, photography, painting and ongoing research into the spatial translation of experience.",
         facts=["ONGOING", "VARIOUS"]),
]


def variants(stem):
    found = []
    for f in (ROOT / "assets" / "img").glob(f"{stem}-*.webp"):
        m = re.fullmatch(rf"{re.escape(stem)}-(\d+)\.webp", f.name)
        if m:
            found.append(int(m.group(1)))
    if not found:
        raise SystemExit(f"No images for {stem}; run tools/build_assets.py images first")
    return sorted(found)


def srcset(stem, ext):
    return ", ".join(f"assets/img/{stem}-{w}.{ext} {w}w" for w in variants(stem))


def picture(stem, sizes, alt, loading):
    widths = variants(stem)
    mid = next((w for w in widths if w >= 1024), widths[-1])
    with Image.open(ROOT / "assets" / "img" / f"{stem}-{widths[-1]}.webp") as im:
        w, h = im.size
    attrs = {"eager": 'fetchpriority="high"', "auto": "", "lazy": 'loading="lazy"'}[loading]
    return (f'<picture><source type="image/avif" srcset="{srcset(stem, "avif")}" sizes="{sizes}" />'
            f'<source type="image/webp" srcset="{srcset(stem, "webp")}" sizes="{sizes}" />'
            f'<img src="assets/img/{stem}-{mid}.webp" width="{w}" height="{h}" alt="{html.escape(alt)}" '
            f'{attrs} decoding="async" /></picture>').replace('  decoding', ' decoding')


def project_rows():
    rows = []
    for p in PROJECTS:
        facts = "".join(f"<li>{f}</li>" for f in p["facts"] + [f"{p['sheets']:02d} SHEETS"])
        title = "".join(f'<span class="ln" style="--d:{0.16 + 0.07 * i:.2f}s"><span>{t}</span></span>' for i, t in enumerate(p["title"]))
        pic = picture(p["img"], "(max-width: 640px) calc(100vw - 90px), (max-width: 930px) 40vw, 34vw",
                      f"{' '.join(p['title']).title()} — {p['subtitle']}", "lazy")
        rows.append(f"""          <li class="project-item" data-reveal>
            <a class="project-row" href="#sheet/{p['page']}" data-open-page="{p['page']}" data-cursor="OPEN">
              <span class="project-number">{p['n']}</span>
              <figure class="project-picture"><span class="project-mat wipe"><span class="wipe-inner">{pic}</span></span><figcaption class="picture-index">FIG. {p['n']} / {p['fig']}</figcaption></figure>
              <div class="project-info">
                <span class="project-type fade-up" style="--d:.12s">{html.escape(p['type'])}</span>
                <h3>{title}</h3>
                <p class="project-subtitle fade-up" style="--d:.26s">{p['subtitle']}</p>
                <p class="project-description fade-up" style="--d:.32s">{p['teaser']}</p>
                <ul class="project-facts fade-up" style="--d:.38s">{facts}</ul>
              </div>
              <span class="project-open" aria-hidden="true">↗</span>
            </a>
          </li>""")
    return "\n".join(rows)


def main():
    global SITE
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default=SITE, help="public address of the site, ending in /")
    SITE = ap.parse_args().site.rstrip("/") + "/"
    out = TEMPLATE.read_text(encoding="utf-8")
    out = out.replace("{{MARK}}", MARK)
    out = out.replace("{{PROJECTS}}", project_rows())
    out = re.sub(r"\{\{PIC:([\w-]+)\|([^|]+)\|([^|]+)\|(\w+)\}\}",
                 lambda m: picture(m.group(1), m.group(2), m.group(3), m.group(4)), out)
    out = re.sub(r"\{\{SRCSET_AVIF:([\w-]+)\}\}", lambda m: srcset(m.group(1), "avif"), out)
    out = out.replace("{{SITE}}", SITE).replace("{{VERSION}}", VERSION)
    leftover = re.findall(r"\{\{[^}]+\}\}", out)
    if leftover:
        raise SystemExit(f"Unfilled placeholders: {leftover}")
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f'  <url>\n    <loc>{SITE}</loc>\n    <lastmod>{date.today().isoformat()}</lastmod>\n  </url>\n</urlset>\n',
        encoding="utf-8")
    print(f"index.html written ({len(out) // 1024} KB) for {SITE}")


if __name__ == "__main__":
    main()
