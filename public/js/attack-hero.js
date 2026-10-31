// Home hero: "attack my edge". Replays recorded verdicts from the real edge
// (src/data/security-evidence.json, rendered into each button at build time).
// The browser sends nothing anywhere; it only shows what was recorded.
//
// Order of controls is the real one: country filter (firewall), reputation
// (CrowdSec ban list at the firewall), WAF (OWASP CRS in blocking mode), proxy.
// After N blocked requests from one address the edge bans it for 24 h, and the
// firewall drops it a few seconds later: that is the "strikes" meter.
//
// CSP: external file, script-src 'self'. DOM + CSSOM only.
(function () {
  var root = document.querySelector('[data-ah]');
  if (!root) return;
  var M = window.Motion;
  var ms = function (n) { return M ? M.ms(n) : n; };
  var S = window.SiteSound || { play: function () {} };

  var btns = Array.prototype.slice.call(root.querySelectorAll('[data-ah-req],[data-ah-abroad]'));
  var line = root.querySelector('[data-ah-line]');
  var out = root.querySelector('[data-ah-out]');
  var fill = root.querySelector('[data-ah-fill]');
  var scoreOut = root.querySelector('[data-ah-score]');
  var pips = root.querySelectorAll('[data-ah-strikes] i');
  var banOut = root.querySelector('[data-ah-ban]');
  var reset = root.querySelector('[data-ah-reset]');
  var bannedBox = root.querySelector('[data-ah-banned]');
  var banAfter = +root.getAttribute('data-ban-after') || 4;
  var drop = root.getAttribute('data-drop');
  var layers = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-l]'), function (li) {
    layers[li.getAttribute('data-l')] = li;
  });
  var SCALE = 70; // highest recorded score is 65
  var strikes = 0;
  var timers = [];

  function later(fn, t) { timers.push(setTimeout(fn, t)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  function set(name, state, text) {
    var li = layers[name];
    li.classList.remove('is-live', 'is-pass', 'is-block', 'is-skip');
    if (state) li.classList.add(state);
    li.querySelector('[data-v]').textContent = text || '';
  }

  function score(n) {
    var pct = Math.min(100, (n / SCALE) * 100);
    fill.style.setProperty('--w', pct + '%');
    fill.classList.toggle('is-over', n >= 5);
    scoreOut.textContent = String(n);
  }

  function paintStrikes() {
    Array.prototype.forEach.call(pips, function (p, i) { p.classList.toggle('on', i < strikes); });
    var banned = strikes >= banAfter;
    root.classList.toggle('is-banned', banned);
    bannedBox.hidden = !banned;
    var left = banAfter - strikes;
    banOut.textContent = banned
      ? 'Strikes ' + strikes + ' of ' + banAfter + '. Banned.'
      : 'Strikes ' + strikes + ' of ' + banAfter + '. ' +
        (strikes === 0 ? banAfter + ' blocked attacks from one address = 24 h ban.'
          : left === 1 ? 'One more blocked attack and you are banned for 24 h.'
          : left + ' more blocked attacks and you are banned for 24 h.');
  }

  function run(btn) {
    clear();
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    ['geo', 'rep', 'waf', 'app'].forEach(function (k) { set(k, 'is-skip', ''); });
    score(0);
    out.textContent = '';
    out.className = 'ah-out';
    var abroad = btn.hasAttribute('data-ah-abroad');
    var r = abroad
      ? { line: 'GET /  (from an address outside the allowed countries)', abroad: true }
      : JSON.parse(btn.getAttribute('data-ah-req'));
    line.textContent = r.line;
    var t = 0, step = ms(380);

    later(function () { set('geo', 'is-live', '…'); S.play('tick'); }, t);
    if (abroad) {
      later(function () {
        set('geo', 'is-block', 'dropped');
        out.textContent = 'Dropped by the firewall. No response at all, and the proxy never knew it happened. (Proven from a phone on cellular, TCP and UDP.)';
        out.classList.add('is-block');
        S.play('block');
      }, (t += step));
      return;
    }
    later(function () { set('geo', 'is-pass', 'pass'); }, (t += step));

    later(function () { set('rep', 'is-live', '…'); S.play('tick'); }, t);
    if (strikes >= banAfter) {
      later(function () {
        set('rep', 'is-block', 'banned');
        out.textContent = 'Dropped at the firewall. Your ' + banAfter + ' blocked attacks got this address banned for 24 h, so even a normal visit gets nothing. Unban yourself above to keep testing.';
        out.classList.add('is-block');
        S.play('block');
      }, (t += step));
      return;
    }
    later(function () { set('rep', 'is-pass', 'clean'); }, (t += step));

    later(function () { set('waf', 'is-live', '…'); score(r.score); S.play('tick'); }, t);
    if (r.blocked) {
      later(function () {
        set('waf', 'is-block', String(r.http));
        strikes = Math.min(banAfter, strikes + 1);
        paintStrikes();
        out.textContent = r.http + ' Forbidden. Rule ' + r.rule + '. Anomaly score ' + r.score + ', blocking starts at 5.';
        out.classList.add('is-block');
        S.play(strikes >= banAfter ? 'alarm' : 'block');
        if (strikes >= banAfter) {
          out.textContent += ' That was strike ' + banAfter + ': ban issued, firewall drop in ' + drop + '.';
        }
      }, (t += step + ms(300)));
      return;
    }
    later(function () { set('waf', 'is-pass', 'pass'); }, (t += step + ms(150)));
    later(function () { set('app', 'is-live', '…'); S.play('tick'); }, t);
    later(function () {
      set('app', 'is-pass', String(r.http || 200));
      out.textContent = 'Served normally. Real visitors never notice any of this.';
      out.classList.add('is-pass');
      S.play('ok');
    }, (t += step));
  }

  btns.forEach(function (b) { b.addEventListener('click', function () { run(b); }); });
  reset.addEventListener('click', function () {
    clear();
    strikes = 0;
    paintStrikes();
    ['geo', 'rep', 'waf', 'app'].forEach(function (k) { set(k, '', ''); });
    score(0);
    out.textContent = 'Unbanned. For real, the ban expires after 24 h, and the firewall lets the address back in about 10 s after the decision is removed.';
    out.className = 'ah-out';
    btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  });
  paintStrikes();
})();
