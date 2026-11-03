/* Symo Print — administration : constructeurs de tarifs / options / délais, lignes de devis. */
(function () {
  'use strict';
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  function el(tag, attrs, html) { var e = d.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (html) e.innerHTML = html; return e; }
  function inp(val, ph, type, step) { var i = el('input', { type: type || 'text', placeholder: ph || '' }); i.value = val == null ? '' : val; if (step) i.step = step; return i; }
  function sel(opts, val) { var s = el('select'); Object.keys(opts).forEach(function (k) { var o = el('option', { value: k }); o.textContent = opts[k]; if (k === String(val)) o.selected = true; s.appendChild(o); }); return s; }
  function xbtn(fn) { var b = el('button', { type: 'button', 'class': 'xbtn', 'aria-label': 'Retirer' }, '×'); b.addEventListener('click', fn); return b; }

  // cases « tout sélectionner », confirmations, bascule du mode de calcul
  $$('[data-checkall]').forEach(function (c) { c.addEventListener('change', function () { $$('input[name="ids[]"]').forEach(function (i) { i.checked = c.checked; }); }); });
  var pm = $('select[name=pricing_model]'); if (pm) pm.addEventListener('change', function () { $('#m-tiers').hidden = pm.value === 'area'; $('#m-area').hidden = pm.value !== 'area'; });

  // ----- constructeur générique
  function Builder(host) {
    var kind = host.getAttribute('data-builder'), hidden = d.getElementById(host.getAttribute('data-target')), data;
    try { data = JSON.parse(hidden.value || '[]'); } catch (e) { data = []; }
    function save() { hidden.value = JSON.stringify(data); var raw = $('#groups_raw'); if (kind === 'groups' && raw) raw.value = JSON.stringify(data, null, 1); }
    function rowGrid(cols) { var r = el('div', { 'class': 'tier-row' }); r.style.gridTemplateColumns = cols; return r; }

    function renderTiers(isArea) {
      host.innerHTML = ''; var head = el('div', { 'class': 'tier-row' }); head.style.fontWeight = '700'; head.innerHTML = '<span>À partir de (quantité)</span><span>' + (isArea ? 'Coefficient (1 = prix normal, 0,9 = -10 %)' : 'Prix unitaire (FCFA)') + '</span><span></span>'; host.appendChild(head);
      data.forEach(function (t, i) { var r = el('div', { 'class': 'tier-row' }), a = inp(t[0], '', 'number'), b = inp(t[1], '', 'number', isArea ? '0.01' : '1'); a.addEventListener('input', function () { t[0] = +a.value; save(); }); b.addEventListener('input', function () { t[1] = +b.value; save(); }); r.appendChild(a); r.appendChild(b); r.appendChild(xbtn(function () { data.splice(i, 1); renderTiers(isArea); save(); })); host.appendChild(r); });
      var add = el('button', { type: 'button', 'class': 'btn btn-g btn-sm' }, '+ Ajouter un palier'); add.addEventListener('click', function () { var last = data[data.length - 1] || [0, isArea ? 1 : 0]; data.push([last[0] + 1, last[1]]); renderTiers(isArea); save(); }); host.appendChild(add);
    }
    function renderDelays() {
      host.innerHTML = ''; data.forEach(function (x, i) {
        var r = el('div', { 'class': 'ch-row' }); r.style.gridTemplateColumns = '1.4fr 1fr 90px 90px 110px 40px'; x.days = x.days || [3, 5];
        var lab = inp(x.label, 'Libellé'), key = inp(x.key, 'clé (auto)'), d1 = inp(x.days[0], 'min', 'number'), d2 = inp(x.days[1], 'max', 'number'), pc = inp(x.percent || 0, '% majoration', 'number', '1');
        lab.addEventListener('input', function () { x.label = lab.value; if (!x.key || x.key === x._auto) { x._auto = lab.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'); x.key = x._auto; key.value = x.key; } save(); }); key.addEventListener('input', function () { x.key = key.value; save(); });
        d1.addEventListener('input', function () { x.days[0] = +d1.value; save(); }); d2.addEventListener('input', function () { x.days[1] = +d2.value; save(); }); pc.addEventListener('input', function () { x.percent = +pc.value; save(); });
        [lab, key, d1, d2, pc].forEach(function (n) { r.appendChild(n); }); r.appendChild(xbtn(function () { data.splice(i, 1); renderDelays(); save(); })); host.appendChild(r); });
      var h = el('div', { 'class': 'muted' }, 'Colonnes : libellé · clé · jours min · jours max · majoration %'); host.insertBefore(h, host.firstChild);
      var add = el('button', { type: 'button', 'class': 'btn btn-g btn-sm' }, '+ Ajouter un délai'); add.addEventListener('click', function () { data.push({ key: 'delai-' + (data.length + 1), label: 'Nouveau délai', days: [2, 3], percent: 0 }); renderDelays(); save(); }); host.appendChild(add);
    }
    function renderGroups() {
      host.innerHTML = '';
      data.forEach(function (g, gi) {
        g.choices = g.choices || []; var box = el('div', { 'class': 'bldr' }), h = el('div', { 'class': 'h' });
        var lab = inp(g.label, 'Question (ex. Format)'), key = inp(g.key, 'clé'), type = sel({ radio: 'Boutons', select: 'Liste déroulante', checkbox: 'Cases à cocher', text: 'Texte libre' }, g.type || 'radio'), req = el('label', { 'class': 'chk' }, '<input type="checkbox"> <span>Obligatoire</span>'), si = inp(g.show_if ? JSON.stringify(g.show_if) : '', 'afficher si (JSON, ex. {"faces":["rv"]})');
        lab.style.fontWeight = '700'; lab.style.minWidth = '220px'; si.style.minWidth = '260px'; req.firstChild.checked = !!g.required;
        lab.addEventListener('input', function () { g.label = lab.value; if (!g.key || g._auto === g.key) { g._auto = lab.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); g.key = g._auto; key.value = g.key; } save(); }); key.addEventListener('input', function () { g.key = key.value; save(); });
        type.addEventListener('change', function () { g.type = type.value; save(); }); req.firstChild.addEventListener('change', function () { g.required = req.firstChild.checked; save(); });
        si.addEventListener('input', function () { try { g.show_if = si.value.trim() ? JSON.parse(si.value) : null; si.style.borderColor = ''; } catch (e) { si.style.borderColor = 'var(--bad)'; } save(); });
        [lab, key, type, req, si].forEach(function (n) { h.appendChild(n); });
        var up = el('button', { type: 'button', 'class': 'btn btn-g btn-sm' }, '↑'), dn = el('button', { type: 'button', 'class': 'btn btn-g btn-sm' }, '↓'), rm = el('button', { type: 'button', 'class': 'btn btn-d btn-sm' }, 'Supprimer le groupe');
        up.addEventListener('click', function () { if (gi > 0) { data.splice(gi - 1, 0, data.splice(gi, 1)[0]); renderGroups(); save(); } }); dn.addEventListener('click', function () { if (gi < data.length - 1) { data.splice(gi + 1, 0, data.splice(gi, 1)[0]); renderGroups(); save(); } }); rm.addEventListener('click', function () { if (confirm('Supprimer ce groupe d\'options ?')) { data.splice(gi, 1); renderGroups(); save(); } });
        h.appendChild(up); h.appendChild(dn); h.appendChild(rm); box.appendChild(h);
        var hd = el('div', { 'class': 'ch-row muted' }); hd.style.fontSize = '12px'; hd.innerHTML = '<span>Choix</span><span>Clé · description</span><span>Impact prix</span><span>Valeur</span><span>Badge</span><span>Défaut</span>'; box.appendChild(hd);
        g.choices.forEach(function (c, ci) {
          c.price = c.price || { mode: 'fixed', value: 0 }; var r = el('div', { 'class': 'ch-row' }), cl = inp(c.label, 'Libellé du choix'), ck = inp(c.key, 'clé'), mode = sel({ fixed: 'Fixe (par commande)', per_unit: 'Par unité', percent: '% du prix de base', per_m2: 'Par m²' }, c.price.mode), val = inp(c.price.value, '0', 'number', 'any'), bd = inp(c.badge || '', 'Badge'), df = el('label', { 'class': 'chk' }, '<input type="radio" name="def' + gi + '"> <span></span>');
          df.firstChild.checked = g.default === c.key; cl.addEventListener('input', function () { c.label = cl.value; if (!c.key || c._auto === c.key) { c._auto = cl.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); c.key = c._auto; ck.value = c.key; } save(); });
          ck.addEventListener('input', function () { c.key = ck.value; save(); }); mode.addEventListener('change', function () { c.price.mode = mode.value; save(); }); val.addEventListener('input', function () { c.price.value = +val.value; save(); }); bd.addEventListener('input', function () { c.badge = bd.value; save(); });
          df.firstChild.addEventListener('change', function () { g.default = c.key; save(); });
          [cl, ck, mode, val, bd, df].forEach(function (n) { r.appendChild(n); }); var x = xbtn(function () { g.choices.splice(ci, 1); renderGroups(); save(); }); r.appendChild(x); r.style.gridTemplateColumns = '1.3fr 1fr 150px 100px 100px 70px 34px'; box.appendChild(r);
        });
        var addc = el('button', { type: 'button', 'class': 'btn btn-g btn-sm' }, '+ Ajouter un choix'); addc.addEventListener('click', function () { g.choices.push({ key: '', label: '', price: { mode: 'fixed', value: 0 } }); renderGroups(); save(); }); box.appendChild(addc); host.appendChild(box);
      });
      var addg = el('button', { type: 'button', 'class': 'btn btn-o' }, '+ Ajouter un groupe d\'options'); addg.addEventListener('click', function () { data.push({ key: '', label: '', type: 'radio', required: true, default: null, help: '', show_if: null, choices: [{ key: '', label: '', price: { mode: 'fixed', value: 0 } }] }); renderGroups(); save(); }); host.appendChild(addg);
    }
    if (kind === 'tiers') renderTiers(false); else if (kind === 'atiers') renderTiers(true); else if (kind === 'delays') renderDelays(); else if (kind === 'groups') { renderGroups(); var raw = $('#groups_raw'); if (raw) { raw.value = JSON.stringify(data, null, 1); $('#groups_apply').addEventListener('click', function () { try { data = JSON.parse(raw.value); renderGroups(); save(); } catch (e) { alert('JSON invalide : ' + e.message); } }); } }
    save();
  }
  $$('[data-builder]').forEach(Builder);

  // ----- lignes de devis
  var tb = $('#qlines tbody'); if (tb) {
    var fmt = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; };
    function total() { var m = +($('[name=margin_pct]').value || 0), t = 0; $$('tr', tb).forEach(function (r) { var q = +r.querySelector('[name="l_qty[]"]').value || 0, u = +r.querySelector('[name="l_unit[]"]').value || 0, fu = Math.round(u * (100 + m) / 100 / 5) * 5, lt = q * fu; t += lt; r.querySelector('.l-tot').textContent = fmt(lt); }); $('#qtotal').textContent = fmt(t); }
    tb.addEventListener('input', total); $('[name=margin_pct]').addEventListener('input', total);
    tb.addEventListener('click', function (e) { if (e.target.hasAttribute('data-rm')) { e.target.closest('tr').remove(); total(); } });
    $('#addline').addEventListener('click', function () { var r = el('tr', {}, '<td><input class="inp" name="l_desc[]"></td><td><input class="inp" name="l_sub[]"></td><td><input class="inp" type="number" min="1" name="l_qty[]" value="1"></td><td><input class="inp" type="number" min="0" name="l_unit[]" value="0"></td><td class="right l-tot"></td><td><button type="button" class="xbtn" data-rm>×</button></td>'); tb.appendChild(r); total(); });
    total();
  }
})();
