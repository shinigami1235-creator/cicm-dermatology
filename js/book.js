/* Program book design: the cover that opens on scroll, home page renderers and the film clips. */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, P = window.pick, esc = C.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = document.body.dataset.page;
  var baht = function (n) { return Number(n).toLocaleString("en-US"); };

  /* ---------- cover: DERMA and TOLOGY part as you scroll and the film fills the gap ---------- */
  function cover() {
    var sec = $(".bk-cover"); if (!sec) return;
    var v = $(".bk-band-v", sec);
    if (reduce) { sec.classList.add("is-still"); return; }
    var inner = $(".bk-cover-in", sec), band = $(".bk-band", sec);
    // how far the parts above and below the film band must travel to clear the screen
    function measure() {
      var bt = band.offsetTop, bb = inner.clientHeight - bt - band.offsetHeight;
      inner.style.setProperty("--t", bt + "px"); inner.style.setProperty("--bt", bt + "px");
      inner.style.setProperty("--b", bb + "px"); inner.style.setProperty("--bb", bb + "px");
    }
    var tick = false;
    function frame() {
      var r = sec.getBoundingClientRect(), run = sec.offsetHeight - inner.offsetHeight;
      var p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
      sec.style.setProperty("--p", p.toFixed(4));
      var on = r.bottom > 0 && r.top < window.innerHeight;
      if (on && v) { if (!v.src) v.src = v.dataset.src; if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } }
      else if (v && !v.paused) v.pause();
    }
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; frame(); }); } }, { passive: true });
    window.addEventListener("resize", function () { measure(); frame(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); frame(); });
    measure(); frame();
  }

  /* ---------- film clips: play only while on screen ---------- */
  function loops() {
    var vids = $$("video.bk-loop"); if (!vids.length) return;
    var save = navigator.connection && navigator.connection.saveData;
    if (reduce || save) return;
    function check() {
      var vh = window.innerHeight;
      vids.forEach(function (v) {
        var r = v.getBoundingClientRect(), on = r.bottom > -100 && r.top < vh + 100;
        if (on) { if (!v.src) v.src = v.dataset.src; if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } }
        else if (!v.paused) v.pause();
      });
    }
    var tick = false;
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; check(); }); } }, { passive: true });
    window.addEventListener("resize", check);
    check();
  }

  /* ---------- programs as three fact sheets ---------- */
  function programs(c) {
    var box = $("#bkPrograms"); if (!box) return;
    box.innerHTML = c.programs.map(function (p) {
      var len = P(p.length);
      return '<article class="bk-prog"><p class="bk-prog-code">' + esc(p.code) + "</p><h3>" + esc(P(p.name)) + "</h3>" +
        '<p class="bk-prog-focus">' + esc(P(p.focus)) + "</p>" +
        "<dl>" +
          "<div><dt>" + T("ui.length", "Length") + "</dt><dd>" + esc(len) + "</dd></div>" +
          "<div><dt>" + T("ui.thai", "Thai students") + '</dt><dd class="bk-num tnum">' + baht(p.fee.thai) + "</dd></div>" +
          "<div><dt>" + T("ui.foreign", "Foreign students") + '</dt><dd class="bk-num tnum">' + baht(p.fee.foreign) + "</dd></div>" +
        "</dl></article>";
    }).join("");
  }
  function notes(c) {
    var box = $("#bkNotes"); if (!box) return;
    var list = c.announcements.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); }).slice(0, 4);
    box.innerHTML = list.map(function (n) {
      var ext = /^https?:/.test(n.link || "");
      return '<li><span class="bk-tag">' + esc(P(n.tag)) + '</span><a href="' + esc(n.link || "admissions.html#downloads") + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(P(n.title)) + "</a></li>";
    }).join("");
  }
  function faculty(c, papers) {
    var box = $("#bkFaculty"); if (!box) return;
    var cnt = {};
    papers.forEach(function (p) { p.faculty.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; }); });
    box.innerHTML = c.faculty.map(function (f) {
      var sc = f.scopus && f.scopus.docs ? f.scopus : null, n = f.pubmed ? cnt[f.pubmed] || 0 : 0;
      return '<li class="bk-person"><a href="faculty.html#' + f.id + '">' +
        '<span class="bk-port"><img src="people/' + f.id + '-cut.webp" alt="" width="572" height="857" loading="lazy"></span>' +
        '<span class="bk-pname">' + esc(f.name) + "</span>" +
        '<span class="bk-ptitle">' + esc([f.title, f.post].filter(Boolean).join(", ")) + "</span>" +
        '<span class="bk-pexp">' + f.expertise.slice(0, 3).map(esc).join(", ") + "</span>" +
        (sc || n ? '<span class="bk-pnum tnum">' + (sc ? "h-index " + sc.h + " · " + C.fmtN(sc.cites) + " " + T("at.cites", "citations") : n + " " + T("at.papers", "papers")) + "</span>" : "") +
        "</a></li>";
    }).join("");
    var off = $("#bkOfficers");
    if (off && c.staff.length) off.innerHTML = T("staff.title", "Academic officers") + ": " +
      c.staff.map(function (s) { return "<b>" + esc(s.name) + "</b>"; }).join(", ") + ". " + T("at.thanks", "With thanks for their support of the program and its students.");
  }

  function boot() {
    cover();
    loops();
    if (page !== "home" || !$(".bk")) return;
    Promise.all([C.loadContent(), C.loadPapers()]).then(function (r) {
      var c = r[0], papers = r[1].papers;
      $$('[data-count="papers"]').forEach(function (el) { el.textContent = papers.length; });
      var pn = $("#bkPartnerN"); if (pn) pn.textContent = c.partners.length;
      programs(c); notes(c); faculty(c, papers);
      var yc = $("#yearFig figcaption b"); if (yc) yc.textContent = T("bk.fig", "Figure 1.");
    }).catch(function (e) { console.error(e); });
  }
  if (window.CICM) boot(); else document.addEventListener("cicm:ready", boot);
})();
