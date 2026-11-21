/* Knowledge graph — vanilla-JS port of -CODEXA/components/EmergentLogicWeb.tsx
 * (physics, node/edge construction, colors, interactions VERBATIM;
 * React shell replaced by plain DOM; GSAP tweens replaced by manual lerps).
 *
 * The data is NOT the Codex's internal glyph store (that data lives in the
 * CODEXA app, not in any repo file). It is this site's own real structure,
 * visualized as a living graph:
 * - Axiom nodes = the 8 real sections of this site (layer colors I–V, Ω, P, A
 *   from the original; tooltips show the real page path and description).
 * - Glyph nodes = the 9 real chapters of Book 2: The Exodus (story.html),
 *   chained parent → child in reading order; traits are each chapter's real
 *   stolen sound and publication state.
 * - Glyph glow (entropy) is a stated derivation from real facts: published
 *   chapters sit low (0.15); the finale runs hotter (0.55) because its
 *   ending is undecided. Nothing here invents a frequency, a score, or a
 *   node that does not exist on this site.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const REPULSION_STRENGTH = 20.0;
const SPRING_STRENGTH = 0.08;
const DAMPING = 0.95;
const IDEAL_EDGE_LENGTH = 15;
const NODE_SIZE = 0.5;
const AXIOM_SIZE = 0.8;
const EDGE_RADIUS = 0.05;

const LAYER_COLORS = {
  I: new THREE.Color("#06b6d4"),
  II: new THREE.Color("#f59e0b"),
  III: new THREE.Color("#8b5cf6"),
  IV: new THREE.Color("#ec4899"),
  V: new THREE.Color("#10b981"),
  "\u03A9": new THREE.Color("#84cc16"),
  P: new THREE.Color("#38bdf8"),
  A: new THREE.Color("#ffffff")
};
const GLYPH_COLOR = new THREE.Color("#ffbf00");
const REWOVEN_GLYPH_COLOR = new THREE.Color("#a855f7");

// Real site data (see header).
const AXIOMS = [
  { id: "ax-home", title: "Home", layer: "I", series: "Site section", path: "index.html", desc: "The front door — one ecosystem, one name." },
  { id: "ax-offers", title: "Offers", layer: "II", series: "Site section", path: "offers.html", desc: "Store, membership, cards, services, CODEXA." },
  { id: "ax-story", title: "Story", layer: "III", series: "Site section", path: "story.html", desc: "Headphone Heroes — Book 1 canon, Book 2 proposed." },
  { id: "ax-brand", title: "Brand", layer: "IV", series: "Site section", path: "brand.html", desc: "What NVK stands for — identity and principles." },
  { id: "ax-why", title: "Why NVK", layer: "V", series: "Site section", path: "why.html", desc: "Why choose us, and what makes us different." },
  { id: "ax-intel", title: "Intelligence", layer: "\u03A9", series: "Site section", path: "intelligence.html", desc: "CODEXA and the Codex chain, stated honestly." },
  { id: "ax-status", title: "Status", layer: "P", series: "Site section", path: "status.html", desc: "The capability registry — what is real." },
  { id: "ax-store", title: "Store", layer: "A", series: "Site section", path: "store/", desc: "27 products, live Stripe checkout." }
];
const GLYPHS = [
  { id: "ch1", label: "Ch 1 — The Drowned Choir", entropyLevel: 0.15, parentId: "ax-story", traits: ["tide-song", "Published"] },
  { id: "ch2", label: "Ch 2 — The Ember Fields", entropyLevel: 0.15, parentId: "ch1", traits: ["war-drum", "Published"] },
  { id: "ch3", label: "Ch 3 — The Hollow Mountain", entropyLevel: 0.15, parentId: "ch2", traits: ["deep hum", "Published"] },
  { id: "ch4", label: "Ch 4 — The Glass Desert", entropyLevel: 0.15, parentId: "ch3", traits: ["wind-chime", "Published"] },
  { id: "ch5", label: "Ch 5 — The Root Network", entropyLevel: 0.15, parentId: "ch4", traits: ["root-song", "Published"] },
  { id: "ch6", label: "Ch 6 — The Frozen Bells", entropyLevel: 0.15, parentId: "ch5", traits: ["bell", "Published"] },
  { id: "ch7", label: "Ch 7 — The Static City", entropyLevel: 0.15, parentId: "ch6", traits: ["broadcast", "Published"] },
  { id: "ch8", label: "Ch 8 — The Door Home", entropyLevel: 0.15, parentId: "ch7", traits: ["first sound", "Published"] },
  { id: "ch9", label: "Ch 9 — The Return (finale)", entropyLevel: 0.55, parentId: "ch8", traits: ["ending undecided", "Finale"] }
];
// Edges: [sourceId, targetId, type] — all real links on this site.
const EDGES = [
  ["ax-home", "ax-offers", "axiomBinding"], ["ax-home", "ax-story", "axiomBinding"],
  ["ax-home", "ax-brand", "axiomBinding"], ["ax-home", "ax-why", "axiomBinding"],
  ["ax-home", "ax-intel", "axiomBinding"], ["ax-home", "ax-status", "axiomBinding"],
  ["ax-home", "ax-store", "axiomBinding"],
  ["ax-story", "ch1", "axiomBinding"],
  ["ch1", "ch2", "mutation"], ["ch2", "ch3", "mutation"], ["ch3", "ch4", "mutation"],
  ["ch4", "ch5", "mutation"], ["ch5", "ch6", "mutation"], ["ch6", "ch7", "mutation"],
  ["ch7", "ch8", "mutation"], ["ch8", "ch9", "mutation"]
];

/**
 * opts: { debugEl?: HTMLElement, tooltipEl?: HTMLElement, onFail?: (err) => void }
 */
export function mountLogicWeb(canvas, opts) {
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
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 35;
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  camera.add(pointLight);
  scene.add(camera);

  const nodesGroup = new THREE.Group();
  const edgesGroup = new THREE.Group();
  scene.add(nodesGroup);
  scene.add(edgesGroup);

  const allData = new Map();
  GLYPHS.forEach((d) => allData.set(d.id, d));
  AXIOMS.forEach((d) => allData.set(d.id, d));

  const graphNodes = [];
  allData.forEach((dataItem, id) => {
    let node;
    if ("entropyLevel" in dataItem) {
      const gn = dataItem;
      const coreGeo = new THREE.SphereGeometry(NODE_SIZE, 24, 24);
      const coreMat = new THREE.MeshStandardMaterial({ color: GLYPH_COLOR, emissive: GLYPH_COLOR, emissiveIntensity: 0.4, metalness: 0.2, roughness: 0.5 });
      const auraGeo = new THREE.SphereGeometry(NODE_SIZE * 1.3, 24, 24);
      const auraMat = new THREE.MeshStandardMaterial({ emissive: new THREE.Color().setHSL(0.66 - gn.entropyLevel * 0.5, 0.8, 0.5), emissiveIntensity: 1.0, transparent: true, opacity: 0.3, side: THREE.BackSide });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      node = new THREE.Group();
      node.add(coreMesh, auraMesh);
      node.coreMesh = coreMesh;
      node.auraMesh = auraMesh;
      node.nodeType = "glyph";
    } else {
      const ax = dataItem;
      const geo = new THREE.IcosahedronGeometry(AXIOM_SIZE, 1);
      const col = LAYER_COLORS[ax.layer] || new THREE.Color("#ffffff");
      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.3 });
      const coreMesh = new THREE.Mesh(geo, mat);
      node = new THREE.Group();
      node.add(coreMesh);
      node.coreMesh = coreMesh;
      node.nodeType = "axiom";
    }
    node.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    node.velocity = new THREE.Vector3();
    node.nodeId = id;
    node.data = dataItem;
    node.userData.hoverScale = 1;
    graphNodes.push(node);
    nodesGroup.add(node);
  });

  const graphEdges = EDGES.map((def) => {
    const material = def[2] === "axiomBinding"
      ? new THREE.MeshStandardMaterial({ color: 0x00ffb3, emissive: 0x00ffb3, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 })
      : new THREE.MeshStandardMaterial({ color: 0x00a4ff, emissive: 0x00a4ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 });
    const geometry = new THREE.CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, 1, 5, 1);
    const mesh = new THREE.Mesh(geometry, material);
    edgesGroup.add(mesh);
    return { id: "e-" + def[0] + "-" + def[1], sourceId: def[0], targetId: def[1], type: def[2], mesh };
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 10;
  controls.maxDistance = 80;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.6, 0.1));
  composer.addPass(new OutputPass());

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(1, 1);
  let draggedNode = null;
  let hasDragged = false;
  let hoveredNode = null;
  let selectedNodeId = null;

  function tooltipHTML(node) {
    if (node.nodeType === "glyph") {
      const d = node.data;
      const parentIds = Array.isArray(d.parentId) ? d.parentId : (d.parentId ? [d.parentId] : []);
      const parents = parentIds.map((pId) => {
        const p = allData.get(pId);
        return p ? (p.label || p.title) : null;
      }).filter(Boolean);
      return "<div class=\"viz-tip-title\">" + d.label + "</div>" +
        "<div class=\"viz-tip-rows\"><p><strong>Type:</strong> Glyph Node</p>" +
        "<p><strong>Entropy:</strong> " + d.entropyLevel.toFixed(3) + "\u03B4</p>" +
        (parents.length ? "<p><strong>Parent(s):</strong> " + parents.join(", ") + "</p>" : "") +
        (d.traits.length ? "<p><strong>Traits:</strong> " + d.traits.join(", ") + "</p>" : "") + "</div>";
    }
    const d = node.data;
    const links = graphEdges.filter((e) => e.sourceId === d.id || e.targetId === d.id).length;
    return "<div class=\"viz-tip-title\">" + d.title + "</div>" +
      "<div class=\"viz-tip-rows\"><p><strong>Type:</strong> Axiom</p>" +
      "<p><strong>Layer/Series:</strong> " + d.layer + " / " + d.series + "</p>" +
      "<p><strong>Page:</strong> " + d.path + "</p>" +
      "<p><strong>Links in this graph:</strong> " + links + "</p>" +
      "<p>" + d.desc + "</p></div>";
  }

  function updateDebug() {
    if (!opts.debugEl) return;
    opts.debugEl.textContent =
      "Nodes: " + graphNodes.length + "  ·  Edges: " + graphEdges.length +
      "  ·  Selected: " + (selectedNodeId ? (allData.get(selectedNodeId).title || allData.get(selectedNodeId).label) : "None") +
      "  ·  Hovered: " + (hoveredNode ? (hoveredNode.data.title || hoveredNode.data.label) : "None");
  }

  function onPointerMove(event) {
    const rect = mount.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    if (draggedNode) {
      hasDragged = true;
      controls.enabled = false;
      raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()),
        draggedNode.position
      );
      const p = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, p)) {
        draggedNode.position.copy(p);
        draggedNode.velocity.set(0, 0, 0);
      }
    } else {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);
      const hit = intersects.length > 0 ? intersects[0].object.parent : null;
      if (hit !== hoveredNode) {
        hoveredNode = hit;
        updateDebug();
      }
      if (hoveredNode && opts.tooltipEl) {
        opts.tooltipEl.innerHTML = tooltipHTML(hoveredNode);
        opts.tooltipEl.style.display = "block";
        opts.tooltipEl.style.left = (event.clientX - rect.left + 15) + "px";
        opts.tooltipEl.style.top = (event.clientY - rect.top - 10) + "px";
      } else if (opts.tooltipEl) {
        opts.tooltipEl.style.display = "none";
      }
    }
  }

  function onPointerDown() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodesGroup.children, true);
    if (intersects.length > 0) draggedNode = intersects[0].object.parent;
  }

  function onPointerUp() {
    if (!hasDragged && draggedNode) {
      const id = draggedNode.nodeId;
      selectedNodeId = selectedNodeId === id ? null : id;
      updateDebug();
    }
    draggedNode = null;
    controls.enabled = true;
    setTimeout(() => { hasDragged = false; }, 50);
  }

  mount.addEventListener("pointermove", onPointerMove);
  mount.addEventListener("pointerdown", onPointerDown);
  mount.addEventListener("pointerup", onPointerUp);

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
  updateDebug();

  let animationFrameId = 0;
  let readyMarked = false;
  function animate(time) {
    animationFrameId = requestAnimationFrame(animate);
    graphNodes.forEach((nodeA) => {
      if (nodeA === draggedNode) return;
      const totalForce = new THREE.Vector3();
      graphNodes.forEach((nodeB) => {
        if (nodeA === nodeB) return;
        const direction = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
        const distanceSq = direction.lengthSq();
        if (distanceSq > 0.1) {
          const force = REPULSION_STRENGTH / distanceSq;
          totalForce.add(direction.normalize().multiplyScalar(force));
        }
      });
      graphEdges.forEach((edge) => {
        let otherNode;
        if (edge.sourceId === nodeA.nodeId) otherNode = graphNodes.find((n) => n.nodeId === edge.targetId);
        else if (edge.targetId === nodeA.nodeId) otherNode = graphNodes.find((n) => n.nodeId === edge.sourceId);
        if (otherNode) {
          const direction = new THREE.Vector3().subVectors(otherNode.position, nodeA.position);
          const displacement = direction.length() - IDEAL_EDGE_LENGTH;
          const force = SPRING_STRENGTH * displacement;
          totalForce.add(direction.normalize().multiplyScalar(force));
        }
      });
      nodeA.velocity.add(totalForce);
      nodeA.velocity.multiplyScalar(DAMPING);
      nodeA.position.add(nodeA.velocity);
    });

    graphEdges.forEach((edge) => {
      const source = graphNodes.find((n) => n.nodeId === edge.sourceId);
      const target = graphNodes.find((n) => n.nodeId === edge.targetId);
      if (source && target) {
        const distance = source.position.distanceTo(target.position);
        edge.mesh.scale.y = Math.max(0.001, distance);
        edge.mesh.position.copy(source.position).lerp(target.position, 0.5);
        edge.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(target.position, source.position).normalize());
      }
    });

    graphNodes.forEach((node) => {
      if (node.auraMesh) {
        const entropy = node.data.entropyLevel || 0;
        const pulseSpeed = 1.0 + entropy * 4.0;
        const pulseAmount = 1.0 + entropy * 0.2;
        const scale = 1 + Math.sin(time * 0.001 * pulseSpeed) * 0.1 * pulseAmount;
        node.auraMesh.scale.set(scale, scale, scale);
      }
      if (node.nodeType === "axiom") {
        const scale = 1 + Math.sin(time * 0.0005) * 0.05;
        node.coreMesh.scale.set(scale, scale, scale);
      }
      // Hover scale — manual lerp replacing the original GSAP tween.
      const target = node === hoveredNode ? 1.3 : 1;
      node.userData.hoverScale += (target - node.userData.hoverScale) * 0.2;
      node.scale.setScalar(node.userData.hoverScale);
    });

    controls.update();
    composer.render();
    if (!readyMarked) {
      readyMarked = true;
      const host = canvas.closest("[data-viz]");
      if (host) host.setAttribute("data-viz-ready", "true");
    }
  }
  animate(0);

  return {
    dispose() {
      cancelAnimationFrame(animationFrameId);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
    }
  };
}
