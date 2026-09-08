// Live self-attack panel.
//
// Every attack below is REAL and runs against this page in the visitor's own
// browser. Nothing is simulated, and the results are not strings I wrote: the
// verdicts come from the browser actually refusing, and the policy shown is
// read out of the browser's own securitypolicyviolation event (originalPolicy),
// so it cannot be faked from here.
//
// Yes, this file demonstrates a CSP by attacking the page that loads it. It is
// served from 'self' and contains no eval of its own — the eval() call below is
// the payload, and it is expected to throw.
(function () {
  var root = document.querySelector('[data-selftest]');
  if (!root) return;

  var list = root.querySelector('[data-atk-list]');
  var policyBox = root.querySelector('[data-policy]');
  var policyText = root.querySelector('[data-policy-text]');
  var btns = root.querySelectorAll('[data-atk]');
  var M = window.Motion;
  var seq = M.seq();

  var lastViol = null;
  var sawAnyViolation = false;

  document.addEventListener('securitypolicyviolation', function (e) {
    sawAnyViolation = true;
    lastViol = e.effectiveDirective || e.violatedDirective || '';
    if (e.originalPolicy && policyBox.hidden) showPolicy(e.originalPolicy);
  });

  function showPolicy(p) {
    policyBox.hidden = false;
    policyText.innerHTML = '';
    // Rebuild it as text nodes + <b> so nothing here can inject markup.
    p.split(';').forEach(function (part, i) {
      var t = part.trim();
      if (!t) return;
      var name = t.split(/\s+/)[0];
      var b = document.createElement('b');
      b.textContent = name;
      policyText.appendChild(document.createTextNode(i ? '; ' : ''));
      policyText.appendChild(b);
      policyText.appendChild(document.createTextNode(t.slice(name.length)));
    });
  }

  function settle() {
    // Violation events dispatch on a task; let them land before we read.
    return new Promise(function (r) {
      setTimeout(r, 30);
    });
  }

  var ATTACKS = [
    {
      id: 'eval',
      what: "eval('1+1')",
      why: 'Turn a string into running code. The oldest trick there is.',
      run: function () {
        try {
          (0, eval)('1+1');
          return Promise.resolve({ blocked: false, msg: 'eval() ran. It was not blocked.' });
        } catch (e) {
          return Promise.resolve({ blocked: true, msg: e.name + ': ' + e.message });
        }
      },
    },
    {
      id: 'fn',
      what: "new Function('return 1')",
      why: 'The same thing wearing a hat. This is how most libraries smuggle eval in.',
      run: function () {
        try {
          new Function('return 1')();
          return Promise.resolve({ blocked: false, msg: 'Function constructor ran.' });
        } catch (e) {
          return Promise.resolve({ blocked: true, msg: e.name + ': ' + e.message });
        }
      },
    },
    {
      id: 'inline',
      what: 'inject an inline <script>',
      why: 'Exactly what a stored-XSS payload looks like once it reaches the DOM.',
      run: function () {
        window.__selftestPwned = false;
        var s = document.createElement('script');
        s.textContent = 'window.__selftestPwned = true;';
        document.body.appendChild(s);
        s.remove();
        var pwned = window.__selftestPwned === true;
        return Promise.resolve({
          blocked: !pwned,
          msg: pwned
            ? 'The injected script executed.'
            : 'Script element reached the DOM. The browser refused to execute it.',
        });
      },
    },
    {
      id: 'style',
      what: 'inject an inline style attribute',
      why: 'Quieter, and the one that bites you: no error, no console warning.',
      run: function () {
        var d = document.createElement('div');
        d.setAttribute('style', 'width:123px');
        document.body.appendChild(d);
        var applied = d.style.length > 0;
        d.remove();
        return Promise.resolve({
          blocked: !applied,
          msg: applied
            ? 'Inline style applied (width read back as ' + d.style.width + ').'
            : 'Attribute is in the markup; zero properties applied. Silent — this is the one you ship by accident.',
        });
      },
    },
    {
      id: 'cdn',
      what: 'load a script from a CDN',
      why: 'One <script src> is all it takes to hand a third party this whole page.',
      run: function () {
        return new Promise(function (resolve) {
          var s = document.createElement('script');
          var done = false;
          var finish = function (r) {
            if (done) return;
            done = true;
            s.remove();
            resolve(r);
          };
          s.onload = function () {
            finish({ blocked: false, msg: 'Third-party script loaded and ran.' });
          };
          s.onerror = function () {
            finish({
              blocked: true,
              msg: 'Refused before the request left the browser. The CDN was never contacted.',
            });
          };
          s.src = 'https://cdn.jsdelivr.net/npm/left-pad@1.3.0/index.js';
          document.body.appendChild(s);
          setTimeout(function () {
            finish({ blocked: true, msg: 'No load. Request never went out.' });
          }, 2500);
        });
      },
    },
    {
      id: 'fetch',
      what: "fetch('https://example.com')",
      why: 'Exfiltration. If a page can talk to anywhere, it can send anything.',
      run: function () {
        return fetch('https://example.com/ping', { mode: 'no-cors' })
          .then(function () {
            return { blocked: false, msg: 'The request went out.' };
          })
          .catch(function (e) {
            return {
              blocked: true,
              msg: e.name + ": refused. connect-src is 'self', and example.com is not self.",
            };
          });
      },
    },
  ];

  function row(a, res, directive) {
    var li = document.createElement('li');
    li.className = 'atk-row ' + (res.blocked ? 'blocked' : 'through');

    var v = document.createElement('span');
    v.className = 'atk-verdict';
    v.textContent = res.blocked ? 'BLOCKED' : 'GOT THROUGH';

    var body = document.createElement('div');
    var what = document.createElement('div');
    what.className = 'atk-what';
    what.textContent = a.what;
    var why = document.createElement('p');
    why.className = 'atk-why';
    why.textContent = a.why;
    var msg = document.createElement('p');
    msg.className = 'atk-msg';
    if (directive) {
      var d = document.createElement('span');
      d.className = 'dir';
      d.textContent = 'stopped by ' + directive;
      msg.appendChild(d);
      msg.appendChild(document.createTextNode(' — '));
    }
    msg.appendChild(document.createTextNode(res.msg));

    body.appendChild(what);
    body.appendChild(why);
    body.appendChild(msg);
    li.appendChild(v);
    li.appendChild(body);
    return li;
  }

  function warnNoCsp() {
    if (sawAnyViolation) return;
    var li = document.createElement('li');
    li.className = 'atk-row through';
    var v = document.createElement('span');
    v.className = 'atk-verdict';
    v.textContent = 'NO CSP';
    var body = document.createElement('div');
    var w = document.createElement('div');
    w.className = 'atk-what';
    w.textContent = 'this page is being served without the header';
    var p = document.createElement('p');
    p.className = 'atk-why';
    p.textContent =
      'The browser reported no policy violations, so nothing above was enforced by a CSP. On the deployed site it is. If you are seeing this there, something is wrong and I would like to know.';
    body.appendChild(w);
    body.appendChild(p);
    li.appendChild(v);
    li.appendChild(body);
    list.appendChild(li);
  }

  /**
   * The row arrives, then its verdict types in behind a cursor, then the row
   * takes a wash of colour in the outcome's own hue. Under reduce the typing
   * and the fade stay; only the wash goes.
   */
  function land(li) {
    return new Promise(function (resolve) {
      var v = li.querySelector('.atk-verdict');
      var text = v.textContent;
      v.textContent = '';
      v.classList.add('is-typing');
      list.appendChild(li);
      requestAnimationFrame(function () {
        li.classList.add('is-in');
      });
      seq.tween(M.ms(260, 170), function (_, raw) {
        v.textContent = text.slice(0, Math.round(raw * text.length));
      }, function () {
        v.textContent = text;
        v.classList.remove('is-typing');
        li.classList.add('flash');
        seq.at(700, function () {
          li.classList.remove('flash');
        });
        resolve();
      }, function (t) { return t; });
    });
  }

  // Run the attack, let any violation event land, then report what happened.
  function exec(a) {
    lastViol = null;
    return a.run().then(function (res) {
      a.__res = res;
      return settle().then(function () {
        return land(row(a, res, lastViol));
      });
    });
  }

  function pause(ms) {
    return new Promise(function (r) {
      seq.at(ms, r);
    });
  }

  function runAll(only) {
    seq.cancel();
    seq = M.seq();
    list.innerHTML = '';
    btns.forEach(function (b) {
      b.disabled = true;
    });
    var run = only ? [only] : ATTACKS;
    var chain = Promise.resolve();
    run.forEach(function (a, i) {
      chain = chain
        .then(function () {
          // Staggered, not fired in one burst: six verdicts appearing at once
          // is a wall of text, six arriving in turn is a demonstration.
          return i ? pause(M.ms(250, 160)) : null;
        })
        .then(function () {
          return exec(a);
        });
    });
    return chain.then(function () {
      warnNoCsp();
      btns.forEach(function (b) {
        b.disabled = false;
      });
      if (!policyBox.hidden) {
        seq.at(M.ms(320, 200), function () {
          policyBox.scrollIntoView({
            block: 'nearest',
            behavior: M.reduce ? 'auto' : 'smooth',
          });
        });
      }
    });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.atk;
      if (id === 'all') return runAll(null);
      var a = ATTACKS.filter(function (x) {
        return x.id === id;
      })[0];
      if (a) runAll(a);
    });
  });

  // Deep link: /#selftest runs the whole set on load, so the result can be
  // linked to directly. It also means the attacks fire from the page's own
  // stack rather than a devtools/CDP one, which matters: DevTools is permitted
  // to eval on a CSP-protected page, so driving this from a debugger reports a
  // falsely permissive result for eval().
  function fromHash() {
    if (window.location.hash === '#selftest') runAll(null);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
