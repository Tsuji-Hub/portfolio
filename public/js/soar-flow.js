// SOAR workflow canvas.
//
// The graph is the boring half. The argument is the payload: a finding arrives
// knowing almost nothing, and every hop bolts context onto it until it is a
// case a human can action instead of a task a human has to research.
//
// The manual and automated runs produce the IDENTICAL payload on purpose. The
// workflow does nothing an analyst couldn't. It does it in seconds, at 3am, for
// every alert, without getting bored. That is the entire pitch and the demo
// should not pretend otherwise.
//
// CSP: external, script-src 'self'. rAF + WAAPI + CSSOM. No eval, no library.
(function () {
  var root = document.querySelector('[data-flow]');
  if (!root) return;

  var svg = root.querySelector('[data-flow-svg]');
  var token = root.querySelector('#flow-token');
  var payload = root.querySelector('[data-flow-payload]');
  var clock = root.querySelector('[data-flow-clock]');
  var cost = root.querySelector('[data-flow-cost]');
  var stepList = root.querySelector('[data-flow-steps]');
  var runBtn = root.querySelector('[data-flow-run]');
  var modeBtns = root.querySelectorAll('[data-flow-mode]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var mode = 'auto';
  var PLAY = 3200; // wall-clock playback; the *reported* time is the real point

  // x centres of the five nodes, matching the SVG
  var XS = [100, 275, 450, 625, 800];

  var STEPS = [
    {
      id: 'trigger',
      auto: 400,
      manual: 0,
      autoNote: 'webhook fires the moment Wiz raises it',
      manualNote: 'lands in a queue and waits to be noticed',
      add: null,
    },
    {
      id: 'cmdb',
      auto: 1200,
      manual: 12 * 60000,
      autoNote: 'project → owning application, straight from the CMDB',
      manualNote: 'open the CMDB, search the project id, ask around',
      add: { app: '"payments-api"', owner: '"team-payments"' },
    },
    {
      id: 'context',
      auto: 2100,
      manual: 6 * 60000,
      autoNote: 'severity, exposure, prior findings on this asset',
      manualNote: 'three consoles, copy-paste, hope you got the right one',
      add: { severity: '"high"', publiclyReadable: 'true', priorFindings: '2' },
    },
    {
      id: 'dedupe',
      auto: 600,
      manual: 4 * 60000,
      autoNote: 'already open? then comment, do not spawn a twin',
      manualNote: 'scroll the queue and hope you would recognise a duplicate',
      add: { duplicate: 'false' },
    },
    {
      id: 'case',
      auto: 3700,
      manual: 3 * 60000,
      autoNote: 'case opens pre-filled and assigned',
      manualNote: 'type it all in by hand',
      add: { case: '"SEC0042191"', assignedTo: '"team-payments"' },
    },
  ];

  var BASE = {
    finding: '"storage bucket is publicly readable"',
    project: '"proj-8842"',
    resource: '"gs://redacted-bucket"',
  };

  function fmtTime(ms) {
    if (ms < 1000) return Math.round(ms) + ' ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
    var m = Math.floor(ms / 60000);
    var s = Math.round((ms % 60000) / 1000);
    return m + ' min' + (s ? ' ' + s + ' s' : '');
  }

  function totalFor(m) {
    return STEPS.reduce(function (a, s) {
      return a + (m === 'auto' ? s.auto : s.manual);
    }, 0);
  }

  function renderPayload(upto) {
    var obj = {};
    Object.keys(BASE).forEach(function (k) {
      obj[k] = BASE[k];
    });
    for (var i = 0; i < upto; i++) {
      var add = STEPS[i].add;
      if (!add) continue;
      Object.keys(add).forEach(function (k) {
        obj[k] = add[k];
      });
    }
    var keys = Object.keys(obj);
    var lines = keys.map(function (k, i) {
      return '  "' + k + '": ' + obj[k] + (i < keys.length - 1 ? ',' : '');
    });
    payload.textContent = '{\n' + lines.join('\n') + '\n}';
  }

  function renderSteps(upto) {
    var items = stepList.querySelectorAll('li');
    items.forEach(function (li, i) {
      var s = STEPS[i];
      var t = li.querySelector('.t');
      var n = li.querySelector('.n');
      t.textContent = fmtTime(mode === 'auto' ? s.auto : s.manual);
      n.textContent = mode === 'auto' ? s.autoNote : s.manualNote;
      li.classList.toggle('slow', mode === 'manual');
      li.classList.toggle('shown', i < upto);
    });
  }

  function reset() {
    if (token.getAnimations) token.getAnimations().forEach(function (a) { a.cancel(); });
    token.classList.remove('is-live');
    root.querySelectorAll('.flow-node').forEach(function (n) {
      n.classList.remove('fired');
    });
    root.querySelectorAll('.flow-edge').forEach(function (e) {
      e.classList.remove('hot');
    });
    renderPayload(0);
    renderSteps(0);
    var total = totalFor(mode);
    clock.className = 'flow-clock' + (mode === 'manual' ? ' slow' : '');
    clock.textContent = fmtTime(total);
    cost.textContent =
      mode === 'auto'
        ? 'per alert, unattended, every time'
        : 'per alert, of an analyst, who has a queue of them';
  }

  var rafId = null;

  function run() {
    reset();
    var total = totalFor(mode);
    token.classList.add('is-live');

    if (reduce.matches) {
      root.querySelectorAll('.flow-node').forEach(function (n) { n.classList.add('fired'); });
      root.querySelectorAll('.flow-edge').forEach(function (e) { e.classList.add('hot'); });
      token.style.transform = 'translate(' + XS[XS.length - 1] + 'px,0)';
      renderPayload(STEPS.length);
      renderSteps(STEPS.length);
      clock.textContent = fmtTime(total);
      return;
    }

    var start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / PLAY, 1);

      // token walks the node centres
      var pos = p * (XS.length - 1);
      var i = Math.min(Math.floor(pos), XS.length - 2);
      var f = pos - i;
      var x = XS[i] + (XS[i + 1] - XS[i]) * f;
      token.style.transform = 'translate(' + x + 'px,0)';

      var done = Math.min(Math.floor(pos) + 1, STEPS.length);
      root.querySelectorAll('.flow-node').forEach(function (n, idx) {
        n.classList.toggle('fired', idx < done);
      });
      root.querySelectorAll('.flow-edge').forEach(function (e, idx) {
        e.classList.toggle('hot', idx < done - 1);
      });
      renderPayload(done);
      renderSteps(done);

      // the clock reports the REAL elapsed time of this pipeline, not playback
      clock.textContent = fmtTime(p * total);

      if (p < 1) rafId = requestAnimationFrame(tick);
      else {
        rafId = null;
        clock.textContent = fmtTime(total);
        renderPayload(STEPS.length);
        renderSteps(STEPS.length);
      }
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.flowMode;
      modeBtns.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      reset();
    });
  });
  runBtn.addEventListener('click', run);

  reset();
})();
