/* Faculty and admissions page renderers */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, P = window.pick, lang = window.CICM_LANG, esc = C.esc;
  var $ = function (s) { return document.querySelector(s); };
  var page = document.body.dataset.page;

  if (page === "faculty") {
    Promise.all([C.loadContent(), C.loadPapers()]).then(function (r) {
      var c = r[0], papers = r[1].papers;
      $("#profiles").innerHTML = c.faculty.map(function (f) {
        var mine = f.pubmed ? papers.filter(function (p) { return p.faculty.indexOf(f.pubmed) > -1; }) : [];
        var ach = (c.achievements || []).filter(function (a) { return a.faculty === f.id; });
        var who = [f.title, f.post].filter(Boolean).join(" · ");
        return '<article class="profile rise" id="' + f.id + '">' +
          '<div class="pic"><img src="' + f.photo + '" alt="' + esc(f.name) + '" loading="lazy" width="200" height="219"></div>' +
          '<div><div class="who">' + esc(who) + "</div><h2>" + esc(f.name) + "</h2>" +
          "<h3>" + T("ui.edu", "Education") + '</h3><ul class="edu">' + f.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" +
          (f.expertise.length ? "<h3>" + T("ui.exp", "Expertise") + '</h3><ul class="chips">' + f.expertise.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
          "</div><div>" +
          (ach.length ? "<h3>" + T("ui.ach", "Achievements") + '</h3><ul class="ach">' + ach.map(function (a) {
            var txt = esc(P(a.text)); if (a.link) txt = '<a href="' + esc(a.link) + '" target="_blank" rel="noopener">' + txt + "</a>";
            return '<li><span class="y">' + esc(a.year) + "</span>" + txt + "</li>"; }).join("") + "</ul>" : "") +
          (mine.length ? "<h3>" + T("ui.recent", "Recent papers") + " · " + mine.length + " " + T("ui.pubcount", "papers in PubMed") + '</h3><ul class="papers">' +
            mine.slice(0, 5).map(function (p) {
              var href = p.doi ? "https://doi.org/" + p.doi : "https://pubmed.ncbi.nlm.nih.gov/" + p.pmid + "/";
              return '<li><a href="' + href + '" target="_blank" rel="noopener">' + esc(p.title) + "</a><small>" + esc(p.journal) + ", " + p.year + "</small></li>";
            }).join("") + '</ul><p style="margin-top:14px"><a class="link-arrow" href="research.html?lecturer=' + encodeURIComponent(f.pubmed) + '"><span>' +
            (lang === "th" ? T("ui.allby", "All papers by") + " " + esc(f.name) : "All papers by " + esc(f.name)) + "</span>" + C.icon("arrow") + "</a></p>" : "") +
          "</div></article>";
      }).join("");
      $("#staffList").innerHTML = c.staff.map(function (s) {
        return '<div class="person"><img src="' + s.photo + '" alt="" loading="lazy" width="64" height="70"><div><b>' + esc(s.name) + "</b><span>" + esc(P(s.role)) + "</span><br><span>" + s.education.map(esc).join("<br>") + "</span></div></div>";
      }).join("");
      C.reveal($("#profiles"));
      if (location.hash) { var el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }
    });
  }

  if (page === "admissions") {
    C.loadContent().then(function (c) {
      // course tabs
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs [role=tab]")), panel = $("#panel");
      function show(id) {
        tabs.forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.p === id)); b.tabIndex = b.dataset.p === id ? 0 : -1; });
        panel.setAttribute("aria-labelledby", "tab-" + id);
        var prog = c.programs.filter(function (p) { return p.id === id; })[0];
        var head = '<div style="grid-column:1/-1"><h3 style="font-size:1.5rem;margin:6px 0 4px">' + esc(P(prog.degree)) + '</h3><p class="prose" style="margin:0">' + esc(P(prog.focus)) + " " + esc(P(prog.length)) + ".</p></div>";
        if (id === "phd") {
          panel.innerHTML = head + '<div style="grid-column:1/-1"><ul class="ruled">' + c.curriculum.phd.map(function (pl) {
            return "<li><b>" + esc(pl.plan) + "</b> · " + esc(P(pl.entry)) + "<br>" + esc(P(pl.detail)) + "</li>";
          }).join("") + "</ul></div>";
          return;
        }
        var terms = c.curriculum[id];
        panel.innerHTML = head + terms.map(function (t) {
          return '<div class="term"><h3><span>' + esc(t.term) + "</span><span class=\"tnum\">" + t.total + " " + T("adm.credits", "credits") + "</span></h3>" +
            t.courses.map(function (k) { return '<div class="course"><code>' + esc(k[0]) + "</code><span>" + esc(k[1]) + "</span><span>" + k[2] + "</span></div>"; }).join("") + "</div>";
        }).join("");
      }
      tabs.forEach(function (b, i) {
        b.addEventListener("click", function () { show(b.dataset.p); });
        b.addEventListener("keydown", function (e) {
          var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!k) return;
          var n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); show(n.dataset.p);
        });
      });
      show("clinical");

      // fees
      $("#fees").innerHTML = '<div class="fee head"><span>' + T("adm.prog", "Program") + "</span><span>" + T("ui.thai", "Thai students") + "</span><span>" + T("ui.foreign", "Foreign students") + "</span></div>" +
        c.programs.map(function (p) { return '<div class="fee"><b>' + esc(p.code + " " + P(p.name)) + "</b><span>" + Number(p.fee.thai).toLocaleString("en-US") + "</span><span>" + Number(p.fee.foreign).toLocaleString("en-US") + "</span></div>"; }).join("");

      // downloads
      var groups = [["announcements", "Announcements, academic year 2026"], ["forms", "Forms"], ["programs", "Program information"], ["folders", "CICM document folders"]];
      $("#dlList").innerHTML = groups.map(function (g) {
        var items = c.downloads.filter(function (d) { return d.group === g[0]; });
        if (!items.length) return "";
        return '<div class="dl-group"><h3>' + T("dl." + g[0], g[1]) + "</h3>" + items.map(function (d) {
          var folder = /drive\.google\.com\/drive\/folders/.test(d.url);
          return '<a class="dl" href="' + esc(d.url) + '" target="_blank" rel="noopener"><span class="t">' + esc(P(d.title)) + '</span><span class="k">' + C.icon(folder ? "folder" : "file") + (folder ? T("ui.folder", "Folder") : "PDF") + "</span></a>";
        }).join("") + "</div>";
      }).join("");
    });
  }
})();
