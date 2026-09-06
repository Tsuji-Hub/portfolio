// Motion: staggered hero reveal on load, fade-ups as sections enter view.
//
// Bundled by Astro into /_astro/*.js, so it is served from 'self' and needs no
// CSP change. GSAP core only — deliberately NOT ScrollTrigger, which calls
// `_body.setAttribute("style", "")` during refresh when <body> has no style
// attribute. Ours never does (the build's csp-gate enforces exactly that), so
// ScrollTrigger would trip a style-src violation on every page load. An
// IntersectionObserver does the same job in a few lines and 40KB less.
//
// Every effect goes through gsap.matchMedia() with a reduced-motion branch that
// sets the final state. With JS off, /noscript.css un-hides everything, so the
// page is complete either way.
import gsap from 'gsap';

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  // Hero: stagger in on load.
  const heroReveals = document.querySelectorAll('[data-reveal]');
  if (heroReveals.length) {
    gsap.to(heroReveals, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.1,
    });
  }

  const canvasWrap = document.querySelectorAll('[data-canvas]');
  if (canvasWrap.length) {
    gsap.fromTo(
      canvasWrap,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out', delay: 0.4 }
    );
  }

  // Cards: fade up once, when they first come into view.
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-card]'));
  if (!cards.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      const landed = entries.filter((e) => e.isIntersecting);
      if (!landed.length) return;
      landed.forEach((entry, i) => {
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: (i % 3) * 0.08,
        });
      });
    },
    // Matches the shell's "top 88%" trigger point.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
  );

  cards.forEach((el) => io.observe(el));
});

mm.add('(prefers-reduced-motion: reduce)', () => {
  gsap.set('[data-reveal], [data-card], [data-canvas]', {
    opacity: 1,
    y: 0,
    scale: 1,
  });
});
