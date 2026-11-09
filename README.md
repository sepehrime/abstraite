# Abstraite

A small web app that generates Bauhaus-style abstract geometric art in the browser.
Plain HTML, CSS and JavaScript: no build step, no server, no API, no AI.

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

## Files

- `index.html` – page layout
- `style.css` – styling
- `generator.js` – the art engine (palettes, vibes, the ten compositions)
- `app.js` – controls, history, saving, shareable links
- `example/` – the reference pieces the style is based on
