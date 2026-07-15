// Field: one cell per unit of work.
//
// "1,100+ projects" is a statistic. Eleven hundred cells is a wall, and the
// wall is the honest picture of what that sentence cost. Same for "5th of 160":
// nobody pictures 160 teams until they are drawn.
//
// Canvas rather than DOM: 1,100 elements would bloat the tree for what is,
// structurally, a picture. Colours are read from the CSS custom properties so
// the field follows the theme, and it redraws when the theme flips.
//
// CSP: external, script-src 'self'. Canvas 2D + rAF. No eval, no library.
(function () {
  var fields = document.querySelectorAll('[data-field]');
  if (!fields.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function build(cv) {
    var total = Number(cv.dataset.total);
    var cols = Number(cv.dataset.cols || 50);
    var rows = Math.ceil(total / cols);
    var mode = cv.dataset.mode;
    var rank = Number(cv.dataset.rank || 0);
    var special = Number(cv.dataset.special || 0);

    var CELL = 11;
    var GAP = 3;
    var STEP = CELL + GAP;
    var PAD = 5; // room for the highlight ring, which is drawn outside its cell
    var DPR = 2; // fixed 2x backing store; CSS scales it down

    cv.width = (cols * STEP + PAD * 2) * DPR;
    cv.height = (rows * STEP + PAD * 2) * DPR;

    var ctx = cv.getContext('2d');

    // deterministic-ish scatter so the fill doesn't sweep left-to-right
    var order = [];
    for (var i = 0; i < total; i++) order.push(i);
    for (var j = order.length - 1; j > 0; j--) {
      var k = (j * 9301 + 49297) % (j + 1); // no Math.random: stable across reloads
      var t = order[j];
      order[j] = order[k];
      order[k] = t;
    }

    var specials = {};
    for (var s = 0; s < special; s++) specials[order[s]] = true;

    function draw(filled) {
      var cBg = css('--bg-raised') || '#161b22';
      var cBorder = css('--border') || '#21262d';
      var cAcc = css('--accent') || '#4fd1c5';
      var cText = css('--text') || '#e2e6ea';

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);

      var upto = {};
      for (var n = 0; n < filled; n++) upto[order[n]] = true;

      for (var i = 0; i < total; i++) {
        var x = (i % cols) * STEP + PAD;
        var y = Math.floor(i / cols) * STEP + PAD;

        if (mode === 'rank') {
          // one cell is the person; everyone else is the field
          var isMe = i === rank - 1;
          ctx.fillStyle = isMe ? cAcc : cBorder;
          ctx.fillRect(x, y, CELL, CELL);
          if (isMe) {
            ctx.strokeStyle = cAcc;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 3, y - 3, CELL + 6, CELL + 6);
          }
          continue;
        }

        if (upto[i]) {
          ctx.fillStyle = specials[i] ? cText : cAcc;
          ctx.fillRect(x, y, CELL, CELL);
          if (specials[i]) {
            ctx.strokeStyle = cAcc;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 1.5, y - 1.5, CELL + 3, CELL + 3);
          }
        } else {
          ctx.fillStyle = cBg;
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = cBorder;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        }
      }
    }

    return { draw: draw, total: total, mode: mode };
  }

  fields.forEach(function (cv) {
    var f = build(cv);
    var wrap = cv.closest('.field-wrap') || cv.parentNode;
    var countEl = wrap.querySelector('[data-field-count]');
    var runBtn = wrap.querySelector('[data-field-run]');
    var noteEl = wrap.querySelector('[data-field-note]');
    var rafId = null;

    function setCount(n) {
      if (countEl) countEl.textContent = n.toLocaleString() + ' / ' + f.total.toLocaleString();
    }

    if (f.mode === 'rank') {
      f.draw(0);
      dark.addEventListener('change', function () {
        f.draw(0);
      });
      return;
    }

    function run() {
      if (rafId) cancelAnimationFrame(rafId);
      if (reduce.matches) {
        f.draw(f.total);
        setCount(f.total);
        if (noteEl) noteEl.hidden = false;
        return;
      }
      var start = null;
      var DUR = 2600;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / DUR, 1);
        var n = Math.round(p * f.total);
        f.draw(n);
        setCount(n);
        if (p < 1) rafId = requestAnimationFrame(tick);
        else {
          rafId = null;
          if (noteEl) noteEl.hidden = false;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    f.draw(0);
    setCount(0);
    if (runBtn) runBtn.addEventListener('click', run);
    dark.addEventListener('change', function () {
      f.draw(f.total);
    });
  });
})();
