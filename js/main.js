/* ============================================================
   SYMO PRINT — MAIN JAVASCRIPT
   ============================================================ */

(function () {
  'use strict';

  // ── UTILITAIRES ──────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  // ── COOKIE BANNER (RGPD) ─────────────────────────────────
  function initCookies() {
    const banner = $('#cookieBanner');
    const accept = $('#cookieAccept');
    const refuse = $('#cookieRefuse');
    const reopen = $('#reopenCookies');

    if (!banner) return;

    function showBanner() { banner.classList.add('visible'); }
    function hideBanner() { banner.classList.remove('visible'); }

    function setCookieChoice(val) {
      try {
        localStorage.setItem('symoprint_cookie_consent', val);
        localStorage.setItem('symoprint_cookie_date', Date.now());
      } catch (_) {}
      hideBanner();
    }

    function checkConsent() {
      try {
        const stored = localStorage.getItem('symoprint_cookie_consent');
        const date   = parseInt(localStorage.getItem('symoprint_cookie_date') || '0');
        const expire = 180 * 24 * 60 * 60 * 1000; // 6 mois
        if (!stored || Date.now() - date > expire) showBanner();
      } catch (_) {
        showBanner();
      }
    }

    on(accept, 'click', () => setCookieChoice('accepted'));
    on(refuse, 'click', () => setCookieChoice('refused'));
    on(reopen, 'click', () => showBanner());

    // Délai léger avant affichage
    setTimeout(checkConsent, 800);
  }

  // ── NAVBAR SCROLL ────────────────────────────────────────
  function initNavbar() {
    const navbar = $('#navbar');
    if (!navbar) return;

    let lastY = 0;

    const update = () => {
      const y = window.scrollY;
      if (y > 20) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
      lastY = y;
    };

    on(window, 'scroll', update, { passive: true });
    update();
  }

  // ── MENU MOBILE ──────────────────────────────────────────
  function initMobileMenu() {
    const hamburger = $('#hamburger');
    const navMenu   = $('#navMenu');
    const overlay   = $('#navOverlay');

    if (!hamburger || !navMenu) return;

    function openMenu() {
      navMenu.classList.add('open');
      overlay.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      navMenu.classList.remove('open');
      overlay.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    on(hamburger, 'click', () => {
      const isOpen = navMenu.classList.contains('open');
      isOpen ? closeMenu() : openMenu();
    });

    on(overlay, 'click', closeMenu);

    // Sous-menus mobiles (toggle par clic)
    $$('.nav-item.has-mega').forEach(item => {
      const link = item.querySelector('.nav-link-drop');
      if (!link) return;

      on(link, 'click', (e) => {
        if (window.innerWidth <= 900) {
          e.preventDefault();
          item.classList.toggle('open-mobile');
        }
      });
    });

    // Fermer le menu si la fenêtre est redimensionnée
    on(window, 'resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });

    // Lien interne → fermer le menu
    $$('.nav-menu a').forEach(a => {
      on(a, 'click', () => {
        if (window.innerWidth <= 900) closeMenu();
      });
    });

    // Accessibilité : fermer avec Escape
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ── LIEN ACTIF AU SCROLL ─────────────────────────────────
  function initActiveNav() {
    const navLinks = $$('.nav-link');
    const sections = $$('section[id]');

    const update = () => {
      let current = '';
      sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
      });

      navLinks.forEach(l => {
        const href = (l.getAttribute('href') || '').split('/').pop().replace('.html','').replace('index','');
        l.classList.toggle('active', href === current || (current === '' && l.getAttribute('href') === 'index.html'));
      });
    };

    on(window, 'scroll', update, { passive: true });
  }

  // ── BOUTON RETOUR EN HAUT ────────────────────────────────
  function initFabTop() {
    const btn = $('#fabTop');
    if (!btn) return;

    on(window, 'scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    on(btn, 'click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── COMPTEURS ANIMÉS ─────────────────────────────────────
  function initCounters() {
    const counters = $$('.counter-num[data-target]');
    if (!counters.length) return;

    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function animateCounter(el) {
      const target   = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const start    = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value    = Math.floor(easeOut(progress) * target);
        el.textContent = value >= 1000 ? value.toLocaleString('fr-FR') : value;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target >= 1000 ? target.toLocaleString('fr-FR') : target;
      }

      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = '1';
          animateCounter(entry.target);
        }
      });
    }, { threshold: .5 });

    counters.forEach(c => observer.observe(c));
  }

  // ── RÉVÉLATION AU SCROLL ─────────────────────────────────
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
    }, { threshold: .12 });

    els.forEach(el => observer.observe(el));
  }

  // ── TÉMOIGNAGES SLIDER ───────────────────────────────────
  function initTestimonialsSlider() {
    const track    = $('#testiCards');
    const dotsWrap = $('#testiDots');
    const prevBtn  = $('#testiPrev');
    const nextBtn  = $('#testiNext');

    if (!track) return;

    const cards  = $$('.testi-card', track);
    let current  = 0;
    let perView  = calcPerView();
    let total    = cards.length;
    let auto;

    function calcPerView() {
      if (window.innerWidth <= 640) return 1;
      if (window.innerWidth <= 900) return 2;
      return 3;
    }

    function pages() { return Math.max(1, Math.ceil(total / perView)); }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (let i = 0; i < pages(); i++) {
        const btn = document.createElement('button');
        btn.className = 'testi-dot' + (i === 0 ? ' active' : '');
        btn.setAttribute('aria-label', `Aller à la page ${i + 1}`);
        btn.type = 'button';
        on(btn, 'click', () => goTo(i));
        dotsWrap.appendChild(btn);
      }
    }

    function updateDots() {
      $$('.testi-dot', dotsWrap).forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function goTo(page) {
      current = Math.max(0, Math.min(page, pages() - 1));
      const cardW = (track.parentElement.offsetWidth + 19) / perView;
      track.style.transform = `translateX(-${current * perView * cardW}px)`;
      updateDots();
    }

    function next() { goTo((current + 1) % pages()); }
    function prev() { goTo((current - 1 + pages()) % pages()); }

    on(nextBtn, 'click', next);
    on(prevBtn, 'click', prev);

    function startAuto() { auto = setInterval(next, 5500); }
    function stopAuto()  { clearInterval(auto); }

    on(track, 'mouseenter', stopAuto);
    on(track, 'mouseleave', startAuto);

    // Swipe tactile
    let tx = 0;
    on(track, 'touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    on(track, 'touchend',   e => {
      const diff = tx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    });

    // Keyboard
    on(document, 'keydown', e => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });

    on(window, 'resize', () => {
      perView = calcPerView();
      current = 0;
      buildDots();
      goTo(0);
    });

    buildDots();
    startAuto();
  }

  // ── SMOOTH SCROLL ────────────────────────────────────────
  function initSmoothScroll() {
    on(document, 'click', e => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  // ── NEWSLETTER FORM ──────────────────────────────────────
  function initNewsletter() {
    const form = $('#newsletterForm');
    if (!form) return;

    on(form, 'submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn   = form.querySelector('button');

      if (!input.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.style.borderColor = '#ef4444';
        input.focus();
        return;
      }

      // Simulation envoi (à remplacer par un vrai appel API)
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = '#22c55e';
        input.value = '';
        input.placeholder = 'Merci pour votre inscription !';
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
          btn.style.background = '';
          btn.disabled = false;
          input.placeholder = 'votre@email.fr';
        }, 3500);
      }, 1500);
    });
  }

  // ── LAZY-REVEAL DES SECTIONS ─────────────────────────────
  function addRevealAttributes() {
    const revealTargets = [
      '.cat-card',
      '.product-card',
      '.process-step',
      '.why-feature',
      '.testi-card',
      '.why-counter',
      '.reassurance-item',
    ];

    revealTargets.forEach(sel => {
      $$(sel).forEach((el, i) => {
        if (!el.hasAttribute('data-reveal')) {
          el.setAttribute('data-reveal', '');
          const delay = (i % 4) + 1;
          el.setAttribute('data-reveal-delay', delay);
        }
      });
    });
  }

  // ── INIT ─────────────────────────────────────────────────
  function init() {
    addRevealAttributes();
    initCookies();
    initNavbar();
    initMobileMenu();
    initActiveNav();
    initFabTop();
    initCounters();
    initReveal();
    initTestimonialsSlider();
    initSmoothScroll();
    initNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
