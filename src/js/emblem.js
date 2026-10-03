/* The CICM emblem in 3D. Model built in Blender from the traced logo (assets/cicm-emblem.glb).
   Falls back to the still render when WebGL is missing or motion is reduced. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const stage = document.getElementById("stage");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

if (stage && !reduce && webglOK()) start();

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  const key = new THREE.DirectionalLight(0xfff1e6, 2.2); key.position.set(2.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9db8, 1.6); rim.position.set(-3.5, 1.5, -2); scene.add(rim);

  const pivot = new THREE.Group();
  scene.add(pivot);

  let model = null;
  new GLTFLoader().load("assets/cicm-emblem.glb", (gltf) => {
    model = gltf.scene;
    model.rotation.x = Math.PI / 2; // Blender lays the emblem flat; stand it up facing the camera
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.sub(c);
    model.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.envMapIntensity = o.material.metalness > 0.5 ? 1.15 : 0.55;
      }
    });
    pivot.add(model);
    pivot.scale.setScalar(0.001);
    stage.classList.add("has-3d");
    born = performance.now();
  }, undefined, () => { renderer.domElement.remove(); });

  function size() {
    const r = renderer.domElement.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(stage);
  size();

  // pointer follows with a damped spring, an idle sway keeps it alive on touch screens
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    target.y = (e.clientX / window.innerWidth - 0.5) * 0.9;
    target.x = (e.clientY / window.innerHeight - 0.5) * 0.5;
  }, { passive: true });

  let visible = true, born = 0, last = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(loop); } }).observe(stage);

  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function loop(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    const scroll = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    const sway = Math.sin(t * 0.45) * 0.16;
    const ty = target.y + sway + scroll * 1.1, tx = target.x + Math.sin(t * 0.31) * 0.05 - scroll * 0.25;
    // critically damped-ish spring
    const k = 26, d = 9;
    vel.x += ((tx - cur.x) * k - vel.x * d) * dt; cur.x += vel.x * dt;
    vel.y += ((ty - cur.y) * k - vel.y * d) * dt; cur.y += vel.y * dt;
    if (model) {
      const age = Math.min(1, (now - born) / 1400), e = ease(age);
      pivot.scale.setScalar(0.86 + 0.14 * e);
      pivot.rotation.set(cur.x, cur.y - (1 - e) * 1.2, 0);
      pivot.position.y = Math.sin(t * 0.8) * 0.03 + scroll * 0.25;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
