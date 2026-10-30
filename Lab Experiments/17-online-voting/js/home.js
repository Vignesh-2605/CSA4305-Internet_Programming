/* ==========================================================================
   home.js - shows the real elections on the home page.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const cands = id => DB.all("candidates").filter(c => String(c.electionId) === String(id));
  const rows = DB.all("elections").slice(0, 6);

  grid.innerHTML = rows.map(e =>
    '<article class="tile">' +
      '<span class="tag ' + (e.status === "Open" ? "ok" : e.status === "Closed" ? "mute" : "warn") +
      '">' + esc(e.status.toLowerCase()) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(e.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(e.type) + " &middot; " + esc(e.ward) + "</p>" +
      '<p class="meta">' + esc(e.question || "") + "</p>" +
      '<div class="row"><span class="meta">Polling day ' + esc(e.date) + "</span>" +
      '<span class="tag">' + cands(e.id).length + " standing</span></div>" +
    "</article>").join("");
})();
