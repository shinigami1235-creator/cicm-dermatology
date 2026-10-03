/* Faculty on the home page. Three layouts, picked by <html data-staff>:
   spotlight: one lecturer at a time, large, with a list of names
   masthead:  an editorial list of names; hover shows the portrait, a click opens the profile
   deck:      a stack of cards you swipe through */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, P = window.pick, esc = C.esc;
  var stage = document.getElementById("staffStage"); if (!stage) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = window.CICM_LANG, which = document.documentElement.dataset.staff || "spotlight";
  var COLORS = ["#f2c4ae", "#f39bc0", "#fbefc0", "#cdb7e0", "#f9d93d", "#a8d8b9"];

  function cut(f) { return "people/" + f.id + "-cut.webp"; }
  function who(f) { return [f.title, f.post].filter(Boolean).join(" · "); }
  function eduList(f) { return '<ul class="st-edu">' + f.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>"; }
  function chips(f) { return f.expertise.length ? '<ul class="chips">' + f.expertise.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : ""; }
  function achList(f, ach) {
    var a = ach.filter(function (x) { return x.faculty === f.id; });
    if (!a.length) return "";
    return "<h4>" + T("ui.ach", "Achievements") + '</h4><ul class="st-edu">' + a.slice(0, 4).map(function (x) { return "<li><b>" + esc(x.year) + "</b> " + esc(P(x.text)) + "</li>"; }).join("") + "</ul>";
  }
  function details(f, n, ach) {
    return '<div class="st-who">' + esc(who(f)) + "</div>" +
      '<div class="st-cols"><div><h4>' + T("ui.edu", "Education") + "</h4>" + eduList(f) + "</div>" +
      "<div>" + (f.expertise.length ? "<h4>" + T("ui.exp", "Expertise") + "</h4>" + chips(f) : "") + achList(f, ach) +
      (n ? '<p class="st-papers"><a href="research.html?lecturer=' + encodeURIComponent(f.pubmed) + '"><b>' + n + "</b> " + (lang === "th" ? "บทความใน PubMed" : "papers in PubMed") + "</a></p>" : "") +
      "</div></div>";
  }

  Promise.all([C.loadContent(), C.loadPapers()]).then(function (r) {
    var c = r[0], papers = r[1].papers, cnt = {};
    papers.forEach(function (p) { p.faculty.forEach(function (k) { cnt[k] = (cnt[k] || 0) + 1; }); });
    var fac = c.faculty.map(function (f, i) { return Object.assign({}, f, { color: COLORS[i % COLORS.length], n: f.pubmed ? cnt[f.pubmed] || 0 : 0 }); });
    var ach = c.achievements || [];
    stage.dataset.layout = which;
    if (which === "masthead") masthead(fac, ach); else if (which === "deck") deck(fac, ach); else spotlight(fac, ach);
    officers(c.staff);
  });

  /* ---------- spotlight ---------- */
  function spotlight(fac, ach) {
    stage.innerHTML = '<div class="sp">' +
      '<div class="sp-names" role="tablist" aria-label="' + T("faculty.title", "The faculty") + '">' +
      fac.map(function (f, i) {
        return '<button role="tab" type="button" id="sp-t' + i + '" aria-controls="sp-panel" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" style="--c:' + f.color + '">' +
          "<b>" + esc(f.name) + "</b><span>" + esc(who(f)) + "</span><i></i></button>";
      }).join("") + "</div>" +
      '<div class="sp-arch" aria-hidden="true"><div class="sp-fill"></div><img alt="" src="' + cut(fac[0]) + '"></div>' +
      '<div class="sp-info" id="sp-panel" role="tabpanel" aria-live="polite"></div>' +
      '<button class="sp-pause round" type="button" aria-label="' + T("ui.pause", "Pause rotation") + '"><svg aria-hidden="true"><use href="#i-pause"/></svg></button></div>';
    var tabs = stage.querySelectorAll(".sp-names button"), fill = stage.querySelector(".sp-fill"), img = stage.querySelector(".sp-arch img"),
        info = stage.querySelector(".sp-info"), root = stage.querySelector(".sp"), pause = stage.querySelector(".sp-pause");
    var i = 0, timer = null, DUR = 9000, paused = reduce, hold = false;
    root.style.setProperty("--dur", DUR + "ms");
    function render(k, first) {
      i = (k + fac.length) % fac.length; var f = fac[i];
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", String(j === i)); t.tabIndex = j === i ? 0 : -1; var bar = t.querySelector("i"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; });
      fill.style.background = f.color;
      var html = "<h3>" + esc(f.name) + "</h3>" + details(f, f.n, ach);
      if (first || reduce) { img.src = cut(f); info.innerHTML = html; return; }
      img.classList.add("out"); info.classList.add("out");
      setTimeout(function () { img.src = cut(f); info.innerHTML = html; img.classList.remove("out"); info.classList.remove("out"); }, 280);
      // keep the active name visible in the scrolling row on phones
      var t = tabs[i]; if (t.scrollIntoView && window.innerWidth < 900) t.parentNode.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" });
    }
    function schedule() { clearTimeout(timer); if (!paused && !hold) timer = setTimeout(function () { render(i + 1); schedule(); }, DUR); }
    tabs.forEach(function (t, j) {
      t.addEventListener("click", function () { render(j); schedule(); });
      t.addEventListener("keydown", function (e) {
        var d = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
        if (!d) return; e.preventDefault(); render(i + d); tabs[i].focus(); schedule();
      });
    });
    root.addEventListener("mouseenter", function () { hold = true; root.classList.add("paused"); clearTimeout(timer); });
    root.addEventListener("mouseleave", function () { hold = false; if (!paused) root.classList.remove("paused"); schedule(); });
    function setPaused(v) { paused = v; root.classList.toggle("paused", v); pause.innerHTML = '<svg aria-hidden="true"><use href="#i-' + (v ? "play" : "pause") + '"/></svg>'; pause.setAttribute("aria-label", v ? T("ui.playreel", "Resume rotation") : T("ui.pause", "Pause rotation")); schedule(); }
    pause.addEventListener("click", function () { setPaused(!paused); });
    // swipe on the portrait for phones
    var arch = stage.querySelector(".sp-arch"), sx = null;
    arch.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    arch.addEventListener("pointerup", function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { render(i + (dx < 0 ? 1 : -1)); schedule(); } });
    render(0, true); setPaused(reduce);
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) schedule(); else clearTimeout(timer); }).observe(root);
  }

  /* ---------- masthead ---------- */
  function masthead(fac, ach) {
    stage.innerHTML = '<ul class="mh">' + fac.map(function (f, i) {
      return '<li class="mh-item" style="--c:' + f.color + '"><h3><button class="mh-row" type="button" aria-expanded="false" aria-controls="mh-p' + i + '" data-i="' + i + '">' +
        '<span class="mh-name">' + esc(f.name) + '</span><span class="mh-who">' + esc(who(f)) + "</span>" +
        '<span class="mh-n">' + (f.n ? '<b>' + f.n + "</b> " + (lang === "th" ? "บทความ" : "papers") : "") + '</span><span class="mh-plus" aria-hidden="true"></span></button></h3>' +
        '<div class="mh-panel" id="mh-p' + i + '" hidden><div class="mh-panel-in"><div class="mh-pic"><img src="' + cut(f) + '" alt="' + esc(f.name) + '" loading="lazy"></div><div>' + details(f, f.n, ach) + "</div></div></div></li>";
    }).join("") + '</ul><div class="mh-float" aria-hidden="true"><img alt=""></div>';
    var rows = stage.querySelectorAll(".mh-row"), float = stage.querySelector(".mh-float"), fimg = float.querySelector("img");
    rows.forEach(function (b) {
      b.addEventListener("click", function () {
        var open = b.getAttribute("aria-expanded") === "true", panel = document.getElementById(b.getAttribute("aria-controls"));
        rows.forEach(function (o) { if (o !== b && o.getAttribute("aria-expanded") === "true") { o.setAttribute("aria-expanded", "false"); document.getElementById(o.getAttribute("aria-controls")).hidden = true; } });
        b.setAttribute("aria-expanded", String(!open)); panel.hidden = open;
        float.classList.remove("on");
      });
    });
    // the portrait that follows the cursor over a name
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
      var x = 0, y = 0, tx = 0, ty = 0, on = false, raf = null;
      function loop() { x += (tx - x) * 0.18; y += (ty - y) * 0.18; float.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + ((tx - x) * 0.04).toFixed(2) + "deg)"; raf = on ? requestAnimationFrame(loop) : null; }
      rows.forEach(function (b) {
        b.addEventListener("pointerenter", function (e) {
          if (b.getAttribute("aria-expanded") === "true") return;
          var f = fac[+b.dataset.i]; fimg.src = cut(f); float.style.setProperty("--c", f.color);
          var rr = stage.getBoundingClientRect(); tx = e.clientX - rr.left; ty = e.clientY - rr.top; if (!on) { x = tx; y = ty; }
          on = true; float.classList.add("on"); if (!raf) raf = requestAnimationFrame(loop);
        });
        b.addEventListener("pointermove", function (e) { var rr = stage.getBoundingClientRect(); tx = e.clientX - rr.left; ty = e.clientY - rr.top; });
        b.addEventListener("pointerleave", function () { on = false; float.classList.remove("on"); });
      });
    }
  }

  /* ---------- deck ---------- */
  function deck(fac, ach) {
    stage.innerHTML = '<div class="dk"><div class="dk-col"><div class="dk-stack" tabindex="0" role="group" aria-roledescription="card stack" aria-label="' + T("faculty.title", "The faculty") + '">' +
      fac.map(function (f, i) {
        return '<article class="dk-card" data-i="' + i + '" style="--c:' + f.color + '" aria-hidden="' + (i !== 0) + '">' +
          '<div class="dk-top"><span class="dk-who">' + esc(who(f)) + "</span>" + (f.n ? '<span class="dk-n"><b>' + f.n + "</b> " + (lang === "th" ? "บทความ" : "papers") + "</span>" : "") + "</div>" +
          '<h3 class="dk-name">' + esc(f.name) + "</h3>" +
          '<img src="' + cut(f) + '" alt="" draggable="false"' + (i > 2 ? ' loading="lazy"' : "") + "></article>";
      }).join("") + "</div>" +
      '<div class="dk-nav"><button class="round" type="button" data-d="-1" aria-label="' + T("ui.prev", "Previous") + '"><svg aria-hidden="true"><use href="#i-prev"/></svg></button>' +
      '<span class="dk-count tnum">1 / ' + fac.length + "</span>" +
      '<button class="round" type="button" data-d="1" aria-label="' + T("ui.next", "Next") + '"><svg aria-hidden="true"><use href="#i-next"/></svg></button></div></div>' +
      '<div class="dk-info" aria-live="polite"></div></div>';
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".dk-card")), stack = stage.querySelector(".dk-stack"),
        info = stage.querySelector(".dk-info"), count = stage.querySelector(".dk-count");
    var order = fac.map(function (_, i) { return i; });
    function layout(dragX) {
      order.forEach(function (ci, pos) {
        var el = cards[ci], d = Math.min(pos, 3);
        el.style.zIndex = String(fac.length - pos);
        el.setAttribute("aria-hidden", String(pos !== 0));
        if (pos === 0 && dragX != null) { el.style.transition = "none"; el.style.transform = "translateX(" + dragX + "px) rotate(" + (dragX * 0.05) + "deg)"; return; }
        el.style.transition = "";
        el.style.transform = "translate(" + (d * 22) + "px," + (d * -10) + "px) rotate(" + (d * 3.2) + "deg) scale(" + (1 - d * 0.045) + ")";
        el.style.opacity = pos > 3 ? "0" : "1";
      });
    }
    function showInfo() {
      var f = fac[order[0]];
      info.classList.add("out");
      setTimeout(function () { info.innerHTML = "<h3>" + esc(f.name) + "</h3>" + details(f, f.n, ach); info.classList.remove("out"); }, reduce ? 0 : 200);
      count.textContent = (order[0] + 1) + " / " + fac.length;
    }
    function go(d, flingX) {
      if (d > 0) {
        var top = cards[order[0]];
        if (!reduce) {
          top.style.transition = "transform 320ms cubic-bezier(0.23, 1, 0.32, 1), opacity 320ms ease";
          top.style.transform = "translateX(" + (flingX || -window.innerWidth * 0.6) + "px) rotate(" + ((flingX || -1) > 0 ? 14 : -14) + "deg)";
          top.style.opacity = "0";
          setTimeout(function () { order.push(order.shift()); top.style.opacity = "1"; layout(); }, 300);
        } else { order.push(order.shift()); layout(); }
      } else { order.unshift(order.pop()); layout(); }
      showInfo();
    }
    stage.querySelectorAll(".dk-nav button").forEach(function (b) { b.addEventListener("click", function () { go(+b.dataset.d); }); });
    stack.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } });
    // drag the top card; a flick or a long drag sends it to the back
    var sx = 0, t0 = 0, drag = false, dx = 0;
    stack.addEventListener("pointerdown", function (e) { drag = true; sx = e.clientX; t0 = performance.now(); dx = 0; stack.setPointerCapture(e.pointerId); });
    stack.addEventListener("pointermove", function (e) { if (!drag) return; dx = e.clientX - sx; layout(dx); });
    function end() {
      if (!drag) return; drag = false;
      var v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 90 || v > 0.5) go(1, dx > 0 ? window.innerWidth * 0.6 : -window.innerWidth * 0.6); else layout();
    }
    stack.addEventListener("pointerup", end); stack.addEventListener("pointercancel", end);
    layout(); showInfo();
  }

  /* ---------- academic officers ---------- */
  function officers(staff) {
    var box = document.getElementById("officers"); if (!box) return;
    staff.forEach(function (s, i) {
      var d = document.createElement("div");
      d.className = "officer";
      d.style.setProperty("--c", COLORS[(i + 2) % COLORS.length]);
      d.innerHTML = '<div class="officer-pic"><img src="people/' + s.id + '-cut.webp" alt="" loading="lazy"></div><div><b>' + esc(s.name) + "</b><span>" + esc(P(s.role)) + "</span><small>" + s.education.map(esc).join("<br>") + "</small></div>";
      box.appendChild(d);
    });
  }
})();
