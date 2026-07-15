// Exposure clock.
//
// One fixed scale for every scenario — 0 to three weeks — so the outcomes are
// visually comparable rather than each rescaled to look the same size. A
// two-day exposure really is a tenth the width of a three-week one, and the
// prevented case really is nothing at all. That asymmetry is the argument.
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
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var X0 = 30;
  var X1 = 880;
  var SPAN = X1 - X0;
  var HOURS = 21 * 24; // full scale: three weeks
  var PLAY_MS = 5200; // scaled playback for the full three weeks

  var policy = false;
  var cmdb = true;
  var rafId = null;

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
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
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
      denied.classList.add('shown');
      windowOut.className = 'exp-window good';
      windowOut.textContent = 'none';
      subOut.textContent =
        'denied at request time. the misconfiguration could not exist, so there is nothing to detect, route, or fix.';
      return;
    }

    head.classList.add('is-live');
    windowOut.className = 'exp-window bad';

    var endH = s.end;
    var dur = (endH / HOURS) * PLAY_MS;

    if (reduce.matches) {
      bar.setAttribute('width', x(endH) - X0);
      head.style.transform = 'translate(' + x(endH) + 'px,0)';
      evLayer.querySelectorAll('.exp-ev').forEach(function (g) {
        g.classList.add('shown');
      });
      windowOut.textContent = s.label;
      subOut.textContent = s.sub;
      return;
    }

    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var h = p * endH;
      bar.setAttribute('width', Math.max(0, x(h) - X0));
      head.style.transform = 'translate(' + x(h) + 'px,0)';

      evLayer.querySelectorAll('.exp-ev').forEach(function (g) {
        if (h >= Number(g.dataset.h)) g.classList.add('shown');
      });

      windowOut.textContent = h < 24 ? Math.round(h) + ' h' : (h / 24).toFixed(1) + ' d';

      if (p < 1) rafId = requestAnimationFrame(tick);
      else {
        rafId = null;
        windowOut.textContent = s.label;
        subOut.textContent = s.sub;
      }
    }
    rafId = requestAnimationFrame(tick);
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
})();
