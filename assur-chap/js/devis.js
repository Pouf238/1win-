/* ASSUR CHAP — Devis & comparateur logic
   Pricing engine + multi-insurer comparator + OCR mock + checkout. */
(function () {
  "use strict";

  const state = {
    step: 1,
    vehicle: { make: "", model: "", year: "", value: 6500000, power: 7, fuel: "essence" },
    usage: "perso",
    history: 1,
    dur: 12,
    pay: "Orange Money",
    sort: "ai",
    offers: [],
    selected: null,
  };

  /* Partner insurers — base monthly rate factors & coverage profiles */
  const INSURERS = [
    { name: "Axa Côte d'Ivoire",  short: "AX", color: "linear-gradient(135deg,#2f6dff,#6a3cff)", rate: 0.0024, plan: "Tous risques",          cover: 95, rating: 4.8, deductible: 25000, feats: ["Tous risques", "Assistance 24/7 + remorquage", "Bris de glace inclus", "Franchise 25 000 FCFA"] },
    { name: "NSIA Assurances",    short: "NS", color: "linear-gradient(135deg,#00824b,#06b585)", rate: 0.0020, plan: "Tiers + Dommages",       cover: 78, rating: 4.3, deductible: 50000, feats: ["Tiers + Dommages", "Vol & Incendie", "Catastrophes naturelles", "Franchise 50 000 FCFA"] },
    { name: "Saham Assurance",    short: "SA", color: "linear-gradient(135deg,#ff7900,#ffb020)", rate: 0.0016, plan: "Responsabilité civile",  cover: 60, rating: 4.1, deductible: 0,     feats: ["Responsabilité civile", "Défense & recours", "Protection juridique", "Sans franchise"] },
    { name: "Sunu Assurances",    short: "SU", color: "linear-gradient(135deg,#e11d48,#fb7185)", rate: 0.0022, plan: "Confort",                 cover: 86, rating: 4.5, deductible: 35000, feats: ["Tous risques essentiels", "Assistance dépannage", "Conducteur protégé", "Franchise 35 000 FCFA"] },
    { name: "Allianz CI",         short: "AZ", color: "linear-gradient(135deg,#003781,#1b4ff0)", rate: 0.0026, plan: "Premium",                 cover: 98, rating: 4.7, deductible: 15000, feats: ["Tous risques premium", "Véhicule de remplacement", "Assistance 0 km mondiale", "Franchise 15 000 FCFA"] },
  ];

  const fmt = (n) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ");
  const lang = () => localStorage.getItem("ac-lang") || "fr";

  /* ---- Pricing engine ---- */
  function monthly(ins) {
    const val = Number(state.vehicle.value) || 6500000;
    const power = Number(state.vehicle.power) || 7;
    const usageF = state.usage === "pro" ? 1.18 : 1;
    const powerF = 1 + Math.max(0, power - 6) * 0.03;
    let base = val * ins.rate * usageF * powerF * state.history;
    base = Math.max(base, 6000); // floor
    return base;
  }
  function durationFactor(d) {
    // small discount for longer commitment
    return d >= 12 ? 0.9 : d >= 6 ? 0.95 : 1;
  }
  function total(ins) {
    return monthly(ins) * durationFactor(state.dur) * Number(state.dur);
  }

  function buildOffers() {
    state.offers = INSURERS.map((ins) => ({
      ins,
      monthly: monthly(ins),
      total: total(ins),
      score: ins.cover * 1.0 - (monthly(ins) / 1000) * 0.6 + ins.rating * 4, // AI score
    }));
  }

  function sortOffers(mode, btn) {
    state.sort = mode;
    document.querySelectorAll(".sort-pill").forEach((p) => p.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderOffers();
  }

  function renderOffers() {
    const list = document.getElementById("offersList");
    let arr = [...state.offers];
    if (state.sort === "price") arr.sort((a, b) => a.monthly - b.monthly);
    else if (state.sort === "cover") arr.sort((a, b) => b.ins.cover - a.ins.cover);
    else arr.sort((a, b) => b.score - a.score);

    const topId = state.sort === "ai" ? arr[0].ins.short : null;
    const L = lang();

    list.innerHTML = arr
      .map((o) => {
        const featured = o.ins.short === topId;
        const tag = featured
          ? `<span class="offer-tag">${L === "fr" ? "★ Recommandé par l'IA" : "★ AI recommended"}</span>`
          : "";
        const stars = "★★★★★".slice(0, Math.round(o.ins.rating)) + "☆☆☆☆☆".slice(0, 5 - Math.round(o.ins.rating));
        const feats = o.ins.feats
          .map(
            (f) =>
              `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg><span>${f}</span></li>`
          )
          .join("");
        const choose = L === "fr" ? "Choisir cette offre" : "Choose this offer";
        return `
        <div class="offer ${featured ? "featured" : ""}">
          ${tag}
          <div class="offer-head">
            <span class="offer-logo" style="background:${o.ins.color}">${o.ins.short}</span>
            <div><b>${o.ins.name}</b><small class="stars">${stars} ${o.ins.rating}</small></div>
          </div>
          <div class="offer-price">${fmt(o.monthly)} <span>FCFA / ${L === "fr" ? "mois" : "mo"}</span></div>
          <p class="hint" style="margin:4px 0 0">${L === "fr" ? "Total" : "Total"} ${state.dur} ${L === "fr" ? "mois" : "mo"} : <b>${fmt(o.total)} FCFA</b></p>
          <ul class="feat">${feats}</ul>
          <button class="btn ${featured ? "btn-grad" : "btn-ghost"} btn-block" onclick="AC.selectOffer('${o.ins.short}')">${choose}</button>
        </div>`;
      })
      .join("");
  }

  function selectOffer(short) {
    const o = state.offers.find((x) => x.ins.short === short);
    if (!o) return;
    state.selected = o;
    updateSummary();
    goStep(4);
  }

  /* ---- Summary ---- */
  function updateSummary() {
    const L = lang();
    const v = state.vehicle;
    const vehLabel = v.make || v.model ? `${v.make} ${v.model} ${v.year}`.trim() : "—";
    document.getElementById("sum_vehicle").textContent = vehLabel;
    document.getElementById("sum_usage").textContent = state.usage === "pro" ? (L === "fr" ? "Professionnel" : "Professional") : (L === "fr" ? "Personnel" : "Personal");
    document.getElementById("sum_dur").textContent = `${state.dur} ${L === "fr" ? "mois" : "months"}`;
    if (state.selected) {
      document.getElementById("sum_plan").textContent = state.selected.ins.name;
      document.getElementById("sum_total").textContent = fmt(state.selected.total) + " FCFA";
      document.getElementById("sum_note").textContent =
        L === "fr"
          ? `${fmt(state.selected.monthly)} FCFA / mois · ${state.selected.ins.plan}`
          : `${fmt(state.selected.monthly)} FCFA / mo · ${state.selected.ins.plan}`;
    } else {
      document.getElementById("sum_plan").textContent = "—";
      document.getElementById("sum_total").textContent = "—";
    }
  }

  /* ---- Navigation ---- */
  function readVehicle() {
    state.vehicle.make = val("f_make");
    state.vehicle.model = val("f_model");
    state.vehicle.year = val("f_year");
    state.vehicle.value = Number(val("f_value")) || state.vehicle.value;
    state.vehicle.power = Number(val("f_power")) || state.vehicle.power;
    state.vehicle.fuel = val("f_fuel");
  }
  const val = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : "");

  function validateStep1() {
    const required = ["f_make", "f_model", "f_year", "f_plate", "f_power", "f_value"];
    let ok = true;
    required.forEach((id) => {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        el.style.borderColor = "var(--coral-500)";
        ok = false;
      } else {
        el.style.borderColor = "";
      }
    });
    if (!ok) window.showToast(lang() === "fr" ? "Veuillez compléter les champs requis" : "Please complete required fields");
    return ok;
  }

  function goStep(n) {
    if (n === 2 && state.step === 1) {
      if (!validateStep1()) return;
      readVehicle();
    }
    if (n === 3) {
      state.history = Number(val("f_history")) || 1;
      buildOffers();
      renderOffers();
      const L = lang();
      document.getElementById("resultsSummary").textContent =
        `${INSURERS.length} ${L === "fr" ? "assureurs comparés" : "insurers compared"} · ${state.dur} ${L === "fr" ? "mois" : "months"}`;
    }
    state.step = n;
    document.querySelectorAll(".step-pane").forEach((p) =>
      p.classList.toggle("active", Number(p.dataset.pane) === n)
    );
    document.querySelectorAll(".stepper .st").forEach((s) => {
      const sn = Number(s.dataset.step);
      s.classList.toggle("active", sn === n);
      s.classList.toggle("done", sn < n);
    });
    updateSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---- Generic pick (pills) ---- */
  function pick(el, group, value) {
    const parent = el.parentElement;
    parent.querySelectorAll(".opt, .pay-opt").forEach((o) => o.classList.remove("sel"));
    el.classList.add("sel");
    if (group === "usage") state.usage = value;
    if (group === "dur") state.dur = Number(value);
    if (group === "pay") {
      state.pay = value;
      const isMobile = ["Orange Money", "MTN MoMo", "Moov Money", "Wave"].includes(value);
      document.getElementById("phoneField").style.display = isMobile ? "" : "none";
    }
    updateSummary();
  }

  /* ---- OCR simulation ---- */
  function simulateOCR() {
    const status = document.getElementById("ocrStatus");
    status.classList.remove("hidden");
    const L = lang();
    status.style.background = "rgba(47,109,255,.1)";
    status.style.color = "var(--brand-600)";
    status.innerHTML = `<span class="spinner"></span><span>${L === "fr" ? "Analyse du document par l'IA…" : "AI analysing document…"}</span>`;
    setTimeout(() => {
      // Fill demo data
      set("f_make", "Toyota"); set("f_model", "Corolla"); set("f_year", "2019");
      set("f_plate", "AA-7421-CI"); set("f_vin", "JTDBR32E830098765"); set("f_power", "7");
      set("f_value", "6500000");
      document.getElementById("f_fuel").value = "essence";
      status.style.background = "rgba(6,181,133,.1)";
      status.style.color = "var(--accent-600)";
      status.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg><span>${L === "fr" ? "Document vérifié & authentique — champs pré-remplis" : "Document verified & authentic — fields pre-filled"}</span>`;
      window.showToast(L === "fr" ? "Informations extraites avec succès" : "Information extracted successfully");
    }, 1600);
  }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  /* ---- Payment + contract generation ---- */
  function pay() {
    const btn = document.getElementById("payBtn");
    const label = document.getElementById("payBtnLabel");
    const L = lang();
    const mobile = ["Orange Money", "MTN MoMo", "Moov Money", "Wave"].includes(state.pay);
    if (mobile && !val("f_phone")) {
      document.getElementById("f_phone").style.borderColor = "var(--coral-500)";
      window.showToast(L === "fr" ? "Entrez votre numéro Mobile Money" : "Enter your Mobile Money number");
      return;
    }
    btn.disabled = true;
    btn.style.opacity = ".75";
    label.innerHTML = `<span class="spinner" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> ${L === "fr" ? "Paiement en cours…" : "Processing…"}`;
    setTimeout(() => {
      generateContract();
      goStep(5);
      btn.disabled = false;
      btn.style.opacity = "";
      label.textContent = L === "fr" ? "Payer maintenant" : "Pay now";
    }, 1900);
  }

  function generateContract() {
    const o = state.selected;
    const v = state.vehicle;
    const num = "AC-2026-" + Math.floor(10000 + Math.random() * 89999);
    const until = new Date();
    until.setMonth(until.getMonth() + state.dur);
    const L = lang();
    document.getElementById("r_contract").textContent = num;
    document.getElementById("r_insurer").textContent = o ? o.ins.name : "—";
    document.getElementById("r_vehicle").textContent = `${v.make} ${v.model} ${v.year}`.trim();
    document.getElementById("r_until").textContent = until.toLocaleDateString(L === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" });
    document.getElementById("qrBox").innerHTML = qrSVG(num);
    try { localStorage.setItem("ac-last-contract", num); } catch (e) {}
  }

  /* Decorative deterministic QR-like SVG (not a real QR, visual placeholder) */
  function qrSVG(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const n = 11, cell = 100 / n;
    let rects = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        const corner =
          (x < 3 && y < 3) || (x > n - 4 && y < 3) || (x < 3 && y > n - 4);
        const on = corner ? (x === 0 || x === 2 || x === n - 1 || x === n - 3 || y === 0 || y === 2 || y === n - 1 || y === n - 3 || (x === 1 && y === 1) || (x === n - 2 && y === 1) || (x === 1 && y === n - 2)) : (h % 100) < 48;
        if (on) rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="1"/>`;
      }
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#0c1430">${rects}</svg>`;
  }

  // expose
  window.AC = { goStep, pick, sortOffers, selectOffer, simulateOCR, pay };
})();
