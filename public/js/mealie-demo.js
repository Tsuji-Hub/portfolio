// Mealie PR #7881: recipe yield poisoning schema.org JSON-LD.
//
// The bug only manifested for servings-only recipes, which is why it survived:
// give it a text yield and the output is fine. Flip yield type to see it.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
/* ---- Stock Material vs the redesign ---- */
(function () {
  var root = document.querySelector('[data-ui]');
  if (!root) return;

  var stage = root.querySelector('[data-ui-stage]');
  var note = root.querySelector('[data-ui-note]');
  var btns = root.querySelectorAll('[data-ui-mode]');

  // The two cards differ structurally, not just cosmetically — that IS the
  // point. Badges move onto the photo; calories only exist at all after the
  // backend change that put nutrition in the list payload.
  var CARD = {
    stock:
      '<article class="rcard">' +
      '<div class="rcard-photo"></div>' +
      '<div class="rcard-body">' +
      '<h3 class="rcard-title">Loaded Smash Potato Nachos</h3>' +
      '<ul class="rcard-chips"><li>Dinner</li><li>FDL</li></ul>' +
      '<div class="rcard-foot"><span class="rcard-yield">4 servings</span>' +
      '<span class="rcard-icons">♥ ⋮</span></div>' +
      '</div></article>',
    editorial:
      '<article class="rcard">' +
      '<div class="rcard-photo">' +
      '<span class="rcard-cat"><i class="dot"></i>Dinner<i class="caret">▾</i></span>' +
      '<span class="rcard-kcal">359 kcal</span>' +
      '</div>' +
      '<div class="rcard-body">' +
      '<h3 class="rcard-title">Loaded Smash Potato Nachos</h3>' +
      '<div class="rcard-foot"><span class="rcard-yield">4 the Pans</span>' +
      '<span class="rcard-icons">♥ ⋮</span></div>' +
      '</div></article>',
  };

  var NOTE = {
    stock:
      'Palette set, component defaults never set. This is what the app rendered no matter what colors I handed it: elevation shadow, 4px radius, filled chips, stock orange-teal-maroon on one screen. Calories are absent because the list endpoint did not return nutrition at all. Recoloring cannot fix any of this.',
    editorial:
      'Defaults set alongside the palette, and the card rebuilt: photo-forward, serif title, taxonomy pill and calorie badge over the image, subtle circular actions. The category pill is a dropdown — one tap files the recipe into a cookbook. Recreated here from the real build; the app uses Fraunces for titles and real photography, neither of which I ship on this site.',
  };

  function set(mode) {
    stage.className = 'ui-stage ' + mode;
    stage.innerHTML = CARD[mode];
    note.textContent = NOTE[mode];
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.uiMode === mode));
    });
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      set(b.dataset.uiMode);
    });
  });

  set('stock');
})();

/* ---- PR #7881: yield poisoning the JSON-LD ---- */
(function () {
  var root = document.querySelector('[data-jsonld]');
  if (!root) return;

  var fixBtns = root.querySelectorAll('[data-fix]');
  var typeBtns = root.querySelectorAll('[data-ytype]');
  var servIn = root.querySelector('[data-servings]');
  var servOut = root.querySelector('[data-servings-out]');
  var servWrap = root.querySelector('[data-servings-wrap]');
  var jsonEl = root.querySelector('[data-json]');
  var consEl = root.querySelector('[data-consumer]');

  var CAL = 800; // total kcal for the recipe
  var fix = 'before';
  var ytype = 'servings';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  // Mirrors the real property. Before:
  //   f"{recipe_yield_quantity} {recipe_yield}".strip()
  // where an unset quantity is coerced to 0 by the validator. After:
  //   quantity = recipe_yield_quantity or recipe_servings
  //   number   = f"{quantity:g}" if quantity else ""
  //   f"{number} {recipe_yield or ''}".strip()
  function yieldValue() {
    var servings = Number(servIn.value);
    if (ytype === 'text') {
      // quantity 8, yield text "slices"
      if (fix === 'before') return { v: '8.0 slices', bad: false, note: 'trailing .0' };
      return { v: '8 slices', bad: false };
    }
    // servings-only: no yield quantity, no yield text
    if (fix === 'before') return { v: '0.0', bad: true };
    return { v: String(servings), bad: false };
  }

  function render() {
    var y = yieldValue();
    var cls = y.bad ? 'bad' : 'good';

    jsonEl.innerHTML =
      '<span class="k">{</span>\n' +
      '  <span class="k">"@context"</span>: <span class="s">"https://schema.org"</span>,\n' +
      '  <span class="k">"@type"</span>: <span class="s">"Recipe"</span>,\n' +
      '  <span class="k">"name"</span>: <span class="s">"Tomato soup"</span>,\n' +
      '  <span class="k">"recipeYield"</span>: <span class="' +
      cls +
      '">"' +
      esc(y.v) +
      '"</span>,\n' +
      '  <span class="k">"nutrition"</span>: <span class="k">{</span>\n' +
      '    <span class="k">"@type"</span>: <span class="s">"NutritionInformation"</span>,\n' +
      '    <span class="k">"calories"</span>: <span class="s">"' +
      CAL +
      ' kcal"</span>\n' +
      '  <span class="k">}</span>\n' +
      '<span class="k">}</span>';

    // What any downstream consumer does with that field.
    var parsed = parseFloat(y.v);
    if (isNaN(parsed)) parsed = 0;
    var per = parsed === 0 ? Infinity : CAL / parsed;
    var poisoned = !isFinite(per);

    consEl.className = 'consumer ' + (poisoned ? 'is-bad' : 'is-good');
    consEl.innerHTML =
      'a consumer computing per-serving nutrition:\n' +
      '<br>parseFloat("' +
      esc(y.v) +
      '") → <strong>' +
      parsed +
      '</strong>' +
      '<br>' +
      CAL +
      ' kcal ÷ ' +
      parsed +
      ' = <span class="res ' +
      (poisoned ? 'bad' : 'good') +
      '">' +
      (poisoned ? '∞ — every per-serving value it derives is garbage' : per + ' kcal/serving') +
      '</span>';
  }

  function setFix(v) {
    fix = v;
    fixBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.fix === v));
    });
    render();
  }

  function setType(v) {
    ytype = v;
    typeBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.ytype === v));
    });
    servWrap.hidden = v !== 'servings';
    render();
  }

  fixBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setFix(b.dataset.fix);
    });
  });
  typeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      setType(b.dataset.ytype);
    });
  });
  servIn.addEventListener('input', function () {
    servOut.textContent = servIn.value;
    render();
  });

  servOut.textContent = servIn.value;
  setType('servings');
  setFix('before');
})();
