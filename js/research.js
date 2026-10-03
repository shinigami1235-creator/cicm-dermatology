/* Research page: filters over data/publications.json */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, lang = window.CICM_LANG;
  var $ = function (s) { return document.querySelector(s); };
  var NAMES = { "Meephansan J": "Jitlada Meephansan", "Juntongjin P": "Premjit Juntongjin", "Sirithanabadeekul P": "Punyaphat Sirithanabadeekul", "Nitayavardhana S": "Sunatra Nitayavardhana", "Phadungsaksawasdi P": "Pawit Phadungsaksawasdi" };
  var DESIGNS = ["Randomized Controlled Trial", "Clinical Trial", "Meta-Analysis", "Systematic Review", "Review", "Case Reports"];

  C.loadPapers().then(function (data) {
    var papers = data.papers, s = C.stats(papers);
    $("#volRange").textContent = "PubMed, " + s.y0 + (lang === "th" ? " ถึง " : " to ") + s.y1;
    $("#researchLede").textContent = C.researchLede(s);
    $("#journalTable").innerHTML = C.journalTable(papers, 8);
    var fig = $("#yearFig"); fig.innerHTML = C.yearFigure(papers); fig.classList.add("in");

    var q = $("#q"), fL = $("#fLect"), fY = $("#fYear"), fD = $("#fDesign"), topicsEl = $("#topics");
    Object.keys(NAMES).forEach(function (k) {
      var n = papers.filter(function (p) { return p.faculty.indexOf(k) > -1; }).length;
      fL.insertAdjacentHTML("beforeend", '<option value="' + k + '">' + NAMES[k] + " (" + n + ")</option>");
    });
    fL.insertAdjacentHTML("beforeend", '<option value="_program">' + (lang === "th" ? "สมาชิกหลักสูตร" : "Program members") + "</option>");
    for (var y = s.y1; y >= s.y0; y--) { var ny = papers.filter(function (p) { return p.year === y; }).length; if (ny) fY.insertAdjacentHTML("beforeend", '<option value="' + y + '">' + y + " (" + ny + ")</option>"); }
    DESIGNS.forEach(function (d) { var nd = papers.filter(function (p) { return p.design === d; }).length; if (nd) fD.insertAdjacentHTML("beforeend", '<option value="' + d + '">' + d + " (" + nd + ")</option>"); });

    var tc = {}; papers.forEach(function (p) { tc[p.topic] = (tc[p.topic] || 0) + 1; });
    var topics = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; });
    var topic = "";
    topicsEl.innerHTML = '<li><button type="button" data-t="" aria-pressed="true">' + T("research.all", "All") + "<span>" + papers.length + "</span></button></li>" +
      topics.map(function (t) { return '<li><button type="button" data-t="' + C.esc(t) + '" aria-pressed="false">' + C.esc(t) + "<span>" + tc[t] + "</span></button></li>"; }).join("");
    topicsEl.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      topic = b.dataset.t;
      topicsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      render(); sync();
    });

    // deep links: ?lecturer=Meephansan%20J&topic=Acne
    var params = new URLSearchParams(location.search);
    if (params.get("lecturer")) fL.value = params.get("lecturer");
    if (params.get("q")) q.value = params.get("q");
    if (params.get("topic")) { topic = params.get("topic"); topicsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === topic)); }); }

    function match(p) {
      if (fL.value === "_program" && p.faculty.length) return false;
      if (fL.value && fL.value !== "_program" && p.faculty.indexOf(fL.value) < 0) return false;
      if (fY.value && String(p.year) !== fY.value) return false;
      if (fD.value && p.design !== fD.value) return false;
      if (topic && p.topic !== topic) return false;
      var term = q.value.trim().toLowerCase();
      if (term) {
        var hay = (p.title + " " + p.authors.join(" ") + " " + p.journal).toLowerCase();
        return term.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
      }
      return true;
    }
    function render() {
      var list = papers.filter(match);
      $("#count").textContent = lang === "th" ? list.length + " บทความ" : list.length + (list.length === 1 ? " paper" : " papers");
      $("#empty").hidden = list.length > 0;
      $("#results").innerHTML = list.map(function (p) { return C.refHTML(p, { topic: true }); }).join("");
    }
    function sync() {
      var u = new URL(location.href);
      ["lecturer", "q", "topic"].forEach(function (k) { u.searchParams.delete(k); });
      if (fL.value) u.searchParams.set("lecturer", fL.value);
      if (q.value.trim()) u.searchParams.set("q", q.value.trim());
      if (topic) u.searchParams.set("topic", topic);
      history.replaceState(null, "", u);
    }
    var tm;
    q.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { render(); sync(); }, 140); });
    [fL, fY, fD].forEach(function (el) { el.addEventListener("change", function () { render(); sync(); }); });
    $("#clear").addEventListener("click", function () {
      q.value = ""; fL.value = ""; fY.value = ""; fD.value = ""; topic = "";
      topicsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === "")); });
      render(); sync(); q.focus();
    });
    render();
  });
})();
