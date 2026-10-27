/* ==========================================================================
   home.js - fills the "today's cakes" strip on the home page from the same
   menu the shop uses, so the public page is never out of date.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const cakes = DB.all("cakes").filter(c => c.available === "Yes").slice(0, 6);
  if (!cakes.length) {
    grid.innerHTML = '<p class="muted">The counter is being restocked.</p>';
    return;
  }

  grid.innerHTML = cakes.map(c =>
    '<article class="tile">' +
      '<span class="tag">' + esc(c.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(c.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(c.flavour) + "</p>" +
      '<p class="meta">' + esc(c.description) + "</p>" +
      '<div class="row"><span class="price">' + money(c.price) +
        '<span class="meta"> / kg</span></span>' +
      (c.eggless === "Yes" ? '<span class="tag ok">eggless</span>' : "") +
    "</div></article>").join("");
})();
