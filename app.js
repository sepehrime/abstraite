/* Abstraite — UI wiring: controls, history, saving, shareable links. */
(function () {
  'use strict';
  const { PALETTES, VIBES, COMPOSITIONS, FORMATS, render, randomSeed } = window.Abstraite;

  const ICONS = {
    grid: '<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1v14M1 7h14" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="8" width="7" height="6" fill="currentColor"/></svg>',
    orbs: '<svg viewBox="0 0 16 16"><circle cx="4.5" cy="4.5" r="3.2" fill="currentColor"/><circle cx="11.5" cy="11.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 8v8M8 11.5H16" stroke="currentColor" stroke-width="1.2"/></svg>',
    bars: '<svg viewBox="0 0 16 16"><rect x="2" y="1" width="3" height="14" fill="currentColor"/><rect x="7" y="4" width="3" height="11" fill="currentColor" opacity=".6"/><rect x="12" y="1" width="2.5" height="10" rx="1.25" fill="currentColor"/></svg>',
    totem: '<svg viewBox="0 0 16 16"><circle cx="8" cy="3.5" r="2.5" fill="currentColor"/><rect x="3" y="6.5" width="10" height="2" fill="currentColor"/><rect x="6.5" y="8.5" width="3" height="5" fill="currentColor" opacity=".6"/><path d="M4 15h8" stroke="currentColor" stroke-width="1.5"/></svg>',
    arches: '<svg viewBox="0 0 16 16"><path d="M1 15V9a3 3 0 0 1 6 0v6z" fill="currentColor"/><path d="M9 15V5a3 3 0 0 1 6 0v10z" fill="currentColor" opacity=".6"/></svg>',
    random: '<svg viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1.3" fill="currentColor"/><circle cx="11" cy="11" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/></svg>',
  };

  const OPTIONS = {
    composition: Object.entries(COMPOSITIONS).map(([id, c]) => ({ id, label: c.name, icon: ICONS[id] })),
    palette: Object.entries(PALETTES).map(([id, p]) => ({ id, label: p.name, swatches: [p.primary, p.bright, p.deep, p.soft, p.ink] })),
    vibe: Object.entries(VIBES).map(([id, v]) => ({ id, label: v.name })),
    format: Object.entries(FORMATS).map(([id, f]) => ({ id, label: f.name })),
    frame: [{ id: 'auto', label: 'Auto' }, { id: 'on', label: 'Always' }, { id: 'off', label: 'Never' }],
  };

  const DEFAULTS = { composition: 'random', palette: 'bauhaus', vibe: 'balanced', detail: 3,
    format: 'square', frame: 'auto', gridLines: true, grain: true, seed: randomSeed() };

  const state = Object.assign({}, DEFAULTS, readHash());
  let lastComp = null;
  const recent = [];

  const $ = (id) => document.getElementById(id);
  const canvas = $('art');

  // ---------- Build chip groups ----------
  document.querySelectorAll('.chips').forEach((group) => {
    const key = group.dataset.key;
    OPTIONS[key].forEach((opt) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.id = opt.id;
      if (opt.icon) b.insertAdjacentHTML('beforeend', opt.icon);
      if (opt.swatches) {
        const s = document.createElement('span'); s.className = 'swatches';
        opt.swatches.forEach((c) => { const i = document.createElement('i'); i.style.background = c; s.appendChild(i); });
        b.appendChild(s);
      }
      b.appendChild(document.createTextNode(opt.label));
      b.addEventListener('click', () => {
        state[key] = opt.id;
        // Changing geometry or format starts a fresh layout; colour/vibe keep the seed
        // so you can see the same piece in a new mood.
        if (key === 'composition') state.seed = randomSeed();
        draw(true);
      });
      group.appendChild(b);
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
    if (e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); regenerate(); }
    else if (e.key === 's' || e.key === 'S') { e.preventDefault(); save(); }
  });

  function regenerate() { state.seed = randomSeed(); draw(true); }

  // ---------- Render ----------
  function syncControls() {
    document.querySelectorAll('.chips').forEach((group) => {
      const key = group.dataset.key;
      group.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state[key])));
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
