/* ==========================================================================
   user.js - a member, who both buys and sells
   Modules: browse, my listings, offers, my deals, watchlist, feedback, account.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- marketplace rules shared by both consoles ------------------------ */
const LOGISTICS = ["Paid", "Shipped", "Received"];

const listingOf = id => DB.get("listings", id) ||
  { title: "(removed)", price: 0, seller: "-", categoryId: 0 };
const categoryOf = id => (DB.get("categories", id) || { name: "-" }).name;
const nameOf = email => (DB.all("users").find(u => u.email === email) || { name: email }).name;

const liveListings = () => DB.all("listings").filter(l => l.status === "Live");

/* offers still waiting for the seller to decide */
const pendingOffers = listingId => DB.all("offers")
  .filter(o => String(o.listingId) === String(listingId) && o.status === "Pending");

/* what a member is rated, from the feedback left about them */
function ratingOf(email) {
  const rows = DB.all("feedback").filter(f => f.about === email);
  if (!rows.length) return null;
  return (rows.reduce((s, f) => s + Number(f.rating), 0) / rows.length).toFixed(1);
}

const listTag = s => '<span class="tag ' +
  (s === "Live" ? "ok" : s === "Sold" ? "mute" : "bad") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

const offerTag = s => '<span class="tag ' +
  (s === "Accepted" ? "ok" : s === "Pending" ? "warn" : "bad") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

const moveTag = s => '<span class="tag ' +
  (s === "Received" ? "ok" : s === "Shipped" ? "warn" : "") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

/* selling the item: close the listing and turn the deal into an order */
function completeSale(listing, buyer, amount, logistics) {
  DB.update("listings", listing.id, { status: "Sold", soldFor: amount, soldOn: today() });
  pendingOffers(listing.id).forEach(o =>
    DB.update("offers", o.id, { status: "Rejected", note: "The item went to another buyer" }));
  return DB.insert("orders", {
    listingId: listing.id, buyer: buyer, seller: listing.seller,
    amount: Number(amount), logistics: logistics,
    status: "Paid", date: today()
  });
}

let openListing = null;
let editListing = null;

const myListings = () => DB.all("listings").filter(l => l.seller === SESSION.email);
const myWatch = () => DB.all("favourites").filter(f => f.user === SESSION.email);
const myBuys = () => DB.all("orders").filter(o => o.buyer === SESSION.email);
const mySales = () => DB.all("orders").filter(o => o.seller === SESSION.email);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "browse", label: "Browse", type: "custom",
    desc: "Everything members are selling right now.",
    render(host) {
      const cats = DB.all("categories");
      const card = Dash.card(
        "<h3>Find something</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Category</label><select id="cat"><option value="">All categories</option>' +
        cats.map(c => '<option value="' + c.id + '">' + esc(c.name) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Condition</label><select id="co"><option value="">Any</option>' +
        '    <option>Like new</option><option>Good</option><option>Fair</option></select></div>' +
        '  <div class="field"><label>Up to (Rs.)</label><input type="number" id="max" placeholder="any"></div>' +
        '  <div class="field"><label>Where</label><input id="loc" placeholder="area"></div>' +
        '  <div class="field"><label>Search</label><input id="q" placeholder="what are you after"></div>' +
        '  <div class="field"><label>Sort</label><select id="sort">' +
        '    <option value="">Newest first</option><option value="low">Cheapest first</option>' +
        '    <option value="high">Dearest first</option></select></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const co = card.querySelector("#co").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const loc = card.querySelector("#loc").value.toLowerCase().trim();
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const sort = card.querySelector("#sort").value;

        let rows = liveListings().filter(l =>
          (!cat || String(l.categoryId) === cat) &&
          (!co || l.condition === co) && Number(l.price) <= max &&
          (!loc || l.location.toLowerCase().includes(loc)) &&
          (!q || (l.title + l.description).toLowerCase().includes(q)));
        if (sort === "low") rows = rows.slice().sort((a, b) => a.price - b.price);
        else if (sort === "high") rows = rows.slice().sort((a, b) => b.price - a.price);
        else rows = rows.slice().reverse();

        out.innerHTML = '<p class="muted">' + rows.length + " item(s) for sale.</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(l => {
          const mine = l.seller === SESSION.email;
          const watched = myWatch().some(f => String(f.listingId) === String(l.id));
          const r = ratingOf(l.seller);
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(categoryOf(l.categoryId)) + "</span>" +
            ' <span class="tag mute">' + esc(l.condition) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(l.title) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(l.location) + " &middot; " +
              esc(nameOf(l.seller)) + (r ? " (" + r + "/5)" : "") + "</p>" +
            '<div class="row"><span class="price">' + money(l.price) + "</span>" +
            (l.negotiable === "Yes" ? '<span class="tag">offers welcome</span>'
                                    : '<span class="meta">fixed price</span>') + "</div>";

          const acts = document.createElement("div");
          acts.className = "form-actions";
          acts.style.marginTop = ".8rem";

          const det = document.createElement("button");
          det.className = "btn sm flat";
          det.textContent = openListing === l.id ? "Hide" : "Details";
          det.onclick = () => { openListing = openListing === l.id ? null : l.id; paint(); };
          acts.appendChild(det);

          if (!mine) {
            const buy = document.createElement("button");
            buy.className = "btn sm";
            buy.textContent = "Buy at " + money(l.price);
            buy.onclick = () => buyNow(l);
            acts.appendChild(buy);

            if (l.negotiable === "Yes") {
              const off = document.createElement("button");
              off.className = "btn sm flat";
              off.textContent = "Make an offer";
              off.onclick = () => makeOffer(l);
              acts.appendChild(off);
            }
            const w = document.createElement("button");
            w.className = "btn sm flat";
            w.textContent = watched ? "Watching" : "Watch";
            w.disabled = watched;
            w.onclick = () => {
              DB.insert("favourites", { user: SESSION.email, listingId: l.id, added: today() });
              Dash.toast("Added to your watchlist."); paint();
            };
            acts.appendChild(w);
          } else {
            acts.insertAdjacentHTML("beforeend", '<span class="meta">your listing</span>');
          }
          t.appendChild(acts);

          if (openListing === l.id) {
            const d = document.createElement("div");
            d.style.marginTop = ".9rem";
            d.innerHTML = '<p class="meta">' + esc(l.description) + "</p>" +
              '<p class="meta">Photo: ' + esc(l.photo || "none") + " &middot; listed " +
              esc(l.postedOn) + "</p>";
            const offers = DB.all("offers").filter(o => String(o.listingId) === String(l.id));
            d.innerHTML += '<p class="meta">' + offers.length + " offer(s) made so far.</p>";
            t.appendChild(d);
          }
          grid.appendChild(t);
        });
      };

      ["#cat", "#co", "#sort"].forEach(s => card.querySelector(s).onchange = paint);
      ["#max", "#loc", "#q"].forEach(s => card.querySelector(s).oninput = paint);
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "sell", label: "Sell an Item", type: "custom",
    desc: "Put something up, change the price, or take it down.",
    render(host) {
      const values = editListing ? DB.get("listings", editListing) : {};
      const card = Dash.card("<h3>" + (editListing ? "Edit your listing" : "List something") + "</h3>");
      card.appendChild(Dash.form([
        { k: "title", l: "What is it", req: true, full: true },
        { k: "categoryId", l: "Category", t: "select", req: true,
          opts: DB.all("categories").map(c => ({ v: c.id, l: c.name })) },
        { k: "condition", l: "Condition", t: "select", opts: ["Like new", "Good", "Fair"] },
        { k: "price", l: "Asking price (Rs.)", t: "number", min: 1, req: true },
        { k: "negotiable", l: "Accept offers", t: "select", opts: ["Yes", "No"] },
        { k: "location", l: "Where it is", req: true },
        { k: "photo", l: "Photo (file name)" },
        { k: "description", l: "Describe it honestly", t: "textarea", req: true, full: true }
      ], values, data => {
        if (editListing) {
          DB.update("listings", editListing, data);
          editListing = null;
          Dash.toast("Listing updated.");
        } else {
          DB.insert("listings", Object.assign({}, data, {
            seller: SESSION.email, status: "Live", postedOn: today()
          }));
          Dash.toast("It is live. Buyers can see it now.");
        }
        Dash.show(MODULES.find(m => m.id === "sell"));
      }, editListing ? () => { editListing = null; Dash.show(MODULES.find(m => m.id === "sell")); } : null,
        editListing ? "Save changes" : "Put it up for sale"));
      host.appendChild(card);

      const c = Dash.card("<h3>Your listings</h3>");
      c.appendChild(Dash.table([
        { k: "title", l: "Item" },
        { k: "cat", l: "Category", fmt: l => esc(categoryOf(l.categoryId)) },
        { k: "price", l: "Asking", fmt: l => money(l.price) },
        { k: "negotiable", l: "Offers" },
        { k: "offers", l: "Open offers", fmt: l => pendingOffers(l.id).length },
        { k: "postedOn", l: "Listed" },
        { k: "status", l: "Status", fmt: l => listTag(l.status) +
            (l.status === "Sold" ? " " + money(l.soldFor) : "") }
      ], myListings(), l => l.status === "Live" ? [
        { label: "Edit", cls: "flat", fn: () => {
            editListing = l.id; Dash.show(MODULES.find(m => m.id === "sell"));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } },
        { label: "Take down", cls: "danger", fn: () => {
            if (confirm("Take this listing down?")) {
              DB.update("listings", l.id, { status: "Removed" });
              Dash.show(MODULES.find(m => m.id === "sell"));
            }
          } }
      ] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "offers", label: "Offers", type: "custom",
    desc: "Prices people have offered you, and the ones you have offered.",
    render(host) {
      const received = DB.all("offers").filter(o =>
        listingOf(o.listingId).seller === SESSION.email);
      const made = DB.all("offers").filter(o => o.buyer === SESSION.email);

      const r = Dash.card("<h3>Offers on your items</h3>");
      r.appendChild(Dash.table([
        { k: "madeOn", l: "When" },
        { k: "item", l: "Item", fmt: o => esc(listingOf(o.listingId).title) },
        { k: "asking", l: "You want", fmt: o => money(listingOf(o.listingId).price) },
        { k: "amount", l: "Offered", fmt: o => money(o.amount) },
        { k: "gap", l: "Difference", fmt: o => {
            const d = Number(listingOf(o.listingId).price) - Number(o.amount);
            return d > 0 ? '<span class="tag warn">' + money(d) + " less</span>"
                         : '<span class="tag ok">at your price</span>';
          } },
        { k: "buyer", l: "From", fmt: o => esc(nameOf(o.buyer)) },
        { k: "message", l: "Message" },
        { k: "status", l: "Status", fmt: o => offerTag(o.status) }
      ], received, o => o.status === "Pending" && listingOf(o.listingId).status === "Live" ? [
        { label: "Accept", cls: "", fn: () => {
            const l = listingOf(o.listingId);
            if (!confirm("Sell " + l.title + " to " + nameOf(o.buyer) + " for " + money(o.amount) + "?")) return;
            DB.update("offers", o.id, { status: "Accepted" });
            completeSale(l, o.buyer, o.amount, "Pickup");
            Dash.toast("Sold. The deal is in your sales list; agree the handover there.");
            Dash.show(MODULES.find(m => m.id === "offers"));
          } },
        { label: "Reject", cls: "danger", fn: () => {
            DB.update("offers", o.id, { status: "Rejected", note: "Seller said no" });
            Dash.show(MODULES.find(m => m.id === "offers"));
          } }
      ] : []));
      host.appendChild(r);

      const m = Dash.card("<h3>Offers you made</h3>");
      m.appendChild(Dash.table([
        { k: "madeOn", l: "When" },
        { k: "item", l: "Item", fmt: o => esc(listingOf(o.listingId).title) },
        { k: "asking", l: "Asking", fmt: o => money(listingOf(o.listingId).price) },
        { k: "amount", l: "You offered", fmt: o => money(o.amount) },
        { k: "seller", l: "Seller", fmt: o => esc(nameOf(listingOf(o.listingId).seller)) },
        { k: "status", l: "Status", fmt: o => offerTag(o.status) },
        { k: "note", l: "Note" }
      ], made, o => o.status === "Pending" ? [{
        label: "Withdraw", cls: "danger", fn: () => {
          DB.update("offers", o.id, { status: "Withdrawn" });
          Dash.show(MODULES.find(m => m.id === "offers"));
        }
      }] : []));
      host.appendChild(m);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "deals", label: "My Deals", type: "custom",
    desc: "What you have bought and sold, and where it has got to.",
    render(host) {
      const buys = myBuys(), sales = mySales();
      host.appendChild(Dash.stats([
        { n: buys.length, l: "Bought" },
        { n: sales.length, l: "Sold" },
        { n: money(sales.reduce((s, o) => s + Number(o.amount), 0)), l: "Earned" },
        { n: ratingOf(SESSION.email) ? ratingOf(SESSION.email) + " / 5" : "no rating yet", l: "Your rating" }
      ]));

      const b = Dash.card("<h3>Things you bought</h3>");
      b.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "item", l: "Item", fmt: o => esc(listingOf(o.listingId).title) },
        { k: "seller", l: "From", fmt: o => esc(nameOf(o.seller)) },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "logistics", l: "Handover" },
        { k: "status", l: "Status", fmt: o => moveTag(o.status) }
      ], buys, o => o.status === "Shipped" ? [{
        label: "Mark received", cls: "", fn: () => {
          DB.update("orders", o.id, { status: "Received", receivedOn: today() });
          Dash.toast("Marked received. You can leave feedback now.");
          Dash.show(MODULES.find(m => m.id === "deals"));
        }
      }] : []));
      host.appendChild(b);

      const s = Dash.card("<h3>Things you sold</h3>");
      s.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "item", l: "Item", fmt: o => esc(listingOf(o.listingId).title) },
        { k: "buyer", l: "To", fmt: o => esc(nameOf(o.buyer)) },
        { k: "amount", l: "Got", fmt: o => money(o.amount) },
        { k: "logistics", l: "Handover" },
        { k: "status", l: "Status", fmt: o => moveTag(o.status) }
      ], sales, o => o.status === "Paid" ? [
        { label: "Handed over / shipped", cls: "", fn: () => {
            DB.update("orders", o.id, { status: "Shipped" });
            Dash.toast("Marked as on its way.");
            Dash.show(MODULES.find(m => m.id === "deals"));
          } },
        { label: "Switch to " + "delivery", cls: "flat", fn: () => {
            DB.update("orders", o.id, {
              logistics: o.logistics === "Pickup" ? "Delivery" : "Pickup" });
            Dash.show(MODULES.find(m => m.id === "deals"));
          } }
      ] : []));
      host.appendChild(s);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "watch", label: "Watchlist", type: "custom",
    desc: "Items you are keeping an eye on.",
    render(host) {
      const c = Dash.card("<h3>Watching</h3>");
      c.appendChild(Dash.table([
        { k: "item", l: "Item", fmt: f => esc(listingOf(f.listingId).title) },
        { k: "price", l: "Asking", fmt: f => money(listingOf(f.listingId).price) },
        { k: "seller", l: "Seller", fmt: f => esc(nameOf(listingOf(f.listingId).seller)) },
        { k: "status", l: "Still available", fmt: f => listTag(listingOf(f.listingId).status) },
        { k: "added", l: "Watching since" }
      ], myWatch(), f => [
        listingOf(f.listingId).status === "Live"
          ? { label: "Buy it", cls: "", fn: () => buyNow(listingOf(f.listingId)) }
          : { label: "Gone", cls: "flat", fn: () => Dash.toast("That one is no longer for sale.") },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("favourites", f.id);
            Dash.show(MODULES.find(m => m.id === "watch"));
          } }
      ]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Feedback", type: "custom",
    desc: "Rate the people you have dealt with, once the item has changed hands.",
    render(host) {
      const done = myBuys().concat(mySales()).filter(o => o.status === "Received");
      const left = DB.all("feedback").filter(f => f.from === SESSION.email);
      const open = done.filter(o => !left.some(f => String(f.orderId) === String(o.id)));

      const card = Dash.card("<h3>Leave feedback</h3>");
      if (!open.length) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">Feedback opens once a deal is marked received, and can be left once.</p>');
      } else {
        card.appendChild(Dash.form([
          { k: "orderId", l: "Which deal", t: "select", req: true,
            opts: open.map(o => ({ v: o.id,
              l: listingOf(o.listingId).title + " - with " +
                 nameOf(o.buyer === SESSION.email ? o.seller : o.buyer) })) },
          { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
          { k: "comment", l: "Comment", t: "textarea", req: true, full: true }
        ], {}, (data, form) => {
          const o = DB.get("orders", data.orderId);
          DB.insert("feedback", {
            orderId: Number(data.orderId), from: SESSION.email,
            about: o.buyer === SESSION.email ? o.seller : o.buyer,
            rating: data.rating, comment: data.comment, date: today()
          });
          form.reset();
          Dash.toast("Feedback left.");
          Dash.show(MODULES.find(m => m.id === "feedback"));
        }, null, "Leave feedback"));
      }
      host.appendChild(card);

      const about = DB.all("feedback").filter(f => f.about === SESSION.email);
      const c = Dash.card("<h3>What people said about you</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "from", l: "From", fmt: f => esc(nameOf(f.from)) },
        { k: "item", l: "Deal", fmt: f => esc(listingOf((DB.get("orders", f.orderId) || {}).listingId).title) },
        { k: "rating", l: "Rating", fmt: f => "*".repeat(Number(f.rating)) },
        { k: "comment", l: "Comment" }
      ], about));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "account", label: "My Account", type: "custom",
    desc: "Your details as other members see them.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Account</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Display name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "city", l: "City" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, city: data.city, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Account updated.");
        location.reload();
      }, null, "Save account"));
      host.appendChild(card);
    }
  }
];

/* ---- buying and offering ---------------------------------------------- */
function buyNow(l) {
  if (l.seller === SESSION.email) { Dash.toast("That is your own listing."); return; }
  const host = document.getElementById("dash-view");
  const card = Dash.card(
    "<h3>Buy " + esc(l.title) + "</h3>" +
    '<p class="muted">' + money(l.price) + " &middot; " + esc(l.condition) + " &middot; " +
    esc(l.location) + " &middot; seller " + esc(nameOf(l.seller)) + "</p>");
  card.appendChild(Dash.form([
    { k: "logistics", l: "How will you take it", t: "select", opts: ["Pickup", "Delivery"] },
    { k: "payment", l: "Pay by", t: "select", opts: ["UPI", "Card", "Net banking"] }
  ], {}, data => {
    const fresh = DB.get("listings", l.id);
    if (!fresh || fresh.status !== "Live") { Dash.toast("Somebody got there first."); return; }
    completeSale(fresh, SESSION.email, fresh.price, data.logistics);
    Dash.toast("Bought. Agree the handover with the seller in My Deals.");
    Dash.show(MODULES.find(m => m.id === "deals"));
  }, null, "Pay " + money(l.price)));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

function makeOffer(l) {
  if (l.seller === SESSION.email) { Dash.toast("That is your own listing."); return; }
  const host = document.getElementById("dash-view");
  const card = Dash.card(
    "<h3>Offer on " + esc(l.title) + "</h3>" +
    '<p class="muted">The seller is asking ' + money(l.price) + ".</p>");
  card.appendChild(Dash.form([
    { k: "amount", l: "Your offer (Rs.)", t: "number", min: 1, req: true },
    { k: "message", l: "Anything to say", full: true }
  ], {}, data => {
    if (Number(data.amount) > Number(l.price)) {
      Dash.toast("That is more than the asking price - just buy it."); return;
    }
    const already = DB.all("offers").find(o =>
      String(o.listingId) === String(l.id) && o.buyer === SESSION.email && o.status === "Pending");
    if (already) { Dash.toast("You already have an offer open on this item."); return; }
    DB.insert("offers", {
      listingId: l.id, buyer: SESSION.email, amount: Number(data.amount),
      message: data.message, status: "Pending", madeOn: today(), note: ""
    });
    Dash.toast("Offer sent to " + nameOf(l.seller) + ".");
    Dash.show(MODULES.find(m => m.id === "offers"));
  }, null, "Send the offer"));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
