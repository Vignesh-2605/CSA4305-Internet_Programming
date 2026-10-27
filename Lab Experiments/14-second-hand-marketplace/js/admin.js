/* ==========================================================================
   admin.js - site administration
   Modules: overview, members, categories, listings, orders, feedback.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

let editUser = null;

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "What is being listed, offered and shipped.",
    render(host) {
      const l = DB.all("listings");
      const o = DB.all("orders");
      host.appendChild(Dash.stats([
        { n: l.filter(x => x.status === "Live").length, l: "Live listings" },
        { n: l.filter(x => x.status === "Sold").length, l: "Sold" },
        { n: DB.all("offers").filter(x => x.status === "Pending").length, l: "Offers open" },
        { n: o.filter(x => x.status !== "Received").length, l: "In transit" },
        { n: money(o.reduce((s, x) => s + Number(x.amount), 0)), l: "Changed hands" }
      ]));

      const byCat = {};
      l.forEach(x => {
        const c = categoryOf(x.categoryId);
        byCat[c] = byCat[c] || { live: 0, sold: 0 };
        if (x.status === "Live") byCat[c].live++;
        if (x.status === "Sold") byCat[c].sold++;
      });
      const c = Dash.card("<h3>By category</h3>");
      c.appendChild(Dash.table([
        { k: "cat", l: "Category" }, { k: "live", l: "Live" }, { k: "sold", l: "Sold" }
      ], Object.keys(byCat).map(k => Object.assign({ cat: k }, byCat[k]))));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "members", label: "Members", type: "custom",
    desc: "Set a member's login, edit their details or remove the account.",
    render(host) {
      if (editUser) {
        const u = DB.get("users", editUser);
        const card = Dash.card("<h3>Edit " + esc(u.name) + "</h3>");
        card.appendChild(Dash.form([
          { k: "name", l: "Name", req: true },
          { k: "email", l: "E-mail", ro: true },
          { k: "phone", l: "Phone" },
          { k: "city", l: "City" },
          { k: "password", l: "Login password", req: true }
        ], u, data => {
          DB.update("users", u.id, {
            name: data.name, phone: data.phone, city: data.city, password: data.password });
          editUser = null;
          Dash.toast("Account updated.");
          Dash.show(MODULES.find(m => m.id === "members"));
        }, () => { editUser = null; Dash.show(MODULES.find(m => m.id === "members")); },
          "Save account"));
        host.appendChild(card);
      }

      const c = Dash.card("<h3>Members</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" },
        { k: "city", l: "City" }, { k: "joined", l: "Joined" },
        { k: "listed", l: "Listed", fmt: u => DB.all("listings")
            .filter(l => l.seller === u.email).length },
        { k: "bought", l: "Bought", fmt: u => DB.all("orders")
            .filter(o => o.buyer === u.email).length },
        { k: "rating", l: "Rating", fmt: u => {
            const r = ratingOf(u.email);
            return r ? '<span class="tag ok">' + r + " / 5</span>"
                     : '<span class="tag mute">none yet</span>';
          } }
      ], DB.all("users").filter(u => u.role === "user"), u => [
        { label: "Edit", cls: "flat", fn: () => {
            editUser = u.id; Dash.show(MODULES.find(m => m.id === "members"));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } },
        { label: "Delete", cls: "danger", fn: () => {
            if (confirm("Remove " + u.name + " and take their live listings down?")) {
              DB.all("listings").filter(l => l.seller === u.email && l.status === "Live")
                .forEach(l => DB.update("listings", l.id, { status: "Removed" }));
              DB.remove("users", u.id);
              Dash.toast("Account removed.");
              Dash.show(MODULES.find(m => m.id === "members"));
            }
          } }
      ]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "categories", label: "Categories", type: "crud", table: "categories",
    desc: "The categories sellers can list under.",
    addLabel: "Add a category",
    fields: [
      { k: "name", l: "Category", req: true },
      { k: "note", l: "What belongs here", full: true }
    ],
    cols: [
      { k: "name", l: "Category" }, { k: "note", l: "Note" },
      { k: "live", l: "Live listings", fmt: c => DB.all("listings")
          .filter(l => String(l.categoryId) === String(c.id) && l.status === "Live").length }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "listings", label: "Listings", type: "custom",
    desc: "Edit or take down anything a member has posted.",
    render(host) {
      const c = Dash.card("<h3>Everything listed</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "title", l: "Item" },
        { k: "cat", l: "Category", fmt: l => esc(categoryOf(l.categoryId)) },
        { k: "seller", l: "Seller", fmt: l => esc(nameOf(l.seller)) },
        { k: "price", l: "Asking", fmt: l => money(l.price) },
        { k: "negotiable", l: "Offers" },
        { k: "condition", l: "Condition" },
        { k: "location", l: "Where" },
        { k: "status", l: "Status", fmt: l => listTag(l.status) }
      ], DB.all("listings"), l => l.status === "Live" ? [{
        label: "Take down", cls: "danger", fn: () => {
          if (confirm("Take this listing down?")) {
            DB.update("listings", l.id, { status: "Removed" });
            Dash.toast("Listing removed.");
            Dash.show(MODULES.find(m => m.id === "listings"));
          }
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "Orders", type: "custom",
    desc: "Move a deal along or strike it off the record.",
    render(host) {
      const c = Dash.card("<h3>Deals</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" }, { k: "date", l: "Date" },
        { k: "item", l: "Item", fmt: o => esc(listingOf(o.listingId).title) },
        { k: "seller", l: "Seller", fmt: o => esc(nameOf(o.seller)) },
        { k: "buyer", l: "Buyer", fmt: o => esc(nameOf(o.buyer)) },
        { k: "amount", l: "Amount", fmt: o => money(o.amount) },
        { k: "logistics", l: "Handover" },
        { k: "status", l: "Status", fmt: o => moveTag(o.status) }
      ], DB.all("orders"), o => {
        const i = LOGISTICS.indexOf(o.status);
        const acts = [];
        if (i >= 0 && i < 2) acts.push({
          label: "Mark " + LOGISTICS[i + 1].toLowerCase(), cls: "", fn: () => {
            DB.update("orders", o.id, { status: LOGISTICS[i + 1] });
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        });
        acts.push({ label: "Delete", cls: "danger", fn: () => {
          if (confirm("Delete this order from the record?")) {
            DB.remove("orders", o.id);
            Dash.toast("Order deleted.");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        } });
        return acts;
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Feedback", type: "custom",
    desc: "What buyers and sellers said about each other.",
    render(host) {
      const c = Dash.card("<h3>Feedback</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "from", l: "From", fmt: f => esc(nameOf(f.from)) },
        { k: "about", l: "About", fmt: f => esc(nameOf(f.about)) },
        { k: "item", l: "Deal", fmt: f => esc(listingOf((DB.get("orders", f.orderId) || {}).listingId).title) },
        { k: "rating", l: "Rating", fmt: f => "*".repeat(Number(f.rating)) + " (" + f.rating + ")" },
        { k: "comment", l: "Comment" }
      ], DB.all("feedback"), f => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("feedback", f.id); Dash.show(MODULES.find(m => m.id === "feedback"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
