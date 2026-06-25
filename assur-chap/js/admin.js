/* ==========================================================================
   Assur Chap — Dashboard administrateur
   ========================================================================== */
(function () {
  "use strict";
  UI.Theme.init();
  Store.init();
  var I = UI.icon, esc = UI.escapeHtml, fcfa = UI.fcfa, fdate = UI.fdate;
  var root = document.getElementById("root");
  var tab = (location.hash.replace("#", "")) || "overview";
  window.addEventListener("hashchange", function () { tab = location.hash.replace("#", "") || "overview"; render(); });

  var TABS = [
    { key: "overview", icon: "chart", label: "Statistiques" },
    { key: "contracts", icon: "file", label: "Contrats" },
    { key: "clients", icon: "users", label: "Clients" },
    { key: "insurers", icon: "shield", label: "Assureurs" },
    { key: "claims", icon: "warning", label: "Sinistres" },
    { key: "commissions", icon: "wallet", label: "Commissions" }
  ];

  function render() {
    var s = Store.adminStats();
    var side = TABS.map(function (t) {
      return '<a class="side-link ' + (tab === t.key ? "is-active" : "") + '" href="#' + t.key + '">' + I(t.icon, 20) + "<span>" + t.label + "</span></a>";
    }).join("");
    var body = "";
    if (tab === "overview") body = overview(s);
    else if (tab === "contracts") body = contractsTab();
    else if (tab === "clients") body = clientsTab();
    else if (tab === "insurers") body = insurersTab();
    else if (tab === "claims") body = claimsTab();
    else if (tab === "commissions") body = commissionsTab(s);

    root.innerHTML =
      '<div class="app"><aside class="sidebar">' +
        '<a href="index.html" class="logo"><span class="mark">' + I("shield", 22) + '</span><span>Assur<b>Chap</b></span></a>' +
        '<span class="badge badge-accent" style="margin:0 8px 10px">' + I("lock", 13) + ' Admin</span>' +
        side +
        '<div class="side-foot"><div class="side-sep"></div><a class="side-link" href="app.html">' + I("logout", 20) + 'Espace client</a></div>' +
      '</aside><div class="main">' +
        '<header class="topbar"><h1>Administration</h1><div class="spacer"></div>' +
        '<button class="icon-btn" id="themeBtn">' + I(UI.Theme.get() === "dark" ? "sun" : "moon", 20) + '</button>' +
        '<span class="avatar" style="width:34px;height:34px;font-size:.8rem">AD</span></header>' +
        '<main class="page">' + body + '</main>' +
      '</div></div>';
    document.getElementById("themeBtn").addEventListener("click", function () { UI.Theme.toggle(); render(); });
    var ai = document.getElementById("addInsurer");
    if (ai) ai.addEventListener("click", function () { UI.toast("Ajout d'un assureur — via API partenaire", "info"); });
  }

  function overview(s) {
    return '<div class="hello"><div><h2>Vue d\'ensemble</h2><p class="muted">Performance de la plateforme en temps réel.</p></div>' +
      '<span class="badge badge-success"><span class="dot"></span>Système opérationnel</span></div>' +
      '<div class="kpi-grid">' +
        akpi("wallet", "Revenus du jour", fcfa(s.revenueDay)) +
        akpi("chart", "Revenus du mois", fcfa(s.revenueMonth)) +
        akpi("star", "Revenus annuels", fcfa(s.revenueAll)) +
        akpi("file", "Contrats", s.contracts.toLocaleString("fr-FR")) +
      '</div>' +
      '<div class="kpi-grid" style="margin-top:14px">' +
        akpi("users", "Clients", s.clients.toLocaleString("fr-FR")) +
        akpi("shield", "Contrats actifs", s.active) +
        akpi("clock", "Expirent < 30j", s.expiring) +
        akpi("chart", "Taux de conversion", s.conversion + "%") +
      '</div>' +
      '<div class="dash-grid" style="margin-top:18px">' +
        '<div class="card card-pad-lg"><div class="section-title"><h3>Revenus par assureur</h3></div>' + insurerBars() + '</div>' +
        '<div class="card card-pad-lg"><div class="section-title"><h3>Répartition des formules</h3></div>' + coverageDist() + '</div>' +
      '</div>';
  }
  function akpi(icon, label, value) {
    return '<div class="card kpi card-hover"><div class="top"><span class="icon-tile" style="width:40px;height:40px">' + I(icon, 20) + '</span></div>' +
      '<div class="v" style="font-size:1.35rem">' + value + '</div><div class="l">' + label + '</div></div>';
  }
  function insurerBars() {
    var data = PRICING.INSURERS.map(function (i, idx) { return { name: i.name, accent: i.accent, val: [38, 27, 14, 11, 6, 4][idx] || 3 }; });
    var max = Math.max.apply(null, data.map(function (d) { return d.val; }));
    return data.map(function (d) {
      return '<div style="margin-bottom:12px"><div class="row-between" style="font-size:.86rem"><span style="font-weight:600">' + esc(d.name) + '</span><span class="muted">' + d.val + '%</span></div>' +
        '<div class="progress" style="margin-top:5px"><span style="width:' + (d.val / max * 100) + '%;background:' + d.accent + '"></span></div></div>';
    }).join("");
  }
  function coverageDist() {
    var dist = [["Tous Risques", 46, "var(--brand)"], ["Tiers Étendu", 38, "var(--accent)"], ["Tiers", 16, "var(--text-muted)"]];
    return dist.map(function (d) {
      return '<div style="margin-bottom:14px"><div class="row-between" style="font-size:.9rem"><span style="font-weight:600">' + d[0] + '</span><b>' + d[1] + '%</b></div>' +
        '<div class="progress" style="margin-top:6px"><span style="width:' + d[1] + '%;background:' + d[2] + '"></span></div></div>';
    }).join("");
  }

  function contractsTab() {
    var contracts = Store.db.contracts;
    return tableCard("Tous les contrats", ["N°", "Assureur", "Formule", "Prime", "Échéance", "Statut"],
      contracts.map(function (c) {
        return [esc(c.number), esc(c.insurer), esc(c.coverageName), fcfa(c.price), fdate(c.endDate),
          '<span class="badge ' + (c.status === "active" ? "badge-success" : "badge-danger") + '"><span class="dot"></span>' + (c.status === "active" ? "Actif" : "Expiré") + '</span>'];
      }));
  }
  function clientsTab() {
    var clients = Store.db.users.filter(function (u) { return u.role === "client"; });
    return tableCard("Clients", ["Nom", "Email", "Téléphone", "Parrainage", "Inscrit le"],
      clients.map(function (u) {
        return ['<b>' + esc(u.name) + '</b>', esc(u.email), esc(u.phone || "—"), '<span class="badge badge-brand mono">' + esc(u.referralCode) + '</span>', fdate(u.createdAt)];
      }));
  }
  function insurersTab() {
    return '<div class="hello"><div><h2>Compagnies partenaires</h2><p class="muted">Connexion API-first avec ' + PRICING.INSURERS.length + ' assureurs.</p></div>' +
      '<button class="btn btn-primary" id="addInsurer">' + I("plus", 18) + ' Ajouter</button></div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' +
      PRICING.INSURERS.map(function (i) {
        return '<div class="card card-hover"><div class="row" style="gap:12px"><span class="cc-logo" style="background:' + i.accent + '">' + esc(i.name.slice(0, 1)) + '</span>' +
          '<div style="flex:1"><div style="font-weight:700">' + esc(i.name) + '</div><span class="rating" style="color:var(--accent-600);font-weight:700;font-size:.85rem">' + I("star", 13) + i.rating.toFixed(1) + '</span></div>' +
          '<span class="badge badge-success"><span class="dot"></span>API OK</span></div>' +
          '<p class="muted" style="font-size:.86rem;margin-top:10px">' + esc(i.desc) + '</p>' +
          '<div class="row-between" style="margin-top:12px;font-size:.84rem"><span class="muted">Indemnisation ~' + i.claimDays + ' j</span><span class="muted">Comm. ' + Math.round((i.mult) * 10) + '%</span></div></div>';
      }).join("") + '</div>';
  }
  function claimsTab() {
    var claims = Store.db.claims;
    if (!claims.length) return '<div class="card"><div class="empty"><span class="icon-tile lg">' + I("warning", 26) + '</span><h3>Aucun sinistre</h3></div></div>';
    return tableCard("Sinistres déclarés", ["Type", "Véhicule", "Localisation", "Statut", "Date"],
      claims.map(function (c) {
        var v = Store.vehicle(c.vehicleId) || {};
        return [esc(c.type), esc((v.brand || "") + " " + (v.model || "")), esc(c.location || "—"),
          '<span class="badge badge-warning"><span class="dot"></span>' + esc(c.status) + '</span>', fdate(c.createdAt)];
      }));
  }
  function commissionsTab(s) {
    var rows = [
      ["Koffi Mensah", "Agent", "23", fcfa(1840000)],
      ["Awa Traoré", "Parrainage", "5", fcfa(125000)],
      ["Réseau Abidjan", "Courtier", "61", fcfa(4920000)]
    ];
    return '<div class="hello"><div><h2>Commissions</h2><p class="muted">Suivi des commissions agents & parrainage.</p></div></div>' +
      '<div class="kpi-grid" style="margin-bottom:18px">' +
        akpi("wallet", "Commissions du mois", fcfa(2480000)) +
        akpi("users", "Agents actifs", "14") +
        akpi("gift", "Cashback parrainage", fcfa(680000)) +
        akpi("chart", "Taux moyen", "12%") +
      '</div>' +
      tableCard("Détail des commissions", ["Bénéficiaire", "Type", "Ventes", "Montant"], rows.map(function (r) { return [esc(r[0]), '<span class="badge">' + r[1] + '</span>', r[2], '<b>' + r[3] + '</b>']; }));
  }

  function tableCard(title, headers, rows) {
    return '<div class="hello"><div><h2>' + title + '</h2><p class="muted">' + rows.length + ' résultat(s).</p></div></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr>' + headers.map(function (h) { return "<th>" + h + "</th>"; }).join("") + '</tr></thead><tbody>' +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div>';
  }

  render();
})();
