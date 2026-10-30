/* ==========================================================================
   home.js - the real market list on the home page.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;
  const who = e => (DB.all("users").find(u => u.email === e) || { name: e, village: "" });
  const rows = DB.all("products").filter(p => Number(p.stock) > 0).slice(0, 6);
  grid.innerHTML = rows.map(p =>
    '<article class="tile">' +
      '<span class="tag">' + esc(p.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(who(p.farmer).name) + ", " +
        esc(who(p.farmer).village || "-") + "</p>" +
      '<p class="meta">' + esc(p.description) + "</p>" +
      '<div class="row"><span class="price">' + money(p.price) +
        '<span class="meta"> / ' + esc(p.unit) + "</span></span>" +
      '<span class="meta">' + esc(p.stock) + " in stock</span></div>" +
    "</article>").join("");
})();
