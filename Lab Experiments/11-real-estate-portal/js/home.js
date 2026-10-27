/* ==========================================================================
   home.js - puts real listings on the home page, priced from the same table
   the search screen uses.
   ========================================================================== */

(function () {
  const grid = document.getElementById("preview-grid");
  if (!grid) return;

  const inr = n => {
    n = Number(n || 0);
    if (n >= 10000000) return "Rs." + (n / 10000000).toFixed(2).replace(/\.00$/, "") + " cr";
    if (n >= 100000) return "Rs." + (n / 100000).toFixed(2).replace(/\.00$/, "") + " lakh";
    return money(n);
  };

  const rows = DB.all("properties").filter(p => p.status === "Available").slice(0, 6);
  grid.innerHTML = rows.map(p =>
    '<article class="tile">' +
      '<span class="tag">' + (p.purpose === "Rent" ? "To rent" : "For sale") +
        " &middot; " + esc(p.type) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(p.title) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(p.locality) + ", " + esc(p.city) + "</p>" +
      '<p class="meta">' + p.bedrooms + " bed &middot; " + p.bathrooms + " bath &middot; " +
        p.areaSqft + " sq ft</p>" +
      '<div class="row"><span class="price">' + inr(p.price) +
        (p.purpose === "Rent" ? '<span class="meta"> / month</span>' : "") + "</span>" +
      '<span class="meta">' + money(Math.round(Number(p.price) / Math.max(1, Number(p.areaSqft)))) +
      " / sq ft</span></div></article>").join("");
})();
