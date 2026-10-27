/* ==========================================================================
   home.js - puts the real catalogue on the home page: the categories the
   store sells and a few products with their current prices.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const off = p => Number(p.mrp) > Number(p.price)
    ? Math.round((Number(p.mrp) - Number(p.price)) * 100 / Number(p.mrp)) : 0;

  /* categories first, as a strip of chips above the products */
  const cats = DB.all("categories");
  const chips = document.getElementById("category-chips");
  if (chips) {
    chips.innerHTML = cats.map(c =>
      '<span class="tag" style="margin:.2rem .3rem .2rem 0">' + esc(c.name) +
      '<span class="meta"> &middot; ' + esc(String(c.subcategories).split(",").length) +
      " sub</span></span>").join("");
  }

  grid.innerHTML = DB.all("products").slice(0, 6).map(p =>
    '<article class="tile">' +
      '<span class="tag">' + esc(p.subcategory || p.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(p.brand) + "</p>" +
      '<p class="meta">' + esc(p.description) + "</p>" +
      '<div class="row"><span class="price">' + money(p.price) + "</span>" +
      (off(p) ? '<span class="tag ok">' + off(p) + "% off</span>"
              : '<span class="meta">' + (Number(p.stock) ? "in stock" : "out of stock") + "</span>") +
    "</div></article>").join("");
})();
