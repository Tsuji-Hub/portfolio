// Field: one cell per unit of work.
//
// "1,100+ projects" is a statistic. Eleven hundred cells is a wall, and the
// wall is the honest picture of what that sentence cost.
//
// The choreography carries the argument, so it is worth spelling out. A scan
// line crosses the empty grid first, which says "this is an inventory being
// walked". The wall then fills on an ease-out, fast at the start and slowing
// as it closes, because that is what the work felt like. Then two beats of
// nothing. Then the eight cells that had no owner at all light up one at a
// time, while everything that did have an owner dims back, so the eight are
// the only thing left lit. The counter stops being a progress number and
// becomes the finding. The pause is the whole point: a wall that completes and
// immediately shows its answer has no answer, it just has an ending.
//
// Canvas rather than DOM: 1,100 elements would bloat the tree for what is,
// structurally, a picture. Colours are read from the CSS custom properties so
// the field follows the theme, and it redraws when the theme flips.
//
// CSP: external, script-src 'self'. Canvas 2D + rAF. No eval, no library.
(function () {
  var fields = document.querySelectorAll('[data-field]');
  if (!fields.length) return;

  var M = window.Motion;
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function linear(t) {
    return t;
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
    var W = cols * STEP + PAD * 2;
    var H = rows * STEP + PAD * 2;

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

    // The cells with no owner. They fill with everything else and are re-lit
    // at the end, so the reveal lands on cells you already watched arrive
    // rather than on eight you never noticed.
    //
    // One per band across the whole wall, with a small offset so they do not
    // line up in a column. Taking the first eight of `order` looked like a
    // rendering bug: that shuffle is a weak LCG and it clustered all eight
    // into the top two rows.
    var specialList = [];
    for (var s = 0; s < special; s++) {
      specialList.push(Math.floor((total * (s + 0.5)) / special) + ((s * 17) % 29) - 14);
    }

    function cellXY(i) {
      return { x: (i % cols) * STEP + PAD, y: Math.floor(i / cols) * STEP + PAD };
    }

    function draw(st) {
      var cBg = css('--bg-raised') || '#161b22';
      var cBorder = css('--border') || '#21262d';
      var cAcc = css('--accent') || '#4fd1c5';
      var cText = css('--text') || '#e2e6ea';
      var rgb = css('--accent-rgb') || '46, 230, 255';

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalAlpha = st.grid == null ? 1 : st.grid;

      var upto = {};
      for (var n = 0; n < st.filled; n++) upto[order[n]] = true;
      var lit = {};
      for (var q = 0; q < (st.lit || 0); q++) lit[specialList[q]] = true;

      for (var i = 0; i < total; i++) {
        var P = cellXY(i);
        var x = P.x;
        var y = P.y;

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
          // Everything that found an owner steps back so the eight that did
          // not are the only thing left at full strength.
          ctx.globalAlpha = lit[i] ? 1 : (st.grid == null ? 1 : st.grid) * (st.dim == null ? 1 : st.dim);
          ctx.fillStyle = lit[i] ? cText : cAcc;
          ctx.fillRect(x, y, CELL, CELL);
          ctx.globalAlpha = st.grid == null ? 1 : st.grid;
          if (lit[i]) {
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
      ctx.globalAlpha = 1;

      // Ring pulse on each cell as it is called out. Under reduce the ring
      // fades in at a fixed radius instead of expanding.
      if (st.rings) {
        for (var r = 0; r < st.rings.length; r++) {
          var ring = st.rings[r];
          var C = cellXY(ring.i);
          var cx = C.x + CELL / 2;
          var cy = C.y + CELL / 2;
          var rad, alpha;
          if (M.reduce) {
            rad = CELL * 1.05;
            alpha = 0.75 * Math.min(1, ring.p * 2);
          } else {
            rad = CELL * 0.7 + ring.p * CELL * 1.6;
            alpha = 0.85 * (1 - ring.p);
          }
          ctx.strokeStyle = 'rgba(' + rgb + ', ' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // The scan line, before a single cell is filled.
      if (st.scan != null) {
        var yy = st.scan * H;
        var grad = ctx.createLinearGradient(0, yy - 46, 0, yy);
        grad.addColorStop(0, 'rgba(' + rgb + ', 0)');
        grad.addColorStop(1, 'rgba(' + rgb + ', 0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, Math.max(0, yy - 46), W, Math.min(46, yy));
        ctx.fillStyle = 'rgba(' + rgb + ', 0.85)';
        ctx.fillRect(0, yy, W, 1);
      }
    }

    return { draw: draw, total: total, mode: mode, specials: specialList };
  }

  fields.forEach(function (cv) {
    var f = build(cv);
    var wrap = cv.closest('.field-wrap') || cv.parentNode;
    var countEl = wrap.querySelector('[data-field-count]');
    var labelEl = wrap.querySelector('[data-field-label]');
    var runBtn = wrap.querySelector('[data-field-run]');
    var noteEl = wrap.querySelector('[data-field-note]');
    var seq = null;
    var last = { filled: 0 };

    function paint(st) {
      last = st;
      f.draw(st);
    }
    function setCount(n) {
      if (countEl) {
        countEl.textContent = M.num(n) + ' / ' + M.num(f.total);
      }
    }

    if (f.mode === 'rank') {
      paint({ filled: 0 });
      dark.addEventListener('change', function () {
        f.draw(last);
      });
      return;
    }

    function reset() {
      if (countEl) countEl.classList.remove('is-finding');
      if (labelEl) labelEl.textContent = labelEl.dataset.fieldLabel;
      if (noteEl) {
        noteEl.classList.remove('is-in');
        noteEl.hidden = true;
      }
      setCount(0);
      paint({ filled: 0 });
    }

    function run() {
      if (seq) seq.cancel();
      seq = M.seq();
      reset();

      var fillMs = M.ms(2600, 1200);
      var beat = M.ms(820, 460); // two beats of nothing. This is the point.
      var step = M.ms(170, 100);
      var ringMs = M.ms(520, 300);

      if (M.reduce) {
        // A sweep is travel across the screen, so it goes. The grid arriving
        // still says "here is the estate" without anything sliding.
        seq.tween(M.ms(360), function (e) {
          paint({ filled: 0, grid: e });
        }, fill);
      } else {
        seq.tween(500, function (_, raw) {
          paint({ filled: 0, scan: raw });
        }, fill, linear);
      }

      function fill() {
        seq.tween(fillMs, function (e) {
          var n = Math.round(e * f.total);
          paint({ filled: n });
          setCount(n);
        }, function () {
          paint({ filled: f.total });
          setCount(f.total);
          seq.at(beat, callOut);
        });
      }

      function callOut() {
        var list = f.specials;
        var span = step * (list.length - 1) + ringMs;
        seq.tween(span, function (_, raw) {
          var el = raw * span;
          var lit = 0;
          var rings = [];
          // The wall steps back over the first stretch of the call-out.
          var dim = 1 - 0.72 * Math.min(1, el / (span * 0.45));
          for (var q = 0; q < list.length; q++) {
            var t0 = q * step;
            if (el < t0) break;
            lit = q + 1;
            var p = Math.min(1, (el - t0) / ringMs);
            if (p < 1) rings.push({ i: list[q], p: p });
          }
          paint({ filled: f.total, lit: lit, rings: rings, dim: dim });
        }, function () {
          paint({ filled: f.total, lit: list.length, dim: 0.28 });
          if (countEl) {
            countEl.textContent = String(list.length);
            countEl.classList.add('is-finding');
          }
          if (labelEl) labelEl.textContent = 'with nobody to call';
          seq.at(M.ms(300), function () {
            if (!noteEl) return;
            noteEl.hidden = false;
            requestAnimationFrame(function () {
              noteEl.classList.add('is-in');
            });
          });
        }, linear);
      }
    }

    reset();
    if (runBtn) runBtn.addEventListener('click', run);

    // Nothing runs off screen.
    M.onView(cv, function () {}, function () {
      if (seq) seq.cancel();
    });

    dark.addEventListener('change', function () {
      f.draw(last);
    });
  });
})();
