/* ==========================================================================
   Assur Chap — Application client (SPA)
   ========================================================================== */
(function () {
  "use strict";

  UI.Theme.init();
  Store.init();
  var I = UI.icon, esc = UI.escapeHtml, fcfa = UI.fcfa, fdate = UI.fdate;
  var root = document.getElementById("root");

  // Wizard draft (souscription)
  var wiz = null;
  function newWiz() { return { step: 0, vehicleId: null, coverageId: "tiers_plus", months: 12, sort: "ai", offer: null, payMethod: "orange" }; }

  /* ---------------------------------------------------------------- Router */
  function nav(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener("hashchange", render);

  function render() {
    var h = location.hash.replace(/^#/, "") || "login";
    var user = Store.currentUser();

    // Public auth routes
    if (h === "login") return user ? nav("#dashboard") : viewAuth("login");
    if (h === "signup") return user ? nav("#dashboard") : viewAuth("signup");
    if (h === "agent") return user ? nav("#dashboard") : viewAuth("login");
    if (h === "demo") { Store.loginDemo(); return nav("#dashboard"); }

    if (!user) return viewAuth("login");

    var route = h.split("/")[0];
    var param = h.split("/")[1];
    switch (route) {
      case "dashboard": return viewDashboard(user);
      case "vehicles": return viewVehicles(user);
      case "vehicle-add": return viewVehicleAdd();
      case "quote": return viewQuote(user);
      case "contracts": return viewContracts(user);
      case "contract": return viewContract(param);
      case "claims": return viewClaims(user);
      case "claim-new": return viewClaimNew(user);
      case "assistant": return viewAssistant();
      case "referral": return viewReferral(user);
      case "notifications": return viewNotifications(user);
      case "profile": return viewProfile(user);
      default: return viewDashboard(user);
    }
  }

  /* ------------------------------------------------------------------ Shell */
  var NAVS = [
    { key: "dashboard", icon: "home", label: "Accueil" },
    { key: "vehicles", icon: "car", label: "Véhicules" },
    { key: "quote", icon: "plus", label: "Devis" },
    { key: "contracts", icon: "file", label: "Contrats" },
    { key: "claims", icon: "warning", label: "Sinistres" },
    { key: "assistant", icon: "robot", label: "Assistant IA" },
    { key: "referral", icon: "gift", label: "Parrainage" }
  ];

  function shell(opts) {
    var user = Store.currentUser();
    var active = opts.active;
    var unread = Store.notifications().filter(function (n) { return !n.read; }).length;
    var sideLinks = NAVS.map(function (n) {
      return '<a class="side-link ' + (active === n.key ? "is-active" : "") + '" href="#' + n.key + '">' +
        I(n.icon, 20) + "<span>" + n.label + "</span>" +
        (n.key === "quote" ? '<span class="pill">3 min</span>' : "") + "</a>";
    }).join("");

    var bottomItems = [
      { key: "dashboard", icon: "home", label: "Accueil" },
      { key: "contracts", icon: "file", label: "Contrats" },
      { key: "quote", icon: "plus", label: "Devis", fab: true },
      { key: "claims", icon: "warning", label: "Sinistres" },
      { key: "assistant", icon: "robot", label: "Assistant" }
    ];
    var bottom = bottomItems.map(function (n) {
      if (n.fab) return '<a href="#quote" style="visibility:hidden">·</a>';
      return '<a class="' + (active === n.key ? "is-active" : "") + '" href="#' + n.key + '">' + I(n.icon, 22) + "<span>" + n.label + "</span></a>";
    }).join("");

    root.innerHTML =
      '<div class="app">' +
        '<aside class="sidebar">' +
          '<a href="#dashboard" class="logo"><span class="mark">' + I("shield", 22) + '</span><span>Assur<b>Chap</b></span></a>' +
          sideLinks +
          '<div class="side-sep"></div>' +
          '<a class="side-link" href="#referral">' + I("gift", 20) + "Parrainage</a>" +
          '<a class="side-link" href="#profile">' + I("settings", 20) + "Profil</a>" +
          '<div class="side-foot">' +
            '<div class="side-sep"></div>' +
            '<div class="row" style="padding:8px 10px"><span class="avatar">' + initials(user.name) + '</span>' +
            '<div style="min-width:0"><div style="font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(user.name) + '</div><div class="muted" style="font-size:.78rem">' + esc(user.email) + '</div></div></div>' +
            '<button class="side-link" id="logoutBtn">' + I("logout", 20) + "Déconnexion</button>" +
          '</div>' +
        '</aside>' +
        '<div class="main">' +
          '<header class="topbar">' +
            '<button class="icon-btn show-mobile-only" id="mLogo" style="display:none">' + I("shield", 22) + '</button>' +
            '<h1>' + esc(opts.title) + "</h1>" +
            '<div class="spacer"></div>' +
            '<button class="icon-btn" id="langBtn" title="Langue"><span style="font-size:.78rem;font-weight:700">' + I18N.t("lang") + '</span></button>' +
            '<button class="icon-btn" id="themeBtn" title="Thème">' + I(UI.Theme.get() === "dark" ? "sun" : "moon", 20) + '</button>' +
            '<button class="icon-btn" id="notifBtn" title="Notifications">' + I("bell", 20) + (unread ? '<span class="ndot"></span>' : "") + '</button>' +
            '<a class="icon-btn show-desktop" href="#profile" title="Profil"><span class="avatar" style="width:32px;height:32px;font-size:.78rem">' + initials(user.name) + '</span></a>' +
          '</header>' +
          '<main class="page">' + opts.content + "</main>" +
        '</div>' +
      '</div>' +
      '<nav class="bottomnav">' + bottom + "</nav>" +
      '<a class="fab" href="#quote" title="Nouveau devis">' + I("plus", 26) + "</a>";

    // bindings
    var lo = document.getElementById("logoutBtn");
    if (lo) lo.addEventListener("click", function () { Store.logout(); UI.toast("Déconnecté", "info"); nav("#login"); });
    document.getElementById("themeBtn").addEventListener("click", function () { UI.Theme.toggle(); render(); });
    document.getElementById("langBtn").addEventListener("click", function () { I18N.toggle(); render(); });
    document.getElementById("notifBtn").addEventListener("click", function () { nav("#notifications"); });
    if (opts.onMount) opts.onMount();
    window.scrollTo(0, 0);
  }

  function initials(name) { return (name || "?").split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(); }

  /* --------------------------------------------------------------- Auth view */
  function viewAuth(mode) {
    var isSignup = mode === "signup";
    root.innerHTML =
      '<div class="auth-wrap">' +
        '<aside class="auth-aside">' +
          '<div class="a-top"><a href="index.html" class="logo" style="color:#fff"><span class="mark">' + I("shield", 22) + '</span><span style="color:#fff">Assur<b style="color:var(--accent)">Chap</b></span></a></div>' +
          '<div class="a-mid"><h2>L\'assurance auto, simple et instantanée.</h2>' +
            '<p>Souscrivez en moins de 3 minutes, payez par Mobile Money et recevez votre contrat immédiatement.</p>' +
            '<div class="auth-feat"><span class="ic-c">' + I("bolt", 18) + '</span> Devis en temps réel</div>' +
            '<div class="auth-feat"><span class="ic-c">' + I("wallet", 18) + '</span> Orange Money, Wave, MTN, carte…</div>' +
            '<div class="auth-feat"><span class="ic-c">' + I("file", 18) + '</span> Contrat PDF avec QR code sécurisé</div>' +
          '</div>' +
          '<div class="a-bot muted" style="color:rgba(255,255,255,.7);font-size:.84rem">© ' + new Date().getFullYear() + ' Assur Chap</div>' +
        '</aside>' +
        '<main class="auth-main"><div class="auth-card">' +
          '<a href="index.html" class="logo" style="display:none"></a>' +
          '<div class="segment" style="margin-bottom:22px"><button data-m="login" class="' + (!isSignup ? "is-active" : "") + '">Se connecter</button><button data-m="signup" class="' + (isSignup ? "is-active" : "") + '">Créer un compte</button></div>' +
          (isSignup ? signupForm() : loginForm()) +
        '</div></main>' +
      '</div>';

    root.querySelectorAll(".segment [data-m]").forEach(function (b) {
      b.addEventListener("click", function () { nav("#" + b.getAttribute("data-m")); });
    });

    if (isSignup) {
      document.getElementById("suForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target;
        var r = Store.register({ name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), password: f.password.value });
        if (r.error) return UI.toast(r.error, "error");
        UI.toast("Compte créé. Bienvenue !", "success");
        nav("#dashboard");
      });
    } else {
      document.getElementById("liForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target;
        var r = Store.login(f.id.value.trim(), f.password.value);
        if (r.error) return UI.toast(r.error, "error");
        UI.toast("Bon retour, " + r.user.name.split(" ")[0] + " !", "success");
        nav("#dashboard");
      });
      var demo = document.getElementById("demoBtn");
      if (demo) demo.addEventListener("click", function () { Store.loginDemo(); nav("#dashboard"); });
    }
  }

  function socialButtons() {
    return '<div class="social-btns">' +
      '<button type="button" class="btn btn-ghost" onclick="UI.toast(\'Connexion Google — à brancher (OAuth)\',\'info\')">' + googleSvg() + ' Google</button>' +
      '<button type="button" class="btn btn-ghost" onclick="UI.toast(\'Connexion Apple — à brancher\',\'info\')">' + appleSvg() + ' Apple</button>' +
      '</div>';
  }
  function loginForm() {
    return '<form id="liForm" class="stack" style="--gap:14px">' +
      field("Email ou téléphone", '<input class="input" name="id" placeholder="demo@assurchap.com" value="demo@assurchap.com" required />') +
      field("Mot de passe", '<input class="input" name="password" type="password" value="demo" required />') +
      '<button class="btn btn-primary btn-block btn-lg">Se connecter</button>' +
      '<button type="button" class="btn btn-soft btn-block" id="demoBtn">' + I("bolt", 18) + ' Essayer la démo (compte pré-rempli)</button>' +
      '<div class="divider">ou continuer avec</div>' + socialButtons() +
      '<p class="center muted" style="font-size:.82rem">OTP par SMS / WhatsApp & 2FA disponibles en production.</p>' +
      '</form>';
  }
  function signupForm() {
    return '<form id="suForm" class="stack" style="--gap:14px">' +
      field("Nom complet", '<input class="input" name="name" placeholder="Awa Traoré" required />') +
      field("Email", '<input class="input" name="email" type="email" placeholder="vous@email.com" required />') +
      field("Téléphone (WhatsApp)", '<input class="input" name="phone" placeholder="+225 07 00 00 00" />') +
      field("Mot de passe", '<input class="input" name="password" type="password" placeholder="••••••••" required />') +
      '<button class="btn btn-accent btn-block btn-lg">Créer mon compte</button>' +
      '<div class="divider">ou s\'inscrire avec</div>' + socialButtons() +
      '</form>';
  }
  function field(label, inner) { return '<label class="field"><span class="label">' + label + "</span>" + inner + "</label>"; }
  function googleSvg() { return '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-2.8-.4-4H24v7.6h12c-.2 2-1.6 5-4.6 7l7 5.4C42.8 42 45 33.8 45 24z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7-5.4c-2 1.4-4.6 2.2-7.6 2.2-5.8 0-10.8-3.9-12.6-9.2l-7.2 5.6C7.8 41 15.2 46 24 46z"/><path fill="#FBBC05" d="M11.4 28.2c-.5-1.4-.8-2.8-.8-4.2s.3-2.8.8-4.2l-7.2-5.6C2.8 17 2 20.4 2 24s.8 7 2.2 9.8l7.2-5.6z"/><path fill="#EA4335" d="M24 10.6c3.2 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4 30 2 24 2 15.2 2 7.8 7 4.2 14.2l7.2 5.6C13.2 14.5 18.2 10.6 24 10.6z"/></svg>'; }
  function appleSvg() { return '<svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.3-.9C6 6.7 4.4 7.7 3.5 9.3c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.8-.8 3.4-.8s2 .8 3.4.8 2.3-1.2 3.2-2.4c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.8-4.2zM14 4.4c.7-.9 1.2-2.1 1-3.4-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.1-1.4z"/></svg>'; }

  /* -------------------------------------------------------------- Dashboard */
  function viewDashboard(user) {
    var vehicles = Store.vehicles();
    var contracts = Store.contracts();
    var active = contracts.filter(function (c) { return c.status === "active"; });
    var claims = Store.claims();
    var expiringSoon = active.filter(function (c) { return UI.daysBetween(new Date(), c.endDate) <= 30; });
    var firstName = user.name.split(" ")[0];

    var content =
      '<div class="hello"><div><h2>Bonjour ' + esc(firstName) + ' 👋</h2><p class="muted">Voici un aperçu de vos assurances.</p></div>' +
        '<a href="#quote" class="btn btn-accent">' + I("plus", 18) + ' Nouveau devis</a></div>' +
      (expiringSoon.length ? expiringBanner(expiringSoon[0]) : "") +
      '<div class="kpi-grid">' +
        kpi("shield", "brand", active.length, "Contrats actifs") +
        kpi("car", "brand", vehicles.length, "Véhicules") +
        kpi("warning", "accent", claims.length, "Sinistres") +
        kpi("wallet", "brand", Store.payments().length, "Paiements") +
      '</div>' +
      '<div class="dash-grid">' +
        '<div class="card card-pad-lg">' +
          '<div class="section-title"><h3>Vos contrats actifs</h3><a href="#contracts" class="btn btn-soft btn-sm">Tout voir</a></div>' +
          (active.length ? active.slice(0, 2).map(contractMini).join("") : emptyMini("Aucun contrat actif", "Demandez un devis pour assurer un véhicule.")) +
        '</div>' +
        '<div class="card card-pad-lg">' +
          '<div class="section-title"><h3>Actions rapides</h3></div>' +
          quickAction("plus", "Souscrire une assurance", "#quote") +
          quickAction("car", "Ajouter un véhicule", "#vehicle-add") +
          quickAction("warning", "Déclarer un sinistre", "#claim-new") +
          quickAction("robot", "Parler à l'assistant IA", "#assistant") +
        '</div>' +
      '</div>';

    shell({ title: "Tableau de bord", active: "dashboard", content: content });
  }
  function kpi(icon, tone, value, label) {
    return '<div class="card kpi card-hover"><div class="top"><span class="icon-tile ' + (tone === "accent" ? "accent" : "") + '" style="width:40px;height:40px">' + I(icon, 20) + '</span></div>' +
      '<div class="v">' + value + '</div><div class="l">' + label + '</div></div>';
  }
  function expiringBanner(c) {
    var days = UI.daysBetween(new Date(), c.endDate);
    return '<div class="card" style="border-color:var(--warning);background:var(--warning-bg);margin-bottom:18px"><div class="row-between" style="flex-wrap:wrap;gap:12px">' +
      '<div class="row"><span class="icon-tile accent" style="background:#fff">' + I("clock", 20) + '</span><div><b>Contrat ' + esc(c.number) + ' expire dans ' + days + ' jours</b><div class="muted" style="font-size:.86rem">Renouvelez en un clic pour rester couvert.</div></div></div>' +
      '<a href="#contract/' + c.id + '" class="btn btn-accent btn-sm">Renouveler</a></div></div>';
  }
  function quickAction(icon, label, href) {
    return '<a href="' + href + '" class="list-row" style="text-decoration:none"><span class="icon-tile" style="width:40px;height:40px">' + I(icon, 20) + '</span><span style="flex:1;font-weight:600;color:var(--text)">' + label + '</span>' + I("chevron", 18, "muted") + '</a>';
  }
  function emptyMini(t, d) { return '<div class="empty" style="padding:26px 10px"><div class="muted">' + t + '</div><div class="muted" style="font-size:.85rem;margin-top:4px">' + d + '</div></div>'; }
  function contractMini(c) {
    var ins = PRICING.INSURERS.filter(function (x) { return x.id === c.insurerId; })[0] || { accent: "#1F7A8C" };
    var v = Store.vehicle(c.vehicleId) || {};
    var days = UI.daysBetween(new Date(), c.endDate);
    return '<a href="#contract/' + c.id + '" class="list-row" style="text-decoration:none">' +
      '<span class="cc-logo" style="background:' + ins.accent + ';width:42px;height:42px">' + esc((c.insurer || "?").slice(0, 1)) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">' + esc(c.coverageName) + '</div>' +
      '<div class="muted" style="font-size:.84rem">' + esc(v.brand + " " + v.model) + ' · ' + esc(v.plate || "") + '</div></div>' +
      '<div style="text-align:right"><span class="badge ' + (c.status === "active" ? "badge-success" : "badge-danger") + '"><span class="dot"></span>' + (c.status === "active" ? "Actif" : "Expiré") + '</span>' +
      '<div class="muted" style="font-size:.78rem;margin-top:3px">' + (days > 0 ? days + " j restants" : "expiré") + '</div></div></a>';
  }

  /* --------------------------------------------------------------- Vehicles */
  function viewVehicles(user) {
    var vehicles = Store.vehicles();
    var content =
      '<div class="hello"><div><h2>Mes véhicules</h2><p class="muted">' + vehicles.length + ' véhicule(s) enregistré(s).</p></div>' +
      '<a href="#vehicle-add" class="btn btn-primary">' + I("plus", 18) + ' Ajouter</a></div>' +
      (vehicles.length ? '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + vehicles.map(vehicleCard).join("") + '</div>'
        : emptyState("car", "Aucun véhicule", "Ajoutez votre premier véhicule pour obtenir un devis.", "#vehicle-add", "Ajouter un véhicule"));
    shell({ title: "Véhicules", active: "vehicles", content: content, onMount: function () {
      root.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          var id = b.getAttribute("data-del");
          Store.removeVehicle(id); UI.toast("Véhicule supprimé", "info"); render();
        });
      });
      root.querySelectorAll("[data-quote]").forEach(function (b) {
        b.addEventListener("click", function () { wiz = newWiz(); wiz.vehicleId = b.getAttribute("data-quote"); wiz.step = 1; nav("#quote"); });
      });
    }});
  }
  function vehicleCard(v) {
    var age = new Date().getFullYear() - (+v.year);
    return '<div class="card card-hover"><div class="vehicle-card"><span class="veh-ic">' + I("car", 26) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:1.05rem">' + esc(v.brand + " " + v.model) + '</div>' +
      '<div class="muted" style="font-size:.86rem">' + esc(v.year) + ' · ' + esc(v.fuel) + ' · ' + esc(v.power) + ' CV</div></div>' +
      '<span class="badge ' + (v.usage === "professionnel" ? "badge-accent" : "badge-brand") + '">' + esc(v.usage) + '</span></div>' +
      '<div class="cc-meta" style="grid-template-columns:1fr 1fr;margin-top:14px">' +
        '<div class="m"><div class="k">Immatriculation</div><div class="val mono">' + esc(v.plate) + '</div></div>' +
        '<div class="m"><div class="k">Valeur</div><div class="val">' + fcfa(v.value) + '</div></div>' +
      '</div>' +
      '<div class="row" style="margin-top:14px;gap:8px"><button class="btn btn-soft btn-sm" style="flex:1" data-quote="' + v.id + '">' + I("shield", 16) + ' Assurer</button>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-del="' + v.id + '" title="Supprimer">' + I("x", 16) + '</button></div></div>';
  }

  function viewVehicleAdd() {
    var content =
      '<a href="#vehicles" class="btn btn-ghost btn-sm" style="margin-bottom:16px">' + I("arrowLeft", 16) + ' Retour</a>' +
      '<div class="wizard-head"><h2>Ajouter un véhicule</h2><p class="muted">Prenez en photo votre carte grise — l\'IA pré-remplit le formulaire.</p></div>' +
      '<div class="grid" style="grid-template-columns:1fr;gap:18px;max-width:720px">' +
        '<div class="card"><div class="upload-zone" id="ocrZone"><span class="icon-tile accent lg">' + I("camera", 26) + '</span>' +
          '<div style="font-weight:700">Scanner la carte grise</div>' +
          '<div class="muted" style="font-size:.88rem;margin-top:4px">OCR & IA — extraction automatique des informations</div>' +
          '<button class="btn btn-soft btn-sm" style="margin-top:12px">Simuler le scan IA</button></div>' +
          '<div id="ocrStatus" style="margin-top:14px"></div></div>' +
        '<form id="vForm" class="card"><div class="form-grid">' +
          field2("Marque", '<input class="input" name="brand" placeholder="Toyota" required />') +
          field2("Modèle", '<input class="input" name="model" placeholder="Corolla" required />') +
          field2("Année", '<input class="input" name="year" type="number" min="1980" max="2026" placeholder="2019" required />') +
          field2("Immatriculation", '<input class="input" name="plate" placeholder="AB-1234-CI" required />') +
          field2("Numéro de châssis (VIN)", '<input class="input" name="vin" placeholder="JTDBR32E..." />') +
          field2("Puissance fiscale (CV)", '<input class="input" name="power" type="number" min="2" max="40" placeholder="8" required />') +
          field2("Carburant", select("fuel", ["Essence", "Diesel", "Hybride", "Électrique"])) +
          field2("Usage", select("usage", ["personnel", "professionnel"])) +
          field2("Valeur du véhicule (FCFA)", '<input class="input" name="value" type="number" min="0" step="50000" placeholder="7500000" required />', "full") +
        '</div><button class="btn btn-primary btn-block btn-lg" style="margin-top:18px">' + I("check", 18) + ' Enregistrer le véhicule</button></form>' +
      '</div>';
    shell({ title: "Nouveau véhicule", active: "vehicles", content: content, onMount: function () {
      document.getElementById("ocrZone").addEventListener("click", simulateOCR);
      document.getElementById("vForm").addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target;
        var v = Store.addVehicle({ brand: f.brand.value.trim(), model: f.model.value.trim(), year: +f.year.value, plate: f.plate.value.trim().toUpperCase(), vin: f.vin.value.trim().toUpperCase(), power: +f.power.value, fuel: f.fuel.value, usage: f.usage.value, value: +f.value.value });
        UI.toast("Véhicule ajouté ✅", "success");
        wiz = newWiz(); wiz.vehicleId = v.id; wiz.step = 1; nav("#quote");
      });
    }});
  }
  function simulateOCR() {
    var status = document.getElementById("ocrStatus");
    status.innerHTML = '<div class="ocr-pending">' + I("refresh", 18) + ' Analyse du document par l\'IA…</div>';
    setTimeout(function () {
      var sample = { brand: "Toyota", model: "Yaris", year: 2020, plate: "EF-3092-CI", vin: "VF1RFB00X66123456", power: 6, fuel: "Essence", usage: "personnel", value: 5800000 };
      var f = document.getElementById("vForm");
      Object.keys(sample).forEach(function (k) { if (f[k]) f[k].value = sample[k]; });
      status.innerHTML = '<div class="badge badge-success" style="font-size:.84rem"><span class="dot"></span>Document analysé — champs pré-remplis · cohérence vérifiée</div>';
      UI.toast("Carte grise analysée par l'IA", "success");
    }, 1500);
  }
  function field2(label, inner, cls) { return '<label class="field ' + (cls || "") + '"><span class="label">' + label + "</span>" + inner + "</label>"; }
  function select(name, opts) { return '<select class="select" name="' + name + '">' + opts.map(function (o) { return '<option value="' + o + '">' + o + "</option>"; }).join("") + "</select>"; }

  /* ----------------------------------------------------------------- Quote */
  function viewQuote(user) {
    if (!wiz) wiz = newWiz();
    var vehicles = Store.vehicles();
    if (!vehicles.length) {
      return shell({ title: "Devis", active: "quote", content:
        emptyState("car", "Ajoutez d'abord un véhicule", "Vous devez enregistrer un véhicule avant d'obtenir un devis.", "#vehicle-add", "Ajouter un véhicule") });
    }
    if (!wiz.vehicleId) wiz.vehicleId = vehicles[0].id;

    var stepsBar = wizardSteps(wiz.step);
    var body = "";
    if (wiz.step === 0) body = quoteStepVehicle(vehicles);
    else if (wiz.step === 1) body = quoteStepCoverage();
    else if (wiz.step === 2) body = quoteStepCompare();
    else if (wiz.step === 3) body = quoteStepPayment();

    var content =
      '<div class="wizard-head"><h2>Souscrire une assurance</h2><p class="muted">En moins de 3 minutes, comparez et payez.</p></div>' +
      '<div style="max-width:760px">' + stepsBar + '<div style="margin-top:22px">' + body + '</div></div>';

    shell({ title: "Nouveau devis", active: "quote", content: content, onMount: quoteBindings });
  }
  function wizardSteps(step) {
    var labels = ["Véhicule", "Formule", "Comparer", "Paiement"];
    return '<div class="steps">' + labels.map(function (l, i) {
      var cls = i < step ? "done" : i === step ? "active" : "";
      return '<div class="step ' + cls + '"><span class="dot">' + (i < step ? "✓" : (i + 1)) + '</span><span class="muted ' + (i <= step ? "" : "") + '" style="font-size:.84rem;font-weight:600;color:' + (i <= step ? "var(--text)" : "var(--text-muted)") + '">' + l + '</span>' + (i < 3 ? '<span class="line"></span>' : "") + "</div>";
    }).join("") + "</div>";
  }
  function quoteStepVehicle(vehicles) {
    return '<div class="card"><h3 style="margin-bottom:14px">Quel véhicule assurer ?</h3>' +
      '<div class="stack" style="--gap:10px">' + vehicles.map(function (v) {
        var on = v.id === wiz.vehicleId;
        return '<button class="cover-opt ' + (on ? "is-active" : "") + '" data-veh="' + v.id + '" style="display:flex;align-items:center;gap:13px;text-align:left;width:100%">' +
          '<span class="veh-ic">' + I("car", 24) + '</span><div style="flex:1"><div style="font-weight:700">' + esc(v.brand + " " + v.model) + '</div><div class="muted" style="font-size:.85rem">' + esc(v.plate) + ' · ' + esc(v.year) + ' · ' + fcfa(v.value) + '</div></div>' + (on ? I("checkCircle", 22, "brand-blue") : "") + '</button>';
      }).join("") + '</div>' +
      '<a href="#vehicle-add" class="btn btn-ghost btn-sm" style="margin-top:14px">' + I("plus", 16) + ' Ajouter un autre véhicule</a>' +
      '<div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-primary" data-next="1">Continuer ' + I("arrowRight", 16) + '</button></div></div>';
  }
  function quoteStepCoverage() {
    var covers = ["tiers", "tiers_plus", "tous_risques"].map(function (id) {
      var c = PRICING.COVERAGES[id]; var on = id === wiz.coverageId;
      return '<div class="cover-opt ' + (on ? "is-active" : "") + '" data-cover="' + id + '"><div class="row-between"><h4>' + c.short + '</h4>' + (on ? I("checkCircle", 20, "brand-blue") : "") + '</div>' +
        '<div class="muted" style="font-size:.82rem">' + c.name + '</div>' +
        c.guarantees.slice(0, 4).map(function (g) { return '<div class="g">' + I("check", 14) + esc(g) + '</div>'; }).join("") +
        (c.guarantees.length > 4 ? '<div class="muted" style="font-size:.8rem;margin-top:6px">+ ' + (c.guarantees.length - 4) + ' garanties</div>' : "") + '</div>';
    }).join("");
    var durations = PRICING.DURATIONS.map(function (d) {
      return '<button class="chip ' + (d.months === wiz.months ? "is-active" : "") + '" data-dur="' + d.months + '">' + d.label + '</button>';
    }).join("");
    return '<div class="card"><h3 style="margin-bottom:6px">Choisissez votre formule</h3><p class="muted" style="margin-bottom:16px;font-size:.9rem">Vous pourrez comparer les assureurs à l\'étape suivante.</p>' +
      '<div class="cover-grid">' + covers + '</div>' +
      '<h3 style="margin:22px 0 12px;font-size:1.05rem">Durée de couverture</h3><div class="row" style="flex-wrap:wrap;gap:8px">' + durations + '</div>' +
      '<div class="row" style="justify-content:space-between;margin-top:22px"><button class="btn btn-ghost" data-prev="0">' + I("arrowLeft", 16) + ' Retour</button><button class="btn btn-primary" data-next="2">Comparer les offres ' + I("arrowRight", 16) + '</button></div></div>';
  }
  function quoteStepCompare() {
    var v = Store.vehicle(wiz.vehicleId);
    var offers = PRICING.sortOffers(PRICING.computeQuotes(v, wiz.coverageId, wiz.months), wiz.sort);
    var recommendedId = PRICING.sortOffers(offers, "ai")[0].insurerId;
    var sorts = [["ai", "Recommandé IA", "robot"], ["cheapest", "Moins cher", "wallet"], ["coverage", "Meilleure couverture", "shield"]];
    var toolbar = '<div class="offer-toolbar"><span class="muted" style="font-size:.86rem">Trier :</span>' +
      sorts.map(function (s) { return '<button class="chip ' + (wiz.sort === s[0] ? "is-active" : "") + '" data-sort="' + s[0] + '">' + I(s[2], 15) + s[1] + '</button>'; }).join("") + '</div>';
    var cards = offers.map(function (o) {
      var rec = o.insurerId === recommendedId;
      return '<div class="card offer-card ' + (rec ? "recommended" : "") + '">' +
        '<span class="o-logo" style="background:' + o.accent + '">' + esc(o.insurer.slice(0, 1)) + '</span>' +
        '<div style="min-width:0"><div class="row" style="gap:8px;flex-wrap:wrap"><span class="o-name">' + esc(o.insurer) + '</span>' +
          (rec ? '<span class="badge badge-accent">' + I("star", 13) + ' Recommandé IA</span>' : "") +
          '<span class="rating">' + I("star", 13) + o.rating.toFixed(1) + '</span></div>' +
        '<div class="o-guar">' + o.guarantees.slice(0, 3).map(function (g) { return '<span class="badge">' + esc(g) + '</span>'; }).join("") + (o.guarantees.length > 3 ? '<span class="badge">+' + (o.guarantees.length - 3) + '</span>' : "") + '</div>' +
        '<div class="muted" style="font-size:.8rem;margin-top:6px">Franchise ' + fcfa(o.franchise) + ' · Indemnisation ~' + o.claimDays + ' j</div></div>' +
        '<div class="o-price"><div class="p">' + fcfa(o.price).replace(" FCFA", "") + '</div><div class="muted" style="font-size:.76rem">FCFA · ' + o.durationLabel + '</div>' +
        '<button class="btn btn-accent btn-sm" style="margin-top:8px" data-pick="' + o.insurerId + '">Choisir</button></div></div>';
    }).join("");
    return '<div>' + toolbar + '<div class="stack" style="--gap:12px">' + cards + '</div>' +
      '<div class="row" style="margin-top:18px"><button class="btn btn-ghost" data-prev="1">' + I("arrowLeft", 16) + ' Modifier la formule</button></div></div>';
  }
  function quoteStepPayment() {
    var v = Store.vehicle(wiz.vehicleId);
    var o = wiz.offer;
    var methods = [
      ["orange", "Orange Money", "#ff6600"], ["mtn", "MTN MoMo", "#ffcc00"], ["moov", "Moov Money", "#00a0e3"],
      ["wave", "Wave", "#1dc9ff"], ["visa", "Visa", "#1a1f71"], ["mastercard", "Mastercard", "#eb001b"]
    ];
    return '<div class="grid" style="grid-template-columns:1.4fr 1fr;gap:18px" id="payGrid">' +
      '<div class="card"><h3 style="margin-bottom:14px">Mode de paiement</h3>' +
        '<div class="pay-grid">' + methods.map(function (m) {
          return '<div class="pay-opt ' + (m[0] === wiz.payMethod ? "is-active" : "") + '" data-pay="' + m[0] + '"><div class="pay-logo" style="background:' + m[2] + (m[0] === "mtn" ? ";color:#000" : "") + '">' + m[1].split(" ")[0] + '</div>' + m[1] + '</div>';
        }).join("") + '</div>' +
        '<div class="field" style="margin-top:16px"><span class="label">Numéro de téléphone / carte</span><div class="input-group"><span class="ig-icon">' + I("phone", 18) + '</span><input class="input" id="payNumber" placeholder="+225 07 00 00 00" value="' + esc(Store.currentUser().phone || "") + '" /></div></div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="payBtn" style="margin-top:18px">' + I("lock", 18) + ' Payer ' + fcfa(o.price) + '</button>' +
        '<p class="center muted" style="font-size:.8rem;margin-top:10px">' + I("lock", 13) + ' Paiement chiffré · démo (aucun débit réel)</p>' +
      '</div>' +
      '<div class="card card-2"><h3 style="margin-bottom:12px;font-size:1.05rem">Récapitulatif</h3>' +
        summaryRow("Véhicule", esc(v.brand + " " + v.model)) +
        summaryRow("Immatriculation", esc(v.plate)) +
        summaryRow("Assureur", esc(o.insurer)) +
        summaryRow("Formule", esc(o.coverageName)) +
        summaryRow("Durée", o.durationLabel) +
        summaryRow("Franchise", fcfa(o.franchise)) +
        '<div class="side-sep" style="margin:12px 0"></div>' +
        '<div class="row-between"><b>Total à payer</b><b class="brand-blue" style="font-size:1.3rem">' + fcfa(o.price) + '</b></div>' +
        '<div class="row" style="margin-top:14px;gap:8px"><button class="btn btn-ghost btn-sm" data-prev="2">' + I("arrowLeft", 15) + ' Offres</button></div>' +
      '</div></div>';
  }
  function summaryRow(k, v) { return '<div class="row-between" style="padding:6px 0"><span class="muted" style="font-size:.88rem">' + k + '</span><span style="font-weight:600;font-size:.92rem;text-align:right">' + v + '</span></div>'; }

  function quoteBindings() {
    root.querySelectorAll("[data-veh]").forEach(function (b) { b.addEventListener("click", function () { wiz.vehicleId = b.getAttribute("data-veh"); render(); }); });
    root.querySelectorAll("[data-cover]").forEach(function (b) { b.addEventListener("click", function () { wiz.coverageId = b.getAttribute("data-cover"); render(); }); });
    root.querySelectorAll("[data-dur]").forEach(function (b) { b.addEventListener("click", function () { wiz.months = +b.getAttribute("data-dur"); render(); }); });
    root.querySelectorAll("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { wiz.sort = b.getAttribute("data-sort"); render(); }); });
    root.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { wiz.step = +b.getAttribute("data-next"); render(); }); });
    root.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { wiz.step = +b.getAttribute("data-prev"); render(); }); });
    root.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-pick");
        var v = Store.vehicle(wiz.vehicleId);
        var offers = PRICING.computeQuotes(v, wiz.coverageId, wiz.months);
        wiz.offer = offers.filter(function (o) { return o.insurerId === id; })[0];
        wiz.step = 3; render();
      });
    });
    root.querySelectorAll("[data-pay]").forEach(function (b) { b.addEventListener("click", function () { wiz.payMethod = b.getAttribute("data-pay"); render(); }); });
    var payBtn = document.getElementById("payBtn");
    if (payBtn) payBtn.addEventListener("click", processPayment);
  }
  function processPayment() {
    var btn = document.getElementById("payBtn");
    btn.classList.add("is-loading");
    btn.innerHTML = I("refresh", 18) + " Traitement du paiement…";
    setTimeout(function () {
      var c = Store.createContract(wiz.offer, wiz.vehicleId, wiz.payMethod);
      UI.toast("Paiement réussi — contrat généré !", "success");
      var id = c.id; wiz = null; nav("#contract/" + id);
    }, 1700);
  }

  /* ------------------------------------------------------------- Contracts */
  function viewContracts(user) {
    var contracts = Store.contracts();
    var active = contracts.filter(function (c) { return c.status === "active"; });
    var expired = contracts.filter(function (c) { return c.status !== "active"; });
    var content =
      '<div class="hello"><div><h2>Mes contrats</h2><p class="muted">' + contracts.length + ' contrat(s) au total.</p></div>' +
      '<a href="#quote" class="btn btn-accent">' + I("plus", 18) + ' Nouveau</a></div>' +
      (contracts.length ? (
        '<h3 style="margin:6px 0 12px;font-size:1.05rem">Actifs</h3>' +
        (active.length ? '<div class="stack" style="--gap:12px">' + active.map(contractFull).join("") + '</div>' : '<p class="muted">Aucun contrat actif.</p>') +
        (expired.length ? '<h3 style="margin:24px 0 12px;font-size:1.05rem">Expirés / archivés</h3><div class="stack" style="--gap:12px">' + expired.map(contractFull).join("") + '</div>' : "")
      ) : emptyState("file", "Aucun contrat", "Souscrivez une assurance pour voir vos contrats ici.", "#quote", "Demander un devis"));
    shell({ title: "Contrats", active: "contracts", content: content });
  }
  function contractFull(c) {
    var ins = PRICING.INSURERS.filter(function (x) { return x.id === c.insurerId; })[0] || { accent: "#1F7A8C" };
    var v = Store.vehicle(c.vehicleId) || {};
    var days = UI.daysBetween(new Date(), c.endDate);
    return '<a href="#contract/' + c.id + '" class="card card-hover" style="display:block;text-decoration:none;color:inherit"><div class="contract-card">' +
      '<div class="cc-head"><span class="cc-logo" style="background:' + ins.accent + '">' + esc((c.insurer || "?").slice(0, 1)) + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:700">' + esc(c.insurer) + ' · ' + esc(c.coverageName) + '</div>' +
      '<div class="muted" style="font-size:.85rem">' + esc(v.brand + " " + v.model) + ' · ' + esc(v.plate || "") + ' · N° ' + esc(c.number) + '</div></div>' +
      '<span class="badge ' + (c.status === "active" ? "badge-success" : "badge-danger") + '"><span class="dot"></span>' + (c.status === "active" ? "Actif" : "Expiré") + '</span></div>' +
      '<div class="cc-meta"><div class="m"><div class="k">Prime</div><div class="val">' + fcfa(c.price) + '</div></div>' +
      '<div class="m"><div class="k">Échéance</div><div class="val">' + fdate(c.endDate) + '</div></div>' +
      '<div class="m"><div class="k">Statut</div><div class="val">' + (days > 0 ? days + " j restants" : "Expiré") + '</div></div></div>' +
      '</div></a>';
  }

  function viewContract(id) {
    var c = Store.contracts().filter(function (x) { return x.id === id; })[0];
    if (!c) return shell({ title: "Contrat", active: "contracts", content: emptyState("file", "Contrat introuvable", "", "#contracts", "Retour aux contrats") });
    var v = Store.vehicle(c.vehicleId) || {};
    var ins = PRICING.INSURERS.filter(function (x) { return x.id === c.insurerId; })[0] || { accent: "#1F7A8C" };
    var days = UI.daysBetween(new Date(), c.endDate);
    var verifyUrl = location.origin + location.pathname.replace(/[^/]*$/, "") + "verify.html?n=" + encodeURIComponent(c.number) + "&t=" + encodeURIComponent(c.verifyToken);

    var content =
      '<a href="#contracts" class="btn btn-ghost btn-sm" style="margin-bottom:16px">' + I("arrowLeft", 16) + ' Retour</a>' +
      (c.status === "active" && days <= 30 ? expiringBanner(c) : "") +
      '<div class="doc"><div class="doc-head"><div class="row" style="gap:12px"><span class="cc-logo" style="background:rgba(255,255,255,.2)">' + I("shield", 24) + '</span>' +
        '<div><div style="font-size:.78rem;opacity:.85">Attestation d\'assurance</div><h3>' + esc(c.coverageName) + '</h3></div></div>' +
        '<span class="badge" style="background:rgba(255,255,255,.2);color:#fff"><span class="dot"></span>' + (c.status === "active" ? "Valide" : "Expiré") + '</span></div>' +
      '<div class="doc-body"><div class="doc-grid">' +
        di("N° de contrat", esc(c.number)) +
        di("Assureur", esc(c.insurer)) +
        di("Assuré", esc(Store.currentUser().name)) +
        di("Véhicule", esc(v.brand + " " + v.model + " (" + v.year + ")")) +
        di("Immatriculation", esc(v.plate)) +
        di("Prime payée", fcfa(c.price)) +
        di("Prise d'effet", fdate(c.startDate)) +
        di("Échéance", fdate(c.endDate)) +
      '</div>' +
      '<div class="doc-qr"><div id="qrSlot"></div><div style="flex:1;min-width:160px"><div style="font-weight:700">Vérification du contrat</div>' +
        '<p class="muted" style="font-size:.85rem;margin:4px 0 8px">Scannez le QR code ou utilisez le code ci-dessous sur la page de vérification publique.</p>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap"><span class="badge badge-brand mono">' + esc(c.verifyToken) + '</span>' +
        '<a href="' + verifyUrl + '" target="_blank" class="btn btn-ghost btn-sm">' + I("qr", 15) + ' Vérifier</a></div></div></div>' +
      '<div class="row" style="gap:10px;margin-top:18px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="dlBtn">' + I("download", 18) + ' Télécharger le PDF</button>' +
        '<button class="btn btn-ghost" id="waBtn">' + I("whatsapp", 18) + ' Envoyer sur WhatsApp</button>' +
        (c.status !== "active" || days <= 30 ? '<button class="btn btn-accent" id="renewBtn">' + I("refresh", 18) + ' Renouveler</button>' : "") +
        '<a href="#claim-new" class="btn btn-ghost">' + I("warning", 18) + ' Déclarer un sinistre</a>' +
      '</div></div></div>';

    shell({ title: "Contrat " + c.number, active: "contracts", content: content, onMount: function () {
      document.getElementById("qrSlot").appendChild(QR.render(verifyUrl, 150, c.verifyToken));
      document.getElementById("dlBtn").addEventListener("click", function () { downloadContract(c, v); });
      document.getElementById("waBtn").addEventListener("click", function () { UI.toast("Contrat envoyé sur WhatsApp (simulé)", "success"); });
      var rb = document.getElementById("renewBtn");
      if (rb) rb.addEventListener("click", function () {
        UI.modal({ title: "Renouveler le contrat", body: '<p>Renouveler <b>' + esc(c.number) + '</b> pour <b>' + c.months + ' mois</b> au tarif de <b>' + fcfa(c.price) + '</b> ?</p>',
          foot: '<button class="btn btn-ghost" data-close style="flex:1">Annuler</button><button class="btn btn-accent" id="doRenew" style="flex:1">Confirmer & payer</button>',
          onMount: function (bd, close) { bd.querySelector("#doRenew").addEventListener("click", function () { var nc = Store.renewContract(c.id); close(); UI.toast("Contrat renouvelé ✅", "success"); nav("#contract/" + nc.id); }); } });
      });
    }});
  }
  function di(k, v) { return '<div class="di"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function downloadContract(c, v) {
    var u = Store.currentUser();
    var txt = "ASSUR CHAP — ATTESTATION D'ASSURANCE AUTOMOBILE\n" +
      "==================================================\n\n" +
      "N° de contrat : " + c.number + "\nAssureur : " + c.insurer + "\nFormule : " + c.coverageName + "\n\n" +
      "Assuré : " + u.name + "\nEmail : " + u.email + "\nTéléphone : " + u.phone + "\n\n" +
      "Véhicule : " + v.brand + " " + v.model + " (" + v.year + ")\nImmatriculation : " + v.plate + "\nN° de châssis : " + (v.vin || "—") + "\n\n" +
      "Prime payée : " + fcfa(c.price) + "\nPrise d'effet : " + fdate(c.startDate) + "\nÉchéance : " + fdate(c.endDate) + "\n\n" +
      "Code de vérification : " + c.verifyToken + "\nVérifiez sur : verify.html?n=" + c.number + "&t=" + c.verifyToken + "\n\n" +
      "Signé électroniquement · Horodaté le " + new Date().toLocaleString("fr-FR") + "\n(Document de démonstration — Assur Chap MVP)";
    var blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "AssurChap-" + c.number + ".txt"; a.click();
    UI.toast("Contrat téléchargé", "success");
  }

  /* ---------------------------------------------------------------- Claims */
  function viewClaims(user) {
    var claims = Store.claims();
    var content =
      '<div class="hello"><div><h2>Sinistres</h2><p class="muted">Déclarez et suivez vos sinistres en temps réel.</p></div>' +
      '<a href="#claim-new" class="btn btn-accent">' + I("plus", 18) + ' Déclarer</a></div>' +
      (claims.length ? '<div class="stack" style="--gap:14px">' + claims.map(claimCard).join("") + '</div>'
        : emptyState("warning", "Aucun sinistre", "Espérons que ça dure ! En cas d'accident, déclarez-le ici.", "#claim-new", "Déclarer un sinistre"));
    shell({ title: "Sinistres", active: "claims", content: content });
  }
  function claimCard(c) {
    var v = Store.vehicle(c.vehicleId) || {};
    return '<div class="card"><div class="row-between" style="flex-wrap:wrap;gap:10px"><div class="row"><span class="icon-tile accent">' + I("warning", 22) + '</span>' +
      '<div><div style="font-weight:700">' + esc(c.type) + ' · ' + esc(v.brand + " " + v.model) + '</div><div class="muted" style="font-size:.85rem">' + fdate(c.createdAt) + ' · ' + esc(c.location || "—") + '</div></div></div>' +
      '<span class="badge badge-warning"><span class="dot"></span>' + esc(c.status) + '</span></div>' +
      '<p class="soft" style="margin:12px 0;font-size:.92rem">' + esc(c.description) + '</p>' +
      '<div class="timeline" style="margin-top:8px">' + (c.updates || []).map(function (u, i, arr) {
        return '<div class="tl-item ' + (i < arr.length - 1 ? "" : "") + '"><div style="font-weight:600;font-size:.9rem">' + esc(u.label) + '</div><div class="muted" style="font-size:.8rem">' + fdate(u.date, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + '</div></div>';
      }).join("") + '</div></div>';
  }
  function viewClaimNew(user) {
    var contracts = Store.contracts().filter(function (c) { return c.status === "active"; });
    var content =
      '<a href="#claims" class="btn btn-ghost btn-sm" style="margin-bottom:16px">' + I("arrowLeft", 16) + ' Retour</a>' +
      '<div class="wizard-head"><h2>Déclarer un sinistre</h2><p class="muted">L\'assistant IA analyse votre dossier pour accélérer l\'indemnisation.</p></div>' +
      (contracts.length ?
      '<form id="clForm" class="card" style="max-width:680px"><div class="form-grid">' +
        field2("Contrat concerné", '<select class="select" name="contractId">' + contracts.map(function (c) { var v = Store.vehicle(c.vehicleId) || {}; return '<option value="' + c.id + '">' + esc(c.number + " · " + v.brand + " " + v.model) + '</option>'; }).join("") + '</select>', "full") +
        field2("Type de sinistre", select("type", ["Collision", "Vol", "Incendie", "Bris de glace", "Vandalisme", "Catastrophe naturelle"])) +
        field2("Localisation (GPS)", '<div class="input-group"><span class="ig-icon">' + I("location", 18) + '</span><input class="input" name="location" placeholder="Abidjan, Cocody" /></div>') +
        field2("Description de l\'accident", '<textarea class="textarea" name="description" placeholder="Décrivez les circonstances…" required></textarea>', "full") +
      '</div>' +
      '<div class="upload-zone" id="claimUpload" style="margin-top:16px"><span class="icon-tile lg">' + I("camera", 24) + '</span><div style="font-weight:700">Ajouter photos / vidéos</div><div class="muted" style="font-size:.86rem;margin-top:2px">Photos des dégâts, vidéos, constat…</div></div>' +
      '<div id="claimFiles" class="muted" style="font-size:.85rem;margin-top:10px"></div>' +
      '<button class="btn btn-primary btn-block btn-lg" style="margin-top:18px">' + I("warning", 18) + ' Envoyer la déclaration</button></form>'
      : emptyState("file", "Aucun contrat actif", "Vous devez avoir un contrat actif pour déclarer un sinistre.", "#quote", "Souscrire une assurance"));
    shell({ title: "Nouveau sinistre", active: "claims", content: content, onMount: function () {
      var up = document.getElementById("claimUpload"), nbFiles = 0;
      if (up) up.addEventListener("click", function () { nbFiles += Math.floor(Math.random() * 2) + 1; document.getElementById("claimFiles").innerHTML = I("checkCircle", 15) + " " + nbFiles + " fichier(s) ajouté(s) · analysés par l'IA (aucune fraude détectée)"; });
      var form = document.getElementById("clForm");
      if (form) form.addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target; var ct = Store.contracts().filter(function (x) { return x.id === f.contractId.value; })[0];
        Store.addClaim({ contractId: f.contractId.value, vehicleId: ct ? ct.vehicleId : null, type: f.type.value, location: f.location.value.trim(), description: f.description.value.trim(), photos: nbFiles });
        UI.toast("Sinistre déclaré — suivi disponible", "success"); nav("#claims");
      });
    }});
  }

  /* ------------------------------------------------------------- Assistant */
  function viewAssistant() {
    var content =
      '<div class="card" style="max-width:760px;margin:0 auto"><div class="row" style="gap:12px;margin-bottom:8px"><span class="icon-tile accent lg">' + I("robot", 26) + '</span>' +
      '<div><h3>Assistant Assur Chap</h3><div class="muted" style="font-size:.86rem">' + I("checkCircle", 13) + ' En ligne 24/7 · FR & EN</div></div></div>' +
      '<div class="chat"><div class="chat-log" id="chatLog"></div>' +
      '<div class="chat-suggest" id="chatSuggest"></div>' +
      '<form class="chat-input" id="chatForm"><input class="input" id="chatInput" placeholder="Posez votre question…" autocomplete="off" /><button class="btn btn-primary btn-icon">' + I("arrowRight", 20) + '</button></form></div></div>';
    shell({ title: "Assistant IA", active: "assistant", content: content, onMount: initAssistant });
  }
  function initAssistant() {
    var log = document.getElementById("chatLog");
    function add(text, who) { var m = document.createElement("div"); m.className = "msg " + who; m.innerHTML = text; log.appendChild(m); log.scrollTop = log.scrollHeight; }
    function botReply(q) {
      var t = q.toLowerCase(); var r;
      if (/sinistre|accident|déclar/.test(t)) r = "Pour déclarer un sinistre : ajoutez les photos des dégâts, la localisation et une description. Je vérifie la cohérence et accélère votre dossier. Voulez-vous que je vous y emmène ? <a href='#claim-new'>Déclarer un sinistre</a>.";
      else if (/tous risques|tiers|formule|garantie|couverture/.test(t)) r = "3 formules : <b>Tiers</b> (responsabilité civile), <b>Tiers+</b> (vol, incendie, bris de glace) et <b>Tous Risques</b> (dommages tous accidents + assistance complète). Pour un véhicule récent ou de valeur, je recommande Tous Risques.";
      else if (/prix|tarif|coût|combien|payer/.test(t)) r = "Le tarif dépend du véhicule, de sa valeur, de l'usage et de la durée (1 à 12 mois). Lancez un <a href='#quote'>devis</a> : je compare instantanément 6 assureurs pour vous.";
      else if (/paiement|orange|wave|mtn|moov|carte/.test(t)) r = "Vous pouvez payer par Orange Money, MTN MoMo, Moov Money, Wave, Visa ou Mastercard. Le contrat est généré immédiatement après paiement.";
      else if (/renouvel/.test(t)) r = "Je vous préviens 30, 15, 7 et 1 jour avant l'échéance. Le renouvellement se fait en un clic depuis votre contrat.";
      else if (/parrain|code|cashback/.test(t)) r = "Partagez votre code de parrainage : vous gagnez du cashback et vos filleuls une réduction. Voir <a href='#referral'>Parrainage</a>.";
      else if (/bonjour|salut|hello|hi/.test(t)) r = "Bonjour 👋 Je suis l'assistant Assur Chap. Je peux vous aider à choisir une formule, obtenir un devis, déclarer un sinistre ou comprendre vos garanties.";
      else r = "Bonne question ! Je peux vous aider sur : les formules d'assurance, les tarifs, le paiement, les sinistres et le renouvellement. En production, je suis propulsé par l'IA (OpenAI) pour des réponses encore plus précises.";
      setTimeout(function () { add(r, "bot"); }, 450);
    }
    var suggestions = ["Quelle formule choisir ?", "Comment déclarer un sinistre ?", "Quels modes de paiement ?", "Comment renouveler ?"];
    document.getElementById("chatSuggest").innerHTML = suggestions.map(function (s) { return '<button class="chip" data-s="' + esc(s) + '">' + s + '</button>'; }).join("");
    root.querySelectorAll("[data-s]").forEach(function (b) { b.addEventListener("click", function () { var q = b.getAttribute("data-s"); add(esc(q), "me"); botReply(q); }); });
    document.getElementById("chatForm").addEventListener("submit", function (e) { e.preventDefault(); var inp = document.getElementById("chatInput"); var q = inp.value.trim(); if (!q) return; add(esc(q), "me"); inp.value = ""; botReply(q); });
    add("Bonjour 👋 Je suis l'assistant <b>Assur Chap</b>. Comment puis-je vous aider aujourd'hui ?", "bot");
  }

  /* ------------------------------------------------------------- Referral */
  function viewReferral(user) {
    var link = location.origin + location.pathname.replace(/[^/]*$/, "") + "app.html#signup?ref=" + user.referralCode;
    var content =
      '<div class="hello"><div><h2>Parrainage</h2><p class="muted">Gagnez des récompenses en invitant vos proches.</p></div></div>' +
      '<div class="grid" style="grid-template-columns:1.3fr 1fr;gap:18px">' +
      '<div class="card card-pad-lg"><h3 style="margin-bottom:14px">Votre code de parrainage</h3>' +
        '<div class="ref-code"><span class="code">' + esc(user.referralCode) + '</span><button class="btn btn-primary btn-sm" id="copyCode">' + I("file", 15) + ' Copier</button></div>' +
        '<div class="field" style="margin-top:16px"><span class="label">Votre lien personnel</span><div class="input-group"><input class="input" id="refLink" readonly value="' + esc(link) + '" /></div></div>' +
        '<div class="row" style="gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-soft" id="copyLink">' + I("file", 16) + ' Copier le lien</button>' +
        '<button class="btn btn-ghost" id="shareWa">' + I("whatsapp", 16) + ' Partager sur WhatsApp</button></div></div>' +
      '<div class="card card-pad-lg"><h3 style="margin-bottom:14px">Vos récompenses</h3>' +
        rewardRow("wallet", "Cashback gagné", "12 500 FCFA") +
        rewardRow("users", "Filleuls actifs", "5") +
        rewardRow("gift", "Réductions disponibles", "2") +
        '<div class="card card-2" style="margin-top:14px;text-align:center"><div class="muted" style="font-size:.85rem">Prochain palier</div><b>10 filleuls → 1 mois offert</b>' +
        '<div class="progress" style="margin-top:10px"><span style="width:50%"></span></div></div></div>' +
      '</div>';
    shell({ title: "Parrainage", active: "referral", content: content, onMount: function () {
      document.getElementById("copyCode").addEventListener("click", function () { UI.copy(user.referralCode); });
      document.getElementById("copyLink").addEventListener("click", function () { UI.copy(link); });
      document.getElementById("shareWa").addEventListener("click", function () { window.open("https://wa.me/?text=" + encodeURIComponent("Assure ton véhicule avec Assur Chap ! Utilise mon code " + user.referralCode + " : " + link), "_blank"); });
    }});
  }
  function rewardRow(icon, label, value) { return '<div class="list-row"><span class="icon-tile" style="width:40px;height:40px">' + I(icon, 20) + '</span><span style="flex:1;font-weight:500">' + label + '</span><b>' + value + '</b></div>'; }

  /* --------------------------------------------------------- Notifications */
  function viewNotifications(user) {
    var notifs = Store.notifications();
    Store.markAllRead();
    var content =
      '<div class="hello"><div><h2>Notifications</h2><p class="muted">WhatsApp · SMS · Email · Push</p></div></div>' +
      (notifs.length ? '<div class="card">' + notifs.map(function (n) {
        return '<div class="notif-item ' + (n.read ? "" : "unread") + '"><span class="icon-tile" style="width:38px;height:38px">' + I(n.icon || "bell", 18) + '</span>' +
          '<div style="flex:1"><div style="font-weight:600">' + esc(n.title) + '</div><div class="muted" style="font-size:.86rem">' + esc(n.body) + '</div></div>' +
          '<span class="muted" style="font-size:.76rem;white-space:nowrap">' + fdate(n.createdAt, { day: "2-digit", month: "short" }) + '</span></div>';
      }).join("") + '</div>' : emptyState("bell", "Aucune notification", "Vos alertes apparaîtront ici.", "#dashboard", "Retour"));
    shell({ title: "Notifications", active: "dashboard", content: content });
  }

  /* --------------------------------------------------------------- Profile */
  function viewProfile(user) {
    var content =
      '<div class="hello"><div><h2>Profil</h2><p class="muted">Gérez votre compte et vos préférences.</p></div></div>' +
      '<div class="grid" style="grid-template-columns:1fr 1fr;gap:18px">' +
      '<div class="card card-pad-lg"><div class="row" style="gap:14px;margin-bottom:18px"><span class="avatar" style="width:56px;height:56px;font-size:1.2rem">' + initials(user.name) + '</span>' +
        '<div><div style="font-weight:700;font-size:1.1rem">' + esc(user.name) + '</div><div class="muted">' + esc(user.email) + '</div><span class="badge badge-brand" style="margin-top:6px">' + esc(user.role) + '</span></div></div>' +
        '<form id="profForm" class="stack" style="--gap:14px">' +
        field2("Nom complet", '<input class="input" name="name" value="' + esc(user.name) + '" />') +
        field2("Email", '<input class="input" name="email" type="email" value="' + esc(user.email) + '" />') +
        field2("Téléphone", '<input class="input" name="phone" value="' + esc(user.phone || "") + '" />') +
        '<button class="btn btn-primary">' + I("check", 16) + ' Enregistrer</button></form></div>' +
      '<div class="stack" style="--gap:18px">' +
        '<div class="card"><h3 style="margin-bottom:12px;font-size:1.05rem">Préférences</h3>' +
          prefRow("Thème sombre", '<label class="switch"><input type="checkbox" id="prefTheme" ' + (UI.Theme.get() === "dark" ? "checked" : "") + '><span class="track"></span></label>') +
          prefRow("Langue", '<button class="btn btn-ghost btn-sm" id="prefLang">' + I18N.t("lang") + '</button>') +
          prefRow("Notifications WhatsApp", '<label class="switch"><input type="checkbox" checked><span class="track"></span></label>') +
          prefRow("Renouvellement auto", '<label class="switch"><input type="checkbox" checked><span class="track"></span></label>') +
        '</div>' +
        '<div class="card"><h3 style="margin-bottom:12px;font-size:1.05rem">Sécurité & données</h3>' +
          '<button class="btn btn-ghost btn-block" style="justify-content:flex-start" onclick="UI.toast(\'2FA OTP — à brancher (SMS/WhatsApp)\',\'info\')">' + I("lock", 18) + ' Activer la double authentification</button>' +
          '<button class="btn btn-ghost btn-block" style="justify-content:flex-start;margin-top:8px" id="resetData">' + I("refresh", 18) + ' Réinitialiser les données démo</button></div>' +
      '</div></div>';
    shell({ title: "Profil", active: "dashboard", content: content, onMount: function () {
      document.getElementById("profForm").addEventListener("submit", function (e) { e.preventDefault(); var f = e.target; user.name = f.name.value; user.email = f.email.value; user.phone = f.phone.value; Store._save(); UI.toast("Profil mis à jour", "success"); render(); });
      document.getElementById("prefTheme").addEventListener("change", function () { UI.Theme.toggle(); render(); });
      document.getElementById("prefLang").addEventListener("click", function () { I18N.toggle(); render(); });
      document.getElementById("resetData").addEventListener("click", function () { Store.reset(); UI.toast("Données démo réinitialisées", "info"); nav("#dashboard"); });
    }});
  }
  function prefRow(label, control) { return '<div class="list-row"><span style="flex:1;font-weight:500">' + label + '</span>' + control + '</div>'; }

  /* ------------------------------------------------------------ Empty state */
  function emptyState(icon, title, desc, href, cta) {
    return '<div class="card"><div class="empty"><span class="icon-tile lg">' + I(icon, 26) + '</span><h3>' + title + '</h3>' +
      (desc ? '<p class="muted" style="margin-top:6px;max-width:36ch;margin-inline:auto">' + desc + '</p>' : "") +
      (href ? '<a href="' + href + '" class="btn btn-primary" style="margin-top:16px">' + cta + '</a>' : "") + '</div></div>';
  }

  // Boot
  render();
})();
