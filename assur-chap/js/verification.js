/* ASSUR CHAP — public contract verification (demo registry) */
(function () {
  "use strict";

  const REGISTRY = {
    "AC-2026-08421": { status: "valid",   insurer: "Axa Côte d'Ivoire", plan: "Tous risques",        vehicle: "Toyota Corolla 2019", plate: "AA-7421-CI", holder: "Awa K.", until: "12 juillet 2026" },
    "AC-2026-07310": { status: "valid",   insurer: "NSIA Assurances",   plan: "Tiers + Dommages",     vehicle: "Hyundai i10 2021",    plate: "BB-1188-CI", holder: "Awa K.", until: "03 mars 2027" },
    "AC-2025-05122": { status: "expired", insurer: "Saham Assurance",   plan: "Responsabilité civile", vehicle: "Peugeot 206 2014",    plate: "CC-9034-CI", holder: "Awa K.", until: "20 février 2026" },
  };

  function lang() { return localStorage.getItem("ac-lang") || "fr"; }

  function verify() {
    const num = (document.getElementById("vNumber").value || "").trim().toUpperCase();
    const box = document.getElementById("vResult");
    const L = lang();
    if (!num) {
      window.showToast(L === "fr" ? "Entrez un numéro de contrat" : "Enter a contract number");
      return;
    }
    box.classList.remove("hidden");
    box.innerHTML = `<div style="display:flex;gap:10px;align-items:center;color:var(--brand-600);font-weight:700"><span class="spinner"></span>${L === "fr" ? "Vérification dans le registre…" : "Checking the registry…"}</div>`;

    setTimeout(() => {
      const rec = REGISTRY[num];
      if (!rec) return renderInvalid(box, num, L);
      if (rec.status === "expired") return renderExpired(box, num, rec, L);
      renderValid(box, num, rec, L);
    }, 900);
  }

  function detail(label, value) {
    return `<div class="vd"><small>${label}</small><b>${value}</b></div>`;
  }

  function renderValid(box, num, rec, L) {
    box.innerHTML = `
      <div class="verify-banner vb-valid">
        <span class="vbic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 7v6c0 5 8 9 8 9s8-4 8-9V7z"/><path d="m9 12 2 2 4-4"/></svg></span>
        <div><b>${L === "fr" ? "Contrat valide & actif" : "Valid & active contract"}</b><small>${L === "fr" ? "Authentifié dans le registre Assur Chap" : "Authenticated in the Assur Chap registry"}</small></div>
      </div>
      <div class="verify-detail">
        ${detail(L === "fr" ? "N° de contrat" : "Contract no.", num)}
        ${detail(L === "fr" ? "Assureur" : "Insurer", rec.insurer)}
        ${detail(L === "fr" ? "Formule" : "Plan", rec.plan)}
        ${detail(L === "fr" ? "Titulaire" : "Holder", rec.holder)}
        ${detail(L === "fr" ? "Véhicule" : "Vehicle", rec.vehicle)}
        ${detail(L === "fr" ? "Immatriculation" : "Plate", rec.plate)}
        ${detail(L === "fr" ? "Valable jusqu'au" : "Valid until", rec.until)}
        ${detail(L === "fr" ? "Statut" : "Status", "✅ " + (L === "fr" ? "En vigueur" : "In force"))}
      </div>`;
  }

  function renderExpired(box, num, rec, L) {
    box.innerHTML = `
      <div class="verify-banner vb-invalid">
        <span class="vbic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg></span>
        <div><b>${L === "fr" ? "Contrat expiré" : "Contract expired"}</b><small>${L === "fr" ? "Ce contrat existe mais n'est plus en vigueur" : "This contract exists but is no longer in force"}</small></div>
      </div>
      <div class="verify-detail">
        ${detail(L === "fr" ? "N° de contrat" : "Contract no.", num)}
        ${detail(L === "fr" ? "Assureur" : "Insurer", rec.insurer)}
        ${detail(L === "fr" ? "Véhicule" : "Vehicle", rec.vehicle)}
        ${detail(L === "fr" ? "Expiré le" : "Expired on", rec.until)}
      </div>`;
  }

  function renderInvalid(box, num, L) {
    box.innerHTML = `
      <div class="verify-banner vb-invalid">
        <span class="vbic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg></span>
        <div><b>${L === "fr" ? "Aucun contrat trouvé" : "No contract found"}</b><small>${L === "fr" ? "Le numéro «" + num + "» n'existe pas dans le registre. Méfiez-vous d'un faux document." : "Number “" + num + "” is not in the registry. Beware of a forged document."}</small></div>
      </div>`;
  }

  window.ACV = { verify };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement && document.activeElement.id === "vNumber") verify();
  });
})();
