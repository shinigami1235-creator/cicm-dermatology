/* Layout switcher for comparing the proof-of-concept options. Remove once a design is chosen. */
(function () {
  "use strict";
  var d = document.documentElement.dataset, th = window.CICM_LANG === "th";
  var page = (location.pathname.match(/(?:^|\/)(?:atlas-|book-)?(research|faculty|admissions)\.html$/) || [])[1] || "index";
  var DESIGN = [["skin", th ? "ชั้นผิว" : "Skin layers"], ["atlas", th ? "แผ่นภาพแอตลาส" : "Atlas plates"], ["book", th ? "สมุดหลักสูตร" : "Program book"]];
  var OPEN = [["type", th ? "ตัวอักษร" : "DERMA / TOLOGY"], ["slide", th ? "สไลด์" : "Microscope slide"], ["lens", th ? "เลนส์" : "Lens"]];
  var STAFF = [["spotlight", th ? "สปอตไลต์" : "Spotlight"], ["masthead", th ? "รายชื่อ" : "Name list"], ["deck", th ? "สำรับการ์ด" : "Card deck"]];
  function designHref(k) {
    var f = k === "skin" ? page + ".html" : k + (page === "index" ? "" : "-" + page) + ".html";
    return f + location.search;
  }
  function link(key, val, label, cur) {
    var u = new URL(location.href); u.searchParams.set(key, val); u.hash = key === "staff" ? "faculty" : "";
    return '<a href="' + u.pathname + u.search + u.hash + '" aria-current="' + (cur === val) + '">' + label + "</a>";
  }
  var cur = d.design || "skin";
  var html = "<p>" + (th ? "ดีไซน์" : "Design") + '</p><div class="pick-row">' +
    DESIGN.map(function (o) { return '<a href="' + designHref(o[0]) + '" aria-current="' + (cur === o[0]) + '">' + o[1] + "</a>"; }).join("") + "</div>";
  if (cur === "skin" && page === "index") {
    html += "<p>" + (th ? "หน้าแรก" : "Opening") + '</p><div class="pick-row">' + OPEN.map(function (o) { return link("hero", o[0], o[1], d.hero); }).join("") + "</div>" +
      "<p>" + (th ? "คณาจารย์" : "Faculty") + '</p><div class="pick-row">' + STAFF.map(function (o) { return link("staff", o[0], o[1], d.staff); }).join("") + "</div>";
  }
  var box = document.createElement("div");
  box.className = "pick";
  box.innerHTML = '<div class="pick-panel" id="pickPanel" hidden>' + html + "</div>" +
    '<button class="pick-toggle" type="button" aria-expanded="false" aria-controls="pickPanel" title="' + (th ? "เลือกรูปแบบ" : "Compare layouts") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>' + (th ? "เลือกรูปแบบ" : "Compare layouts") + "</span></button>";
  document.body.appendChild(box);
  var btn = box.querySelector(".pick-toggle"), panel = box.querySelector(".pick-panel");
  btn.addEventListener("click", function () { var o = btn.getAttribute("aria-expanded") === "true"; btn.setAttribute("aria-expanded", String(!o)); panel.hidden = o; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { btn.setAttribute("aria-expanded", "false"); panel.hidden = true; } });
})();
