/* Atlas plates design: home page renderers, the leader lines on Plate 1 and the film clips. */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, P = window.pick, esc = C.esc, lang = window.CICM_LANG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = document.body.dataset.page;
  var baht = function (n) { return Number(n).toLocaleString("en-US"); };

  /* ---------- Plate 1 leader lines ----------
     Each key above or below the drawing gets a straight line to its point.
     Below 900px the keys sit in a list under the drawing and only the letters show. */
  function leaders() {
    var fig = $("#plate1"); if (!fig) return;
    var spec = $(".at-spec", fig), svg = $(".at-lines", fig);
    function draw() {
      var wide = window.innerWidth >= 900;
      fig.classList.toggle("is-wide", wide);
      if (!wide) { svg.innerHTML = ""; return; }
      var fr = fig.getBoundingClientRect(), sr = spec.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + fr.width + " " + fr.height);
      svg.style.top = (fr.top - sr.top) + "px"; svg.style.height = fr.height + "px"; svg.style.width = fr.width + "px"; svg.style.left = (fr.left - sr.left) + "px";
      var out = "";
      $$(".at-keys li", fig).forEach(function (li) {
        var pt = $('.at-pt[data-pt="' + li.dataset.pt + '"]', spec); if (!pt) return;
        var lr = $("b", li).getBoundingClientRect(), pr = pt.getBoundingClientRect();
        var up = li.classList.contains("up");
        var x1 = lr.left + lr.width / 2 - fr.left, y1 = (up ? lr.bottom + 6 : lr.top - 6) - fr.top;
        var x2 = pr.left + pr.width / 2 - fr.left, y2 = pr.top + pr.height / 2 - fr.top;
        // stop the line at the edge of the point's circle
        var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), r = pr.width / 2 + 2;
        x2 -= dx / len * r; y2 -= dy / len * r;
        out += '<line data-pt="' + li.dataset.pt + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
      });
      svg.innerHTML = out;
    }
    function hot(pt, on) {
      fig.classList.toggle("has-hot", on);
      $$('[data-pt="' + pt + '"]', fig).forEach(function (el) { el.classList.toggle("is-hot", on); });
    }
    $$(".at-keys li", fig).forEach(function (li) {
      var a = $("a", li), pt = li.dataset.pt;
      ["mouseenter", "focusin"].forEach(function (e) { a.addEventListener(e, function () { hot(pt, true); }); });
      ["mouseleave", "focusout"].forEach(function (e) { a.addEventListener(e, function () { hot(pt, false); }); });
    });
    var img = $("img", spec);
    if (img.complete) draw(); else img.addEventListener("load", draw);
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(draw, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }

  /* ---------- film clips: play only while on screen ---------- */
  function loops() {
    var vids = $$("video.at-loop, video.bk-loop"); if (!vids.length) return;
    var save = navigator.connection && navigator.connection.saveData;
    if (reduce || save) return; // posters stay as stills
    function check() {
      var vh = window.innerHeight;
      vids.forEach(function (v) {
        var r = v.getBoundingClientRect(), on = r.bottom > -100 && r.top < vh + 100;
        if (on) {
          if (!v.src) { v.src = v.dataset.src; }
          if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) v.pause();
      });
    }
    var tick = false;
    window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; check(); }); } }, { passive: true });
    window.addEventListener("resize", check);
    check();
  }

  /* ---------- Plate 2 ---------- */
  function programs(c) {
    var t = $("#atPrograms"); if (!t) return;
    t.innerHTML = "<caption>" + T("at.t2", "Table 2. The programs") + "</caption>" +
      "<thead><tr><th>" + T("adm.prog", "Program") + "</th><th>" + T("ui.length", "Length") + '</th><th class="n">' + T("ui.thai", "Thai students") + '</th><th class="n">' + T("ui.foreign", "Foreign students") + "</th></tr></thead><tbody>" +
      c.programs.map(function (p) {
        return '<tr><th scope="row"><b>' + esc(p.code + " " + P(p.name)) + "</b><span>" + esc(P(p.focus)) + "</span></th>" +
          '<td data-l="' + esc(T("ui.length", "Length")) + '">' + esc(P(p.length)) + "</td>" +
          '<td class="n tnum" data-l="' + esc(T("ui.thai", "Thai students")) + '">' + baht(p.fee.thai) + "</td>" +
          '<td class="n tnum" data-l="' + esc(T("ui.foreign", "Foreign students")) + '">' + baht(p.fee.foreign) + "</td></tr>";
      }).join("") + "</tbody>" +
      '<tfoot><tr><td colspan="4">' + T("at.t2foot", "Tuition in baht per semester.") + "</td></tr></tfoot>";
  }
  function notes(c) {
    var box = $("#atNotes"); if (!box) return;
    var list = c.announcements.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); }).slice(0, 4);
    box.innerHTML = list.map(function (n) {
      var ext = /^https?:/.test(n.link || "");
      return '<li><span class="at-tag">' + esc(P(n.tag)) + '</span><a href="' + esc(n.link || "admissions.html#downloads") + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(P(n.title)) + "</a></li>";
    }).join("");
  }

  /* ---------- Plate 4: one lecturer at a time, picked from the figure list ---------- */
  function faculty(c, papers) {
    var box = $("#atFaculty"); if (!box) return;
    var fac = c.faculty, cnt = {};
    papers.forEach(function (p) { p.faculty.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; }); });
    var letters = "abcdef";
    box.innerHTML = '<ol class="at-fac-list" role="tablist" aria-label="' + esc(T("faculty.title", "The faculty")) + '">' + fac.map(function (f, i) {
      return '<li role="presentation"><button type="button" role="tab" id="atf-' + f.id + '" aria-controls="atFacPanel" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' +
        '<span class="at-fig-no">4' + letters[i] + "</span><span>" + esc(f.name) + "</span></button></li>";
    }).join("") + '</ol><div class="at-fac-panel" id="atFacPanel" role="tabpanel" aria-live="polite"></div>';
    var panel = $("#atFacPanel"), tabs = $$("[role=tab]", box);
    function show(i) {
      var f = fac[i], n = f.pubmed ? cnt[f.pubmed] || 0 : 0;
      tabs.forEach(function (b, k) { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      panel.setAttribute("aria-labelledby", "atf-" + f.id);
      var sc = f.scopus && f.scopus.docs ? f.scopus : null;
      panel.innerHTML =
        '<figure class="at-port"><img src="people/' + f.id + '-cut.webp" alt="' + esc(f.name) + '" width="572" height="857">' +
          '<figcaption class="at-cap"><b>' + T("at.fig", "Fig.") + " 4" + letters[i] + ".</b></figcaption></figure>" +
        '<div class="at-fac-text"><p class="at-who">' + esc([f.title, f.post].filter(Boolean).join(", ")) + "</p><h3>" + esc(f.name) + "</h3>" +
          "<dl class=\"at-key\">" +
            "<div><dt>" + T("ui.edu", "Education") + "</dt><dd><ul>" + f.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></dd></div>" +
            (f.expertise.length ? "<div><dt>" + T("ui.exp", "Expertise") + "</dt><dd>" + f.expertise.map(esc).join(", ") + "</dd></div>" : "") +
            (sc ? '<div><dt>Scopus</dt><dd class="tnum"><a href="' + C.scopusUrl(sc.id) + '" target="_blank" rel="noopener">' + C.fmtN(sc.docs) + " " + T("at.docs", sc.docs === 1 ? "document" : "documents") + ", " + C.fmtN(sc.cites) + " " + T("at.cites", "citations") + ", h-index " + sc.h + "</a></dd></div>" : "") +
            (n ? '<div><dt>PubMed</dt><dd><a href="research.html?lecturer=' + encodeURIComponent(f.pubmed) + '">' + n + " " + T("at.papers", n === 1 ? "paper" : "papers") + "</a></dd></div>" : "") +
          "</dl>" +
          '<a class="at-small-link" href="faculty.html#' + f.id + '">' + T("at.profile", "Full profile") + "</a></div>";
    }
    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { show(i); });
      b.addEventListener("keydown", function (e) {
        var k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return;
        e.preventDefault(); var j = (i + k + tabs.length) % tabs.length; tabs[j].focus(); show(j);
      });
    });
    show(0);
    var off = $("#atOfficers");
    if (off && c.staff.length) off.innerHTML = '<span data-i18n="staff.title">' + T("staff.title", "Academic officers") + "</span>: " +
      c.staff.map(function (s) { return "<b>" + esc(s.name) + "</b>, " + esc(P(s.role)); }).join("; ") + ". " + T("at.thanks", "With thanks for their support of the program and its students.");
  }

  function boot() {
    leaders();
    loops();
    if (page !== "home" || !$(".at")) return;
    Promise.all([C.loadContent(), C.loadPapers()]).then(function (r) {
      var c = r[0], papers = r[1].papers;
      $$('[data-count="papers"]').forEach(function (el) { el.textContent = papers.length; });
      programs(c); notes(c); faculty(c, papers);
      // the shared year chart calls itself Fig. 5, which is the map here
      var yc = $("#yearFig figcaption b"); if (yc) yc.textContent = T("at.f6", "Fig. 6.");
    }).catch(function (e) { console.error(e); });
  }
  if (window.CICM) boot(); else document.addEventListener("cicm:ready", boot);
})();
