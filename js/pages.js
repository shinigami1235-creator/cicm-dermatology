/* Faculty and admissions page renderers */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, P = window.pick, lang = window.CICM_LANG, esc = C.esc, url = C.url;
  var $ = function (s) { return document.querySelector(s); };
  var page = document.body.dataset.page;

  if (page === "faculty") {
    Promise.all([C.loadContent(), C.loadPapers()]).then(function (r) {
      var c = r[0], papers = r[1].papers;
      $("#profiles").innerHTML = c.faculty.map(function (f) {
        var mine = f.pubmed ? papers.filter(function (p) { return p.faculty.indexOf(f.pubmed) > -1; }) : [];
        var ach = (c.achievements || []).filter(function (a) { return a.faculty === f.id; });
        var who = [f.title, f.post].filter(Boolean).join(" · ");
        return '<article class="profile rise" id="' + esc(f.id) + '">' +
          '<div class="pic"><img src="' + url(f.photo) + '" alt="' + esc(f.name) + '" loading="lazy" width="400" height="438"></div>' +
          '<div><div class="who">' + esc(who) + "</div><h2>" + esc(f.name) + "</h2>" +
          "<h3>" + T("ui.edu", "Education") + '</h3><ul class="edu">' + f.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" +
          (f.expertise.length ? "<h3>" + T("ui.exp", "Expertise") + '</h3><ul class="chips">' + f.expertise.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
          (f.scopus && f.scopus.id ? '<p class="scopus-line"><a href="' + C.scopusUrl(f.scopus.id) + '" target="_blank" rel="noopener"><b>Scopus</b> ' +
            C.fmtN(f.scopus.docs) + " " + (lang === "th" ? T("research.docs", "เอกสาร") : f.scopus.docs === 1 ? "document" : "documents") + (f.scopus.cites ? " · " + C.fmtN(f.scopus.cites) + " " + T("research.cites", "citations").toLowerCase() : "") + (f.scopus.h ? " · h-index " + f.scopus.h : "") + "</a></p>" : "") +
          (f.orcid || f.openalex ? '<p class="scopus-line id-line">' + (f.orcid ? '<a href="https://orcid.org/' + encodeURIComponent(f.orcid) + '" target="_blank" rel="noopener"><b>ORCID</b> ' + esc(f.orcid) + "</a>" : "") +
            (f.openalex ? '<a href="https://openalex.org/authors/' + encodeURIComponent(f.openalex) + '" target="_blank" rel="noopener"><b>OpenAlex</b> ' + T("ui.profile", "profile") + "</a>" : "") + "</p>" : "") +
          "</div><div>" +
          (ach.length ? "<h3>" + T("ui.ach", "Achievements") + '</h3><ul class="ach">' + ach.map(function (a) {
            var txt = esc(P(a.text)); if (a.link) txt = '<a href="' + url(a.link) + '" target="_blank" rel="noopener">' + txt + "</a>";
            return '<li><span class="y">' + esc(a.year) + "</span>" + txt + "</li>"; }).join("") + "</ul>" : "") +
          (mine.length ? "<h3>" + T("ui.recent", "Recent papers") + " · " + mine.length + " " + T("ui.pubcount", "published papers") + '</h3><ul class="papers">' +
            mine.slice(0, 5).map(function (p) {
              var href = C.paperHref(p);
              return '<li><a href="' + href + '" target="_blank" rel="noopener">' + esc(p.title) + "</a><small>" + esc(p.journal) + ", " + esc(p.year) + "</small></li>";
            }).join("") + '</ul><p style="margin-top:14px"><a class="link-arrow" href="research.html?lecturer=' + encodeURIComponent(f.pubmed) + '"><span>' +
            (lang === "th" ? T("ui.allby", "All papers by") + " " + esc(f.name) : "All papers by " + esc(f.name)) + "</span>" + C.icon("arrow") + "</a></p>" : "") +
          // papers in journals PubMed does not index; a link at the end of the line becomes the link
          (f.otherPubs && f.otherPubs.length ? "<h3>" + T("ui.otherpubs", "Other publications") + '</h3><ul class="papers other">' + f.otherPubs.map(function (line) {
            var m = String(line).match(/^(.*?)\s*(https?:\/\/\S+)$/), text = m ? m[1] : String(line);
            return "<li>" + (m ? '<a href="' + C.url(m[2]) + '" target="_blank" rel="noopener">' + esc(text) + "</a>" : esc(text)) + "</li>";
          }).join("") + "</ul>" : "") +
          "</div></article>";
      }).join("");
      var vbox = $("#vProfiles"), groups = c.visitingGroups || [];
      if (vbox && c.visiting) vbox.innerHTML = groups.map(function (g) {
        return c.visiting.filter(function (v) { return v.group === g.id; }).map(function (v) {
          var who = [v.title, v.post].filter(Boolean).join(" · ");
          return '<article class="vprof rise" id="' + esc(v.id) + '"><div class="vprof-pic"><img src="' + url(v.photo) + '" alt="' + esc(v.name) + '" loading="lazy" width="533" height="640"></div><div>' +
            '<div class="who">' + esc(who) + "</div><h3>" + esc(v.name) + '</h3><p class="vprof-place"><b>' + esc(v.role) + "</b><br>" + esc(v.place) + "</p>" +
            (v.education.length ? "<h4>" + T("ui.edu", "Education") + '</h4><ul class="edu">' + v.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
            (v.expertise.length ? "<h4>" + T("ui.exp", "Expertise") + '</h4><ul class="chips">' + v.expertise.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
            "</div></article>";
        }).join("");
      }).join("");
      if (vbox) C.reveal(vbox);
      $("#staffList").innerHTML = c.staff.map(function (s) {
        return '<div class="person"><img src="' + url(s.photo) + '" alt="" loading="lazy" width="64" height="70"><div><b>' + esc(s.name) + "</b><span>" + esc(P(s.role)) + "</span><br><span>" + s.education.map(esc).join("<br>") + "</span></div></div>";
      }).join("");
      C.reveal($("#profiles"));
      if (location.hash) { var el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }
    });
  }

  /* ---------- programs page: one tab per program, built from programInfo in content.json ---------- */
  if (page === "programs") {
    C.loadContent().then(function (c) {
      var info = c.programInfo || {}, tabs = Array.prototype.slice.call(document.querySelectorAll(".prog-tabs [role=tab]")), panel = $("#progPanel");
      var GROUPS = { core: ["prog.core", "Core courses"], major: ["prog.major", "Major required courses"], elective: ["prog.elective", "Elective courses"], thesis: ["prog.thesis", "Thesis"],
        required: ["prog.required", "Required courses"], dissertation: ["prog.dissertation", "Dissertation"], noncredit: ["prog.noncredit", "Non-credit courses (pass or not pass)"] };
      function g(k) { return T(GROUPS[k][0], GROUPS[k][1]); }
      function sec(id, title, body) { return '<section class="pp-sec" id="pp-' + id + '"><h2>' + title + "</h2>" + body + "</section>"; }
      function list(items) { return '<ol class="pp-list">' + items.map(function (x) { return "<li>" + esc(P(x)) + "</li>"; }).join("") + "</ol>"; }
      function credits(n) { return n === 0 ? "P/N" : n == null ? "" : n + " " + (n === 1 ? T("adm.credit", "credit") : T("adm.credits", "credits")); }
      function courses(groups, order, notes) {
        return order.filter(function (k) { return groups[k] && groups[k].length; }).map(function (k) {
          var sum = groups[k].reduce(function (a, x) { return a + (x.credits || 0); }, 0);
          return '<div class="pp-cgroup"><h3><span>' + g(k) + "</span>" + (notes && notes[k] ? '<em>' + esc(P(notes[k])) + "</em>" : "") + "</h3>" +
            groups[k].map(function (x) {
              return '<details class="pp-course"><summary><code>' + esc(x.code) + "</code><span>" + esc(x.name) + '</span><span class="cr">' + credits(x.credits) + "</span></summary><p>" + esc(x.desc) + "</p></details>";
            }).join("") + "</div>";
        }).join("");
      }
      function structureBar(rows, total) {
        return '<div class="pp-bar" role="img" aria-label="' + rows.map(function (r) { return g(r[0]) + " " + r[1]; }).join(", ") + '">' +
          rows.map(function (r) { return '<span class="seg seg-' + r[0] + '" style="flex:' + r[1] + '"><b>' + r[1] + "</b></span>"; }).join("") + "</div>" +
          '<ul class="pp-legend">' + rows.map(function (r) { return '<li><i class="seg-' + r[0] + '"></i>' + g(r[0]) + " <b>" + r[1] + "</b></li>"; }).join("") +
          '<li class="tot">' + T("prog.total", "Total") + " <b>" + total + " " + T("adm.credits", "credits") + "</b></li></ul>";
      }
      function outcomes(o) {
        var groups = [];
        o.forEach(function (x) { var k = P(x.group); var gg = groups.filter(function (y) { return y.k === k; })[0]; if (!gg) { gg = { k: k, items: [] }; groups.push(gg); } gg.items.push(x); });
        return '<div class="pp-outcomes">' + groups.map(function (gg) {
          return '<div class="pp-oc"><h3>' + esc(gg.k) + "</h3>" + gg.items.map(function (x) { return '<p><b>' + esc(x.code) + "</b>" + esc(P(x.text)) + "</p>"; }).join("") + "</div>";
        }).join("") + "</div>";
      }
      function years(ys, note) {
        return '<div class="pp-years">' + ys.map(function (y) { return '<div><h4>' + esc(P(y.year)) + "</h4><p>" + esc(P(y.text)) + "</p></div>"; }).join("") + "</div>" + (note ? '<p class="pp-note">' + esc(P(note)) + "</p>" : "");
      }
      function studyPlan(terms) {
        return '<div class="cols-2 pp-plan">' + terms.map(function (t) {
          return '<div class="term"><h3><span>' + esc(t.term) + '</span><span class="tnum">' + t.total + " " + T("adm.credits", "credits") + "</span></h3>" +
            t.courses.map(function (k) { return '<div class="course"><code>' + esc(k[0]) + "</code><span>" + esc(k[1]) + "</span><span>" + (k[2] === 0 ? "P/N" : k[2]) + "</span></div>"; }).join("") + "</div>";
        }).join("") + "</div>";
      }
      function sites(f) {
        return '<div class="cols-2 pp-sites"><div><h3>' + T("prog.thailand", "In Thailand") + "</h3><ul>" + f.thailand.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul></div><div><h3>" + T("prog.abroad", "Abroad") + "</h3><ul>" + f.abroad.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>";
      }
      function careers(list) {
        return '<div class="pp-careers">' + list.map(function (x) { return "<div><h3>" + esc(P(x.title)) + "</h3><p>" + esc(P(x.text)) + "</p></div>"; }).join("") + "</div>";
      }
      function reqs(r) {
        return '<div class="pp-reqs">' + r.map(function (b) { return "<div><h3>" + esc(P(b.title)) + "</h3>" + list(b.items) + "</div>"; }).join("") + "</div>";
      }
      function facts(prog, d, plan) {
        var row = function (k, label, v) { return '<div><dt>' + T(k, label) + "</dt><dd>" + esc(v) + "</dd></div>"; };
        return '<dl class="pp-facts">' + row("prog.awarded", "Degree", P(d.awarded)) + row("prog.plan", "Study plan", P(d.plan)) +
          row("ui.duration", "Duration", P(prog.years)) + row("ui.credits", "Credits", P(prog.credits)) + "</dl>";
      }
      function toc(items) {
        return '<nav class="pp-toc" aria-label="' + T("prog.onPage", "On this page") + '">' + items.map(function (x) { return '<a href="#pp-' + x[0] + '">' + x[1] + "</a>"; }).join("") + "</nav>";
      }
      function show(id) {
        tabs.forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.p === id)); b.tabIndex = b.dataset.p === id ? 0 : -1; });
        panel.setAttribute("aria-labelledby", "tab-" + id);
        var sel = tabs.filter(function (b) { return b.dataset.p === id; })[0];
        if (sel && sel.parentElement.scrollWidth > sel.parentElement.clientWidth) sel.parentElement.scrollLeft = sel.offsetLeft - 16;   // phones: bring the chosen tab into view
        var prog = c.programs.filter(function (p) { return p.id === id; })[0], phd = id === "phd", d = phd ? info.phd : info.msc;
        if (!prog || !d) { panel.innerHTML = ""; return; }
        var head = '<div class="pp-head"><span class="pcode">' + esc(prog.code) + "</span><h2>" + esc(P(prog.name)) + '</h2><p class="deg">' + esc(P(prog.degree)) + "</p>" + facts(prog, d) + "</div>";
        var parts = [];
        parts.push(["about", T("prog.about", "Philosophy and aims"), '<p class="pp-lead">' + esc(P(d.philosophy)) + "</p><h3>" + T("prog.objectives", "What graduates gain") + "</h3>" + list(d.objectives)]);
        if (phd) {
          parts.push(["plans", T("prog.plans", "Study plans and credits"), '<div class="pp-plans">' + d.plans.map(function (pl) {
            return '<div class="pp-pl"><h3>' + esc(pl.plan) + "</h3><p>" + esc(P(pl.entry)) + "<br>" + esc(P(pl.duration)) + "</p>" + structureBar(pl.structure, pl.total) +
              '<p class="pp-note">' + g("noncredit") + ": " + pl.noncredit.join(", ") + "</p></div>";
          }).join("") + '</div><p class="pp-note">' + esc(P(d.plansNote)) + "</p>"]);
          parts.push(["courses", T("prog.courses", "Courses"), '<p class="pp-note">' + T("prog.tapCourse", "Select a course to read its description.") + "</p>" + courses(d.groups, ["required", "elective", "dissertation", "noncredit"])]);
        } else {
          var tr = d.tracks[id];
          parts.push(["credits", T("prog.structure", "Credits"), structureBar(tr.structure, tr.total)]);
          parts.push(["plan", T("prog.studyPlan", "Study plan by semester"), studyPlan(c.curriculum[id])]);
          parts.push(["courses", T("prog.courses", "Courses"), '<p class="pp-note">' + T("prog.tapCourse", "Select a course to read its description.") + "</p>" + courses(tr.groups, ["core", "major", "elective", "thesis"], { elective: tr.electiveNote })]);
        }
        parts.push(["outcomes", T("prog.outcomes", "Learning outcomes"), outcomes(d.outcomes) + "<h3>" + T("prog.byYear", "By year") + "</h3>" + years(d.years, d.yearsNote)]);
        parts.push(["thesis", phd ? T("prog.dissReq", "Dissertation and qualifying examination") : T("prog.thesisReq", "Thesis"), reqs(d.requirements)]);
        parts.push(["sites", T("prog.sites", "Where students train"), sites(d.facilities)]);
        parts.push(["careers", T("prog.careers", "Careers"), careers(d.careers)]);
        parts.push(["quality", T("prog.quality", "Teaching quality"), '<p class="pp-lead">' + esc(P(d.quality)) + "</p>"]);
        panel.innerHTML = head + toc(parts) + parts.map(function (x) { return sec(x[0], x[1], x[2]); }).join("");
      }
      tabs.forEach(function (b, i) {
        b.addEventListener("click", function () { show(b.dataset.p); history.replaceState(null, "", "#" + b.dataset.p); });
        b.addEventListener("keydown", function (e) {
          var k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!k) return;
          var n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); show(n.dataset.p); history.replaceState(null, "", "#" + n.dataset.p);
        });
      });
      // programs.html#clinical, #cosmetic or #phd opens that tab (the program cards and the menu link here)
      function fromHash() { var m = location.hash.match(/^#(clinical|cosmetic|phd)$/); show(m ? m[1] : "clinical"); }
      fromHash();
      window.addEventListener("hashchange", fromHash);
    });
  }

  if (page === "admissions") {
    C.loadContent().then(function (c) {
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
          return '<a class="dl" href="' + url(d.url) + '" target="_blank" rel="noopener"><span class="t">' + esc(P(d.title)) + '</span><span class="k">' + C.icon(folder ? "folder" : "file") + (folder ? T("ui.folder", "Folder") : "PDF") + "</span></a>";
        }).join("") + "</div>";
      }).join("");
    });
  }
})();
