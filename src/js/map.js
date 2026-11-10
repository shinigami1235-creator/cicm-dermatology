/* Partner map: arcs from Bangkok to each partner, drawn like vessels branching out. */
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const mapEl = document.getElementById("map");
const listEl = document.getElementById("partners");
const stageEl = document.getElementById("pstage");
let arcByName = {};            // partner name -> arc element on the map
let selectPartner = () => {};   // set by renderList
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

  // the map lights the arc of the partner on show, and a pin opens that partner
  pins.forEach((p, i) => { arcByName[p.name] = arcs[i]; });
  mapEl.querySelectorAll(".pin").forEach((c) => {
    const p = pins[+c.dataset.i];
    if (!p || p.elective) return;
    c.addEventListener("click", () => selectPartner(partners.findIndex((q) => q.name === p.name), true));
  });
  selectPartner(-1);
}

/* Partner photos: the list shows every partner with its cover, and the stage beside the
   map shows the chosen partner's photos large, one at a time, with thumbnails below. */
function renderList(partners) {
  if (!listEl) return;
  const th = (window.CICM_LANG === "th");
  const T = (en, tx) => (th ? tx : en);
  listEl.innerHTML = partners.map((p, i) => {
    const n = p.photos.length;
    const meta = [p.mou ? T("MOU signed", "ลงนาม MOU") : "", n > 1 ? T(n + " photos", n + " ภาพ") : ""].filter(Boolean).join(" · ");
    return `<li class="pc"><button type="button" aria-pressed="false" data-i="${i}">
      <img src="photos/${esc(p.photos[0])}-sm.webp" alt="" loading="lazy" width="96" height="72">
      <span class="pc-text"><b>${esc(p.name)}</b>${p.place ? `<span>${esc(p.place)}</span>` : ""}${meta ? `<span class="pc-meta">${meta}</span>` : ""}</span></button>
      ${p.photos.map((ph) => `<a hidden data-zoom="partner-${i}" href="photos/${esc(ph)}.webp" data-caption="${esc(p.name)}${p.place ? " · " + esc(p.place) : ""}"></a>`).join("")}</li>`;
  }).join("");
  const rows = [...listEl.querySelectorAll(".pc > button")];
  if (!stageEl) {
    rows.forEach((b) => b.addEventListener("click", () => window.CICM && window.CICM.openZoom("partner-" + b.dataset.i, 0)));
    return;
  }

  stageEl.innerHTML = `<div class="ps-photo"><img class="ps-back" alt="" aria-hidden="true"><img class="ps-img" alt="">
      <button class="ps-open" type="button" aria-label="${T("Enlarge photo", "ขยายภาพ")}"></button>
      <button class="round ps-prev" type="button" aria-label="${T("Previous photo", "ภาพก่อนหน้า")}"><svg aria-hidden="true"><use href="#i-prev"/></svg></button>
      <button class="round ps-next" type="button" aria-label="${T("Next photo", "ภาพถัดไป")}"><svg aria-hidden="true"><use href="#i-next"/></svg></button></div>
    <figcaption class="ps-cap"><span class="ps-name"></span><span class="ps-place"></span><span class="ps-n tnum"></span></figcaption>
    <div class="ps-thumbs" role="group" aria-label="${T("Photos of this partner", "ภาพของสถาบันนี้")}"></div>`;
  const img = stageEl.querySelector(".ps-img"), back = stageEl.querySelector(".ps-back");
  const nameEl = stageEl.querySelector(".ps-name"), placeEl = stageEl.querySelector(".ps-place"), nEl = stageEl.querySelector(".ps-n");
  const thumbs = stageEl.querySelector(".ps-thumbs"), prev = stageEl.querySelector(".ps-prev"), next = stageEl.querySelector(".ps-next");
  let cur = 0, k = 0;

  function photo(j) {
    const p = partners[cur], n = p.photos.length;
    k = (j + n) % n;
    const src = `photos/${p.photos[k]}.webp`;
    img.classList.add("swap");
    const pre = new Image();
    pre.onload = () => { img.src = src; back.src = src; img.alt = p.name; img.classList.remove("swap"); };
    pre.src = src;
    nEl.textContent = n > 1 ? `${k + 1} / ${n}` : "";
    thumbs.querySelectorAll("button").forEach((t, x) => t.setAttribute("aria-current", String(x === k)));
  }
  selectPartner = (i, fromMap) => {
    if (i < 0) i = cur;
    cur = i;
    const p = partners[i], n = p.photos.length;
    rows.forEach((b, x) => b.setAttribute("aria-pressed", String(x === i)));
    Object.values(arcByName).forEach((a) => a.classList.remove("lit"));
    if (arcByName[p.name]) arcByName[p.name].classList.add("lit");
    nameEl.textContent = p.name;
    placeEl.textContent = [p.place, p.mou ? T("MOU signed", "ลงนาม MOU") : ""].filter(Boolean).join(" · ");
    thumbs.innerHTML = n > 1 ? p.photos.map((ph, x) => `<button type="button" aria-label="${T("Photo", "ภาพที่")} ${x + 1}"><img src="photos/${ph}-sm.webp" alt="" loading="lazy"></button>`).join("") : "";
    thumbs.querySelectorAll("button").forEach((t, x) => t.addEventListener("click", () => photo(x)));
    stageEl.classList.toggle("single", n < 2);
    photo(0);
    if (fromMap && window.innerWidth < 900) stageEl.scrollIntoView({ block: "nearest" });
  };
  rows.forEach((b) => {
    const i = +b.dataset.i;
    b.addEventListener("click", () => { selectPartner(i); if (window.innerWidth < 900) stageEl.scrollIntoView({ block: "nearest" }); });
    const hover = (v) => { const a = arcByName[partners[i].name]; if (a && i !== cur) a.classList.toggle("lit", v); };
    b.addEventListener("mouseenter", () => hover(true));
    b.addEventListener("mouseleave", () => hover(false));
  });
  prev.addEventListener("click", () => photo(k - 1));
  next.addEventListener("click", () => photo(k + 1));
  stageEl.querySelector(".ps-open").addEventListener("click", () => window.CICM && window.CICM.openZoom("partner-" + cur, k));
  let sx = null;
  stageEl.querySelector(".ps-photo").addEventListener("pointerdown", (e) => { sx = e.clientX; });
  stageEl.querySelector(".ps-photo").addEventListener("pointerup", (e) => {
    if (sx == null) return; const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) photo(k + (dx < 0 ? 1 : -1));
  });
  selectPartner(0);
}

main().catch((e) => console.error(e));
