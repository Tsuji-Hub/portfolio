// About portrait: "x-ray vision". A scope follows the pointer and shows the
// photo as a 1-bit dithered x-ray (public/img/ethan-xray.png, made from the
// same photo). Tap toggles the full x-ray on touch screens. On first view a
// scan sweeps once from x-ray to the real photo (skipped under reduced motion).
// CSP: external file; only CSSOM custom properties are written.
(function () {
  var fig = document.querySelector('[data-xray]');
  if (!fig) return;
  var M = window.Motion;
  var reduce = M ? M.reduce : false;
  var S = window.SiteSound || { play: function () {} };
  var R = 64;

  function at(x, y, r) {
    fig.style.setProperty('--mx', x + 'px');
    fig.style.setProperty('--my', y + 'px');
    fig.style.setProperty('--r', r + 'px');
  }
  fig.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var b = fig.getBoundingClientRect();
    at(e.clientX - b.left, e.clientY - b.top, R);
  });
  fig.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') S.play('tick'); });
  fig.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'touch') return;
    fig.style.setProperty('--r', '0px');
  });
  fig.addEventListener('click', function () {
    var on = !fig.classList.contains('is-full');
    fig.classList.toggle('is-full', on);
    S.play(on ? 'on' : 'tick');
  });

  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      if (!ents[0].isIntersecting) return;
      io.disconnect();
      fig.classList.add('is-scan');
      setTimeout(function () { fig.classList.remove('is-scan'); }, 1700);
    }, { threshold: 0.6 });
    io.observe(fig);
  }
})();
