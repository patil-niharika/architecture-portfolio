import { CHAPTERS, CAPTIONS, PAGE_COUNT, SHEET_BYTES, COMPACT_PDF, FULL_ORIGINAL_PDF_URL, TILES } from './site-data.js';

/* ---------- helpers ---------- */
const BASE = new URL('./', import.meta.url);
const path = (rel) => new URL(rel, BASE).href;
const pad = (n) => String(n).padStart(2, '0');
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mb = (bytes) => `${bytes >= 1e7 ? Math.round(bytes / 1e6) : (bytes / 1e6).toFixed(1)} MB`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SHEET_WIDTHS = [1200, 2000, 3200];
const MAX_PREVIEW_PX = 3200;
const SHEET_RATIO = 842.25 / 1190.25; // A3 landscape, height / width
const MIN_ZOOM = 1;
const MAX_ZOOM_CAP = 8;
const dprNow = () => Math.min(devicePixelRatio || 1, 3);
const sheetPdf = (n) => path(`pages/sheet-${pad(n)}.pdf`);
const thumbURL = (n) => path(`assets/thumbnails/page-${pad(n)}.webp`);
const previewSrcset = (n) => SHEET_WIDTHS.map((w) => `${path(`assets/sheets/sheet-${pad(n)}-${w}.webp`)} ${w}w`).join(', ');
const chapterFor = (n) => CHAPTERS.find((c) => n >= c.start && n <= c.end) || CHAPTERS[0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

let toastTimer = null;
function notify(text) {
  const node = $('toast');
  node.textContent = text;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 3200);
}

/* ---------- homepage ---------- */
const root = document.documentElement;
const headerOffset = () => ($('site-header')?.offsetHeight || 80) + 12;

/* Eased scrolling for in-page links. It updates the address without adding history
   entries, so the back button never lands on a stale section or re-opens the viewer. */
let scrollAnim = null;
function scrollToSection(id) {
  const target = id === 'home' ? null : document.getElementById(id);
  if (id !== 'home' && !target) return false;
  const to = target ? Math.max(0, target.getBoundingClientRect().top + scrollY - headerOffset()) : 0;
  history.replaceState(history.state, '', id === 'home' ? location.pathname + location.search : `#${id}`);
  if (scrollAnim) cancelAnimationFrame(scrollAnim.raf);
  const from = scrollY;
  const distance = to - from;
  if (reducedMotion || Math.abs(distance) < 2) { scrollTo(0, to); return true; }
  const duration = clamp(Math.abs(distance) * 0.45, 650, 1500);
  const ease = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    scrollTo(0, from + distance * ease(t));
    if (t < 1) scrollAnim.raf = requestAnimationFrame(step); else scrollAnim = null;
  };
  scrollAnim = { raf: requestAnimationFrame(step) };
  return true;
}
const stopScrollAnim = () => { if (scrollAnim) { cancelAnimationFrame(scrollAnim.raf); scrollAnim = null; } };
addEventListener('wheel', stopScrollAnim, { passive: true });
addEventListener('touchstart', stopScrollAnim, { passive: true });

function setupMainSite() {
  $('copyright-year').textContent = String(new Date().getFullYear());
  const intro = root.classList.contains('intro');
  if (intro) {
    $('home').style.setProperty('--intro-delay', '1.45s');
    setTimeout(() => root.classList.remove('intro'), 2400);
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const opener = e.target.closest('[data-open-page]');
    if (opener) {
      e.preventDefault();
      openViewer(Number(opener.dataset.openPage), e.detail ? { x: e.clientX, y: e.clientY } : null);
      return;
    }
    const anchor = e.target.closest('a[href^="#"]');
    if (anchor && !viewer.contains(anchor)) {
      const id = anchor.getAttribute('href').slice(1);
      if (id && !id.startsWith('sheet') && scrollToSection(id)) {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target && (e.detail === 0 || anchor.closest('.skip-link'))) { // keyboard: move focus with the scroll
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      }
    }
  });

  for (const a of document.querySelectorAll('[data-download-pdf]')) a.href = path(COMPACT_PDF.href);

  const nav = $('site-navigation');
  const menu = $('mobile-menu-button');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menu.focus(); } });
  document.addEventListener('click', (e) => { if (nav.classList.contains('is-open') && !e.target.closest('#site-header')) setMenu(false); });

  const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
  document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const ok = await copy(btn.dataset.copy);
    notify(ok ? `${btn.dataset.copyLabel || 'Text'} copied — ${btn.dataset.copy}` : btn.dataset.copy);
    if (ok) { btn.textContent = 'COPIED'; setTimeout(() => { btn.textContent = 'COPY'; }, 1600); }
  }));
  // The big LET’S CONNECT opens the mail app; copying the address too means something useful
  // happens even on computers with no mail app set up.
  document.querySelectorAll('[data-mail]').forEach((a) => a.addEventListener('click', async () => {
    const ok = await copy(a.dataset.mail);
    notify(ok ? `Opening your email app · ${a.dataset.mail} is copied too` : `Email ${a.dataset.mail}`);
  }));

  const header = $('site-header');
  const progress = $('reading-progress');
  const heroImages = [...document.querySelectorAll('.hero-image')];
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    header.classList.toggle('scrolled', scrollY > 80);
    const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    progress.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
    if (!reducedMotion && scrollY < innerHeight * 1.2) {
      heroImages.forEach((el) => el.style.setProperty('--py', `${(-scrollY * Number(el.dataset.depth) / 160).toFixed(1)}px`));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        reveal.unobserve(entry.target);
        if (entry.target.classList.contains('hero-art')) {
          setTimeout(() => entry.target.classList.add('is-settled'), (intro ? 1450 : 0) + 2300);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

    const links = new Map([...nav.querySelectorAll('a[data-nav]')].map((a) => [a.dataset.nav, a]));
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const link = links.get(entry.target.id);
        if (link && entry.isIntersecting) {
          links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        }
      }
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['projects', 'approach', 'thesis', 'about', 'contact'].forEach((id) => { const el = $(id); if (el) spy.observe(el); });
  } else {
    root.classList.add('reveal-all');
  }
  root.classList.add('js-ready');

  // Arriving on a section link (…/#about) lands below the fixed header.
  const first = location.hash.slice(1);
  if (first && !first.startsWith('sheet') && document.getElementById(first)) {
    requestAnimationFrame(() => scrollTo(0, document.getElementById(first).getBoundingClientRect().top + scrollY - headerOffset()));
  }

  if (!reducedMotion && finePointer) {
    const art = document.querySelector('.hero-art');
    const layers = art.querySelectorAll('[data-depth]');
    art.addEventListener('pointermove', (e) => {
      const box = art.getBoundingClientRect();
      const dx = (e.clientX - box.left) / box.width - 0.5;
      const dy = (e.clientY - box.top) / box.height - 0.5;
      layers.forEach((el) => {
        const d = Number(el.dataset.depth);
        el.style.setProperty('--mx', `${(dx * d).toFixed(1)}px`);
        el.style.setProperty('--my', `${(dy * d).toFixed(1)}px`);
      });
    }, { passive: true });
    art.addEventListener('pointerleave', () => layers.forEach((el) => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); }));
    setupCursorLabel();
    setupMagnetic();
  }
}

/* A small pill that trails the pointer over anything that opens a drawing. */
function setupCursorLabel() {
  const label = $('cursor-label');
  const text = $('cursor-text');
  let x = -100, y = -100, tx = -100, ty = -100, raf = 0, active = null;
  const loop = () => {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX + 46; ty = e.clientY + 30;
    if (!active) { x = tx; y = ty; }
    const target = e.target.closest?.('[data-cursor]');
    if (target !== active) {
      active = target;
      label.classList.toggle('is-active', Boolean(target));
      if (target) text.textContent = target.dataset.cursor;
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { active = null; label.classList.remove('is-active'); });
}

/* Primary buttons lean slightly toward the pointer. */
function setupMagnetic() {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 4).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- viewer state ---------- */
const viewer = $('viewer');
const stage = $('viewer-stage');
const frame = $('pdf-frame');
const img = $('sheet-image');
const tileLayer = $('tile-layer');

let currentPage = 0;
let zoom = 1;
let isOpen = false;
let pushedHistory = false;
let lastFocused = null;
let previewToken = 0;

/* ---------- routing ---------- */
function parseHash() {
  const m = location.hash.match(/^#sheet\/(\d{1,2})$/);
  return m ? clamp(Number(m[1]), 1, PAGE_COUNT) : null;
}
function openViewer(page, origin = null) {
  page = clamp(page, 1, PAGE_COUNT);
  if (isOpen) { goTo(page); return; }
  history.pushState({ viewer: true }, '', `#sheet/${page}`);
  pushedHistory = true;
  showViewer(page, origin);
}
function handleRoute() {
  const page = parseHash();
  if (page) {
    if (!isOpen) { pushedHistory = Boolean(history.state?.viewer); showViewer(page); }
    else if (page !== currentPage) goTo(page, false);
  } else if (isOpen) {
    closeViewer();
  }
}
function requestClose() {
  if (pushedHistory && history.state?.viewer) { history.back(); return; }
  history.replaceState(null, '', location.pathname + location.search);
  closeViewer();
}

/* ---------- open / close ----------
   The viewer opens as an iris from wherever you clicked and closes back into it. */
let settleTimer = null;
function setOrigin(origin) {
  viewer.style.setProperty('--ox', origin ? `${Math.round(origin.x)}px` : '50%');
  viewer.style.setProperty('--oy', origin ? `${Math.round(origin.y)}px` : '50%');
}
function showViewer(page, origin = null) {
  isOpen = true;
  lastFocused = document.activeElement;
  setOrigin(origin);
  viewer.inert = false;
  viewer.setAttribute('aria-hidden', 'false');
  viewer.classList.remove('is-settled');
  viewer.classList.add('is-open', 'is-opening');
  document.body.classList.add('viewer-open');
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { if (isOpen) viewer.classList.add('is-settled'); viewer.classList.remove('is-opening'); }, reducedMotion ? 0 : 1300);
  applyRail();
  $('viewer-close').focus({ preventScroll: true });
  goTo(page, false);
}
function closeViewer() {
  if (!isOpen) return;
  isOpen = false;
  previewToken++;
  clearTiles();
  setNote(false);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  viewer.classList.remove('is-fullscreen', 'is-idle', 'show-thumbs');
  clearTimeout(idleTimer);
  clearTimeout(settleTimer);
  // Close back into whatever opened it, if that is still on screen.
  const back = lastFocused && !viewer.contains(lastFocused) ? lastFocused.getBoundingClientRect() : null;
  if (back && back.width && back.bottom > 0 && back.top < innerHeight) setOrigin({ x: back.left + back.width / 2, y: back.top + back.height / 2 });
  viewer.classList.remove('is-settled', 'is-opening');
  void viewer.offsetWidth; // restart from the full circle so the close animates
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  viewer.inert = true;
  document.body.classList.remove('viewer-open');
  currentPage = 0;
  img.classList.remove('is-loaded');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({ preventScroll: true });
}

/* ---------- fullscreen idle ---------- */
let idleTimer = 0;
function wake() {
  viewer.classList.remove('is-idle');
  clearTimeout(idleTimer);
  if (!viewer.classList.contains('is-fullscreen')) return;
  idleTimer = setTimeout(() => {
    const busy = !$('viewer-note').hidden || !$('viewer-loading').hidden
      || viewer.querySelector('.viewer-sidebar:hover, .viewer-controls:hover, .viewer-thumbs:hover, .viewer-topbar:hover')
      || (document.activeElement && viewer.contains(document.activeElement) && document.activeElement !== stage && document.activeElement.matches(':focus-visible'));
    if (busy) wake(); else viewer.classList.add('is-idle');
  }, 2600);
}

/* ---------- contents panel: full, or a slim rail that slides open on hover ---------- */
const RAIL_KEY = 'np-viewer-rail';
let railPref = false;
try { railPref = localStorage.getItem(RAIL_KEY) === '1'; } catch { /* storage blocked */ }
function applyRail() {
  const rail = Boolean(document.fullscreenElement) || railPref;
  viewer.classList.toggle('is-rail', rail);
  const t = $('rail-toggle');
  t.setAttribute('aria-expanded', String(!rail));
  t.title = rail ? 'Keep the contents panel open' : 'Collapse the contents panel';
  $('rail-toggle-text').textContent = rail ? 'Expand contents' : 'Collapse contents';
}

function goTo(page, updateUrl = true) {
  page = clamp(page, 1, PAGE_COUNT);
  if (page === currentPage) return;
  const direction = currentPage ? (page > currentPage ? 'next' : 'prev') : null;
  const chapterChanged = chapterFor(page) !== chapterFor(currentPage || page) || !currentPage;
  currentPage = page;
  zoom = 1;
  clearTiles();
  if (updateUrl) history.replaceState(history.state, '', `#sheet/${page}`);
  updateChrome(chapterChanged);
  stage.scrollTop = 0; stage.scrollLeft = 0;
  loadPreview(page, direction);
}

/* ---------- chrome: labels, chapters, thumbnails ---------- */
function updateChrome(rebuildThumbs) {
  const n = currentPage;
  const ch = chapterFor(n);
  const caption = CAPTIONS[n] || '';
  $('viewer-breadcrumb-project').textContent = ch.title.toUpperCase();
  $('viewer-breadcrumb-page').textContent = `${pad(n)} OF ${PAGE_COUNT}`;
  $('viewer-sheet-label').textContent = caption;
  $('viewer-page-count').innerHTML = `${pad(n)} <span>/</span> ${PAGE_COUNT}`;
  $('viewer-prev').disabled = n <= 1;
  $('viewer-next').disabled = n >= PAGE_COUNT;
  img.alt = `Sheet ${n} of ${PAGE_COUNT}, ${ch.title}: ${caption}`;
  $('viewer-announce').textContent = `Sheet ${n} of ${PAGE_COUNT}. ${ch.title}. ${caption}`;

  $('open-pdf').href = sheetPdf(n);
  $('open-pdf').setAttribute('aria-label', `Open the original PDF of sheet ${n} in a new tab, ${mb(SHEET_BYTES[n])}`);
  const dl = $('download-sheet');
  dl.href = sheetPdf(n);
  dl.download = `Niharika-Patil-${pad(n)}-${slug(ch.title)}.pdf`;
  $('download-sheet-size').textContent = mb(SHEET_BYTES[n]);
  dl.setAttribute('aria-label', `Download original sheet ${n} as PDF, ${mb(SHEET_BYTES[n])}`);
  const full = $('download-full');
  if (FULL_ORIGINAL_PDF_URL && /^https?:\/\//.test(FULL_ORIGINAL_PDF_URL)) { full.href = FULL_ORIGINAL_PDF_URL; full.hidden = false; }

  const nav = $('viewer-chapters');
  nav.querySelectorAll('.chapter-btn').forEach((btn) => {
    const active = btn.dataset.chapter === ch.id;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
  });
  $('chapter-select').value = ch.id;

  const hasNote = Boolean(ch.intro || ch.facts);
  $('viewer-info').hidden = !hasNote;
  if (hasNote) fillNote(ch); else setNote(false);

  if (rebuildThumbs) {
    const thumbs = $('viewer-thumbs');
    thumbs.innerHTML = '';
    for (let s = ch.start; s <= ch.end; s++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb-btn';
      b.dataset.thumbPage = String(s);
      b.setAttribute('aria-label', `Sheet ${s}: ${CAPTIONS[s]}`);
      b.innerHTML = `<img src="${thumbURL(s)}" alt="" loading="lazy" decoding="async" /><span class="thumb-number">${pad(s)}</span>`;
      b.addEventListener('click', () => goTo(s));
      thumbs.append(b);
    }
  }
  $('viewer-thumbs').querySelectorAll('.thumb-btn').forEach((b) => {
    const active = Number(b.dataset.thumbPage) === n;
    b.classList.toggle('active', active);
    if (active) { b.setAttribute('aria-current', 'page'); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else b.removeAttribute('aria-current');
  });
  updateZoomLabel();
}

function fillNote(ch) {
  $('viewer-note-number').textContent = ch.number === '—' ? '' : `PROJECT ${ch.number}`;
  $('viewer-note-title').textContent = ch.title;
  $('viewer-note-sub').textContent = ch.subtitle || '';
  $('viewer-note-intro').textContent = ch.intro || '';
  $('viewer-note-intro').hidden = !ch.intro;
  $('viewer-note-facts').innerHTML = (ch.facts || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
function setNote(open) {
  $('viewer-note').hidden = !open;
  $('viewer-info').setAttribute('aria-expanded', String(open));
}

function buildChapterNav() {
  const nav = $('viewer-chapters');
  nav.innerHTML = CHAPTERS.map((c) => `<button class="chapter-btn" type="button" data-chapter="${c.id}" data-chapter-page="${c.start}"><span>${c.number}</span><strong>${c.title.toUpperCase()}</strong><span class="chapter-arrow" aria-hidden="true">↗</span></button>`).join('');
  nav.querySelectorAll('[data-chapter-page]').forEach((btn) => btn.addEventListener('click', () => goTo(Number(btn.dataset.chapterPage))));
  const select = $('chapter-select');
  select.innerHTML = CHAPTERS.map((c) => `<option value="${c.id}">${c.number === '—' ? '' : `${c.number} · `}${c.title}</option>`).join('');
  select.addEventListener('change', () => { const c = CHAPTERS.find((x) => x.id === select.value); if (c) goTo(c.start); });
}

/* ---------- layout & zoom ---------- */
function fitWidth() {
  const padX = innerWidth < 640 ? 12 : 32;
  const padY = innerWidth < 640 ? 12 : 26;
  const w = Math.max(120, stage.clientWidth - padX * 2);
  const h = Math.max(100, stage.clientHeight - padY * 2);
  return Math.min(w, h / SHEET_RATIO);
}
// Zoom only as far as the full-resolution tiles stay sharp on this screen.
function maxZoom() {
  return clamp((TILES.width * 1.5) / (fitWidth() * dprNow()), 3, MAX_ZOOM_CAP);
}
function layout() {
  zoom = clamp(zoom, MIN_ZOOM, maxZoom());
  const w = Math.round(fitWidth() * zoom);
  const h = Math.round(w * SHEET_RATIO);
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  img.sizes = `${w}px`;
  stage.classList.toggle('is-zoomed', zoom > 1.001);
  updateZoomLabel();
  scheduleTiles();
  return w;
}
function updateZoomLabel() {
  $('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  $('zoom-reset').disabled = zoom <= 1.001;
  $('zoom-out').disabled = zoom <= MIN_ZOOM + 0.001;
  $('zoom-in').disabled = zoom >= maxZoom() - 0.001;
  $('viewer-meta').textContent = tilesWanted() ? 'A3 · FULL-RESOLUTION DETAIL' : 'A3 LANDSCAPE';
}

function zoomTo(value, clientX, clientY) {
  if (!isOpen) return;
  const next = clamp(value, MIN_ZOOM, maxZoom());
  if (Math.abs(next - zoom) < 0.001) return;
  const sr = stage.getBoundingClientRect();
  const cx = clientX ?? sr.left + sr.width / 2;
  const cy = clientY ?? sr.top + sr.height / 2;
  const before = frame.getBoundingClientRect();
  const fx = clamp((cx - before.left) / before.width, 0, 1);
  const fy = clamp((cy - before.top) / before.height, 0, 1);
  zoom = next;
  layout();
  const after = frame.getBoundingClientRect();
  stage.scrollLeft += after.left + fx * after.width - cx;
  stage.scrollTop += after.top + fy * after.height - cy;
}

/* ---------- preview images (instant) ---------- */
const ghost = $('sheet-ghost');
let turnTimer = null;
function loadPreview(page, direction = null) {
  const token = ++previewToken;
  layout();
  const hadImage = img.classList.contains('is-loaded') && direction && !reducedMotion;
  const oldSrc = img.currentSrc || img.src;
  if (!hadImage) {
    img.classList.remove('is-loaded');
    frame.style.backgroundImage = `url("${thumbURL(page)}")`;
  }
  const slow = setTimeout(() => { if (token === previewToken) showLoading('PREPARING THE DRAWING', true); }, 450);

  const probe = new Image();
  probe.decoding = 'async';
  probe.sizes = img.sizes;
  probe.srcset = previewSrcset(page);
  probe.src = path(`assets/sheets/sheet-${pad(page)}-2000.webp`);
  const show = () => {
    clearTimeout(slow);
    if (token !== previewToken) return;
    frame.style.backgroundImage = `url("${thumbURL(page)}")`;
    clearTimeout(turnTimer);
    frame.classList.remove('turn-next', 'turn-prev');
    if (hadImage) {
      ghost.src = oldSrc;
      void frame.offsetWidth;
      frame.classList.add(`turn-${direction}`);
      turnTimer = setTimeout(() => frame.classList.remove('turn-next', 'turn-prev'), 750);
    }
    img.sizes = probe.sizes;
    img.srcset = probe.srcset;
    img.src = probe.src;
    img.classList.add('is-loaded');
    hideLoading();
    prefetchNeighbours(page);
  };
  // decode() can reject for reasons unrelated to the file; show the image anyway.
  probe.decode().then(show, show);
}
function prefetchNeighbours(page) {
  for (const n of [page + 1, page - 1]) {
    if (n < 1 || n > PAGE_COUNT) continue;
    const p = new Image();
    p.fetchPriority = 'low';
    p.sizes = img.sizes;
    p.srcset = previewSrcset(n);
  }
}

/* ---------- full-resolution tiles (deep zoom) ----------
   Each sheet is also published as a 9600 px image cut into a grid of tiles. When the sheet is
   shown larger than the preview can cover, the tiles in view are loaded on top of it. They are
   ordinary images placed in percentages of the sheet, so they move and scale with it exactly,
   and they all belong to one sheet: turning the page removes them. */
const tiles = new Map(); // "col-row" -> <img>, for tilesPage only
let tilesPage = 0;
let tileRaf = 0;
const pct = (v, of) => `${(v / of) * 100}%`;
function tilesWanted() {
  return frame.offsetWidth * dprNow() > MAX_PREVIEW_PX * 1.1;
}
function clearTiles() {
  cancelAnimationFrame(tileRaf);
  tileRaf = 0;
  for (const t of tiles.values()) { t.onload = null; t.removeAttribute('src'); }
  tileLayer.replaceChildren();
  tiles.clear();
  tilesPage = 0;
}
function scheduleTiles() {
  if (!tileRaf) tileRaf = requestAnimationFrame(updateTiles);
}
function updateTiles() {
  tileRaf = 0;
  if (!isOpen || !currentPage || !tilesWanted()) return;
  if (tilesPage !== currentPage) { clearTiles(); tilesPage = currentPage; }
  const { width: W, height: H, size: S, bleed: B, cols, rows } = TILES;
  const fw = frame.offsetWidth, fh = frame.offsetHeight;
  const left = stage.scrollLeft - frame.offsetLeft, top = stage.scrollTop - frame.offsetTop;
  const mx = stage.clientWidth * 0.3, my = stage.clientHeight * 0.3; // a margin so short pans are already sharp
  const c0 = clamp(Math.floor(((left - mx) / fw) * W / S), 0, cols - 1);
  const c1 = clamp(Math.floor(((left + stage.clientWidth + mx) / fw) * W / S), 0, cols - 1);
  const r0 = clamp(Math.floor(((top - my) / fh) * H / S), 0, rows - 1);
  const r1 = clamp(Math.floor(((top + stage.clientHeight + my) / fh) * H / S), 0, rows - 1);
  const page = currentPage;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const key = `${c}-${r}`;
      if (tiles.has(key)) continue;
      const x = c * S, y = r * S;
      const t = new Image();
      t.className = 'tile';
      t.alt = '';
      t.decoding = 'async';
      t.draggable = false;
      Object.assign(t.style, { left: pct(x, W), top: pct(y, H), width: pct(Math.min(S + B, W - x), W), height: pct(Math.min(S + B, H - y), H) });
      t.onload = () => { if (page === currentPage) t.classList.add('is-loaded'); };
      t.src = path(`assets/tiles/sheet-${pad(page)}/${key}.webp`);
      tileLayer.append(t);
      tiles.set(key, t);
    }
  }
}

/* ---------- loading indicator ---------- */
function showLoading(text, soft) {
  const el = $('viewer-loading');
  el.hidden = false;
  el.classList.toggle('is-soft', Boolean(soft));
  $('viewer-loading-text').textContent = text;
  $('loading-bar').style.transform = 'scaleX(0)';
  el.classList.add('is-indeterminate');
}
function hideLoading() { $('viewer-loading').hidden = true; }

/* ---------- input ---------- */
function setupViewer() {
  buildChapterNav();
  $('viewer-close').addEventListener('click', requestClose);
  $('viewer-home').addEventListener('click', requestClose);
  $('sidebar-home').addEventListener('click', requestClose);
  $('rail-toggle').addEventListener('click', () => {
    const toRail = !viewer.classList.contains('is-rail');
    if (document.fullscreenElement) {
      viewer.classList.toggle('is-rail', toRail); // just for this fullscreen session
    } else {
      railPref = toRail;
      try { localStorage.setItem(RAIL_KEY, toRail ? '1' : '0'); } catch { /* storage blocked */ }
      applyRail();
    }
    $('rail-toggle').setAttribute('aria-expanded', String(!toRail));
    if (toRail) $('rail-toggle').blur(); // let the panel fold away immediately
  });
  $('viewer-prev').addEventListener('click', () => goTo(currentPage - 1));
  $('viewer-next').addEventListener('click', () => goTo(currentPage + 1));
  $('zoom-in').addEventListener('click', () => zoomTo(zoom * 1.5));
  $('zoom-out').addEventListener('click', () => zoomTo(zoom / 1.5));
  $('zoom-reset').addEventListener('click', () => zoomTo(1));
  $('viewer-info').addEventListener('click', () => setNote($('viewer-note').hidden));
  $('viewer-note-close').addEventListener('click', () => { setNote(false); $('viewer-info').focus(); });

  const fsButton = $('viewer-fullscreen');
  if (!document.fullscreenEnabled) fsButton.hidden = true;
  fsButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewer.requestFullscreen();
    } catch { notify('Fullscreen is not available in this browser.'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const fs = Boolean(document.fullscreenElement);
    $('fullscreen-label').textContent = fs ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
    fsButton.setAttribute('aria-label', fs ? 'Exit fullscreen' : 'Enter fullscreen');
    viewer.classList.toggle('is-fullscreen', fs);
    viewer.classList.remove('is-idle', 'show-thumbs');
    if (fs) {
      wake();
      let seen = false;
      try { seen = sessionStorage.getItem('np-fs-tip') === '1'; sessionStorage.setItem('np-fs-tip', '1'); } catch { /* storage blocked */ }
      if (!seen) notify(finePointer ? 'Controls fade while you look — move the mouse to bring them back' : 'Controls fade while you look — tap to bring them back');
    } else clearTimeout(idleTimer);
    if (isOpen) applyRail();
  });

  // Fullscreen: let the controls fade after a few still seconds; any movement brings them back.
  const wakeFrom = (e) => {
    if (!viewer.classList.contains('is-fullscreen')) return;
    if (e.type === 'pointermove' && e.pointerType === 'mouse') {
      viewer.classList.toggle('show-thumbs', e.clientY > innerHeight - 200 && !e.target.closest('.viewer-sidebar'));
    } else if (e.type !== 'keydown') {
      viewer.classList.add('show-thumbs');
    }
    wake();
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((t) => viewer.addEventListener(t, wakeFrom, { passive: true }));
  // Refit the sheet whenever the stage changes size (rail opening, fullscreen, rotation).
  let fitRaf = 0;
  new ResizeObserver(() => {
    if (!isOpen || fitRaf) return;
    fitRaf = requestAnimationFrame(() => { fitRaf = 0; layout(); });
  }).observe(stage);

  addEventListener('popstate', handleRoute);
  addEventListener('hashchange', handleRoute);
  let resizeTimer = null;
  addEventListener('resize', () => {
    if (!isOpen) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { layout(); }, 160);
  });
  stage.addEventListener('scroll', scheduleTiles, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (document.fullscreenElement) return;
      e.preventDefault();
      if (!$('viewer-note').hidden) { setNote(false); $('viewer-info').focus(); } else requestClose();
      return;
    }
    if (e.key === 'Tab') {
      const items = [...viewer.querySelectorAll('button:not([disabled]),a[href],select,[tabindex="0"]')]
        .filter((el) => !el.hidden && el.getClientRects().length);
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.target.closest('select, input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const keys = {
      ArrowRight: () => goTo(currentPage + 1), ArrowLeft: () => goTo(currentPage - 1),
      PageDown: () => goTo(currentPage + 1), PageUp: () => goTo(currentPage - 1),
      Home: () => goTo(1), End: () => goTo(PAGE_COUNT),
      '+': () => zoomTo(zoom * 1.5), '=': () => zoomTo(zoom * 1.5), '-': () => zoomTo(zoom / 1.5), '0': () => zoomTo(1),
      f: () => fsButton.click(), F: () => fsButton.click(),
    };
    // While zoomed in, arrow keys pan the drawing (native scrolling); Page Up / Page Down still turn sheets.
    if (zoom > 1.001 && e.key.startsWith('Arrow')) {
      if (document.activeElement !== stage) stage.focus({ preventScroll: true });
      return;
    }
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });

  // Trackpad pinch and ctrl/cmd + wheel zoom around the pointer.
  // Wheel events arrive in bursts; apply them once per frame so zooming stays smooth.
  let wheelZoom = null;
  stage.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // lines → pixels (Firefox)
    const step = Math.exp(-clamp(dy, -120, 120) * 0.0035);
    if (!wheelZoom) {
      wheelZoom = { factor: 1, x: e.clientX, y: e.clientY };
      requestAnimationFrame(() => {
        const w = wheelZoom; wheelZoom = null;
        zoomTo(zoom * w.factor, w.x, w.y);
      });
    }
    wheelZoom.factor *= step; wheelZoom.x = e.clientX; wheelZoom.y = e.clientY;
  }, { passive: false });

  // Double-click / double-tap toggles a close-up at that point.
  stage.addEventListener('dblclick', (e) => {
    if (!e.target.closest('#pdf-frame')) return;
    zoomTo(zoom > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
  });

  // Mouse drag to pan when zoomed.
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || zoom <= 1.001 || !e.target.closest('#pdf-frame')) return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop, moved: false };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    stage.scrollLeft = drag.left - (e.clientX - drag.x);
    stage.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const endDrag = () => { drag = null; stage.classList.remove('is-dragging'); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Touch: swipe to turn (at fit), pinch to zoom, double-tap to zoom.
  let touch = null, pinch = null, lastTap = 0, lastTapXY = [0, 0];
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const fr = frame.getBoundingClientRect();
      pinch = { d: dist(e.touches), z: zoom, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, scale: 1 };
      frame.style.transformOrigin = `${pinch.cx - fr.left}px ${pinch.cy - fr.top}px`;
      touch = null;
    } else if (e.touches.length === 1) {
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }
  }, { passive: true });
  stage.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const target = clamp(pinch.z * dist(e.touches) / pinch.d, MIN_ZOOM, maxZoom());
    pinch.scale = target / pinch.z;
    frame.style.transform = `scale(${pinch.scale})`;
  }, { passive: false });
  stage.addEventListener('touchend', (e) => {
    if (pinch) {
      if (e.touches.length < 2) {
        const p = pinch;
        pinch = null;
        frame.style.transform = '';
        zoomTo(p.z * p.scale, p.cx, p.cy);
      }
      return;
    }
    if (!touch || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    const quick = Date.now() - touch.t < 600;
    if (zoom <= 1.001 && quick && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(currentPage + (dx < 0 ? 1 : -1));
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now();
      if (now - lastTap < 320 && Math.hypot(t.clientX - lastTapXY[0], t.clientY - lastTapXY[1]) < 30) {
        zoomTo(zoom > 1.01 ? 1 : 2.5, t.clientX, t.clientY);
        lastTap = 0;
      } else { lastTap = now; lastTapXY = [t.clientX, t.clientY]; }
    }
    touch = null;
  }, { passive: true });

  handleRoute();
}

setupMainSite();
setupViewer();
