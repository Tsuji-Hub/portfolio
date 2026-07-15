// Mealie PR #7881: recipe yield poisoning schema.org JSON-LD.
//
// The bug only manifested for servings-only recipes, which is why it survived:
// give it a text yield and the output is fine. Flip yield type to see it.
//
// CSP: external file, script-src 'self'. No eval, no inline handlers.
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

  function yieldValue() {
    if (ytype === 'text') return { v: '2 loaves', bad: false };
    if (fix === 'before') return { v: '0.0', bad: true };
    return { v: servIn.value + ' servings', bad: false };
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
