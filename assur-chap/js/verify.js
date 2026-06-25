/* ==========================================================================
   Assur Chap — Vérification publique de contrat
   (lit le store local en MVP ; en production : requête publique Supabase RPC)
   ========================================================================== */
(function () {
  "use strict";
  UI.Theme.init();
  Store.init();
  var I = UI.icon, esc = UI.escapeHtml;
  document.getElementById("lm").innerHTML = I("shield", 22);

  var params = new URLSearchParams(location.search);
  var preNum = params.get("n"), preTok = params.get("t");
  var form = document.getElementById("vForm");
  if (preNum) form.num.value = preNum;
  if (preTok) form.token.value = preTok;

  form.addEventListener("submit", function (e) { e.preventDefault(); verify(form.num.value.trim(), form.token.value.trim()); });
  if (preNum && preTok) verify(preNum, preTok);

  function verify(num, token) {
    var result = document.getElementById("result");
    result.innerHTML = '<div class="card"><div class="ocr-pending">' + I("refresh", 18) + ' Vérification en cours…</div></div>';
    setTimeout(function () {
      var c = Store.contractByNumber(num);
      var ok = c && c.verifyToken === (token || "").toUpperCase();
      if (!ok) { result.innerHTML = invalid(); return; }
      var valid = new Date(c.endDate) >= new Date();
      var v = Store.vehicle(c.vehicleId) || {};
      var u = (Store.db.users.filter(function (x) { return x.id === c.userId; })[0]) || {};
      result.innerHTML =
        '<div class="card card-pad-lg" style="border-color:' + (valid ? "var(--success)" : "var(--warning)") + '">' +
        '<div class="row" style="gap:13px;margin-bottom:16px"><span class="icon-tile lg" style="background:' + (valid ? "var(--success-bg)" : "var(--warning-bg)") + ';color:' + (valid ? "var(--success)" : "var(--warning)") + '">' + I(valid ? "checkCircle" : "clock", 26) + '</span>' +
        '<div><h2 style="font-size:1.3rem">' + (valid ? "Contrat valide ✓" : "Contrat expiré") + '</h2><div class="muted">N° ' + esc(c.number) + '</div></div></div>' +
        '<div class="doc-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        row("Assureur", esc(c.insurer)) + row("Formule", esc(c.coverageName)) +
        row("Assuré", esc(u.name || "—")) + row("Véhicule", esc((v.brand || "") + " " + (v.model || ""))) +
        row("Immatriculation", esc(v.plate || "—")) + row("Échéance", new Date(c.endDate).toLocaleDateString("fr-FR")) +
        '</div></div>';
    }, 700);

    function row(k, v) { return '<div class="di"><div class="k" style="font-size:.74rem;color:var(--text-muted);text-transform:uppercase">' + k + '</div><div class="v" style="font-weight:700">' + v + '</div></div>'; }
    function invalid() {
      return '<div class="card card-pad-lg" style="border-color:var(--danger)"><div class="row" style="gap:13px">' +
        '<span class="icon-tile lg" style="background:var(--danger-bg);color:var(--danger)">' + I("x", 26) + '</span>' +
        '<div><h2 style="font-size:1.3rem">Contrat introuvable</h2><p class="muted" style="margin-top:4px">Le numéro de contrat ou le code de vérification est invalide. Vérifiez les informations saisies.</p></div></div></div>';
    }
  }
})();
