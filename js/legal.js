/* TOC active-state on scroll — shared by all legal pages */
(function () {
  const sections = document.querySelectorAll('.legal-section');
  const tocLinks = document.querySelectorAll('.legal-toc-list a');
  if (!sections.length || !tocLinks.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(
          '.legal-toc-list a[href="#' + entry.target.id + '"]'
        );
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0% -70% 0%' });

  sections.forEach(s => obs.observe(s));
})();
