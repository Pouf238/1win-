/* Symo Print — fiche produit : galerie pilotée par les options choisies, agrandissement (visionneuse), lignes d'options repliables avec valeur choisie.
   Sans dépendance, aucune donnée collectée. Sans JavaScript la fiche reste complète : image principale, miniatures non actives, toutes les options ouvertes. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gal = d.querySelector('[data-gallery]'), form = d.getElementById('cfg');

  /* ---------- galerie : miniatures, image principale en fondu ---------- */
  var thumbs = gal ? [].slice.call(gal.querySelectorAll('.thumbs button')) : [], cur = 0, timer = null;
  thumbs.forEach(function (b, i) { if (b.classList.contains('on')) cur = i; });
  function info(b) { return { src: b.getAttribute('data-img'), title: b.getAttribute('data-title') || '', mock: b.getAttribute('data-mock') === '1' }; }
  function swap(b) {
    var img = d.getElementById('gimg'); if (!img) return; var it = info(b); if (img.getAttribute('src') === it.src) return;
    var apply = function () { img.src = it.src; img.alt = it.title; img.classList.toggle('mock', it.mock); img.classList.remove('out'); };
    clearTimeout(timer); if (reduce) { apply(); return; } img.classList.add('out'); timer = setTimeout(apply, 150);
  }
  var count = null, swipedAt = 0;
  function select(i) {
    var b = thumbs[i]; if (!b) return; cur = i;
    thumbs.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (count) count.textContent = (i + 1) + ' / ' + thumbs.length;
    swap(b); if (b.scrollIntoView && b.parentNode.scrollWidth > b.parentNode.clientWidth) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  thumbs.forEach(function (b, i) { b.addEventListener('click', function () { select(i); }); });

  /* ---------- faire défiler les photos : flèches sur l'image principale, glissement du doigt, compteur ---------- */
  function step(k) { if (thumbs.length > 1) select((cur + k + thumbs.length) % thumbs.length); }
  function swipe(el, go) {   // glissement horizontal net (pas un défilement vertical de la page)
    var x0 = null, y0 = 0;
    el.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 === null) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { swipedAt = Date.now(); go(dx < 0 ? 1 : -1); }
    }, { passive: true });
  }
  var gmain = gal ? gal.querySelector('.main') : null;
  if (gmain && thumbs.length > 1) {
    [['g-nav g-prev', 'Image précédente', '‹', -1], ['g-nav g-next', 'Image suivante', '›', 1]].forEach(function (a) {
      var b = btn(a[0], a[1], a[2]); b.addEventListener('click', function (e) { e.preventDefault(); step(a[3]); }); gmain.appendChild(b);
    });
    count = d.createElement('span'); count.className = 'g-count'; count.setAttribute('aria-hidden', 'true'); count.textContent = (cur + 1) + ' / ' + thumbs.length; gmain.appendChild(count);
    swipe(gmain, step);
  }

  /* ---------- outils de la fiche : partager (feuille de partage du téléphone, sinon lien WhatsApp), imprimer, accès rapide aux onglets ---------- */
  var sh = d.querySelector('[data-share]');
  if (sh && navigator.share) sh.addEventListener('click', function (e) { e.preventDefault(); navigator.share({ title: sh.getAttribute('data-share-title'), url: sh.getAttribute('data-share-url') }).catch(function () {}); });
  var pr = d.querySelector('[data-print]'); if (pr) pr.addEventListener('click', function () { window.print(); });
  [].slice.call(d.querySelectorAll('[data-tab-go]')).forEach(function (a) { a.addEventListener('click', function () { var b = d.querySelector('[data-tab="' + a.getAttribute('data-tab-go') + '"]'); if (b) b.click(); }); });

  /* ---------- le visuel suit les options (pliage, orientation…) ---------- */
  var vis = null; try { var vel = d.getElementById('pvis'); vis = vel ? JSON.parse(vel.textContent) : null; } catch (e) { vis = null; }
  function chosen(g) { var el = form.querySelector('input[name="opt[' + g + ']"]:checked'); return el ? el.value : ''; }
  function visualName() {
    var vals = []; for (var i = 0; i < vis.groups.length; i++) { var v = chosen(vis.groups[i]); if (!v) break; vals.push(v); }
    while (vals.length) { var k = vals.join('|'); if (vis.map[k]) return vis.map[k]; vals.pop(); } return '';
  }
  function sync() {
    var n = visualName(); if (!n) return;
    for (var i = 0; i < thumbs.length; i++) if (thumbs[i].getAttribute('data-key') === n) { if (i !== cur) select(i); return; }
  }
  if (vis && form && thumbs.length) form.addEventListener('change', sync);

  /* ---------- visionneuse (agrandissement) ---------- */
  var lb = null, back = null;
  function closeLb() {
    if (!lb) return; var el = lb; lb = null; root.classList.remove('lb-lock'); d.removeEventListener('keydown', onKey, true);
    el.classList.remove('in'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduce ? 0 : 220);
    if (back && back.focus) { back.focus(); } back = null;
  }
  function onKey(e) {
    if (!lb) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLb(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); lb.go(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); lb.go(-1); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(lb.querySelectorAll('button')).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && d.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }
  function btn(cls, label, txt) { var b = d.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.textContent = txt; return b; }
  function openLb() {
    if (lb || !thumbs.length && !d.getElementById('gimg')) return; back = d.activeElement;
    var list = thumbs.length ? thumbs.map(info) : [{ src: d.getElementById('gimg').getAttribute('src'), title: d.getElementById('gimg').getAttribute('alt') || '', mock: false }], i = thumbs.length ? cur : 0;
    var el = d.createElement('div'); el.className = 'lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Agrandissement de l\'image');
    var p = d.createElement('div'); p.className = 'lb-p';
    var h = d.createElement('div'); h.className = 'lb-h'; var t = d.createElement('h2'); t.className = 'lb-t'; var x = btn('lb-x', 'Fermer', '✕'); h.appendChild(t); h.appendChild(x);
    var s = d.createElement('div'); s.className = 'lb-s'; var im = d.createElement('img'); im.className = 'lb-i'; im.alt = '';
    var pv = btn('lb-n lb-prev', 'Image précédente', '‹'), nx = btn('lb-n lb-next', 'Image suivante', '›'), c = d.createElement('div'); c.className = 'lb-c'; c.setAttribute('aria-live', 'polite');
    s.appendChild(pv); s.appendChild(im); s.appendChild(nx); p.appendChild(h); p.appendChild(s); p.appendChild(c); el.appendChild(p);
    function show(n) {
      i = (n + list.length) % list.length; var it = list[i]; im.classList.add('out');
      var ap = function () { im.src = it.src; im.alt = it.title; im.classList.remove('out'); }; if (reduce) ap(); else setTimeout(ap, 120);
      t.textContent = it.title; c.textContent = list.length > 1 ? (i + 1) + ' / ' + list.length : ''; pv.hidden = nx.hidden = list.length < 2;
    }
    el.go = function (k) { if (list.length > 1) show(i + k); };
    swipe(s, function (k) { el.go(k); });
    x.addEventListener('click', closeLb); pv.addEventListener('click', function () { show(i - 1); }); nx.addEventListener('click', function () { show(i + 1); });
    el.addEventListener('click', function (e) { if (Date.now() - swipedAt < 450) return; if (e.target === el || e.target === s) closeLb(); });
    d.body.appendChild(el); lb = el; root.classList.add('lb-lock'); d.addEventListener('keydown', onKey, true);
    im.src = list[i].src; im.alt = list[i].title; t.textContent = list[i].title; c.textContent = list.length > 1 ? (i + 1) + ' / ' + list.length : ''; pv.hidden = nx.hidden = list.length < 2;
    requestAnimationFrame(function () { el.classList.add('in'); x.focus(); });
  }
  if (gal) gal.addEventListener('click', function (e) { if (Date.now() - swipedAt < 450) return; if (e.target.closest('[data-zoom]')) openLb(); });

  /* ---------- options repliables : libellé, valeur choisie, flèche ---------- */
  if (form) {
    var groups = [].slice.call(form.querySelectorAll('.og[data-group]')).filter(function (g) { return g.querySelectorAll('.opt input[type=radio]').length > 1; });
    if (groups.length) form.classList.add('og-js');
    groups.forEach(function (g, gi) {
      var h = g.querySelector(':scope > h3'); if (!h) return;
      var open = gi === 0, id = 'ogb-' + g.getAttribute('data-group');
      var b = d.createElement('button'); b.type = 'button'; b.className = 'og-t'; b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.setAttribute('aria-controls', id);
      while (h.firstChild) b.appendChild(h.firstChild);
      var v = d.createElement('span'); v.className = 'og-v'; var ch = d.createElement('span'); ch.className = 'og-c'; ch.setAttribute('aria-hidden', 'true');
      b.appendChild(v); b.appendChild(ch); h.appendChild(b);
      var body = d.createElement('div'); body.className = 'og-b'; body.id = id; var inner = d.createElement('div'); inner.className = 'og-bi';
      while (h.nextSibling) inner.appendChild(h.nextSibling); body.appendChild(inner); g.appendChild(body); g.classList.toggle('open', open);
      function summary() {
        var inp = g.querySelector('input:checked'), lab = inp && inp.closest('.opt'); if (!lab) { v.textContent = ''; return; }
        var t = lab.querySelector('b'), pm = lab.querySelector('.pm'); v.textContent = (t ? t.textContent : '') + (pm && pm.textContent.trim() ? ' · ' + pm.textContent.trim() : '');
      }
      summary(); g.addEventListener('change', summary);
      b.addEventListener('click', function () { var o = !g.classList.contains('open'); g.classList.toggle('open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    });
  }
})();
