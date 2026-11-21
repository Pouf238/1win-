/* Couche « Futur » : lueur qui suit le pointeur, traits de coupe sur les cartes, apparition douce au défilement.
   Aucune dépendance. Respecte « réduire les animations » ; sans JavaScript, tout reste visible et utilisable. */
(function () {
  'use strict';
  var d = document, de = d.documentElement, mm = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mm('(prefers-reduced-motion: reduce)');
  var CARDS = '.pcard,.px-cat,.px-find a,.cats .cat-tile,.px-bst,.px-tile,.px-sv';
  Array.prototype.forEach.call(d.querySelectorAll(CARDS), function (c) {
    c.classList.add('fx-spot', 'fx-crop');
    if (!c.querySelector(':scope > .fx-cm')) { var m = d.createElement('span'); m.className = 'fx-cm'; m.setAttribute('aria-hidden', 'true'); c.appendChild(m); }
  });
  if (!reduce && mm('(hover: hover)')) {
    d.addEventListener('pointermove', function (e) {
      var c = e.target && e.target.closest ? e.target.closest('.fx-spot') : null; if (!c) return;
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
  if (reduce || !('IntersectionObserver' in window)) return;
  var els = d.querySelectorAll('.px-head,.pcard,.px-cat,.px-find li,.px-bst,.px-sv,.px-rev,.cg-formats,.cg-papers,.hc-card,.az-g,.pf-in');
  if (!els.length) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  Array.prototype.forEach.call(els, function (el) {
    var i = 0, s = el; while ((s = s.previousElementSibling) && i < 8) i++;
    el.style.setProperty('--d', (i % 6) * 70 + 'ms'); el.classList.add('rv'); io.observe(el);
  });
  de.classList.add('fx');
  // filet de sécurité : si un élément n'a pas été révélé (onglet en arrière-plan, impression…), tout s'affiche après 4 s
  setTimeout(function () { Array.prototype.forEach.call(d.querySelectorAll('.rv:not(.in)'), function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); }); }, 4000);
  window.addEventListener('beforeprint', function () { Array.prototype.forEach.call(d.querySelectorAll('.rv'), function (el) { el.classList.add('in'); }); });
})();
