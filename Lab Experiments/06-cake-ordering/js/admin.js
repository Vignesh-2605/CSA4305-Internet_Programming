/* ==========================================================================
   admin.js - bakery counter
   Modules: overview, cake inventory, orders, delivery schedule, customers.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- pricing and status rules shared by both consoles ----------------- */
const MESSAGE_CHARGE = 100;      // writing a message on the cake
const MIDNIGHT_CHARGE = 200;     // midnight delivery slot
const SLOTS = ["9 am - 12 noon", "12 noon - 4 pm", "4 pm - 8 pm", "Midnight (11.30 pm - 12.30 am)"];
const STATES = ["Placed", "Baking", "Out for delivery", "Delivered", "Cancelled"];

const cakeOf = id => DB.get("cakes", id) || { name: "(removed)", price: 0, flavour: "-" };

/* amount = price per kg x weight, plus the extras that were asked for */
function orderTotal(cake, weight, message, slot) {
  let total = Number(cake.price) * Number(weight);
  if (message) total += MESSAGE_CHARGE;
  if (slot && slot.indexOf("Midnight") === 0) total += MIDNIGHT_CHARGE;
  return Math.round(total);
}

/* an order can still be called off while the kitchen has not started */
const canCancel = o => o.status === "Placed";

const stateTag = s =>
  '<span class="tag ' +
  (s === "Delivered" ? "ok" : s === "Cancelled" ? "bad" : s === "Out for delivery" ? "warn" : "") +
  '">' + esc(s.toLowerCase()) + "</span>";

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Orders on hand and what they are worth.",
    render(host) {
      const orders = DB.all("orders");
      const live = orders.filter(o => o.status !== "Cancelled");
      host.appendChild(Dash.stats([
        { n: DB.all("cakes").length, l: "Cakes on the menu" },
        { n: orders.filter(o => o.status === "Placed").length, l: "Waiting to be baked" },
        { n: orders.filter(o => o.status === "Out for delivery").length, l: "Out for delivery" },
        { n: money(live.reduce((s, o) => s + Number(o.amount), 0)), l: "Value of orders" }
      ]));

      const today_ = today();
      const c = Dash.card("<h3>Due today (" + today_ + ")</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "Order #" },
        { k: "cake", l: "Cake", fmt: o => esc(cakeOf(o.cakeId).name) },
        { k: "weight", l: "Weight", fmt: o => o.weight + " kg" },
        { k: "slot", l: "Slot" },
        { k: "name", l: "For" },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], live.filter(o => o.deliveryDate === today_)));
      host.appendChild(c);

      const pop = {};
      live.forEach(o => { pop[cakeOf(o.cakeId).name] = (pop[cakeOf(o.cakeId).name] || 0) + 1; });
      const rows = Object.keys(pop).map(k => ({ name: k, n: pop[k] })).sort((a, b) => b.n - a.n);
      const p = Dash.card("<h3>What sells</h3>");
      p.appendChild(Dash.table([{ k: "name", l: "Cake" }, { k: "n", l: "Orders" }], rows));
      host.appendChild(p);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "cakes", label: "Cake Menu", type: "crud", table: "cakes",
    desc: "Add a cake, change its price or description, or take it off the menu.",
    addLabel: "Add a cake",
    fields: [
      { k: "name", l: "Cake name", req: true },
      { k: "category", l: "Occasion", t: "select",
        opts: ["Birthday", "Anniversary", "Wedding", "Baby shower", "Everyday"] },
      { k: "flavour", l: "Flavour", t: "select",
        opts: ["Chocolate truffle", "Vanilla", "Butterscotch", "Red velvet", "Fresh fruit", "Black forest"] },
      { k: "price", l: "Price per kg (Rs.)", t: "number", min: 0, req: true },
      { k: "eggless", l: "Eggless", t: "select", opts: ["Yes", "No"] },
      { k: "available", l: "Available", t: "select", opts: ["Yes", "No"] },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Cake" },
      { k: "category", l: "Occasion" },
      { k: "flavour", l: "Flavour" },
      { k: "price", l: "Per kg", fmt: r => money(r.price) },
      { k: "eggless", l: "Eggless" },
      { k: "available", l: "On the menu", fmt: r => r.available === "Yes"
          ? '<span class="tag ok">yes</span>' : '<span class="tag bad">no</span>' }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "Orders", type: "custom",
    desc: "Move an order along as the kitchen works through it.",
    render(host) {
      const c = Dash.card("<h3>All orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "placedOn", l: "Placed" },
        { k: "cake", l: "Cake", fmt: o => esc(cakeOf(o.cakeId).name) },
        { k: "weight", l: "Kg" },
        { k: "message", l: "Message on cake", fmt: o => o.message ? esc(o.message) : "-" },
        { k: "deliveryDate", l: "Delivery" },
        { k: "slot", l: "Slot" },
        { k: "amount", l: "Amount", fmt: o => money(o.amount) },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], DB.all("orders"), o => {
        const i = STATES.indexOf(o.status);
        const acts = [];
        if (i >= 0 && i < 3) acts.push({
          label: "Mark " + STATES[i + 1].toLowerCase(), cls: "", fn: () => {
            DB.update("orders", o.id, { status: STATES[i + 1] });
            Dash.toast("Order moved to " + STATES[i + 1] + ".");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        });
        if (o.status !== "Delivered" && o.status !== "Cancelled") acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel order #" + o.id + "?")) {
              DB.update("orders", o.id, { status: "Cancelled" });
              Dash.toast("Order cancelled.");
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
    id: "schedule", label: "Delivery Schedule", type: "custom",
    desc: "What has to leave the shop, by date and slot.",
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
            { k: "cake", l: "Cake", fmt: o => esc(cakeOf(o.cakeId).name) + " / " + o.weight + " kg" },
            { k: "name", l: "Customer" },
            { k: "phone", l: "Phone" },
            { k: "address", l: "Address" },
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
    id: "customers", label: "Customers", type: "custom",
    desc: "Everyone with an account, and what they have ordered.",
    render(host) {
      const c = Dash.card("<h3>Customers</h3>");
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
  }
];

Dash.mount(MODULES);
