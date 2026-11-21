/* Particle galaxy background — port of nvknexusorb/ParticleBackground.tsx
 * (verbatim: 250,000-point spiral galaxy, custom shaders, mouse warp,
 * pulsing core, slow rotation, camera parallax). Rendered as an absolute
 * backdrop behind content; pointer-events none. Used behind the orb hub
 * on the visualizations page, where the panel is dark enough for the
 * additive points to show.
 */
import * as THREE from "three";

export function mountGalaxy(container, opts) {
  opts = opts || {};
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); }
    catch (e2) {
      try { renderer = new THREE.WebGLRenderer({ alpha: true }); }
      catch (e3) { if (opts.onFail) opts.onFail(e3); return null; }
    }
  }
  if (!renderer) { if (opts.onFail) opts.onFail(new Error("WebGL unavailable")); return null; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 4, 25);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.pointerEvents = "none";

  const mousePos = new THREE.Vector2(9999, 9999);

  const galaxyParams = {
    count: 250000,
    size: 0.015,
    radius: 22,
    branches: 7,
    spin: 1.5,
    randomness: 0.4,
    randomnessPower: 3.5,
    insideColor: "#67e8f9",
    outsideColor: "#d946ef"
  };

  let geometry = null;
  let material = null;
  let points = null;

  const generateGalaxy = () => {
    if (points) {
      geometry.dispose();
      material.dispose();
      scene.remove(points);
    }
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyParams.count * 3);
    const colors = new Float32Array(galaxyParams.count * 3);
    const scales = new Float32Array(galaxyParams.count * 1);
    const randomness = new Float32Array(galaxyParams.count * 3);
    const radiuses = new Float32Array(galaxyParams.count * 1);
    const colorInside = new THREE.Color(galaxyParams.insideColor);
    const colorOutside = new THREE.Color(galaxyParams.outsideColor);

    for (let i = 0; i < galaxyParams.count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * galaxyParams.radius;
      const spinAngle = radius * galaxyParams.spin;
      const branchAngle = ((i % galaxyParams.branches) / galaxyParams.branches) * Math.PI * 2;
      const randomX = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;
      const randomY = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * 0.2;
      const randomZ = Math.pow(Math.random(), galaxyParams.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * galaxyParams.randomness * radius;
      positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
      randomness[i3] = randomX;
      randomness[i3 + 1] = randomY;
      randomness[i3 + 2] = randomZ;
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / galaxyParams.radius);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      scales[i] = Math.random();
      radiuses[i] = radius;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aRandomness", new THREE.BufferAttribute(randomness, 3));
    geometry.setAttribute("aRadius", new THREE.BufferAttribute(radiuses, 1));

    material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 35 * (renderer.getPixelRatio() || 1) },
        uMouse: { value: new THREE.Vector2(9999, 9999) },
        uGalaxyRadius: { value: galaxyParams.radius }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform vec2 uMouse;
        attribute float aScale;
        attribute vec3 aRandomness;
        attribute float aRadius;
        varying vec3 vColor;
        varying float vRadius;
        void main() {
          vColor = color;
          vRadius = aRadius;
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 screenPos = projectionMatrix * viewMatrix * modelPosition;
          vec2 screenXY = screenPos.xy / screenPos.w;
          float mouseDist = distance(screenXY, uMouse);
          float warpStrength = smoothstep(0.4, 0.0, mouseDist) * 2.0;
          vec3 warpDirection = normalize(vec3(aRandomness.y, -aRandomness.x, 0.0));
          modelPosition.xyz += warpDirection * warpStrength;
          modelPosition.y += sin(uTime * 0.5 + modelPosition.x * 2.0) * aScale * 0.4;
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectedPosition = projectionMatrix * viewPosition;
          gl_Position = projectedPosition;
          gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uGalaxyRadius;
        varying vec3 vColor;
        varying float vRadius;
        void main() {
          float strength = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - pow(strength * 2.0, 2.0);
          if (alpha < 0.01) { discard; }
          float distanceRatio = vRadius / uGalaxyRadius;
          float pulse = sin(distanceRatio * -20.0 + uTime * 3.0) * 0.5 + 0.5;
          float pulseStrength = smoothstep(0.5, 0.0, distanceRatio);
          vec3 finalColor = vColor + vColor * pulse * pulseStrength * 2.0;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });
    points = new THREE.Points(geometry, material);
    scene.add(points);
  };

  generateGalaxy();

  function onMouseMove(event) {
    mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  function onMouseOut() {
    mousePos.x = 9999;
    mousePos.y = 9999;
  }
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseout", onMouseOut);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    if (material) material.uniforms.uSize.value = 35 * renderer.getPixelRatio();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const clock = new THREE.Clock();
  let animationFrameId = 0;
  let readyMarked = false;
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    if (material) {
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uMouse.value.lerp(mousePos, 0.05);
    }
    if (points) points.rotation.y = elapsedTime * 0.05;
    const targetCameraX = mousePos.x === 9999 ? 0 : mousePos.x * 2.0;
    const targetCameraY = mousePos.x === 9999 ? 4 : -mousePos.y * 2.0 + 4;
    camera.position.x += (targetCameraX - camera.position.x) * 0.05;
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    if (!readyMarked) {
      readyMarked = true;
      const host = container.closest("[data-viz]");
      if (host) host.setAttribute("data-viz-ready", "true");
    }
  }
  animate();

  return {
    dispose() {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      resizeObserver.disconnect();
      if (renderer && container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      renderer.dispose();
    }
  };
}
