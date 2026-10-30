/* ==========================================================================
   farmer.js - the farmer's stall
   Modules: my produce, orders for me, shipping, my sales, my details.
   ========================================================================== */

const SESSION = Auth.require("farmer");
initShell(SESSION);

/* ---- market rules shared by the three consoles ------------------------ */
const FREE_SHIP_OVER = 2000;
const SHIPPING = 90;
const FLOW = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

const productOf = id => DB.get("products", id) ||
  { name: "(withdrawn)", price: 0, unit: "-", stock: 0, farmer: "-" };
const userOf = email => DB.all("users").find(u => u.email === email) || { name: email, wallet: 0 };

const shippingFor = sub => sub >= FREE_SHIP_OVER || sub === 0 ? 0 : SHIPPING;

/* the wallet every buyer pays from */
function wallet(email) { return Number(userOf(email).wallet || 0); }

function moveMoney(email, amount, kind, ref) {
  const u = userOf(email);
  const bal = Number(u.wallet || 0) + Number(amount);
  DB.update("users", u.id, { wallet: bal });
  DB.insert("walletTxns", {
    user: email, kind: kind, amount: Number(amount), ref: ref,
    date: today(), balance: bal
  });
  return bal;
}

const stateTag = s => '<span class="tag ' +
  (s === "Delivered" ? "ok" : s === "Cancelled" ? "bad" : s === "Shipped" ? "warn" : "") +
  '">' + esc(String(s).toLowerCase()) + "</span>";

const itemsText = o => (o.items || []).map(i => i.name + " x" + i.qty).join(", ");

/* lines of an order that belong to one farmer */
const linesFor = (o, farmer) => (o.items || []).filter(i => i.farmer === farmer);

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

let editLine = null;

const myProducts = () => DB.all("products").filter(p => p.farmer === SESSION.email);
const myOrders = () => DB.all("orders")
  .filter(o => linesFor(o, SESSION.email).length && o.status !== "Cancelled");

const MODULES = [
  {
    id: "produce", label: "My Produce", type: "custom",
    desc: "List what you have, change the price or take a line down.",
    render(host) {
      const values = editLine ? DB.get("products", editLine) : {};
      const card = Dash.card("<h3>" + (editLine ? "Edit the line" : "List something") + "</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "What is it", req: true },
        { k: "category", l: "Category", t: "select",
          opts: ["Seeds", "Fertilisers", "Pesticides", "Equipment", "Tools", "Fresh produce"] },
        { k: "price", l: "Price (Rs.)", t: "number", min: 1, req: true },
        { k: "unit", l: "Per", t: "select", opts: ["kg", "quintal", "litre", "packet", "piece", "bag"] },
        { k: "stock", l: "Units in stock", t: "number", min: 0, req: true },
        { k: "photo", l: "Photo (file name)" },
        { k: "description", l: "Description", t: "textarea", req: true, full: true }
      ], values, data => {
        if (editLine) {
          DB.update("products", editLine, data);
          editLine = null;
          Dash.toast("Line updated.");
        } else {
          DB.insert("products", Object.assign({}, data, {
            farmer: SESSION.email, listedOn: today() }));
          Dash.toast("It is on the market now.");
        }
        Dash.show(MODULES.find(m => m.id === "produce"));
      }, editLine ? () => { editLine = null; Dash.show(MODULES.find(m => m.id === "produce")); } : null,
        editLine ? "Save changes" : "Put it on the market"));
      host.appendChild(card);

      const c = Dash.card("<h3>Your lines</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Item" }, { k: "category", l: "Category" },
        { k: "price", l: "Price", fmt: p => money(p.price) + " / " + esc(p.unit) },
        { k: "stock", l: "Stock", fmt: p => Number(p.stock) > 0
            ? '<span class="tag ok">' + p.stock + "</span>" : '<span class="tag bad">out</span>' },
        { k: "photo", l: "Photo" }, { k: "listedOn", l: "Listed" }
      ], myProducts(), p => [
        { label: "Edit", cls: "flat", fn: () => {
            editLine = p.id; Dash.show(MODULES.find(m => m.id === "produce"));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } },
        { label: "Delete", cls: "danger", fn: () => {
            if (confirm("Take " + p.name + " off the market?")) {
              DB.remove("products", p.id);
              Dash.show(MODULES.find(m => m.id === "produce"));
            }
          } }
      ]));
      host.appendChild(c);
    }
  },

  {
    id: "orders", label: "Orders for Me", type: "custom",
    desc: "Orders containing your lines, and the shipping status you control.",
    render(host) {
      const rows = myOrders();
      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" }, { k: "placedOn", l: "Placed" },
        { k: "buyer", l: "Buyer", fmt: o => esc(userOf(o.buyer).name) },
        { k: "mine", l: "Your lines", fmt: o => esc(linesFor(o, SESSION.email)
            .map(i => i.name + " x" + i.qty).join(", ")) },
        { k: "value", l: "Your share", fmt: o => money(linesFor(o, SESSION.email)
            .reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)) },
        { k: "address", l: "Deliver to" },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], rows, o => {
        const i = FLOW.indexOf(o.status);
        return i >= 0 && i < 3 ? [{
          label: "Mark " + FLOW[i + 1].toLowerCase(), cls: "", fn: () => {
            DB.update("orders", o.id, { status: FLOW[i + 1] });
            Dash.toast("Buyer told it is " + FLOW[i + 1].toLowerCase() + ".");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        }] : [];
      }));
      host.appendChild(c);
    }
  },

  {
    id: "sales", label: "My Sales", type: "custom",
    desc: "What you have sold and what it came to.",
    render(host) {
      const rows = DB.all("orders").filter(o => o.status !== "Cancelled");
      const total = rows.reduce((s, o) => s + linesFor(o, SESSION.email)
        .reduce((t, i) => t + Number(i.price) * Number(i.qty), 0), 0);
      const units = rows.reduce((s, o) => s + linesFor(o, SESSION.email)
        .reduce((t, i) => t + Number(i.qty), 0), 0);
      host.appendChild(Dash.stats([
        { n: money(total), l: "Sold in all" },
        { n: units, l: "Units moved" },
        { n: myProducts().length, l: "Lines on the market" }
      ]));

      const byItem = {};
      rows.forEach(o => linesFor(o, SESSION.email).forEach(i => {
        byItem[i.name] = byItem[i.name] || { qty: 0, value: 0 };
        byItem[i.name].qty += Number(i.qty);
        byItem[i.name].value += Number(i.price) * Number(i.qty);
      }));
      const c = Dash.card("<h3>Item by item</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Item" }, { k: "qty", l: "Units" },
        { k: "value", l: "Value", fmt: r => money(r.value) }
      ], Object.keys(byItem).map(k => Object.assign({ name: k }, byItem[k]))
        .sort((a, b) => b.value - a.value)));
      host.appendChild(c);
    }
  },

  {
    id: "details", label: "My Details", type: "custom",
    desc: "How buyers see you.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "village", l: "Village or town" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, village: data.village, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Saved.");
        location.reload();
      }, null, "Save"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
