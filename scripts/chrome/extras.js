// Site-wide extras, bundled into /js/site.js after motion.js:
//   1. SiteSound: synthesized UI sounds, OFF by default, opt-in from the footer.
//      Web Audio oscillators only: no audio files, so no media-src/connect-src.
//   2. Verify strip: the footer reports what this page actually did, from the
//      browser's own records (requests, origins, bytes, CSP violations).
//   3. Terminal: a <dialog> opened with the backtick key or the footer button.
//      Output is textContent only; nothing here builds HTML from strings.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
(function () {
  'use strict';

  /* ---------------- 1. sound ---------------- */
  var KEY = 'ej-sound';
  var ctx = null;
  var enabled = false;
  try { enabled = window.localStorage.getItem(KEY) === 'on'; } catch (e) { enabled = false; }

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, gain) {
    var c = ac();
    if (!c) return;
    var t0 = c.currentTime + start;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.05, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  var SOUNDS = {
    tick: function () { tone(1320, 0, 0.035, 'sine', 0.025); },
    key: function () { tone(2400, 0, 0.012, 'square', 0.008); },
    ok: function () { tone(660, 0, 0.09, 'sine', 0.04); tone(990, 0.08, 0.12, 'sine', 0.04); },
    block: function () { tone(150, 0, 0.16, 'square', 0.035); },
    alarm: function () { tone(880, 0, 0.12, 'triangle', 0.04); tone(620, 0.14, 0.12, 'triangle', 0.04); tone(880, 0.28, 0.12, 'triangle', 0.04); tone(620, 0.42, 0.16, 'triangle', 0.04); },
    on: function () { tone(520, 0, 0.07, 'sine', 0.04); tone(780, 0.06, 0.1, 'sine', 0.04); },
  };
  window.SiteSound = {
    get enabled() { return enabled; },
    set: function (on) {
      enabled = !!on;
      try { window.localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* private mode */ }
      paintSound();
      if (enabled) SOUNDS.on();
    },
    play: function (k) {
      if (!enabled || document.hidden || !SOUNDS[k]) return;
      try { SOUNDS[k](); } catch (e) { /* audio unavailable */ }
    },
  };
  function paintSound() {
    document.querySelectorAll('[data-sound]').forEach(function (b) {
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      b.textContent = enabled ? 'sound: on' : 'sound: off';
    });
  }

  /* ---------------- 2. verify strip ---------------- */
  var violations = 0;
  document.addEventListener('securitypolicyviolation', function () {
    violations++;
    paintVerify();
  });
  function kb(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB'; }
  function paintVerify() {
    var root = document.querySelector('[data-verify]');
    if (!root || !window.performance || !performance.getEntriesByType) return;
    var nav = performance.getEntriesByType('navigation')[0];
    var res = performance.getEntriesByType('resource');
    var origin = location.origin, third = 0, bytes = nav ? nav.transferSize || 0 : 0;
    res.forEach(function (r) {
      try { if (new URL(r.name).origin !== origin) third++; } catch (e) { third++; }
      bytes += r.transferSize || 0;
    });
    var q = function (s) { return root.querySelector(s); };
    q('[data-v-req]').textContent = String(res.length + 1);
    q('[data-v-3p]').textContent = String(third);
    q('[data-v-kb]').textContent = bytes ? kb(bytes) : 'cached';
    q('[data-v-viol]').textContent = String(violations);
    root.classList.toggle('is-bad', third > 0);
  }
  if ('PerformanceObserver' in window) {
    try { new PerformanceObserver(function () { paintVerify(); }).observe({ type: 'resource', buffered: true }); } catch (e) { /* old browser */ }
  }

  /* ---------------- 3. terminal ---------------- */
  var dlg, outEl, inEl, hist = [], hi = 0;
  var PAGES = {
    home: '/', about: '/about/', security: '/projects/security/', homelab: '/projects/homelab/',
    makimono: '/projects/makimono/', jarvis: '/projects/jarvis/', mealie: '/projects/mealie/',
    'cloud-security': '/projects/cloud-security/', resume: '/Ethan-Justice-Resume.pdf',
  };
  function data(name) { return dlg.getAttribute('data-' + name) || ''; }
  function print(text, cls) {
    String(text).split('\n').forEach(function (l) {
      var d = document.createElement('div');
      d.textContent = l;
      if (cls) d.className = cls;
      outEl.appendChild(d);
    });
    outEl.scrollTop = outEl.scrollHeight;
  }
  var CMDS = {
    help: function () {
      print([
        'whoami            who is this',
        'cat about.txt     the short version',
        'history           how I got here',
        'ls                what is on this site',
        'open <page>       go there (e.g. open security)',
        'curl -I <this>    the security headers this site ships',
        'cat security.txt  how to report a vulnerability',
        'nmap <this>       try it',
        'sound on|off      UI sounds (off by default)',
        'clear, exit',
      ].join('\n'));
    },
    whoami: function () { print('ethan  ·  cloud security analyst  ·  GCP governance, security automation, a homelab run like production'); },
    'cat about.txt': function () {
      print('I can\'t leave a problem alone. Clear instructions get done to the letter;\nopen problems get threat-modeled first. At home I run my own infrastructure\nlike production and attack it to see what holds. Type "open about" for more.');
    },
    history: function () { print(data('history')); },
    ls: function () { print('about.txt  security.txt  resume.pdf  projects/\nprojects/: ' + Object.keys(PAGES).filter(function (k) { return ['home', 'about', 'resume'].indexOf(k) < 0; }).join('  ')); },
    'ls projects': function () { CMDS.ls(); },
    'cat security.txt': function () { print(data('sectxt')); },
    'cat /.well-known/security.txt': function () { CMDS['cat security.txt'](); },
    'sudo': function () { print('ethan is not in the sudoers file. This incident will be reported.', 'is-err'); },
    clear: function () { outEl.textContent = ''; },
    exit: function () { dlg.close(); },
  };
  function run(raw) {
    var cmd = raw.trim().replace(/\s+/g, ' ');
    print('$ ' + cmd, 'is-cmd');
    if (!cmd) return;
    var low = cmd.toLowerCase();
    window.SiteSound.play('tick');
    if (CMDS[low]) return CMDS[low]();
    if (/^sudo\b/.test(low)) return CMDS.sudo();
    if (/^rm\b/.test(low)) return print('Permission denied. Also, this is a static site: you would only be deleting your own cache.', 'is-err');
    if (/^curl\b/.test(low) && /-i\b/.test(low)) return print('HTTP/2 200\n' + data('headers'));
    if (/^curl\b/.test(low)) return print('Try curl -I: the headers are the interesting part.');
    if (/^nmap\b/.test(low)) return print('This site is static files on a CDN. There is no server of mine here to scan.\nThe homelab edge has its own page, with every attack I ran against it: open security');
    if (/^(cd|open)\b/.test(low)) {
      var k = low.split(' ')[1] || '';
      k = k.replace(/^projects\//, '').replace(/\/$/, '');
      if (PAGES[k]) { print('opening ' + PAGES[k] + ' …'); setTimeout(function () { location.href = PAGES[k]; }, 250); return; }
      return print('no such page: ' + k + '. Try ls.', 'is-err');
    }
    if (/^sound (on|off)$/.test(low)) { window.SiteSound.set(low.slice(6) === 'on'); return print('sound ' + low.slice(6)); }
    if (low === 'hack' || low === 'hack the planet') return print('Already tried. Results: open security');
    print('command not found: ' + cmd.split(' ')[0] + '. Type help.', 'is-err');
  }
  function openTerm() {
    if (!dlg) return;
    if (!dlg.open) {
      dlg.showModal();
      if (!outEl.childNodes.length) print('ethan.justice terminal. Type help. Esc closes.', 'is-dim');
    }
    inEl.focus();
  }
  function initTerm() {
    dlg = document.querySelector('[data-term]');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    outEl = dlg.querySelector('[data-term-out]');
    inEl = dlg.querySelector('[data-term-in]');
    dlg.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inEl.value;
      if (v.trim()) { hist.push(v); hi = hist.length; }
      inEl.value = '';
      run(v);
    });
    inEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); inEl.value = hist[hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown' && hist.length) { hi = Math.min(hist.length, hi + 1); inEl.value = hist[hi] || ''; e.preventDefault(); }
      else if (e.key.length === 1) window.SiteSound.play('key');
    });
    dlg.querySelector('[data-term-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    document.querySelectorAll('[data-term-open]').forEach(function (b) { b.addEventListener('click', openTerm); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      e.preventDefault();
      openTerm();
    });
  }

  function init() {
    document.querySelectorAll('[data-sound]').forEach(function (b) {
      b.addEventListener('click', function () { window.SiteSound.set(!enabled); });
    });
    paintSound();
    initTerm();
    paintVerify();
    window.addEventListener('load', function () { setTimeout(paintVerify, 300); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
