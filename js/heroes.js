/* The two pinned openings: the microscope slide and DERMA / TOLOGY.
   Only the opening chosen in <html data-hero> runs. */
(function () {
  "use strict";
  var root = document.documentElement, which = root.dataset.hero;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = window.CICM_LANG || "en";
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function progress(el) {
    var top = el.getBoundingClientRect().top + window.scrollY;
    return clamp((window.scrollY - top) / Math.max(1, el.offsetHeight - window.innerHeight), 0, 1);
  }
  function onFrame(fn) {
    var tick = false;
    function req() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; fn(); }); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    fn();
  }
  function fillCounts() {
    if (!window.CICM) return;
    window.CICM.loadPapers().then(function (d) {
      var s = window.CICM.stats(d.papers);
      document.querySelectorAll('[data-count="papers"]').forEach(function (el) { el.textContent = s.n; });
      var line = lang === "th"
        ? "ตีพิมพ์ในวารสาร " + s.j + " ฉบับ รวมการทดลองแบบสุ่มมีกลุ่มควบคุม " + s.rct + " เรื่อง"
        : "Published in " + s.j + " journals, including " + s.rct + " randomized controlled trials.";
      document.querySelectorAll(".sl-research").forEach(function (el) { el.textContent = line; });
      var chart = document.querySelector(".sl-chart");
      if (chart) chart.innerHTML = miniChart(d.papers);
    });
  }
  function miniChart(papers) {
    var all = {}, rct = {}, y0 = 2011, y1 = 2026, max = 0;
    papers.forEach(function (p) { all[p.year] = (all[p.year] || 0) + 1; if (/Randomized|Clinical Trial/.test(p.design)) rct[p.year] = (rct[p.year] || 0) + 1; });
    for (var y = y0; y <= y1; y++) max = Math.max(max, all[y] || 0);
    var W = 200, H = 120, bw = W / (y1 - y0 + 1), s = '<svg viewBox="0 -14 ' + W + " " + (H + 30) + '">';
    s += '<text class="cap" x="0" y="-4">' + (lang === "th" ? "บทความต่อปี" : "Papers per year") + "</text>";
    for (y = y0; y <= y1; y++) {
      var i = y - y0, n = all[y] || 0, r = rct[y] || 0, h = n / max * H, hr = r / max * H;
      s += '<rect class="bar" x="' + (i * bw + 1.2) + '" y="' + (H - h) + '" width="' + (bw - 2.4) + '" height="' + h + '" rx="1"/>';
      if (r) s += '<rect class="bar rct" x="' + (i * bw + 1.2) + '" y="' + (H - hr) + '" width="' + (bw - 2.4) + '" height="' + hr + '" rx="1"/>';
    }
    s += '<text class="axis" x="0" y="' + (H + 11) + '">2011</text><text class="axis" x="' + W + '" y="' + (H + 11) + '" text-anchor="end">2026</text>';
    s += '<text class="axis" x="0" y="' + (H + 24) + '">' + (lang === "th" ? "สีเข้ม: การทดลองทางคลินิก" : "Dark: clinical trials") + "</text></svg>";
    return s;
  }

  /* ---------------- microscope slide ---------------- */
  function slide() {
    var el = document.getElementById("slideHero"); if (!el) return;
    var view = el.querySelector(".sl-view"), world = el.querySelector(".sl-world"), sl = el.querySelector(".sl-slide"),
        tissue = el.querySelector(".sl-tissue"), field = el.querySelector(".sl-field"),
        panels = el.querySelectorAll(".sl-panel"), turret = el.querySelectorAll(".sl-turret button"),
        photo = el.querySelector(".sl-photo"), chart = el.querySelector(".sl-chart");
    var STEPS = [0, 0.2, 0.48, 0.74], step = -1;
    // three photos cycle inside the field at 40x
    var shots = ["photos/fruit-lab-my-batch-2.webp", "photos/workshop-5.webp", "photos/lab-work.webp", "photos/workshop-4.webp"];
    var photos = [photo];
    shots.slice(1).forEach(function (src) { var im = photo.cloneNode(); im.src = src; field.insertBefore(im, chart); photos.push(im); });
    var pi = 0, timer = null;
    function cycle(on) {
      clearInterval(timer);
      photos.forEach(function (im, k) { im.classList.toggle("is-on", on && k === pi); });
      if (on && !reduce) timer = setInterval(function () { pi = (pi + 1) % photos.length; photos.forEach(function (im, k) { im.classList.toggle("is-on", k === pi); }); }, 2600);
    }
    function setStep(s) {
      if (s === step) return; step = s;
      panels.forEach(function (p) { p.classList.toggle("is-on", +p.dataset.step === s); });
      turret.forEach(function (b) { b.setAttribute("aria-current", String(+b.dataset.go === s)); });
      cycle(s === 2);
      chart.classList.toggle("is-on", s === 3);
    }
    turret.forEach(function (b) {
      b.addEventListener("click", function () {
        var top = el.getBoundingClientRect().top + window.scrollY, span = el.offsetHeight - window.innerHeight;
        var target = [0, 0.3, 0.6, 0.86][+b.dataset.go];
        window.scrollTo({ top: top + span * target + (b.dataset.go === "0" ? 0 : 2), behavior: reduce ? "auto" : "smooth" });
      });
    });
    function render() {
      var p = progress(el);
      var s = p >= STEPS[3] ? 3 : p >= STEPS[2] ? 2 : p >= STEPS[1] ? 1 : 0;
      setStep(s);
      var V = view.clientWidth, Vh = view.clientHeight;
      var b = ease(smooth(0.02, 0.2, p));              // zoom into the tissue
      var b2 = smooth(0.2, 0.48, p);                   // slow pan across it at 10x
      var zf = 4.2, z = 1 + (zf - 1) * b + 1.2 * b2;
      var fx = 0.64 - 0.1 * b2, fy = 0.3 + 0.1 * b2;
      var u = tissue.offsetLeft + tissue.offsetWidth * fx, v = tissue.offsetTop + tissue.offsetHeight * fy;
      var x0 = sl.offsetLeft, y0 = sl.offsetTop;
      var tx = (x0 + u) + (V / 2 - (x0 + u)) * b - x0 - u * z;
      var ty = (y0 + v) + (Vh / 2 - (y0 + v)) * b - y0 - v * z;
      var rot = (1 - b) * -4;
      sl.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + z.toFixed(3) + ")";
      world.style.transform = "rotate(" + rot.toFixed(2) + "deg)";
      var f = smooth(0.06, 0.2, p);
      view.style.setProperty("--fov", (72 - 22 * f).toFixed(1) + "%");
      view.style.setProperty("--ret", f.toFixed(3));
      field.style.opacity = smooth(0.44, 0.5, p).toFixed(3);
    }
    onFrame(render);
    fillCounts();
  }

  /* ---------------- DERMA / TOLOGY ---------------- */
  function type() {
    var el = document.getElementById("typeHero"); if (!el) return;
    var stage = el.querySelector(".ty-stage"), top = el.querySelector(".ty-top span"), bot = el.querySelector(".ty-bot span"),
        panels = el.querySelectorAll(".ty-panel"), meta = el.querySelector(".ty-meta"), hint = el.querySelector(".ty-hint"),
        video = el.querySelector("video");
    ["webm", "mp4"].forEach(function (k) { var s = document.createElement("source"); s.src = video.dataset["src" + k[0].toUpperCase() + k.slice(1)]; s.type = "video/" + k; video.appendChild(s); });
    video.preload = "auto"; video.load();
    if (!reduce) new IntersectionObserver(function (es) { var pr = es[0].isIntersecting ? video.play() : (video.pause(), null); if (pr && pr.catch) pr.catch(function () {}); }).observe(stage);
    function fit() {
      top.style.letterSpacing = ""; top.style.marginRight = "";
      stage.style.setProperty("--tyfs", "100px");
      var avail = Math.min(window.innerWidth - 2 * Math.max(16, window.innerWidth * 0.04), 1500);
      var wb = bot.getBoundingClientRect().width, fs = 100 * avail / wb;
      fs = Math.min(fs, window.innerHeight * 0.36);
      stage.style.setProperty("--tyfs", fs.toFixed(1) + "px");
      if (lang !== "th") {
        var wt = top.getBoundingClientRect().width, wbb = bot.getBoundingClientRect().width;
        var n = top.textContent.length, ls = (wbb - wt) / n;
        top.style.letterSpacing = ls.toFixed(2) + "px"; top.style.marginRight = (-ls).toFixed(2) + "px";
      }
    }
    var lineTop = el.querySelector(".ty-top"), lineBot = el.querySelector(".ty-bot");
    function render() {
      var p = progress(el), H = window.innerHeight;
      var lh = lineTop.offsetHeight, o = ease(smooth(0.03, 0.18, p));
      var sMin = window.innerWidth >= 900 ? 0.5 : 0.82, sc = 1 - (1 - sMin) * o;
      var room = H - 68 - 40 - 2 * lh * sc;
      var gap = Math.max(0, room) * o + smooth(0.92, 1, p) * H * 0.7;
      var dy = gap / 2 + lh * sc / 2 - lh / 2;
      lineTop.style.transform = "translateY(" + (-dy).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      lineBot.style.transform = "translateY(" + dy.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      stage.style.setProperty("--gap", gap.toFixed(1) + "px");
      panels.forEach(function (pn) { pn.classList.toggle("is-on", p >= +pn.dataset.from && p < +pn.dataset.to); });
      meta.classList.toggle("is-gone", p > 0.05);
      hint.classList.toggle("is-gone", p > 0.03);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); render(); });
    window.addEventListener("resize", fit);
    fit(); onFrame(render);
    fillCounts();
  }

  function boot() { if (which === "slide") slide(); else if (which === "type") type(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
