/* Symo Print — habillage du site public : révélations au défilement, en-tête compact. Sans dépendance ; aucune donnée collectée. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var header = d.querySelector('[data-header], .header');
  if (header) { var tick = false, on = function () { tick = false; header.classList.toggle('scrolled', (window.scrollY || root.scrollTop) > 24); };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(on); } }, { passive: true }); on(); }

  // révélations : les éléments déjà visibles au chargement s'affichent tout de suite (aucun clignotement) ; les autres apparaissent en défilant.
  var els = [].slice.call(d.querySelectorAll('.rv'));
  if (!els.length) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var h = window.innerHeight || 800;
  els.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < h * 0.96 && r.bottom > 0) e.classList.add('in'); });
  root.classList.add('rv-on');
  var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(function (e) { if (!e.classList.contains('in')) io.observe(e); });
})();

/* carrousel de catégories : défilement tactile natif ; boutons précédent/suivant ajoutés si le contenu déborde */
(function () {
  'use strict';
  var car = document.querySelector('[data-car]'); if (!car) return;
  var nav = document.querySelector('[data-cv-nav]'), btns = nav ? [].slice.call(nav.querySelectorAll('[data-cv]')) : [];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function upd() {
    var over = car.scrollWidth - car.clientWidth > 4; if (nav) nav.hidden = !over;
    if (btns.length) { btns[0].disabled = car.scrollLeft <= 2; btns[1].disabled = car.scrollLeft >= car.scrollWidth - car.clientWidth - 2; }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { car.scrollBy({ left: Number(b.getAttribute('data-cv')) * Math.max(240, car.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' }); }); });
  car.addEventListener('scroll', function () { window.requestAnimationFrame(upd); }, { passive: true });
  car.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { car.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * 280, behavior: reduce ? 'auto' : 'smooth' }); e.preventDefault(); } });
  window.addEventListener('resize', upd); upd();
})();
