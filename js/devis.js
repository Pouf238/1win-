/* Symo Print — formulaire de devis en 3 étapes */
(function () {
  'use strict';
  var form = document.getElementById('devis-form');
  if (!form) return;
  var CAT = window.SYMO_CATALOGUE || {};
  var steps = [].slice.call(form.querySelectorAll('.stepbox'));
  var prog = [].slice.call(document.querySelectorAll('.progress li'));
  var current = 0, files = [];
  var MAX_FILE = 8 * 1024 * 1024, MAX_TOTAL = 16 * 1024 * 1024, MAX_COUNT = 5;
  var OK_EXT = /\.(pdf|ai|eps|tiff?|psd|indd|svg|png|jpe?g|zip)$/i;
  form.querySelector('[name="ts"]').value = Date.now();

  function show(n) {
    current = n;
    steps.forEach(function (s, i) { s.classList.toggle('on', i === n); });
    prog.forEach(function (p, i) { p.classList.toggle('on', i === n); p.classList.toggle('done', i < n); });
    if (n === 2) recap();
    var top = form.closest('.panel').getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  /* Étape 1 : catégorie → produits */
  var sel = form.querySelector('#produit');
  function fillProducts(slug, wanted) {
    sel.innerHTML = '<option value="">Je ne sais pas encore / autre besoin</option>';
    ((CAT[slug] || {}).products || []).forEach(function (p) {
      var o = document.createElement('option'); o.value = p; o.textContent = p; if (wanted && wanted === p) o.selected = true; sel.appendChild(o);
    });
    sel.disabled = !slug;
  }
  [].forEach.call(form.querySelectorAll('input[name="categorie"]'), function (r) {
    r.addEventListener('change', function () { fillProducts(r.value); form.querySelector('#err-cat').hidden = true; });
  });

  /* Préremplissage depuis l'URL : ?cat=…&produit=… */
  var q = new URLSearchParams(location.search), qc = q.get('cat'), qp = q.get('produit');
  if (qc && CAT[qc]) {
    var r = form.querySelector('input[name="categorie"][value="' + qc + '"]');
    if (r) { r.checked = true; fillProducts(qc, qp); show(1); window.scrollTo(0, 0); }
  } else fillProducts('');

  /* Fichiers */
  var drop = form.querySelector('.drop'), input = form.querySelector('#fichiers-input'), list = form.querySelector('.flist');
  function renderFiles() {
    list.innerHTML = '';
    files.forEach(function (f, i) {
      var li = document.createElement('li');
      var s = document.createElement('span'); s.textContent = f.name + ' (' + (f.size / 1048576).toFixed(1).replace('.', ',') + ' Mo)';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Retirer'; b.addEventListener('click', function () { files.splice(i, 1); renderFiles(); });
      li.appendChild(s); li.appendChild(b); list.appendChild(li);
    });
  }
  function addFiles(fl) {
    var err = form.querySelector('#err-files'); err.hidden = true;
    [].forEach.call(fl, function (f) {
      var total = files.reduce(function (a, x) { return a + x.size; }, 0) + f.size;
      if (!OK_EXT.test(f.name)) { err.textContent = '« ' + f.name + ' » : format non accepté (PDF, AI, EPS, TIFF, PSD, INDD, SVG, PNG, JPG, ZIP).'; err.hidden = false; }
      else if (f.size > MAX_FILE) { err.textContent = '« ' + f.name + ' » dépasse 8 Mo. Envoyez-nous un lien de téléchargement dans le message.'; err.hidden = false; }
      else if (total > MAX_TOTAL || files.length >= MAX_COUNT) { err.textContent = 'Limite atteinte : 5 fichiers et 16 Mo au total.'; err.hidden = false; }
      else files.push(f);
    });
    renderFiles();
  }
  drop.addEventListener('click', function () { input.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

  /* Récapitulatif */
  function val(n) { var el = form.elements[n]; return el ? (el.value || '').trim() : ''; }
  function recap() {
    var c = form.querySelector('input[name="categorie"]:checked');
    var rows = [['Catégorie', c ? (CAT[c.value] || {}).label : '—'], ['Produit', val('produit') || 'À définir ensemble'], ['Quantité', val('quantite') || '—'], ['Délai souhaité', val('delai')]];
    if (files.length) rows.push(['Fichiers joints', files.length + '']);
    var dl = form.querySelector('.recap dl'); dl.innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'), a = document.createElement('dt'), b = document.createElement('dd'); a.textContent = r[0]; b.textContent = r[1]; d.appendChild(a); d.appendChild(b); dl.appendChild(d); });
  }

  /* Navigation */
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    var dir = b.getAttribute('data-go');
    if (dir === 'prev') return show(Math.max(0, current - 1));
    if (current === 0) {
      if (!form.querySelector('input[name="categorie"]:checked')) { form.querySelector('#err-cat').hidden = false; return; }
      return show(1);
    }
    if (current === 1) { if (SymoForm.validate(steps[1])) show(2); }
  });

  /* Envoi */
  var note = document.getElementById('devis-notice');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (current !== 2 || !SymoForm.validate(steps[2])) return;
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
    SymoForm.send(form, function (fd) {
      fd.delete('fichiers_input');
      files.forEach(function (f) { fd.append('fichiers[]', f, f.name); });
    }).then(function (res) {
      if (res.ok) {
        form.hidden = true; document.querySelector('.progress').hidden = true;
        var ok = document.getElementById('devis-ok'); ok.hidden = false;
        window.scrollTo({ top: ok.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
      } else {
        note.className = 'notice ko show'; note.textContent = res.error || 'Une erreur est survenue.';
        btn.disabled = false; btn.textContent = 'Envoyer ma demande de devis';
      }
    });
  });
})();
