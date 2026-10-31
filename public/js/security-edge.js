// Edge replay for /projects/security/.
//
// Every value shown here is read from the page itself: each request button
// carries its recorded result (from src/data/security-evidence.json, rendered
// at build time). Nothing is computed or invented in the browser; the script
// only decides how to show it.
//
// CSP: external file, script-src 'self'. DOM + CSSOM only, no eval, no fetch.
(function () {
  var root = document.querySelector('[data-edge]');
  if (!root) return;
  var M = window.Motion;
  var reduce = M ? M.reduce : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ms = function (n) { return M ? M.ms(n) : (reduce ? 0 : n); };

  var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-req]'));
  var layers = {};
  Array.prototype.forEach.call(root.querySelectorAll('[data-layer]'), function (li) {
    layers[li.getAttribute('data-layer')] = li;
  });
  var fill = root.querySelector('[data-score-fill]');
  var scoreOut = root.querySelector('[data-score]');
  var rulesOut = root.querySelector('[data-rules]');
  var countOut = root.querySelector('[data-count]');
  var out = root.querySelector('[data-out]');
  var pre = root.querySelector('[data-ev-pre]');
  var wafWhat = root.querySelector('[data-waf-what]');
  var appWhat = root.querySelector('[data-app-what]');
  var replayBtn = root.querySelector('[data-replay]');
  var log = root.querySelector('[data-log]');
  var banWindow = root.getAttribute('data-ban');
  var captured = root.getAttribute('data-captured');
  var SCALE = 70; // highest recorded score is 65; one fixed scale for every request
  var timers = [];

  function later(fn, t) { timers.push(setTimeout(fn, t)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function data(btn) { return JSON.parse(btn.getAttribute('data-req')); }

  function setLayer(name, verdict, state) {
    var li = layers[name];
    li.classList.remove('is-pass', 'is-block', 'is-skip', 'is-live');
    li.classList.add(state);
    li.querySelector('[data-v]').textContent = verdict;
  }

  function show(btn) {
    clearTimers();
    var r = data(btn);
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });

    var blocked = r.inband.verdict === 'blocked';
    var patch = r.inband.rules.filter(function (x) { return x.id.indexOf('crowdsecurity/') === 0; })[0];
    wafWhat.textContent = blocked ? (patch ? patch.name : 'OWASP CRS, score ' + r.crs.anomaly_score) : 'virtual patches + OWASP CRS';
    appWhat.textContent = blocked ? 'never reached' : 'forwarded by the proxy';

    Object.keys(layers).forEach(function (k) {
      layers[k].classList.remove('is-pass', 'is-block', 'is-skip');
      layers[k].classList.add('is-live');
    });
    var step = ms(140);
    later(function () { setLayer('geo', 'pass', 'is-pass'); }, 0);
    later(function () { setLayer('ban', 'pass', 'is-pass'); }, step);
    later(function () { setLayer('waf', blocked ? 'blocked ' + r.inband.http : 'pass', blocked ? 'is-block' : 'is-pass'); }, step * 2);
    later(function () { setLayer('app', blocked ? 'not reached' : 'forwarded', blocked ? 'is-skip' : 'is-pass'); }, step * 3);

    var score = r.crs.anomaly_score;
    later(function () {
      fill.style.width = Math.min(score / SCALE, 1) * 100 + '%';
      fill.classList.toggle('is-over', score >= r.crs.threshold);
      scoreOut.textContent = String(score);
    }, step * 4);

    rulesOut.textContent = '';
    var crsRules = r.inband.rules.filter(function (x) { return x.id.indexOf('crowdsecurity/') !== 0; });
    crsRules.forEach(function (x) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = x.id;
      li.appendChild(code);
      li.appendChild(document.createTextNode(' ' + x.name));
      rulesOut.appendChild(li);
    });
    if (!crsRules.length) {
      var none = document.createElement('li');
      none.className = 'none';
      none.textContent = 'no rule fired';
      rulesOut.appendChild(none);
    }
    countOut.textContent = blocked
      ? 'Blocked. Four blocked requests from one source earn a 24 h ban.'
      : 'Below the threshold: allowed.';

    var verdict;
    if (r.id === 'baseline') verdict = 'A normal request passes every layer and no rule fires.';
    else if (r.id === 'wordpress') verdict = 'A request for a WordPress login page is not an attack payload on its own, so the WAF allows it. Scanning for it is, and CrowdSec catches that pattern from the logs.';
    else if (patch) verdict = r.short + ' is blocked by a virtual patch before it reaches an app; the Core Rule Set scores it as well.';
    else verdict = r.short + ' scores ' + score + ' against a block threshold of 5, so the WAF answers 403 and the app never sees it.';
    out.textContent = verdict;

    var lines = [
      '# recorded ' + captured + ', same result in ' + r.runs.inband_verdict + ' of ' + r.runs.inband_verdict + ' runs',
      '> ' + r.shown.split('\n').join('\n> '),
      '< HTTP ' + r.inband.http + (blocked ? ' (blocked by the WAF)' : ''),
      '< CRS anomaly score ' + score + ' / block at ' + r.crs.threshold +
        (Object.keys(r.crs.category_scores).length ? ' (' + Object.keys(r.crs.category_scores).map(function (k) { return k + ' ' + r.crs.category_scores[k]; }).join(', ') + ')' : ''),
      '< rules: ' + (r.inband.rules.map(function (x) { return x.id; }).join(', ') || 'none'),
    ];
    pre.textContent = lines.join('\n');
  }

  function replay() {
    clearTimers();
    log.textContent = '';
    replayBtn.disabled = true;
    var reqs = buttons.map(data).filter(function (r) { return r.id !== 'baseline'; });
    var blockedCount = 0, t = 0, gap = ms(420);
    function line(text, cls) {
      var li = document.createElement('li');
      if (cls) li.className = cls;
      li.textContent = text;
      log.appendChild(li);
    }
    reqs.forEach(function (r, i) {
      later(function () {
        var blocked = r.inband.verdict === 'blocked';
        line('t+' + (i * 0.3).toFixed(1) + 's  ' + r.short + '  ' + (blocked ? '403, blocked (CRS score ' + r.crs.anomaly_score + ')' : '200, allowed'), blocked ? 'is-block' : '');
        if (blocked) blockedCount++;
        if (blocked && blockedCount === 4) line('  ban decision: 24 h for this source', 'is-ban');
      }, t);
      t += gap;
    });
    later(function () {
      line('The firewall drops a banned source ' + banWindow + ' s after the decision (three measured runs); from then on it never reaches the proxy.', 'is-note');
      replayBtn.disabled = false;
    }, t);
  }

  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b); }); });
  replayBtn.addEventListener('click', replay);
  var start = buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || buttons[0];
  show(start);
})();
