// Makimono demos: the auto-scroll reader engine and the cross-source ranking.
//
// CSP: external file under script-src 'self'. No eval, no Function(), no string
// timers, no inline handlers. requestAnimationFrame + CSSOM only. No library.
(function () {
  /* ---------------- Reader: auto-scroll engine ---------------- */
  (function reader() {
    var root = document.querySelector('[data-reader]');
    if (!root) return;

    var screen = root.querySelector('[data-screen]');
    var strip = root.querySelector('[data-strip]');
    var playBtn = root.querySelector('[data-play]');
    var speedIn = root.querySelector('[data-speed]');
    var speedOut = root.querySelector('[data-speed-out]');
    var hudSpeed = root.querySelector('[data-hud-speed]');
    var status = root.querySelector('[data-status]');
    var boundary = root.querySelector('[data-boundary]');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var y = 0;
    var speed = Number(speedIn.value); // px per second
    var playing = false;
    var raf = null;
    var last = 0;
    var boundaryHit = false;

    function maxY() {
      return Math.max(0, strip.scrollHeight - screen.clientHeight);
    }

    function render() {
      strip.style.transform = 'translateY(' + -y + 'px)';
    }

    function setStatus(html) {
      status.innerHTML = html;
    }

    function setPlaying(on) {
      playing = on;
      root.classList.toggle('is-paused', !on);
      playBtn.textContent = on ? 'pause' : 'play';
      playBtn.setAttribute('aria-pressed', String(on));
      if (on) {
        last = 0;
        if (!raf) raf = window.requestAnimationFrame(tick);
      } else if (raf) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
    }

    function tick(ts) {
      raf = null;
      if (!playing) return;
      if (!last) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;

      y += speed * dt;

      // Chapter-boundary handling: stop at the seam rather than sliding past it.
      var bTop = boundary.offsetTop - screen.clientHeight * 0.55;
      if (!boundaryHit && y >= bTop) {
        y = bTop;
        boundaryHit = true;
        render();
        setPlaying(false);
        setStatus(
          '<strong>chapter boundary.</strong> auto-scroll stopped at the seam instead of running into the next chapter. press play to continue.'
        );
        return;
      }

      var m = maxY();
      if (y >= m) {
        y = m;
        render();
        setPlaying(false);
        setStatus('<strong>end of strip.</strong> drag speed, then play again.');
        return;
      }

      render();
      raf = window.requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', function () {
      if (!playing && y >= maxY()) {
        y = 0;
        boundaryHit = false;
      }
      setPlaying(!playing);
      if (playing) setStatus('scrolling at <strong>' + speed + ' px/s</strong>.');
    });

    // Tap the screen to pause/resume, mirroring the app's pause-on-touch.
    screen.addEventListener('click', function () {
      setPlaying(!playing);
      setStatus(
        playing
          ? 'resumed. <strong>tap the screen</strong> to pause again.'
          : '<strong>paused on touch.</strong> tap again to resume.'
      );
    });

    speedIn.addEventListener('input', function () {
      speed = Number(speedIn.value);
      speedOut.textContent = speed + ' px/s';
      hudSpeed.textContent = (speed / 100).toFixed(1) + '×';
      if (playing) setStatus('scrolling at <strong>' + speed + ' px/s</strong>.');
    });

    speedOut.textContent = speed + ' px/s';
    hudSpeed.textContent = (speed / 100).toFixed(1) + '×';
    render();

    if (reduce.matches) {
      // Motion is the thing being demonstrated, so it stays available — it just
      // never starts on its own.
      setPlaying(false);
      setStatus(
        'reduced motion is on, so auto-scroll is <strong>not started automatically</strong>. press play to run it.'
      );
    } else {
      setStatus('press play, or tap the screen.');
    }
  })();

  /* ---------------- Similar titles: cross-source agreement ---------------- */
  (function ranking() {
    var root = document.querySelector('[data-rank]');
    if (!root) return;

    var list = root.querySelector('[data-rank-list]');
    var gemsBtn = root.querySelector('[data-gems]');
    var srcBtns = root.querySelectorAll('[data-source]');

    var SOURCES = ['AniList', 'MyAnimeList', 'MangaUpdates', 'MangaDex', 'Comick'];

    // Sample data. The ranking logic below is the real approach: a title earns
    // weight for each INDEPENDENT source that recommends it, so cross-source
    // agreement outranks any single source's enthusiasm.
    var TITLES = [
      { t: 'Berserk', pop: 98, by: ['AniList', 'MyAnimeList', 'MangaUpdates', 'MangaDex', 'Comick'] },
      { t: 'Vinland Saga', pop: 92, by: ['AniList', 'MyAnimeList', 'MangaDex', 'Comick'] },
      { t: 'Vagabond', pop: 88, by: ['AniList', 'MyAnimeList', 'MangaUpdates'] },
      { t: 'Oyasumi Punpun', pop: 79, by: ['AniList', 'MyAnimeList', 'MangaUpdates', 'Comick'] },
      { t: 'Dorohedoro', pop: 71, by: ['AniList', 'MangaDex', 'Comick'] },
      { t: 'Houseki no Kuni', pop: 46, by: ['AniList', 'MangaUpdates', 'MangaDex'] },
      { t: 'Blame!', pop: 38, by: ['MangaUpdates', 'MangaDex'] },
      { t: 'Sangatsu no Lion', pop: 34, by: ['AniList', 'MyAnimeList'] },
      { t: 'Ashita no Joe', pop: 22, by: ['MangaUpdates'] },
    ];

    var enabled = {};
    SOURCES.forEach(function (s) {
      enabled[s] = true;
    });
    var gems = false;

    function render() {
      var rows = TITLES.map(function (item) {
        var agree = item.by.filter(function (s) {
          return enabled[s];
        });
        return { item: item, score: agree.length };
      })
        .filter(function (r) {
          if (r.score === 0) return false;
          if (gems && r.item.pop >= 50) return false;
          return true;
        })
        .sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return b.item.pop - a.item.pop;
        });

      list.innerHTML = '';
      if (!rows.length) {
        var empty = document.createElement('li');
        empty.className = 'rank-empty';
        empty.textContent = 'no titles survive the current filters.';
        list.appendChild(empty);
        return;
      }

      rows.forEach(function (r, i) {
        var li = document.createElement('li');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = String(i + 1);

        var title = document.createElement('span');
        title.className = 'rank-title';
        title.textContent = r.item.t;

        var bar = document.createElement('span');
        bar.className = 'rank-bar';
        // role is required: aria-label is prohibited on a generic span.
        bar.setAttribute('role', 'img');
        bar.setAttribute(
          'aria-label',
          r.score +
            ' of ' +
            SOURCES.filter(function (s) {
              return enabled[s];
            }).length +
            ' active sources agree'
        );
        SOURCES.forEach(function (s) {
          var pip = document.createElement('span');
          var on = enabled[s] && r.item.by.indexOf(s) !== -1;
          pip.className = 'rank-pip' + (on ? ' on' : '');
          bar.appendChild(pip);
        });

        li.appendChild(pos);
        li.appendChild(title);
        li.appendChild(bar);
        list.appendChild(li);
      });
    }

    srcBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.dataset.source;
        enabled[s] = !enabled[s];
        b.setAttribute('aria-pressed', String(enabled[s]));
        render();
      });
    });

    gemsBtn.addEventListener('click', function () {
      gems = !gems;
      gemsBtn.setAttribute('aria-pressed', String(gems));
      render();
    });

    render();
  })();
})();
