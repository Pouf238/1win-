/* ==========================================================================
   Assur Chap — Landing page interactions
   ========================================================================== */
(function () {
  "use strict";
  UI.Theme.init();
  document.documentElement.setAttribute("lang", I18N.lang);

  // Logo marks + inline data-ic icons
  function fillIcons() {
    document.querySelectorAll("#logoMark, #logoMark2").forEach(function (el) { el.innerHTML = UI.icon("shield", 22); });
    document.querySelectorAll("[data-ic]").forEach(function (el) { el.innerHTML = UI.icon(el.getAttribute("data-ic"), el.classList.contains("tick") ? 15 : 16); });
  }

  // Theme + lang buttons
  function refreshToggleIcons() {
    document.getElementById("themeBtn").innerHTML = UI.icon(UI.Theme.get() === "dark" ? "sun" : "moon", 18);
    document.getElementById("langBtn").innerHTML = '<span style="font-size:.78rem;font-weight:700">' + I18N.t("lang") + "</span>";
  }
  document.getElementById("themeBtn").addEventListener("click", function () { UI.Theme.toggle(); refreshToggleIcons(); });
  document.getElementById("langBtn").addEventListener("click", function () { I18N.toggle(); refreshToggleIcons(); });

  // Mobile menu
  var menuBtn = document.getElementById("menuBtn");
  if (menuBtn) {
    menuBtn.innerHTML = UI.icon("menu", 20);
    menuBtn.addEventListener("click", function () {
      UI.modal({
        title: "Menu",
        body: '<div class="stack" style="--gap:6px">' +
          ['#features|Fonctionnalités', '#how|Comment ça marche', '#pricing|Tarifs', '#partners|Partenaires', 'app.html#login|Se connecter']
            .map(function (x) { var p = x.split("|"); return '<a class="btn btn-ghost btn-block" href="' + p[0] + '" data-close>' + p[1] + '</a>'; }).join("") +
          '</div>'
      });
    });
  }

  // Features
  var FEATURES = [
    ["camera", "OCR & IA", "Photographiez votre carte grise : l'IA extrait et pré-remplit toutes les informations."],
    ["grid", "Comparateur", "Comparez instantanément plusieurs assureurs : prix, garanties, franchise."],
    ["wallet", "Mobile Money", "Orange Money, MTN, Moov, Wave, Visa, Mastercard. Paiement instantané."],
    ["file", "Contrat instantané", "Contrat PDF signé avec QR code sécurisé, généré et archivé automatiquement."],
    ["whatsapp", "Livraison multicanal", "Recevez votre contrat sur WhatsApp, par email et dans l'application."],
    ["robot", "Assistant IA 24/7", "Posez vos questions, déclarez un sinistre, comprenez vos garanties — en FR & EN."],
    ["refresh", "Renouvellement intelligent", "Rappels automatiques avant expiration et renouvellement en un clic."],
    ["gift", "Parrainage & récompenses", "Un code et un lien personnels. Gagnez cashback et réductions."],
    ["lock", "Sécurité & anti-fraude", "Détection des faux documents, chiffrement des données, conformité RGPD."]
  ];
  document.getElementById("featureGrid").innerHTML = FEATURES.map(function (f) {
    return '<article class="feature card card-hover"><span class="icon-tile">' + UI.icon(f[0], 24) +
      '</span><h3>' + f[1] + "</h3><p>" + f[2] + "</p></article>";
  }).join("");

  // Durations / pricing teaser (using a sample vehicle)
  var sample = { power: 8, value: 7500000, usage: "personnel", year: 2019 };
  var grid = document.getElementById("durationGrid");
  if (grid) {
    grid.innerHTML = PRICING.DURATIONS.map(function (d) {
      var offers = PRICING.sortOffers(PRICING.computeQuotes(sample, "tiers_plus", d.months), "cheapest");
      var from = offers[0].price;
      var best = d.months === 12;
      return '<div class="card card-hover ' + (best ? "" : "") + '" style="text-align:center;' + (best ? "border-color:var(--brand)" : "") + '">' +
        (best ? '<span class="badge badge-brand" style="margin-bottom:10px">Le plus avantageux</span>' : '<div style="height:26px"></div>') +
        '<div style="font-weight:700;font-size:1.05rem">' + d.label + '</div>' +
        '<div class="muted" style="font-size:.82rem;margin-top:2px">à partir de</div>' +
        '<div class="brand-blue" style="font-size:1.7rem;font-weight:800;letter-spacing:-.02em;margin-top:4px">' + UI.fcfa(from).replace(" FCFA", "") + '</div>' +
        '<div class="muted" style="font-size:.78rem">FCFA · Tiers Étendu</div>' +
        '<a href="app.html#signup" class="btn btn-soft btn-block btn-sm" style="margin-top:14px">Choisir</a></div>';
    }).join("");
  }

  // Animated counters
  function animateCounters() {
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = +el.getAttribute("data-count"); var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1200, start = performance.now();
      function tick(t) {
        var p = Math.min((t - start) / dur, 1); var ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease).toLocaleString("fr-FR") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { animateCounters(); io.disconnect(); } });
  }, { threshold: .4 });
  var statsEl = document.querySelector(".stats-grid");
  if (statsEl) io.observe(statsEl);

  document.getElementById("year").textContent = new Date().getFullYear();
  fillIcons();
  refreshToggleIcons();
  I18N.apply();
})();
