/* ==========================================================================
   home.js - fills the "our rooms" strip on the home page from the live
   tariff table, so the public page always shows the current rooms and rates.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  grid.innerHTML = DB.all("roomTypes").map(r =>
    '<article class="tile">' +
      "<h3>" + esc(r.type) + "</h3>" +
      '<p class="meta">' + esc(r.about) + "</p>" +
      '<p class="meta" style="margin:.4rem 0 0">' + esc(r.amenities) + "</p>" +
      '<div class="row">' +
        '<span class="price">' + money(r.price) + '<span class="meta"> / night</span></span>' +
        '<span class="tag">sleeps ' + esc(r.maxGuests) + "</span>" +
      "</div>" +
    "</article>").join("");
})();
