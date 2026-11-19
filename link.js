/* Abstraite — encode artwork settings to/from a URL hash string. Shared by the generator and gallery pages. */
(function (A) {
  'use strict';
  const { PALETTES, VIBES, COMPOSITIONS, FORMATS } = A;

  /** Encode settings as a query string (without the leading '#'). */
  function encodeSettings(s) {
    return new URLSearchParams({ c: s.composition, p: s.palette, v: s.vibe, d: s.detail,
      f: s.format, fr: s.frame, l: s.gridLines ? 1 : 0, g: s.grain ? 1 : 0, s: s.seed }).toString();
  }

  /** Decode a query string into a partial settings object, keeping only valid values. */
  function decodeSettings(str) {
    const p = new URLSearchParams(str);
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

  A.encodeSettings = encodeSettings;
  A.decodeSettings = decodeSettings;
})(window.Abstraite);
