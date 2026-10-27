/* ==========================================================================
   home.js - shows what members are actually selling right now, from the same
   listing table the browse screen reads.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const catName = id => (DB.get("categories", id) || { name: "-" }).name;
  const rows = DB.all("listings").filter(l => l.status === "Live").slice(-6).reverse();

  if (!rows.length) {
    grid.innerHTML = '<p class="muted">Nothing is listed at the moment.</p>';
    return;
  }

  grid.innerHTML = rows.map(l =>
    '<article class="tile">' +
      '<span class="tag">' + esc(catName(l.categoryId)) + "</span>" +
      ' <span class="tag mute">' + esc(l.condition) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(l.title) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(l.location) + "</p>" +
      '<p class="meta">' + esc(l.description) + "</p>" +
      '<div class="row"><span class="price">' + money(l.price) + "</span>" +
      (l.negotiable === "Yes" ? '<span class="tag">offers welcome</span>'
                              : '<span class="meta">fixed price</span>') +
    "</div></article>").join("");
})();
