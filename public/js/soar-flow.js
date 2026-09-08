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
// So the run ends by putting both payloads side by side and walking down them
// in pairs. "Identical" is then something you check rather than something the
// page asserts, and only after that does the time comparison resolve.
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
  var M = window.Motion;
  var cmp = root.querySelector('[data-flow-compare]');
  var cmpAuto = root.querySelector('[data-cmp-auto]');
  var cmpManual = root.querySelector('[data-cmp-manual]');
  var cmpAutoT = root.querySelector('[data-cmp-auto-t]');
  var cmpManualT = root.querySelector('[data-cmp-manual-t]');
  var cmpRatio = root.querySelector('[data-cmp-ratio]');
  var seq = null;

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

  function payloadLines(upto) {
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
    return ['{'].concat(
      keys.map(function (k, i) {
        return '  "' + k + '": ' + obj[k] + (i < keys.length - 1 ? ',' : '');
      }),
      ['}']
    );
  }

  /** One element per line, so a field can be seen being stamped on. */
  function paintLines(el, lines) {
    while (el.firstChild) el.removeChild(el.firstChild);
    lines.forEach(function (text) {
      var span = document.createElement('span');
      span.className = 'ln';
      span.textContent = text;
      el.appendChild(span);
    });
  }

  var shownLines = 0;
  function renderPayload(upto) {
    var lines = payloadLines(upto);
    // Repaint only when the payload actually changed. This runs on every
    // frame of the playback, and rebuilding the spans each time wiped the
    // stamp highlight one frame after it was applied, so nothing ever
    // flashed. It is also a lot less DOM churn.
    if (lines.length === shownLines) return;
    var from = shownLines;
    shownLines = lines.length;
    paintLines(payload, lines);
    if (lines.length <= from || from === 0) return;
    // Flash whatever this hop just bolted on, then let it settle.
    var kids = payload.children;
    for (var i = from - 1; i < lines.length - 1; i++) {
      if (kids[i]) kids[i].classList.add('stamp');
    }
    if (!seq) return;
    seq.at(M.ms(520, 380), function () {
      for (var j = 0; j < kids.length; j++) kids[j].classList.remove('stamp');
    });
  }

  var shownSteps = -1;
  function renderSteps(upto) {
    if (upto === shownSteps) return;
    shownSteps = upto;
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
    if (seq) seq.cancel();
    seq = M.seq();
    if (token.getAnimations) token.getAnimations().forEach(function (a) { a.cancel(); });
    token.classList.remove('is-live');
    root.querySelectorAll('.flow-node').forEach(function (n) {
      n.classList.remove('fired');
    });
    root.querySelectorAll('.flow-edge').forEach(function (e) {
      e.classList.remove('hot');
    });
    shownLines = 0;
    shownSteps = -1;
    renderPayload(0);
    renderSteps(0);
    if (cmp) {
      cmp.classList.remove('is-in');
      cmp.hidden = true;
    }
    var total = totalFor(mode);
    clock.className = 'flow-clock' + (mode === 'manual' ? ' slow' : '');
    clock.textContent = fmtTime(total);
    cost.textContent =
      mode === 'auto'
        ? 'per alert, unattended, every time'
        : 'per alert, of an analyst, who has a queue of them';
  }

  /**
   * Both payloads, side by side, checked line against line. Then, and only
   * then, the times resolve and the ratio counts up.
   */
  function resolve(total) {
    if (!cmp) return;
    var lines = payloadLines(STEPS.length);
    paintLines(cmpAuto, lines);
    paintLines(cmpManual, lines);
    cmp.hidden = false;
    requestAnimationFrame(function () {
      cmp.classList.add('is-in');
    });

    var autoTotal = totalFor('auto');
    var manualTotal = totalFor('manual');
    cmpAutoT.textContent = fmtTime(autoTotal);
    cmpManualT.textContent = fmtTime(manualTotal);
    cmpRatio.textContent = '';

    // A bar of light walks down both columns together and clears behind
    // itself. Leaving every line lit just turns both blocks cyan; the point
    // is the checking, not the state afterwards.
    var step = M.ms(120, 70);
    var hold = M.ms(420, 260);
    lines.forEach(function (_, i) {
      seq.at(M.ms(320, 200) + i * step, function () {
        if (cmpAuto.children[i]) cmpAuto.children[i].classList.add('pair');
        if (cmpManual.children[i]) cmpManual.children[i].classList.add('pair');
      });
      seq.at(M.ms(320, 200) + i * step + hold, function () {
        if (cmpAuto.children[i]) cmpAuto.children[i].classList.remove('pair');
        if (cmpManual.children[i]) cmpManual.children[i].classList.remove('pair');
      });
    });

    seq.at(M.ms(320, 200) + lines.length * step + M.ms(420, 240), function () {
      var ratio = manualTotal / autoTotal;
      seq.count(cmpRatio, 0, ratio, M.ms(900), function (n) {
        return Math.round(n) + '× longer, per alert, every alert';
      });
    });
  }

  function run() {
    reset();
    var total = totalFor(mode);
    token.classList.add('is-live');

    // Under reduce the token no longer walks the graph (that is travel across
    // the screen), but every hop still fires in sequence and still stamps its
    // field onto the payload, because that is the information.
    var play = M.ms(PLAY, 1900);

    seq.tween(play, function (_, p) {
      var pos = p * (XS.length - 1);
      if (!M.reduce) {
        var i = Math.min(Math.floor(pos), XS.length - 2);
        var f = pos - i;
        token.style.transform =
          'translate(' + (XS[i] + (XS[i + 1] - XS[i]) * f) + 'px,0)';
      }

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
    }, function () {
      clock.textContent = fmtTime(total);
      renderPayload(STEPS.length);
      renderSteps(STEPS.length);
      if (M.reduce) token.style.transform = 'translate(' + XS[XS.length - 1] + 'px,0)';
      seq.at(M.ms(520, 300), function () {
        resolve(total);
      });
    }, function (t) { return t; }); // real time: the wait is the argument
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

  M.onView(root, function () {}, function () {
    if (seq) seq.cancel();
  });
})();
