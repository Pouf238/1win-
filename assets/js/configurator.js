/* Symo Print — configurateur produit : le prix est TOUJOURS calculé par le serveur. */
(function () {
  'use strict';
  var el = document.getElementById('pcfg'); if (!el) return;
  var C = JSON.parse(el.textContent), SP = window.SP, $ = SP.$, $$ = SP.$$, form = $('#cfg'), files = [], last = null, timer, seq = 0;

  function state() {
    var o = {}, fd = new FormData(form);
    $$('input[name^="opt["], select[name^="opt["], textarea[name^="opt["]', form).forEach(function (i) {
      if (i.disabled) return; var m = i.name.match(/^opt\[([^\]]+)\](\[\])?$/); if (!m) return; var k = m[1];
      if (i.type === 'checkbox') { if (i.checked) (o[k] = o[k] || []).push(i.value); else o[k] = o[k] || []; }
      else if (i.type === 'radio') { if (i.checked) o[k] = i.value; }
      else o[k] = i.value;
    });
    var dl = form.querySelector('input[name="delay"]:checked');
    return { product_id: C.id, qty: +($('#qty').value || 0), opts: o, w: C.area ? +$('#w').value : null, h: C.area ? +$('#h').value : null, delay: dl ? dl.value : '', presets: true };
  }
  function visibility() {
    var s = state();
    $$('.og[data-showif]', form).forEach(function (g) {
      var rule; try { rule = JSON.parse(g.getAttribute('data-showif')); } catch (e) { rule = null; }
      var ok = true; if (rule) Object.keys(rule).forEach(function (k) { var v = s.opts[k]; v = Array.isArray(v) ? v : [v]; if (!v.some(function (x) { return rule[k].indexOf(x) > -1; })) ok = false; });
      g.hidden = !ok; $$('input,select,textarea', g).forEach(function (i) { i.disabled = !ok; });
    });
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function render(r) {
    last = r; if (!r.ok) return;
    $('#b-total').textContent = r.total_fmt; $('#m-total').textContent = r.total_fmt; $('#b-unit').textContent = r.unit_fmt;
    $('#b-lines').innerHTML = r.lines.map(function (l) { return '<div class="bl"><span>' + esc(l.label) + '</span><span>' + (l.amount < 0 ? '−' : '') + esc(l.fmt.replace('-', '')) + '</span></div>'; }).join('');
    $('#b-errors').innerHTML = (r.errors || []).map(function (e) { return '<div class="alert a-warn">' + esc(e) + '</div>'; }).join('');
    $('#b-from').textContent = r.delay.from; $('#b-to').textContent = r.delay.to;
    var q = $('#qty'); if (r.qty && +q.value !== r.qty && document.activeElement !== q) q.value = r.qty;
    var t = $('#qtable'); if (t && r.presets) { t.querySelector('tbody').innerHTML = r.presets.map(function (p) { return '<tr class="q' + (p.qty === r.qty ? ' on' : '') + '" data-qty="' + p.qty + '"><td>' + p.qty.toLocaleString('fr-FR') + '</td><td>' + esc(p.unit_fmt) + '</td><td>' + esc(p.total_fmt) + '</td></tr>'; }).join(''); }
  }
  function recalc() {
    visibility(); clearTimeout(timer); var my = ++seq;
    timer = setTimeout(function () { SP.api('/api/prix', state()).then(function (r) { if (my === seq) render(r); }); }, 220);
  }
  form.addEventListener('input', recalc); form.addEventListener('change', recalc);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  document.addEventListener('click', function (e) { var row = e.target.closest('#qtable tr.q'); if (row) { $('#qty').value = row.getAttribute('data-qty'); recalc(); } });
  visibility(); recalc();

  // ---- fichiers
  var drop = $('#drop'), inp = $('#fileinp'), list = $('#flist');
  function addRow(f) {
    var li = document.createElement('li'); li.innerHTML = '<span class="n"></span><span class="bar-p"><i></i></span><button class="x" type="button" aria-label="Retirer">✕</button>'; li.querySelector('.n').textContent = f.name + ' (' + (f.size / 1048576 < 1 ? Math.max(1, Math.round(f.size / 1024)) + ' Ko' : (f.size / 1048576).toFixed(1).replace('.', ',') + ' Mo') + ')'; list.appendChild(li); return li;
  }
  function upload(f) {
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (C.files.indexOf(ext) < 0) { alert('Format non accepté : .' + ext + '\nFormats acceptés : ' + C.files.join(', ').toUpperCase()); return; }
    if (f.size > C.maxmb * 1048576) { alert('Fichier trop volumineux (maximum ' + C.maxmb + ' Mo).'); return; }
    var li = addRow(f), bar = li.querySelector('i'), fd = new FormData(); fd.append('file', f);
    var x = new XMLHttpRequest(); x.open('POST', '/api/upload'); x.setRequestHeader('X-CSRF-Token', SP.csrf); x.setRequestHeader('Accept', 'application/json'); x.setRequestHeader('X-Requested-With', 'fetch');
    x.upload.onprogress = function (ev) { if (ev.lengthComputable) bar.style.width = Math.round(ev.loaded / ev.total * 100) + '%'; };
    x.onload = function () { var r; try { r = JSON.parse(x.responseText); } catch (e) { r = { ok: false, error: 'Erreur serveur.' }; }
      if (r.ok) { files.push(r.file.id); li.setAttribute('data-id', r.file.id); bar.style.width = '100%'; li.querySelector('.bar-p').outerHTML = '<span style="color:var(--ok);font-weight:700">✓ envoyé</span>'; }
      else { li.remove(); alert(r.error || "Échec de l'envoi."); } };
    x.onerror = function () { li.remove(); alert('Connexion impossible.'); }; x.send(fd);
  }
  if (drop) {
    inp.addEventListener('change', function () { [].forEach.call(inp.files, upload); inp.value = ''; });
    ['dragover', 'dragenter'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { [].forEach.call(e.dataTransfer.files, upload); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    list.addEventListener('click', function (e) { var b = e.target.closest('.x'); if (!b) return; var li = b.closest('li'), id = +li.getAttribute('data-id'); if (id) { files = files.filter(function (x) { return x !== id; }); SP.api('/api/upload/supprimer', { id: id }); } li.remove(); });
  }

  // ---- panier / devis
  function payload() { var s = state(); return { product_id: C.id, cfg: { qty: s.qty, opts: s.opts, w: s.w, h: s.h, delay: s.delay }, files: files, note: ($('textarea[name=note]', form) || {}).value || '' }; }
  function guard() { if (last && last.ok && !last.valid) { $('#b-errors').scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; } return true; }
  function addCart(btn) {
    if (!guard()) return; btn.disabled = true;
    SP.api('/panier/ajouter', payload()).then(function (r) { if (r.ok) { SP.setCart(r.count); location.href = '/panier'; } else { btn.disabled = false; alert(r.error || "Impossible d'ajouter au panier."); } });
  }
  $('#b-add').addEventListener('click', function () { addCart(this); }); $('#m-add').addEventListener('click', function () { addCart(this); });
  $('#b-quote').addEventListener('click', function () { if (!guard()) return; var b = this; b.disabled = true; SP.api('/devis/depuis-produit', payload()).then(function (r) { if (r.ok) location.href = r.url; else { b.disabled = false; alert(r.error || 'Erreur.'); } }); });
})();
