// Scroll reveals: add .is-in to each card the first time it enters the viewport.
// CSS does the animating (see base.css); this only decides when.
//
// This replaced GSAP. The brief allowed a bundled GSAP, and it worked and was
// CSP-clean, but it cost 4 Lighthouse points on mobile: the hero <h1> is the LCP
// element, and it could not paint until 70KB of library had downloaded and run.
// Measured against main on the same server, LCP went 2.1s -> 2.7s. The whole
// effect is a keyframe and eleven lines of IntersectionObserver.
//
// Reduced motion is handled entirely in CSS, which is more reliable than a JS
// media query because it also covers the case where this file never loads.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
(function () {
  var cards = document.querySelectorAll('[data-card]');
  if (!cards.length) return;

  // If the user prefers reduced motion the CSS has already put them in their
  // final state; there is nothing to observe.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < cards.length; i++) cards[i].classList.add('is-in');
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      var shown = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        // Stagger within a row, matching the shell's (i % 3) * 0.08s.
        el.style.transitionDelay = (shown % 3) * 0.08 + 's';
        shown++;
        el.classList.add('is-in');
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
  );

  cards.forEach(function (el) {
    io.observe(el);
  });
})();
