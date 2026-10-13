/* ==========================================================================
   home.js - shows the trains on offer this week on the home page, with the
   class wise fare taken from the same fare table the booking screen uses.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  grid.innerHTML = DB.all("trains").map(t => {
    const fares = DB.all("fares").filter(f => String(f.trainId) === String(t.id));
    const classes = fares.map(f =>
      '<span class="tag">' + esc(f.cls) + " " + money(f.fare) + "</span>").join(" ");
    return '<article class="tile">' +
      '<span class="tag">' + esc(t.zone) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(t.number) + " " + esc(t.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(t.from) + " → " + esc(t.to) + "</p>" +
      '<p class="meta" style="margin:.3rem 0 .6rem">via ' + esc(t.via) + "<br>" +
        esc(t.date) + " &middot; dep " + esc(t.depTime) + " &middot; arr " + esc(t.arrTime) + "</p>" +
      classes + "</article>";
  }).join("");
})();
