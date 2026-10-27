/* ==========================================================================
   home.js - puts real gifts on the home page, from the same catalogue the
   shop screen reads, so prices are never out of date.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const rows = DB.all("products").filter(p => Number(p.stock) > 0).slice(0, 6);
  grid.innerHTML = rows.map(p =>
    '<article class="tile">' +
      '<span class="tag">' + esc(p.occasion) + "</span>" +
      (p.sameDay === "Yes" ? ' <span class="tag ok">same day</span>' : "") +
      '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(p.category) + " &middot; " + esc(p.recipient) + "</p>" +
      '<p class="meta">' + esc(p.description) + "</p>" +
      '<div class="row"><span class="price">' + money(p.price) + "</span>" +
      '<span class="meta">' + esc(p.stock) + " available</span></div>" +
    "</article>").join("");
})();
