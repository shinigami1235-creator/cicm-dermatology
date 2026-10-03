/* CICM Dermatology site behaviour: language, data, nav tone, depth gauge, junctions, reveals, renderers. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = window.CICM_LANG;
  var T = window.t, P = window.pick;
  var CFG = window.CICM_CONFIG || {};
  var page = document.body.dataset.page;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(id) { return '<svg aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function fmtBaht(n) { return Number(n).toLocaleString("en-US"); }

  /* ---------- language ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    if (lang === "th") {
      $$("[data-i18n]").forEach(function (el) {
        var v = window.I18N.th[el.dataset.i18n];
        if (!v) return;
        if (v.indexOf("<br>") > -1) el.innerHTML = v; else el.textContent = v;
      });
      $$("[data-i18n-ph]").forEach(function (el) { var v = window.I18N.th[el.dataset.i18nPh]; if (v) el.placeholder = v; });
      $$("[data-i18n-label]").forEach(function (el) { var v = window.I18N.th[el.dataset.i18nLabel]; if (v) el.setAttribute("aria-label", v); });
    }
    $$(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
      b.addEventListener("click", function () {
        if (b.dataset.lang === lang) return;
        try { localStorage.setItem("cicm-lang", b.dataset.lang); } catch (e) {}
        var u = new URL(location.href); u.searchParams.delete("lang");
        if (b.dataset.lang === "th") u.searchParams.set("lang", "th");
        location.href = u.toString();
      });
    });
  }

  /* ---------- data ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    var head = (rows.shift() || []).map(function (h) { return h.trim().toLowerCase(); });
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); }).map(function (r) {
      var o = {}; head.forEach(function (h, k) { o[h] = (r[k] || "").trim(); }); return o;
    });
  }
  function sheetTab(tab) {
    var u = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(CFG.sheetId) + "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(tab);
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(parseCSV);
  }
  var contentP = null;
  function loadContent() {
    if (contentP) return contentP;
    contentP = fetch("data/content.json").then(function (r) { return r.json(); }).then(function (c) {
      if (!CFG.sheetId) return c;
      var tabs = CFG.tabs || {};
      return Promise.all([
        sheetTab(tabs.announcements || "announcements").catch(function () { return null; }),
        sheetTab(tabs.downloads || "downloads").catch(function () { return null; }),
        sheetTab(tabs.achievements || "achievements").catch(function () { return null; })
      ]).then(function (res) {
        if (res[0] && res[0].length) c.announcements = res[0].map(function (r) {
          return { date: r.date, tag: { en: r.tag_en, th: r.tag_th }, title: { en: r.title_en, th: r.title_th }, link: r.link, pinned: /^(y|yes|true|1)$/i.test(r.pinned || "") };
        });
        if (res[1] && res[1].length) c.downloads = res[1].map(function (r) { return { group: r.group, title: { en: r.title_en, th: r.title_th }, url: r.url }; });
        if (res[2] && res[2].length) c.achievements = res[2].map(function (r) { return { faculty: r.faculty_id, year: r.year, text: { en: r.text_en, th: r.text_th }, link: r.link }; });
        return c;
      });
    });
    return contentP;
  }
  var papersP = null;
  function loadPapers() {
    if (!papersP) papersP = fetch("data/publications.json").then(function (r) { return r.json(); });
    return papersP;
  }

  /* ---------- shared renderers ---------- */
  var FAC_KEYS = ["Meephansan J", "Juntongjin P", "Sirithanabadeekul P", "Nitayavardhana S", "Phadungsaksawasdi P"];
  function refHTML(p, opts) {
    opts = opts || {};
    var au = p.authors.slice();
    var shown = au.length > 8 ? au.slice(0, 6) : au;
    var extra = au.length > 8 ? au.slice(6).filter(function (a) { return FAC_KEYS.indexOf(a) > -1; }) : [];
    var auHTML = shown.map(function (a) { return FAC_KEYS.indexOf(a) > -1 ? "<b>" + esc(a) + "</b>" : esc(a); }).join(", ");
    if (au.length > 8) auHTML += (extra.length ? ", …, " + extra.map(function (a) { return "<b>" + esc(a) + "</b>"; }).join(", ") : "") + ", et al.";
    var href = p.doi ? "https://doi.org/" + p.doi : "https://pubmed.ncbi.nlm.nih.gov/" + p.pmid + "/";
    var badge = p.design ? '<span class="badge">' + esc(p.design) + "</span>" : "";
    return '<li class="ref"><div><a class="ttl" href="' + href + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" +
      '<div class="au">' + auHTML + "</div>" +
      '<div class="src"><i>' + esc(p.journal) + "</i><span class=\"tnum\">" + p.year + "</span>" + badge +
      (opts.topic ? '<span class="badge topic">' + esc(p.topic) + "</span>" : "") +
      '<a href="https://pubmed.ncbi.nlm.nih.gov/' + p.pmid + '/" target="_blank" rel="noopener">PMID ' + p.pmid + "</a></div></div></li>";
  }

  function yearFigure(papers) {
    var years = []; for (var y = 2011; y <= 2026; y++) years.push(y);
    var all = {}, rct = {};
    papers.forEach(function (p) { all[p.year] = (all[p.year] || 0) + 1; if (/Randomized|Clinical Trial/.test(p.design)) rct[p.year] = (rct[p.year] || 0) + 1; });
    var max = Math.max.apply(null, years.map(function (y) { return all[y] || 0; }));
    var top = Math.ceil(max / 5) * 5, W = 560, H = 230, L = 26, B = 22, bw = (W - L) / years.length;
    var s = '<svg viewBox="0 0 ' + W + " " + (H + B) + '" role="img" aria-label="Papers per year from 2011 to 2026">';
    for (var g = 0; g <= top; g += 5) { var gy = H - (g / top) * H; s += '<line class="grid" x1="' + L + '" x2="' + W + '" y1="' + gy + '" y2="' + gy + '"/><text class="axis" x="0" y="' + (gy + 4) + '">' + g + "</text>"; }
    years.forEach(function (y, i) {
      var n = all[y] || 0, r = rct[y] || 0, x = L + i * bw + 3, w = bw - 6, h = (n / top) * H, hr = (r / top) * H;
      s += '<g class="col" style="--i:' + i + '"><rect class="bar" x="' + x + '" y="' + (H - h) + '" width="' + w + '" height="' + h + '" rx="2"><title>' + y + ": " + n + "</title></rect>";
      if (r) s += '<rect class="bar rct" x="' + x + '" y="' + (H - hr) + '" width="' + w + '" height="' + hr + '" rx="2"/>';
      s += "</g>";
      if (i % 3 === 0 || y === 2026) s += '<text class="axis" x="' + (x + w / 2) + '" y="' + (H + 16) + '" text-anchor="middle">' + y + "</text>";
    });
    s += "</svg>";
    return s + '<figcaption class="legend"><b>' + T("research.fig", "Fig. 5") + "</b> " + T("research.figt", "Papers per year. The light part of each bar is randomized controlled trials.") + "</figcaption>";
  }

  function journalTable(papers, n) {
    var c = {}; papers.forEach(function (p) { c[p.journal] = (c[p.journal] || 0) + 1; });
    var rows = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); }).slice(0, n || 6);
    return '<caption><b>' + T("research.table", "Table 1") + "</b> " + T("research.tablet", "Journals with the most papers") + "</caption>" +
      "<thead><tr><th>" + T("research.journal", "Journal") + "</th><th>" + T("research.papers", "Papers") + "</th></tr></thead><tbody>" +
      rows.map(function (j) { return "<tr><td>" + esc(j) + "</td><td>" + c[j] + "</td></tr>"; }).join("") + "</tbody>";
  }

  function stats(papers) {
    var journals = {}; papers.forEach(function (p) { journals[p.journal] = 1; });
    return {
      n: papers.length,
      j: Object.keys(journals).length,
      rct: papers.filter(function (p) { return p.design === "Randomized Controlled Trial"; }).length,
      y0: Math.min.apply(null, papers.map(function (p) { return p.year; })),
      y1: Math.max.apply(null, papers.map(function (p) { return p.year; }))
    };
  }
  function researchLede(s) {
    if (lang === "th") return "อาจารย์และสมาชิกหลักสูตรมีบทความในฐานข้อมูล PubMed " + s.n + " บทความ ในวารสาร " + s.j + " ฉบับ รวมการทดลองแบบสุ่มมีกลุ่มควบคุม " + s.rct + " เรื่อง";
    return "Faculty and program members have " + s.n + " papers indexed in PubMed across " + s.j + " journals, including " + s.rct + " randomized controlled trials.";
  }

  window.CICM = { openZoom: function (g, i) { openZoom(g, i); }, loadContent: loadContent, loadPapers: loadPapers, refHTML: refHTML, yearFigure: yearFigure, journalTable: journalTable, stats: stats, researchLede: researchLede, esc: esc, icon: icon, FAC_KEYS: FAC_KEYS, reveal: function (el) { observe(el); } };

  /* ---------- reveals ----------
     A scroll check rather than an observer, so fast flicks and slow devices never leave content hidden. */
  var pending = [];
  function reveal(el) { el.classList.add("in"); el.classList.remove("pre"); if (el.classList.contains("junction")) junctionIn(el); }
  function checkReveal() {
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.9) { reveal(el); return false; }
      return true;
    });
  }
  function observe(root) {
    $$(".rise, .plate.pre, .junction", root || document).forEach(function (el) {
      if (reduce) { el.classList.add("in"); el.classList.remove("pre"); return; }
      if (pending.indexOf(el) < 0 && !el.classList.contains("in")) pending.push(el);
    });
    checkReveal();
  }
  var revTick = false;
  window.addEventListener("scroll", function () { if (!revTick) { revTick = true; requestAnimationFrame(function () { revTick = false; checkReveal(); }); } }, { passive: true });
  window.addEventListener("resize", checkReveal);

  /* ---------- junctions: the undulating dermal-epidermal border ---------- */
  function junctionPath(seed, amp) {
    var pts = [], N = 36, rnd = mulberry(seed);
    for (var i = 0; i <= N; i++) {
      var x = (i / N) * 1440;
      var y = 58 + amp * (0.55 * Math.sin(i * 0.95 + seed) + 0.3 * Math.sin(i * 2.3 + seed * 2) + 0.35 * (rnd() - 0.5));
      pts.push([x, y]);
    }
    var d = "M0,101 L0," + pts[0][1].toFixed(1);
    for (var k = 0; k < pts.length - 1; k++) {
      var p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d + " L1440,101 Z";
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function junctions() {
    $$(".junction").forEach(function (j, i) {
      var seed = 7 + i * 13;
      var flat = junctionPath(seed, 6), full = junctionPath(seed, 46);
      j.innerHTML = '<svg viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true"><path fill="' + j.dataset.to + '" d="' + (reduce ? full : flat) + '" style="fill:' + j.dataset.to + '"/></svg>';
      j.dataset.full = full;
    });
  }
  function junctionIn(j) { var p = $("path", j); if (p && j.dataset.full) p.setAttribute("d", j.dataset.full); }

  /* ---------- nav tone + depth gauge ---------- */
  var LAYERS = {
    surface: ["#0f0b0c", "#ffffff", "dark"], epi: ["#f2c4ae", "#3b1610", "light"], dermis: ["#b03a4c", "#fff1ee", "dark"],
    deep: ["#6e1430", "#ffe9ec", "dark"], vessel: ["#3c0a19", "#ffe9ec", "dark"], cell: ["#20112b", "#ecdff4", "dark"],
    "fat-pale": ["#fbefc0", "#3a2a06", "light"], fat: ["#f9d93d", "#2b1d05", "light"]
  };
  var DEPTH_NAMES = { surface: "Surface", epidermis: "Epidermis", papillary: "Papillary dermis", reticular: "Reticular dermis", plexus: "Deep vascular plexus", cell: "Cell level", subcutis: "Subcutis" };
  function fmtDepth(v) { return v < 1000 ? Math.round(v) + " µm" : (v / 1000).toFixed(1) + " mm"; }
  function navAndGauge() {
    var nav = $("#nav"), gauge = $("#gauge");
    var secs = $$("[data-layer]");
    if (!nav) return;
    var mark = gauge && $(".gauge-mark", gauge), read = gauge && $(".gauge-read", gauge), readB = read && $("b", read), readS = read && $("span", read);
    var lastTone = "", lastName = "";
    function frame() {
      var y = window.scrollY, vh = window.innerHeight, navLine = 70;
      nav.classList.toggle("is-solid", y > 30);
      var cur = secs[0], idx = 0;
      for (var i = 0; i < secs.length; i++) { if (secs[i].getBoundingClientRect().top <= navLine) { cur = secs[i]; idx = i; } }
      var L = LAYERS[cur.dataset.layer] || LAYERS.surface;
      var tone = cur.dataset.layer + (y > 30);
      if (tone !== lastTone) {
        nav.style.setProperty("--nav-bg", L[0]); nav.style.setProperty("--nav-ink", L[1]);
        nav.dataset.tone = (y > 30 || cur.dataset.layer !== "surface") ? L[2] : "dark";
        if (cur.dataset.layer === "surface" && y <= 30) nav.style.setProperty("--nav-ink", "#ffffff");
        lastTone = tone;
      }
      if (!gauge) return;
      // gauge reads the section at the middle of the screen
      var mid = vh * 0.2, gi = 0;
      for (var k = 0; k < secs.length; k++) { if (secs[k].getBoundingClientRect().top <= mid) gi = k; }
      var s = secs[gi], r = s.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      var d0 = s.dataset.depth, next = secs[gi + 1], d1 = next ? next.dataset.depth : d0;
      var text;
      if (d0 === "cell") text = "×400";
      else {
        var a = parseFloat(d0) || 0, b = (d1 === "cell" || d1 == null) ? a : parseFloat(d1);
        text = fmtDepth(a + (b - a) * p);
      }
      var nameKey = s.dataset.depthName || "surface";
      var name = T("depth." + nameKey, DEPTH_NAMES[nameKey] || "");
      var total = document.documentElement.scrollHeight - vh;
      var g = total > 0 ? y / total : 0;
      var trackH = gauge.clientHeight;
      gauge.style.setProperty("--y", (g * trackH).toFixed(1) + "px");
      gauge.style.setProperty("--gauge-ink", (LAYERS[s.dataset.layer] || LAYERS.surface)[1]);
      if (readB.textContent !== text) readB.textContent = text;
      if (name !== lastName) { readS.textContent = name; lastName = name; }
    }
    var ticking = false;
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    frame();
  }

  /* ---------- mobile menu ---------- */
  function menu() {
    var sheet = $("#sheet"), open = $(".nav .menu-btn");
    if (!sheet || !open) return;
    function set(v) {
      sheet.classList.toggle("is-open", v); sheet.setAttribute("aria-hidden", String(!v)); open.setAttribute("aria-expanded", String(v));
      document.body.style.overflow = v ? "hidden" : "";
      if (v) $("[data-close]", sheet).focus(); else open.focus();
    }
    open.addEventListener("click", function () { set(true); });
    $("[data-close]", sheet).addEventListener("click", function () { set(false); });
    $$("nav a", sheet).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("is-open")) set(false); });
  }
  function currentNav() {
    var map = { research: "research", faculty: "faculty", admissions: "admissions" };
    if (map[page]) $$('.nav-links a[data-nav="' + map[page] + '"]').forEach(function (a) { a.setAttribute("aria-current", "page"); });
  }

  /* ---------- hero film ---------- */
  function hero() {
    var v = $("#heroVideo");
    if (v) {
      var saveData = navigator.connection && navigator.connection.saveData;
      if (reduce || saveData) { v.removeAttribute("autoplay"); v.preload = "none"; }
      else {
        var vio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause(); }); });
        vio.observe(v);
      }
    }
    var dlg = $("#film"), btns = $$("[data-film]");
    if (dlg && btns.length) {
      var fv = $("video", dlg), src = $("source", fv);
      btns.forEach(function (btn) { btn.addEventListener("click", function () {
        if (!src.src) { src.src = src.dataset.src; fv.load(); }
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
        var pr = fv.play(); if (pr && pr.catch) pr.catch(function () {});
      }); });
      $("[data-close-film]", dlg).addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("close", function () { fv.pause(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    }
  }

  /* ---------- home renderers ---------- */
  function renderNotices(c) {
    var box = $("#notices"); if (!box) return;
    var list = c.announcements.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); }).slice(0, 4);
    box.innerHTML = list.map(function (n) {
      return '<a class="notice" href="' + esc(n.link || "admissions.html#downloads") + '"' + (/^https?:/.test(n.link || "") ? ' target="_blank" rel="noopener"' : "") + ' data-pinned="' + (!!n.pinned) + '">' +
        '<span class="tag">' + esc(P(n.tag)) + "</span><span class=\"t\">" + esc(P(n.title)) + "</span>" + icon("arrow") + "</a>";
    }).join("");
  }
  function renderPrograms(c) {
    var box = $("#programList"); if (!box) return;
    box.innerHTML = c.programs.map(function (p, i) {
      return '<article class="program rise" style="--d:' + (i * 70) + 'ms"><div><h3><small>' + esc(p.code) + "</small>" + esc(P(p.name)) + '</h3><p class="deg">' + esc(P(p.degree)) + "</p></div>" +
        "<p>" + esc(P(p.focus)) + "</p>" +
        "<dl><div><dt>" + T("ui.length", "Length") + "</dt><dd>" + esc(P(p.length)) + "</dd></div>" +
        "<div><dt>" + T("ui.fees", "Fees per semester") + '</dt><dd class="fee2"><span>' + T("ui.thai", "Thai students") + "</span><b>" + fmtBaht(p.fee.thai) + ' THB</b><span>' + T("ui.foreign", "Foreign students") + "</span><b>" + fmtBaht(p.fee.foreign) + " THB</b></dd></div></dl></article>";
    }).join("");
  }

  function renderReel(c, papers) {
    var box = $("#reel"); if (!box) return;
    var fac = c.faculty, cnt = {};
    papers.forEach(function (p) { p.faculty.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; }); });
    var i = 0, timer = null, DUR = 8000, paused = reduce;
    box.innerHTML = '<div class="reel-photo"><img alt="" src="' + fac[0].photo + '"></div>' +
      '<div class="reel-body"><div class="reel-swap" aria-live="polite"></div>' +
      '<div class="reel-nav"><button class="round" type="button" data-prev aria-label="' + T("ui.prev", "Previous") + '">' + icon("prev") + "</button>" +
      '<div class="reel-dots" role="group" aria-label="Lecturers">' + fac.map(function (f, k) { return '<button type="button" data-k="' + k + '" aria-label="' + esc(f.name) + '"><i></i></button>'; }).join("") + "</div>" +
      '<button class="round" type="button" data-next aria-label="' + T("ui.next", "Next") + '">' + icon("next") + "</button>" +
      '<button class="round" type="button" data-pause aria-label="' + T("ui.pause", "Pause rotation") + '">' + icon("pause") + "</button></div></div>";
    box.style.setProperty("--dur", DUR + "ms");
    var img = $(".reel-photo img", box), swap = $(".reel-swap", box), dots = $$(".reel-dots button", box), pbtn = $("[data-pause]", box);
    function body(f) {
      var who = [f.title, f.post].filter(Boolean).join(" · ");
      var n = f.pubmed ? cnt[f.pubmed] || 0 : 0;
      var ach = (c.achievements || []).filter(function (a) { return a.faculty === f.id; });
      return '<div class="who">' + esc(who) + "</div><h3>" + esc(f.name) + '</h3><div class="reel-cols"><div><h4>' + T("ui.edu", "Education") + '</h4><ul class="edu">' +
        f.education.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul></div><div>" +
        (f.expertise.length ? "<h4>" + T("ui.exp", "Expertise") + '</h4><ul class="chips">' + f.expertise.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
        (ach.length ? "<h4 style=\"margin-top:18px\">" + T("ui.ach", "Achievements") + '</h4><ul class="edu">' + ach.slice(0, 3).map(function (a) { return "<li><b>" + esc(a.year) + "</b> " + esc(P(a.text)) + "</li>"; }).join("") + "</ul>" : "") +
        (n ? '<p class="reel-stat"><b>' + n + "</b>" + T("ui.pubcount", "papers in PubMed") + "</p>" : "") + "</div></div>";
    }
    function show(k, first) {
      i = (k + fac.length) % fac.length;
      var f = fac[i];
      dots.forEach(function (d, j) { d.setAttribute("aria-current", String(j === i)); });
      // restart progress animation
      dots.forEach(function (d) { var el = $("i", d); el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; });
      if (first || reduce) { img.src = f.photo; img.alt = f.name; swap.innerHTML = body(f); return; }
      swap.classList.add("out"); img.classList.add("out");
      setTimeout(function () {
        img.src = f.photo; img.alt = f.name; swap.innerHTML = body(f);
        swap.classList.remove("out"); img.classList.remove("out");
      }, 260);
    }
    function schedule() { clearTimeout(timer); if (!paused && !hover) timer = setTimeout(function () { show(i + 1); schedule(); }, DUR); }
    var hover = false;
    box.addEventListener("mouseenter", function () { hover = true; box.classList.add("paused"); clearTimeout(timer); });
    box.addEventListener("mouseleave", function () { hover = false; if (!paused) box.classList.remove("paused"); schedule(); });
    box.addEventListener("focusin", function () { hover = true; box.classList.add("paused"); clearTimeout(timer); });
    box.addEventListener("focusout", function () { hover = false; if (!paused) box.classList.remove("paused"); schedule(); });
    $("[data-prev]", box).addEventListener("click", function () { show(i - 1); });
    $("[data-next]", box).addEventListener("click", function () { show(i + 1); });
    dots.forEach(function (d) { d.addEventListener("click", function () { show(+d.dataset.k); }); });
    function setPaused(v) {
      paused = v; box.classList.toggle("paused", v);
      pbtn.innerHTML = icon(v ? "play" : "pause");
      pbtn.setAttribute("aria-label", v ? T("ui.playreel", "Resume rotation") : T("ui.pause", "Pause rotation"));
      schedule();
    }
    pbtn.addEventListener("click", function () { setPaused(!paused); });
    show(0, true);
    setPaused(reduce);
    // only rotate while visible
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) clearTimeout(timer); else schedule(); }); }).observe(box);
  }
  function renderStaff(c) {
    var band = $("#staffBand"); if (!band) return;
    c.staff.forEach(function (s) {
      var d = document.createElement("div");
      d.className = "person";
      d.innerHTML = '<img src="' + s.photo + '" alt="" loading="lazy" width="64" height="70"><div><b>' + esc(s.name) + "</b><span>" + esc(P(s.role)) + "</span></div>";
      band.appendChild(d);
    });
  }
  function renderResearchHome(papers) {
    if (!$("#yearFig")) return;
    var s = stats(papers);
    $("#yearFig").innerHTML = yearFigure(papers);
    $("#journalTable").innerHTML = journalTable(papers, 7);
    var tc = {}; papers.forEach(function (p) { if (p.topic !== "Other medicine") tc[p.topic] = (tc[p.topic] || 0) + 1; });
    var topics = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; });
    $("#topicTable").innerHTML = "<caption><b>" + T("research.table2", "Table 2") + "</b> " + T("research.table2t", "Papers by topic") + "</caption><thead><tr><th>" + T("research.topic", "Topic") + "</th><th>" + T("research.papers", "Papers") + "</th></tr></thead><tbody>" +
      topics.map(function (t) { return '<tr><td><a href="research.html?topic=' + encodeURIComponent(t) + '">' + esc(t) + '</a></td><td><span class="tbar" style="--w:' + (tc[t] / tc[topics[0]] * 100).toFixed(0) + '%"></span>' + tc[t] + "</td></tr>"; }).join("") + "</tbody>";
    $("#researchLede").textContent = researchLede(s);
    $("#volRange").textContent = "PubMed, " + s.y0 + (lang === "th" ? " ถึง " : " to ") + s.y1;
    $("#allPapersLink").textContent = lang === "th" ? "ดูบทความทั้งหมด " + s.n + " เรื่อง" : "All " + s.n + " papers";
    var latest = papers.filter(function (p) { return p.faculty.length && p.topic !== "Other medicine"; }).slice(0, 5);
    $("#latestRefs").innerHTML = latest.map(function (p) { return refHTML(p); }).join("");
  }
  function facebook() {
    var box = $("#fb"); if (!box) return;
    function mount() {
      var w = Math.max(280, Math.min(500, Math.floor(box.clientWidth)));
      var href = encodeURIComponent(CFG.facebookPage || "https://www.facebook.com/profile.php?id=100064737292426");
      box.innerHTML = '<iframe title="CICM Dermatology on Facebook" loading="lazy" src="https://www.facebook.com/plugins/page.php?href=' + href + "&tabs=timeline&width=" + w + "&height=640&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false&locale=" + (lang === "th" ? "th_TH" : "en_US") + '" allow="encrypted-media; clipboard-write; web-share" style="height:640px"></iframe>';
      var note = document.createElement("p");
      note.className = "legend"; note.style.marginTop = "10px";
      note.textContent = T("life.fbblocked", "Some browsers block this feed. Open the page to read the latest posts.");
      box.parentNode.appendChild(note);
    }
    if ("IntersectionObserver" in window) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); mount(); } }, { rootMargin: "400px" }); o.observe(box); } else mount();
  }


  /* ---------- photo viewer ---------- */
  var zoomEl = null, zoomItems = [], zoomI = 0;
  function zoomBuild() {
    if (zoomEl) return;
    zoomEl = document.createElement("dialog");
    zoomEl.className = "zoom";
    zoomEl.setAttribute("aria-label", T("ui.viewer", "Photo viewer"));
    zoomEl.innerHTML = '<figure><img alt=""><figcaption><span class="zc"></span><span class="zn tnum"></span></figcaption></figure>' +
      '<button class="round z-close" type="button" aria-label="' + T("ui.close", "Close") + '">' + icon("close") + "</button>" +
      '<button class="round z-prev" type="button" aria-label="' + T("ui.prev", "Previous") + '">' + icon("prev") + "</button>" +
      '<button class="round z-next" type="button" aria-label="' + T("ui.next", "Next") + '">' + icon("next") + "</button>";
    document.body.appendChild(zoomEl);
    $(".z-close", zoomEl).addEventListener("click", function () { zoomEl.close(); });
    $(".z-prev", zoomEl).addEventListener("click", function () { zoomShow(zoomI - 1); });
    $(".z-next", zoomEl).addEventListener("click", function () { zoomShow(zoomI + 1); });
    zoomEl.addEventListener("click", function (e) { if (e.target === zoomEl) zoomEl.close(); });
    zoomEl.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") zoomShow(zoomI - 1); else if (e.key === "ArrowRight") zoomShow(zoomI + 1); });
    var sx = null;
    zoomEl.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    zoomEl.addEventListener("pointerup", function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) zoomShow(zoomI + (dx < 0 ? 1 : -1)); });
    zoomEl.addEventListener("close", function () { document.body.style.overflow = ""; });
  }
  function zoomShow(i) {
    zoomI = (i + zoomItems.length) % zoomItems.length;
    var it = zoomItems[zoomI], img = $("img", zoomEl);
    img.classList.add("swap");
    var pre = new Image(); pre.onload = function () { img.src = it.src; img.alt = it.cap; img.classList.remove("swap"); }; pre.src = it.src;
    $(".zc", zoomEl).textContent = it.cap;
    $(".zn", zoomEl).textContent = zoomItems.length > 1 ? (zoomI + 1) + " / " + zoomItems.length : "";
    zoomEl.classList.toggle("single", zoomItems.length < 2);
  }
  function openZoom(group, i) {
    zoomBuild();
    zoomItems = $$('[data-zoom="' + group + '"]').map(function (a) { return { src: a.getAttribute("href"), cap: a.dataset.caption || "" }; });
    if (!zoomItems.length) return;
    zoomShow(i || 0);
    if (zoomEl.showModal) zoomEl.showModal(); else zoomEl.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  }
  // figures and photos on the page open in the viewer
  function zoomables() {
    [[".plate", "training"], [".life figure", "life"]].forEach(function (pair) {
      $$(pair[0]).forEach(function (fig, k) {
        var img = $("img", fig); if (!img || fig.dataset.zoomed) return;
        fig.dataset.zoomed = "1";
        var full = img.getAttribute("src").replace(/-sm\.webp$/, ".webp");
        var cap = ($("figcaption", fig) || {}).textContent || img.alt;
        var a = document.createElement("a"); a.hidden = true; a.href = full; a.dataset.zoom = pair[1]; a.dataset.caption = cap.trim();
        fig.appendChild(a);
        var b = document.createElement("button"); b.type = "button"; b.className = "zoom-hit"; b.setAttribute("aria-label", (T("ui.enlarge", "Enlarge photo")) + ": " + img.alt);
        b.addEventListener("click", function () { openZoom(pair[1], k); });
        ($(".ph", fig) || fig).appendChild(b);
      });
    });
  }

  /* ---------- boot ---------- */
  applyLang();
  currentNav();
  menu();
  junctions();
  navAndGauge();
  hero();
  observe();
  zoomables();

  if (page === "home") {
    Promise.all([loadContent(), loadPapers()]).then(function (r) {
      var c = r[0], papers = r[1].papers;
      renderNotices(c); renderPrograms(c); renderReel(c, papers); renderStaff(c); renderResearchHome(papers);
      observe($("#programList"));
    }).catch(function (e) { console.error(e); });
    facebook();
  }
  document.dispatchEvent(new CustomEvent("cicm:ready"));
})();
