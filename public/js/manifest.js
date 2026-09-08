// Live network manifest.
//
// The footer used to *claim* "no trackers, no third-party requests". This makes
// the browser say it instead. Everything below is read from the Resource Timing
// API — the browser's own record of what this page actually fetched — and the
// third-party count is computed by comparing each request's origin against this
// one, not asserted by me.
//
// It also self-polices: the day something third-party sneaks in, it appears
// here, in red, on the front page, whether I noticed or not.
//
// CSP: external, script-src 'self'. No eval, no inline handlers.
(function () {
  var root = document.querySelector('[data-manifest]');
  if (!root) return;

  var list = root.querySelector('[data-mf-list]');
  var countOut = root.querySelector('[data-mf-count]');
  var weightOut = root.querySelector('[data-mf-weight]');
  var verdict = root.querySelector('[data-mf-verdict]');
  var M = window.Motion;
  var seq = null;

  function kb(n) {
    if (!n) return '—';
    return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB';
  }

  function kindOf(e) {
    var t = e.initiatorType;
    // Check the file first: a font pulled from a stylesheet reports
    // initiatorType 'css', which would mislabel every woff2 as CSS.
    if (/\.woff2?(\?|$)/.test(e.name)) return 'font';
    if (/\.css(\?|$)/.test(e.name)) return 'css';
    if (/\.js(\?|$)/.test(e.name)) return 'js';
    if (/\.(svg|png|jpe?g|webp|avif)(\?|$)/.test(e.name)) return 'img';
    if (t === 'navigation') return 'html';
    if (t === 'fetch' || t === 'xmlhttprequest') return 'fetch';
    return t || 'other';
  }

  function render() {
    var here = window.location.origin;
    var entries = [];

    var nav = performance.getEntriesByType('navigation')[0];
    if (nav) entries.push(nav);
    entries = entries.concat(performance.getEntriesByType('resource'));

    if (!entries.length) {
      list.innerHTML = '';
      var li = document.createElement('li');
      li.textContent = 'Resource Timing reported nothing.';
      list.appendChild(li);
      return;
    }

    var total = 0;
    var third = 0;
    list.innerHTML = '';

    var sizes = entries.map(function (e) {
      return e.transferSize || e.encodedBodySize || e.decodedBodySize || 0;
    });
    var biggest = Math.max.apply(null, sizes.concat([1]));
    var bars = [];

    entries.forEach(function (e) {
      // css/font/js can report 0 when served from cache; fall back to body size
      var size = e.transferSize || e.encodedBodySize || e.decodedBodySize || 0;
      total += size;

      var isThird = e.name.indexOf(here) !== 0;
      if (isThird) third++;

      var li = document.createElement('li');
      if (isThird) li.className = 'third';

      var k = document.createElement('span');
      k.className = 'mf-kind';
      k.textContent = kindOf(e);

      var n = document.createElement('span');
      n.className = 'mf-name';
      var path = isThird ? e.name : e.name.slice(here.length) || '/';
      n.textContent = path;
      n.title = e.name;

      var s = document.createElement('span');
      s.className = 'mf-size';
      s.textContent = kb(size);

      var bar = document.createElement('span');
      bar.className = 'mf-bar';
      var fill = document.createElement('i');
      bar.appendChild(fill);
      bars.push({ el: fill, pct: (size / biggest) * 100 });

      var o = document.createElement('span');
      o.className = 'mf-origin';
      o.textContent = isThird ? 'THIRD PARTY' : 'self';

      li.appendChild(k);
      li.appendChild(n);
      li.appendChild(bar);
      li.appendChild(s);
      li.appendChild(o);
      list.appendChild(li);
    });

    // Rows arrive in turn, each drawing its own weight, and the verdict waits
    // a beat after the last one. It is the answer, so it should not be sitting
    // there before the question has finished being asked.
    if (seq) seq.cancel();
    seq = M.seq();
    var step = M.ms(60, 34);
    var rows = list.children;
    for (var i = 0; i < rows.length; i++) {
      (function (li, bar, delay) {
        seq.at(delay, function () {
          li.classList.add('is-in');
          seq.tween(M.ms(520), function (e) {
            bar.el.style.width = (bar.pct * e).toFixed(2) + '%';
          });
        });
      })(rows[i], bars[i], i * step);
    }

    var after = rows.length * step;
    seq.count(countOut, 0, entries.length, M.ms(700), function (n) {
      return String(Math.round(n));
    });
    seq.count(weightOut, 0, total, M.ms(900), kb);

    verdict.className = 'manifest-verdict ' + (third ? 'dirty' : 'clean');
    verdict.textContent = third
      ? third + ' third-party request' + (third === 1 ? '' : 's')
      : '0 third-party requests';
    seq.at(after + M.ms(560, 320), function () {
      verdict.classList.add('is-in');
    });
  }

  // Wait for load so late resources (fonts) are counted, and for the panel to
  // be on screen, so the count-up is not already over by the time you scroll
  // to it.
  function start() {
    M.onView(root, function () {
      if (!seq) render();
    }, function () {
      if (seq) seq.cancel();
    });
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
