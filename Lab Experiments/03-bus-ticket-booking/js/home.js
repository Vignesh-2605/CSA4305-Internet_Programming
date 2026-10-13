/* ==========================================================================
   home.js - lists the services running this week on the home page, straight
   from the same bus table the booking screen uses.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const buses = DB.all("buses").slice(0, 6);
  const sold = id => DB.all("bookings")
    .filter(b => String(b.busId) === String(id) && b.status === "Confirmed")
    .reduce((n, b) => n + String(b.seats).split(",").filter(Boolean).length, 0);

  grid.innerHTML = buses.map(b => {
    const free = Number(b.totalSeats) - sold(b.id);
    return '<article class="tile">' +
      '<span class="tag">' + esc(b.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(b.from) + " → " + esc(b.to) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(b.name) + "</p>" +
      '<p class="meta" style="margin:.3rem 0 0">' + esc(b.date) + " &middot; dep " +
        esc(b.depTime) + " &middot; arr " + esc(b.arrTime) + "</p>" +
      '<div class="row"><span class="price">' + money(b.fare) + "</span>" +
      '<span class="tag ' + (free > 0 ? "ok" : "bad") + '">' +
      (free > 0 ? free + " seats free" : "sold out") + "</span></div></article>";
  }).join("");
})();
