// Homelab diagram interactivity. Progressive enhancement:
// with JS off, all descriptions render below the SVG; this collapses them
// into a single click/keyboard-driven panel. Served as an external file so
// it runs under a strict CSP (script-src 'self', no unsafe-inline).
(function () {
  var wrap = document.querySelector('[data-diagram]');
  if (!wrap) return;

  var panel = wrap.querySelector('[data-panel]');
  var nodes = wrap.querySelectorAll('.node');
  var html = {};
  wrap.querySelectorAll('[data-desc]').forEach(function (d) {
    html[d.dataset.desc] = d.innerHTML;
  });

  function select(id) {
    if (!html[id]) return;
    panel.innerHTML = html[id];
    nodes.forEach(function (n) {
      n.classList.toggle('active', n.dataset.node === id);
    });
  }

  wrap.addEventListener('click', function (e) {
    var n = e.target.closest('.node');
    if (n) select(n.dataset.node);
  });
  wrap.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var n = e.target.closest('.node');
    if (n) {
      e.preventDefault();
      select(n.dataset.node);
    }
  });
})();
