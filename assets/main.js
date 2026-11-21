/* NVK Global — shared site JS.
   Mobile menu toggle + honest orb controller.
   The orb reflects REAL page activity only:
   - Idle: nothing happening.
   - Listening: the user is typing in the on-page site search box.
   - Thinking: the filter is actually running (synchronous, so brief).
   - Complete: results are shown.
   - Blocked: the filter ran and found no matching sections.
   No "AI" or "thinking" state is shown without a real backing action. */
(function () {
  "use strict";

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---- Orb controller ---- */
  var orbState = document.querySelector("[data-orb-state]");
  var orbLabel = document.getElementById("orb-status");
  var searchInput = document.getElementById("site-search-input");
  var searchMeta = document.getElementById("search-meta");
  var searchEmpty = document.getElementById("search-empty");
  var searchItems = Array.prototype.slice.call(
    document.querySelectorAll("[data-search]")
  );

  var STATES = {
    idle: "Idle — ready",
    listening: "Listening",
    thinking: "Working…",
    complete: "Complete",
    blocked: "Blocked — no matching sections"
  };

  function setOrb(state, detail) {
    if (!orbState || !orbLabel) return;
    orbState.setAttribute("data-orb-state", state);
    orbLabel.textContent = detail || STATES[state] || STATES.idle;
    /* The live three.js orb (assets/viz/orb.js) listens for this event and
       changes its bloom / speed / hover glow to match the real state. */
    window.dispatchEvent(new CustomEvent("nvk:orb-state", {
      detail: { state: state, label: orbLabel.textContent }
    }));
  }

  /* ---- Visualizer watchdog ----
     Every live visualizer mount carries [data-viz]; its module marks it
     [data-viz-ready] on the first rendered frame. If a mount is still
     unmarked 8s after load, it never started — say so honestly instead
     of leaving a dark box or a fake animation. Registered here, before
     the search-box early return, so it runs on every page. */
  setTimeout(function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-viz]"), function (host) {
      if (host.getAttribute("data-viz-ready") === "true") return;
      host.classList.add("viz-failed");
      var note = host.querySelector(".viz-unavailable");
      if (note) {
        if (!note.textContent.trim()) {
          note.textContent = "This visualizer did not start in your browser — nothing here is simulated, so the panel stays empty rather than faking it. Try a browser with WebGL enabled.";
        }
        note.hidden = false;
      }
    });
  }, 8000);

  /* ---- Sound toggle (home hero orb) ----
     The orb's clicks play a short synthesized chime (assets/viz/audio.js).
     Sound is OFF by default and only ever plays on a click gesture. */
  var soundToggle = document.getElementById("orb-sound-toggle");
  if (soundToggle && window.NVKAudio) {
    soundToggle.addEventListener("click", function () {
      var on = window.NVKAudio.toggle();
      soundToggle.textContent = on ? "Sound: on" : "Sound: off";
      soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  if (!searchInput || searchItems.length === 0) {
    /* No search box on this page: the orb stays Idle. */
    setOrb("idle");
    return;
  }

  var typingTimer = null;

  function runFilter(query) {
    /* Thinking: the filter is actually running here, synchronously. */
    setOrb("thinking");
    var q = query.trim().toLowerCase();
    var shown = 0;
    searchItems.forEach(function (item) {
      var haystack = (item.getAttribute("data-search") || "").toLowerCase();
      var match = q === "" || haystack.indexOf(q) !== -1;
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (searchEmpty) searchEmpty.classList.toggle("show", q !== "" && shown === 0);
    if (searchMeta) {
      searchMeta.textContent =
        q === ""
          ? ""
          : shown === 0
            ? "No matching sections."
            : shown + (shown === 1 ? " section found." : " sections found.");
    }
    if (q === "") {
      setOrb("idle");
    } else if (shown === 0) {
      setOrb("blocked");
    } else {
      setOrb("complete", "Complete — " + shown + (shown === 1 ? " result" : " results"));
    }
  }

  searchInput.addEventListener("input", function () {
    /* Listening: the user is typing in the search box. */
    setOrb("listening");
    clearTimeout(typingTimer);
    var value = searchInput.value;
    typingTimer = setTimeout(function () {
      runFilter(value);
    }, 180);
  });

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      searchInput.value = "";
      runFilter("");
      searchInput.blur();
    }
  });

  setOrb("idle");
})();
