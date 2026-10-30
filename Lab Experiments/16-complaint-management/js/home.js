/* ==========================================================================
   home.js - fills the home page from the live tables, so the page can never
   advertise a department or a notice the system does not actually have.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (grid) {
    grid.innerHTML = DB.all("departments").map(d =>
      '<article class="tile">' +
        '<span class="tag">' + d.sla + " day target</span>" +
        '<h3 style="margin-top:.55rem">' + esc(d.name) + "</h3>" +
        '<p class="meta" style="margin:0">' + esc(d.about) + "</p>" +
      "</article>").join("");
  }

  const news = document.getElementById("notice-list");
  if (news) {
    news.innerHTML = DB.all("notices").map(n =>
      '<article class="tile"><span class="tag">' + esc(n.on) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(n.title) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(n.body) + "</p></article>").join("");
  }

  const box = document.getElementById("office-box");
  if (box) {
    const s = DB.all("settings")[0] || {};
    box.innerHTML =
      "<li><b>Office</b>" + esc(s.office) + "</li>" +
      "<li><b>Helpline</b>" + esc(s.phone) + "</li>" +
      "<li><b>E-mail</b>" + esc(s.email) + "</li>" +
      "<li><b>Open</b>" + esc(s.hours) + "</li>";
  }

  const n = document.getElementById("stat-row");
  if (n) {
    const all = DB.all("complaints");
    const done = all.filter(c => c.status === "Resolved" || c.status === "Closed");
    n.innerHTML =
      '<div class="stat"><div class="n">' + all.length + '</div><div class="l">complaints registered</div></div>' +
      '<div class="stat"><div class="n">' + done.length + '</div><div class="l">resolved</div></div>' +
      '<div class="stat"><div class="n">' + DB.all("departments").length + '</div><div class="l">departments</div></div>' +
      '<div class="stat"><div class="n">' + DB.all("users").filter(u => u.role === "officer" && u.approved).length +
        '</div><div class="l">officers on duty</div></div>';
  }
})();
