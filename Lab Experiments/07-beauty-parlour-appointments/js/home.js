/* ==========================================================================
   home.js - puts the real price list on the home page, taken from the same
   service table the booking screen uses.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const services = DB.all("services").slice(0, 6);
  grid.innerHTML = services.map(s =>
    '<article class="tile">' +
      '<span class="tag">' + esc(s.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(s.name) + "</h3>" +
      '<p class="meta">' + esc(s.description) + "</p>" +
      '<div class="row"><span class="price">' + money(s.price) + "</span>" +
      '<span class="meta">' + esc(s.duration) + " minutes</span></div>" +
    "</article>").join("");
})();
