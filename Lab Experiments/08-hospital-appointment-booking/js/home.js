/* ==========================================================================
   home.js - lists the consulting doctors on the home page, with the rating
   patients have given them.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const hospitalOf = id => DB.get("hospitals", id) || { name: "-", location: "-" };
  const rating = id => {
    const rows = DB.all("reviews").filter(r => String(r.doctorId) === String(id));
    return rows.length
      ? (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1) : null;
  };

  grid.innerHTML = DB.all("doctors").slice(0, 6).map(d => {
    const r = rating(d.id);
    return '<article class="tile">' +
      '<span class="tag">' + esc(d.specialty) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(d.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(d.qualification) + "</p>" +
      '<p class="meta">' + esc(hospitalOf(d.hospitalId).name) + ", " +
        esc(hospitalOf(d.hospitalId).location) + "<br>" + esc(d.days) + "</p>" +
      '<div class="row"><span class="price">' + money(d.fee) + "</span>" +
      (r ? '<span class="tag ok">' + r + " / 5</span>" : '<span class="tag mute">new</span>') +
      "</div></article>";
  }).join("");
})();
