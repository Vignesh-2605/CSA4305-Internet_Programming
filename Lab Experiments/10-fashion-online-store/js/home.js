/* ==========================================================================
   home.js - puts the current styles on the home page, with today's sale
   price worked out the same way the shop does it.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const sale = p => Math.round(Number(p.price) * (100 - Number(p.sale || 0)) / 100);
  const off = p => Number(p.mrp) > 0
    ? Math.round((Number(p.mrp) - sale(p)) * 100 / Number(p.mrp)) : 0;

  /* show what is discounted first - that is what a shop would do */
  const items = DB.all("products").slice().sort((a, b) => Number(b.sale) - Number(a.sale)).slice(0, 6);

  grid.innerHTML = items.map(p =>
    '<article class="tile">' +
      '<span class="tag">' + esc(p.category) + " &middot; " + esc(p.type) + "</span>" +
      (Number(p.sale) > 0 ? ' <span class="tag warn">' + p.sale + "% off</span>" : "") +
      '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(p.brand) + "</p>" +
      '<p class="meta">Sizes ' + esc(p.sizes) + "</p>" +
      '<div class="row"><span class="price">' + money(sale(p)) + "</span>" +
      '<span class="meta"><s>' + money(p.mrp) + "</s> " + off(p) + "% off</span></div>" +
    "</article>").join("");
})();
