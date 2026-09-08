// Shared choreography helpers. Bundled first into /js/site.js, which loads in
// the <head> with defer so it runs before any per-page demo script.
//
// The policy this encodes: reduced motion means calm, not none. A fill, a
// counter, a fade, a stroke drawing itself are information delivered over
// time and they still run, at roughly half the timing. Travel across the
// screen, scaling, and anything that loops are dropped. So Motion.ms() halves
// durations under reduce and Motion.move() returns 0 for a distance.
//
// Everything here is cancellable, because nothing is allowed to animate off
// screen: each demo runs its choreography inside a Motion.seq() and drops it
// when its panel leaves the viewport.
//
// CSP: external file, script-src 'self'. rAF, WAAPI and CSSOM only. No eval,
// no string timers, no library.
(function () {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Ease-out cubic. Fast start, long settle: the default for anything that
  // arrives. Never linear, which is what makes a fill read as mechanical.
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  var Motion = {
    get reduce() {
      return mq.matches;
    },

    /** Duration in ms. Halved under reduce unless an explicit value is given. */
    ms: function (full, reduced) {
      if (!mq.matches) return full;
      return reduced == null ? Math.round(full * 0.5) : reduced;
    },

    /** A travel distance in px. Zero under reduce. */
    move: function (px) {
      return mq.matches ? 0 : px;
    },

    ease: easeOut,

    /** Format a number the way a counter should read: 1,100 not 1100. */
    num: function (n) {
      return Math.round(n).toLocaleString('en-US');
    },

    /**
     * A cancellable choreography. Every timer, frame loop and WAAPI animation
     * started through it is tracked, so cancel() leaves nothing running.
     */
    seq: function () {
      var timers = [];
      var frames = [];
      var anims = [];
      var dead = false;

      var s = {
        get dead() {
          return dead;
        },

        /** Run fn after ms, unless cancelled first. */
        at: function (ms, fn) {
          if (dead) return s;
          timers.push(
            setTimeout(function () {
              if (!dead) fn();
            }, ms)
          );
          return s;
        },

        /**
         * rAF tween over ms. onFrame(eased, raw) every frame, then onDone().
         * Eased with ease-out unless a curve is passed.
         */
        tween: function (ms, onFrame, onDone, curve) {
          if (dead) return s;
          var f = curve || easeOut;
          var t0 = 0;
          var id;
          var step = function (now) {
            if (dead) return;
            if (!t0) t0 = now;
            var raw = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
            onFrame(f(raw), raw);
            if (raw < 1) {
              id = requestAnimationFrame(step);
              frames.push(id);
            } else if (onDone) {
              onDone();
            }
          };
          id = requestAnimationFrame(step);
          frames.push(id);
          return s;
        },

        /** Count el's text from `from` to `to`. Tabular numerals via CSS. */
        count: function (el, from, to, ms, fmt) {
          var f = fmt || Motion.num;
          return s.tween(ms, function (e) {
            el.textContent = f(from + (to - from) * e);
          }, function () {
            el.textContent = f(to);
          });
        },

        /** A tracked WAAPI animation. */
        anim: function (el, frames_, opts) {
          if (dead || !el || !el.animate) return null;
          var a = el.animate(frames_, opts);
          anims.push(a);
          return a;
        },

        cancel: function () {
          dead = true;
          for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
          for (var j = 0; j < frames.length; j++) cancelAnimationFrame(frames[j]);
          for (var k = 0; k < anims.length; k++) {
            try {
              anims[k].cancel();
            } catch (e) {
              /* already finished */
            }
          }
          timers = [];
          frames = [];
          anims = [];
        },
      };
      return s;
    },

    /**
     * Call onEnter the first time el is in view, and onLeave whenever it goes
     * out again. This is what keeps TBT at zero: no demo runs a frame loop
     * while it is off screen.
     */
    onView: function (el, onEnter, onLeave) {
      if (!('IntersectionObserver' in window)) {
        onEnter();
        return { disconnect: function () {} };
      }
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) onEnter();
            else if (onLeave) onLeave();
          }
        },
        { threshold: 0.2 }
      );
      io.observe(el);
      return io;
    },
  };

  window.Motion = Motion;
})();
