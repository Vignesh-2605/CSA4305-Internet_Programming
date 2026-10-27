/* ==========================================================================
   admin.js - merchandising desk
   Modules: overview, products and flash sale, size guide, orders, returns,
            customers, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- shop rules shared by both consoles ------------------------------- */
const FREE_SHIP_OVER = 1500;    // orders above this ship free
const SHIPPING = 79;
const RETURN_DAYS = 7;          // window for a return or an exchange
const STATES = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

const productOf = id => DB.get("products", id) ||
  { name: "(removed)", price: 0, mrp: 0, sale: 0, brand: "-", stock: 0, sizes: "", colours: "" };

const listOf = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);

/* the flash sale takes a further cut off the selling price */
const salePrice = p => Math.round(Number(p.price) * (100 - Number(p.sale || 0)) / 100);
const offPct = p => Number(p.mrp) > 0
  ? Math.round((Number(p.mrp) - salePrice(p)) * 100 / Number(p.mrp)) : 0;

const shippingFor = sub => sub >= FREE_SHIP_OVER || sub === 0 ? 0 : SHIPPING;

function ratingOf(productId) {
  const rows = DB.all("reviews").filter(r => String(r.productId) === String(productId));
  if (!rows.length) return null;
  return (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1);
}

/* a delivered order may be sent back for RETURN_DAYS days */
function returnWindow(o) {
  if (o.status !== "Delivered" || !o.deliveredOn) return 0;
  return RETURN_DAYS - daysBetween(o.deliveredOn, today());
}

const stateTag = s => '<span class="tag ' +
  (s === "Delivered" ? "ok" : s === "Cancelled" ? "bad" : s === "Shipped" ? "warn" : "") +
  '">' + esc(s.toLowerCase()) + "</span>";

const retTag = s => '<span class="tag ' +
  (s === "Approved" || s === "Completed" ? "ok" : s === "Rejected" ? "bad" : "warn") +
  '">' + esc(s.toLowerCase()) + "</span>";

const itemsText = o => (o.items || [])
  .map(i => i.name + " (" + i.size + "/" + i.colour + ") x" + i.qty).join(", ");

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Sales, returns and what is on offer.",
    render(host) {
      const orders = DB.all("orders");
      const live = orders.filter(o => o.status !== "Cancelled");
      const rets = DB.all("returns");
      host.appendChild(Dash.stats([
        { n: DB.all("products").length, l: "Styles listed" },
        { n: live.length, l: "Orders taken" },
        { n: money(live.reduce((s, o) => s + Number(o.amount), 0)), l: "Sales value" },
        { n: rets.filter(r => r.status === "Requested").length, l: "Returns to action" }
      ]));

      const onSale = DB.all("products").filter(p => Number(p.sale) > 0);
      const c = Dash.card("<h3>On flash sale</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Style" },
        { k: "brand", l: "Brand" },
        { k: "price", l: "Usual price", fmt: p => money(p.price) },
        { k: "sale", l: "Extra off", fmt: p => p.sale + "%" },
        { k: "now", l: "Selling at", fmt: p => money(salePrice(p)) },
        { k: "stock", l: "Stock" }
      ], onSale));
      host.appendChild(c);

      const sold = {};
      live.forEach(o => (o.items || []).forEach(i => {
        sold[i.name] = (sold[i.name] || 0) + Number(i.qty);
      }));
      const best = Dash.card("<h3>Moving fastest</h3>");
      best.appendChild(Dash.table(
        [{ k: "name", l: "Style" }, { k: "n", l: "Pieces sold" }],
        Object.keys(sold).map(k => ({ name: k, n: sold[k] })).sort((a, b) => b.n - a.n)));
      host.appendChild(best);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "products", label: "Products", type: "crud", table: "products",
    desc: "Add a style, set its sizes and colours, change the price or put it on sale.",
    addLabel: "Add a style",
    fields: [
      { k: "name", l: "Style name", req: true },
      { k: "category", l: "Department", t: "select", opts: ["Men", "Women", "Kids"] },
      { k: "type", l: "Type", t: "select",
        opts: ["Casual wear", "Formal wear", "Seasonal", "Footwear", "Accessories"] },
      { k: "brand", l: "Brand", req: true },
      { k: "price", l: "Selling price (Rs.)", t: "number", min: 0, req: true },
      { k: "mrp", l: "MRP (Rs.)", t: "number", min: 0, req: true },
      { k: "sale", l: "Flash sale extra off (%)", t: "number", min: 0, def: 0 },
      { k: "sizes", l: "Sizes", req: true, help: "Separated by commas, e.g. S,M,L,XL" },
      { k: "colours", l: "Colours", req: true, help: "Separated by commas" },
      { k: "stock", l: "Pieces in stock", t: "number", min: 0, req: true },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Style" },
      { k: "category", l: "Department" },
      { k: "type", l: "Type" },
      { k: "brand", l: "Brand" },
      { k: "price", l: "Price", fmt: p => Number(p.sale) > 0
          ? "<s>" + money(p.price) + "</s> " + money(salePrice(p)) : money(p.price) },
      { k: "sale", l: "Sale", fmt: p => Number(p.sale) > 0
          ? '<span class="tag warn">' + p.sale + "% off</span>" : "-" },
      { k: "sizes", l: "Sizes" },
      { k: "stock", l: "Stock", fmt: p => Number(p.stock) > 0
          ? '<span class="tag ok">' + p.stock + "</span>" : '<span class="tag bad">out</span>' }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "sizes", label: "Size Guide", type: "crud", table: "sizeGuide",
    desc: "The measurement chart shoppers see before they pick a size.",
    addLabel: "Add a size row",
    fields: [
      { k: "category", l: "Department", t: "select", opts: ["Men", "Women", "Kids"] },
      { k: "size", l: "Size", req: true },
      { k: "chest", l: "Chest (in)", req: true },
      { k: "waist", l: "Waist (in)", req: true },
      { k: "length", l: "Length (in)", req: true }
    ],
    cols: [
      { k: "category", l: "Department" }, { k: "size", l: "Size" },
      { k: "chest", l: "Chest" }, { k: "waist", l: "Waist" }, { k: "length", l: "Length" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "Orders", type: "custom",
    desc: "Move an order through packing, dispatch and delivery.",
    render(host) {
      const c = Dash.card("<h3>Order book</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "placedOn", l: "Placed" },
        { k: "user", l: "Customer" },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "amount", l: "Amount", fmt: o => money(o.amount) },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], DB.all("orders"), o => {
        const i = STATES.indexOf(o.status);
        const acts = [];
        if (i >= 0 && i < 3) acts.push({
          label: "Mark " + STATES[i + 1].toLowerCase(), cls: "", fn: () => {
            const patch = { status: STATES[i + 1] };
            if (STATES[i + 1] === "Delivered") patch.deliveredOn = today();
            DB.update("orders", o.id, patch);
            Dash.toast("Order is now " + STATES[i + 1].toLowerCase() + ".");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        });
        if (o.status !== "Delivered" && o.status !== "Cancelled") acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel order #" + o.id + " and put the stock back?")) {
              (o.items || []).forEach(it => {
                const p = DB.get("products", it.productId);
                if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(it.qty) });
              });
              DB.update("orders", o.id, { status: "Cancelled" });
              Dash.toast("Order cancelled, stock returned.");
              Dash.show(MODULES.find(m => m.id === "orders"));
            }
          }
        });
        return acts;
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "returns", label: "Returns & Exchanges", type: "custom",
    desc: "Requests raised by customers within the return window.",
    render(host) {
      const c = Dash.card("<h3>Requests</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "raisedOn", l: "Raised" },
        { k: "orderId", l: "Order" },
        { k: "user", l: "Customer" },
        { k: "product", l: "Item", fmt: r => esc(productOf(r.productId).name) + " (" + esc(r.size) + ")" },
        { k: "type", l: "Type" },
        { k: "newSize", l: "Exchange for", fmt: r => r.type === "Exchange" ? esc(r.newSize) : "-" },
        { k: "reason", l: "Reason" },
        { k: "status", l: "Status", fmt: r => retTag(r.status) }
      ], DB.all("returns"), r => {
        if (r.status === "Requested") return [
          { label: "Approve", cls: "", fn: () => {
              DB.update("returns", r.id, { status: "Approved" });
              Dash.toast("Approved. The courier will collect it.");
              Dash.show(MODULES.find(m => m.id === "returns"));
            } },
          { label: "Reject", cls: "danger", fn: () => {
              DB.update("returns", r.id, { status: "Rejected" });
              Dash.toast("Request rejected.");
              Dash.show(MODULES.find(m => m.id === "returns"));
            } }
        ];
        if (r.status === "Approved") return [{
          label: "Mark completed", cls: "", fn: () => {
            const p = DB.get("products", r.productId);
            if (p && r.type === "Return") DB.update("products", p.id, { stock: Number(p.stock) + 1 });
            DB.update("returns", r.id, { status: "Completed" });
            Dash.toast(r.type === "Return" ? "Refunded and back in stock." : "Exchange sent out.");
            Dash.show(MODULES.find(m => m.id === "returns"));
          }
        }];
        return [];
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "customers", label: "Customers", type: "custom",
    desc: "Shoppers with an account and what they have bought.",
    render(host) {
      const c = Dash.card("<h3>Customers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "joined", l: "Joined" },
        { k: "orders", l: "Orders", fmt: u => DB.all("orders")
            .filter(o => o.user === u.email && o.status !== "Cancelled").length },
        { k: "spent", l: "Spent", fmt: u => money(DB.all("orders")
            .filter(o => o.user === u.email && o.status !== "Cancelled")
            .reduce((s, o) => s + Number(o.amount), 0)) },
        { k: "rets", l: "Returns", fmt: u => DB.all("returns").filter(r => r.user === u.email).length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "reviews", label: "Reviews", type: "custom",
    desc: "What shoppers said about the styles.",
    render(host) {
      const c = Dash.card("<h3>Product reviews</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "Customer" },
        { k: "product", l: "Style", fmt: r => esc(productOf(r.productId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Review" }, { k: "date", l: "Posted" }
      ], DB.all("reviews"), r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.toast("Review removed.");
          Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
