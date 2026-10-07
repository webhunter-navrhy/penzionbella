/* Penzion Bella – chování webu bez frameworku:
   menu na mobilu, střídání fotek v úvodu, postupné zobrazování sekcí,
   lišta „Ověřit dostupnost“, poptávkový formulář (odeslání e-mailem přes webhunter-admin) a galerie. */
(function () {
  'use strict';
  var CFG = window.BELLA || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var KEY = 'bella-poptavka';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var svg = function (d, size) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    menu: '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    left: '<path d="m15 18-6-6 6-6"></path>',
    right: '<path d="m9 18 6-6-6-6"></path>',
    zoom: '<circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line><line x1="11" x2="11" y1="8" y2="14"></line><line x1="8" x2="14" y1="11" y2="11"></line>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nb = function (s) { return String(s).replace(/(^|\s)([ksvzouaiKSVZOUAI])\s/g, '$1$2 '); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var cz = function (iso) { if (!iso) return ''; var p = iso.split('-'); return +p[2] + '. ' + +p[1] + '. ' + p[0]; };

  /* ---------- menu ---------- */
  var ham = $('.hamburger'), mm = $('#mobil-menu');
  if (ham && mm) {
    var setMenu = function (open) {
      mm.setAttribute('data-open', open ? 'true' : 'false');
      ham.setAttribute('aria-expanded', open ? 'true' : 'false');
      ham.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
      ham.innerHTML = svg(open ? IC.x : IC.menu);
    };
    ham.addEventListener('click', function () { setMenu(mm.getAttribute('data-open') !== 'true'); });
    $$('a', mm).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- střídání fotek v úvodu ---------- */
  var heroImgs = $$('.hero-fotky img'), dots = $$('.hero-tecky button');
  if (heroImgs.length > 1) {
    var cur = 0, timer = null;
    var show = function (i) {
      cur = i;
      heroImgs.forEach(function (im, k) { im.setAttribute('data-aktivni', k === i ? 'true' : 'false'); if (k === i && im.loading === 'lazy') im.loading = 'eager'; });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    };
    if (!reduce) timer = setInterval(function () { show((cur + 1) % heroImgs.length); }, 7000);
    dots.forEach(function (d, k) { d.addEventListener('click', function () { clearInterval(timer); show(k); }); });
  }

  /* ---------- postupné zobrazení sekcí ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    $$('.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
      el.setAttribute('data-videt', 'false');
      var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { el.setAttribute('data-videt', 'true'); io.disconnect(); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      io.observe(el);
    });
  }

  /* ---------- lišta „Ověřit dostupnost“ ---------- */
  var lista = $('[data-lista]');
  if (lista) {
    var lp = $('#rl-p', lista), lo = $('#rl-o', lista), lh = $('#rl-h', lista);
    lp.min = today(); lo.min = today();
    lp.addEventListener('change', function () { lo.min = lp.value || today(); });
    lista.addEventListener('submit', function (e) {
      e.preventDefault();
      try { sessionStorage.setItem(KEY, JSON.stringify({ prijezd: lp.value, odjezd: lo.value, osob: lh.value })); } catch (er) {}
      location.href = (CFG.base || '/') + 'rezervace/';
    });
  }

  /* ---------- poptávkový formulář ---------- */
  var tels = CFG.tel || [];
  var telBtns = function () { return tels.map(function (t) { return '<a class="btn btn-obrys" href="' + t[2] + '">' + svg(IC.phone, 18) + ' ' + esc(t[0]) + ' ' + esc(t[1]) + '</a>'; }).join(''); };
  var telText = function () { return tels.map(function (t) { return esc(t[0]) + ' <a href="' + t[2] + '">' + esc(t[1]) + '</a>'; }).join(', '); };

  function validate(v) {
    var c = {};
    if (v.jmeno.trim().length < 2) c.jmeno = 'Napište prosím jméno, ať víme, komu odpovídáme.';
    var tel = v.telefon.replace(/\s+/g, ''), mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()), telOk = /^(\+?\d{9,15})$/.test(tel);
    if (!mailOk && !telOk) c.telefon = 'Stačí jedno: telefon (9 číslic) nebo e-mail.';
    if (v.email && !mailOk) c.email = 'E-mail vypadá neúplně (chybí @ nebo doména).';
    if (v.telefon && !telOk) c.telefon = 'Telefon zadejte jako 9 číslic, např. 777 123 456.';
    if (!v.prijezd) c.prijezd = 'Vyberte den příjezdu.';
    if (!v.odjezd) c.odjezd = 'Vyberte den odjezdu.';
    if (v.prijezd && v.odjezd && v.odjezd <= v.prijezd) c.odjezd = 'Odjezd musí být po příjezdu — minimální pobyt jsou 2 noci.';
    var n = Number(v.osob);
    if (!v.osob || !isFinite(n) || n < 1 || n > (CFG.max || 17)) c.osob = 'Počet osob 1 až ' + (CFG.max || 17) + ' (kapacita penzionu).';
    return c;
  }

  $$('form[data-poptavka]').forEach(function (form) {
    var t0 = Date.now(), touched = {}, F = function (n) { return form.elements.namedItem(n); };
    var fields = ['prijezd', 'odjezd', 'osob', 'jmeno', 'telefon', 'email'];
    F('prijezd').min = today(); F('odjezd').min = today();
    F('prijezd').addEventListener('change', function () { F('odjezd').min = F('prijezd').value || today(); });
    try {
      var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (saved) { ['prijezd', 'odjezd', 'osob'].forEach(function (k) { if (saved[k]) F(k).value = saved[k]; }); sessionStorage.removeItem(KEY); }
    } catch (er) {}
    var values = function () { var v = {}; ['prijezd', 'odjezd', 'osob', 'pobyt', 'jmeno', 'telefon', 'email', 'poznamka'].forEach(function (k) { v[k] = F(k).value || ''; }); return v; };
    var paint = function (chyby) {
      fields.forEach(function (k) {
        var el = F(k), box = el.closest('.pole'), old = box.querySelector('.chyba'), bad = chyby[k] && touched[k];
        if (old) old.remove();
        el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) { var s = document.createElement('span'); s.className = 'chyba'; s.id = el.id + '-chyba'; s.setAttribute('role', 'alert'); s.textContent = chyby[k]; box.appendChild(s); el.setAttribute('aria-describedby', s.id); }
        else el.removeAttribute('aria-describedby');
      });
    };
    fields.forEach(function (k) {
      F(k).addEventListener('blur', function () { touched[k] = true; paint(validate(values())); });
      F(k).addEventListener('input', function () { if (touched[k]) paint(validate(values())); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = values(), chyby = validate(v);
      fields.forEach(function (k) { touched[k] = true; });
      paint(chyby);
      var err = form.querySelector('p.chyba[data-odeslani]'); if (err) err.remove();
      if (Object.keys(chyby).length) { var f = form.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return; }
      var btn = form.querySelector('button[type="submit"]'), lab = btn.querySelector('span');
      btn.disabled = true; lab.textContent = 'Odesílám…';
      var body = {
        type: 'poptavka', hp: F('web').value, ms: Date.now() - t0, page: location.href,
        fields: { 'Jméno': v.jmeno, 'Telefon': v.telefon, 'E-mail': v.email, 'Příjezd': cz(v.prijezd), 'Odjezd': cz(v.odjezd), 'Počet osob': v.osob, 'Co hosta zajímá': v.pobyt, 'Poznámka': v.poznamka }
      };
      fetch(CFG.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'chyba'); }); })
        .then(function () {
          var box = document.createElement('div');
          box.className = 'stav-ok'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); box.id = 'poptavka-stav';
          box.innerHTML = '<h3>Poptávka odeslána, děkujeme</h3><p>' + esc(nb(form.getAttribute('data-dekujeme') || 'Ozveme se vám s potvrzením volného termínu a cenou. Poptávka je nezávazná.')) + '</p><div class="akce-radek">' + telBtns() + '</div>';
          form.replaceWith(box);
          box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        })
        .catch(function (er) {
          btn.disabled = false; lab.textContent = 'Odeslat nezávaznou poptávku';
          var p = document.createElement('p'); p.className = 'chyba'; p.setAttribute('role', 'alert'); p.setAttribute('data-odeslani', '');
          var msg = er && er.message && er.message !== 'chyba' && er.message !== 'Failed to fetch' ? er.message + ' ' : 'Odeslání se nepovedlo. ';
          p.innerHTML = esc(nb(msg + 'Zkuste to znovu, nebo nám zavolejte: ')) + telText() + (CFG.email ? ', případně napište na <a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a>' : '') + '.';
          btn.insertAdjacentElement('afterend', p);
        });
    });
  });

  /* ---------- galerie s lightboxem ---------- */
  $$('[data-galerie]').forEach(function (grid) {
    var btns = $$('button', grid);
    var photos = btns.map(function (b) { var i = b.querySelector('img'); return { src: i.currentSrc || i.src, alt: i.alt, w: i.getAttribute('width'), h: i.getAttribute('height') }; });
    var idx = 0, lb = null, last = null, prevOverflow = '';
    var render = function () {
      var p = photos[idx];
      lb.querySelector('.lightbox-hlava p').textContent = p.alt;
      var im = lb.querySelector('.lightbox-obraz img'); im.src = p.src; im.alt = p.alt; im.width = p.w; im.height = p.h;
      lb.querySelector('.lb-poc').textContent = (idx + 1) + ' / ' + photos.length;
    };
    var go = function (d) { idx = (idx + d + photos.length) % photos.length; render(); };
    var onKey = function (e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    var close = function () { if (!lb) return; lb.remove(); lb = null; document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; if (last) last.focus(); };
    var open = function (i) {
      idx = i; last = btns[i];
      lb = document.createElement('div');
      lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Fotografie penzionu');
      lb.innerHTML = '<div class="lightbox-hlava"><p></p><button class="lb-btn" type="button" aria-label="Zavřít fotografii">' + svg(IC.x) + '</button></div>' +
        '<div class="lightbox-obraz"><img decoding="async" alt=""></div>' +
        '<div class="lightbox-pata"><button class="lb-btn" type="button" aria-label="Předchozí fotografie">' + svg(IC.left) + '</button><span>' + svg(IC.zoom, 14).replace('<svg ', '<svg style="display:inline;vertical-align:-2px" ') + ' <span class="lb-poc"></span></span><button class="lb-btn" type="button" aria-label="Další fotografie">' + svg(IC.right) + '</button></div>';
      var b = lb.querySelectorAll('.lb-btn');
      b[0].addEventListener('click', close); b[1].addEventListener('click', function () { go(-1); }); b[2].addEventListener('click', function () { go(1); });
      lb.querySelector('.lightbox-obraz').addEventListener('click', function (e) { if (e.target === e.currentTarget) close(); });
      var sx = null;
      lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
      document.body.appendChild(lb);
      prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      render(); b[0].focus();
    };
    btns.forEach(function (b, i) { b.addEventListener('click', function () { open(i); }); });
  });
})();
