/* Symo Print — araignée 3D de l'accueil (décoration facultative).
 * Ce petit script décide SI et QUAND charger l'effet (silk-spider.js, ≈ 170 Ko compressé) :
 *  - seulement sur ordinateur (souris + écran ≥ 1025 px), jamais avec « réduire les animations », « économiser les données » ou peu de mémoire ;
 *  - seulement après le chargement complet de la page, au repos du navigateur : l'araignée ne ralentit jamais l'affichage ;
 *  - le visiteur peut l'arrêter (bouton en bas à gauche) ; son choix est mémorisé dans son navigateur (rien n'est envoyé au serveur).
 * Configuration (adresses des fichiers, éléments où la soie s'accroche) : bloc JSON #spider-cfg de la page d'accueil.
 */
(function () {
  'use strict';
  var d = document, w = window;
  var cfgEl = d.getElementById('spider-cfg');
  if (!cfgEl) return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent || ''); } catch (e) { return; }
  if (!cfg || !cfg.script || !cfg.model) return;

  var KEY = 'symo-spider';
  var mq = function (q) { return !!(w.matchMedia && w.matchMedia(q).matches); };
  var saved = function () { try { return w.localStorage.getItem(KEY); } catch (e) { return null; } };
  var save = function (v) { try { w.localStorage.setItem(KEY, v); } catch (e) { /* navigateur en navigation privée : tant pis */ } };

  var capable = function () {
    var c = navigator.connection;
    return !mq('(prefers-reduced-motion: reduce)')
      && mq('(hover: hover) and (pointer: fine)')
      && w.innerWidth >= 1025
      && !(c && c.saveData)
      && !(navigator.deviceMemory && navigator.deviceMemory < 4);
  };

  var wanted = saved() !== 'off'; // l'araignée est activée par défaut
  var inst = null, loading = false, ready = false, btn = null;

  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    + '<ellipse cx="12" cy="13.5" rx="3.3" ry="4.2" fill="currentColor" stroke="none"/><circle cx="12" cy="8.6" r="2" fill="currentColor" stroke="none"/>'
    + '<path d="M9 11.2 4.5 8.5 2.5 10.5M8.8 13.6 3.5 13.8 2 16.5M9.3 16 5 19.5 3.5 21.5M9.6 9.6 6.5 5.5 5 4M15 11.2l4.5-2.7 2 2M15.2 13.6l5.3.2L22 16.5M14.7 16l4.3 3.5 1.5 2M14.4 9.6l3.1-4.1L19 4"/></svg>';

  function mount() {
    if (inst || !w.SilkSpider) return;
    inst = w.SilkSpider.mount({
      modelSrc: cfg.model, topTextureSrc: cfg.top, faceTextureSrc: cfg.face,
      anchorSelector: cfg.anchors || '[data-silk-anchor]',
      className: 'spider-layer', // pour le masquer à l'impression (voir site.css)
      zIndex: 45,            // au-dessus du contenu, sous la zone de recherche, les menus, l'en-tête et la visionneuse
      size: 220,             // envergure des pattes en pixels (un peu plus discrète que la taille par défaut, ≈ 280 px)
      maxDpr: 1.5,           // économise la carte graphique
      seedWebs: 5,           // quelques fils déjà tendus à l'arrivée
      silkColor: cfg.silk || '#5f8f9a',
      bounceColor: cfg.bounce || '#f2f6f7',
      shadowColor: cfg.shadow || '#0a2a33',
      fly: true
    });
  }

  function load() {
    if (w.SilkSpider) { ready = true; mount(); return; }
    if (loading) return;
    loading = true;
    var s = d.createElement('script');
    s.src = cfg.script; s.async = true;
    s.onload = function () { loading = false; ready = !!w.SilkSpider; if (wanted && capable()) mount(); };
    s.onerror = function () { loading = false; };
    d.head.appendChild(s);
  }

  function stop() { if (inst) { try { inst(); } catch (e) { /* déjà retirée */ } inst = null; } }

  function paint() {
    if (!btn) return;
    btn.setAttribute('aria-pressed', wanted ? 'true' : 'false');
    var t = wanted ? "Arrêter l'araignée animée" : "Réactiver l'araignée animée";
    btn.setAttribute('aria-label', t); btn.title = t;
    btn.classList.toggle('off', !wanted);
  }

  function sync() {
    var ok = capable();
    if (btn) btn.hidden = !ok;
    if (wanted && ok) { if (ready) mount(); else load(); } else stop();
  }

  function makeButton() {
    btn = d.createElement('button');
    btn.type = 'button'; btn.className = 'spider-toggle'; btn.innerHTML = ICON;
    btn.addEventListener('click', function () {
      wanted = !wanted; save(wanted ? 'on' : 'off'); paint(); sync();
    });
    d.body.appendChild(btn); paint();
  }

  var started = false; // rien ne se charge avant la fin du chargement de la page
  var begin = function () {
    started = true;
    if (!btn && capable()) makeButton();
    sync();
  };

  var after = function () {
    if (w.requestIdleCallback) w.requestIdleCallback(begin, { timeout: 3000 }); else w.setTimeout(begin, 1500);
  };
  if (d.readyState === 'complete') after(); else w.addEventListener('load', after, { once: true });

  // préférences ou taille d'écran qui changent après coup
  var timer = 0;
  var again = function () {
    w.clearTimeout(timer);
    timer = w.setTimeout(function () {
      if (!started) return;
      if (!btn && capable()) makeButton();
      sync();
    }, 200);
  };
  w.addEventListener('resize', again);
  ['(prefers-reduced-motion: reduce)', '(hover: hover) and (pointer: fine)'].forEach(function (q) {
    var m = w.matchMedia && w.matchMedia(q);
    if (m && m.addEventListener) m.addEventListener('change', again);
  });
})();
