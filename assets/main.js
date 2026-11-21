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
