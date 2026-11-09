/* Abstraite — UI wiring: controls, history, saving, shareable links. */
(function () {
  'use strict';
  const { PALETTES, VIBES, COMPOSITIONS, FORMATS, render, randomSeed } = window.Abstraite;

  // Tiny icons for the geometry chips.
  const sv = (body) => '<svg viewBox="0 0 16 16" aria-hidden="true">' + body + '</svg>';
  const ICONS = {
    grid: sv('<rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1v14M1 7h14" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="8" width="7" height="6" fill="currentColor"/>'),
    orbs: sv('<circle cx="4.5" cy="4.5" r="3.2" fill="currentColor"/><circle cx="11.5" cy="11.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 8v8M8 11.5h8" stroke="currentColor" stroke-width="1.2"/>'),
    bars: sv('<rect x="2" y="1" width="3" height="14" fill="currentColor"/><rect x="7" y="4" width="3" height="11" fill="currentColor" opacity=".6"/><rect x="12" y="1" width="2.5" height="10" rx="1.25" fill="currentColor"/>'),
    totem: sv('<circle cx="8" cy="3.5" r="2.5" fill="currentColor"/><rect x="3" y="6.5" width="10" height="2" fill="currentColor"/><rect x="6.5" y="8.5" width="3" height="5" fill="currentColor" opacity=".6"/><path d="M4 15h8" stroke="currentColor" stroke-width="1.5"/>'),
    arches: sv('<path d="M1 15V9a3 3 0 0 1 6 0v6z" fill="currentColor"/><path d="M9 15V5a3 3 0 0 1 6 0v10z" fill="currentColor" opacity=".6"/>'),
    tiles: sv('<path d="M1 1h7v7A7 7 0 0 1 1 1z" fill="currentColor"/><path d="M8 8h7L8 15z" fill="currentColor" opacity=".6"/><rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2"/>'),
    towers: sv('<rect x="1.5" y="6" width="4" height="9" fill="currentColor"/><rect x="6.5" y="2" width="4" height="13" fill="currentColor" opacity=".6"/><path d="M11.5 15V8l2-2.5 2 2.5v7z" fill="currentColor"/>'),
    rings: sv('<path d="M1 12a7 7 0 0 1 14 0h-3a4 4 0 0 0-8 0z" fill="currentColor"/><path d="M0 14.5h16" stroke="currentColor" stroke-width="1.2"/>'),
    diagonals: sv('<path d="M1 15V3l12 12z" fill="currentColor"/><path d="M6 1l9 9" stroke="currentColor" stroke-width="1.5"/>'),
    horizon: sv('<path d="M3 9a5 5 0 0 1 10 0z" fill="currentColor"/><path d="M0 9.5h16M8 9.5L2 16M8 9.5l6 6.5M8 9.5V16" stroke="currentColor" stroke-width="1.2"/>'),
    random: sv('<rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1.3" fill="currentColor"/><circle cx="11" cy="11" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>'),
  };

  const OPTIONS = {
    composition: Object.entries(COMPOSITIONS).map(([id, c]) => ({ id, label: c.name, icon: ICONS[id] })),
    palette: Object.entries(PALETTES).map(([id, p]) => ({ id, label: p.name, swatches: [p.primary, p.bright, p.deep, p.soft, p.ink] })),
    vibe: Object.entries(VIBES).map(([id, v]) => ({ id, label: v.name })),
    format: Object.entries(FORMATS).map(([id, f]) => ({ id, label: f.name })),
    frame: [{ id: 'auto', label: 'Auto' }, { id: 'on', label: 'Always' }, { id: 'off', label: 'None' }],
  };

  const DEFAULTS = { composition: 'random', palette: 'bauhaus', vibe: 'balanced', detail: 3,
    format: 'square', frame: 'auto', gridLines: true, grain: true, seed: randomSeed() };

  const state = Object.assign({}, DEFAULTS, readHash());
  let lastComp = null;
  const recent = [];

  const $ = (id) => document.getElementById(id);
  const canvas = $('art');

  // ---------- Build dropdowns ----------
  document.querySelectorAll('select[data-key]').forEach((sel) => {
    const key = sel.dataset.key;
    OPTIONS[key].forEach((opt) => sel.add(new Option(opt.label, opt.id)));
    sel.addEventListener('change', () => {
      state[key] = sel.value;
      // A new geometry starts a fresh layout; colour/vibe keep the seed
      // so you can see the same piece in a new mood.
      if (key === 'composition') state.seed = randomSeed();
      draw(true);
    });
  });

  // ---------- Build collapsible chip groups (Geometry, Colour, Vibe) ----------
  function swatchEl(colors) {
    const s = document.createElement('span'); s.className = 'swatches';
    colors.forEach((c) => { const i = document.createElement('i'); i.style.background = c; s.appendChild(i); });
    return s;
  }
  document.querySelectorAll('details.group').forEach((group) => {
    const key = group.dataset.key;
    const box = group.querySelector('.chips');
    OPTIONS[key].forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.id = opt.id;
      if (opt.icon) b.insertAdjacentHTML('beforeend', opt.icon);
      if (opt.swatches) b.appendChild(swatchEl(opt.swatches));
      b.appendChild(document.createTextNode(opt.label));
      b.addEventListener('click', () => {
        state[key] = opt.id;
        // A new geometry starts a fresh layout; colour/vibe keep the seed
        // so you can see the same piece in a new mood.
        if (key === 'composition') state.seed = randomSeed();
        draw(true);
      });
      box.appendChild(b);
    });
  });

  // ---------- Other controls ----------
  $('detail').addEventListener('input', (e) => { state.detail = +e.target.value; draw(true); });
  $('gridLines').addEventListener('change', (e) => { state.gridLines = e.target.checked; draw(true); });
  $('grain').addEventListener('change', (e) => { state.grain = e.target.checked; draw(true); });
  $('seed').addEventListener('change', (e) => {
    const v = e.target.value.trim().toUpperCase();
    state.seed = v || randomSeed();
    draw(true);
  });
  $('generate').addEventListener('click', regenerate);
  $('save').addEventListener('click', save);
  $('copyLink').addEventListener('click', copyLink);

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea, button, summary') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); regenerate(); }
    else if (e.key === 's' || e.key === 'S') { e.preventDefault(); save(); }
  });

  function regenerate() { state.seed = randomSeed(); draw(true); }

  // ---------- Render ----------
  function syncControls() {
    document.querySelectorAll('select[data-key]').forEach((sel) => { sel.value = state[sel.dataset.key]; });
    document.querySelectorAll('details.group').forEach((group) => {
      const key = group.dataset.key;
      group.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state[key])));
      // Show the current choice in the header, so it is visible while collapsed.
      const opt = OPTIONS[key].find((o) => o.id === state[key]);
      const val = group.querySelector('.g-value');
      val.innerHTML = '';
      if (opt.swatches) val.appendChild(swatchEl(opt.swatches));
      val.appendChild(document.createTextNode(opt.label));
    });
    $('detail').value = state.detail; $('detailOut').textContent = state.detail;
    $('gridLines').checked = state.gridLines; $('grain').checked = state.grain;
    $('seed').value = state.seed;
  }

  function draw(addToHistory) {
    // Render at the screen's pixel density so lines stay crisp.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    lastComp = render(canvas, state, dpr);
    const F = FORMATS[state.format];
    canvas.style.aspectRatio = F.w + ' / ' + F.h;
    syncControls();
    writeHash();
    $('meta').textContent = `${COMPOSITIONS[lastComp].name} · ${PALETTES[state.palette].name} · ${VIBES[state.vibe].name} · seed ${state.seed}`;
    if (addToHistory) pushHistory();
  }

  // ---------- History ----------
  function pushHistory() {
    const snap = Object.assign({}, state);
    const key = JSON.stringify(snap);
    const existing = recent.findIndex((h) => h.key === key);
    if (existing === 0) return markCurrent(key);
    if (existing > 0) recent.splice(existing, 1);
    // Small thumbnail from the current canvas.
    const t = document.createElement('canvas');
    const th = 144, tw = Math.round((canvas.width / canvas.height) * th);
    t.width = tw; t.height = th;
    t.getContext('2d').drawImage(canvas, 0, 0, tw, th);
    recent.unshift({ key, snap, src: t.toDataURL('image/png') });
    if (recent.length > 16) recent.pop();
    renderHistory(key);
  }
  function renderHistory(currentKey) {
    const el = $('history');
    el.innerHTML = '';
    recent.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = 'Back to seed ' + h.snap.seed;
      b.dataset.key = h.key;
      const img = document.createElement('img'); img.src = h.src; img.alt = 'Artwork ' + h.snap.seed;
      b.appendChild(img);
      b.addEventListener('click', () => { Object.assign(state, h.snap); draw(false); markCurrent(h.key); });
      el.appendChild(b);
    });
    markCurrent(currentKey);
  }
  function markCurrent(key) {
    $('history').querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.key === key)));
  }

  // ---------- Save ----------
  function save() {
    const scale = +$('exportScale').value || 2;
    const out = document.createElement('canvas');
    render(out, state, scale);
    const name = `abstraite-${lastComp}-${state.palette}-${state.seed}.png`.toLowerCase();
    out.toBlob((blob) => {
      if (!blob) return toast('Could not create the image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Saved ${name} (${out.width}×${out.height})`);
    }, 'image/png');
  }

  // ---------- Shareable link (settings live in the URL hash) ----------
  function writeHash() {
    const p = new URLSearchParams({ c: state.composition, p: state.palette, v: state.vibe, d: state.detail,
      f: state.format, fr: state.frame, l: state.gridLines ? 1 : 0, g: state.grain ? 1 : 0, s: state.seed });
    window.history.replaceState(null, "", "#" + p.toString());
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const out = {};
    if (COMPOSITIONS[p.get('c')]) out.composition = p.get('c');
    if (PALETTES[p.get('p')]) out.palette = p.get('p');
    if (VIBES[p.get('v')]) out.vibe = p.get('v');
    const d = +p.get('d'); if (d >= 1 && d <= 5) out.detail = d;
    if (FORMATS[p.get('f')]) out.format = p.get('f');
    if (['auto', 'on', 'off'].includes(p.get('fr'))) out.frame = p.get('fr');
    if (p.has('l')) out.gridLines = p.get('l') === '1';
    if (p.has('g')) out.grain = p.get('g') === '1';
    if (p.get('s')) out.seed = p.get('s').slice(0, 24).toUpperCase();
    return out;
  }
  function copyLink() {
    const url = location.href;
    const done = () => toast('Link copied — it opens this exact artwork');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link:', url));
    else { const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } i.remove(); }
  }

  // ---------- Toast ----------
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  draw(true);
})();
