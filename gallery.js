/* Abstraite — gallery page: re-renders each saved artwork from its seed + settings. */
(function () {
  'use strict';
  const { COMPOSITIONS, PALETTES, VIBES, render, decodeSettings, gallery } = window.Abstraite;
  const THUMB_SCALE = 0.32; // 1000px format -> ~320px thumbnail
  const grid = document.getElementById('gallery');

  /** Build one gallery card for a saved entry. */
  function card(entry) {
    const s = decodeSettings(entry.hash);
    const fig = document.createElement('figure');
    fig.className = 'card';

    const c = document.createElement('canvas');
    const comp = render(c, s, THUMB_SCALE);
    c.setAttribute('aria-label', 'Artwork ' + s.seed);

    const cap = document.createElement('figcaption');
    cap.textContent = `${COMPOSITIONS[comp].name} · ${PALETTES[s.palette].name} · ${VIBES[s.vibe].name} · ${s.seed}`;

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const open = document.createElement('a');
    open.className = 'btn small primary';
    open.href = 'index.html#' + entry.hash;
    open.textContent = 'View or modify';
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'btn small'; del.textContent = 'Remove';
    del.addEventListener('click', () => { gallery.remove(entry.hash); draw(); });
    actions.append(open, del);

    fig.append(c, cap, actions);
    return fig;
  }

  function draw() {
    const items = gallery.list();
    grid.replaceChildren(...items.map(card));
    if (!items.length) grid.innerHTML = '<p class="empty">No artworks yet. Generate one and press <b>Add to gallery</b>.</p>';
  }

  draw();
})();
