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
    totem:  { name: 'Totem' },
    arches: { name: 'Arches & moons' },
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
    function arch(x, y, w, h, fill) {
      const r = w / 2;
      ctx.fillStyle = fill; ctx.beginPath();
      ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0);
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
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

    return { rand, rint, pick, chance, color, accent, rect, box, line, gline, circle, ring, pie, half,
      splitCircle, capsule, bandedCapsule, arch, stripes, hatch, checker, wave, crosshair, cuts, LW, P, V, ctx };
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

  function compTotem(k, A) {
    if (k.chance(0.45)) return compMask(k, A);
    const { P, V } = k;
    const d = A.density;
    const cx = (A.x0 + A.x1) / 2;
    const u = Math.min(A.w, A.h * 0.9) / 10;
    const sym = k.chance(V.symmetry);

    // Side combs of vertical lines + horizontal crossings.
    const combN = Math.round(k.rint(3, 6) * Math.max(0.6, d));
    const offs = []; let o = u * 1.6;
    for (let i = 0; i < combN; i++) { offs.push(o); o += u * k.rand(0.18, 0.45); }
    const cTop = A.y0 + A.h * k.rand(0.2, 0.3), cBot = A.y1 - A.h * 0.05;
    offs.forEach((off) => {
      k.gline(cx - off, cTop + (sym ? 0 : k.rand(0, u)), cx - off, cBot, k.LW * 0.7);
      k.gline(cx + off, cTop + (sym ? 0 : k.rand(0, u)), cx + off, cBot - (sym ? 0 : k.rand(0, u * 2)), k.LW * 0.7);
    });
    const crossN = k.rint(2, 4);
    for (let i = 0; i < crossN; i++) {
      const y = cTop + ((cBot - cTop) * (i + 0.5)) / crossN;
      k.gline(cx - o - u * 0.3, y, cx + o + u * 0.3, y, k.LW * 0.7);
    }

    // The stack.
    let y = A.y0 + u * 0.2;
    const headR = u * k.rand(0.65, 0.95);
    if (k.chance(0.6)) { // crown
      k.box(cx - u * 0.75, y + u * 0.35, u * 1.5, u * 0.65, k.LW * 0.8);
      k.line(cx, y, cx, y + u * 0.35, k.LW * 0.8); k.line(cx - u * 0.3, y + u * 0.15, cx + u * 0.3, y + u * 0.15, k.LW * 0.8);
      y += u * 0.7;
    }
    const barY = y + headR * 1.25;
    const barW = u * k.rand(3.6, 5.2), barH = u * k.rand(0.45, 0.7);
    k.rect(cx - barW / 2, barY, barW, barH, P.ink);
    k.circle(cx, y + headR, headR, k.accent());
    y = barY + barH;

    const colW = u * k.rand(0.55, 0.85);
    const remaining = A.y1 - u * 1.6 - y;
    const segs = k.rint(2, 3);
    let sy = y;
    for (let s = 0; s < segs; s++) {
      const h = (remaining / segs) * k.rand(0.75, 1.15);
      if (s === 0 && k.chance(0.7)) { // split pair of columns
        k.rect(cx - colW, sy, colW, h * k.rand(0.6, 1), k.accent());
        k.rect(cx, sy, colW, h, k.accent());
      } else {
        const off = sym ? 0 : k.rand(-0.3, 0.3) * colW;
        k.rect(cx - colW / 2 + off, sy, colW, h, s === segs - 1 ? P.deep : P.ink);
      }
      sy += h;
    }
    const footR = u * k.rand(0.55, 0.8);
    k.circle(cx, Math.min(sy + footR * 0.6, A.y1 - footR), footR, P.ink);
    k.line(cx - u * 0.9, A.y1, cx + u * 0.9, A.y1, k.LW * 0.8);
  }

  function compMask(k, A) {
    const { P } = k;
    const cx = (A.x0 + A.x1) / 2;
    const u = Math.min(A.w, A.h) / 10;
    const F = u * k.rand(3.2, 3.8);          // face width
    const R = F / 2;
    const top = A.y0 + A.h * 0.08;
    const total = Math.min(A.h * 0.84, u * 9.5);
    const cA = k.accent(), cB = k.accent(), cC = k.accent();
    const bandH = total * 0.27, bandY = top + total * 0.33, bandW = F * k.rand(1.3, 1.55);

    k.line(cx - F * 0.75, top - u * 0.15, cx + F * 0.75, top - u * 0.15);
    // Each quarter of the face is one path (quarter circle + straight side), so no seams.
    const botY = top + total - R;
    const by2 = bandY + bandH;
    const cD = cB === P.deep ? cC : P.deep;
    function quarterFace(dir, isTop, fill) {
      const ctx = k.ctx;
      const ox = cx + dir * R;
      ctx.fillStyle = fill; ctx.beginPath();
      if (isTop) {
        ctx.moveTo(cx, bandY + 1); ctx.lineTo(ox, bandY + 1); ctx.lineTo(ox, top + R);
        ctx.arc(cx, top + R, R, dir < 0 ? Math.PI : 0, -Math.PI / 2, dir > 0);
      } else {
        ctx.moveTo(cx, by2 - 1); ctx.lineTo(ox, by2 - 1); ctx.lineTo(ox, botY);
        ctx.arc(cx, botY, R, dir < 0 ? Math.PI : 0, Math.PI / 2, dir < 0);
      }
      ctx.closePath(); ctx.fill();
    }
    quarterFace(-1, true, cA); quarterFace(1, true, cB);
    quarterFace(-1, false, cD); quarterFace(1, false, cA);
    // Band with brow and eyes.
    k.rect(cx - bandW / 2, bandY, bandW, bandH, P.soft);
    const browH = bandH * 0.32;
    k.rect(cx - F * 0.48, bandY + bandH * 0.12, F * 0.96, browH, P.ink);
    const eyeR = F * k.rand(0.13, 0.17);
    const eyeY = bandY + bandH * 0.12 + browH;
    [-1, 1].forEach((s) => {
      const ex = cx + s * F * 0.29;
      k.half(ex, eyeY, eyeR, 'down', P.paper);
      k.ctx.strokeStyle = P.ink; k.ctx.lineWidth = k.LW;
      k.ctx.beginPath(); k.ctx.arc(ex, eyeY, eyeR, 0, Math.PI); k.ctx.stroke();
      if (k.chance(0.5)) k.circle(ex, eyeY + eyeR * 0.35, eyeR * 0.3, P.ink);
    });
    k.rect(cx - u * 0.18, eyeY, u * 0.36, bandH * 0.45, P.bright);
    // Axes.
    k.gline(cx, top, cx, top + total + u * 0.15, k.LW * 0.8);
    k.gline(cx - bandW / 2 - u * 0.15, bandY + bandH / 2, cx + bandW / 2 + u * 0.15, bandY + bandH / 2, k.LW * 0.8);
  }

  function compArches(k, A) {
    const v = k.rand();
    if (v < 0.4) return archBowl(k, A);
    if (v < 0.7) return archRow(k, A);
    return archHourglass(k, A);
  }

  function archBowl(k, A) {
    const { P } = k;
    const cx = (A.x0 + A.x1) / 2;
    const u = Math.min(A.w, A.h) / 10;
    const colW = u * k.rand(0.7, 1);
    // Horizontal line sets.
    const sets = [A.y0 + A.h * 0.08, A.y1 - A.h * 0.2];
    sets.forEach((sy) => {
      for (let i = 0; i < 3; i++) {
        const y = sy + i * u * 0.5;
        k.gline(A.x0 + u * 0.3, y, cx - colW - u * 0.2, y, k.LW * 0.8);
        k.gline(cx + colW + u * 0.2, y, A.x1 - u * 0.3, y, k.LW * 0.8);
      }
    });
    k.gline(A.x0, A.y0 + A.h * 0.4, A.x1, A.y0 + A.h * 0.4);
    // Two columns.
    const c1 = k.accent(), c2 = k.accent();
    k.rect(cx - colW, A.y0 + u * 0.3, colW, A.h - u * 0.6, c1);
    k.rect(cx, A.y0 + u * 0.3, colW, A.h - u * 0.6, c2);
    // Bowl.
    const R = u * k.rand(2, 2.5);
    const cy = A.y0 + A.h * 0.52;
    k.rect(cx - R, cy - R * 0.3, R * 2, R * 0.3, P.primary === c1 ? P.bright : P.primary);
    k.pie(cx - R, cy - R * 0.3, R * 0.8, 0, Math.PI / 2, P.paper);
    k.half(cx, cy, R, 'down', P.deep);
    // Eye.
    const er = R * 0.62;
    k.circle(cx, cy - R * 0.05, er, P.primary);
    k.circle(cx, cy - R * 0.05, er * 0.87, P.deep);
    k.splitCircle(cx, cy - R * 0.05, er * 0.75, P.ink, P.paper, true);
    if (k.chance(0.5)) k.line(cx - R * 1.4, cy + R * 0.35, cx - R * 0.6, cy + R * 0.35, k.LW * 0.6, P.soft);
  }

  function archRow(k, A) {
    const { P } = k;
    const n = Math.max(2, Math.round(k.rint(3, 5) * Math.min(1.2, A.density)));
    const base = A.y1 - A.h * 0.08;
    const gap = A.w * 0.03;
    const w = (A.w * 0.84 - gap * (n - 1)) / n;
    const x0 = A.x0 + A.w * 0.08;
    // Sun.
    const sunR = A.w * k.rand(0.07, 0.11);
    const sunX = A.x0 + A.w * k.rand(0.2, 0.8), sunY = A.y0 + A.h * k.rand(0.12, 0.22);
    if (k.chance(0.5)) k.splitCircle(sunX, sunY, sunR, P.bright, P.primary, false);
    else k.circle(sunX, sunY, sunR, k.accent());
    for (let i = 0; i < 4; i++) k.gline(A.x0, A.y0 + A.h * (0.3 + i * 0.04), A.x0 + A.w * k.rand(0.2, 0.5), A.y0 + A.h * (0.3 + i * 0.04), k.LW * 0.6);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (w + gap);
      const h = A.h * k.rand(0.35, 0.65);
      const t = k.rand();
      const col = k.accent();
      if (t < 0.35) k.arch(x, base - h, w, h, col);
      else if (t < 0.6) { // split arch
        k.ctx.save(); k.ctx.beginPath(); k.ctx.rect(x, 0, w / 2, 1e5); k.ctx.clip(); k.arch(x, base - h, w, h, col); k.ctx.restore();
        k.ctx.save(); k.ctx.beginPath(); k.ctx.rect(x + w / 2, 0, w / 2, 1e5); k.ctx.clip(); k.arch(x, base - h, w, h, k.accent()); k.ctx.restore();
      } else if (t < 0.8) { // pillar with half moon on top
        k.rect(x, base - h + w / 2, w, h - w / 2, col);
        k.half(x + w / 2, base - h + w / 2, w / 2, 'up', P.ink);
      } else { // stepped
        k.rect(x, base - h, w, h, col);
        k.rect(x + w * 0.25, base - h - w * 0.4, w * 0.5, w * 0.4, P.ink);
      }
      if (k.chance(0.35)) k.circle(x + w / 2, base - h * 0.35, w * 0.18, P.paper);
    }
    k.line(A.x0, base, A.x1, base, k.LW * 1.2);
  }

  function archHourglass(k, A) {
    const { P } = k;
    const cx = (A.x0 + A.x1) / 2;
    const top = A.y0 + A.h * 0.12, bot = A.y1 - A.h * 0.1, mid = (top + bot) / 2;
    const H = bot - top;
    const W = Math.min(A.w * 0.5, H * 0.8);
    // Grid.
    [0.08, 0.28, 0.72, 0.92].forEach((f) => k.gline(A.x0 + A.w * f, A.y0, A.x0 + A.w * f, A.y1, k.LW * 0.8));
    [0.22, 0.5, 0.78].forEach((f) => k.gline(A.x0, A.y0 + A.h * f, A.x1, A.y0 + A.h * f, k.LW * 0.8));
    // Columns with concave inner edges.
    const colW = W * 0.28;
    function side(dir, cTop, cBot) {
      const outer = cx + dir * W / 2, inner = cx + dir * (W / 2 - colW);
      const ctx = k.ctx;
      [[top, mid, cTop], [mid, bot, cBot]].forEach(([y0, y1, col]) => {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(outer, y0); ctx.lineTo(inner, y0);
        const pinch = cx + dir * colW * 0.15;
        if (y0 === top) ctx.bezierCurveTo(inner, y0 + H * 0.25, pinch, y1 - H * 0.12, pinch, y1);
        else ctx.bezierCurveTo(pinch, y0 + H * 0.12, inner, y1 - H * 0.25, inner, y1);
        ctx.lineTo(outer, y1); ctx.closePath(); ctx.fill();
      });
    }
    side(-1, P.deep, P.primary);
    side(1, P.bright, P.soft);
    // Ink hourglass in the middle.
    const hw = W / 2 - colW * 1.15, ht = top + H * 0.15, hb = bot - H * 0.15;
    const ctx = k.ctx;
    ctx.fillStyle = P.ink; ctx.beginPath();
    ctx.moveTo(cx - hw, ht); ctx.lineTo(cx + hw, ht);
    ctx.bezierCurveTo(cx + hw, ht + H * 0.25, cx + 3, mid - H * 0.1, cx + 3, mid);
    ctx.bezierCurveTo(cx + 3, mid + H * 0.1, cx + hw, hb - H * 0.25, cx + hw, hb);
    ctx.lineTo(cx - hw, hb);
    ctx.bezierCurveTo(cx - hw, hb - H * 0.25, cx - 3, mid + H * 0.1, cx - 3, mid);
    ctx.bezierCurveTo(cx - 3, mid - H * 0.1, cx - hw, ht + H * 0.25, cx - hw, ht);
    ctx.fill();
    k.line(cx, ht, cx, hb, k.LW * 0.5, P.paper);
    // Red crossbar.
    k.rect(A.x0 + A.w * 0.08, top - k.LW * 2, A.w * 0.84, k.LW * 2, P.primary);
    if (k.chance(0.6)) k.rect(cx + W / 2 + A.w * 0.03, mid + H * 0.1, k.LW * 1.5, H * 0.25, P.bright);
  }

  const COMP_FNS = { grid: compGrid, orbs: compOrbs, bars: compBars, totem: compTotem, arches: compArches };

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
    if (comp === 'random' || !COMP_FNS[comp]) comp = Object.keys(COMP_FNS)[Math.floor(rng() * 5)];

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
