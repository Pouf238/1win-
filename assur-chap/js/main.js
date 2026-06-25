/* ASSUR CHAP — shared UI behaviours: theme, language, nav, reveal, toast */
(function () {
  "use strict";

  /* ----- Theme (persisted, respects OS preference) ----- */
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("ac-theme");
  if (savedTheme) {
    root.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
  window.toggleTheme = function () {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("ac-theme", next);
  };

  /* ----- Language (FR default / EN) — toggles elements with data-fr/data-en ----- */
  function applyLang(lang) {
    document.querySelectorAll("[data-fr]").forEach((el) => {
      const txt = el.getAttribute("data-" + lang);
      if (txt !== null) el.textContent = txt;
    });
    document.querySelectorAll("[data-fr-ph]").forEach((el) => {
      const ph = el.getAttribute("data-" + lang + "-ph");
      if (ph !== null) el.setAttribute("placeholder", ph);
    });
    root.setAttribute("lang", lang);
    const lbl = document.querySelector(".lang-current");
    if (lbl) lbl.textContent = lang.toUpperCase();
    localStorage.setItem("ac-lang", lang);
  }
  const savedLang = localStorage.getItem("ac-lang") || "fr";
  applyLang(savedLang);
  window.toggleLang = function () {
    applyLang((localStorage.getItem("ac-lang") || "fr") === "fr" ? "en" : "fr");
  };

  /* ----- Mobile nav ----- */
  window.toggleNav = function () {
    const links = document.getElementById("navLinks");
    if (links) links.classList.toggle("open");
  };
  document.addEventListener("click", (e) => {
    const links = document.getElementById("navLinks");
    if (links && links.classList.contains("open") && !e.target.closest(".nav")) {
      links.classList.remove("open");
    }
  });

  /* ----- Navbar shadow on scroll ----- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- Reveal on scroll ----- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ----- Year ----- */
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ----- Toast helper ----- */
  window.showToast = function (msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      t.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span></span>';
      document.body.appendChild(t);
    }
    t.querySelector("span").textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => t.classList.remove("show"), 2800);
  };
})();
