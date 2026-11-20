/* Abstraite — procedural Bauhaus-style art engine.
   Everything is drawn on a <canvas> from a seed, so the same settings + seed
   always give the same picture (that is what makes "Save" and history work). */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  // ---------- Palettes ----------
  // Each palette has four colour "roles" so compositions can ask for
  // a warm accent, a bright accent, a deep tone or a soft tone.
  const PALETTES = {
    bauhaus: { name: 'Bauhaus', bg: '#F2EADC', ink: '#151515', paper: '#FAF6EE', sand: '#E3D8C2',
      primary: '#E2402F', bright: '#F0B23C', deep: '#1F4B6B', soft: '#6F9DB8' },
    sunset: { name: 'Sunset', bg: '#F4E8D8', ink: '#1B1512', paper: '#FBF4EA', sand: '#E8D3BC',
      primary: '#D9452B', bright: '#F2A93B', deep: '#5A2A27', soft: '#E9967A' },
    harbour: { name: 'Harbour', bg: '#ECEEE8', ink: '#121619', paper: '#F7F8F4', sand: '#D5DCD6',
      primary: '#2F7F7A', bright: '#F0C24B', deep: '#17324D', soft: '#8DB8CF' },
    olive: { name: 'Olive', bg: '#F1EBDD', ink: '#1A1A16', paper: '#F9F5EC', sand: '#DED5C0',
      primary: '#C8553D', bright: '#E2B04A', deep: '#2E4A3A', soft: '#93A88A' },
    sorbet: { name: 'Sorbet', bg: '#F8F0E7', ink: '#26243F', paper: '#FFF9F2', sand: '#EBDDCF',
      primary: '#EE8C7E', bright: '#F5CF73', deep: '#3E3B66', soft: '#9EC3DE' },
    mono: { name: 'Mono + red', bg: '#EFEBE3', ink: '#111111', paper: '#FAF8F4', sand: '#DCD6CB',
      primary: '#D93A2B', bright: '#9C9890', deep: '#2B2B2B', soft: '#C9C4BA' },
    night: { name: 'Night', bg: '#16181D', ink: '#EFE6D6', paper: '#D9CFBE', sand: '#2A2E36',
      primary: '#E5533D', bright: '#F2B544', deep: '#3D6E91', soft: '#8FB3C9' },
  };

  // ---------- Vibes ----------
  // A vibe tunes how busy the piece is and which colours dominate.
  const VIBES = {
    calm:     { name: 'Calm',     density: 0.65, fill: 0.22, lines: 0.7, symmetry: 0.8,  frame: 0.6,
      weights: { primary: 1, bright: 1.4, deep: 2, soft: 3.5, ink: 1, sand: 2 } },
    balanced: { name: 'Balanced', density: 1,    fill: 0.35, lines: 1,   symmetry: 0.5,  frame: 0.5,
      weights: { primary: 3, bright: 2.5, deep: 2.5, soft: 2.5, ink: 2, sand: 0.6 } },
    bold:     { name: 'Bold',     density: 1.3,  fill: 0.55, lines: 1.15, symmetry: 0.3, frame: 0.55,
      weights: { primary: 4, bright: 3, deep: 3, soft: 1.4, ink: 3.2, sand: 0.2 } },
    playful:  { name: 'Playful',  density: 1.15, fill: 0.4,  lines: 0.9, symmetry: 0.15, frame: 0.3,
      weights: { primary: 3, bright: 3.5, deep: 2, soft: 3, ink: 1.5, sand: 0.4 } },
    minimal:  { name: 'Minimal',  density: 0.45, fill: 0.15, lines: 0.5, symmetry: 0.6,  frame: 0.35,
      weights: { primary: 3, bright: 1, deep: 2, soft: 1, ink: 2.5, sand: 0.4 } },
  };

  const COMPOSITIONS = {
    grid:   { name: 'Grid & blocks' },
    orbs:   { name: 'Circles' },
    bars:   { name: 'Bars & stripes' },
    tiles:  { name: 'Tile mosaic' },
    rings:  { name: 'Rainbows & pearls' },
    diagonals: { name: 'Triangles & diagonals' },
    shards: { name: 'Shards' },
    splinters: { name: 'Splinters' },
    medallion: { name: 'Medallion' },
    ribbons: { name: 'Ribbons' },
    peaks: { name: 'Peaks' },
    random: { name: 'Surprise me' },
  };

  const FORMATS = {
    square:    { name: 'Square',    w: 1000, h: 1000 },
    portrait:  { name: 'Portrait',  w: 1000, h: 1250 },
    landscape: { name: 'Landscape', w: 1250, h: 1000 },
  };

  // ---------- Seeded random ----------
  function makeRng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /** Blend two #RRGGBB colours; t = 0 gives a, t = 1 gives b. */
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  // ---------- Drawing kit ----------
  function createKit(ctx, rng, P, V, opts) {
    const rand = (a = 0, b = 1) => a + rng() * (b - a);
    const rint = (a, b) => Math.floor(rand(a, b + 1));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const chance = (p) => rng() < p;
    const LW = opts.lineWidth;

    let last = null;
    // Weighted colour pick that avoids repeating the previous colour.
    function color(exclude) {
      const ex = exclude || [];
      const entries = Object.entries(V.weights)
        .filter(([role, w]) => w > 0 && !ex.includes(role) && P[role] !== last);
      let total = entries.reduce((s, [, w]) => s + w, 0);
      let r = rng() * total;
      for (const [role, w] of entries) {
        r -= w;
        if (r <= 0) { last = P[role]; return P[role]; }
      }
      last = P[entries[0][0]];
      return last;
    }
    // Pick a colour that is not ink / sand (for the "hero" shapes).
    const accent = () => color(['ink', 'sand']);

    function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    function box(x, y, w, h, lw = LW) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.lineJoin = 'miter';
      ctx.strokeRect(x, y, w, h);
    }
    function line(x1, y1, x2, y2, lw = LW, col = P.ink) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Grid lines can be switched off by the user; structural lines cannot.
    function gline(x1, y1, x2, y2, lw = LW) { if (opts.gridLines) line(x1, y1, x2, y2, lw); }
    function circle(cx, cy, r, fill) {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    }
    function ring(cx, cy, r, lw = LW, col = P.ink) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    function pie(cx, cy, r, a0, a1, fill) {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fill();
    }
    const HALF_START = { up: Math.PI, down: 0, left: Math.PI / 2, right: -Math.PI / 2 };
    function half(cx, cy, r, dir, fill) { const a = HALF_START[dir]; pie(cx, cy, r, a, a + Math.PI, fill); }
    function splitCircle(cx, cy, r, c1, c2, vertical = true) {
      if (vertical) { half(cx, cy, r, 'left', c1); half(cx, cy, r, 'right', c2); }
      else { half(cx, cy, r, 'up', c1); half(cx, cy, r, 'down', c2); }
    }
    function roundRectPath(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function capsule(x, y, w, h, fill) {
      roundRectPath(x, y, w, h, Math.min(w, h) / 2); ctx.fillStyle = fill; ctx.fill();
    }
    // A capsule cut into horizontal colour bands (like a stacked pill).
    function bandedCapsule(x, y, w, h, colors) {
      ctx.save(); roundRectPath(x, y, w, h, Math.min(w, h) / 2); ctx.clip();
      const n = colors.length; let yy = y;
      const cuts = [];
      for (let i = 0; i < n - 1; i++) cuts.push(rand(0.15, 0.85));
      cuts.sort((a, b) => a - b);
      cuts.push(1);
      cuts.forEach((c, i) => { const ny = y + h * c; rect(x, yy, w, ny - yy + 0.5, colors[i]); yy = ny; });
      ctx.restore();
    }
    function stripes(x, y, w, h, n, colors, vertical) {
      for (let i = 0; i < n; i++) {
        const c = colors[i % colors.length];
        if (vertical) rect(x + (w / n) * i, y, w / n + 0.5, h, c);
        else rect(x, y + (h / n) * i, w, h / n + 0.5, c);
      }
    }
    function hatch(x, y, w, h, n, vertical, lw = LW * 0.6) {
      for (let i = 1; i < n; i++) {
        if (vertical) line(x + (w / n) * i, y, x + (w / n) * i, y + h, lw);
        else line(x, y + (h / n) * i, x + w, y + (h / n) * i, lw);
      }
    }
    function checker(x, y, cols, rows, s) {
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++)
          rect(x + i * s, y + j * s, s + 0.5, s + 0.5, chance(0.15) ? P.paper : color(['sand']));
      for (let i = 0; i <= cols; i++) line(x + i * s, y, x + i * s, y + rows * s, LW * 0.6);
      for (let j = 0; j <= rows; j++) line(x, y + j * s, x + cols * s, y + j * s, LW * 0.6);
    }
    function wave(x1, x2, y, amp, period, lw = LW * 0.5) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.beginPath();
      for (let x = x1; x <= x2; x += 2) {
        const yy = y + Math.sin(((x - x1) / period) * TAU) * amp;
        if (x === x1) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    function crosshair(cx, cy, r, lw = LW * 0.6) {
      line(cx - r, cy, cx + r, cy, lw); line(cx, cy - r, cx, cy + r, lw);
    }
    // Random cut positions between a and b with a minimum gap.
    function cuts(a, b, n, minGap) {
      for (let t = 0; t < 60; t++) {
        const arr = [];
        for (let i = 0; i < n; i++) arr.push(rand(a + minGap, b - minGap));
        arr.sort((p, q) => p - q);
        let ok = true;
        for (let i = 1; i < arr.length; i++) if (arr[i] - arr[i - 1] < minGap) ok = false;
        if (ok) return arr.map(Math.round);
      }
      // fallback: even spacing
      return Array.from({ length: n }, (_, i) => Math.round(a + ((b - a) * (i + 1)) / (n + 1)));
    }

    // Filled polygon from [[x, y], ...]; optional ink outline.
    function poly(pts, fill, lw = 0) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (lw) { ctx.strokeStyle = P.ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
    }

    return { rand, rint, pick, chance, color, accent, rect, box, line, gline, circle, ring, pie, half, poly, mix,
      splitCircle, capsule, bandedCapsule, stripes, hatch, checker, wave, crosshair, cuts, LW, P, V, ctx, showLines: opts.gridLines };
  }

  // ---------- Compositions ----------
  // Each one receives the kit (k) and the drawing area (A).

  function compGrid(k, A) {
    const { P, V } = k;
    const d = A.density;
    const nC = Math.max(2, Math.round(k.rint(3, 4) * Math.sqrt(d)));
    const nR = Math.max(2, Math.round(k.rint(3, 5) * Math.sqrt(d)));
    const xs = [A.x0, ...k.cuts(A.x0, A.x1, nC - 1, A.w * 0.08), A.x1];
    const ys = [A.y0, ...k.cuts(A.y0, A.y1, nR - 1, A.h * 0.07), A.y1];

    // Big merged blocks first (they sit behind single cells).
    const merges = k.rint(1, 2) + (d > 1.1 ? 1 : 0);
    for (let m = 0; m < merges; m++) {
      const i0 = k.rint(0, nC - 1), j0 = k.rint(0, nR - 1);
      const i1 = Math.min(nC, i0 + k.rint(1, 2)), j1 = Math.min(nR, j0 + k.rint(1, 3));
      k.rect(xs[i0], ys[j0], xs[i1] - xs[i0], ys[j1] - ys[j0], k.color(['sand']));
    }

    // Single cells.
    const cells = [];
    for (let i = 0; i < nC; i++) for (let j = 0; j < nR; j++)
      cells.push({ x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j] });
    for (const c of cells) {
      if (!k.chance(V.fill)) continue;
      const col = k.color();
      const style = k.rand();
      if (style < 0.12) k.stripes(c.x, c.y, c.w, c.h, k.rint(3, 6), [col, k.color(), P.paper], k.chance(0.5));
      else if (style < 0.24) { k.rect(c.x, c.y, c.w, c.h, col); k.hatch(c.x, c.y, c.w, c.h, k.rint(3, 6), false); }
      else if (style < 0.34) { // partial fill (bottom or right portion)
        const f = k.rand(0.35, 0.7);
        if (k.chance(0.5)) k.rect(c.x, c.y + c.h * (1 - f), c.w, c.h * f, col);
        else k.rect(c.x, c.y, c.w * f, c.h, col);
      } else k.rect(c.x, c.y, c.w, c.h, col);
    }

    // A small checkerboard block.
    if (k.chance(0.45 * Math.min(1.4, d))) {
      const big = cells.filter((c) => c.w > A.w * 0.18 && c.h > A.h * 0.16);
      if (big.length) {
        const c = k.pick(big);
        const cols = k.rint(3, 5), rows = k.rint(2, 4);
        const s = Math.min((c.w * 0.85) / cols, (c.h * 0.85) / rows);
        k.checker(c.x + (c.w - cols * s) / 2, c.y + (c.h - rows * s) / 2, cols, rows, s);
      }
    }

    // Grid lines (some overshoot the frame a little).
    const over = A.frame ? 0 : k.LW * 4;
    for (let i = 1; i < xs.length - 1; i++) k.gline(xs[i], A.y0 - over, xs[i], A.y1 + over);
    for (let j = 1; j < ys.length - 1; j++) k.gline(A.x0 - over, ys[j], A.x1 + over, ys[j]);

    // Circles sitting on intersections, on top of lines.
    const nCirc = Math.round(k.rand(0.4, 2.4) * Math.min(1.3, d));
    for (let n = 0; n < nCirc; n++) {
      const cx = k.pick(xs.slice(1, -1).length ? xs.slice(1, -1) : xs);
      const cy = k.pick(ys.slice(1, -1).length ? ys.slice(1, -1) : ys);
      const r = Math.min(A.w, A.h) * k.rand(0.05, 0.14);
      k.circle(cx, cy, r, k.color(['sand']));
      if (k.chance(0.5)) k.crosshair(cx, cy, r);
    }

    // Occasional dark ground band.
    if (k.chance(0.25)) k.rect(A.x0, A.y1 - A.h * k.rand(0.1, 0.2), A.w, A.h * 0.2, P.ink);
  }

  function compOrbs(k, A) {
    const { P } = k;
    const d = A.density;
    const cols = k.rint(2, 3) + (d > 1.1 ? 1 : 0);
    const rows = k.rint(3, 4);
    const padX = A.w * 0.14, padY = A.h * 0.13;
    const xs = Array.from({ length: cols }, (_, i) => A.x0 + padX + ((A.w - 2 * padX) * i) / (cols - 1));
    const ground = k.chance(0.3);
    const yBottom = ground ? A.y1 - A.h * 0.3 : A.y1 - padY;
    const ys = Array.from({ length: rows }, (_, i) => A.y0 + padY + ((yBottom - A.y0 - padY) * i) / (rows - 1));
    const dx = xs[1] - xs[0], dy = ys[1] - ys[0];
    const base = Math.min(dx, dy) * 0.3;

    // Ground band with a sun sitting in it.
    if (ground) k.rect(A.x0, A.y1 - A.h * 0.2, A.w, A.h * 0.2, P.ink);

    // Lattice lines.
    for (const x of xs) if (k.chance(0.85)) k.gline(x, A.y0 - (A.frame ? 0 : base * 0.5), x, A.y1 + (A.frame ? 0 : base * 0.5));
    for (const y of ys) {
      if (k.chance(0.55)) k.gline(A.x0, y, A.x1, y);
      else if (k.chance(0.6)) { const i = k.rint(0, cols - 2); k.gline(xs[i], y, xs[i + 1], y); }
    }
    if (!A.frame && k.chance(0.6)) k.line(A.x0, A.y0, A.x1, A.y0);

    const taken = new Set();
    // A pill connecting two nodes vertically.
    if (k.chance(0.7)) {
      const i = k.rint(0, cols - 1), j = k.rint(0, rows - 2);
      const w = base * 1.7;
      const x = xs[i] - w / 2;
      k.ctx.save();
      k.ctx.beginPath(); k.ctx.rect(x, ys[j] - w, w / 2, dy + w * 2); k.ctx.clip();
      k.capsule(x, ys[j] - w / 2, w, dy + w, k.accent());
      k.ctx.restore();
      k.ctx.save();
      k.ctx.beginPath(); k.ctx.rect(x + w / 2, ys[j] - w, w / 2, dy + w * 2); k.ctx.clip();
      k.capsule(x, ys[j] - w / 2, w, dy + w, k.accent());
      k.ctx.restore();
      k.circle(xs[i], ys[j], w / 2, P.ink);
      taken.add(i + ',' + j); taken.add(i + ',' + (j + 1));
    }

    // Waves between neighbours on one row.
    if (k.chance(0.55)) {
      const j = k.rint(0, rows - 1);
      const y = ys[j];
      for (let i = -1; i < cols; i++) {
        const xa = i < 0 ? A.x0 - base * 0.4 : xs[i];
        const xb = i + 1 >= cols ? A.x1 + base * 0.4 : xs[i + 1];
        for (let w = -1; w <= 1; w++) k.wave(xa, xb, y + w * base * 0.2, base * 0.1, base * 1.1);
      }
    }

    // Circles at nodes.
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (taken.has(i + ',' + j)) continue;
      if (!k.chance(Math.min(0.95, 0.7 * d))) continue;
      const x = xs[i], y = ys[j];
      const r = base * k.pick([0.55, 0.8, 1, 1.15]) * (k.chance(0.12) ? 1.6 : 1);
      const t = k.rand();
      if (t < 0.5) k.circle(x, y, r, k.color(['sand']));
      else if (t < 0.65) { // circle with a quarter cut out
        const a = k.pick([0, 0.5, 1, 1.5]) * Math.PI;
        k.pie(x, y, r, a + Math.PI / 2, a + TAU, k.accent());
        k.pie(x, y, r, a, a + Math.PI / 2, P.ink);
      } else if (t < 0.78) k.splitCircle(x, y, r, k.accent(), k.accent(), k.chance(0.5));
      else if (t < 0.88) { k.circle(x, y, r, P.paper); k.ring(x, y, r); }
      else { k.circle(x, y, r, k.accent()); k.crosshair(x, y, r); }
    }

    if (ground) {
      const gx = k.pick(xs);
      const r = base * 1.5;
      k.circle(gx, A.y1 - A.h * 0.2, r, k.accent());
      k.crosshair(gx, A.y1 - A.h * 0.2, r);
    }
  }

  function compBars(k, A) {
    const { P, V } = k;
    const d = A.density;
    const n = Math.max(2, Math.round(k.rint(3, 5) * d));
    const left = A.x0 + A.w * 0.14, right = A.x1 - A.w * 0.14;
    const span = right - left;
    const unit = span / (n * 1.6);

    // Bars laid out left → right with gaps.
    const bars = [];
    let x = left;
    for (let i = 0; i < n; i++) {
      const w = unit * k.rand(0.6, 1.25);
      if (x + w > right) break;
      const full = k.chance(0.3);
      const top = full ? A.y0 : A.y0 + A.h * k.rand(0, 0.3);
      const bot = full ? A.y1 : A.y1 - A.h * k.rand(0, 0.3);
      bars.push({ x, w, top, bot, col: k.color(['sand']), style: k.rand() });
      x += w + unit * k.rand(0.15, 0.8);
    }
    // centre the cluster
    const used = x - left, shift = (span - used) / 2;
    bars.forEach((b) => (b.x += shift));

    function drawBar(b, clipTop, clipBot) {
      const top = Math.max(b.top, clipTop ?? -1e9), bot = Math.min(b.bot, clipBot ?? 1e9);
      if (bot <= top) return;
      if (b.style < 0.6) k.rect(b.x, top, b.w, bot - top, b.col);
      else if (b.style < 0.75) { k.stripes(b.x, top, b.w, bot - top, 5, [b.col, P.paper, P.primary, P.soft], true); k.box(b.x, top, b.w, bot - top, k.LW * 0.8); }
      else if (b.style < 0.9) { k.bandedCapsule(b.x, top, b.w, bot - top, [P.soft, P.primary, P.deep, P.primary]); }
      else k.capsule(b.x, top, b.w, bot - top, b.col);
    }

    // Combs of thin lines on the sides.
    const combs = Math.round(k.rand(1, 2.4) * V.lines);
    for (let c = 0; c < combs; c++) {
      const side = c % 2 === 0 ? 'l' : 'r';
      const cnt = k.rint(3, 6);
      const gap = A.w * k.rand(0.012, 0.03);
      const start = side === 'l' ? A.x0 + A.w * 0.03 : A.x1 - A.w * 0.03 - gap * cnt;
      for (let i = 0; i < cnt; i++) {
        const lx = start + i * gap * k.rand(0.7, 1.4);
        k.gline(lx, A.y0 + (k.chance(0.5) ? 0 : A.h * k.rand(0, 0.15)), lx, A.y1 - (k.chance(0.5) ? 0 : A.h * k.rand(0, 0.15)), k.LW * 0.7);
      }
    }
    if (k.chance(0.8)) k.line(A.x0, A.y0, A.x1, A.y0);
    if (k.chance(0.8)) k.line(A.x0, A.y1, A.x1, A.y1);

    bars.forEach((b) => drawBar(b));

    // A woven horizontal band across the bars.
    if (k.chance(0.7) && bars.length) {
      const bh = A.h * k.rand(0.15, 0.24);
      const by = A.y0 + A.h * k.rand(0.38, 0.58);
      const bx0 = A.x0 + A.w * 0.08, bx1 = A.x1 - A.w * 0.08;
      const rowsN = k.rint(3, 5);
      const bandCols = [P.sand, P.deep, P.soft, P.paper, P.sand];
      k.stripes(bx0, by, bx1 - bx0, bh, rowsN, bandCols.slice(0, rowsN), false);
      if (k.chance(0.5)) k.hatch(bx0, by, bx1 - bx0, bh, rowsN * 3, false, k.LW * 0.35);
      k.box(bx0, by, bx1 - bx0, bh, k.LW * 0.9);
      k.line((bx0 + bx1) / 2, by, (bx0 + bx1) / 2, by + bh, k.LW * 0.8);
      // weave: some bars pass over the band
      bars.forEach((b, i) => { if (i % 2 === 1 && b.style < 0.6) drawBar(b, by, by + bh); });
    }

    // One floating capsule or circle accent.
    if (k.chance(0.5 * d)) {
      const cx = k.chance(0.5) ? A.x0 + A.w * 0.1 : A.x1 - A.w * 0.1;
      k.capsule(cx - unit * 0.3, A.y0 + A.h * k.rand(0.3, 0.5), unit * 0.6, A.h * k.rand(0.2, 0.4), k.accent());
    }
  }

  // Square tiles, each with a simple motif (quarter circles, halves, triangles…).
  function compTiles(k, A) {
    const { P } = k;
    const n = Math.max(3, Math.min(8, Math.round(k.rint(4, 5) * Math.sqrt(A.density))));
    const s = Math.min(A.w, A.h) / n;
    const cols = Math.floor(A.w / s + 0.001), rows = Math.floor(A.h / s + 0.001);
    const ox = A.x0 + (A.w - cols * s) / 2, oy = A.y0 + (A.h - rows * s) / 2;
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = ox + i * s, y = oy + j * s;
      const bg = k.chance(0.55) ? k.color() : P.bg;
      k.rect(x, y, s + 0.5, s + 0.5, bg);
      const fg = k.color([bg === P.bg ? 'sand' : '']);
      const t = k.rand();
      if (t < 0.28) { // quarter circle from a corner
        const [cx, cy] = k.pick(corners);
        const a0 = Math.atan2(0.5 - cy, 0.5 - cx) - Math.PI / 4;
        k.pie(x + cx * s, y + cy * s, s, a0, a0 + Math.PI / 2, fg);
      } else if (t < 0.46) { // half circle on a side
        const d = k.pick(['up', 'down', 'left', 'right']);
        const pos = { up: [0.5, 1], down: [0.5, 0], left: [1, 0.5], right: [0, 0.5] }[d];
        k.half(x + pos[0] * s, y + pos[1] * s, s / 2, d, fg);
      } else if (t < 0.6) { // triangle
        const [cx, cy] = k.pick(corners);
        const ctx = k.ctx; ctx.fillStyle = fg; ctx.beginPath();
        ctx.moveTo(x + cx * s, y + cy * s); ctx.lineTo(x + (1 - cx) * s, y + cy * s); ctx.lineTo(x + cx * s, y + (1 - cy) * s);
        ctx.closePath(); ctx.fill();
      } else if (t < 0.72) { k.circle(x + s / 2, y + s / 2, s * k.pick([0.2, 0.35, 0.42]), fg); }
      else if (t < 0.8) { k.stripes(x, y, s, s, k.pick([3, 4, 6]), [fg, bg === P.bg ? P.paper : P.bg], k.chance(0.5)); }
      else if (t < 0.86) { k.ring(x + s / 2, y + s / 2, s * 0.3, k.LW); }
      // else: plain tile
    }
    if (k.chance(0.7)) {
      for (let i = 1; i < cols; i++) k.gline(ox + i * s, oy, ox + i * s, oy + rows * s, k.LW * 0.5);
      for (let j = 1; j < rows; j++) k.gline(ox, oy + j * s, ox + cols * s, oy + j * s, k.LW * 0.5);
    }
    if (!A.frame) k.box(ox, oy, cols * s, rows * s, k.LW);
  }

  // Concentric rainbow arcs, a target and pearls on a wire.
  function compRings(k, A) {
    const { P } = k;
    const groups = A.density > 1.05 && k.chance(0.6) ? 2 : 1;
    const base = A.y0 + A.h * k.rand(0.58, 0.68);
    const xs = groups === 1 ? [A.x0 + A.w * k.rand(0.4, 0.6)] : [A.x0 + A.w * 0.27, A.x0 + A.w * 0.73];
    xs.forEach((cx) => {
      const R = groups === 1 ? A.w * k.rand(0.26, 0.36) : A.w * k.rand(0.17, 0.22);
      const bands = k.rint(4, 7);
      const dir = 'up';
      for (let b = 0; b < bands; b++) {
        const col = b === bands - 1 && k.chance(0.5) ? P.bg : k.color(['sand']);
        k.half(cx, base, R * (1 - b / bands), dir, col);
      }
    });
    k.line(A.x0, base, A.x1, base, k.LW);
    // A target of rings up in the sky.
    if (k.chance(0.75)) {
      const tr = A.w * k.rand(0.07, 0.11);
      const tx = A.x0 + A.w * (k.chance(0.5) ? k.rand(0.1, 0.25) : k.rand(0.75, 0.9)) , ty = A.y0 + A.h * k.rand(0.12, 0.22);
      const n = k.rint(2, 4);
      for (let i = 0; i < n; i++) k.circle(tx, ty, tr * (1 - i / n), i % 2 ? P.bg : k.accent());
    }
    // Wire with pearls.
    const wy = A.y0 + A.h * k.rand(0.8, 0.88);
    k.line(A.x0, wy, A.x1, wy, k.LW * 0.6);
    const pearls = Math.max(3, Math.round(k.rint(4, 7) * A.density));
    for (let i = 0; i < pearls; i++) {
      const px = A.x0 + (A.w * (i + 0.5)) / pearls;
      const r = (A.w / pearls) * k.rand(0.18, 0.38);
      if (k.chance(0.25)) { k.circle(px, wy, r, P.paper); k.ring(px, wy, r, k.LW * 0.7); }
      else k.circle(px, wy, r, k.color(['sand']));
    }
    // A few drops hanging from the top.
    const drops = k.rint(1, 3);
    for (let i = 0; i < drops; i++) {
      const dx = A.x0 + A.w * (0.3 + i * 0.2 + k.rand(-0.05, 0.05)), dl = A.h * k.rand(0.12, 0.28);
      k.gline(dx, A.y0, dx, A.y0 + dl, k.LW * 0.6);
      k.circle(dx, A.y0 + dl, A.w * 0.025, k.accent());
    }
  }

  // Big triangles and diagonal bands.
  function compDiagonals(k, A) {
    const { P } = k;
    const ctx = k.ctx;
    const tri = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
    const { x0, y0, x1, y1, w, h } = A;
    // Half-square triangle grid in one region.
    const n = k.rint(2, 4);
    const s = Math.min(w, h) * k.rand(0.11, 0.15);
    const gx = k.chance(0.5) ? x0 : x1 - n * s, gy = k.chance(0.5) ? y0 : y1 - n * s;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = gx + i * s, y = gy + j * s;
      if (k.chance(0.5)) tri([[x, y], [x + s, y], [x, y + s]], k.color(['sand']));
      else tri([[x + s, y], [x + s, y + s], [x, y + s]], k.color(['sand']));
    }
    // Large triangles from corners.
    const bigs = Math.max(1, Math.round(k.rint(1, 3) * Math.min(1.2, A.density)));
    const cornerTris = [
      [[x0, y1], [x0 + w * 0.6, y1], [x0, y1 - h * 0.6]],
      [[x1, y0], [x1, y0 + h * 0.55], [x1 - w * 0.55, y0]],
      [[x0 + w * 0.2, y1], [x0 + w * 0.5, y0 + h * 0.3], [x0 + w * 0.8, y1]],
      [[x1, y1], [x1 - w * 0.45, y1], [x1, y1 - h * 0.45]],
    ];
    for (let i = 0; i < bigs; i++) tri(k.pick(cornerTris), k.accent());
    // Diagonal band of parallel lines.
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    const off = k.rand(-0.3, 0.3) * w;
    const lines = k.rint(4, 8), gap = w * 0.018;
    const sgn = k.chance(0.5) ? 1 : -1;
    for (let i = 0; i < lines; i++) {
      const o = off + i * gap;
      if (sgn > 0) k.gline(x0 + o, y1, x1 + o, y0, k.LW * 0.6);
      else k.gline(x0 + o, y0, x1 + o, y1, k.LW * 0.6);
    }
    ctx.restore();
    // Solid diagonal bar.
    if (k.chance(0.6)) {
      const bw = w * 0.07, c = k.accent();
      ctx.save(); ctx.translate((x0 + x1) / 2, (y0 + y1) / 2); ctx.rotate(sgn * -Math.PI / 4);
      k.rect(-w * 0.45, -bw / 2 + k.rand(-0.2, 0.2) * w, w * 0.9, bw, c); ctx.restore();
    }
    // Circle accent.
    const r = Math.min(w, h) * k.rand(0.08, 0.16);
    const cx = x0 + w * k.rand(0.25, 0.75), cy = y0 + h * k.rand(0.25, 0.6);
    if (k.chance(0.5)) k.circle(cx, cy, r, k.accent()); else { k.splitCircle(cx, cy, r, P.ink, k.accent(), k.chance(0.5)); }
  }

  // ---------- Shards: area cut by straight lines into angular planes ----------

  /** Split a convex polygon by the line through (px, py) at angle a. Returns [sideA, sideB]. */
  function splitPoly(pts, px, py, a) {
    const dx = Math.cos(a), dy = Math.sin(a);
    const side = (p) => (p[0] - px) * dy - (p[1] - py) * dx;
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const sp = side(p), sq = side(q);
      if (sp >= 0) L.push(p);
      if (sp <= 0) R.push(p);
      if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
        const t = sp / (sp - sq);
        const m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        L.push(m); R.push(m);
      }
    }
    return [L, R];
  }
  function polyArea(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(s) / 2;
  }
  function centroid(pts) {
    const n = pts.length;
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }

  function compShards(k, A) {
    const { x0, y0, x1, y1 } = A;
    let pieces = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
    const cuts = Math.round(k.rint(5, 9) * A.density);
    for (let i = 0; i < cuts; i++) {
      // Always cut the biggest piece, near its middle, so pieces stay balanced.
      pieces.sort((a, b) => polyArea(b) - polyArea(a));
      const big = pieces.shift();
      const [cx, cy] = centroid(big);
      const r = Math.sqrt(polyArea(big)) * 0.25;
      pieces.push(...splitPoly(big, cx + k.rand(-r, r), cy + k.rand(-r, r), k.rand(0, Math.PI)));
    }
    const faceted = k.chance(0.4);
    const seam = k.showLines ? k.LW * 0.5 : 0;
    pieces.forEach((pts) => {
      const fill = k.chance(0.12) ? k.P.paper : k.color(['sand']);
      if (!faceted) return k.poly(pts, fill, seam);
      // Faceted: fan the piece into triangles in lighter and darker tones of one colour.
      const c = centroid(pts);
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const tone = k.chance(0.5) ? k.mix(fill, '#FFFFFF', k.rand(0, 0.3)) : k.mix(fill, '#000000', k.rand(0, 0.25));
        k.poly([c, p, q], tone);
      });
      if (seam) k.poly(pts, 'rgba(0,0,0,0)', seam);
    });
  }

  // ---------- Splinters: long thin wedges crossing the canvas ----------
  function compSplinters(k, A) {
    const { x0, y0, x1, y1, w, h } = A;
    k.rect(x0, y0, w, h, k.P.paper);
    k.ctx.save(); k.ctx.beginPath(); k.ctx.rect(x0, y0, w, h); k.ctx.clip();
    const n = Math.round(k.rint(6, 10) * A.density);
    for (let i = 0; i < n; i++) {
      // Base sits on the top or bottom edge; the tip reaches far across.
      const fromBottom = k.chance(0.55);
      const by = fromBottom ? y1 : y0;
      const bx = x0 + w * k.rand(-0.1, 1.1);
      const bw = w * k.rand(0.04, 0.22);
      const tip = [x0 + w * k.rand(0, 1), fromBottom ? y0 + h * k.rand(-0.1, 0.45) : y0 + h * k.rand(0.55, 1.1)];
      k.poly([[bx - bw / 2, by], [bx + bw / 2, by], tip], k.accent());
    }
    k.ctx.restore();
  }

  // ---------- Medallion: a circle of tiles with quarter and half circles ----------
  function compMedallion(k, A) {
    const { P, ctx } = k;
    const { x0, y0, w, h } = A;
    const R = Math.min(w, h) / 2;
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const n = Math.round(k.rint(6, 9) * Math.min(1.2, A.density)) || 6;
    const s = (2 * R) / n, gx = cx - R, gy = cy - R;
    const mirror = k.chance(k.V.symmetry + 0.2);
    // Corners: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left.
    const flipH = [1, 0, 3, 2], flipV = [3, 2, 1, 0];
    const cells = {};
    k.circle(cx, cy, R, P.ink);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      // In mirror mode each quadrant reuses the top-left quadrant's tile, flipped.
      const mi = mirror ? Math.min(i, n - 1 - i) : i, mj = mirror ? Math.min(j, n - 1 - j) : j;
      const key = mi + ',' + mj;
      if (!cells[key]) cells[key] = { bg: k.color(), fg: k.accent(), motif: k.rint(0, 3), corner: k.rint(0, 3) };
      const c = cells[key];
      let corner = c.corner;
      if (mirror && i !== mi) corner = flipH[corner];
      if (mirror && j !== mj) corner = flipV[corner];
      const x = gx + i * s, y = gy + j * s;
      k.rect(x, y, s + 0.5, s + 0.5, c.bg);
      const cxs = [x, x + s, x + s, x], cys = [y, y, y + s, y + s];
      if (c.motif === 0) k.pie(cxs[corner], cys[corner], s, corner * Math.PI / 2, corner * Math.PI / 2 + Math.PI / 2, c.fg);
      else if (c.motif === 1) {
        const dirs = ['down', 'left', 'up', 'right'];
        const mids = [[x + s / 2, y], [x + s, y + s / 2], [x + s / 2, y + s], [x, y + s / 2]];
        k.half(mids[corner][0], mids[corner][1], s / 2, dirs[corner], c.fg);
      } else if (c.motif === 2) {
        const a = [cxs[corner], cys[corner]], b = [cxs[(corner + 1) % 4], cys[(corner + 1) % 4]], d = [cxs[(corner + 3) % 4], cys[(corner + 3) % 4]];
        k.poly([a, b, d], c.fg);
      }
    }
    for (let i = 1; i < n; i++) { k.gline(gx + i * s, gy, gx + i * s, gy + 2 * R, k.LW * 0.4); k.gline(gx, gy + i * s, gx + 2 * R, gy + i * s, k.LW * 0.4); }
    ctx.restore();
    k.ring(cx, cy, R, k.LW);
  }

  // ---------- Ribbons: curvy vertical bands with ovals, outlined in ink ----------
  function compRibbons(k, A) {
    const { ctx } = k;
    const { x0, y0, x1, y1, w, h } = A;
    const n = Math.max(3, Math.round(k.rint(3, 5) * A.density));
    // Each boundary is a cubic curve from top to bottom; the outer ones are the area edges.
    const curves = [];
    for (let i = 0; i <= n; i++) {
      const base = x0 + (w * i) / n, sway = (i === 0 || i === n) ? 0 : w / n * 0.7;
      curves.push([base + k.rand(-sway, sway) * 0.4, base + k.rand(-sway, sway), base + k.rand(-sway, sway), base + k.rand(-sway, sway) * 0.4]);
    }
    const down = (c) => { ctx.lineTo(c[0], y0); ctx.bezierCurveTo(c[1], y0 + h / 3, c[2], y0 + 2 * h / 3, c[3], y1); };
    const up = (c) => { ctx.lineTo(c[3], y1); ctx.bezierCurveTo(c[2], y0 + 2 * h / 3, c[1], y0 + h / 3, c[0], y0); };
    const bandPath = (i) => { ctx.beginPath(); ctx.moveTo(curves[i][0], y0); down(curves[i]); up(curves[i + 1]); ctx.closePath(); };
    const lw = k.LW * 0.9;
    for (let i = 0; i < n; i++) {
      bandPath(i); ctx.fillStyle = k.color(['sand']); ctx.fill();
      // Ovals clipped to the band look like shapes passing behind the curves.
      ctx.save(); bandPath(i); ctx.clip();
      const ovals = k.rint(1, 3);
      for (let j = 0; j < ovals; j++) {
        ctx.beginPath();
        ctx.ellipse(x0 + w * k.rand(0, 1), y0 + h * k.rand(0, 1), w * k.rand(0.12, 0.3), h * k.rand(0.15, 0.4), k.rand(-0.6, 0.6), 0, TAU);
        ctx.fillStyle = k.color(['sand']); ctx.fill();
        ctx.strokeStyle = k.P.ink; ctx.lineWidth = lw; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = k.P.ink; ctx.lineWidth = lw;
    curves.slice(1, -1).forEach((c) => { ctx.beginPath(); ctx.moveTo(c[0], y0); down(c); ctx.stroke(); });
    if (k.chance(0.6)) {
      const r = Math.min(w, h) * k.rand(0.04, 0.07);
      const cx = x0 + w * k.rand(0.1, 0.9), cy = y0 + h * k.rand(0.06, 0.2);
      k.splitCircle(cx, cy, r, k.accent(), k.accent(), k.chance(0.5)); k.ring(cx, cy, r, lw);
    }
  }

  // ---------- Peaks: low-poly mountains with lit and shadowed faces ----------
  function compPeaks(k, A) {
    const { P } = k;
    const { x0, y0, x1, y1, w, h } = A;
    const sky = k.pick([P.soft, P.paper, P.sand]);
    k.rect(x0, y0, w, h, sky);
    k.ctx.save(); k.ctx.beginPath(); k.ctx.rect(x0, y0, w, h); k.ctx.clip();
    if (k.chance(0.5)) k.circle(x0 + w * k.rand(0.2, 0.8), y0 + h * k.rand(0.12, 0.3), Math.min(w, h) * k.rand(0.06, 0.12), k.pick([P.bright, P.primary]));
    const lit = k.pick([P.bright, P.primary, P.soft, P.sand]);
    const dark = k.pick([P.deep, P.ink]);
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      // Back rows are paler (fade toward the sky) and higher; front rows are stronger.
      const fade = (rows - 1 - r) * 0.22;
      const L = k.mix(lit, sky, fade), D = k.mix(dark, sky, fade);
      const count = Math.max(2, Math.round(k.rint(2, 4) * A.density));
      for (let i = 0; i < count; i++) {
        const ax = x0 + w * k.rand(-0.05, 1.05);
        const ay = y0 + h * (0.22 + r * 0.16 + k.rand(-0.06, 0.06));
        const half = w * k.rand(0.18, 0.32);
        const lx = ax - half, rx = ax + half;
        const q = [ax + half * k.rand(-0.3, 0.3), ay + (y1 - ay) * k.rand(0.4, 0.65)];
        const m = [q[0] + half * k.rand(-0.3, 0.3), y1];
        k.poly([[ax, ay], [lx, y1], q], k.mix(L, '#FFFFFF', k.rand(0, 0.25)));
        k.poly([[lx, y1], m, q], k.mix(L, D, k.rand(0.15, 0.35)));
        k.poly([[ax, ay], q, [rx, y1]], k.mix(D, L, k.rand(0, 0.2)));
        k.poly([q, m, [rx, y1]], k.mix(D, L, k.rand(0.25, 0.45)));
      }
    }
    k.ctx.restore();
  }


  const COMP_FNS = { grid: compGrid, orbs: compOrbs, bars: compBars,
    tiles: compTiles, rings: compRings, diagonals: compDiagonals,
    shards: compShards, splinters: compSplinters, medallion: compMedallion, ribbons: compRibbons, peaks: compPeaks };

  // ---------- Paper grain ----------
  let grainTile = null;
  function getGrain(dark) {
    if (grainTile && grainTile.dark === dark) return grainTile.canvas;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const img = g.createImageData(256, 256);
    const r = makeRng('grain');
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = r() < 0.5 ? (dark ? 10 : 14) : 0;
    }
    g.putImageData(img, 0, 0);
    grainTile = { dark, canvas: c };
    return c;
  }

  // ---------- Public render ----------
  /**
   * settings: { composition, palette, vibe, detail (1-5), format, frame ('auto'|'on'|'off'),
   *             gridLines (bool), grain (bool), seed (string) }
   * Returns the composition actually used (useful when "random" was picked).
   */
  function render(canvas, settings, scale = 1) {
    const F = FORMATS[settings.format] || FORMATS.square;
    const P = PALETTES[settings.palette] || PALETTES.bauhaus;
    const V = VIBES[settings.vibe] || VIBES.balanced;
    canvas.width = Math.round(F.w * scale);
    canvas.height = Math.round(F.h * scale);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const rng = makeRng(String(settings.seed) + '|' + settings.composition + '|' + settings.format);
    let comp = settings.composition;
    if (comp === 'random' || !COMP_FNS[comp]) comp = Object.keys(COMP_FNS)[Math.floor(rng() * Object.keys(COMP_FNS).length)];

    const detailMul = [0.6, 0.8, 1, 1.2, 1.45][(settings.detail || 3) - 1];
    const frameRoll = rng();
    const frame = settings.frame === 'on' ? true : settings.frame === 'off' ? false : frameRoll < V.frame;

    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, F.w, F.h);

    const m = Math.min(F.w, F.h) * 0.1;
    const A = { x0: m, y0: m, x1: F.w - m, y1: F.h - m, w: F.w - 2 * m, h: F.h - 2 * m,
      density: V.density * detailMul, frame };
    const k = createKit(ctx, rng, P, V, { lineWidth: 5, gridLines: settings.gridLines !== false });

    // Clip the art to a slightly larger box so nothing escapes the margin.
    ctx.save();
    ctx.beginPath(); ctx.rect(m * 0.45, m * 0.45, F.w - m * 0.9, F.h - m * 0.9); ctx.clip();
    if (frame) { ctx.beginPath(); ctx.rect(A.x0, A.y0, A.w, A.h); ctx.clip(); }
    COMP_FNS[comp](k, A);
    ctx.restore();
    if (frame) k.box(A.x0, A.y0, A.w, A.h, 6);

    if (settings.grain) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = ctx.createPattern(getGrain(P.bg === PALETTES.night.bg), 'repeat');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    return comp;
  }

  global.Abstraite = { PALETTES, VIBES, COMPOSITIONS, FORMATS, render, randomSeed };
})(window);
