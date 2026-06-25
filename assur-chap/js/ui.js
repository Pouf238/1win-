/* ==========================================================================
   Assur Chap — Helpers UI partagés : thème, icônes, toast, modal, format
   ========================================================================== */
(function (global) {
  "use strict";

  /* ---- Inline SVG icons (stroke = currentColor) ---- */
  var P = 'stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    shield: '<path '+P+' d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
    car: '<path '+P+' d="M5 11l1.5-4A2 2 0 018.4 6h7.2a2 2 0 011.9 1.4L19 11M5 11h14v5H5v-5zm0 0v0M5 16v2m14-2v2"/><circle cx="8" cy="13.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="13.5" r="1.1" fill="currentColor" stroke="none"/>',
    bolt: '<path '+P+' d="M13 3L5 13h6l-1 8 8-10h-6l1-8z"/>',
    check: '<path '+P+' d="M5 12.5l4.5 4.5L19 7"/>',
    checkCircle: '<circle cx="12" cy="12" r="9" '+P+'/><path '+P+' d="M8.5 12.2l2.4 2.4L16 9.5"/>',
    file: '<path '+P+' d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path '+P+' d="M14 3v5h5M9 13h6M9 17h6"/>',
    bell: '<path '+P+' d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 01-3.4 0"/>',
    user: '<circle cx="12" cy="8" r="4" '+P+'/><path '+P+' d="M4 20c0-3.3 3.6-5 8-5s8 1.7 8 5"/>',
    users: '<circle cx="9" cy="8" r="3.4" '+P+'/><path '+P+' d="M3 20c0-3 2.7-4.6 6-4.6S15 17 15 20M16 5.2a3.4 3.4 0 010 6.4M21 20c0-2.4-1.7-3.9-4-4.4"/>',
    plus: '<path '+P+' d="M12 5v14M5 12h14"/>',
    chevron: '<path '+P+' d="M9 6l6 6-6 6"/>',
    chevronDown: '<path '+P+' d="M6 9l6 6 6-6"/>',
    arrowRight: '<path '+P+' d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path '+P+' d="M19 12H5M11 6l-6 6 6 6"/>',
    home: '<path '+P+' d="M4 11l8-7 8 7M6 10v9h12v-9"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" '+P+'/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" '+P+'/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" '+P+'/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" '+P+'/>',
    chart: '<path '+P+' d="M4 20h16M7 16v-4m5 4V8m5 8v-7"/>',
    gift: '<path '+P+' d="M20 12v8H4v-8M2 8h20v4H2V8zm10 0v12M12 8S10.5 3.5 7.5 5 12 8 12 8zm0 0s1.5-4.5 4.5-3S12 8 12 8z"/>',
    wallet: '<path '+P+' d="M3 7a2 2 0 012-2h12a2 2 0 012 2v0H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2"/><circle cx="17" cy="13" r="1.3" fill="currentColor" stroke="none"/>',
    camera: '<path '+P+' d="M4 8a2 2 0 012-2h1.5l1-2h5l1 2H20a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8z"/><circle cx="12" cy="13" r="3.2" '+P+'/>',
    robot: '<rect x="5" y="8" width="14" height="10" rx="2.5" '+P+'/><path '+P+' d="M12 5v3M9 18v2m6-2v2M2.5 12.5v2m19-2v2"/><circle cx="9.5" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.1" fill="currentColor" stroke="none"/>',
    sun: '<circle cx="12" cy="12" r="4" '+P+'/><path '+P+' d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path '+P+' d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z"/>',
    logout: '<path '+P+' d="M15 12H4m7-4l-4 4 4 4M9 4h7a2 2 0 012 2v12a2 2 0 01-2 2H9"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1" '+P+'/><rect x="14" y="4" width="6" height="6" rx="1" '+P+'/><rect x="4" y="14" width="6" height="6" rx="1" '+P+'/><path '+P+' d="M14 14h2v2m4-2v6m-6 0h2m2-2h2"/>',
    map: '<path '+P+' d="M9 4l6 2 6-2v14l-6 2-6-2-6 2V6l6-2zm0 0v14m6-12v14"/>',
    phone: '<path '+P+' d="M5 4h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" '+P+'/><path '+P+' d="M4 7l8 6 8-6"/>',
    whatsapp: '<path '+P+' d="M4 20l1.4-4.2A8 8 0 1112 20a8 8 0 01-4.2-1.1L4 20z"/><path '+P+' d="M9 9.5c0 3 2.5 5 4.5 5 .8 0 1.3-.6 1-1.3l-1-1-1 .6c-.8-.3-1.6-1.1-1.9-1.9l.6-1-.9-1c-.7-.3-1.3.2-1.3.9z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2" '+P+'/><path '+P+' d="M8 11V8a4 4 0 018 0v3"/>',
    search: '<circle cx="11" cy="11" r="6" '+P+'/><path '+P+' d="M20 20l-3.5-3.5"/>',
    download: '<path '+P+' d="M12 4v10m-4-4l4 4 4-4M5 19h14"/>',
    clock: '<circle cx="12" cy="12" r="9" '+P+'/><path '+P+' d="M12 7v5l3.5 2"/>',
    star: '<path '+P+' d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5z"/>',
    settings: '<circle cx="12" cy="12" r="3" '+P+'/><path '+P+' d="M19.4 13.5a7.9 7.9 0 000-3l1.8-1.3-1.8-3.1-2.1.8a8 8 0 00-2.6-1.5L14.2 2H9.8l-.5 2.4A8 8 0 006.7 6l-2.1-.8-1.8 3.1L4.6 9.5a7.9 7.9 0 000 3l-1.8 1.3 1.8 3.1 2.1-.8a8 8 0 002.6 1.5l.5 2.4h4.4l.5-2.4a8 8 0 002.6-1.5l2.1.8 1.8-3.1-1.8-1.3z"/>',
    warning: '<path '+P+' d="M12 4l9 16H3l9-16zM12 10v4m0 3h.01"/>',
    x: '<path '+P+' d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path '+P+' d="M4 7h16M4 12h16M4 17h16"/>',
    globe: '<circle cx="12" cy="12" r="9" '+P+'/><path '+P+' d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18-2.5-3-2.5-15.5 0-18z"/>',
    refresh: '<path '+P+' d="M4 12a8 8 0 0114-5l2 2m0-4v4h-4M20 12a8 8 0 01-14 5l-2-2m0 4v-4h4"/>',
    location: '<path '+P+' d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5" '+P+'/>',
    headset: '<path '+P+' d="M4 13v-1a8 8 0 0116 0v1M4 13a2 2 0 012 2v2a2 2 0 01-2 2 2 2 0 01-2-2v-2a2 2 0 012-2zm16 0a2 2 0 00-2 2v2a2 2 0 002 2 2 2 0 002-2v-2a2 2 0 00-2-2zM18 19a4 4 0 01-4 3h-2"/>'
  };

  function icon(name, size, cls) {
    var body = ICONS[name] || ICONS.shield;
    var s = size || 22;
    return '<svg class="ic'+(cls ? ' '+cls : '')+'" viewBox="0 0 24 24" width="'+s+'" height="'+s+'" aria-hidden="true">'+body+'</svg>';
  }

  /* ---- Theme ---- */
  var Theme = {
    get: function () { return localStorage.getItem('ac_theme') || 'light'; },
    set: function (t) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('ac_theme', t);
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', t === 'dark' ? '#0c1416' : '#1F7A8C');
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); return this.get(); },
    init: function () { this.set(this.get()); }
  };

  /* ---- Toast ---- */
  function toast(msg, type) {
    type = type || 'info';
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    var el = document.createElement('div');
    el.className = 'toast ' + (type === 'success' ? 'ok' : type === 'error' ? 'err' : 'info');
    var ic = type === 'error' ? 'warning' : type === 'success' ? 'checkCircle' : 'bell';
    el.innerHTML = icon(ic, 22) + '<span>' + msg + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(function () { el.remove(); }, 250); }, 3400);
  }

  /* ---- Modal ---- */
  function modal(opts) {
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><div class="row-between"><h3 style="font-size:1.15rem">' + (opts.title || '') + '</h3>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Fermer">' + icon('x', 18) + '</button></div></div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') +
      '</div>';
    document.body.appendChild(bd);
    function close() { bd.remove(); if (opts.onClose) opts.onClose(); }
    bd.addEventListener('click', function (e) { if (e.target === bd || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    if (opts.onMount) opts.onMount(bd, close);
    return { el: bd, close: close };
  }

  /* ---- Format helpers ---- */
  function fcfa(n) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  }
  function fdate(d, opts) {
    var dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleDateString(I18N ? I18N.locale() : 'fr-FR', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function daysBetween(a, b) {
    return Math.ceil((new Date(b) - new Date(a)) / 86400000);
  }
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function copy(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function(){ toast('Copié dans le presse-papier', 'success'); }); }
  }

  global.UI = { icon: icon, ICONS: ICONS, Theme: Theme, toast: toast, modal: modal, fcfa: fcfa, fdate: fdate, daysBetween: daysBetween, uid: uid, escapeHtml: escapeHtml, copy: copy };
})(window);
