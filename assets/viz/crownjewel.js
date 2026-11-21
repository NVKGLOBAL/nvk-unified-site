/* CODEXA crown-jewel background, 2D layer — port of the
 * Fallback2DSolarCanvas inside
 * -CODEXA/components/visuals/CodexaCrownJewelBackground.tsx (VERBATIM:
 * radiant sun glow, 12 rotating ray beams, 120 swirling quantum particles).
 * This is the layer the original itself guarantees on any device. The 3D
 * layer above it (sun-galaxy core with a distort-material sun) needs
 * @react-three/drei and is NOT embedded in this static build — stated on
 * the page, not faked. No audio runs on this site, so audioLevel is 0 and
 * isSpeaking is false.
 */
(function () {
  "use strict";

  window.mountCrownJewel = function (canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    var height = (canvas.height = canvas.offsetHeight || window.innerHeight);
    var animationFrameId = null;

    function handleResize() {
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    }
    window.addEventListener("resize", handleResize);

    var particles = [];
    var colors = ["#10b981", "#38bdf8", "#fbbf24", "#a78bfa"];
    for (var i = 0; i < 120; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        radius: Math.random() * 2.5 + 1,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.01 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    var time = 0;
    function render() {
      time += 0.03;
      ctx.clearRect(0, 0, width, height);
      var centerX = width / 2;
      var centerY = height / 2;
      var pulse = Math.sin(time * 2) * 20;
      var gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 180 + pulse);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      gradient.addColorStop(0.3, "rgba(251, 191, 36, 0.6)");
      gradient.addColorStop(0.7, "rgba(16, 185, 129, 0.3)");
      gradient.addColorStop(1, "rgba(10, 10, 26, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 250 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.2);
      for (var j = 0; j < 12; j++) {
        ctx.rotate((Math.PI * 2) / 12);
        var rayGrad = ctx.createLinearGradient(0, 0, 0, 160);
        rayGrad.addColorStop(0, "rgba(251, 191, 36, 0.5)");
        rayGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        ctx.fillStyle = rayGrad;
        ctx.fillRect(-2, 20, 4, 140);
      }
      ctx.restore();

      particles.forEach(function (p, idx) {
        p.angle += p.speed;
        var dist = 50 + idx * 2.5 + Math.sin(time + idx) * 15;
        var px = centerX + Math.cos(p.angle) * dist * 1.5;
        var py = centerY + Math.sin(p.angle) * dist;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    }
    render();
    var host = canvas.closest("[data-viz]");
    if (host) host.setAttribute("data-viz-ready", "true");
  };
})();
