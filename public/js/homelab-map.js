// Homelab architecture map.
//
// CSP notes: served as an external file under script-src 'self'. No eval, no
// Function(), no string timers, no inline handlers — every interaction is bound
// with addEventListener via delegation on the container. Animation is the Web
// Animations API (a DOM API, not CSP-gated) and CSSOM writes, which CSP does
// not restrict. No library, no bundle.
(function () {
  var root = document.querySelector('[data-map]');
  if (!root) return;

  var panel = root.querySelector('[data-panel]');
  var packet = root.querySelector('#packet');
  var blockMark = root.querySelector('#block-mark');
  var ghost = root.querySelector('#ghost-bypass');
  var nodes = root.querySelectorAll('.node');
  var traceBtns = root.querySelectorAll('[data-trace]');
  var tunnelBtn = root.querySelector('[data-toggle="tunnel"]');
  var tunnelNode = root.querySelector('.node[data-node="tunnel"]');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  var desc = {};
  root.querySelectorAll('[data-desc]').forEach(function (d) {
    desc[d.dataset.desc] = d.innerHTML;
  });

  var tunnelUp = true;
  var lastTraceKey = null;
  var anims = [];

  var TRACES = {
    normal: {
      route: 'route-normal',
      title: 'Normal service egress',
      body:
        'The Media VM reaches the internet the ordinary way: through the reverse proxy and out the LAN gateway. Nothing exotic. This is precisely the path the isolated workloads are not permitted to take.',
    },
    isolated: {
      route: 'route-isolated',
      title: 'Isolated workload egress',
      body:
        'The only way out of the namespace is the tunnel, to the VPN provider, then the internet. Not the preferred route. The only route that exists.',
    },
    isolatedDown: {
      route: 'route-tunneldown',
      blocked: true,
      blockAt: [235, 334],
      title: 'Tunnel down: fail-closed',
      body:
        'With the tunnel down, the workloads lose the internet entirely. They do not fall back to the LAN gateway, because inside the namespace there is no other interface and no default route to fall back to. Losing connectivity is the correct failure. It holds because of the topology, not because of a rule someone remembered to write.',
    },
    bypass: {
      route: 'route-bypass',
      ghost: true,
      blocked: true,
      blockAt: [382, 378],
      title: 'Bypass attempt: no route',
      body:
        'A workload trying to reach the LAN gateway directly gets nowhere. No interface inside this namespace is attached to the LAN, and no route points at it, so the packet has nowhere to be sent. Blocking this took no firewall rule. The path was simply never built.',
    },
  };

  function resolve(key) {
    if (key === 'isolated' && !tunnelUp) return TRACES.isolatedDown;
    return TRACES[key];
  }

  function clear() {
    anims.forEach(function (a) {
      a.cancel();
    });
    anims = [];
    root.querySelectorAll('.route').forEach(function (p) {
      p.classList.remove('is-live');
      p.style.strokeDasharray = '';
      p.style.strokeDashoffset = '';
    });
    ghost.classList.remove('is-live');
    packet.classList.remove('is-live', 'is-blocked');
    blockMark.classList.remove('is-live');
    nodes.forEach(function (n) {
      n.classList.remove('active');
    });
    traceBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
    });
  }

  function runTrace(key) {
    var t = resolve(key);
    var path = root.querySelector('#' + t.route);
    if (!path) return;

    clear();
    lastTraceKey = key;

    var btn = root.querySelector('[data-trace="' + key + '"]');
    if (btn) btn.setAttribute('aria-pressed', 'true');

    panel.innerHTML = '<h3></h3><p></p>';
    panel.querySelector('h3').textContent = t.title;
    panel.querySelector('p').textContent = t.body;

    if (t.ghost) ghost.classList.add('is-live');
    path.classList.add('is-live');
    packet.classList.add('is-live');
    if (t.blocked) packet.classList.add('is-blocked');

    var len = path.getTotalLength();
    var dur = Math.max(650, Math.min(2200, len * 2.6));
    var reduce = motionQuery.matches;

    path.style.strokeDasharray = len + ' ' + len;

    if (reduce) {
      // Static alternative: final state, no motion. Route drawn, packet resting
      // where it actually ends up (destination, or the point it dies).
      path.style.strokeDashoffset = '0';
      var end = path.getPointAtLength(len);
      packet.style.transform = 'translate(' + end.x + 'px,' + end.y + 'px)';
      if (t.blocked) {
        blockMark.style.transform =
          'translate(' + t.blockAt[0] + 'px,' + t.blockAt[1] + 'px)';
        blockMark.classList.add('is-live');
      }
      return;
    }

    path.style.strokeDashoffset = String(len);
    anims.push(
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: dur,
        easing: 'ease-in-out',
        fill: 'forwards',
      })
    );

    var frames = [];
    for (var i = 0; i <= 60; i++) {
      var p = path.getPointAtLength(len * (i / 60));
      frames.push({ transform: 'translate(' + p.x + 'px,' + p.y + 'px)' });
    }
    anims.push(
      packet.animate(frames, {
        duration: dur,
        easing: 'ease-in-out',
        fill: 'forwards',
      })
    );

    if (t.blocked) {
      blockMark.style.transform =
        'translate(' + t.blockAt[0] + 'px,' + t.blockAt[1] + 'px)';
      blockMark.classList.add('is-live');
      anims.push(
        blockMark.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          delay: dur,
          fill: 'both',
        })
      );
    }
  }

  function selectNode(id) {
    if (!desc[id]) return;
    clear();
    lastTraceKey = null;
    panel.innerHTML = desc[id];
    nodes.forEach(function (n) {
      n.classList.toggle('active', n.dataset.node === id);
    });
  }

  root.addEventListener('click', function (e) {
    var n = e.target.closest('.node');
    if (n) selectNode(n.dataset.node);
  });

  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var n = e.target.closest('.node');
    if (n) {
      e.preventDefault();
      selectNode(n.dataset.node);
    }
  });

  traceBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      runTrace(b.dataset.trace);
    });
  });

  tunnelBtn.addEventListener('click', function () {
    tunnelUp = !tunnelUp;
    tunnelBtn.setAttribute('aria-pressed', String(!tunnelUp));
    tunnelBtn.textContent = tunnelUp ? 'tunnel: up' : 'tunnel: down';
    tunnelNode.classList.toggle('down', !tunnelUp);
    if (lastTraceKey === 'isolated') runTrace('isolated');
  });

  // Deep-linkable state: /projects/homelab/#trace=bypass jumps straight to a
  // trace, so a specific demo can be linked to directly.
  function fromHash() {
    var m = /^#trace=([a-z]+)$/.exec(window.location.hash);
    if (m && TRACES[m[1]]) runTrace(m[1]);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
