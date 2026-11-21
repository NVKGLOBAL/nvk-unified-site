/* Resonance visualizer — vanilla-JS port of
 * -CODEXA/components/ResonanceVisualizerPanel.tsx (shaders and burst math
 * VERBATIM; @react-three/fiber Canvas replaced by a plain renderer;
 * the GSAP intensity pulse replaced by a manual decay envelope —
 * same shape, no dependency).
 *
 * What drives it: REAL resonance events from the shared activity bus
 * (window.NVKActivity). Every genuine pointer press on the page sends one
 * pulse; the "Pulse" button under the panel sends one on demand. The
 * resonator idles at its original baseline intensity (0.5) and the bursts
 * are the visitor's own activity, made visible. Nothing is scheduled or
 * simulated.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const PARTICLE_VERTEX_SHADER = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

const RESONATOR_VERTEX_SHADER = `
  uniform float u_time;
  uniform float u_intensity;
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    float noise = sin(position.y * 5.0 + u_time * 2.0) * 0.05 + sin(position.x * 5.0 + u_time * 2.0) * 0.05;
    vec3 newPosition = position + normal * noise * u_intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const RESONATOR_FRAGMENT_SHADER = `
  uniform vec3 u_color;
  uniform float u_intensity;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(u_color * u_intensity, 1.0) * intensity;
  }
`;

/**
 * opts: { playBtn?: HTMLElement, clearBtn?: HTMLElement,
 *         countEl?: HTMLElement, onFail?: (err) => void }
 */
export function mountResonance(canvas, opts) {
  opts = opts || {};
  const mount = canvas.parentElement;
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    if (opts.onFail) opts.onFail(e);
    return null;
  }
  if (!renderer) { if (opts.onFail) opts.onFail(new Error("WebGL unavailable")); return null; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);

  const resonatorMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_intensity: { value: 0.5 },
      u_color: { value: new THREE.Color("#00FFB3") }
    },
    vertexShader: RESONATOR_VERTEX_SHADER,
    fragmentShader: RESONATOR_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    wireframe: true
  });
  const resonator = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 3), resonatorMaterial);
  scene.add(resonator);

  const particleGeometry = new THREE.BufferGeometry();
  const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });
  const points = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(points);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 1.2, 0.9, 0.1));
  composer.addPass(new OutputPass());

  let isPlaying = true;
  let particles = [];
  let pulseEnvelope = 0; // 0..1 — replaces the GSAP yoyo pulse (0.2 s up, back down)
  let lastEffectId = null;
  let effectCount = 0;

  function onEffect(effect) {
    if (!effect || effect.id === lastEffectId) return;
    lastEffectId = effect.id;
    effectCount += 1;
    pulseEnvelope = 1;
    const particleCount = 50 + Math.floor(effect.intensity * 150);
    for (let i = 0; i < particleCount; i++) {
      const velocity = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize().multiplyScalar(Math.random() * 0.05 + 0.02 * effect.intensity);
      const durationSeconds = parseFloat(effect.duration) || 4.0;
      const maxLife = durationSeconds * 60 * (0.8 + Math.random() * 0.4);
      particles.push({
        position: new THREE.Vector3(),
        velocity: velocity,
        color: new THREE.Color(effect.colorProfile || "#00FFB3"),
        life: maxLife,
        maxLife: maxLife,
        size: (Math.random() * 1.5 + 0.5) * effect.intensity
      });
    }
    if (particles.length > 2000) particles = particles.slice(-2000);
    if (opts.countEl) opts.countEl.textContent = String(effectCount);
  }

  if (window.NVKActivity) window.NVKActivity.onResonance(onEffect);

  if (opts.playBtn) {
    opts.playBtn.addEventListener("click", () => {
      isPlaying = !isPlaying;
      opts.playBtn.textContent = isPlaying ? "Pause" : "Play";
      opts.playBtn.setAttribute("aria-pressed", String(!isPlaying));
    });
  }
  if (opts.clearBtn) {
    opts.clearBtn.addEventListener("click", () => {
      particles = [];
      effectCount = 0;
      if (opts.countEl) opts.countEl.textContent = "0";
    });
  }

  function resize() {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);

  const clock = new THREE.Clock();
  let animationFrameId = 0;
  let readyMarked = false;
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    if (isPlaying) {
      resonator.rotation.x = time * 0.1;
      resonator.rotation.y = time * 0.15;
      resonatorMaterial.uniforms.u_time.value = time;
      // Manual pulse: spike to 1.5 on a new effect, decay back to 0.5.
      if (pulseEnvelope > 0) pulseEnvelope = Math.max(0, pulseEnvelope - 0.02);
      resonatorMaterial.uniforms.u_intensity.value = 0.5 + pulseEnvelope * 1.0;

      const positions = [];
      const colors = [];
      const sizes = [];
      const gravity = new THREE.Vector3(0, 0, 0);
      particles.forEach((p) => {
        if (p.life > 0) {
          p.life -= 1;
          const pull = p.position.clone().multiplyScalar(-0.0001);
          p.velocity.add(pull);
          p.position.add(p.velocity);
          positions.push(p.position.x, p.position.y, p.position.z);
          const lifeRatio = p.life / p.maxLife;
          const color = p.color.clone().multiplyScalar(lifeRatio);
          colors.push(color.r, color.g, color.b);
          sizes.push(p.size * lifeRatio);
        }
      });
      particles = particles.filter((p) => p.life > 0);
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
      particleGeometry.setAttribute("size", new THREE.BufferAttribute(new Float32Array(sizes), 1));
    }
    composer.render();
    if (!readyMarked) {
      readyMarked = true;
      const host = canvas.closest("[data-viz]");
      if (host) host.setAttribute("data-viz-ready", "true");
    }
  }
  animate();

  return {
    dispose() {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      resonatorMaterial.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    }
  };
}
