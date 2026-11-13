/* Symo Print — centre d'aide : recherche instantanée dans les questions (accents ignorés). Sans JavaScript, toutes les questions restent affichées. */
(function () {
  'use strict';
  var d = document, form = d.querySelector('[data-help-search]'); if (!form) return;
  var inp = form.querySelector('input'), none = d.querySelector('[data-help-none]');
  var qs = [].slice.call(d.querySelectorAll('[data-help-q]')), themes = [].slice.call(d.querySelectorAll('[data-help-theme]'));
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var texts = qs.map(function (q) { return norm(q.textContent); });
  function run() {
    var words = norm(inp.value).split(/\s+/).filter(function (w) { return w.length > 1; }), shown = 0;
    qs.forEach(function (q, i) { var ok = words.every(function (w) { return texts[i].indexOf(w) !== -1; }); q.hidden = !ok; if (ok) shown++; if (words.length && ok) q.open = true; else if (!words.length) q.open = false; });
    themes.forEach(function (t) { t.hidden = !t.querySelector('[data-help-q]:not([hidden])'); });
    if (none) none.hidden = shown > 0;
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
  inp.addEventListener('input', run); if (inp.value) run();
})();
