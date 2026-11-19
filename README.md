# Abstraite

A small web app that generates Bauhaus-style abstract geometric art in the browser.
Plain HTML, CSS and JavaScript: no build step, no server, no API, no AI.
see it in action [here](https://sepehrime.github.io/abstraite/)

## Run it

Double-click `index.html` (or drag it into any modern browser). That's it.

## Use it

- **Geometry**: Grid & blocks, Circles, Bars & stripes, Totem, Arches & moons, Tile mosaic, Stacked city, Rainbows & pearls, Triangles & diagonals, Sun & horizon, or Surprise me.
- **Colour**: seven palettes (Bauhaus, Sunset, Harbour, Olive, Sorbet, Mono + red, Night).
- **Vibe**: Calm, Balanced, Bold, Playful, Minimal. Changes how busy the piece is and which colours lead.
- **Detail**, **Format** (square / portrait / landscape), **Frame**, grid lines and paper grain.
- **Generate** (or press Space) for a new piece. **Save PNG** (or press S) downloads it at 1×, 2× or 4×.
- Every piece has a **seed**. Same seed + same settings = same artwork, so **Copy link** shares the exact piece.
  Changing colour or vibe keeps the seed, so you can recolour a piece you like.
- **Add to gallery** saves a piece to the **Gallery** page. Only its seed and settings are stored (in your browser's
  local storage), never the image; thumbnails are re-rendered from them. **View or modify** opens the piece back in the
  generator with every setting restored. The gallery is per browser.

## Files

- `index.html` – generator page layout
- `gallery.html` – gallery page layout
- `style.css` – styling
- `generator.js` – the art engine (palettes, vibes, the ten compositions)
- `app.js` – controls, history, saving, shareable links
- `link.js` – encodes settings + seed to/from the URL hash (shared by both pages)
- `gallery-store.js` – saves and loads gallery entries in localStorage
- `gallery.js` – renders the gallery thumbnails
