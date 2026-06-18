/* ===========================
   SYMO PRINT – MAIN SCRIPT
   =========================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── NAVBAR SCROLL ──
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');

  const onScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Back to top visibility
    const btt = document.getElementById('backToTop');
    if (btt) {
      if (window.scrollY > 400) btt.classList.add('visible');
      else btt.classList.remove('visible');
    }

    // Active nav link
    const sections = document.querySelectorAll('section[id], footer');
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) current = sec.getAttribute('id') || '';
    });
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── MOBILE MENU ──
  const hamburger = document.getElementById('hamburger');
  const navLinksContainer = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinksContainer.classList.toggle('open');
    document.body.style.overflow = navLinksContainer.classList.contains('open') ? 'hidden' : '';
  });

  navLinksContainer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinksContainer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ── COUNTER ANIMATION ──
  const counters = document.querySelectorAll('.stat-number[data-count]');

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const start = performance.now();

    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target;
    };

    requestAnimationFrame(update);
  };

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        animateCounter(entry.target);
      }
    });
  }, { threshold: .5 });

  counters.forEach(c => counterObserver.observe(c));

  // ── AOS (Animate On Scroll) ──
  const aosElements = document.querySelectorAll('[data-aos]');

  const aosObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = Array.from(aosElements).indexOf(entry.target) % 4 * 100;
        setTimeout(() => entry.target.classList.add('aos-animate'), delay);
        aosObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .1 });

  aosElements.forEach(el => aosObserver.observe(el));

  // ── PORTFOLIO FILTER ──
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      portfolioItems.forEach(item => {
        const cat = item.dataset.category;
        if (filter === 'all' || cat === filter) {
          item.style.display = '';
          item.style.animation = 'fadeInUp .4s ease both';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ── TESTIMONIALS SLIDER ──
  const track = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');

  if (track) {
    const cards = track.querySelectorAll('.testimonial-card');
    let current = 0;
    let perView = getPerView();
    let total = cards.length;
    let autoInterval;

    function getPerView() {
      if (window.innerWidth <= 768) return 1;
      if (window.innerWidth <= 1024) return 2;
      return 3;
    }

    function buildDots() {
      dotsContainer.innerHTML = '';
      const pages = Math.ceil(total / perView);
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = `dot${i === 0 ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Page ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    }

    function updateDots() {
      document.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    function goTo(page) {
      const pages = Math.ceil(total / perView);
      current = Math.max(0, Math.min(page, pages - 1));
      const cardWidth = track.parentElement.offsetWidth / perView;
      track.style.transform = `translateX(-${current * perView * cardWidth}px)`;
      updateDots();
    }

    function next() {
      const pages = Math.ceil(total / perView);
      goTo((current + 1) % pages);
    }

    function prev() {
      const pages = Math.ceil(total / perView);
      goTo((current - 1 + pages) % pages);
    }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    function startAuto() {
      autoInterval = setInterval(next, 5000);
    }

    function stopAuto() {
      clearInterval(autoInterval);
    }

    track.parentElement.addEventListener('mouseenter', stopAuto);
    track.parentElement.addEventListener('mouseleave', startAuto);

    // Touch/swipe support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    });

    window.addEventListener('resize', () => {
      perView = getPerView();
      current = 0;
      buildDots();
      goTo(0);
    });

    buildDots();
    startAuto();
  }

  // ── CONTACT FORM ──
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');

  if (contactForm) {
    const fields = {
      firstName: { el: document.getElementById('firstName'), error: document.getElementById('firstNameError'), validate: v => v.trim().length >= 2, msg: 'Veuillez entrer votre prénom (min. 2 caractères).' },
      lastName:  { el: document.getElementById('lastName'),  error: document.getElementById('lastNameError'),  validate: v => v.trim().length >= 2, msg: 'Veuillez entrer votre nom (min. 2 caractères).' },
      email:     { el: document.getElementById('email'),     error: document.getElementById('emailError'),     validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Veuillez entrer un email valide.' },
      service:   { el: document.getElementById('service'),   error: document.getElementById('serviceError'),   validate: v => v !== '', msg: 'Veuillez sélectionner un service.' },
      message:   { el: document.getElementById('message'),   error: document.getElementById('messageError'),   validate: v => v.trim().length >= 20, msg: 'Veuillez décrire votre projet (min. 20 caractères).' },
      privacy:   { el: document.getElementById('privacy'),   error: document.getElementById('privacyError'),   validate: v => document.getElementById('privacy').checked, msg: 'Veuillez accepter les conditions.' },
    };

    const validateField = (key) => {
      const { el, error, validate, msg } = fields[key];
      const valid = validate(el.value || '');
      error.textContent = valid ? '' : msg;
      el.classList.toggle('error', !valid);
      return valid;
    };

    Object.keys(fields).forEach(key => {
      fields[key].el.addEventListener('blur', () => validateField(key));
      fields[key].el.addEventListener('input', () => {
        if (fields[key].el.classList.contains('error')) validateField(key);
      });
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;
      Object.keys(fields).forEach(key => {
        if (!validateField(key)) isValid = false;
      });

      if (!isValid) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

      // Simulate form submission
      await new Promise(r => setTimeout(r, 1800));

      submitBtn.style.display = 'none';
      document.getElementById('formSuccess').style.display = 'block';
    });
  }

  // ── NEWSLETTER FORM ──
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      const btn = newsletterForm.querySelector('button');
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.style.background = '#22c55e';
      input.value = '';
      input.placeholder = 'Merci pour votre inscription !';
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        btn.style.background = '';
        input.placeholder = 'Votre email';
      }, 3000);
    });
  }

  // ── SMOOTH SCROLL for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
