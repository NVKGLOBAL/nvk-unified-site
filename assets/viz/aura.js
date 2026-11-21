/* Seeker aura — port of -CODEXA/components/visuals/SeekerAuraDisplay.tsx
 * (2D canvas: central pulsing orb, trait flares, ambient particles —
 * VERBATIM, React replaced by plain canvas).
 *
 * The seeker is the visitor. Traits are the pages the visitor has actually
 * opened in this session (shared activity bus) — each visited page grows
 * the aura's flares. With no visits yet, the aura shows its base form
 * (5 flares). No agent tone is active on this site, so the Default style
 * (organic flares) is used. "Entropy" is the visitor's measured activity
 * level. The trait list under the canvas shows the real session trail.
 */
(function () {
  "use strict";

  var MAX_FLARES = 20;
  var MAX_PARTICLES = 100;

  function getEntropyColorHSLA(entropy, s, l, a) {
    s = s === undefined ? 70 : s;
    l = l === undefined ? 55 : l;
    a = a === undefined ? 1 : a;
    var hue = (1 - Math.min(entropy, 1)) * 240;
    return "hsla(" + hue + ", " + s + "%, " + l + "%, " + a + ")";
  }

  var AGENT_STYLE = { flareColor: "hsla(210, 50%, 60%, 0.6)", particleColor: "hsla(210, 50%, 70%, 0.4)", flareStyle: "organic" };

  window.mountAura = function (canvas, traitListEl) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var width = canvas.width;
    var height = canvas.height;
    var flares = [];
    var particles = [];
    var animationFrameId = null;
    var traits = [];

    function initFlares() {
      var numFlares = Math.min(MAX_FLARES, traits.length > 0 ? traits.length * 2 + 3 : 5);
      var next = [];
      for (var i = 0; i < numFlares; i++) {
        var traitInfluence = traits[i % traits.length] || "base";
        var angle = (i / numFlares) * Math.PI * 2;
        var maxLength = 50 + Math.random() * Math.min(width, height) * 0.2;
        var flareColor = AGENT_STYLE.flareColor;
        if (traitInfluence !== "base") {
          var hash = traitInfluence.split("").reduce(function (acc, ch) { return acc + ch.charCodeAt(0); }, 0);
          var hueOffset = (hash % 60) - 30;
          var m = AGENT_STYLE.flareColor.match(/hsla\((\d+)/);
          if (m) {
            var baseHue = parseInt(m[1], 10);
            flareColor = AGENT_STYLE.flareColor.replace("hsla(" + baseHue, "hsla(" + (baseHue + hueOffset));
          }
        }
        next.push({
          id: "flare-" + i + "-" + traitInfluence,
          angle: angle + Math.random() * 0.2 - 0.1,
          length: 0,
          maxLength: maxLength * (0.5 + Math.random() * 0.7),
          speed: 0.5 + Math.random() * 1,
          color: flareColor,
          thickness: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.4,
          type: "trait",
          pulseSpeed: 0.01 + Math.random() * 0.02,
          pulseAmount: 0.1 + Math.random() * 0.2
        });
      }
      flares = next;
    }

    function initParticles() {
      var next = [];
      for (var i = 0; i < MAX_PARTICLES; i++) {
        next.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
          color: AGENT_STYLE.particleColor
        });
      }
      particles = next;
    }

    function renderTraits() {
      if (!traitListEl) return;
      traitListEl.textContent = traits.length > 0
        ? "This session: " + traits.join(" · ")
        : "This session: no pages visited yet — the aura shows its base form.";
    }

    function updateTraits(next) {
      traits = next.slice();
      initFlares();
      renderTraits();
    }

    if (window.NVKActivity) {
      traits = window.NVKActivity.getTraits();
      window.NVKActivity.onTraits(updateTraits);
    }
    initFlares();
    initParticles();
    renderTraits();

    var frameCount = 0;
    function draw() {
      frameCount++;
      var entropy = window.NVKActivity ? window.NVKActivity.getLevel() : 0;
      ctx.clearRect(0, 0, width, height);
      var centerX = width / 2;
      var centerY = height / 2;

      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      var orbBaseRadius = Math.min(width, height) * 0.1;
      var orbPulse = Math.sin(frameCount * 0.02 * (1 + entropy * 2)) * orbBaseRadius * 0.15 * (1 + entropy);
      var orbRadius = orbBaseRadius + orbPulse;
      var orbColor = getEntropyColorHSLA(entropy);
      var glowRadius = orbRadius + 15 + entropy * 20;
      var gradient = ctx.createRadialGradient(centerX, centerY, orbRadius * 0.5, centerX, centerY, glowRadius);
      gradient.addColorStop(0, getEntropyColorHSLA(entropy, 70, 60, 0.5 * (0.5 + entropy * 0.5)));
      gradient.addColorStop(0.7, getEntropyColorHSLA(entropy, 70, 60, 0.2 * (0.5 + entropy * 0.5)));
      gradient.addColorStop(1, getEntropyColorHSLA(entropy, 70, 60, 0));
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, glowRadius), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, orbRadius), 0, Math.PI * 2);
      ctx.fillStyle = orbColor;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = 10 + entropy * 15;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      flares.forEach(function (flare) {
        if (flare.length < flare.maxLength) {
          flare.length += flare.speed;
        } else {
          flare.length = Math.max(0, flare.length - flare.speed * 0.5);
          if (flare.length === 0) flare.maxLength = 50 + Math.random() * Math.min(width, height) * 0.2;
        }
        var flarePulse = Math.sin(frameCount * (flare.pulseSpeed || 0.01)) * (flare.pulseAmount || 0.1);
        var currentLength = flare.length * (1 + flarePulse);
        var startX = centerX + Math.cos(flare.angle) * (orbRadius * 0.8);
        var startY = centerY + Math.sin(flare.angle) * (orbRadius * 0.8);
        var endX = centerX + Math.cos(flare.angle) * (orbRadius * 0.8 + currentLength);
        var endY = centerY + Math.sin(flare.angle) * (orbRadius * 0.8 + currentLength);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        var cp1x = startX + (endX - startX) * 0.3 + Math.cos(flare.angle + Math.PI / 2) * currentLength * 0.1 * Math.sin(frameCount * 0.05 + flare.angle);
        var cp1y = startY + (endY - startY) * 0.3 + Math.sin(flare.angle + Math.PI / 2) * currentLength * 0.1 * Math.sin(frameCount * 0.05 + flare.angle);
        var cp2x = startX + (endX - startX) * 0.7 - Math.cos(flare.angle + Math.PI / 2) * currentLength * 0.1 * Math.sin(frameCount * 0.05 + flare.angle);
        var cp2y = startY + (endY - startY) * 0.7 - Math.sin(flare.angle + Math.PI / 2) * currentLength * 0.1 * Math.sin(frameCount * 0.05 + flare.angle);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.strokeStyle = flare.color;
        ctx.lineWidth = flare.thickness * (0.8 + entropy * 0.4);
        ctx.globalAlpha = flare.opacity * (1 - entropy * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (currentLength > 10) {
          ctx.beginPath();
          ctx.arc(endX, endY, Math.max(0, flare.thickness * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = flare.color;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    }
    animationFrameId = requestAnimationFrame(draw);
    var host = canvas.closest("[data-viz]");
    if (host) host.setAttribute("data-viz-ready", "true");
  };
})();
