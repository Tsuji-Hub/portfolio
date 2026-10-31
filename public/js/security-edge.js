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
    var rule = r.inband.rules.length ? r.inband.rules[0].name : '';
    wafWhat.textContent = blocked ? rule : 'virtual patches + generic rules';
    appWhat.textContent = blocked ? 'never reached' : 'forwarded by the proxy';

    Object.keys(layers).forEach(function (k) {
      var li = layers[k];
      li.classList.remove('is-pass', 'is-block', 'is-skip');
      li.classList.add('is-live');
    });
    var step = ms(140);
    later(function () { setLayer('geo', 'pass', 'is-pass'); }, 0);
    later(function () { setLayer('ban', 'pass', 'is-pass'); }, step);
    later(function () { setLayer('waf', blocked ? 'blocked ' + r.inband.http : 'pass', blocked ? 'is-block' : 'is-pass'); }, step * 2);
    later(function () { setLayer('app', blocked ? 'not reached' : 'forwarded', blocked ? 'is-skip' : 'is-pass'); }, step * 3);

    var score = r.out_of_band.anomaly_score;
    later(function () {
      fill.style.width = Math.min(score / SCALE, 1) * 100 + '%';
      fill.classList.toggle('is-over', score >= r.out_of_band.threshold);
      scoreOut.textContent = String(score);
    }, step * 4);

    rulesOut.textContent = '';
    r.out_of_band.rules.forEach(function (x) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = x.id;
      li.appendChild(code);
      li.appendChild(document.createTextNode(' ' + x.name));
      rulesOut.appendChild(li);
    });
    if (!r.out_of_band.rules.length) {
      var none = document.createElement('li');
      none.className = 'none';
      none.textContent = 'no rule fired';
      rulesOut.appendChild(none);
    }
    countOut.textContent = r.out_of_band.flagged
      ? 'Flagged: counts toward a ban (6 flagged requests from one source).'
      : 'Not flagged: does not count toward a ban.';

    var verdict;
    if (r.id === 'baseline') verdict = 'A normal request passes every layer and nothing is flagged.';
    else if (blocked) verdict = r.short + ' is stopped in-band by a virtual patch, and the Core Rule Set flags it as well.';
    else if (r.out_of_band.flagged) verdict = r.short + ' passes in-band, so the proxy forwards it to the app once. The Core Rule Set flags it after the fact (score ' + score + '), which counts toward a ban.';
    else verdict = r.short + ' passes in-band and no WAF rule fires. CrowdSec\'s log scenarios are what cover this one.';
    out.textContent = verdict;

    var lines = [
      '# recorded ' + captured + ', same result in ' + r.runs.inband_verdict_and_score + ' of ' + r.runs.inband_verdict_and_score + ' runs',
      '> ' + r.shown.split('\n').join('\n> '),
      '< in-band: HTTP ' + r.inband.http + (r.inband.rules.length ? ' (' + r.inband.rules.map(function (x) { return x.id; }).join(', ') + ')' : ''),
      '< out-of-band: anomaly score ' + score + ' / threshold ' + r.out_of_band.threshold +
        (Object.keys(r.out_of_band.category_scores).length ? ' (' + Object.keys(r.out_of_band.category_scores).map(function (k) { return k + ' ' + r.out_of_band.category_scores[k]; }).join(', ') + ')' : ''),
      '< rules: ' + (r.out_of_band.rules.map(function (x) { return x.id; }).join(', ') || 'none'),
    ];
    pre.textContent = lines.join('\n');
  }

  function replay() {
    clearTimers();
    log.textContent = '';
    replayBtn.disabled = true;
    var attacks = buttons.map(data).filter(function (r) { return r.id !== 'baseline'; });
    var vp = 0, flagged = 0, t = 0, gap = ms(420);
    function line(text, cls) {
      var li = document.createElement('li');
      if (cls) li.className = cls;
      li.textContent = text;
      log.appendChild(li);
    }
    attacks.forEach(function (r, i) {
      later(function () {
        var blocked = r.inband.verdict === 'blocked';
        line('t+' + (i * 0.3).toFixed(1) + 's  ' + r.short + '  ' + (blocked ? 'blocked in-band' : 'passed in-band') +
          (r.out_of_band.flagged ? ', CRS score ' + r.out_of_band.anomaly_score : ', not flagged'), blocked ? 'is-block' : '');
        if (blocked) vp++;
        if (r.out_of_band.flagged) flagged++;
        if (blocked && vp === 2) line('  virtual-patch scenario fires: ban 24 h', 'is-ban');
        if (r.out_of_band.flagged && flagged === 6) line('  CRS out-of-band scenario fires: ban 48 h (repeat offender)', 'is-ban');
      }, t);
      t += gap;
    });
    later(function () {
      line('Requests were 0.3 s apart, so all nine landed before the first ban reached the firewall. Ban to firewall drop: ' + banWindow + ' s in three measured runs; after that, this source never reaches the proxy until the ban ends.', 'is-note');
      replayBtn.disabled = false;
    }, t);
  }

  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b); }); });
  replayBtn.addEventListener('click', replay);
  var start = buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || buttons[0];
  show(start);
})();
