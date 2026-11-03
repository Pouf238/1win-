/* Vitrine animée de l'accueil.
 * Effets inspirés du composant « Coffee Pour Menu » (Aakash Mehra), appliqués aux photos produits :
 *  - sélection au survol (souris), au clavier (flèches, Début, Fin) et au toucher (1er appui = aperçu, 2e = ouvrir) ;
 *  - pastille qui glisse d'un objet à l'autre (ressort amorti) ;
 *  - la photo en cours est « éjectée » (gravité + rotation) puis la suivante arrive en ressort, avec son ombre au sol ;
 *  - le dernier choix gagne toujours ; au plus 3 photos en chute en même temps.
 * Physique maison (gravité, ressorts) : aucune dépendance, uniquement transform/opacity, boucle active seulement quand ça bouge.
 * Mouvement réduit : fondu simple, aucune physique. Sans JavaScript : la 1re photo et les liens restent utilisables. */
(function () {
  'use strict';
  var root = document.querySelector('[data-vitrine]');
  if (!root) return;
  var menu = root.querySelector('.vt-menu'), stage = root.querySelector('.vt-stage'), pill = root.querySelector('.vt-pill'),
    cta = root.querySelector('.vt-cta'), live = root.querySelector('[data-vt-live]');
  var items = [].slice.call(menu.querySelectorAll('.vt-item'));
  var firstCard = stage.querySelector('.vt-card'), firstShadow = stage.querySelector('.vt-shadow');
  if (items.length < 2 || !firstCard) return;

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduce = !!mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', function (e) { reduce = !!e.matches; if (reduce) snapPill(); });
  root.classList.add('vt-js');

  var UW = 360;        // largeur de scène en « unités » : mêmes constantes physiques que le composant d'origine
  var G_FALL = 2600;   // gravité (unités/s²)
  var cur = 0, cards = [], raf = 0, scale = 1, SH = 0;
  var P = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, moving: false };   // pastille

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function rnd() { return Math.random(); }
  function px(n) { return n.toFixed(1) + 'px'; }

  /* ---------- mesures ---------- */
  function measure() {
    var w = stage.clientWidth || 1; SH = stage.clientHeight || 1; scale = w / UW;
    cards.forEach(render);
  }
  function sizePill() {
    var it = items[cur];
    pill.style.width = it.offsetWidth + 'px'; pill.style.height = it.offsetHeight + 'px';
    P.tx = it.offsetLeft; P.ty = it.offsetTop;
  }
  function snapPill() { sizePill(); P.x = P.tx; P.y = P.ty; P.vx = P.vy = 0; P.moving = false; pill.style.transform = 'translate3d(' + px(P.x) + ',' + px(P.y) + ',0)'; }

  /* ---------- cartes (photo + ombre) ---------- */
  function adopt(el, sh) {
    var c = { el: el, sh: sh, mode: 'rest', x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, op: 1, wait: 0, fallT: 0 };
    cards.push(c); return c;
  }
  function makeCard(i) {
    var it = items[i], el = document.createElement('figure'), img = new Image(), sh = document.createElement('span');
    el.className = 'vt-card'; sh.className = 'vt-shadow'; sh.setAttribute('aria-hidden', 'true');
    img.src = it.getAttribute('data-img'); img.alt = it.getAttribute('data-name') || ''; img.width = 900; img.height = 900; img.decoding = 'async';
    el.appendChild(img);
    var first = stage.querySelector('.vt-shadow');   // les nouvelles cartes passent derrière celles qui tombent
    stage.insertBefore(sh, first); stage.insertBefore(el, stage.querySelector('.vt-card'));
    var c = adopt(el, sh); c.mode = 'wait'; c.x = UW * 1.05; c.op = 1; render(c); return c;
  }
  function drop(c) {
    if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    if (c.sh.parentNode) c.sh.parentNode.removeChild(c.sh);
    var k = cards.indexOf(c); if (k >= 0) cards.splice(k, 1);
  }
  function render(c) {
    var X = c.x * scale, Y = c.y * scale, rot = c.a * 57.29578;
    var rest = c.mode === 'rest';
    c.el.style.transform = rest ? 'none' : 'translate3d(' + px(X) + ',' + px(Y) + ',0) rotate(' + rot.toFixed(2) + 'deg)';
    c.el.style.opacity = c.op < 1 ? c.op.toFixed(3) : '';
    c.el.style.willChange = rest ? '' : 'transform';
    var so = c.mode === 'fall' ? Math.max(0, 1 - c.fallT * 6) : (c.mode === 'wait' ? 0 : c.op);
    c.sh.style.transform = rest ? 'none' : 'translate3d(' + px(X) + ',0,0)';
    c.sh.style.opacity = so < 1 ? so.toFixed(3) : '';
  }

  /* ---------- physique (mêmes ressorts que le composant d'origine) ---------- */
  function step(c, dt) {
    if (c.mode === 'wait') { c.wait -= dt; if (c.wait <= 0) c.mode = 'enter'; return true; }
    if (c.mode === 'enter') {
      var ax = -130 * c.x - 15.5 * c.vx;                      // ressort vers le centre, légèrement sous-amorti
      c.vx += ax * dt; c.x += c.vx * dt;
      var target = clamp(-ax * 0.00011, -0.14, 0.14);         // la photo s'incline selon l'accélération
      c.va += (-240 * (c.a - target) - 15 * c.va) * dt; c.a += c.va * dt;
      if (Math.abs(c.x) < 0.4 && Math.abs(c.vx) < 8 && Math.abs(c.a) < 0.003 && Math.abs(c.va) < 0.04) { c.x = 0; c.vx = 0; c.a = 0; c.va = 0; c.mode = 'rest'; return false; }
      return true;
    }
    if (c.mode === 'fall') {
      c.fallT += dt; c.vy += G_FALL * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
      return true;
    }
    return false;
  }
  function stepPill(dt) {
    if (!P.moving) return false;
    P.vx += (-420 * (P.x - P.tx) - 34 * P.vx) * dt; P.x += P.vx * dt;
    P.vy += (-420 * (P.y - P.ty) - 34 * P.vy) * dt; P.y += P.vy * dt;
    if (Math.abs(P.x - P.tx) < 0.2 && Math.abs(P.y - P.ty) < 0.2 && Math.abs(P.vx) < 2 && Math.abs(P.vy) < 2) { P.x = P.tx; P.y = P.ty; P.vx = P.vy = 0; P.moving = false; }
    pill.style.transform = 'translate3d(' + px(P.x) + ',' + px(P.y) + ',0)';
    return P.moving;
  }

  function loop() {
    if (raf) return;
    var last = performance.now();
    var tick = function (now) {
      var dt = Math.min(1 / 30, (now - last) / 1000); last = now;
      var busy = stepPill(dt);
      for (var i = cards.length - 1; i >= 0; i--) {
        var c = cards[i];
        if (step(c, dt)) busy = true;
        if (c.mode === 'fall' && c.y * scale > SH + 24) { drop(c); continue; }   // sorti par le bas
        render(c);
      }
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- sélection ---------- */
  function swap(i) {
    var leaving = cards.filter(function (c) { return c.mode === 'enter' || c.mode === 'rest' || c.mode === 'wait'; });
    if (reduce) {
      leaving.forEach(function (c) { c.el.style.transition = c.sh.style.transition = 'opacity .22s'; c.el.style.opacity = c.sh.style.opacity = '0'; c.mode = 'gone'; setTimeout(function () { drop(c); }, 260); });
      var n = makeCard(i); n.mode = 'rest'; n.x = 0; render(n);
      n.el.style.opacity = '0'; n.sh.style.opacity = '0';
      requestAnimationFrame(function () { n.el.style.transition = n.sh.style.transition = 'opacity .22s'; n.el.style.opacity = ''; n.sh.style.opacity = ''; });
      return;
    }
    var falling = 0;
    leaving.forEach(function (c) {
      if (c.mode === 'wait') { drop(c); return; }                       // n'est jamais arrivée sur la scène
      c.mode = 'fall'; c.fallT = 0;
      c.vy = -150 - rnd() * 60; c.vx = -30 - rnd() * 50 + c.vx * 0.3;   // coup vers le haut et le côté, puis gravité
      c.va = (rnd() < 0.75 ? -1 : 1) * (1.3 + rnd() * 1.4) + c.va * 0.3;
    });
    cards.forEach(function (c) { if (c.mode === 'fall') falling++; });
    if (falling > 3) cards.filter(function (c) { return c.mode === 'fall'; }).slice(0, falling - 3).forEach(drop);   // plafond de photos en chute
    var nc = makeCard(i); nc.wait = falling ? 0.14 : 0.05;
    loop();
  }

  function setActive(i) {
    items.forEach(function (it, k) {
      var on = k === i; it.classList.toggle('on', on);
      if (on) it.setAttribute('aria-current', 'true'); else it.removeAttribute('aria-current');
    });
    var it = items[i], name = it.getAttribute('data-name') || '';
    if (cta) { cta.setAttribute('href', it.getAttribute('href')); cta.setAttribute('aria-label', 'Voir ' + name); }
    if (live) live.textContent = name + ' : ' + (it.getAttribute('data-desc') || '');
  }

  function select(i) {
    if (i === cur || i < 0 || i >= items.length) return;
    cur = i; setActive(i); sizePill(); P.moving = !reduce;
    if (reduce) snapPill(); else loop();
    swap(i);
  }

  /* ---------- événements ---------- */
  items.forEach(function (it, i) {
    it.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') select(i); });
    it.addEventListener('focus', function () { if (it.matches && it.matches(':focus-visible')) select(i); });
    it.addEventListener('click', function (e) { if (i !== cur) { e.preventDefault(); select(i); } });   // actif : le lien s'ouvre normalement
  });
  menu.addEventListener('keydown', function (e) {
    var n = -1, L = items.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (cur + 1) % L;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (cur - 1 + L) % L;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = L - 1;
    if (n < 0) return;
    e.preventDefault(); select(n); items[n].focus();
  });

  adopt(firstCard, firstShadow || document.createElement('span'));
  measure(); snapPill();
  if (window.ResizeObserver) { var ro = new ResizeObserver(function () { measure(); if (!P.moving) snapPill(); }); ro.observe(stage); ro.observe(menu); }
  else window.addEventListener('resize', function () { measure(); snapPill(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!P.moving) snapPill(); });

  // précharge les autres photos pour que l'arrivée en ressort ne montre jamais un cadre vide
  var warm = function () { items.forEach(function (it) { var im = new Image(); im.src = it.getAttribute('data-img'); }); };
  if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 1200);
})();
