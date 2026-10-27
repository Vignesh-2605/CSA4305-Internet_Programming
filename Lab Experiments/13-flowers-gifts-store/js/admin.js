/* ==========================================================================
   admin.js - shop floor
   Modules: overview, catalogue, orders, delivery run, coupons, customers, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- pricing and delivery rules shared by both consoles --------------- */
const SLOTS = ["9 am - 1 pm", "1 pm - 5 pm", "5 pm - 9 pm", "Midnight surprise (11.30 pm)"];
const SAME_DAY_FEE = 150;
const MIDNIGHT_FEE = 200;
const FREE_DELIVERY_OVER = 999;
const DELIVERY_FEE = 60;
const STATES = ["Placed", "Being made", "Out for delivery", "Delivered", "Cancelled"];

/* the longer someone shops with us, the better the standing discount */
const TIERS = [
  { name: "Gold", from: 6, pct: 10 },
  { name: "Silver", from: 3, pct: 5 },
  { name: "New", from: 0, pct: 0 }
];

const productOf = id => DB.get("products", id) ||
  { name: "(withdrawn)", price: 0, occasion: "-", recipient: "-", stock: 0 };

function tierOf(email) {
  const done = DB.all("orders")
    .filter(o => o.user === email && o.status === "Delivered").length;
  return Object.assign({ orders: done }, TIERS.find(t => done >= t.from));
}

const couponByCode = code => DB.all("coupons")
  .find(c => c.code.toUpperCase() === String(code).toUpperCase() && c.active === "Yes");

/* what an order actually costs, step by step */
function priceOrder(subtotal, email, coupon, slot, deliveryDate) {
  const tier = tierOf(email);
  const loyalty = Math.round(subtotal * tier.pct / 100);
  let couponOff = 0;
  if (coupon && subtotal >= Number(coupon.minOrder)) {
    couponOff = Math.round((subtotal - loyalty) * Number(coupon.percent) / 100);
  }
  const goods = subtotal - loyalty - couponOff;
  let delivery = goods >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  if (deliveryDate === today()) delivery += SAME_DAY_FEE;
  if (slot && slot.indexOf("Midnight") === 0) delivery += MIDNIGHT_FEE;
  return { subtotal, tier, loyalty, couponOff, delivery, total: goods + delivery };
}

const canCancel = o => o.status === "Placed";
const isScheduled = o => daysBetween(o.placedOn, o.deliveryDate) > 1;

const stateTag = s => '<span class="tag ' +
  (s === "Delivered" ? "ok" : s === "Cancelled" ? "bad" : s === "Out for delivery" ? "warn" : "") +
  '">' + esc(String(s).toLowerCase()) + "</span>";

const itemsText = o => (o.items || []).map(i => i.name + " x" + i.qty).join(", ");

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "What has to go out and what it is worth.",
    render(host) {
      const orders = DB.all("orders");
      const live = orders.filter(o => o.status !== "Cancelled");
      host.appendChild(Dash.stats([
        { n: DB.all("products").length, l: "Lines in the catalogue" },
        { n: orders.filter(o => o.status === "Placed").length, l: "To be made up" },
        { n: live.filter(o => isScheduled(o) && o.status !== "Delivered").length, l: "Booked ahead" },
        { n: money(live.reduce((s, o) => s + Number(o.amount), 0)), l: "Order value" }
      ]));

      const byOcc = {};
      live.forEach(o => (o.items || []).forEach(i => {
        const occ = productOf(i.productId).occasion;
        byOcc[occ] = (byOcc[occ] || 0) + Number(i.qty);
      }));
      const c = Dash.card("<h3>What people buy for</h3>");
      c.appendChild(Dash.table(
        [{ k: "occ", l: "Occasion" }, { k: "n", l: "Items sold" }],
        Object.keys(byOcc).map(k => ({ occ: k, n: byOcc[k] })).sort((a, b) => b.n - a.n)));
      host.appendChild(c);

      const low = DB.all("products").filter(p => Number(p.stock) <= 3);
      const l = Dash.card("<h3>Running low</h3>");
      l.appendChild(Dash.table([
        { k: "name", l: "Product" }, { k: "category", l: "Category" },
        { k: "stock", l: "Left", fmt: p => Number(p.stock) === 0
            ? '<span class="tag bad">none</span>' : '<span class="tag warn">' + p.stock + "</span>" }
      ], low));
      host.appendChild(l);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "products", label: "Catalogue", type: "crud", table: "products",
    desc: "Bouquets, hampers and gifts, filed by occasion and who they suit.",
    addLabel: "Add a product",
    fields: [
      { k: "name", l: "Product name", req: true },
      { k: "category", l: "Category", t: "select",
        opts: ["Bouquets", "Gift hampers", "Personalised gifts", "Plants", "Chocolates"] },
      { k: "occasion", l: "Occasion", t: "select",
        opts: ["Birthday", "Anniversary", "Congratulations", "Thank you", "Sympathy", "Just because"] },
      { k: "recipient", l: "Suits", t: "select",
        opts: ["For her", "For him", "For couples", "For kids", "For anyone"] },
      { k: "price", l: "Price (Rs.)", t: "number", min: 0, req: true },
      { k: "stock", l: "In stock", t: "number", min: 0, req: true },
      { k: "sameDay", l: "Same day possible", t: "select", opts: ["Yes", "No"] },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Product" }, { k: "category", l: "Category" },
      { k: "occasion", l: "Occasion" }, { k: "recipient", l: "Suits" },
      { k: "price", l: "Price", fmt: p => money(p.price) },
      { k: "sameDay", l: "Same day" },
      { k: "stock", l: "Stock", fmt: p => Number(p.stock) > 0
          ? '<span class="tag ok">' + p.stock + "</span>" : '<span class="tag bad">out</span>' }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "Orders", type: "custom",
    desc: "Work an order through the workshop and out of the door.",
    render(host) {
      const c = Dash.card("<h3>Order book</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "placedOn", l: "Placed" },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "to", l: "Deliver to", fmt: o => esc(o.recipientName) },
        { k: "deliveryDate", l: "On" },
        { k: "slot", l: "Slot" },
        { k: "ahead", l: "Booked ahead", fmt: o => isScheduled(o)
            ? '<span class="tag">yes</span>' : "-" },
        { k: "amount", l: "Amount", fmt: o => money(o.amount) },
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
        acts.push({ label: "Card", cls: "flat", fn: () => giftCard(o) });
        if (o.status !== "Delivered" && o.status !== "Cancelled") acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel order #" + o.id + " and put the stock back?")) {
              (o.items || []).forEach(it => {
                const p = DB.get("products", it.productId);
                if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(it.qty) });
              });
              DB.update("orders", o.id, { status: "Cancelled" });
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
    id: "run", label: "Delivery Run", type: "custom",
    desc: "What leaves the shop on a given day, slot by slot.",
    render(host) {
      const card = Dash.card(
        "<h3>Pick a date</h3>" +
        '<div class="form-row"><div class="field"><label>Delivery date</label>' +
        '<input type="date" id="d" value="' + today() + '"></div></div>');
      host.appendChild(card);
      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const d = card.querySelector("#d").value;
        out.innerHTML = "";
        SLOTS.forEach(s => {
          const rows = DB.all("orders").filter(o =>
            o.deliveryDate === d && o.slot === s && o.status !== "Cancelled");
          const c = Dash.card("<h3>" + esc(s) + ' <span class="tag">' + rows.length + "</span></h3>");
          c.appendChild(Dash.table([
            { k: "id", l: "#" },
            { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
            { k: "recipientName", l: "To" },
            { k: "recipientPhone", l: "Phone" },
            { k: "address", l: "Address" },
            { k: "message", l: "Card message", fmt: o => o.message ? esc(o.message) : "-" },
            { k: "status", l: "Status", fmt: o => stateTag(o.status) }
          ], rows));
          out.appendChild(c);
        });
      };
      card.querySelector("#d").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "coupons", label: "Offers", type: "crud", table: "coupons",
    desc: "Discount codes customers can type at checkout.",
    addLabel: "Add a code",
    fields: [
      { k: "code", l: "Code", req: true },
      { k: "percent", l: "Percent off", t: "number", min: 1, req: true },
      { k: "minOrder", l: "Minimum order (Rs.)", t: "number", min: 0, def: 0 },
      { k: "active", l: "Active", t: "select", opts: ["Yes", "No"] },
      { k: "note", l: "What it is for", full: true }
    ],
    cols: [
      { k: "code", l: "Code" },
      { k: "percent", l: "Off", fmt: c => c.percent + "%" },
      { k: "minOrder", l: "Minimum", fmt: c => money(c.minOrder) },
      { k: "active", l: "Active", fmt: c => c.active === "Yes"
          ? '<span class="tag ok">live</span>' : '<span class="tag mute">off</span>' },
      { k: "note", l: "Note" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "customers", label: "Customers", type: "custom",
    desc: "Who buys from us, and which standing discount they have earned.",
    render(host) {
      const c = Dash.card("<h3>Customers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "joined", l: "Since" },
        { k: "orders", l: "Delivered", fmt: u => tierOf(u.email).orders },
        { k: "tier", l: "Standing", fmt: u => {
            const t = tierOf(u.email);
            return t.pct ? '<span class="tag ok">' + t.name + " &middot; " + t.pct + "% off</span>"
                         : '<span class="tag mute">new</span>';
          } },
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
    desc: "What customers said about what turned up.",
    render(host) {
      const c = Dash.card("<h3>Reviews</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "Customer" },
        { k: "product", l: "Product", fmt: r => esc(productOf(r.productId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Comment" }, { k: "date", l: "Posted" }
      ], DB.all("reviews"), r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

/* the little card that goes with the gift */
function giftCard(o) {
  const host = document.getElementById("dash-view");
  const c = document.createElement("div");
  c.className = "ticket";
  c.innerHTML =
    "<h3>Gift card &middot; order #" + o.id + "</h3>" +
    '<div class="row"><span>To</span><b>' + esc(o.recipientName) + "</b></div>" +
    '<div class="row"><span>Message</span><b>' + esc(o.message || "(no message)") + "</b></div>" +
    '<div class="row"><span>From</span><b>' + esc(o.name) + "</b></div>" +
    '<div class="row"><span>Deliver</span><b>' + esc(o.deliveryDate) + ", " + esc(o.slot) + "</b></div>";
  const p = document.createElement("button");
  p.className = "btn flat no-print";
  p.style.marginTop = ".8rem";
  p.textContent = "Print the card";
  p.onclick = () => window.print();
  c.appendChild(p);
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
