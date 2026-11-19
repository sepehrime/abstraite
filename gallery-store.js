/* Abstraite — gallery persistence. Stores only each artwork's settings + seed (as an encoded hash), never pixels. */
(function (A) {
  'use strict';
  const KEY = 'abstraite.gallery';

  /** Return the saved gallery entries, newest first: [{ hash, added }]. */
  function list() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  /**
   * Add an artwork to the gallery.
   * settings: the full generator state. Returns true if the gallery changed.
   */
  function add(settings) {
    const hash = A.encodeSettings(settings);
    const items = list();
    if (items.some((it) => it.hash === hash)) return false;
    items.unshift({ hash, added: Date.now() });
    write(items);
    return true;
  }

  /** Remove the entry with this hash. */
  function remove(hash) {
    write(list().filter((it) => it.hash !== hash));
  }

  A.gallery = { list, add, remove };
})(window.Abstraite);
