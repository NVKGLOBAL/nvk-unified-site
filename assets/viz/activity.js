/* NVK visualizations — shared real-activity bus.
 *
 * Everything in this module is MEASURED from the visitor's actual interaction
 * with the page: pointer presses, keys typed, navigation clicks. Nothing is
 * simulated, nothing is scheduled, nothing is faked. The activity level
 * decays back to zero when the visitor stops interacting.
 *
 * - level: 0..1 activity level, decays exponentially (~4 s time constant).
 * - resonance events: emitted on real pointer presses (and by explicit
 *   "Pulse" buttons, which are themselves real clicks). Each event carries
 *   a measured intensity and a color from the site's real accent rotation.
 * - traits: the pages the visitor has actually opened in this session
 *   (recorded from real navigation clicks + the current page on load).
 *   These feed the Seeker Aura — the representation of the user.
 */
(function () {
  "use strict";

  var level = 0;
  var lastTick = performance.now();
  var levelListeners = [];
  var resonanceListeners = [];
  var traitListeners = [];
  var visited = [];
  var eventSeq = 0;

  // Real accent rotation, documented: emerald (resonance), cyan (NVK),
  // gold (warm accent). Cycled deterministically per event.
  var BURST_COLORS = ["#00FFB3", "#00A4FF", "#F59E0B"];
  var DECAY_MS = 4000;

  function now() {
    return performance.now();
  }

  function decayedLevel() {
    var t = now();
    var dt = t - lastTick;
    lastTick = t;
    if (dt > 0) level = level * Math.exp(-dt / DECAY_MS);
    if (level < 0.005) level = 0;
    return level;
  }

  function notifyLevel() {
    var v = decayedLevel();
    levelListeners.forEach(function (fn) {
      try { fn(v); } catch (e) { /* listener failure must not break the bus */ }
    });
  }

  // Decay runs on a slow interval so the level falls even with no events.
  setInterval(notifyLevel, 250);

  function bump(amount) {
    decayedLevel();
    level = Math.min(1, level + amount);
    notifyLevel();
  }

  function emitResonance(intensity, source) {
    var ev = {
      id: "res-" + (eventSeq + 1) + "-" + Math.floor(now()),
      intensity: Math.max(0.05, Math.min(1, intensity)),
      colorProfile: BURST_COLORS[eventSeq % BURST_COLORS.length],
      duration: "4",
      source: source || "pointer"
    };
    eventSeq += 1;
    bump(0.15 + ev.intensity * 0.2);
    resonanceListeners.forEach(function (fn) {
      try { fn(ev); } catch (e) { /* see above */ }
    });
    return ev;
  }

  function recordVisit(label) {
    if (!label) return;
    if (visited.indexOf(label) === -1) {
      visited.push(label);
      traitListeners.forEach(function (fn) {
        try { fn(visited.slice()); } catch (e) { /* see above */ }
      });
    }
  }

  // Real interaction hooks: pointer presses and keys. A pointer press is a
  // genuine visitor action, so it both bumps the level and sends one real
  // resonance pulse through any listening visualizer.
  window.addEventListener("pointerdown", function () {
    decayedLevel();
    emitResonance(0.35 + level * 0.4, "pointer");
  }, { passive: true });

  window.addEventListener("keydown", function () {
    bump(0.08);
  }, { passive: true });

  // Record the current page as visited on load, and navigation clicks as
  // they happen (same-document + outbound nav links alike).
  document.addEventListener("DOMContentLoaded", function () {
    var title = (document.querySelector("nav a[aria-current='page']") || {}).textContent;
    recordVisit((title || document.title || "This page").trim());
  });
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (a && a.textContent) recordVisit(a.textContent.trim());
  }, { passive: true });

  window.NVKActivity = {
    getLevel: function () { return decayedLevel(); },
    onLevel: function (fn) { levelListeners.push(fn); },
    onResonance: function (fn) { resonanceListeners.push(fn); },
    onTraits: function (fn) { traitListeners.push(fn); },
    emitResonance: emitResonance,
    bump: bump,
    recordVisit: recordVisit,
    getTraits: function () { return visited.slice(); }
  };
})();
