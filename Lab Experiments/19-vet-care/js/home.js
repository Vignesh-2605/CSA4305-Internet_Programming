/* ==========================================================================
   home.js - the real cure library on the home page.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;
  grid.innerHTML = DB.all("cures").slice(0, 6).map(c =>
    '<article class="tile">' +
      '<span class="tag">' + esc(c.species) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(c.disease) + "</h3>" +
      '<p class="meta"><b>Signs:</b> ' + esc(c.signs) + "</p>" +
      '<p class="meta"><b>Treatment:</b> ' + esc(c.treatment) + "</p>" +
    "</article>").join("");
})();
