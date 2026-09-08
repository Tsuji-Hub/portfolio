// The category-wipe demo.
//
// patchMany replaces the category list with exactly what you send. So a toggle
// that sends only the category you tapped silently deletes every other folder
// the recipe was in. No error, no warning — the recipe just quietly falls out
// of cookbooks you filed it in months ago, and you find out much later.
//
// The fix is unglamorous: read the current list, merge, send the whole thing.
// Flip the mode and watch the shelf.
//
// The whole point is that the damage is silent, so it is staged rather than
// applied all at once: the PATCH types out first, then the folders it is about
// to drop are struck off one at a time while a counter ticks, and only then
// does the verdict arrive. Watching two folders you did not touch disappear is
// a different experience from reading that they did.
//
// CSP: external, script-src 'self'. No eval, no inline handlers.
(function () {
  var root = document.querySelector('[data-wipe]');
  if (!root) return;

  var menuList = root.querySelector('[data-menu]');
  var shelf = root.querySelector('[data-shelf]');
  var wire = root.querySelector('[data-wire]');
  var damage = root.querySelector('[data-damage]');
  var modeBtns = root.querySelectorAll('[data-mode]');
  var resetBtn = root.querySelector('[data-reset]');
  var pill = root.querySelector('[data-pill]');
  var countEl = root.querySelector('[data-wipe-count]');
  var M = window.Motion;
  var seq = null;

  // His real cookbook set, category-backed so the pill files into the matching
  // cookbook automatically.
  var CATEGORIES = [
    'Breakfast',
    'Dinner',
    'Dessert',
    'Sauces or Marinades',
    'Creami',
    'DELICIOUS',
    'Appetizers & Sides',
    'Salads',
    'Quickies (<20min)',
    'TEST kitchen',
    "Gertrude's Sourdough",
    'Not great. Not bad. 3 star',
  ];

  var START = ['Dinner', 'DELICIOUS', 'Quickies (<20min)'];

  var mode = 'naive';
  var current = START.slice();
  var lost = [];
  var lostTotal = 0;
  // What the shelf is showing right now, which trails `current` while the
  // folders are being struck off one by one.
  var displayed = START.slice();
  // Folders checked off as kept on the fixed path. Part of the shelf's
  // state, or the settle repaint wipes the ticks the walk just applied.
  var checked = [];

  function renderMenu() {
    menuList.innerHTML = '';
    CATEGORIES.forEach(function (c) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-item';
      b.setAttribute('role', 'checkbox');
      b.setAttribute('aria-checked', String(current.indexOf(c) !== -1));
      b.dataset.cat = c;
      var box = document.createElement('span');
      box.className = 'menu-box';
      var t = document.createElement('span');
      t.textContent = c;
      b.appendChild(box);
      b.appendChild(t);
      li.appendChild(b);
      menuList.appendChild(li);
    });
  }

  function renderShelf() {
    shelf.innerHTML = '';
    CATEGORIES.forEach(function (c) {
      var li = document.createElement('li');
      var d = document.createElement('span');
      var cls = 'folder';
      if (displayed.indexOf(c) !== -1) cls += ' in';
      else if (lost.indexOf(c) !== -1) cls += ' lost';
      if (checked.indexOf(c) !== -1) cls += ' ok';
      d.className = cls;
      d.textContent = c;
      d.dataset.folder = c;
      li.appendChild(d);
      shelf.appendChild(li);
    });
  }

  function folderEl(cat) {
    return shelf.querySelector('[data-folder="' + cat.replace(/"/g, '\\"') + '"]');
  }

  function setCount(n) {
    if (!countEl) return;
    countEl.textContent = n ? '· ' + n + ' lost' : '';
    countEl.classList.toggle('hurt', n > 0);
  }

  function renderPill() {
    pill.textContent = current.length
      ? current[0] + (current.length > 1 ? ' +' + (current.length - 1) : '')
      : '+ Category';
  }

  function wireText(body, result) {
    var lines = [
      'PATCH /api/recipes',
      '[',
      '  {',
      '    "id": "cheeseburger-baked-potato-boats",',
      '    "recipeCategory": [' + body.map(quote).join(', ') + ']',
      '  }',
      ']',
      '',
      '// server stores exactly what you sent:',
      '// recipeCategory = [' + result.map(quote).join(', ') + ']',
    ];
    return lines.join('\n');
  }

  /** The request types out, so you read it before the damage lands. */
  function typeWire(body, result, done) {
    if (!body) {
      wire.textContent = 'tap a category in the menu.';
      if (done) done();
      return;
    }
    var text = wireText(body, result);
    wire.classList.add('is-typing');
    seq.tween(M.ms(760, 420), function (_, raw) {
      wire.textContent = text.slice(0, Math.round(raw * text.length));
    }, function () {
      wire.textContent = text;
      wire.classList.remove('is-typing');
      if (done) done();
    }, function (t) { return t; });
  }

  function quote(s) {
    return '"' + s + '"';
    }

  function renderDamage() {
    damage.classList.remove('is-in');
    requestAnimationFrame(function () {
      damage.classList.add('is-in');
    });
    if (mode === 'additive') {
      damage.className = 'wipe-damage safe';
      damage.textContent =
        'read → merge → send all. Nothing is dropped, because the list you send is the list you meant.';
      return;
    }
    if (lostTotal === 0) {
      damage.className = 'wipe-damage';
      damage.textContent =
        'sending only the tapped category. Nothing lost yet — tap one it is NOT already in.';
      return;
    }
    damage.className = 'wipe-damage hurt';
    damage.textContent =
      lostTotal +
      (lostTotal === 1 ? ' folder' : ' folders') +
      ' silently deleted. The API returned 200. Nothing failed. The recipe simply is not in them any more, and you find out weeks later when a cookbook looks short.';
  }

  function toggle(cat) {
    if (seq) seq.cancel();
    seq = M.seq();

    var isIn = current.indexOf(cat) !== -1;
    var body;

    if (mode === 'additive') {
      // read the current list, add or remove the one, send the whole thing
      body = isIn
        ? current.filter(function (c) {
            return c !== cat;
          })
        : current.concat([cat]);
      lost = [];
    } else {
      // the naive toggle: send only what was tapped
      body = isIn ? [] : [cat];
      lost = current.filter(function (c) {
        return body.indexOf(c) === -1;
      });
    }

    var before = current.slice();
    checked = [];
    current = body.slice(); // patchMany replaces wholesale
    renderMenu();
    renderPill();

    // The shelf still shows what the recipe was in a moment ago. It is taken
    // apart one folder at a time once the request has been sent.
    displayed = before.slice();
    renderShelf();
    damage.classList.remove('is-in');

    typeWire(body, current, function () {
      var step = M.ms(260, 150);
      var lostSoFar = lostTotal;

      if (mode === 'additive') {
        // Nothing is dropped, so every folder it was already in gets checked
        // off instead. Same walk, opposite outcome.
        before.forEach(function (c, i) {
          seq.at(i * step, function () {
            var el = folderEl(c);
            if (!el) return;
            checked.push(c);
            el.classList.add('checking', 'ok');
            seq.at(M.ms(360, 220), function () {
              el.classList.remove('checking');
            });
          });
        });
        seq.at(before.length * step + M.ms(320, 200), settle);
        return;
      }

      lost.forEach(function (c, i) {
        seq.at(i * step, function () {
          var el = folderEl(c);
          if (el) {
            el.classList.remove('in');
            el.classList.add('lost', 'going');
            seq.at(M.ms(420, 260), function () {
              el.classList.remove('going');
            });
          }
          lostSoFar++;
          lostTotal = lostSoFar;
          setCount(lostSoFar);
        });
      });
      seq.at(lost.length * step + M.ms(360, 220), settle);
    });

    function settle() {
      displayed = current.slice();
      renderShelf();
      renderDamage();
    }
  }

  menuList.addEventListener('click', function (e) {
    var b = e.target.closest('.menu-item');
    if (b) toggle(b.dataset.cat);
  });

  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      modeBtns.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      reset();
    });
  });

  function reset() {
    if (seq) seq.cancel();
    seq = M.seq();
    current = START.slice();
    displayed = START.slice();
    checked = [];
    lost = [];
    lostTotal = 0;
    setCount(0);
    renderMenu();
    renderShelf();
    renderPill();
    wire.textContent = 'tap a category in the menu.';
    renderDamage();
  }

  resetBtn.addEventListener('click', reset);
  reset();

  M.onView(root, function () {}, function () {
    if (seq) seq.cancel();
  });
})();
