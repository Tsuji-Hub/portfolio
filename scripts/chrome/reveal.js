// Scroll reveals: add .is-in to each card the first time it enters the viewport.
// CSS does the animating (see base.css); this only decides when.
//
// This replaced GSAP. The brief allowed a bundled GSAP, and it worked and was
// CSP-clean, but it cost 4 Lighthouse points on mobile: the hero <h1> is the LCP
// element, and it could not paint until 70KB of library had downloaded and run.
// Measured against main on the same server, LCP went 2.1s -> 2.7s. The whole
// effect is a keyframe and eleven lines of IntersectionObserver.
//
// This runs under reduced motion too. The CSS keeps the fade and drops the
// travel (--motion-shift goes to 0, --t-card halves), so a card still arrives
// rather than being pinned to its final state before you get there. With no
// JS at all, /noscript.css un-hides everything.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
(function () {
  var cards = document.querySelectorAll('[data-card]');
  if (!cards.length) return;

  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < cards.length; i++) cards[i].classList.add('is-in');
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      var shown = 0;
      entries.forEach(function (entry) {
        var el = entry.target;
        if (!entry.isIntersecting) {
          // Already scrolled past. A jump scroll, a #anchor, or a restored
          // scroll position can land below a card without it ever
          // intersecting, and it would then stay at opacity 0 forever.
          if (entry.boundingClientRect.bottom < 0) {
            io.unobserve(el);
            el.classList.add('is-in');
          }
          return;
        }
        io.unobserve(el);
        // Stagger within a row, matching the shell's (i % 3) * 0.08s. Halved
        // under reduce along with the durations.
        el.style.transitionDelay =
          ((shown % 3) * (window.Motion && window.Motion.reduce ? 0.04 : 0.08)) + 's';
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
