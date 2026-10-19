/*
 * content.js: lets the owner edit the site in Google Sheets.
 *
 * 1. Create a Google Sheet with the tabs Teksty, Pokoje, Cennik, Galeria (template: sheet_template/*.csv).
 * 2. Share it: "Anyone with the link: Viewer".
 * 3. Paste the ID of the sheet between the quotes below (the long part of the sheet address
 *    between /d/ and /edit).
 *
 * While SHEET_ID is empty, or the sheet cannot be reached, or a cell is blank, the page keeps
 * its built-in content. Sheet text is always inserted as plain text (never as HTML).
 */
(function () {
  'use strict';

  var SHEET_ID = '1-SfNo4BE6bJQv_GhL6u7OThA89xyVGPRwGUYIOIWbMc';

  var TABS = { teksty: 'Teksty', pokoje: 'Pokoje', cennik: 'Cennik', galeria: 'Galeria' };
  var TIMEOUT_MS = 8000;
  var doc = document;

  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; }, has: function () { return false; } }; }

  /* test switches: only honoured on localhost */
  var testBase = null, sheetId = SHEET_ID;
  if (isLocal) {
    var tb = params.get('dwg_csv');
    if (tb && /^\/?[\w\-.\/]*\/$/.test(tb) && tb.indexOf('..') < 0) testBase = tb;
    var ts = params.get('dwg_sheet');
    if (ts && /^[\w-]{3,}$/.test(ts)) sheetId = ts;
  }
  var debug = params.has('dwg_debug');
  var status = { tabs: {}, warnings: [] };
  window.DWG = window.DWG || {};
  window.DWG.contentStatus = status;
  function report() {
    if (!debug) return;
    var panel = doc.getElementById('dwg-status');
    if (!panel) {
      panel = doc.createElement('aside'); panel.id = 'dwg-status';
      panel.setAttribute('role', 'status');
      panel.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;background:white;color:#222;padding:16px;border:2px solid #555;max-height:35vh;overflow:auto;font:14px sans-serif';
      doc.body.appendChild(panel);
    }
    panel.textContent = 'Google Sheets: ' + Object.keys(status.tabs).map(function (k) {
      var t = status.tabs[k]; return TABS[k] + ': ' + t.source + (t.error ? ' (' + t.error + ')' : '');
    }).join('; ') + (status.warnings.length ? ' | ' + status.warnings.join(' | ') : '');
  }
  function warn(message) { if (status.warnings.indexOf(message) < 0) status.warnings.push(message); report(); }
  doc.addEventListener('dwg:imgfail', function () { warn('Zdjęcie niedostępne: sprawdź link i publiczny dostęp.'); });
  doc.addEventListener('dwg:imgfallback', function () { warn('Nie udało się wczytać nowego zdjęcia; wyświetlono stare zdjęcie.'); });
  if (!sheetId && !testBase) return;

  function log() { if (debug && window.console) console.info.apply(console, ['[dwg]'].concat([].slice.call(arguments))); }

  /* ---------------------------------------------------------- helpers */
  function fetchText(url) {
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = window.setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')); }, TIMEOUT_MS);
      fetch(url, { credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
        .then(function (t) { window.clearTimeout(timer); resolve(t); },
          function (err) { window.clearTimeout(timer); reject(err); });
    });
  }

  function tabUrl(tab) {
    if (testBase) return testBase + tab + '.csv';
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sheetId) +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab) + '&headers=1';
  }

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], row = [], cur = '', q = false, i, c, n = text.length;
    for (i = 0; i < n; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cur += '"'; i++; } else { q = false; } }
        else { cur += c; }
      } else if (c === '"' && cur === '') { q = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else { cur += c; }
    }
    if (q) throw new Error('Unclosed CSV quote');
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function norm(h) {
    return String(h || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }
  var ALIASES = {
    key: ['key', 'klucz'], value: ['value', 'wartosc'],
    name: ['name', 'nazwa'], description: ['description', 'opis'], beds: ['beds', 'lozka', 'miejsca'],
    photo_url: ['photourl', 'photo', 'zdjecie', 'foto', 'link'],
    item: ['item', 'pozycja'], price: ['price', 'cena'], note: ['note', 'uwagi', 'uwaga', 'notatka'],
    caption: ['caption', 'podpis'], order: ['order', 'kolejnosc']
  };
  var SCHEMAS = {
    teksty: { cols: ['key', 'value'], need: ['key', 'value'] },
    pokoje: { cols: ['name', 'description', 'beds', 'photo_url'], need: ['name', 'description', 'beds', 'photo_url'] },
    cennik: { cols: ['item', 'price', 'note'], need: ['item', 'price', 'note'] },
    galeria: { cols: ['photo_url', 'caption', 'order'], need: ['photo_url', 'caption', 'order'] }
  };

  /* csv text -> array of objects, or null when the header does not match the tab (wrong sheet, login page...) */
  function toObjects(text, tabKey) {
    var sc = SCHEMAS[tabKey], rows;
    try { rows = parseCSV(String(text)); } catch (e) { return null; }
    var hi = -1, map = null, r, c, j;
    for (r = 0; r < Math.min(rows.length, 3) && hi < 0; r++) {
      var m = {};
      for (c = 0; c < rows[r].length; c++) {
        var nh = norm(rows[r][c]);
        sc.cols.forEach(function (col) { if (m[col] === undefined && ALIASES[col].indexOf(nh) >= 0) m[col] = c; });
      }
      var okAll = sc.need.every(function (n) { return m[n] !== undefined; });
      if (okAll) { hi = r; map = m; }
    }
    if (hi < 0) return null;
    var out = [];
    for (r = hi + 1; r < rows.length; r++) {
      var o = {}, any = false;
      sc.cols.forEach(function (col) {
        var v = map[col] !== undefined ? rows[r][map[col]] : '';
        v = String(v == null ? '' : v).replace(/ /g, ' ').trim();
        o[col] = v;
        if (v) any = true;
      });
      if (any) out.push(o);
    }
    return out;
  }

  /* photo cell -> safe image URL (or ''). Drive share links become thumbnail links. */
  function photoUrl(v) {
    v = String(v || '').trim();
    if (!v || /[\s"'<>]/.test(v)) return '';
    var m = v.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]{10,})/) ||
      v.match(/^https:\/\/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([\w-]{10,})/) ||
      v.match(/^https:\/\/docs\.google\.com\/uc\?(?:[^#]*&)?id=([\w-]{10,})/);
    if (m) {
      var resourceKey = new URL(v).searchParams.get('resourcekey');
      return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1600' +
        (resourceKey ? '&resourcekey=' + encodeURIComponent(resourceKey) : '');
    }
    if (/^https:\/\/(drive|docs)\.google\.com\//.test(v)) return '';
    if (/^https:\/\/[^\/]+\/.+/.test(v) && !/\/drive\/folders\//.test(v)) return v;
    if (/^img\/[\w\-.\/]+$/.test(v) && v.indexOf('..') < 0) return v;
    if (isLocal && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(v)) return v;
    if (isLocal && testBase && /^[\w\-.\/]+\.(webp|jpe?g|png)$/i.test(v) && v.indexOf('..') < 0) return v;
    return '';
  }

  function phoneHref(v) {
    var s = String(v || '').trim();
    var d = s.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(s) || d.length < 7 || d.length > 15) return '';
    if (s.charAt(0) === '+') return 'tel:+' + d;
    if (d.length === 9) return 'tel:+48' + d;
    if (d.length === 11 && d.indexOf('48') === 0) return 'tel:+' + d;
    return 'tel:' + d;
  }

  function mk(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------------------------------------------------- snapshot of the built-in content */
  var snap = { texts: [], imgs: [], banners: [], lists: [], listT: [], tels: [], mails: [], prices: [] };
  function cloneKids(el) { return [].slice.call(el.childNodes).map(function (n) { return n.cloneNode(true); }); }
  function restoreKids(el, kids) { while (el.firstChild) el.removeChild(el.firstChild); kids.forEach(function (n) { el.appendChild(n.cloneNode(true)); }); }

  function takeSnapshot() {
    [].forEach.call(doc.querySelectorAll('[data-t]'), function (el) {
      snap.texts.push({ el: el, key: el.getAttribute('data-t'), orig: el.textContent, optional: el.hasAttribute('data-optional') });
    });
    [].forEach.call(doc.querySelectorAll('img[data-img]'), function (el) {
      snap.imgs.push({ el: el, key: el.getAttribute('data-img'), orig: el.getAttribute('src') });
    });
    [].forEach.call(doc.querySelectorAll('img[data-banner]'), function (el) {
      snap.banners.push({ el: el, orig: el.getAttribute('src') });
    });
    [].forEach.call(doc.querySelectorAll('[data-list]'), function (el) {
      snap.lists.push({ el: el, kind: el.getAttribute('data-list'), limit: parseInt(el.getAttribute('data-limit'), 10) || 0, big: el.hasAttribute('data-big'), kids: cloneKids(el), builtin: null });
    });
    [].forEach.call(doc.querySelectorAll('[data-list-t]'), function (el) {
      snap.listT.push({ el: el, prefix: el.getAttribute('data-list-t'), kind: el.getAttribute('data-kind'), kids: cloneKids(el) });
    });
    [].forEach.call(doc.querySelectorAll('a[data-tel]'), function (el) { snap.tels.push({ el: el, orig: el.getAttribute('href') }); });
    [].forEach.call(doc.querySelectorAll('a[data-mail]'), function (el) { snap.mails.push({ el: el, orig: el.getAttribute('href') }); });
    [].forEach.call(doc.querySelectorAll('[data-price-main]'), function (el) {
      snap.prices.push({ el: el, field: el.getAttribute('data-price-main'), orig: el.textContent });
    });
    /* built-in rows of each list, read from the original markup, used when a sheet cell is blank */
    snap.lists.forEach(function (L) {
      var tmp = mk('div'); L.kids.forEach(function (n) { tmp.appendChild(n.cloneNode(true)); });
      if (L.kind === 'rooms') {
        L.builtin = [].map.call(tmp.querySelectorAll('.room-card'), function (c) {
          var im = c.querySelector('img');
          return {
            name: text(c.querySelector('h3')), description: text(c.querySelector('p')),
            beds: [].map.call(c.querySelectorAll('.chips li'), function (x) { return x.textContent; }).join('; '),
            photo_url: im ? im.getAttribute('src') : ''
          };
        });
      } else if (L.kind === 'cennik') {
        L.builtin = [].map.call(tmp.querySelectorAll('li'), function (c) {
          return { item: text(c.querySelector('b')), note: text(c.querySelector('.pl-main span')), price: text(c.querySelector('.pl-price')) };
        });
      } else if (L.kind === 'gallery') {
        L.builtin = [].map.call(tmp.querySelectorAll('[data-lightbox]'), function (c) {
          return { photo_url: c.getAttribute('data-full'), caption: c.getAttribute('data-alt') };
        });
      }
    });
    function text(n) { return n ? n.textContent : ''; }
  }

  /* ---------------------------------------------------------- appliers */
  function setHidden(el, hide) {
    var g = el.closest('[data-hide-group]') || el;
    g.hidden = !!hide;
  }

  function applyTexts(map) {
    snap.texts.forEach(function (t) {
      var v = map ? map[t.key] : '';
      if (t.optional) setHidden(t.el, v === '-');
      if (v) {
        if (v === '-' && t.optional) return;
        t.el.textContent = v;
        t.el.classList.toggle('nl', v.indexOf('\n') >= 0);
      } else {
        t.el.textContent = t.orig;
        t.el.classList.remove('nl');
      }
    });
  }

  function setImg(img, url, orig) {
    img.removeAttribute('data-fb-used');
    if (url) {
      if (orig && orig !== url) { img.setAttribute('data-fallback', orig); } else { img.removeAttribute('data-fallback'); }
      img.style.display = '';
      if (img.getAttribute('src') !== url) { img.classList.add('is-loading'); img.setAttribute('src', url); }
    } else {
      img.removeAttribute('data-fallback');
      if (orig && img.getAttribute('src') !== orig) { img.classList.add('is-loading'); img.setAttribute('src', orig); }
      img.style.display = '';
    }
  }

  function applyImgs(map) {
    snap.imgs.forEach(function (i) { setImg(i.el, map ? photoUrl(map[i.key]) : '', i.orig); });
    var banner = map ? photoUrl(map.tlo_foto) : '';
    snap.banners.forEach(function (b) { setImg(b.el, banner, b.orig); });
  }

  function applyContacts(map) {
    var tel = map ? phoneHref(map.telefon) : '';
    snap.tels.forEach(function (t) { t.el.setAttribute('href', tel || t.orig); });
    var mail = map && map.email && /^[^@\s,;<>"']+@[^@\s,;<>"']+\.[^@\s,;<>"']+$/.test(map.email) ? map.email : '';
    snap.mails.forEach(function (t) { t.el.setAttribute('href', mail ? 'mailto:' + mail : t.orig); });
    window.DWG = window.DWG || {};
    window.DWG.email = mail || 'dom.wgorach.swieradow@gmail.com';
    var mx = map ? parseInt(map.max_osob, 10) : NaN;
    window.DWG.maxGuests = (mx >= 1 && mx <= 99) ? mx : 15;
    var g = doc.getElementById('osoby');
    if (g) g.max = String(window.DWG.maxGuests);
  }

  function applyTextLists(map) {
    snap.listT.forEach(function (L) {
      var re = new RegExp('^' + L.prefix + '_(\\d+)$');
      var found = [];
      if (map) Object.keys(map).forEach(function (k) { var m = re.exec(k); if (m && map[k]) found.push({ n: parseInt(m[1], 10), v: map[k] }); });
      if (!found.length) { restoreKids(L.el, L.kids); return; }
      found.sort(function (a, b) { return a.n - b.n; });
      while (L.el.firstChild) L.el.removeChild(L.el.firstChild);
      found.forEach(function (f) {
        if (f.v === '-') return;
        var li = mk('li'), parts;
        if (L.kind === 'rule') { li.textContent = f.v; }
        else if (L.kind === 'dist') {
          parts = f.v.split('|').map(function (s) { return s.trim(); });
          var nm = mk('span', 'name', parts[0]);
          if (parts[1]) nm.appendChild(mk('small', '', parts[1]));
          li.appendChild(nm);
          li.appendChild(mk('span', 'km', parts[2] || ''));
        } else {
          var ix = f.v.indexOf('|');
          var a = ix >= 0 ? f.v.slice(0, ix).trim() : '', b = ix >= 0 ? f.v.slice(ix + 1).trim() : f.v;
          if (L.kind === 'how') {
            if (a) { li.appendChild(mk('b', '', /[.!?:]$/.test(a) ? a : a + '.')); li.appendChild(doc.createTextNode(' ')); }
            li.appendChild(doc.createTextNode(b));
          } else {
            if (a) li.appendChild(mk('b', '', a));
            li.appendChild(mk('span', '', b));
          }
        }
        L.el.appendChild(li);
      });
    });
  }

  function limitOf(L, rows) { return L.limit > 0 ? rows.slice(0, L.limit) : rows; }
  function pick(v, fb) { return v ? v : (fb || ''); }

  function listOf(kind) { return snap.lists.filter(function (L) { return L.kind === kind; }); }

  function applyRooms(rows) {
    listOf('rooms').forEach(function (L) {
      if (!rows || !rows.length) { restoreKids(L.el, L.kids); return; }
      while (L.el.firstChild) L.el.removeChild(L.el.firstChild);
      limitOf(L, rows).forEach(function (r, i) {
        var b = (L.builtin && L.builtin[i]) || {};
        if (r.name && r.name !== b.name) b = {};   /* a different (new) room: do not borrow cells from the built-in one */
        var name = pick(r.name, b.name), desc = pick(r.description, b.description), beds = pick(r.beds, b.beds);
        var url = photoUrl(r.photo_url), fb = b.photo_url || '';
        var card = mk('article', 'room-card reveal');
        var ph = mk('div', 'ph');
        if (url || fb) {
          var im = doc.createElement('img');
          im.alt = name; im.setAttribute('data-fade', ''); im.setAttribute('loading', 'lazy');
          if (url && fb) im.setAttribute('data-fallback', fb);
          im.setAttribute('src', url || fb);
          ph.appendChild(im);
        }
        card.appendChild(ph);
        var body = mk('div', 'room-body');
        body.appendChild(mk('h3', '', name));
        if (desc) body.appendChild(mk('p', '', desc));
        var chips = mk('ul', 'chips');
        beds.split(';').forEach(function (c) { c = c.trim(); if (c) chips.appendChild(mk('li', '', c)); });
        if (chips.childNodes.length) body.appendChild(chips);
        card.appendChild(body);
        L.el.appendChild(card);
      });
    });
  }

  function applyCennik(rows) {
    var L = listOf('cennik');
    /* row 0 of the sheet = the highlighted price (hero fact, price card), the others = list */
    if (!rows || !rows.length) {
      snap.prices.forEach(function (p) { p.el.textContent = p.orig; });
      L.forEach(function (x) { restoreKids(x.el, x.kids); });
      return;
    }
    var first = rows[0];
    snap.prices.forEach(function (p) {
      var v = p.field === 'price' ? first.price : (p.field === 'note' ? first.note : first.item);
      p.el.textContent = v || p.orig;
    });
    L.forEach(function (x) {
      var b = x.builtin || [];
      while (x.el.firstChild) x.el.removeChild(x.el.firstChild);
      limitOf(x, rows.slice(1)).forEach(function (r, i) {
        var bb = b[i] || {};
        if (r.item && r.item !== bb.item) bb = {};   /* a different (new) row: do not borrow cells */
        var item = pick(r.item, bb.item), price = pick(r.price, bb.price), note = pick(r.note, bb.note);
        var li = mk('li'), main = mk('span', 'pl-main');
        main.appendChild(mk('b', '', item));
        if (note) main.appendChild(mk('span', '', note));
        li.appendChild(main);
        if (price) li.appendChild(mk('span', 'pl-price', price));
        x.el.appendChild(li);
      });
    });
  }

  function applyGallery(rows) {
    listOf('gallery').forEach(function (L) {
      if (!rows || !rows.length) { restoreKids(L.el, L.kids); return; }
      var items = [];
      rows.forEach(function (r, idx) {
        var url = photoUrl(r.photo_url);
        if (!url) return;
        var n = parseFloat(String(r.order).replace(',', '.'));
        items.push({ url: url, cap: r.caption, ord: isNaN(n) ? Infinity : n, idx: idx });
      });
      if (!items.length) { restoreKids(L.el, L.kids); return; }
      items.sort(function (a, b) { return a.ord === b.ord ? a.idx - b.idx : (a.ord < b.ord ? -1 : 1); });
      items = limitOf(L, items);
      while (L.el.firstChild) L.el.removeChild(L.el.firstChild);
      var failed = 0;
      items.forEach(function (it, i) {
        var btn = mk('button', 'g-item reveal' + (i === 0 && L.big ? ' big' : ''));
        btn.type = 'button';
        btn.setAttribute('data-lightbox', '');
        btn.setAttribute('data-full', it.url);
        btn.setAttribute('data-alt', it.cap || '');
        var ph = mk('span', 'ph');
        var im = doc.createElement('img');
        im.alt = it.cap || '';
        im.setAttribute('data-fade', ''); im.setAttribute('loading', 'lazy'); im.setAttribute('data-hide-parent', '[data-lightbox]');
        im.setAttribute('src', it.url);
        im.addEventListener('dwg:imgfail', function () {
          failed += 1;
          if (failed >= items.length) restoreKids(L.el, L.kids);   /* every sheet photo failed: keep the built-in gallery */
          if (window.DWG && window.DWG.refresh) window.DWG.refresh();
        });
        ph.appendChild(im);
        btn.appendChild(ph);
        L.el.appendChild(btn);
      });
    });
  }

  function applyAll(data) {
    var map = null;
    if (data.teksty) {
      map = Object.create(null);
      data.teksty.forEach(function (r) { var k = String(r.key || '').toLowerCase().trim(); if (k && r.value) map[k] = r.value; });
    }
    if (map) {
      if (map.telefon && !phoneHref(map.telefon)) { warn('Niepoprawny telefon: zachowano poprzedni numer.'); delete map.telefon; }
      if (map.email && !/^[^@\s,;<>"'?&#%]+@[^@\s,;<>"'?&#%]+\.[^@\s,;<>"'?&#%]+$/.test(map.email)) { warn('Niepoprawny e-mail: zachowano poprzedni adres.'); delete map.email; }
      Object.keys(map).forEach(function (k) { if (/_foto\d*$/.test(k) && map[k] && !photoUrl(map[k])) warn('Niepoprawny link zdjęcia: ' + k); });
    }
    ['pokoje', 'galeria'].forEach(function (key) {
      if (data[key]) data[key].forEach(function (r, i) {
        if (r.photo_url && !photoUrl(r.photo_url)) warn(TABS[key] + ', wiersz ' + (i + 2) + ': niepoprawny link zdjęcia.');
      });
    });
    Object.keys(TABS).forEach(function (key) {
      if (data[key] && !data[key].length) warn(TABS[key] + ': brak danych; pozostaje treść wbudowana.');
    });
    [
      function () { applyTexts(map); },
      function () { applyImgs(map); },
      function () { applyContacts(map); },
      function () { applyTextLists(map); },
      function () { applyRooms(data.pokoje); },
      function () { applyCennik(data.cennik); },
      function () { applyGallery(data.galeria); }
    ].forEach(function (fn) { try { fn(); } catch (e) { log('apply error', e); warn('Błąd wyświetlania danych.'); } });
    if (window.DWG && window.DWG.refresh) window.DWG.refresh();
  }

  /* ---------------------------------------------------------- cache (stale-while-revalidate) */
  function cacheKey(tab) { return 'dwg1:' + sheetId + ':' + tab; }
  function cacheGet(tab) { if (testBase) return null; try { return window.sessionStorage.getItem(cacheKey(tab)); } catch (e) { return null; } }
  function cacheSet(tab, txt) { if (testBase) return; try { window.sessionStorage.setItem(cacheKey(tab), txt); } catch (e) { /* ignore */ } }

  function convert(rawByTab) {
    var data = {};
    Object.keys(TABS).forEach(function (k) {
      data[k] = rawByTab[k] != null ? toObjects(rawByTab[k], k) : null;
    });
    return data;
  }

  function sig(raw) { return Object.keys(TABS).map(function (k) { return raw[k] == null ? '~' : raw[k]; }).join('\u0001'); }

  function run() {
    takeSnapshot();
    var cached = {}, haveCache = false;
    Object.keys(TABS).forEach(function (k) { var c = cacheGet(TABS[k]); cached[k] = c; if (c != null) haveCache = true; });
    var shown = haveCache ? sig(cached) : null;
    if (haveCache) { log('applying cached content'); applyAll(convert(cached)); }

    var fresh = {}, errors = {}, left = Object.keys(TABS).length;
    Object.keys(TABS).forEach(function (k) {
      fetchText(tabUrl(TABS[k])).then(function (txt) {
        fresh[k] = txt; log('loaded', TABS[k], txt.length);
      }, function (err) { fresh[k] = null; errors[k] = err && err.message; log('failed', TABS[k], err && err.message); })
        .then(function () {
          left -= 1;
          if (left > 0) return;
          var finalRaw = {};
          Object.keys(TABS).forEach(function (kk) {
            if (fresh[kk] != null && toObjects(fresh[kk], kk)) { finalRaw[kk] = fresh[kk]; cacheSet(TABS[kk], fresh[kk]); }
            else { finalRaw[kk] = cached[kk]; }
            status.tabs[kk] = {
              source: fresh[kk] != null && toObjects(fresh[kk], kk) ? 'aktualne dane' : (cached[kk] != null ? 'pamięć przeglądarki' : 'treść wbudowana'),
              error: errors[kk] || (fresh[kk] != null && !toObjects(fresh[kk], kk) ? 'niepoprawne nagłówki lub CSV' : '')
            };   /* unreachable or wrong sheet: keep what we had (cache) or the built-in content */
          });
          report();
          var s = sig(finalRaw);
          if (s !== shown) { applyAll(convert(finalRaw)); log('content applied'); }
        });
    });
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', run); } else { run(); }
})();
