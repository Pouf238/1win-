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
