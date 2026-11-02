/* Symo Print — scripts communs (aucune dépendance, aucun cookie, aucun traceur) */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');

  /* En-tête : ombre au scroll */
  var header = d.querySelector('.header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* Menu mobile */
  var burger = d.querySelector('.burger'), nav = d.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { burger.click(); burger.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && nav.classList.contains('open')) burger.click(); });
  }

  /* Apparition au scroll */
  var items = [].slice.call(d.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('in'); }); }

  /* Sous-navigation des pages de services : lien actif */
  var sub = [].slice.call(d.querySelectorAll('.subnav a'));
  if (sub.length && 'IntersectionObserver' in window) {
    var map = {};
    sub.forEach(function (a) { var s = d.querySelector(a.getAttribute('href')); if (s) map[s.id] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { sub.forEach(function (a) { a.classList.remove('on'); }); if (map[e.target.id]) map[e.target.id].classList.add('on'); }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { so.observe(d.getElementById(id)); });
  }

  /* Envoi AJAX d'un formulaire vers envoyer.php */
  window.SymoForm = {
    send: function (form, extra) {
      var fd = new FormData(form);
      if (extra) extra(fd);
      return fetch(form.getAttribute('action') || '/envoyer.php', {
        method: 'POST', body: fd, headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
      }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Réponse inattendue du serveur.' }; }); })
        .catch(function () { return { ok: false, error: 'Connexion impossible. Vérifiez votre réseau ou appelez-nous.' }; });
    },
    validate: function (form) {
      var ok = true, first = null;
      [].forEach.call(form.querySelectorAll('[required]'), function (el) {
        var f = el.closest('.field') || el.closest('.check'), bad = false;
        if (el.type === 'checkbox') bad = !el.checked;
        else if (el.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
        else bad = !el.value.trim();
        if (f) f.classList.toggle('invalid', bad);
        if (bad) { ok = false; if (!first) first = el; }
      });
      if (first) first.focus();
      return ok;
    }
  };

  /* Formulaire de contact */
  var cf = d.getElementById('contact-form');
  if (cf) {
    var ts = cf.querySelector('[name="ts"]'); if (ts) ts.value = Date.now();
    var msg = cf.querySelector('textarea'), cnt = d.getElementById('count');
    if (msg && cnt) msg.addEventListener('input', function () { cnt.textContent = msg.value.length; });
    var note = d.getElementById('contact-notice');
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!SymoForm.validate(cf)) return;
      var btn = cf.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
      SymoForm.send(cf).then(function (res) {
        if (res.ok) {
          cf.hidden = true; d.getElementById('contact-ok').hidden = false;
          d.getElementById('contact-ok').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          note.className = 'notice ko show'; note.textContent = res.error || 'Une erreur est survenue.';
          btn.disabled = false; btn.textContent = 'Envoyer mon message';
        }
      });
    });
  }
})();
