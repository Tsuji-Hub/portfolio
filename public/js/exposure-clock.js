// Exposure clock.
//
// One fixed scale for every scenario — 0 to three weeks — so the outcomes are
// visually comparable rather than each rescaled to look the same size. A
// two-day exposure really is a tenth the width of a three-week one, and the
// prevented case really is nothing at all. That asymmetry is the argument.
//
// The playback is choreographed rather than just scaled: day marks light up as
// the exposure passes them, the bar's head carries a blinking terminal cursor
// so a long bar reads as *waiting* rather than as a long bar, and the prevented
// case starts to draw and is cut to nothing, which is what actually happens at
// request time. Under reduce the bar still draws, at half the timing; only the
// blink stops.
//
// CSP: external, script-src 'self'. rAF + CSSOM. No eval, no library.
(function () {
  var root = document.querySelector('[data-clock]');
  if (!root) return;

  var bar = root.querySelector('#exp-bar');
  var head = root.querySelector('#exp-head');
  var denied = root.querySelector('.exp-denied');
  var evLayer = root.querySelector('[data-events]');
  var windowOut = root.querySelector('[data-exp-window]');
  var subOut = root.querySelector('[data-exp-sub]');
  var policyBtn = root.querySelector('[data-policy]');
  var cmdbBtn = root.querySelector('[data-cmdb]');
  var runBtn = root.querySelector('[data-deploy]');
  var M = window.Motion;

  var X0 = 30;
  var X1 = 880;
  var SPAN = X1 - X0;
  var HOURS = 21 * 24; // full scale: three weeks
  var PLAY_MS = 5200; // scaled playback for the full three weeks

  var policy = false;
  var cmdb = true;
  var seq = null;

  // Each vertical rule in the grid plus the label that follows it. Grouped
  // here rather than in the markup so the SVG stays a plain readable scale.
  var ticks = [];
  (function () {
    var grid = root.querySelector('.exp-grid');
    if (!grid) return;
    var kids = Array.prototype.slice.call(grid.children);
    kids.forEach(function (el, i) {
      if (el.tagName !== 'line') return;
      if (el.getAttribute('x1') !== el.getAttribute('x2')) return; // the axis
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'tick');
      el.parentNode.insertBefore(g, el);
      g.appendChild(el);
      var label = kids[i + 1];
      if (label && label.tagName === 'text') g.appendChild(label);
      ticks.push({ x: Number(el.getAttribute('x1')), g: g });
    });
  })();

  function lightTicks(headX) {
    for (var i = 0; i < ticks.length; i++) {
      ticks[i].g.classList.toggle('is-passed', headX >= ticks[i].x - 0.5);
    }
  }

  /** Reveal text one character at a time. Information over time, so it
      survives reduce at half the rate. */
  function type(el, text, per) {
    el.textContent = '';
    el.classList.add('is-typing');
    var n = text.length;
    seq.tween(per * n, function (_, raw) {
      el.textContent = text.slice(0, Math.round(raw * n));
    }, function () {
      el.textContent = text;
      el.classList.remove('is-typing');
    }, function (t) { return t; });
  }

  function x(h) {
    return X0 + (Math.min(h, HOURS) / HOURS) * SPAN;
  }

  function scenario() {
    if (policy) return { denied: true };
    if (cmdb) {
      return {
        end: 48,
        events: [
          { h: 0, k: 'bad', t: 'created, public' },
          { h: 6, k: 'bad', t: 'CSPM detects' },
          { h: 6.5, k: 'ok', t: 'routed to owner' },
          { h: 48, k: 'ok', t: 'remediated' },
        ],
        label: '2 days',
        sub: 'detected, routed, fixed. the best case still costs you the detection lag plus however long a human takes.',
      };
    }
    return {
      end: 504,
      events: [
        { h: 0, k: 'bad', t: 'created, public' },
        { h: 6, k: 'bad', t: 'CSPM detects' },
        { h: 6.5, k: 'bad', t: 'no owner → shared mailbox' },
        { h: 504, k: 'bad', t: 'someone notices. or does not.' },
      ],
      label: '3 weeks',
      sub: 'same detection, same finding. nobody owned the project, so nobody acted. this is what 1,100+ unmapped projects costs.',
    };
  }

  function clearRun() {
    if (seq) seq.cancel();
    seq = M.seq();
    subOut.classList.remove('is-typing');
    lightTicks(-1);
    bar.setAttribute('width', 0);
    head.classList.remove('is-live');
    denied.classList.remove('shown');
    evLayer.querySelectorAll('.exp-ev').forEach(function (g) {
      g.classList.remove('shown');
    });
  }

  function drawEvents(s) {
    while (evLayer.firstChild) evLayer.removeChild(evLayer.firstChild);
    if (!s.events) return;
    s.events.forEach(function (e, i) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'exp-ev ' + e.k);
      g.dataset.h = e.h;
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x(e.h));
      c.setAttribute('cy', 62);
      c.setAttribute('r', 5);
      g.appendChild(c);
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // stagger labels so the early cluster doesn't collide
      t.setAttribute('x', x(e.h) + 8);
      t.setAttribute('y', i % 2 ? 40 : 92);
      t.textContent = e.t;
      g.appendChild(t);
      evLayer.appendChild(g);
    });
  }

  function reset() {
    clearRun();
    var s = scenario();
    drawEvents(s);
    if (s.denied) {
      windowOut.className = 'exp-window good';
      windowOut.textContent = 'none';
      subOut.textContent =
        'the constraint evaluates at creation, so there is no window to measure. no finding, no ticket, nothing to remediate.';
    } else {
      windowOut.className = 'exp-window';
      windowOut.textContent = '—';
      subOut.textContent = 'press deploy.';
    }
  }

  function run() {
    clearRun();
    var s = scenario();

    if (s.denied) {
      // It starts to draw, then the constraint cuts it at the wrist. Seeing
      // the bar begin and stop is the difference between "there was no
      // exposure" and "the exposure was prevented".
      head.classList.add('is-live');
      windowOut.className = 'exp-window';
      var stub = 46;
      seq.tween(M.ms(300), function (e) {
        bar.setAttribute('width', stub * e);
        head.style.transform = 'translate(' + (X0 + stub * e) + 'px,0)';
      }, function () {
        seq.at(M.ms(140), function () {
          bar.setAttribute('width', 0);
          head.classList.remove('is-live');
          denied.classList.add('shown');
          seq.anim(denied, [{ opacity: 0 }, { opacity: 1 }], {
            duration: M.ms(220),
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards',
          });
          windowOut.className = 'exp-window good';
          windowOut.textContent = 'none';
          type(
            subOut,
            'denied at request time. the misconfiguration could not exist, so there is nothing to detect, route, or fix.',
            M.ms(13, 7)
          );
        });
      });
      return;
    }

    head.classList.add('is-live');
    windowOut.className = 'exp-window bad';
    subOut.textContent = '';

    var endH = s.end;
    // Under reduce the bar still draws. It used to snap to its final width,
    // which meant the one thing this demo exists to show never happened.
    var dur = M.ms((endH / HOURS) * PLAY_MS);

    seq.tween(dur, function (_, raw) {
      var h = raw * endH;
      var hx = x(h);
      bar.setAttribute('width', Math.max(0, hx - X0));
      head.style.transform = 'translate(' + hx + 'px,0)';
      lightTicks(hx);

      evLayer.querySelectorAll('.exp-ev').forEach(function (g) {
        if (h >= Number(g.dataset.h)) g.classList.add('shown');
      });

      windowOut.textContent = h < 24 ? Math.round(h) + ' h' : (h / 24).toFixed(1) + ' d';
    }, function () {
      windowOut.textContent = s.label;
      type(subOut, s.sub, M.ms(11, 6));
    }, function (t) { return t; }); // real time, so the wait is the wait
  }

  function labels() {
    policyBtn.textContent = policy ? 'org policy: enforced' : 'org policy: not enforced';
    policyBtn.setAttribute('aria-pressed', String(policy));
    cmdbBtn.textContent = cmdb ? 'cmdb owner: mapped' : 'cmdb owner: unmapped';
    cmdbBtn.setAttribute('aria-pressed', String(cmdb));
    cmdbBtn.disabled = policy; // nothing gets created, so ownership never comes up
  }

  policyBtn.addEventListener('click', function () {
    policy = !policy;
    labels();
    reset();
  });
  cmdbBtn.addEventListener('click', function () {
    cmdb = !cmdb;
    labels();
    reset();
  });
  runBtn.addEventListener('click', run);

  labels();
  reset();

  // Nothing runs a frame loop off screen.
  M.onView(root, function () {}, function () {
    if (seq) seq.cancel();
  });
})();
