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
      if (current.indexOf(c) !== -1) cls += ' in';
      else if (lost.indexOf(c) !== -1) cls += ' lost';
      d.className = cls;
      d.textContent = c;
      li.appendChild(d);
      shelf.appendChild(li);
    });
  }

  function renderPill() {
    pill.textContent = current.length
      ? current[0] + (current.length > 1 ? ' +' + (current.length - 1) : '')
      : '+ Category';
  }

  function renderWire(body, result) {
    wire.innerHTML = '';
    if (!body) {
      wire.textContent = 'tap a category in the menu.';
      return;
    }
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
    wire.textContent = lines.join('\n');
  }

  function quote(s) {
    return '"' + s + '"';
    }

  function renderDamage() {
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
      lostTotal += lost.length;
    }

    current = body.slice(); // patchMany replaces wholesale
    renderMenu();
    renderShelf();
    renderPill();
    renderWire(body, current);
    renderDamage();
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
    current = START.slice();
    lost = [];
    lostTotal = 0;
    renderMenu();
    renderShelf();
    renderPill();
    renderWire(null);
    renderDamage();
  }

  resetBtn.addEventListener('click', reset);
  reset();
})();
