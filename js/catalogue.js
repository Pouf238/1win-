/* ═══════════════════════════════════════════════════
   CATALOGUE A-Z  —  Symo Print
════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const searchInput  = document.getElementById('catalogSearch');
  const searchClear  = document.getElementById('searchClear');
  const searchInfo   = document.getElementById('searchInfo');
  const noResults    = document.getElementById('noResults');
  const catalogContent = document.getElementById('catalogueContent');
  const alphaNav     = document.getElementById('alphaNav');

  if (!searchInput) return;

  const allCards  = Array.from(document.querySelectorAll('.az-product-card'));
  const allBlocks = Array.from(document.querySelectorAll('.az-letter-block'));
  const alphaButtons = Array.from(document.querySelectorAll('.alpha-btn'));

  /* ── Normalise text for accent-insensitive search ── */
  function normalise(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  /* ── Filter catalogue ── */
  function filterCatalogue(query) {
    const q = normalise(query.trim());
    let totalVisible = 0;

    if (q === '') {
      allCards.forEach(c  => c.classList.remove('search-hidden'));
      allBlocks.forEach(b => b.classList.remove('search-hidden'));
      alphaButtons.forEach(b => b.classList.remove('dimmed'));
      if (noResults) noResults.style.display = 'none';
      if (searchInfo) searchInfo.textContent = '';
      if (catalogContent) catalogContent.style.display = '';
      if (searchClear) searchClear.style.display = 'none';
      return;
    }

    if (searchClear) searchClear.style.display = 'flex';

    /* Filter cards */
    allCards.forEach(card => {
      const name = normalise(card.dataset.name || card.querySelector('span')?.textContent || '');
      const match = name.includes(q);
      card.classList.toggle('search-hidden', !match);
      if (match) totalVisible++;
    });

    /* Hide / show letter blocks based on whether they have visible cards */
    const visibleLetters = new Set();
    allBlocks.forEach(block => {
      const hasVisible = block.querySelectorAll('.az-product-card:not(.search-hidden)').length > 0;
      block.classList.toggle('search-hidden', !hasVisible);
      if (hasVisible) visibleLetters.add(block.dataset.letter);
    });

    /* Dim alpha buttons for letters with no results */
    alphaButtons.forEach(btn => {
      const letter = btn.textContent.trim();
      btn.classList.toggle('dimmed', !visibleLetters.has(letter));
    });

    /* No-results state */
    if (catalogContent) catalogContent.style.display = '';
    if (noResults) noResults.style.display = totalVisible === 0 ? 'flex' : 'none';

    /* Info text */
    if (searchInfo) {
      if (totalVisible === 0) {
        searchInfo.textContent = 'Aucun résultat pour « ' + query.trim() + ' »';
      } else if (totalVisible === 1) {
        searchInfo.textContent = '1 produit trouvé';
      } else {
        searchInfo.textContent = totalVisible + ' produits trouvés';
      }
    }
  }

  /* ── Events ── */
  searchInput.addEventListener('input', function () {
    filterCatalogue(this.value);
  });

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      filterCatalogue('');
      searchInput.focus();
    });
  }

  /* ── Smooth scroll for alpha buttons ── */
  alphaButtons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      const navHeight = (document.getElementById('navbar')?.offsetHeight || 70)
                      + (alphaNav?.offsetHeight || 52)
                      + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── Highlight active alpha button on scroll ── */
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const letter = entry.target.dataset.letter;
          alphaButtons.forEach(btn => {
            btn.classList.toggle('active', btn.textContent.trim() === letter);
          });
        }
      });
    },
    {
      rootMargin: '-140px 0px -60% 0px',
      threshold: 0
    }
  );

  allBlocks.forEach(block => observer.observe(block));

  /* ── Newsletter form (catalogue page) ── */
  const nlForm = document.getElementById('newsletterForm');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const emailInput = this.querySelector('input[type="email"]');
      if (!emailInput || !emailInput.value) return;
      const btn = this.querySelector('button[type="submit"]');
      if (btn) btn.innerHTML = '<i class="fas fa-check"></i>';
      emailInput.value = '';
      setTimeout(() => { if (btn) btn.innerHTML = '<i class="fas fa-paper-plane"></i>'; }, 3000);
    });
  }
})();
