// Stat strips count themselves up, once, the first time they are on screen.
//
// A number that was already there when you arrived is a label. A number that
// arrives is a measurement. Only the strip's own numerals move; everything
// else about the strip is unchanged.
//
// Not every stat is a number: "nightly", "restore", "PR #7881" and
// "hours -> min" all live in these strips too. A value is only counted when it
// STARTS with a numeral (after an optional currency mark), which leaves the
// word-shaped ones alone and stops "PR #7881" from counting up a ticket id.
// The suffix ("+", "k*", " kcal") is preserved verbatim.
//
// CSP: bundled into site.js, script-src 'self'. rAF only.
(function () {
  var dts = document.querySelectorAll('.stat-strip dt, .hero-stats dt');
  if (!dts.length || !window.Motion) return;
  var M = window.Motion;

  // ^ optional currency, digits with optional thousands separators, optional
  // decimal, then whatever trails it.
  var NUM = /^([^0-9]{0,2}?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

  var targets = [];
  dts.forEach(function (dt) {
    var m = NUM.exec(dt.textContent.trim());
    if (!m) return;
    var digits = m[2];
    var value = Number(digits.replace(/,/g, ''));
    if (!isFinite(value)) return;
    var decimals = (digits.split('.')[1] || '').length;
    var grouped = digits.indexOf(',') !== -1;
    targets.push({
      el: dt,
      prefix: m[1],
      suffix: m[3],
      value: value,
      decimals: decimals,
      grouped: grouped,
    });
  });
  if (!targets.length) return;

  function format(t, n) {
    var body;
    if (t.decimals) body = n.toFixed(t.decimals);
    else if (t.grouped) body = M.num(n);
    else body = String(Math.round(n));
    return t.prefix + body + t.suffix;
  }

  // Hold the final text until the strip is actually on screen, so the count is
  // not already over by the time it is scrolled to. Width is reserved by
  // tabular numerals in CSS, so nothing reflows when the digits change.
  targets.forEach(function (t) {
    t.el.textContent = format(t, 0);
  });

  var seq = M.seq();
  var strips = document.querySelectorAll('.stat-strip, .hero-stats');
  strips.forEach(function (strip) {
    var mine = targets.filter(function (t) {
      return strip.contains(t.el);
    });
    if (!mine.length) return;
    var done = false;
    M.onView(strip, function () {
      if (done) return;
      done = true;
      mine.forEach(function (t) {
        seq.count(t.el, 0, t.value, M.ms(900), function (n) {
          return format(t, n);
        });
      });
    });
  });
})();
