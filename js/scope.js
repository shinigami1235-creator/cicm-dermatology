/* The dermatoscope hero.
   The film behind the page is blurred and dim. The lens shows the same film sharp and magnified,
   with a magnified copy of the headline, clipped to a circle that drifts, can be dragged, and
   grows as the visitor scrolls into the page. */
(function () {
  "use strict";
  var hero = document.getElementById("scope");
  if (!hero || document.documentElement.dataset.hero !== "lens") return;
  var lens = document.getElementById("lens"), canvas = document.getElementById("lensCanvas"),
      clone = document.getElementById("lensClone"), head = document.getElementById("lensHead"),
      copy = document.getElementById("scopeCopy"), video = document.getElementById("heroVideo"),
      hint = document.getElementById("lensHint"), magLabel = document.getElementById("lensMag");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  video.preload = "auto"; video.load();
  var poster = new Image(); poster.src = video.getAttribute("poster");

  // magnified copy of the headline block, inert
  var c = copy.cloneNode(true);
  c.removeAttribute("id");
  c.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
  c.querySelectorAll("a, button").forEach(function (el) { el.setAttribute("tabindex", "-1"); });
  c.setAttribute("inert", "");
  clone.appendChild(c);

  // LED ring on the rim
  var leds = head.querySelector(".leds"), svgNS = "http://www.w3.org/2000/svg";
  for (var i = 0; i < 24; i++) {
    var a = (i / 24) * Math.PI * 2, d = document.createElementNS(svgNS, "circle");
    d.setAttribute("cx", (Math.cos(a) * 86.5).toFixed(2)); d.setAttribute("cy", (Math.sin(a) * 86.5).toFixed(2));
    d.setAttribute("r", "1.15"); d.setAttribute("opacity", (0.55 + 0.45 * ((i % 2) ? 0.5 : 1)).toFixed(2));
    leds.appendChild(d);
  }

  var W = 0, H = 0, dpr = 1;
  var x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, r = 0, m = 1.8, mT = 1.8;
  var mode = "drift", lastInput = -1e9, dragging = false, grab = { dx: 0, dy: 0 }, visible = true;

  function baseR() { return W >= 900 ? Math.max(130, Math.min(232, W * 0.135)) : Math.max(92, Math.min(150, W * 0.28)); }
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!x) { var p = home(0); x = tx = p[0]; y = ty = p[1]; }
  }
  // the resting path the lens wanders when nobody is steering it
  function home(t) {
    if (W >= 900) return [W * (0.66 + 0.15 * Math.sin(t * 0.21)), H * (0.4 + 0.13 * Math.sin(t * 0.29 + 1.1))];
    var top = titleTop(), R = baseR() * 1.08;
    var yMid = Math.max(R + 56, (56 + top) / 2), yAmp = Math.max(0, Math.min(H * 0.06, (top - R) - yMid));
    return [W * (0.6 + 0.18 * Math.sin(t * 0.23)), Math.min(top - R, yMid + yAmp * Math.sin(t * 0.31 + 0.6))];
  }
  function titleTop() {
    var t = copy.querySelector(".scope-title");
    return t.getBoundingClientRect().top - hero.getBoundingClientRect().top + window.scrollY * 0;
  }
  function clampXY(px, py) {
    var R = baseR() * 0.6;
    return [Math.max(R, Math.min(W - R, px)), Math.max(R + 40, Math.min(H - R, py))];
  }

  function cover(src) {
    var sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
    if (!sw || !sh) return null;
    var s = Math.max(W / sw, H / sh);
    return [(W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s];
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var src = (video.readyState >= 2) ? video : (poster.complete ? poster : null);
    if (!src) return;
    var box = cover(src); if (!box) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.clip();
    ctx.imageSmoothingQuality = "high";
    ctx.translate(x, y); ctx.scale(m, m); ctx.translate(-x, -y);
    if ("filter" in ctx) ctx.filter = "contrast(1.08) saturate(1.12)";
    ctx.drawImage(src, box[0], box[1], box[2], box[3]);
    ctx.restore();
  }
  function apply() {
    hero.style.setProperty("--lx", x.toFixed(1) + "px");
    hero.style.setProperty("--ly", y.toFixed(1) + "px");
    hero.style.setProperty("--lxp", x.toFixed(1) + "px");
    hero.style.setProperty("--lyp", y.toFixed(1) + "px");
    hero.style.setProperty("--lr", r.toFixed(1) + "px");
    hero.style.setProperty("--m", m.toFixed(3));
    window.__lensV = { x: vx, y: vy };
  }

  var last = performance.now();
  function frame(now) {
    if (!visible) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var t = now / 1000;
    if (!dragging && now - lastInput > 3500 && !reduce) mode = "drift";
    if (mode === "drift" && !reduce) { var h = home(t); tx = h[0]; ty = h[1]; }
    var p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, H)));
    var growth = reduce ? 0 : p * p;
    // spring towards the target
    if (reduce || dragging) { x = tx; y = ty; vx = vy = 0; }
    else {
      var k = mode === "drift" ? 6 : 60, damp = mode === "drift" ? 5 : 14;
      vx += ((tx - x) * k - vx * damp) * dt; x += vx * dt;
      vy += ((ty - y) * k - vy * damp) * dt; y += vy * dt;
    }
    m += (mT - m) * (reduce ? 1 : Math.min(1, dt * 9));
    r = baseR() * (1 + 2.4 * growth);
    // as it grows, pull the lens toward the middle so it fills the screen
    var gx = x + (W * 0.5 - x) * growth, gy = y + (H * 0.5 - y) * growth;
    var sx = x, sy = y; x = gx; y = gy;
    apply(); draw();
    x = sx; y = sy;
    requestAnimationFrame(frame);
  }

  // dragging
  function local(e) { var b = hero.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
  head.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var q = local(e);
    dragging = true; mode = "user"; lastInput = performance.now();
    grab.dx = x - q[0]; grab.dy = y - q[1];
    head.setPointerCapture(e.pointerId); head.classList.add("is-drag");
    hint.classList.add("is-gone");
    e.preventDefault();
  });
  head.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var q = local(e), c2 = clampXY(q[0] + grab.dx, q[1] + grab.dy);
    tx = c2[0]; ty = c2[1]; lastInput = performance.now();
  });
  function end() { dragging = false; head.classList.remove("is-drag"); lastInput = performance.now(); }
  head.addEventListener("pointerup", end);
  head.addEventListener("pointercancel", end);

  // tap or click on open film: the lens glides there
  hero.addEventListener("click", function (e) {
    if (e.target.closest("a, button, .scope-head, .scope-tools")) return;
    var q = local(e), c2 = clampXY(q[0], q[1]);
    tx = c2[0]; ty = c2[1]; mode = "user"; lastInput = performance.now();
    hint.classList.add("is-gone");
  });

  // keyboard
  head.addEventListener("keydown", function (e) {
    var step = e.shiftKey ? 80 : 24, dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step; else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step; else if (e.key === "ArrowDown") dy = step;
    else if (e.key === "+" || e.key === "=") setMag(40); else if (e.key === "-") setMag(10);
    else return;
    e.preventDefault();
    if (mode === "drift") { tx = x; ty = y; }
    var c2 = clampXY(tx + dx, ty + dy); tx = c2[0]; ty = c2[1];
    mode = "user"; lastInput = performance.now();
  });

  // magnification
  var magBtns = hero.querySelectorAll("[data-mag]");
  function setMag(v) {
    mT = v === 40 ? 3.4 : 1.8;
    magLabel.textContent = v + "×";
    magBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.mag === v)); });
  }
  magBtns.forEach(function (b) { b.addEventListener("click", function () { setMag(+b.dataset.mag); lastInput = performance.now(); }); });

  // only run while the hero is on screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(hero);
  }
  window.addEventListener("resize", function () { resize(); var c2 = clampXY(tx, ty); tx = c2[0]; ty = c2[1]; });
  resize();
  if (reduce) { var h0 = home(0); x = tx = h0[0]; y = ty = h0[1]; }
  requestAnimationFrame(frame);
})();
