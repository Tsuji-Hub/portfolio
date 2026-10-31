// Watchdog demo for /projects/homelab/. Runs the production watchdog's rules
// (limits, discovery, heal-once-per-6-h, alert on everything else) on a few
// sample jobs, on a clock the reader fast-forwards. Nothing here talks to the
// network.
//
// CSP notes: external file under script-src 'self'. No eval, no inline
// handlers, no inline styles: state is shown with classes and textContent.
(function () {
  'use strict';
  var root = document.querySelector('[data-wd]');
  if (!root) return;

  var rowsEl = root.querySelector('[data-wd-rows]');
  var clockEl = root.querySelector('[data-wd-clock]');
  var sumEl = root.querySelector('[data-wd-sum]');
  var logEl = root.querySelector('[data-wd-log]');

  var SCAN = 10; // the watchdog runs every 10 minutes
  var HEAL_GAP = 6 * 60; // heal a given item at most once per 6 hours
  var UNKNOWN_LIMIT = 24 * 60; // unknown feeds get a 24 h default

  // name, runs, period (min), limit (min), heal (idempotent refresher?)
  var BASE = [
    { id: 'health', name: 'Dashboard health feed', runs: 'every 10 min', period: 10, limit: 30, heal: true },
    { id: 'selfheal', name: 'Self-heal status', runs: 'every 10 min', period: 10, limit: 25, heal: false },
    { id: 'scan', name: 'Container vulnerability scan', runs: 'daily', period: 1440, limit: 26 * 60, heal: true },
    { id: 'hostbak', name: 'Hypervisor config backup', runs: 'daily', period: 1440, limit: 26 * 60 + 30, heal: false },
    { id: 'verify', name: 'Backup integrity check', runs: 'weekly', period: 10080, limit: 8 * 1440, heal: false },
  ];
  var ADD = {
    // cron job every 6 h: limit = 2 x gap + 10 min
    cron: { id: 'cron', name: 'New cron job (every 6 h)', runs: 'every 6 h', period: 360, limit: 2 * 360 + 10, heal: false },
    // a dashboard source nobody registered: default limit, flagged as a gap
    feed: { id: 'feed', name: 'New dashboard feed', runs: 'unknown', period: 30, limit: UNKNOWN_LIMIT, heal: false, unknown: true },
  };

  var t, items, pending, lines;

  function fmt(min) {
    if (min < 60) return min + ' min';
    var d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (d >= 2) return d + ' days' + (h ? ' ' + h + ' h' : '');
    var hh = d * 24 + h;
    return hh + ' h' + (m ? ' ' + m + ' min' : '');
  }

  function make(def) {
    var it = {};
    for (var k in def) it[k] = def[k];
    it.last = t; // just ran
    it.stopped = false;
    it.healed = -Infinity;
    it.state = it.unknown ? 'gap' : 'fresh';
    return it;
  }

  function reset() {
    t = 0;
    items = BASE.map(make);
    pending = [];
    lines = [];
    root.querySelectorAll('[data-wd-stop],[data-wd-add]').forEach(function (b) {
      b.disabled = false;
      b.setAttribute('aria-pressed', 'false');
    });
    log('Watchdog running: ' + items.length + ' checks, all fresh.', 'is-note');
    render();
  }

  function log(text, cls) {
    lines.push({ text: '+' + Math.floor(t / 60) + 'h' + String(t % 60).padStart(2, '0') + '  ' + text, cls: cls || '' });
    if (lines.length > 7) lines.shift();
  }

  function age(it) { return t - it.last; }

  function scan() {
    // discovery: anything added since the last pass shows up now, by itself
    pending.forEach(function (def) {
      var it = make(def);
      items.push(it);
      log(
        it.unknown
          ? 'Discovered "' + it.name + '": no refresher registered. Flagged as a gap.'
          : 'Discovered "' + it.name + '": limit ' + fmt(it.limit) + ' (2 x interval + 10 min).',
        it.unknown ? 'is-block' : 'is-note'
      );
    });
    pending = [];

    items.forEach(function (it) {
      if (it.unknown) return; // stays a gap until a refresher is registered
      var was = it.state;
      if (age(it) <= it.limit) {
        it.state = 'fresh';
        if (was === 'stale') log(it.name + ' is fresh again.', 'is-note');
        return;
      }
      if (it.heal && t - it.healed >= HEAL_GAP) {
        it.healed = t;
        it.last = t;
        it.state = 'fresh';
        log('Auto-heal: re-ran the "' + it.name + '" refresher once. Fresh. No alert.', '');
        return;
      }
      it.state = 'stale';
      if (was !== 'stale') {
        log(
          'STALE: ' + it.name + ', ' + fmt(age(it)) + ' old, limit ' + fmt(it.limit) +
            (it.heal ? '. Already healed in the last 6 h, so: ' : '. Not safe to re-run, so: ') +
            'Discord alert, SIEM event, dashboard.',
          'is-ban'
        );
      }
    });
  }

  function advance(minutes) {
    var end = t + minutes;
    while (t < end) {
      t += SCAN;
      items.forEach(function (it) {
        if (!it.stopped && it.period && t - it.last >= it.period) it.last = t;
      });
      scan();
    }
    render();
  }

  function cell(tr, tag, text, cls) {
    var c = document.createElement(tag);
    if (tag === 'th') c.scope = 'row';
    c.textContent = text;
    if (cls) c.className = cls;
    tr.appendChild(c);
  }

  function render() {
    clockEl.textContent = '+' + Math.floor(t / 60) + ' h ' + String(t % 60).padStart(2, '0') + ' min';
    while (rowsEl.firstChild) rowsEl.removeChild(rowsEl.firstChild);
    var n = { fresh: 0, stale: 0, gap: 0 };
    items.forEach(function (it) {
      n[it.state]++;
      var tr = document.createElement('tr');
      cell(tr, 'th', it.name + (it.stopped ? ' (stopped)' : ''));
      cell(tr, 'td', it.runs);
      cell(tr, 'td', fmt(it.limit) + (it.unknown ? ' (default)' : ''));
      cell(tr, 'td', fmt(age(it)));
      cell(tr, 'td', it.state === 'gap' ? 'no refresher' : it.state, 'wd-' + it.state);
      rowsEl.appendChild(tr);
    });
    sumEl.textContent =
      items.length + ' checks · ' + n.fresh + ' fresh' +
      (n.stale ? ' · ' + n.stale + ' stale' : '') + (n.gap ? ' · ' + n.gap + ' gap' : '');
    while (logEl.firstChild) logEl.removeChild(logEl.firstChild);
    lines.forEach(function (l) {
      var li = document.createElement('li');
      li.textContent = l.text;
      if (l.cls) li.className = l.cls;
      logEl.appendChild(li);
    });
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !root.contains(b)) return;
    if (b.hasAttribute('data-wd-step')) return advance(+b.getAttribute('data-wd-step'));
    if (b.hasAttribute('data-wd-reset')) return reset();
    var stop = b.getAttribute('data-wd-stop');
    if (stop) {
      items.forEach(function (it) {
        if (it.id === stop) it.stopped = true;
      });
      var it = items.filter(function (x) { return x.id === stop; })[0];
      log('You stopped "' + it.name + '". Nobody tells the watchdog.', 'is-note');
      b.disabled = true;
      b.setAttribute('aria-pressed', 'true');
      return render();
    }
    var add = b.getAttribute('data-wd-add');
    if (add && ADD[add]) {
      pending.push(ADD[add]);
      log('You added "' + ADD[add].name + '". Not registered anywhere.', 'is-note');
      b.disabled = true;
      b.setAttribute('aria-pressed', 'true');
      return render();
    }
  });

  reset();
})();
