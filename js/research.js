/* Research page: filters over data/publications.json */
(function () {
  "use strict";
  var C = window.CICM, T = window.t, lang = window.CICM_LANG;
  var $ = function (s) { return document.querySelector(s); };
  var NAMES = {};   // PubMed name -> full name, from the permanent lecturers in content.json
  var DESIGNS = ["Randomized Controlled Trial", "Clinical Trial", "Meta-Analysis", "Systematic Review", "Review", "Case Reports", "Book chapter"];

  /* Where every paper and number on this page comes from, with links, so readers can check them */
  function sourcesHTML(c) {
    var th = lang === "th";
    var day = function (iso) { var d = new Date(iso + "T00:00:00"); return d.toLocaleDateString(th ? "th-TH" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); };
    var a = function (href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>"; };
    var rows = th ? [
      [a("https://pubmed.ncbi.nlm.nih.gov/", "PubMed"), "ของห้องสมุดแพทยศาสตร์แห่งชาติสหรัฐฯ (NCBI) ค้นหาตามชื่ออาจารย์แต่ละท่านเมื่อ " + day("2026-10-03")],
      [a("https://onlinelibrary.wiley.com/", "Wiley Online Library"), "บทความในวารสารของ Wiley ค้นหาตามชื่ออาจารย์ผ่าน " + a("https://www.crossref.org/", "Crossref") + " เมื่อ " + day("2026-11-16")],
      [a("https://openalex.org/", "OpenAlex"), "ฐานข้อมูลงานวิจัยแบบเปิด ใช้นับจำนวนการอ้างอิงของทุกบทความ และเพิ่มผลงานที่ไม่อยู่ใน PubMed เช่น บทในหนังสือ ค้นหาเมื่อ " + day("2026-11-16") + " OpenAlex นับการอ้างอิงจากแหล่งที่กว้างกว่า Scopus ตัวเลขจึงสูงกว่า"],
      [a("https://www.tci-thaijo.org/", "ThaiJO"), "วารสารไทยในฐานข้อมูล TCI เช่น Thai Journal of Dermatology และเวชบันทึกศิริราช ค้นหาตามชื่ออาจารย์เมื่อ " + day("2026-11-16")],
      [a("https://orcid.org/", "ORCID"), "รหัสประจำตัวนักวิจัยของอาจารย์แต่ละท่าน ลิงก์ไปยังประวัติผลงานที่อาจารย์ดูแลเอง"],
      [a("https://www.scopus.com/", "Scopus"), "จำนวนเอกสาร การอ้างอิง และ h-index ในตารางที่ 3 จากหน้าโปรไฟล์ Scopus ของอาจารย์" + (c.scopusUpdated ? " เมื่อ " + day(c.scopusUpdated) : "")]
    ] : [
      [a("https://pubmed.ncbi.nlm.nih.gov/", "PubMed"), ", from the US National Library of Medicine (NCBI), was searched by each lecturer's name on " + day("2026-10-03") + "."],
      [a("https://onlinelibrary.wiley.com/", "Wiley Online Library"), "was searched by lecturer through " + a("https://www.crossref.org/", "Crossref") + " on " + day("2026-11-16") + " for papers in Wiley journals."],
      [a("https://openalex.org/", "OpenAlex"), ", an open index of research, gives the citation count for every paper and adds work PubMed does not list, such as book chapters. Searched on " + day("2026-11-16") + ". OpenAlex counts citations from more sources than Scopus, so its numbers run higher."],
      [a("https://www.tci-thaijo.org/", "ThaiJO"), "covers Thai journals in the TCI index, such as the Thai Journal of Dermatology and Siriraj Medical Bulletin. Searched by lecturer on " + day("2026-11-16") + "."],
      [a("https://orcid.org/", "ORCID"), "is each lecturer's researcher ID and links to the record they keep themselves."],
      [a("https://www.scopus.com/", "Scopus"), "gives the documents, citations and h-index in Table 3, from each lecturer's Scopus profile" + (c.scopusUpdated ? " on " + day(c.scopusUpdated) : "") + "."]
    ];
    return "<h2>" + (th ? "ที่มาของข้อมูล" : "Sources") + "</h2><ul>" + rows.map(function (r) { return "<li><b>" + r[0] + "</b>" + (r[1].charAt(0) === "," ? "" : " ") + r[1] + "</li>"; }).join("") + "</ul><p>" +
      (th ? "ไม่รวมบทคัดย่อการประชุม การลงทะเบียนงานวิจัย ฉบับก่อนตีพิมพ์ (preprint) และคำแก้ไขบทความ หากพบบทความที่ขาดไป แจ้งได้ที่ "
          : "Meeting abstracts, trial registrations, preprints and corrections are left out. Write to ") +
      '<a href="mailto:derm.admission@gmail.com">derm.admission@gmail.com</a>' + (th ? "" : " to add a missing paper.") + "</p>";
  }

  Promise.all([C.loadPapers(), C.loadContent()]).then(function (r) {
    var data = r[0], papers = data.papers, s = C.stats(papers);
    r[1].faculty.forEach(function (f) { if (f.pubmed) NAMES[f.pubmed] = f.name; });
    $("#volRange").textContent = window.CICM.sources(s) + ", " + s.y0 + (lang === "th" ? " ถึง " : " to ") + s.y1;
    $("#researchLede").textContent = C.researchLede(s);
    $("#journalTable").innerHTML = C.journalTable(papers, 8);
    $("#scopusTable").innerHTML = C.scopusTable(r[1]);
    $("#openalexTable").innerHTML = C.openalexTable(r[1], papers);
    $("#sources").innerHTML = sourcesHTML(r[1]);
    var fig = $("#yearFig"); fig.innerHTML = C.yearFigure(papers); fig.classList.add("in");

    var q = $("#q"), fL = $("#fLect"), fY = $("#fYear"), fD = $("#fDesign"), fS = $("#fSort"), topicsEl = $("#topics");
    Object.keys(NAMES).forEach(function (k) {
      var n = papers.filter(function (p) { return p.faculty.indexOf(k) > -1; }).length;
      fL.insertAdjacentHTML("beforeend", '<option value="' + C.esc(k) + '">' + C.esc(NAMES[k]) + " (" + n + ")</option>");
    });
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
    if (params.get("sort") === "cited") fS.value = "cited";
    if (params.get("topic")) { topic = params.get("topic"); topicsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === topic)); }); }

    function match(p) {
      if (fL.value && p.faculty.indexOf(fL.value) < 0) return false;
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
      if (fS.value === "cited") list = list.slice().sort(function (a, b) { return (b.cites || 0) - (a.cites || 0) || b.year - a.year; });
      $("#count").textContent = lang === "th" ? list.length + " บทความ" : list.length + (list.length === 1 ? " paper" : " papers");
      $("#empty").hidden = list.length > 0;
      $("#results").innerHTML = list.map(function (p) { return C.refHTML(p, { topic: true }); }).join("");
    }
    function sync() {
      var u = new URL(location.href);
      ["lecturer", "q", "topic", "sort"].forEach(function (k) { u.searchParams.delete(k); });
      if (fS.value === "cited") u.searchParams.set("sort", "cited");
      if (fL.value) u.searchParams.set("lecturer", fL.value);
      if (q.value.trim()) u.searchParams.set("q", q.value.trim());
      if (topic) u.searchParams.set("topic", topic);
      history.replaceState(null, "", u);
    }
    var tm;
    q.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { render(); sync(); }, 140); });
    [fL, fY, fD, fS].forEach(function (el) { el.addEventListener("change", function () { render(); sync(); }); });
    $("#clear").addEventListener("click", function () {
      q.value = ""; fL.value = ""; fY.value = ""; fD.value = ""; fS.value = "new"; topic = "";
      topicsEl.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === "")); });
      render(); sync(); q.focus();
    });
    render();
  });
})();
