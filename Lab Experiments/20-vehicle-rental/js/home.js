/* ==========================================================================
   home.js - the real fleet on the home page.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;
  const rating = id => {
    const rows = DB.all("reviews").filter(r => String(r.vehicleId) === String(id));
    return rows.length ? (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1) : null;
  };
  const rows = DB.all("vehicles").filter(v => v.available === "Yes").slice(0, 6);
  grid.innerHTML = rows.map(v => {
    const r = rating(v.id);
    return '<article class="tile">' +
      '<span class="tag">' + esc(v.type) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(v.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(v.fuel) + " &middot; " + esc(v.transmission) +
        " &middot; " + esc(v.seats) + " seats</p>" +
      '<p class="meta">' + esc(v.location) + "</p>" +
      '<div class="row"><span class="price">' + money(v.rate) +
        '<span class="meta"> / day</span></span>' +
      (r ? '<span class="tag ok">' + r + " / 5</span>" : '<span class="tag mute">new</span>') +
    "</div></article>";
  }).join("");
})();
