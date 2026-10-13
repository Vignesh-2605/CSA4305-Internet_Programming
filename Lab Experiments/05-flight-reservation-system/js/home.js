/* ==========================================================================
   home.js - shows the flights on sale on the home page, with the lowest fare
   and live seat count taken from the same tables the booking screen uses.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const taken = (flightId, cls) => DB.all("tickets")
    .filter(t => String(t.flightId) === String(flightId) && t.cls === cls && t.status === "Confirmed")
    .reduce((n, t) => n + (t.passengers || []).length, 0);

  grid.innerHTML = DB.all("flights").map(f => {
    const fares = DB.all("fares").filter(x => String(x.flightId) === String(f.id));
    if (!fares.length) return "";
    const low = Math.min(...fares.map(x => Number(x.fare)));
    const free = fares.reduce((n, x) => n + (Number(x.seats) - taken(f.id, x.cls)), 0);
    return '<article class="tile">' +
      '<span class="tag">' + esc(f.airline) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(f.from) + " → " + esc(f.to) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(f.no) + " &middot; " + esc(f.aircraft) + "</p>" +
      '<p class="meta" style="margin:.3rem 0 0">' + esc(f.date) + " &middot; " +
        esc(f.dep) + " - " + esc(f.arr) + "</p>" +
      '<div class="row"><span class="price">from ' + money(low) + "</span>" +
      '<span class="tag ' + (free > 0 ? "ok" : "bad") + '">' +
      (free > 0 ? free + " seats left" : "sold out") + "</span></div></article>";
  }).join("");
})();
