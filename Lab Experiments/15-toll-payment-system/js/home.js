/* ==========================================================================
   home.js - puts the real plaza list and rates on the home page, from the
   same table the gates charge from.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  grid.innerHTML = DB.all("tolls").slice(0, 6).map(t =>
    '<article class="tile">' +
      '<span class="tag">' + esc(t.highway) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(t.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(t.location) + "</p>" +
      '<ul class="contact-list" style="margin-top:.6rem">' +
        "<li><b>Car, jeep, van</b>" + money(t.carRate) + "</li>" +
        "<li><b>Light commercial</b>" + money(t.lcvRate) + "</li>" +
        "<li><b>Bus or truck</b>" + money(t.hcvRate) + "</li>" +
      "</ul></article>").join("");
})();
