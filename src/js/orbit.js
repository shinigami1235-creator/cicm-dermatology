/* Faculty orbit on the home page. The CICM emblem sits in the middle; when the section comes into view its
   red, yellow and orange arrows spin into place, then the lecturers fly out into two rings: the permanent
   lecturers on the inner ring, the visiting lecturers on the outer ring. Hover shows a name, a click opens
   the profile (the deck card or the visiting dialog), a drag spins the rings.
   The deck and tiles below carry the same content, so the orbit is hidden without WebGL or with reduced motion. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const box = document.getElementById("orbit");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TH = document.documentElement.lang === "th" || /[?&]lang=th/.test(location.search);

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

if (box) {
  if (reduce || !webglOK()) box.classList.add("off");
  else if (window.CICM && window.CICM.people) start(window.CICM.people);
  else window.addEventListener("cicm:people", () => start(window.CICM.people), { once: true });
}

const R_IN = 2.5, R_OUT = 3.95, S_IN = 0.9, S_OUT = 0.74, LIFT = 0.55, TILT = 0.3;
const RING_IN = "#f67b1e", RING_OUT = "#fbe40b";
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function portrait(src, ring, inner) {
  // a round badge: logo-colour disc, the photo cropped to head and shoulders, a white rim
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  function draw(img) {
    g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); g.closePath();
    g.fillStyle = ring; g.fill(); g.clip();
    if (img) {
      // tall cut-outs (deck portraits) keep the head in the top third; busts are already framed
      const w = img.naturalWidth, h = img.naturalHeight, tall = h / w > 1.3;
      const side = tall ? w * 0.74 : w * 0.92, sx = (w - side) / 2, sy = tall ? h * 0.01 : h * 0.03;
      g.drawImage(img, sx, sy, side, side, 10, 18, S - 20, S - 20);
    }
    g.restore();
    g.lineWidth = inner ? 9 : 7; g.strokeStyle = "#ffffff";
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); g.stroke();
    tex.needsUpdate = true;
  }
  draw(null);
  const img = new Image(); img.decoding = "async"; img.onload = () => draw(img); img.src = src;
  return tex;
}

function start(people) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  box.prepend(renderer.domElement);
  const tag = document.getElementById("orbitTag");

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(2.2, 0.8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe08a, 0.9); rim.position.set(-3.5, 1.5, -2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // emblem
  const root = new THREE.Group(); scene.add(root);
  const spinners = [];   // { group, from, delay }
  let ready = false;
  new GLTFLoader().load("assets/cicm-emblem.glb", (gltf) => {
    const model = gltf.scene;
    model.rotation.x = Math.PI / 2;
    model.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(model), size = b.getSize(new THREE.Vector3());
    model.position.sub(b.getCenter(new THREE.Vector3()));
    const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(2.3 / size.y);
    root.add(holder);
    // the logo is printed on white; a cream disc behind it keeps the red arrow visible on the red section
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.62, 96), new THREE.MeshBasicMaterial({ color: 0xfde9d7, toneMapped: false }));
    disc.position.z = -0.35; root.add(disc);
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const m = o.material;
      if (m.metalness > 0.5) { m.color.set(0x9a989b); m.metalness = 0.35; m.roughness = 0.55; m.envMapIntensity = 0.6; }
      else { m.envMapIntensity = 0.2; m.roughness = Math.max(m.roughness, 0.6); }
    });
    root.updateMatrixWorld(true);
    // each arrow gets its own pivot at the emblem centre so it can spin round the tower
    [["Red", 0], ["Yellow", 0.1], ["Arrow", 0.2]].forEach(([name, delay], k) => {
      const part = model.getObjectByName(name); if (!part) return;
      const pivot = new THREE.Group(); root.add(pivot);
      pivot.attach(part);
      spinners.push({ group: pivot, from: Math.PI * 2 + 0.9 + k * 0.8, delay });
    });
    ready = true;
  });

  // rings
  const ringIn = new THREE.Group(), ringOut = new THREE.Group();
  ringIn.rotation.z = 0.1; ringOut.rotation.z = -0.07;
  const spinIn = new THREE.Group(), spinOut = new THREE.Group();
  ringIn.add(spinIn); ringOut.add(spinOut); scene.add(ringIn, ringOut);
  const sprites = [];
  function place(list, group, R, S, color, inner) {
    list.forEach((p, i) => {
      const a = (i / list.length) * Math.PI * 2;
      const mat = new THREE.SpriteMaterial({ map: portrait(p.photo, color, inner), transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.userData = { p, a, R, S, inner, order: sprites.length, hover: 0 };
      s.scale.setScalar(0.001);
      group.add(s); sprites.push(s);
    });
  }
  place(people.faculty, spinIn, R_IN, S_IN, RING_IN, true);
  place(people.visiting, spinOut, R_OUT, S_OUT, RING_OUT, false);

  let SK = 1, tilt = TILT;
  // camera fits the outer ring to the box width, and the emblem plus rings to its height
  function size() {
    const w = Math.max(1, box.clientWidth), h = Math.max(1, box.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    SK = camera.aspect < 1.1 ? 1.4 : 1;   // phones: the rings are width-bound, so the faces get bigger
    tilt = camera.aspect < 1.1 ? 0.8 : TILT;   // and a steeper view opens the rings up to fill the height
    // move back until the top of the disc, the front portrait and the side portraits all fit, then centre them
    const pts = [new THREE.Vector3(0, LIFT + 1.7, 0), new THREE.Vector3(0, -S_OUT * 0.55, R_OUT), new THREE.Vector3(R_OUT + S_OUT * 0.5, 0, 0), new THREE.Vector3(-R_OUT - S_OUT * 0.5, 0, 0)];
    const p = new THREE.Vector3();
    let mid = LIFT * 0.6, d = 6;
    function aim() { camera.position.set(0, mid + d * tilt, d); camera.lookAt(0, mid, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix(); }
    function bounds() { let x = 0, y0 = 1e9, y1 = -1e9; pts.forEach((q) => { p.copy(q).project(camera); x = Math.max(x, Math.abs(p.x)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); return { x, y0, y1 }; }
    for (let pass = 0; pass < 4; pass++) {
      for (d = 5; d < 60; d += 0.1) { aim(); const bb = bounds(); if (bb.x < 0.95 && bb.y1 - bb.y0 < 1.86 && bb.y1 < 0.97 && bb.y0 > -0.97) break; }
      const bb = bounds(), shift = (bb.y1 + bb.y0) / 2;
      mid += shift * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.9;
    }
    aim();
  }
  new ResizeObserver(size).observe(box); size();

  // pointer: hover, click and drag
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let hot = null, drag = null, spinV = 0, angIn = 0, angOut = 0, pointer = { x: 0, y: 0 };
  const canvas = renderer.domElement;
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointer = { x: ndc.x, y: ndc.y };
    if (drag) { const dx = e.clientX - drag.x; drag.moved = drag.moved || Math.abs(dx) > 6; spinV = dx * 0.006; drag.x = e.clientX; }
  });
  canvas.addEventListener("pointerleave", () => { ndc.set(-9, -9); });
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, moved: false }; });
  window.addEventListener("pointerup", () => {
    if (drag && !drag.moved && hot) {
      const p = hot.userData.p;
      if (hot.userData.inner) window.CICM.facultyTo(p.id); else window.CICM.visitingOpen(p.id);
    }
    drag = null;
  });
  canvas.addEventListener("pointerdown", (e) => {
    // touch has no hover: pick on press so a tap opens the profile
    if (e.pointerType !== "mouse") { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); pick(); }
  });
  function pick() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(sprites, false).filter((h) => h.object.material.opacity > 0.5)[0];
    hot = hit ? hit.object : null;
  }

  // run only on screen; the intro starts the first time a good part of the box is visible
  let visible = false, t0 = null, last = performance.now();
  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && t0 === null && es[0].intersectionRatio > 0.3) t0 = performance.now();
    if (visible) { last = performance.now(); requestAnimationFrame(loop); }
  }, { threshold: [0, 0.3, 0.6] }).observe(box);

  const v = new THREE.Vector3(), sway = { x: 0, y: 0 };
  function loop(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = t0 === null ? 0 : (now - t0) / 1000;

    if (ready) spinners.forEach((s) => { s.group.rotation.z = -s.from * (1 - easeOut(clamp01((t - s.delay) / 2.0))); });
    sway.x += ((pointer.y * 0.18 + Math.sin(now / 2400) * 0.04) - sway.x) * 0.05;
    sway.y += ((pointer.x * 0.35 + Math.sin(now / 3100) * 0.12) - sway.y) * 0.05;
    root.rotation.set(-sway.x - Math.atan(tilt) * 0.9, sway.y, 0);   // face the camera even when it looks down
    root.position.y = LIFT + Math.sin(now / 1300) * 0.04;

    if (!drag) pick();
    const slow = hot ? 0 : 1;
    if (!drag) spinV *= 0.94;
    angIn += (0.12 * slow) * dt + spinV; angOut += (-0.07 * slow) * dt + spinV * 0.7;
    spinIn.rotation.y = angIn; spinOut.rotation.y = angOut;

    sprites.forEach((s) => {
      const u = s.userData;
      const k = easeBack(clamp01((t - 1.3 - u.order * 0.045) / 0.9));
      const r = u.R * Math.min(1, k);
      s.position.set(Math.cos(u.a) * r, 0, Math.sin(u.a) * r);
      u.hover += ((s === hot ? 1 : 0) - u.hover) * 0.2;
      s.getWorldPosition(v);
      const front = clamp01((v.z + u.R) / (2 * u.R));          // 0 at the back of the ring, 1 at the front
      s.scale.setScalar(Math.max(0.001, u.S * SK * Math.max(0, k) * (0.78 + 0.22 * front) * (1 + 0.28 * u.hover)));
      s.material.opacity = clamp01(k) * (0.5 + 0.5 * front);
      s.material.color.setScalar(0.72 + 0.28 * front);
      s.renderOrder = Math.round(front * 100);
    });

    box.classList.toggle("is-hot", !!hot);
    if (hot) {
      hot.getWorldPosition(v); v.y += hot.scale.y * 0.5; v.project(camera);
      tag.style.left = ((v.x + 1) / 2) * box.clientWidth + "px";
      tag.style.top = ((1 - v.y) / 2) * box.clientHeight + "px";
      const p = hot.userData.p;
      if (tag.dataset.id !== p.id) {
        tag.dataset.id = p.id;
        tag.querySelector("b").textContent = p.name;
        tag.querySelector("span").textContent = hot.userData.inner ? (TH ? "อาจารย์ประจำ" : "Permanent lecturer") : (TH ? "อาจารย์พิเศษ · " : "Visiting lecturer · ") + p.place;
      }
      tag.classList.add("on");
    } else tag.classList.remove("on");

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
}
