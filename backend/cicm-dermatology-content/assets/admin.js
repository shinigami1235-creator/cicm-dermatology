/* Rows: add, remove, move; the row title follows its first field; photo and file fields open the media library. */
(function ($) {
  "use strict";
  var n = 0;
  $(document).on("click", ".cicm-add", function () {
    var form = $(this).closest("form"), html = form.find("template.cicm-tpl").html().replace(/__i__/g, "new" + Date.now() + "_" + n++);
    var row = $(html).appendTo(form.find(".cicm-rows"));
    row.find("input, textarea").first().trigger("focus");
  });
  $(document).on("click", ".cicm-del", function (e) {
    e.preventDefault();
    var row = $(this).closest(".cicm-row");
    if (window.confirm("Remove " + row.find(".cicm-title").text() + "? It goes when you save.")) row.remove();
  });
  $(document).on("click", ".cicm-up, .cicm-down", function (e) {
    e.preventDefault();
    var row = $(this).closest(".cicm-row");
    if ($(this).hasClass("cicm-up")) row.prev(".cicm-row").before(row); else row.next(".cicm-row").after(row);
  });
  $(document).on("input", ".cicm-title-src", function () {
    $(this).closest(".cicm-row").find(".cicm-title").first().text(this.value || "New");
  });
  $(document).on("click", ".cicm-pick", function (e) {
    e.preventDefault();
    var input = $(this).siblings("input");
    var frame = wp.media({ title: "Choose a file", multiple: false });
    frame.on("select", function () { input.val(frame.state().get("selection").first().toJSON().url).trigger("change"); });
    frame.open();
  });
  // warn before leaving with unsaved edits
  var dirty = false;
  $(document).on("input change", ".cicm-form :input", function () { dirty = true; });
  $(document).on("submit", ".cicm-form", function () { dirty = false; });
  $(window).on("beforeunload", function () { if (dirty) return true; });
})(jQuery);
