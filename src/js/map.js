/* Partner map: arcs from Bangkok to each partner, drawn like vessels branching out. */
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const mapEl = document.getElementById("map");
const listEl = document.getElementById("partners");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const HOME = { name: "Bangkok", lon: 100.52, lat: 13.75 };
const LABELS = [
  { t: "Bangkok", lon: 100.52, lat: 13.75, dx: -8, dy: 18, a: "end" },
  { t: "Japan", lon: 139.5, lat: 35.0, dx: 0, dy: 26, a: "middle" },
  { t: "South Korea", lon: 127.0, lat: 37.55, dx: -10, dy: -10, a: "end" },
  { t: "Netherlands", lon: 4.47, lat: 51.91, dx: -10, dy: -8, a: "end" },
  { t: "Switzerland", lon: 7.45, lat: 46.95, dx: 10, dy: 14, a: "start" },
  { t: "Miami, USA", lon: -80.19, lat: 25.76, dx: 10, dy: 16, a: "start" }
];

async function main() {
  const [content, topo] = await Promise.all([
    fetch("data/content.json").then((r) => r.json()),
    fetch("data/land-110m.json").then((r) => r.json()).catch(() => null)
  ]);
  const partners = content.partners;
  renderList(partners);
  if (!topo || !mapEl) return;

  const W = 1000, H = 520;
  const pins = partners.filter((p) => p.lon != null).concat([{ name: "Elective studies", place: "Switzerland", lon: 7.45, lat: 46.95, elective: true }]);
  const proj = geoNaturalEarth1().rotate([-25, 0]).fitExtent([[40, 40], [W - 40, H - 30]], {
    type: "MultiPoint", coordinates: pins.map((p) => [p.lon, p.lat]).concat([[HOME.lon, HOME.lat], [-88, 12], [148, 56]])
  });
  const path = geoPath(proj);
  const land = feature(topo, topo.objects.land);
  const [hx, hy] = proj([HOME.lon, HOME.lat]);

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="overflow:hidden" aria-hidden="true"><path class="land" d="${path(land)}"/>`;
  pins.forEach((p, i) => {
    const [x, y] = proj([p.lon, p.lat]);
    const mx = (hx + x) / 2, my = (hy + y) / 2, dist = Math.hypot(x - hx, y - hy);
    const cx = mx, cy = my - dist * 0.32;
    svg += `<path class="arc" data-i="${i}" d="M${hx.toFixed(1)},${hy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}"/>`;
    svg += `<circle class="pin" data-i="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/>`;
  });
  svg += `<circle class="home" cx="${hx}" cy="${hy}" r="6"/><circle class="home" cx="${hx}" cy="${hy}" r="6" opacity="0.4"><animate attributeName="r" values="6;18;6" dur="3.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0;0.45" dur="3.2s" repeatCount="indefinite"/></circle>`;
  LABELS.forEach((l) => { const [x, y] = proj([l.lon, l.lat]); svg += `<text class="pin-label" x="${(x + l.dx).toFixed(1)}" y="${(y + l.dy).toFixed(1)}" text-anchor="${l.a}">${l.t}</text>`; });
  svg += "</svg>";
  if (reduce) svg = svg.replace(/<animate[^>]*>/g, "");
  mapEl.innerHTML = svg;

  const arcs = [...mapEl.querySelectorAll(".arc")];
  arcs.forEach((a) => { const L = a.getTotalLength(); a.style.strokeDasharray = L; a.style.strokeDashoffset = reduce ? 0 : L; });
  if (!reduce) {
    const draw = () => {
      if (mapEl.getBoundingClientRect().top > window.innerHeight * 0.75) return;
      window.removeEventListener("scroll", draw);
      arcs.forEach((a, i) => {
        a.animate([{ strokeDashoffset: a.style.strokeDashoffset }, { strokeDashoffset: 0 }], { duration: 1500, delay: i * 140, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
      });
    };
    window.addEventListener("scroll", draw, { passive: true });
    draw();
  }

  // link list rows to arcs
  const rows = [...listEl.querySelectorAll("button")];
  rows.forEach((b) => {
    const name = b.dataset.name;
    const i = pins.findIndex((p) => p.name === name);
    const on = (v) => { if (i < 0) return; arcs[i].classList.toggle("lit", v); b.setAttribute("aria-pressed", String(v)); };
    b.addEventListener("mouseenter", () => on(true));
    b.addEventListener("mouseleave", () => on(false));
    b.addEventListener("focus", () => on(true));
    b.addEventListener("blur", () => on(false));
    b.addEventListener("click", () => on(b.getAttribute("aria-pressed") !== "true"));
  });
}

function renderList(partners) {
  if (!listEl) return;
  listEl.innerHTML = partners.map((p) => `<li><button type="button" aria-pressed="false" data-name="${esc(p.name)}">
    <img src="${esc(p.photo)}-sm.webp" alt="" loading="lazy" width="54" height="54">
    <span><b>${esc(p.name)}</b>${p.place ? `<span>${esc(p.place)}</span>` : ""}</span></button></li>`).join("");
}

main().catch((e) => console.error(e));
