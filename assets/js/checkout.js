(function () {
  'use strict'; var SP = window.SP, $ = SP.$, $$ = SP.$$, f = $('#checkout'); if (!f) return;
  var zones = {}; try { zones = JSON.parse($('#zones').textContent); } catch (e) {}
  function sync() {
    var m = (f.querySelector('input[name=delivery_method]:checked') || {}).value || 'delivery', z = +$('#zone').value;
    $('#deliv').hidden = m === 'pickup'; $('#zareas').textContent = m === 'delivery' && zones[z] ? 'Zones : ' + zones[z] : '';
    SP.api('/api/livraison', { method: m, zone: z }).then(function (r) { if (!r.ok) return; $('#s-ship').textContent = r.fee_fmt; $('#s-total').textContent = r.total_fmt; var t = $('#s-tax'); if (t) t.textContent = r.tax_fmt; });
  }
  f.addEventListener('change', function (e) { if (e.target.name === 'delivery_method' || e.target.id === 'zone') sync(); });
  var c = $('#cacc'); if (c) { var upd = function () { $('#accpw').hidden = !c.checked; }; c.addEventListener('change', upd); upd(); }
  sync();
})();
