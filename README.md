# Niharika Patil — Architecture Portfolio

**Live:** https://patil-niharika.github.io/architecture-portfolio/

A static, single-page portfolio for a 24-sheet A3 architecture portfolio, hosted on GitHub Pages. No framework, no build step for the site itself, no tracking.

## Publishing

This folder is the whole site, including the 24 original sheets in `pages/`.

1. Put every file in the root of the GitHub repository (`index.html` at the top level, not inside another folder).
2. Push with **GitHub Desktop** or git — `pages/sheet-14.pdf` is 27 MB, over the 25 MB limit for uploading in the browser.
3. Settings → Pages → Deploy from a branch → `main`, `/ (root)` → Save.
4. If the repository is ever renamed, update the address used for link previews and search: `python tools/render_index.py --site https://patil-niharika.github.io/NEW-NAME/` (or replace `patil-niharika.github.io/architecture-portfolio/` in `index.html` and `sitemap.xml`). The site itself works under any name.

## What's on the page

- **Hero, Selected Work, Approach, Thesis, About/CV, Contact** — all real HTML text, so it reads well on phones, works with screen readers and can be found by search engines. Email and phone appear in the hero, the mobile menu, About and the footer, each with a copy button.
- **Motion** — a one-time intro (the NP mark draws itself), headlines rising out of masks, images uncovering as they scroll in, the viewer opening as an iris from wherever you click, sheets sliding as you turn them, and a small OPEN label that follows the pointer over drawings. Motion only plays on entry; nothing moves while you read. It all switches off under “reduce motion”, and the page is fully visible without JavaScript.
- **The viewer** opens any sheet (`…/#sheet/14` links straight to sheet 14):
  - An instant preview image of the sheet appears first (≈100–500 KB instead of a 1–27 MB PDF).
  - Zoom in past what the preview can show and full-resolution tiles (each sheet rendered at 9600 px, ~580 dpi, cut into a 8 × 6 grid) load for just the part in view. They are plain images placed in percentages of the sheet, so they stay aligned at every zoom and work the same in every browser. **PDF ↗** opens the untouched original sheet.
  - Drag to pan, pinch or double-tap to zoom, swipe to turn, chapter picker on phones, a project note (her own project text and facts), and a per-sheet download.
  - The contents panel folds into a slim rail of chapter numbers in fullscreen (or with the ‹ button) and slides open on hover; the choice is remembered.
  - Fullscreen gives the drawing the room: the footnote goes, the sheet strip appears only when the pointer nears the bottom, and after a few still seconds every control fades so only the drawing remains. Any movement brings them back.
- **Download PDF** — one 20 MB file for email and job portals (`Niharika-Patil-Portfolio.pdf`). Photos and renders are resampled to 150 dpi at print size; all linework and text stay vector.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page. **Generated** — edit `tools/index.template.html`, then run `tools/render_index.py`. |
| `styles.css` | All styles. |
| `app.js` | Navigation, reveal motion, and the viewer. |
| `site-data.js` | Viewer content: chapters, page ranges, project text, sheet captions, file sizes. |
| `pages/sheet-01.pdf … sheet-24.pdf` | The original sheets, copied page-for-page from the source PDF. Never modified. |
| `Niharika-Patil-Portfolio.pdf` | The compact single-file download. |
| `assets/source/` | Full-size project images (inputs for the build script). |
| `assets/img/` | Responsive AVIF + WebP versions of those images and the portrait. |
| `assets/sheets/` | Viewer previews of each sheet at 1200 / 2000 / 3200 px. |
| `assets/thumbnails/` | Small sheet thumbnails for the viewer strip. |
| `assets/tiles/sheet-XX/` | Full-resolution zoom tiles, `<col>-<row>.webp`. |
| `assets/og-image.jpg` | 1200×630 image shown when the link is shared on LinkedIn, WhatsApp, etc. |
| `assets/mark.svg`, `assets/np-mark.svg` | The NP mark: filled (favicon) and outline (for other uses). |
| `tools/np-mark.inline.svg` | The outline mark that `render_index.py` places in the page. Letters are Manrope Bold converted to outlines. |
| `tools/` | Scripts that regenerate everything above. |

## Updating the portfolio

Requires Python 3.10+ and `pip install pymupdf pillow`.

**Replaced or edited a sheet** (e.g. a new `pages/sheet-14.pdf`):

```bash
python tools/build_assets.py sheets   # previews + thumbnails
python tools/build_assets.py tiles    # zoom tiles
python tools/compact_pdf.py           # rebuild the download PDF
```

Then update that sheet's size in `SHEET_BYTES` and its caption in `CAPTIONS` (both in `site-data.js`), and the PDF size in `COMPACT_PDF`.

**New project image:** put the full-size file in `assets/source/`, add it to `PROJECT_IMAGES` in `tools/build_assets.py`, then:

```bash
python tools/build_assets.py images
python tools/render_index.py
```

**Text changes on the homepage:** edit `tools/index.template.html` (or the `PROJECTS` list in `tools/render_index.py`) and run `python tools/render_index.py`. If you change a project title or page range, change it in `site-data.js` too. When you change CSS or JS, bump `VERSION` in `tools/render_index.py` so returning visitors get the new files.

**Optional:** to offer the full 171 MB original as well, upload it to Google Drive ("anyone with the link can view") and paste the link into `FULL_ORIGINAL_PDF_URL` in `site-data.js`.

## Run it locally

```bash
python -m http.server 8080
```

Open http://localhost:8080/ (opening `index.html` directly from disk won't load the viewer).

## After publishing

- In Google Search Console, add the site and submit `https://patil-niharika.github.io/architecture-portfolio/sitemap.xml`.
- Check the share preview with LinkedIn's Post Inspector (https://www.linkedin.com/post-inspector/) — it also refreshes LinkedIn's cache.

## Keyboard

`←` `→` turn sheets (pan when zoomed) · `Page Up` `Page Down` turn sheets · `+` `−` zoom · `0` fit · `F` fullscreen · `Esc` close
