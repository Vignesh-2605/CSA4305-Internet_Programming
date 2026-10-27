/* ==========================================================================
   admin.js - store back office
   Modules: overview, categories, products, orders, customers, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- shop rules shared by both consoles ------------------------------- */
const FREE_SHIP_OVER = 5000;     // orders above this ship free
const SHIPPING = 99;
const STATES = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

const productOf = id => DB.get("products", id) ||
  { name: "(removed)", price: 0, brand: "-", stock: 0 };

const inStock = p => Number(p.stock) > 0;
const discount = p => Number(p.mrp) > Number(p.price)
  ? Math.round((Number(p.mrp) - Number(p.price)) * 100 / Number(p.mrp)) : 0;

const shippingFor = sub => sub >= FREE_SHIP_OVER || sub === 0 ? 0 : SHIPPING;

/* average rating of a product */
function ratingOf(productId) {
  const rows = DB.all("reviews").filter(r => String(r.productId) === String(productId));
  if (!rows.length) return null;
  return (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1);
}

const stateTag = s => '<span class="tag ' +
  (s === "Delivered" ? "ok" : s === "Cancelled" ? "bad" : s === "Shipped" ? "warn" : "") +
  '">' + esc(s.toLowerCase()) + "</span>";

const itemsText = o => (o.items || []).map(i => i.name + " x" + i.qty).join(", ");

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Sales, stock and what needs attention.",
    render(host) {
      const orders = DB.all("orders");
      const live = orders.filter(o => o.status !== "Cancelled");
      host.appendChild(Dash.stats([
        { n: DB.all("products").length, l: "Products listed" },
        { n: orders.filter(o => o.status === "Placed").length, l: "Waiting to be packed" },
        { n: live.length, l: "Orders taken" },
        { n: money(live.reduce((s, o) => s + Number(o.amount), 0)), l: "Sales value" }
      ]));

      const low = DB.all("products").filter(p => Number(p.stock) <= 3);
      const c = Dash.card("<h3>Running low</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Product" },
        { k: "category", l: "Category" },
        { k: "price", l: "Price", fmt: p => money(p.price) },
        { k: "stock", l: "In stock", fmt: p => Number(p.stock) === 0
            ? '<span class="tag bad">out of stock</span>'
            : '<span class="tag warn">' + p.stock + " left</span>" }
      ], low));
      host.appendChild(c);

      const sold = {};
      live.forEach(o => (o.items || []).forEach(i => {
        sold[i.name] = (sold[i.name] || 0) + Number(i.qty);
      }));
      const best = Dash.card("<h3>Best sellers</h3>");
      best.appendChild(Dash.table(
        [{ k: "name", l: "Product" }, { k: "n", l: "Units sold" }],
        Object.keys(sold).map(k => ({ name: k, n: sold[k] })).sort((a, b) => b.n - a.n)));
      host.appendChild(best);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "categories", label: "Categories", type: "crud", table: "categories",
    desc: "The categories and sub categories shown on the home page.",
    addLabel: "Add a category",
    fields: [
      { k: "name", l: "Category", req: true },
      { k: "subcategories", l: "Sub categories", full: true,
        help: "Separated by commas" },
      { k: "popular", l: "Show first", t: "select", opts: ["Yes", "No"] }
    ],
    cols: [
      { k: "name", l: "Category" },
      { k: "subcategories", l: "Sub categories" },
      { k: "popular", l: "Shown first" },
      { k: "items", l: "Products", fmt: c => DB.all("products")
          .filter(p => p.category === c.name).length }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "products", label: "Products", type: "crud", table: "products",
    desc: "Add an item, change its price or description, or remove it.",
    addLabel: "Add a product",
    fields: [
      { k: "name", l: "Product name", req: true },
      { k: "category", l: "Category", t: "select",
        opts: DB.all("categories").map(c => c.name) },
      { k: "subcategory", l: "Sub category" },
      { k: "brand", l: "Brand", req: true },
      { k: "price", l: "Selling price (Rs.)", t: "number", min: 0, req: true },
      { k: "mrp", l: "MRP (Rs.)", t: "number", min: 0, req: true },
      { k: "stock", l: "Units in stock", t: "number", min: 0, req: true },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Product" },
      { k: "category", l: "Category" },
      { k: "subcategory", l: "Sub category" },
      { k: "brand", l: "Brand" },
      { k: "price", l: "Price", fmt: p => money(p.price) },
      { k: "off", l: "Discount", fmt: p => discount(p) ? discount(p) + "%" : "-" },
      { k: "stock", l: "Stock", fmt: p => inStock(p)
          ? '<span class="tag ok">' + p.stock + "</span>"
          : '<span class="tag bad">out</span>' }
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
        { k: "payment", l: "Payment" },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], DB.all("orders"), o => {
        const i = STATES.indexOf(o.status);
        const acts = [];
        if (i >= 0 && i < 3) acts.push({
          label: "Mark " + STATES[i + 1].toLowerCase(), cls: "", fn: () => {
            DB.update("orders", o.id, { status: STATES[i + 1] });
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
    id: "customers", label: "Customers", type: "custom",
    desc: "Who has an account and what they have bought.",
    render(host) {
      const c = Dash.card("<h3>Customers who checked out</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" },
        { k: "email", l: "E-mail" },
        { k: "phone", l: "Phone" },
        { k: "joined", l: "Joined" },
        { k: "orders", l: "Orders", fmt: u => DB.all("orders")
            .filter(o => o.user === u.email && o.status !== "Cancelled").length },
        { k: "spent", l: "Spent", fmt: u => money(DB.all("orders")
            .filter(o => o.user === u.email && o.status !== "Cancelled")
            .reduce((s, o) => s + Number(o.amount), 0)) }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "reviews", label: "Reviews", type: "custom",
    desc: "What buyers wrote about the products.",
    render(host) {
      const c = Dash.card("<h3>Product reviews</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "Customer" },
        { k: "product", l: "Product", fmt: r => esc(productOf(r.productId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Review" },
        { k: "date", l: "Posted" }
      ], DB.all("reviews"), r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.toast("Review removed.");
          Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
