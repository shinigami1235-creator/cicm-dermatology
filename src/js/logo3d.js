/* The CICM emblem in 3D, built in the browser from the official logo file (assets/cicm-emblem.svg).
   Every shape and colour comes from that file unchanged: the grey tower, the red, yellow and orange arrows
   and the green "Chulabhorn International College of Medicine" ring. Front faces use the logo colours flat,
   so they read exactly as printed; only the extruded sides take light, for depth. */
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

// logo colour -> part name, depth and stacking, front to back: orange, yellow, red, tower, ring text
const PARTS = {
  "#b1afb1": { name: "Tower",  z: 0.000, depth: 0.050 },
  "#ec1c24": { name: "Red",    z: 0.045, depth: 0.050 },
  "#fbe40b": { name: "Yellow", z: 0.080, depth: 0.050 },
  "#f67b1e": { name: "Arrow",  z: 0.115, depth: 0.055 },
  "#1b7a3a": { name: "Ring",   z: 0.000, depth: 0.030 },
};

export async function buildEmblem(url = "assets/cicm-emblem.svg?v=4") {
  const text = await (await fetch(url)).text();
  const data = new SVGLoader().parse(text);
  const pts = [], ringIdx = [];
  const parts = [];
  data.paths.forEach((path) => {
    const hex = "#" + path.color.getHexString(THREE.SRGBColorSpace);
    const cfg = PARTS[hex]; if (!cfg) return;
    const shapes = SVGLoader.createShapes(path);
    parts.push({ cfg, hex, shapes });
    shapes.forEach((s) => s.getPoints(4).forEach((p) => { pts.push(p); ringIdx.push(cfg.name === "Ring"); }));
  });
  // the ring of text leaves a gap at the top for the arrow, so its box is not square;
  // a least-squares circle through the letters gives the true centre the logo is drawn on
  const rp = pts.filter((p, i) => ringIdx[i]);
  const c = fitCircle(rp);
  let rMax = 0; rp.forEach((p) => { rMax = Math.max(rMax, Math.hypot(p.x - c.x, p.y - c.y)); });
  const k = 1 / rMax;   // the outer edge of the ring text sits at radius 1
  let reach = 0; pts.forEach((p) => { reach = Math.max(reach, Math.hypot(p.x - c.x, p.y - c.y) * k); });

  const root = new THREE.Group(); root.name = "CICM_Emblem";
  root.userData.reach = reach;   // distance from the centre to the farthest point (the arrow tip)
  parts.forEach(({ cfg, hex, shapes }) => {
    const depth = cfg.depth / k, bevel = Math.min(cfg.depth * 0.25, 0.012) / k;
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 2, curveSegments: 10 });
    geo.translate(-c.x, -c.y, 0);
    geo.scale(k, -k, k);            // SVG y points down
    geo.computeVertexNormals();
    const col = new THREE.Color(hex);
    const face = new THREE.MeshBasicMaterial({ color: col, toneMapped: false, side: THREE.DoubleSide });
    const side = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.72), roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, [face, side]);
    mesh.name = cfg.name;
    mesh.position.z = cfg.z;
    root.add(mesh);
  });
  return root;
}

// Kasa circle fit: solves x^2 + y^2 + Dx + Ey + F = 0 in the least-squares sense
function fitCircle(p) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  const n = p.length;
  p.forEach(({ x, y }) => { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; });
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [-sxz, -syz, -sz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A), col = (i) => A.map((r, j) => r.map((v, k) => (k === i ? b[j] : v)));
  const D = det(col(0)) / d, E = det(col(1)) / d;
  return { x: -D / 2, y: -E / 2 };
}
