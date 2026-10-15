(function () {
  'use strict';
  var doc = document;
  doc.documentElement.classList.add('js');

  var EMAIL = 'dom.wgorach.swieradow@gmail.com';

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
  doc.querySelectorAll('img[data-fade]').forEach(function (img) {
    var tries = 0, src = img.getAttribute('src');
    img.classList.add('is-loading');
    function ok() { img.classList.remove('is-loading'); }
    function fail() {
      if (tries < 2) {
        tries += 1;
        window.setTimeout(function () { img.removeAttribute('src'); img.setAttribute('src', src); }, 1500 * tries);
      } else { img.style.display = 'none'; }
    }
    img.addEventListener('load', ok);
    img.addEventListener('error', fail);
    if (img.complete) { if (img.naturalWidth) { ok(); } else if (src) { fail(); } }
  });

  /* reveal on scroll */
  var rev = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* lightbox */
  var items = Array.prototype.slice.call(doc.querySelectorAll('[data-lightbox]'));
  var lb = doc.getElementById('lightbox');
  if (lb && items.length) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('figcaption');
    var lbCount = lb.querySelector('.lb-count');
    var current = 0, lastFocus = null;
    function show(i) {
      current = (i + items.length) % items.length;
      var it = items[current];
      lbImg.removeAttribute('src');
      lbImg.src = it.getAttribute('data-full');
      lbImg.alt = it.getAttribute('data-alt') || '';
      lbCap.textContent = it.getAttribute('data-alt') || '';
      lbCount.textContent = (current + 1) + ' / ' + items.length;
    }
    function open(i) {
      lastFocus = doc.activeElement;
      show(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      doc.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    }
    function close() {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      doc.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); });
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
    var today = new Date().toISOString().slice(0, 10);
    var from = form.elements['od'], to = form.elements['do'];
    from.min = today; to.min = today;
    from.addEventListener('change', function () { if (from.value) to.min = from.value; });

    function fmt(v) {
      if (!v) return 'nie podano';
      var p = v.split('-');
      return p[2] + '.' + p[1] + '.' + p[0];
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements['imie'].value.trim();
      var mail = form.elements['email'].value.trim();
      var bad = [];
      [form.elements['imie'], form.elements['email']].forEach(function (f) {
        var invalid = !f.value.trim() || (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim()));
        f.setAttribute('aria-invalid', invalid ? 'true' : 'false');
        if (invalid) bad.push(f);
      });
      if (to.value && from.value && to.value < from.value) {
        to.setAttribute('aria-invalid', 'true'); bad.push(to);
      } else { to.setAttribute('aria-invalid', 'false'); }
      if (bad.length) {
        msg.className = 'form-msg err';
        msg.textContent = 'Prosimy o uzupełnienie imienia i poprawnego adresu e-mail oraz o sprawdzenie dat.';
        bad[0].focus();
        return;
      }
      var guests = form.elements['osoby'].value || 'nie podano';
      var note = form.elements['wiadomosc'].value.trim();
      var body = [
        'Dzień dobry,',
        '',
        'proszę o informację o wolnym terminie w domu Dom w górach.',
        '',
        'Przyjazd: ' + fmt(from.value),
        'Wyjazd: ' + fmt(to.value),
        'Liczba osób: ' + guests,
        '',
        note ? note : '',
        note ? '' : null,
        'Z poważaniem',
        name,
        'E-mail: ' + mail
      ].filter(function (l) { return l !== null; }).join('\r\n');
      var subject = 'Zapytanie o termin' + (from.value ? ': ' + fmt(from.value) + (to.value ? ' do ' + fmt(to.value) : '') : '');
      msg.className = 'form-msg';
      msg.textContent = 'Otwieramy Państwa program pocztowy z gotową wiadomością. Wystarczy ją wysłać.';
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

})();
