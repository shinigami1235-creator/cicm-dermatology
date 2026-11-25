/* The pinned opening on the home page: DERMA / TOLOGY. */
(function () {
  "use strict";
  var root = document.documentElement;
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

  /* ---------------- DERMA / TOLOGY ---------------- */
  function type() {
    var el = document.getElementById("typeHero"); if (!el) return;
    var stage = el.querySelector(".ty-stage"), top = el.querySelector(".ty-top span"), bot = el.querySelector(".ty-bot span"),
        panels = el.querySelectorAll(".ty-panel"), meta = el.querySelector(".ty-meta"), hint = el.querySelector(".ty-hint"),
        video = el.querySelector("video");
    ["webm", "mp4"].forEach(function (k) { var s = document.createElement("source"); s.src = video.dataset["src" + k[0].toUpperCase() + k.slice(1)]; s.type = "video/" + k; video.appendChild(s); });
    var fetched = false;
    var onScreen = false;
    function playFilm() { if (reduce || !onScreen) return; var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
    // load() resets the element, so play again once it is ready
    function fetchFilm() { if (fetched) return; fetched = true; video.preload = "auto"; video.addEventListener("canplay", playFilm, { once: true }); video.load(); }
    video.addEventListener("pause", function () { if (onScreen && !reduce && !document.hidden) setTimeout(playFilm, 200); });
    ["scroll", "pointerdown", "keydown", "touchstart"].forEach(function (ev) { window.addEventListener(ev, fetchFilm, { once: true, passive: true }); });
    window.addEventListener("load", fetchFilm);
    if (!reduce) new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen) playFilm(); else { video.pause(); if (hd) hd.pause(); }
    }).observe(stage);
    /* the small loop plays behind the words; once the words are done the full-size 1920 px film fades in over it */
    var hd = null, hdReady = false, hdOn = false, film = el.querySelector(".ty-film"), save = navigator.connection && navigator.connection.saveData;
    function loadHD() {
      if (hd || save || !video.dataset.srcHd) return;
      hd = document.createElement("video");
      hd.className = "ty-hd"; hd.muted = true; hd.loop = true; hd.playsInline = true; hd.setAttribute("aria-hidden", "true"); hd.preload = "auto";
      hd.src = video.dataset.srcHd;
      hd.addEventListener("canplaythrough", function () { hdReady = true; }, { once: true });
      film.appendChild(hd);
    }
    function showHD(on) {
      if (!hd || !hdReady || on === hdOn) return;
      hdOn = on;
      if (on) { try { hd.currentTime = video.currentTime % (hd.duration || 41.5); } catch (e) {} var pr = hd.play(); if (pr && pr.catch) pr.catch(function () {}); }
      film.classList.toggle("hd-on", on);
      if (!on) setTimeout(function () { if (!hdOn) hd.pause(); }, 700);
    }
    /* Thai reads ตจวิทยา as one word, so it stays on one line and the film opens below it */
    var one = lang === "th";
    if (one) { stage.classList.add("one"); el.querySelector(".ty-bot").hidden = true; }
    var navEl = document.getElementById("nav"), navH = 68;
    function fit() {
      navH = navEl ? navEl.offsetHeight : 68;
      top.style.letterSpacing = ""; top.style.marginRight = "";
      stage.style.setProperty("--tyfs", "100px");
      var avail = Math.min(window.innerWidth - 2 * Math.max(16, window.innerWidth * 0.04), 1500);
      var wb = (one ? top : bot).getBoundingClientRect().width, fs = 100 * avail / wb;
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
      // the header covers the top of the screen until it slides away; the words and the film open in the space below it
      var navV = navEl ? Math.max(0, Math.min(navH, navEl.getBoundingClientRect().bottom)) : 0, gc = navV / 2;
      var lh = lineTop.offsetHeight, o = ease(smooth(0.03, 0.18, p));
      var sMin = window.innerWidth >= 900 ? 0.5 : 0.82, sc = 1 - (1 - sMin) * o;
      var room = H - navV - 40 - 2 * lh * sc;
      var gap = Math.max(0, room) * o + smooth(0.92, 1, p) * H * 0.7;
      if (one) {
        var end = smooth(0.92, 1, p), mid = H / 2;
        var up = (mid - (navV + 16 + lh * sc / 2)) * o + end * H * 0.7;
        lineTop.style.transform = "translateY(" + (-up).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
        var under = mid - up + lh * sc / 2 + 12;
        var gt = (mid + (under - mid) * o) * (1 - end), gb = (mid - (mid - 40) * o) * (1 - end);
        stage.style.setProperty("--gt", Math.max(0, gt).toFixed(1) + "px");
        stage.style.setProperty("--gb", Math.max(0, gb).toFixed(1) + "px");
      } else {
      var dy = gap / 2 + lh * sc / 2 - lh / 2;
      lineTop.style.transform = "translateY(" + (gc - dy).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      lineBot.style.transform = "translateY(" + (gc + dy).toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      stage.style.setProperty("--gap", gap.toFixed(1) + "px");
      stage.style.setProperty("--gc", gc.toFixed(1) + "px");
      }
      panels.forEach(function (pn) { pn.classList.toggle("is-on", p >= +pn.dataset.from && p < +pn.dataset.to); });
      if (p > 0.3) loadHD();
      showHD(p >= 0.9);
      film.style.setProperty("--lift", smooth(0.9, 1, p).toFixed(3));
      meta.classList.toggle("is-gone", p > 0.05);
      hint.classList.toggle("is-gone", p > 0.03);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); render(); });
    window.addEventListener("resize", fit);
    fit(); onFrame(render);
    // follow the header while it slides in or out, so the words move with it
    var wasHidden = false;
    if (navEl && window.MutationObserver) new MutationObserver(function () {
      var h = navEl.classList.contains("is-hidden"); if (h === wasHidden) return; wasHidden = h;
      var t0 = performance.now();
      (function follow() { render(); if (performance.now() - t0 < 360) requestAnimationFrame(follow); })();
    }).observe(navEl, { attributes: true, attributeFilter: ["class"] });
    fillCounts();
  }

  function boot() { type(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
