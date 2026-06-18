/* ============================================================
   SYMO PRINT — CATEGORY PAGES JAVASCRIPT
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // ── STICKY SUBNAV + ACTIVE LINK ──────────────────────────
  function initSubnav() {
    const subnav = $('.cat-subnav');
    const links  = $$('.cat-subnav-link[href^="#"]');
    if (!subnav || !links.length) return;

    const sectionIds = links.map(l => l.getAttribute('href').slice(1));
    const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    // Sticky elevation
    on(window, 'scroll', () => {
      subnav.classList.toggle('elevated', window.scrollY > 120);
    }, { passive: true });

    // Active link highlight based on scroll position
    const subnavH = subnav.offsetHeight;
    const navbarH = 68;
    const offset  = navbarH + subnavH + 20;

    const updateActive = () => {
      let current = '';
      sections.forEach(sec => {
        if (window.scrollY + offset >= sec.offsetTop) current = sec.id;
      });
      links.forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      });
    };

    on(window, 'scroll', updateActive, { passive: true });
    updateActive();

    // Smooth scroll offset (account for navbar + subnav)
    links.forEach(link => {
      on(link, 'click', e => {
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - (navbarH + subnavH + 12);
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  // ── FAQ ACCORDÉON ────────────────────────────────────────
  function initFaq() {
    const items = $$('.faq-item');
    if (!items.length) return;

    items.forEach(item => {
      const btn = item.querySelector('.faq-q');
      if (!btn) return;

      on(btn, 'click', () => {
        const isOpen = item.classList.contains('open');

        // Close all others
        items.forEach(other => {
          if (other !== item) {
            other.classList.remove('open');
            const otherBtn = other.querySelector('.faq-q');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        item.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    // Keyboard: space/enter already handled by button, add arrow keys
    on(document, 'keydown', e => {
      const focused = document.activeElement;
      if (!focused || !focused.classList.contains('faq-q')) return;

      const allBtns = $$('.faq-q');
      const idx = allBtns.indexOf(focused);

      if (e.key === 'ArrowDown' && idx < allBtns.length - 1) {
        e.preventDefault();
        allBtns[idx + 1].focus();
      }
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        allBtns[idx - 1].focus();
      }
    });
  }

  // ── SCROLL-REVEAL ────────────────────────────────────────
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .1 });

    els.forEach(el => observer.observe(el));
  }

  // ── AUTO REVEAL ATTRIBUTES ───────────────────────────────
  function addReveal() {
    ['.prod-card', '.cat-why-card', '.faq-item'].forEach(sel => {
      $$(sel).forEach((el, i) => {
        if (!el.hasAttribute('data-reveal')) {
          el.setAttribute('data-reveal', '');
          el.setAttribute('data-reveal-delay', (i % 4) + 1);
        }
      });
    });
  }

  // ── BACK TO TOP ──────────────────────────────────────────
  function initFabTop() {
    const btn = $('#fabTop');
    if (!btn) return;
    on(window, 'scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    on(btn, 'click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── INIT ─────────────────────────────────────────────────
  function init() {
    addReveal();
    initSubnav();
    initFaq();
    initReveal();
    initFabTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
