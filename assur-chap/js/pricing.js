/* ==========================================================================
   Assur Chap — Catalogue assureurs, moteur de tarification & comparateur
   (logique simulée — à remplacer par l'API assureurs en production)
   ========================================================================== */
(function (global) {
  "use strict";

  // Formules de couverture
  var COVERAGES = {
    tiers:   { id: "tiers",   name: "Responsabilité Civile (Tiers)", short: "Tiers",
      guarantees: ["Responsabilité civile", "Défense & recours", "Assistance de base"] },
    tiers_plus: { id: "tiers_plus", name: "Tiers Étendu", short: "Tiers+",
      guarantees: ["Responsabilité civile", "Vol & incendie", "Bris de glace", "Défense & recours", "Assistance 24/7"] },
    tous_risques: { id: "tous_risques", name: "Tous Risques", short: "Tous risques",
      guarantees: ["Responsabilité civile", "Dommages tous accidents", "Vol & incendie", "Bris de glace",
                   "Catastrophes naturelles", "Assistance 0 km", "Véhicule de remplacement"] }
  };

  // Assureurs partenaires (simulés)
  var INSURERS = [
    { id: "nsia",    name: "NSIA Assurances",   rating: 4.6, mult: 1.00, accent: "#1F7A8C", claimDays: 7,  desc: "Leader de la bancassurance en Afrique de l'Ouest." },
    { id: "sunu",    name: "SUNU Assurances",   rating: 4.4, mult: 0.92, accent: "#2d72b8", claimDays: 9,  desc: "Couverture panafricaine, bon rapport qualité-prix." },
    { id: "saham",   name: "Saham Assurance",   rating: 4.5, mult: 1.08, accent: "#7c4dff", claimDays: 6,  desc: "Service premium et indemnisation rapide." },
    { id: "axa",     name: "AXA Afrique",       rating: 4.7, mult: 1.20, accent: "#00008f", claimDays: 5,  desc: "Réseau international, garanties les plus complètes." },
    { id: "allianz", name: "Allianz Africa",    rating: 4.3, mult: 0.97, accent: "#003781", claimDays: 8,  desc: "Solidité financière et assistance étendue." },
    { id: "sanlam",  name: "Sanlam Assurances", rating: 4.2, mult: 0.88, accent: "#1f9d6b", claimDays: 10, desc: "Tarifs accessibles, idéal pour petits budgets." }
  ];

  var DURATIONS = [
    { months: 1,  label: "1 mois",  surcharge: 1.25 },
    { months: 3,  label: "3 mois",  surcharge: 1.12 },
    { months: 6,  label: "6 mois",  surcharge: 1.05 },
    { months: 12, label: "12 mois", surcharge: 1.00 }
  ];

  // Prime annuelle de base par formule (FCFA), avant multiplicateur assureur
  function annualBase(vehicle, coverageId) {
    var power = +vehicle.power || 7;          // puissance fiscale
    var value = +vehicle.value || 5000000;    // valeur du véhicule
    var rc = 28000 + power * 3600;            // responsabilité civile
    var base;
    if (coverageId === "tiers") base = rc;
    else if (coverageId === "tiers_plus") base = rc * 1.85 + value * 0.0055;
    else base = rc * 1.25 + value * 0.042;    // tous risques
    if (vehicle.usage === "professionnel") base *= 1.2;
    // Surprime véhicule ancien
    var age = (new Date().getFullYear()) - (+vehicle.year || new Date().getFullYear());
    if (age > 10) base *= 1.12; else if (age > 5) base *= 1.05;
    return base;
  }

  function franchise(coverageId, value) {
    if (coverageId === "tiers") return 0;
    if (coverageId === "tiers_plus") return 50000;
    return Math.max(75000, Math.round((+value || 0) * 0.01 / 1000) * 1000);
  }

  // Génère toutes les offres pour un véhicule, une formule et une durée
  function computeQuotes(vehicle, coverageId, months) {
    coverageId = coverageId || "tiers_plus";
    months = months || 12;
    var dur = DURATIONS.filter(function (d) { return d.months === months; })[0] || DURATIONS[3];
    var base = annualBase(vehicle, coverageId);
    var cov = COVERAGES[coverageId];
    var offers = INSURERS.map(function (ins) {
      var annual = base * ins.mult;
      var price = Math.round(annual * (months / 12) * dur.surcharge / 100) * 100;
      // Score IA : qualité de couverture vs prix (plus haut = meilleur rapport)
      var score = (ins.rating / 5) * 0.55 + (1 - (ins.mult - 0.85) / 0.4) * 0.45;
      return {
        insurerId: ins.id, insurer: ins.name, accent: ins.accent, rating: ins.rating,
        coverageId: coverageId, coverageName: cov.name, coverageShort: cov.short,
        guarantees: cov.guarantees, months: months, durationLabel: dur.label,
        price: price, annual: Math.round(annual / 100) * 100,
        franchise: franchise(coverageId, vehicle.value),
        claimDays: ins.claimDays, aiScore: Math.round(score * 100)
      };
    });
    return offers;
  }

  function sortOffers(offers, mode) {
    var a = offers.slice();
    if (mode === "coverage") a.sort(function (x, y) { return y.rating - x.rating || x.price - y.price; });
    else if (mode === "ai") a.sort(function (x, y) { return y.aiScore - x.aiScore; });
    else a.sort(function (x, y) { return x.price - y.price; }); // cheapest
    return a;
  }

  global.PRICING = {
    COVERAGES: COVERAGES, INSURERS: INSURERS, DURATIONS: DURATIONS,
    computeQuotes: computeQuotes, sortOffers: sortOffers,
    annualBase: annualBase, franchise: franchise
  };
})(window);
