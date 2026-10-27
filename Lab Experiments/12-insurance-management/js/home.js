/* ==========================================================================
   home.js - shows the real plan list on the home page, cheapest first, from
   the same table the comparison screen reads.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const plans = DB.all("plans").slice().sort((a, b) => a.premium - b.premium).slice(0, 6);
  grid.innerHTML = plans.map(p =>
    '<article class="tile">' +
      '<span class="tag">' + esc(p.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(p.insurer) + "</p>" +
      '<p class="meta">' + esc(p.features) + "</p>" +
      '<div class="row"><span class="price">' + money(p.premium) +
        '<span class="meta"> / year</span></span>' +
      '<span class="meta">cover ' + money(p.cover) + "</span></div>" +
      '<p class="meta" style="margin:.4rem 0 0">Claims settled: ' + esc(p.claimRatio) + "%</p>" +
    "</article>").join("");
})();
