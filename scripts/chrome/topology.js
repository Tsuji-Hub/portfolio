// Animated node graph of the homelab topology, for the hero.
//
// Purposeful rather than decorative: the nodes are the real roles in the stack,
// sanitized — no hostnames, no addresses, no VM ids. Pulses travel the edges to
// suggest traffic. Under reduced motion the graph still draws itself in, edges
// growing from the hub outward and nodes fading up behind them, at half the
// timing; what stops is the drifting and the travelling pulses. A static frame
// was the old behaviour and it read as a dead image.
//
// Ported from the React component on redesign/agency-shell. Colours are read
// from the CSS custom properties instead of hardcoded, so the graph follows the
// theme (including the light palette, where the accent is a deeper teal).
//
// CSP: external file, script-src 'self'. Canvas 2D + rAF, no eval, no library.
(function () {
  var canvas = document.querySelector('[data-topology]');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  var accent = cssVar('--accent-rgb', '46, 230, 255');
  var labelColor = cssVar('--muted', '#8d95a1');
  var nodeColor = cssVar('--text', '#f4f5f7');

  var LAYOUT = [
    { id: 'pve', label: 'hypervisor', x: 0.5, y: 0.5, r: 7, hub: true },
    { id: 'zfs', label: 'zfs mirrors', x: 0.5, y: 0.86, r: 5 },
    { id: 'media', label: 'media vm · gpu', x: 0.2, y: 0.28, r: 5 },
    { id: 'docker', label: 'docker lxc', x: 0.78, y: 0.3, r: 5 },
    { id: 'vpn', label: 'vpn netns', x: 0.9, y: 0.55, r: 4 },
    { id: 'proxy', label: 'tls proxy', x: 0.16, y: 0.68, r: 4 },
    { id: 'req', label: 'requests', x: 0.76, y: 0.76, r: 4 },
    { id: 'mon', label: 'monitoring', x: 0.3, y: 0.9, r: 4 },
    { id: 'llm', label: 'llm · mcp', x: 0.08, y: 0.48, r: 4 },
    { id: 'dash', label: 'dashboard', x: 0.34, y: 0.1, r: 3.5 },
    { id: 'bak', label: 'nightly backups', x: 0.66, y: 0.94, r: 3.5 },
  ];

  var EDGES = [
    ['pve', 'zfs'], ['pve', 'media'], ['pve', 'docker'], ['pve', 'proxy'], ['pve', 'req'],
    ['pve', 'mon'], ['pve', 'dash'], ['docker', 'vpn'], ['proxy', 'media'], ['proxy', 'req'],
    ['req', 'docker'], ['mon', 'llm'], ['zfs', 'bak'], ['media', 'zfs'], ['docker', 'zfs'],
  ];

  var nodes = LAYOUT.map(function (n) {
    return { id: n.id, label: n.label, x: n.x, y: n.y, r: n.r, hub: n.hub, bx: n.x, by: n.y };
  });
  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  // Deterministic pulse phases: no Math.random, so the graph looks identical on
  // every load and a screenshot matches what the visitor sees.
  var pulses = EDGES.map(function (_, i) {
    return { edge: i, t: ((i * 37) % 100) / 100, speed: 0.0018 + ((i * 13) % 22) / 10000 };
  });

  var w = 0, h = 0, dpr = 1, raf = 0;
  var t0 = performance.now();
  var last = 0;

  // Glows are pre-rendered once per size/alpha into small offscreen canvases and
  // stamped with drawImage. Building 26 radial gradients every frame kept the
  // main thread busy most of the time the hero was on screen (Pass 8 trace:
  // ~2.3 s of task time per 3 s idle at 4x CPU throttle).
  var sprites = {};
  function sprite(radius, alpha) {
    var key = radius + ':' + alpha;
    if (sprites[key]) return sprites[key];
    var size = Math.ceil(radius * 2 * dpr);
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g2 = c.getContext('2d');
    var r = size / 2;
    var g = g2.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(' + accent + ', ' + alpha + ')');
    g.addColorStop(1, 'rgba(' + accent + ', 0)');
    g2.fillStyle = g;
    g2.beginPath();
    g2.arc(r, r, r, 0, Math.PI * 2);
    g2.fill();
    sprites[key] = c;
    return c;
  }
  function stamp(img, x, y, radius) {
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  }

  // The graph draws itself in once, in both motion modes. Edges grow from the
  // first node toward the second, then the nodes and labels fade up behind
  // them, so the picture assembles instead of appearing.
  var introMs = window.Motion ? window.Motion.ms(1600, 900) : 1600;
  // The panel itself fades in first (--t-canvas-delay). Starting the draw
  // underneath that fade means nobody ever sees it, which is how the graph
  // read as a static image even with the intro running.
  var introDelay = window.Motion ? window.Motion.ms(380, 200) : 380;
  // Quadratic, not cubic. A cubic ease-out puts 90% of a stroke draw into the
  // first third of its duration, which reads as a cut rather than a draw.
  function easeOut(x) { return 1 - Math.pow(1 - x, 2); }

  function px(n) { return { x: n.x * w, y: n.y * h }; }

  // Once the intro has finished the ambient drift is slow enough that 30 fps
  // reads the same as 60 and halves the paint work. The intro keeps every frame.
  var AMBIENT_FRAME_MS = 1000 / 30 - 2;

  function draw(now) {
    var t = (now - t0) / 1000;
    var settled = now - t0 - introDelay > introMs;
    if (settled && !reduce && last && now - last < AMBIENT_FRAME_MS) {
      if (running) raf = requestAnimationFrame(draw);
      return;
    }
    // Pulse speed was tuned per 60 Hz frame; scale by real elapsed time so it
    // stays the same at 30 fps, on 120 Hz screens, and after a resume.
    var steps = last ? Math.min((now - last) / (1000 / 60), 4) : 1;
    last = now;
    var intro = easeOut(Math.max(0, Math.min(1, (now - t0 - introDelay) / introMs)));
    // Labels and nodes trail the edges rather than arriving with them.
    var late = Math.max(0, Math.min(1, (intro - 0.35) / 0.65));
    ctx.clearRect(0, 0, w, h);

    if (!reduce) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var k = n.hub ? 0.004 : 0.012;
        n.x = n.bx + Math.sin(t * 0.6 + n.bx * 9) * k;
        n.y = n.by + Math.cos(t * 0.5 + n.by * 7) * k;
      }
    }

    // edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + accent + ', 0.14)';
    for (var e = 0; e < EDGES.length; e++) {
      var A = px(byId[EDGES[e][0]]);
      var B = px(byId[EDGES[e][1]]);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(A.x + (B.x - A.x) * intro, A.y + (B.y - A.y) * intro);
      ctx.stroke();
    }

    // pulses travelling the edges
    if (!reduce) {
      for (var p = 0; p < pulses.length; p++) {
        var pu = pulses[p];
        pu.t += pu.speed * steps;
        if (pu.t > 1) pu.t = 0;
        var P1 = px(byId[EDGES[pu.edge][0]]);
        var P2 = px(byId[EDGES[pu.edge][1]]);
        var x = P1.x + (P2.x - P1.x) * pu.t;
        var y = P1.y + (P2.y - P1.y) * pu.t;
        stamp(sprite(8, 0.9), x, y, 8);
      }
    }

    // nodes + labels
    ctx.globalAlpha = late;
    ctx.textBaseline = 'middle';
    ctx.font = '500 11px ui-monospace, "JetBrains Mono", monospace';
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j];
      var P = px(node);
      stamp(sprite(node.r * 4, node.hub ? 0.35 : 0.18), P.x, P.y, node.r * 4);

      ctx.fillStyle = node.hub ? 'rgb(' + accent + ')' : nodeColor;
      ctx.beginPath();
      ctx.arc(P.x, P.y, node.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = labelColor;
      var tx = P.x + node.r + 8;
      var flip = tx + 90 > w;
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.fillText(node.label, flip ? P.x - node.r - 8 : tx, P.y);
    }
    ctx.globalAlpha = 1;

    // Under reduce the loop runs only until the graph has finished drawing.
    if (running && (!reduce || intro < 1)) raf = requestAnimationFrame(draw);
  }

  // Setting canvas.width clears the bitmap, so under reduced motion (where there
  // is no animation loop to repaint it) every resize must redraw the static
  // frame itself. Without this the graph silently disappears on any resize.
  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sprites = {};
    if (reduce) draw(performance.now());
  }

  var ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Nothing runs a frame loop off screen. Scrolling the hero away stops the
  // graph; scrolling back resumes it where it was, and a graph that had
  // finished drawing itself in does not start over.
  var running = false;
  var elapsed = 0;
  function start() {
    if (running) return;
    running = true;
    t0 = performance.now() - elapsed;
    raf = requestAnimationFrame(draw);
  }
  function stop() {
    if (!running) return;
    running = false;
    elapsed = performance.now() - t0;
    cancelAnimationFrame(raf);
    last = 0;
  }
  if (window.Motion) window.Motion.onView(canvas, start, stop);
  else start();

  // Repaint on theme flip so the graph picks up the new palette.
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', function () {
    accent = cssVar('--accent-rgb', '46, 230, 255');
    labelColor = cssVar('--muted', '#8d95a1');
    nodeColor = cssVar('--text', '#f4f5f7');
    sprites = {};
    if (reduce) draw(performance.now());
  });
})();
