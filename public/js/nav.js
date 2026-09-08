// Floating glass navbar: transparent at rest, blurs and tightens once the page
// has scrolled past 24px. Plus the mobile panel toggle.
//
// With JS off the pill stays transparent and /noscript.css shows the links
// inline instead of the hamburger, so nothing is unreachable.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
(function () {
  var bar = document.querySelector('[data-navbar]');
  if (!bar) return;

  /* --- blur on scroll --- */
  var ticking = false;
  function apply() {
    bar.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(apply);
  }
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- mobile panel --- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var panel = document.querySelector('[data-nav-panel]');
  if (!toggle || !panel) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close on navigation, on Escape, and on any click outside the pill.
  panel.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-navbar]') && !e.target.closest('[data-nav-panel]')) {
      setOpen(false);
    }
  });
})();
