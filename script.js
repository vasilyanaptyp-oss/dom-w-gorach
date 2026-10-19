(function () {
  'use strict';
  var doc = document;
  doc.documentElement.classList.add('js');

  var DWG = window.DWG = window.DWG || {};
  DWG.email = DWG.email || 'dom.wgorach.swieradow@gmail.com';
  DWG.maxGuests = DWG.maxGuests || 15;
  /* the only place that navigates to mailto: (kept as a property so it can be swapped in tests) */
  DWG.openMail = function (url) { window.location.href = url; };

  /* header: solid after hero */
  var header = doc.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-solid', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* mobile menu */
  var burger = doc.querySelector('.burger');
  var menu = doc.getElementById('mobile-menu');
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    menu.classList.toggle('is-open', open);
    doc.body.classList.toggle('menu-open', open);
    if (open) { menu.removeAttribute('inert'); } else { menu.setAttribute('inert', ''); }
  }
  if (burger && menu) {
    menu.setAttribute('inert', '');
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* images: fade in when loaded, never leave a blank area (gradient stays behind) */
  var fadeSeen = typeof WeakSet === 'function' ? new WeakSet() : null;
  function initFades() {
    doc.querySelectorAll('img[data-fade]').forEach(function (img) {
      if (fadeSeen) { if (fadeSeen.has(img)) return; fadeSeen.add(img); }
      var tries = 0;
      img.classList.add('is-loading');
      function ok() { img.classList.remove('is-loading'); }
      function fail() {
        var fb = img.getAttribute('data-fallback');
        if (fb && img.getAttribute('data-fb-used') !== '1') {
          img.dispatchEvent(new CustomEvent('dwg:imgfallback', { bubbles: true }));
          img.setAttribute('data-fb-used', '1');
          img.setAttribute('src', fb);
          return;
        }
        if (!fb && tries < 1 && img.getAttribute('src')) {
          tries += 1;
          var src = img.getAttribute('src');
          window.setTimeout(function () { img.removeAttribute('src'); img.setAttribute('src', src); }, 1200);
          return;
        }
        var holder = img.getAttribute('data-hide-parent') ? img.closest(img.getAttribute('data-hide-parent')) : null;
        if (holder) { holder.hidden = true; } else { img.style.display = 'none'; }
        img.dispatchEvent(new CustomEvent('dwg:imgfail', { bubbles: true }));
      }
      img.addEventListener('load', ok);
      img.addEventListener('error', fail);
      if (img.complete) { if (img.naturalWidth) { ok(); } else if (img.getAttribute('src')) { fail(); } }
    });
  }

  /* reveal on scroll */
  var revSeen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  }
  function initReveal() {
    doc.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) {
      if (revSeen) { if (revSeen.has(el)) return; revSeen.add(el); }
      if (io) { io.observe(el); } else { el.classList.add('is-in'); }
    });
  }

  DWG.refresh = function () { initFades(); initReveal(); };
  DWG.refresh();

  /* lightbox (delegated, so photos added by content.js work too) */
  var lb = doc.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('figcaption');
    var lbCount = lb.querySelector('.lb-count');
    var items = [], current = 0, lastFocus = null;
    var collect = function () {
      return Array.prototype.slice.call(doc.querySelectorAll('[data-lightbox]')).filter(function (el) { return !el.hidden; });
    };
    var show = function (i) {
      current = (i + items.length) % items.length;
      var it = items[current];
      lbImg.removeAttribute('src');
      lbImg.src = it.getAttribute('data-full');
      lbImg.alt = it.getAttribute('data-alt') || '';
      lbCap.textContent = it.getAttribute('data-alt') || '';
      lbCount.textContent = (current + 1) + ' / ' + items.length;
    };
    var open = function (el) {
      items = collect();
      var i = items.indexOf(el);
      if (i < 0) return;
      lastFocus = doc.activeElement;
      show(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      doc.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    };
    var close = function () {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      doc.body.style.overflow = '';
      if (lastFocus && doc.contains(lastFocus)) lastFocus.focus();
    };
    doc.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('[data-lightbox]') : null;
      if (it) open(it);
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* inquiry form -> prefilled mailto */
  var form = doc.getElementById('inquiry');
  if (form) {
    var msg = form.querySelector('.form-msg');
    var el = form.elements;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var d0 = new Date();
    var today = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate());
    el['od'].min = today; el['do'].min = today;
    el['od'].addEventListener('change', function () { if (el['od'].value) el['do'].min = el['od'].value; });

    function fmt(v) {
      if (!v) return 'nie podano';
      var p = v.split('-');
      return p[2] + '.' + p[1] + '.' + p[0];
    }
    function setErr(name, text) {
      var f = el[name], out = doc.getElementById('e-' + name);
      f.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (out) out.textContent = text || '';
      return text ? f : null;
    }
    function validate() {
      var bad = [];
      var max = DWG.maxGuests || 15;
      function push(x) { if (x) bad.push(x); }
      var od = el['od'].value, dd = el['do'].value;
      push(setErr('od', !od ? 'Prosimy podać datę przyjazdu.' : (od < today ? 'Data przyjazdu nie może być wcześniejsza niż dziś.' : '')));
      push(setErr('do', !dd ? 'Prosimy podać datę wyjazdu.' : (od && dd <= od ? 'Wyjazd musi być po dniu przyjazdu.' : '')));
      var g = el['osoby'].value.trim();
      var gn = Number(g);
      push(setErr('osoby', !g ? 'Prosimy podać liczbę osób.' : ((!/^\d+$/.test(g) || gn < 1 || gn > max) ? 'Liczba osób: od 1 do ' + max + '.' : '')));
      var ph = el['telefon'].value.trim();
      var phDigits = ph.replace(/\D/g, '');
      push(setErr('telefon', ph && (!/^[+\d][\d\s().-]*$/.test(ph) || phDigits.length < 9 || phDigits.length > 15) ? 'Numer telefonu wygląda niepoprawnie.' : ''));
      var nm = el['imie'].value.trim();
      push(setErr('imie', !nm ? 'Prosimy podać imię i nazwisko.' : ''));
      var em = el['email'].value.trim();
      push(setErr('email', !em ? 'Prosimy podać adres e-mail.' : (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? 'Adres e-mail wygląda niepoprawnie.' : '')));
      return bad;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = validate();
      if (bad.length) {
        msg.className = 'form-msg err';
        msg.textContent = 'Prosimy poprawić zaznaczone pola.';
        bad[0].focus();
        return;
      }
      var guests = el['osoby'].value.trim();
      var note = el['wiadomosc'].value.trim();
      var phone = el['telefon'].value.trim();
      var lines = [
        'Dzień dobry,',
        '',
        'proszę o informację o wolnym terminie w domu Dom w górach.',
        '',
        'Przyjazd: ' + fmt(el['od'].value),
        'Wyjazd: ' + fmt(el['do'].value),
        'Liczba osób: ' + guests,
        ''
      ];
      if (note) { lines.push(note, ''); }
      lines.push('Z poważaniem', el['imie'].value.trim(), 'E-mail: ' + el['email'].value.trim());
      if (phone) lines.push('Telefon: ' + phone);
      var subject = 'Zapytanie o termin: ' + fmt(el['od'].value) + ' do ' + fmt(el['do'].value);
      msg.className = 'form-msg';
      msg.textContent = 'Otwieramy Państwa program pocztowy z gotową wiadomością. Wystarczy ją wysłać.';
      DWG.openMail('mailto:' + DWG.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\r\n')));
    });
  }

})();
