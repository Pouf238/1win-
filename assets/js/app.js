/* Symo Print — scripts communs (sans dépendance, sans traceur) */
(function () {
  'use strict';
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var csrf = d.body.getAttribute('data-csrf') || '';
  function api(url, data) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'fetch', 'X-CSRF-Token': csrf }, body: JSON.stringify(data || {}) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Réponse inattendue.' }; }); }).catch(function () { return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau.' }; });
  }
  window.SP = { $: $, $$: $$, api: api, csrf: csrf };

  // menu mobile
  var burger = $('[data-burger]'), nav = $('#navbar');
  if (burger && nav) { burger.addEventListener('click', function () { var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
    d.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } }); }

  // diaporama d'accueil
  var slides = $$('.slide'), dots = $$('[data-slide]'), cur = 0, timer;
  function show(i) { cur = (i + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); }); dots.forEach(function (b, k) { b.classList.toggle('on', k === cur); }); }
  if (slides.length > 1) { dots.forEach(function (b) { b.addEventListener('click', function () { show(+b.getAttribute('data-slide')); reset(); }); });
    var reset = function () { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { show(cur + 1); }, 6500); }; reset(); }

  // suggestions de recherche
  var q = $('[data-suggest]'), box = $('#suggest'), t;
  if (q && box) {
    q.addEventListener('input', function () { clearTimeout(t); var v = q.value.trim(); if (v.length < 2) { box.classList.remove('open'); return; }
      t = setTimeout(function () { fetch('/api/suggest?q=' + encodeURIComponent(v), { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (rows) {
        box.innerHTML = ''; rows.forEach(function (r) { var a = d.createElement('a'); a.href = r.url; a.textContent = r.name; var s = d.createElement('small'); s.textContent = r.price; a.appendChild(s); box.appendChild(a); });
        box.classList.toggle('open', rows.length > 0); }).catch(function () {}); }, 200); });
    d.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== q) box.classList.remove('open'); });
  }

  // favoris
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b) return; e.preventDefault();
    api('/api/favori', { id: +b.getAttribute('data-fav') }).then(function (r) { if (r.login) { location.href = '/compte/connexion'; return; } if (r.ok) $$('[data-fav="' + b.getAttribute('data-fav') + '"]').forEach(function (x) { x.classList.toggle('on', r.on); }); });
  });

  // filtres et tri : envoi automatique
  $$('[data-autosubmit]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  $$('#filters input, #filters select').forEach(function (i) { i.addEventListener('change', function () { i.form.submit(); }); });

  // onglets
  $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { $$('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); }); $$('.tabp').forEach(function (p) { p.classList.toggle('on', p.id === b.getAttribute('data-tab')); }); }); });
  // galerie
  $$('.thumbs button').forEach(function (b) { b.addEventListener('click', function () { var m = $('#gmain'); m.innerHTML = '<img src="' + b.getAttribute('data-img') + '" alt="">'; $$('.thumbs button').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
  // confirmation avant suppression
  d.addEventListener('submit', function (e) { var m = e.target.getAttribute('data-confirm'); if (m && !confirm(m)) e.preventDefault(); });
  // compteur panier
  window.SP.setCart = function (n) { $$('[data-cart-count]').forEach(function (c) { c.textContent = n || ''; c.setAttribute('data-n', n); }); };
})();
