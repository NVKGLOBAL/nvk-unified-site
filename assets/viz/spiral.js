/* Temporal spiral — port of -CODEXA/components/visuals/TemporalSpiralVisualizer.tsx
 * (spiral geometry, node placement by arc length, state colors, junction
 * diamonds, entropy readouts — VERBATIM; React/SVGX replaced by a plain
 * SVG built in JS).
 *
 * The data is real: the 9 chapters of Book 2: The Exodus (story.html),
 * one node per chapter, in reading order, each labeled with its real title
 * and stolen sound. Chapters 1–8 are published (state: Woven); the finale
 * is the active node (state: Spooling, junction — the door).
 * "Entropy" here is the measured activity level of the visitor on this
 * page (shared bus): the spiral tightens and loosens as you interact.
 * The readout under the spiral shows the live measured value.
 */
(function () {
  "use strict";

  var STATE_COLORS = {
    Inert: "#475569",
    Spooling: "#38bdf8",
    Knotted: "#f43f5e",
    Frayed: "#f59e0b",
    Woven: "#34d399",
    HarmonicLoop: "#c084fc",
    EchoReversion: "#3b82f6"
  };

  // Real chapters (story.html). positionOnSpiral spreads them along the path.
  var SEGMENTS = [
    { id: "ch1", label: "Ch 1 — The Drowned Choir", description: "A drowned ocean world — the tide-song", positionOnSpiral: 0.1, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch2", label: "Ch 2 — The Ember Fields", description: "A burnt prairie — the war-drum", positionOnSpiral: 0.2, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch3", label: "Ch 3 — The Hollow Mountain", description: "A mountain with no inside — the deep hum", positionOnSpiral: 0.3, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch4", label: "Ch 4 — The Glass Desert", description: "A desert of shattered glass — the wind-chime", positionOnSpiral: 0.4, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch5", label: "Ch 5 — The Root Network", description: "A mycelial forest — the root-song", positionOnSpiral: 0.5, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch6", label: "Ch 6 — The Frozen Bells", description: "A city of ice bells — the bell", positionOnSpiral: 0.6, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch7", label: "Ch 7 — The Static City", description: "A dead broadcast city — the broadcast", positionOnSpiral: 0.7, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch8", label: "Ch 8 — The Door Home", description: "The way back — the first sound", positionOnSpiral: 0.8, state: "Woven", isJunction: false, entropyAtPoint: 0.15 },
    { id: "ch9", label: "Ch 9 — The Return (finale)", description: "He reaches the door with all eight sounds — ending undecided", positionOnSpiral: 0.9, state: "Spooling", isJunction: true, entropyAtPoint: 0.55 }
  ];

  function interpretEntropy(value) {
    if (value === undefined || value === null) return "Unknown Status";
    if (value > 0.8) return "Chaotic Fragment – Thread Fracture Imminent";
    if (value > 0.6) return "Memory Instability – Loop Potential High";
    if (value > 0.4) return "Partial Coherence – Spiral Resonance Fluctuating";
    if (value > 0.2) return "Harmonic Memory – Stable Node";
    return "Crystallized Pattern – Preserved State";
  }

  function buildSpiral(svg, width, height, entropy) {
    var NS = "http://www.w3.org/2000/svg";
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    var defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<filter id="spiralGlow" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>' +
        '<feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      "</filter>" +
      '<radialGradient id="spiralCenterGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="rgba(192, 132, 252, 0.4)"/>' +
        '<stop offset="60%" stop-color="rgba(167, 139, 250, 0.1)"/>' +
        '<stop offset="100%" stop-color="rgba(124, 58, 237, 0)"/>' +
      "</radialGradient>";
    svg.appendChild(defs);

    var centerX = width / 2;
    var centerY = height / 2;
    var numTurns = 3.5 + entropy * 1.5;
    var maxRadius = Math.min(centerX, centerY) * 0.85;
    var initialRadius = maxRadius * 0.15;
    var a = initialRadius;
    var b = (maxRadius - a) / (2 * Math.PI * numTurns);
    var totalAngle = 2 * Math.PI * numTurns;
    var pointsForPath = [];
    var pathD = "";
    for (var angle = 0; angle <= totalAngle; angle += Math.PI / 60) {
      var radius = a + b * angle;
      var x = centerX + radius * Math.cos(angle);
      var y = centerY + radius * Math.sin(angle);
      pointsForPath.push({ x: x, y: y });
      pathD += (angle === 0 ? "M " + x + " " + y : " L " + x + " " + y);
    }
    var totalPathLength = pointsForPath.reduce(function (acc, point, i) {
      if (i === 0) return 0;
      var prev = pointsForPath[i - 1];
      return acc + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
    }, 0);

    var glow = document.createElementNS(NS, "circle");
    glow.setAttribute("cx", centerX);
    glow.setAttribute("cy", centerY);
    glow.setAttribute("r", Math.min(width, height) * 0.1);
    glow.setAttribute("fill", "url(#spiralCenterGlow)");
    glow.setAttribute("opacity", "0.7");
    svg.appendChild(glow);

    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(167, 139, 250, 0.2)");
    path.setAttribute("stroke-width", String(1 + entropy * 1.5));
    path.setAttribute("filter", "url(#spiralGlow)");
    svg.appendChild(path);

    SEGMENTS.forEach(function (segment) {
      var currentLength = 0;
      var targetX = centerX + a;
      var targetY = centerY;
      for (var i = 1; i < pointsForPath.length; i++) {
        var p1 = pointsForPath[i - 1];
        var p2 = pointsForPath[i];
        var segLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        if ((currentLength + segLength) / totalPathLength >= segment.positionOnSpiral) {
          var frac = (segment.positionOnSpiral * totalPathLength - currentLength) / segLength;
          targetX = p1.x + (p2.x - p1.x) * frac;
          targetY = p1.y + (p2.y - p1.y) * frac;
          break;
        }
        currentLength += segLength;
      }
      var r = 4 + entropy * 3;
      if (segment.isJunction) r = 7 + entropy * 4;
      var g = document.createElementNS(NS, "g");
      if (segment.state === "Spooling") g.setAttribute("class", "spiral-node-spooling");
      else g.setAttribute("class", "spiral-node-pulse");
      var ev = segment.entropyAtPoint !== undefined ? segment.entropyAtPoint : entropy;
      g.style.animationDuration = Math.max(0.8, 3 - ev * 2.5) + "s";
      var circle = document.createElementNS(NS, "circle");
      circle.setAttribute("cx", targetX);
      circle.setAttribute("cy", targetY);
      circle.setAttribute("r", r);
      circle.setAttribute("fill", STATE_COLORS[segment.state] || "#64748b");
      circle.setAttribute("fill-opacity", "0.8");
      circle.setAttribute("stroke", "rgba(229, 231, 235, 0.3)");
      circle.setAttribute("stroke-width", "0.5");
      var title = document.createElementNS(NS, "title");
      title.textContent = segment.label + (segment.description ? ": " + segment.description : "") +
        "\nState: " + segment.state +
        "\nEntropy: " + (segment.entropyAtPoint !== undefined ? segment.entropyAtPoint.toFixed(2) : "N/A") +
        "\n" + interpretEntropy(segment.entropyAtPoint);
      circle.appendChild(title);
      g.appendChild(circle);
      if (segment.isJunction) {
        var diamond = document.createElementNS(NS, "path");
        diamond.setAttribute("d", "M " + (targetX - r * 0.6) + " " + targetY +
          " L " + targetX + " " + (targetY - r * 0.6) +
          " L " + (targetX + r * 0.6) + " " + targetY +
          " L " + targetX + " " + (targetY + r * 0.6) + " Z");
        diamond.setAttribute("fill", "rgba(216, 180, 254, 0.7)");
        diamond.setAttribute("stroke", "rgba(233, 213, 255, 0.9)");
        diamond.setAttribute("stroke-width", "0.5");
        g.appendChild(diamond);
      }
      svg.appendChild(g);
    });
  }

  // Mount: mountSpiral(svgElement, readoutElement)
  window.mountSpiral = function (svg, readoutEl) {
    var width = 720;
    var height = 480;
    var lastEntropy = -1;
    var lastBuild = 0;
    function render(force) {
      var entropy = window.NVKActivity ? window.NVKActivity.getLevel() : 0;
      var t = performance.now();
      if (!force && Math.abs(entropy - lastEntropy) < 0.02 && t - lastBuild < 1000) return;
      lastEntropy = entropy;
      lastBuild = t;
      buildSpiral(svg, width, height, entropy);
      if (readoutEl) {
        readoutEl.textContent = "Entropy Influence: " + entropy.toFixed(3) + "\u03B4 | Path Complexity: " + SEGMENTS.length + " nodes";
      }
      var host = svg.closest("[data-viz]");
      if (host) host.setAttribute("data-viz-ready", "true");
    }
    render(true);
    setInterval(function () { render(false); }, 500);
  };
})();
