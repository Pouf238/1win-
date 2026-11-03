/* Formulaire de devis : n'affiche que les précisions du type de prestation choisi (sans JavaScript, tous les champs restent visibles). */
(function () {
  'use strict';
  var sel = document.getElementById('svc'); if (!sel) return;
  var sets = [].slice.call(document.querySelectorAll('.svc-fields'));
  function sync() { sets.forEach(function (fs) { var on = fs.getAttribute('data-service') === sel.value; fs.hidden = !on; [].forEach.call(fs.querySelectorAll('input,select'), function (i) { i.disabled = !on; }); }); }
  sel.addEventListener('change', sync); sync();
})();
