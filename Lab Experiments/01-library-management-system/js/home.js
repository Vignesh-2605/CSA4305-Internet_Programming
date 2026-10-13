/* ==========================================================================
   home.js - fills the "in the catalogue" strip on the home page
   It reads the same catalogue the members search, so the public page always
   shows what is really on the shelves.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const books = DB.all("books").slice(0, 6);
  if (!books.length) {
    grid.innerHTML = '<p class="muted">The catalogue is being updated.</p>';
    return;
  }

  grid.innerHTML = books.map(b => {
    const free = Number(b.available) > 0;
    return '<article class="tile">' +
      '<span class="tag">' + esc(b.category) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(b.title) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(b.author) + "</p>" +
      '<div class="row"><span class="meta">Shelf ' + esc(b.shelf) + "</span>" +
      '<span class="tag ' + (free ? "ok" : "bad") + '">' +
      (free ? b.available + " on the shelf" : "all copies out") + "</span></div>" +
      "</article>";
  }).join("");
})();
