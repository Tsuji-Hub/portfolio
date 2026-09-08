// Latency lab. Build a pipeline, hear how long it would take.
//
// The playback runs in REAL TIME — 3448ms of waiting is 3448ms of waiting. That
// is the whole point: the gap between 3.4s and 1.2s is the gap between talking
// to a machine and talking to someone, and no bar chart conveys it.
//
// Every figure is measured off the live bot except the two roadmap options,
// which are labelled as estimates.
//
// CSP: external, script-src 'self'. rAF + WAAPI + CSSOM. No eval, no library.
(function () {
  var root = document.querySelector('[data-lab]');
  if (!root) return;

  var svg = root.querySelector('[data-lab-svg]');
  var track = root.querySelector('[data-lab-track]');
  var head = root.querySelector('#lab-head');
  var clock = root.querySelector('[data-lab-clock]');
  var totalOut = root.querySelector('[data-lab-total]');
  var deltaOut = root.querySelector('[data-lab-delta]');
  var note = root.querySelector('[data-lab-note]');
  var runBtn = root.querySelector('[data-lab-run]');
  var optBtns = root.querySelectorAll('[data-opt]');
  var M = window.Motion;
  var seq = M.seq();
  var cmp = root.querySelector('[data-lab-compare]');
  var cmpBaseBar = root.querySelector('[data-cmp-base-bar]');
  var cmpNowBar = root.querySelector('[data-cmp-now-bar]');
  var cmpBaseT = root.querySelector('[data-cmp-base-t]');
  var cmpNowT = root.querySelector('[data-cmp-now-t]');

  var X0 = 24;
  var X1 = 876;
  var SPAN = X1 - X0;
  var BASELINE = 3448;

  var cfg = { silence: 900, stt: 1194, model: 970, tts: 384 };

  var META = {
    silence: { name: 'turn end', cls: 's-silence' },
    stt: { name: 'speech-to-text', cls: 's-stt' },
    model: { name: 'model', cls: 's-model' },
    tts: { name: 'text-to-speech', cls: 's-tts' },
  };

  var NOTES = {
    3448:
      'This is the profile I actually measured, not an estimate. Speech-to-text and the silence wait are 60% of it between them — and Kokoro, the stage that sounds like it should be the slow one, is the fastest thing here. A night spent optimising text-to-speech would have bought nothing.',
    2754:
      "Tonight's changes, both free. The silence wait was dead time on every single turn. Beam search is worth it on a forty-minute podcast; on \"play Funkytown\" it pays double the decode time to fix a word you were never going to get wrong.",
    1259:
      'The roadmap. A faster ASR model that is better AND cheaper, streaming the reply instead of waiting for all of it, and predicting that you have finished speaking instead of waiting out a fixed silence. About 1.2 seconds — the difference between a bot and a person.',
  };

  function total() {
    return cfg.silence + cfg.stt + cfg.model + cfg.tts;
  }

  function fmt(ms) {
    return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
  }

  function render() {
    var t = total();
    while (track.firstChild) track.removeChild(track.firstChild);

    var x = X0;
    ['silence', 'stt', 'model', 'tts'].forEach(function (k) {
      var w = (cfg[k] / t) * SPAN;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'lab-seg ' + META[k].cls);
      g.dataset.seg = k;

      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', 34);
      r.setAttribute('width', Math.max(2, w - 2));
      r.setAttribute('height', 46);
      r.setAttribute('rx', 5);
      g.appendChild(r);

      // The level meter for this stage, filled as it runs.
      var fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      fill.setAttribute('class', 'lab-fill');
      fill.setAttribute('x', x);
      fill.setAttribute('y', 34);
      fill.setAttribute('width', 0);
      fill.setAttribute('height', 46);
      fill.setAttribute('rx', 5);
      fill.dataset.fill = k;
      fill.dataset.full = Math.max(2, w - 2);
      g.appendChild(fill);

      if (w > 74) {
        var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x + w / 2 - 1);
        label.setAttribute('y', 56);
        label.setAttribute('text-anchor', 'middle');
        label.textContent = META[k].name;
        g.appendChild(label);

        var ms = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ms.setAttribute('class', 'lab-ms');
        ms.setAttribute('x', x + w / 2 - 1);
        ms.setAttribute('y', 71);
        ms.setAttribute('text-anchor', 'middle');
        ms.textContent = cfg[k] + 'ms';
        g.appendChild(ms);
      }
      track.appendChild(g);
      x += w;
    });

    totalOut.textContent = 'total ' + fmt(t);
    var d = t - BASELINE;
    deltaOut.className = 'lab-delta ' + (d < 0 ? 'better' : d > 0 ? 'worse' : '');
    deltaOut.textContent =
      d === 0 ? 'as measured' : (d < 0 ? '−' : '+') + fmt(Math.abs(d)) + ' vs measured';
    note.textContent = NOTES[t] || 'Mix and match. The clock is real time.';
    clock.textContent = '0 ms';
  }

  var anim = null;
  var rafId = null;

  function stop() {
    seq.cancel();
    seq = M.seq();
    if (cmp) {
      cmp.classList.remove('is-in');
      cmp.hidden = true;
    }
    root.querySelectorAll('.lab-fill').forEach(function (f) {
      f.setAttribute('width', 0);
    });
    if (anim) {
      anim.cancel();
      anim = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    head.classList.remove('is-live');
    root.querySelectorAll('.lab-seg').forEach(function (g) {
      g.classList.remove('done');
    });
  }

  /** Both pipelines at the same scale, once you have waited out this one. */
  function resolve(t) {
    if (!cmp) return;
    var worst = Math.max(BASELINE, t);
    cmpBaseT.textContent = fmt(BASELINE);
    cmpNowT.textContent = fmt(t);
    cmp.hidden = false;
    requestAnimationFrame(function () {
      cmp.classList.add('is-in');
    });
    seq.tween(M.ms(760), function (e) {
      cmpBaseBar.style.width = ((BASELINE / worst) * 100 * e).toFixed(2) + '%';
      cmpNowBar.style.width = ((t / worst) * 100 * e).toFixed(2) + '%';
    });
  }

  function run() {
    stop();
    var t = total();
    head.classList.add('is-live');

    // Real time in both motion modes, deliberately. Everywhere else on the
    // site reduce halves the timing; here the duration IS the measurement, and
    // playing 3.4 seconds of waiting in 1.7 would be a lie about the thing the
    // demo exists to show. What reduce drops is the head sliding along the
    // track. The bars still fill and the clock still counts.
    if (!M.reduce) {
      anim = head.animate(
        [
          { transform: 'translate(' + X0 + 'px,0)' },
          { transform: 'translate(' + X1 + 'px,0)' },
        ],
        { duration: t, easing: 'linear', fill: 'forwards' }
      );
    } else {
      head.style.transform = 'translate(' + X1 + 'px,0)';
    }

    var order = ['silence', 'stt', 'model', 'tts'];
    seq.tween(t, function (_, raw) {
      var el = raw * t;
      clock.textContent = fmt(el);

      var acc = 0;
      order.forEach(function (k) {
        var seg = cfg[k];
        var into = Math.max(0, Math.min(seg, el - acc));
        acc += seg;
        var f = root.querySelector('.lab-fill[data-fill="' + k + '"]');
        if (f) f.setAttribute('width', (Number(f.dataset.full) * (into / seg)).toFixed(1));
        var g = root.querySelector('.lab-seg[data-seg="' + k + '"]');
        if (g) g.classList.toggle('done', el >= acc);
      });
    }, function () {
      clock.textContent = fmt(t);
      seq.at(M.ms(420, 260), function () {
        resolve(t);
      });
    }, function (x) { return x; });
  }

  optBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.dataset.opt;
      cfg[k] = Number(b.dataset.val);
      optBtns.forEach(function (o) {
        if (o.dataset.opt === k) o.setAttribute('aria-pressed', String(o === b));
      });
      stop();
      render();
    });
  });

  runBtn.addEventListener('click', run);

  render();
})();
