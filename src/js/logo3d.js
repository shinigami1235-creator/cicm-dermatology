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

export async function buildEmblem(url = "assets/cicm-emblem.svg?v=3") {
  const text = await (await fetch(url)).text();
  const data = new SVGLoader().parse(text);
  const ring = new THREE.Box3(), pts = [];
  const parts = [];
  data.paths.forEach((path) => {
    const hex = "#" + path.color.getHexString(THREE.SRGBColorSpace);
    const cfg = PARTS[hex]; if (!cfg) return;
    const shapes = SVGLoader.createShapes(path);
    parts.push({ cfg, hex, shapes });
    shapes.forEach((s) => s.getPoints(4).forEach((p) => { pts.push(p); if (cfg.name === "Ring") ring.expandByPoint(new THREE.Vector3(p.x, p.y, 0)); }));
  });
  // centred on the ring of text, which is the circle the whole logo is drawn on
  const size = ring.getSize(new THREE.Vector3()), c = ring.getCenter(new THREE.Vector3());
  const k = 2 / size.y;   // the ring of text is 2 units across
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
