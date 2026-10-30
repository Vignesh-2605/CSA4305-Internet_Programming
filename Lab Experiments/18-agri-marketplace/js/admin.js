/* ==========================================================================
   admin.js - marketplace desk
   Modules: overview, all produce, all orders, farmers, buyers.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const MODULES = [
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "What is listed, what is selling and who is selling it.",
    render(host) {
      const orders = DB.all("orders");
      const live = orders.filter(o => o.status !== "Cancelled");
      host.appendChild(Dash.stats([
        { n: DB.all("products").length, l: "Lines listed" },
        { n: DB.all("users").filter(u => u.role === "farmer").length, l: "Farmers selling" },
        { n: live.length, l: "Orders" },
        { n: money(live.reduce((s, o) => s + Number(o.amount), 0)), l: "Value traded" }
      ]));

      const byCat = {};
      DB.all("products").forEach(p => {
        byCat[p.category] = byCat[p.category] || { n: 0, stock: 0 };
        byCat[p.category].n++; byCat[p.category].stock += Number(p.stock);
      });
      const c = Dash.card("<h3>By category</h3>");
      c.appendChild(Dash.table([
        { k: "cat", l: "Category" }, { k: "n", l: "Lines" }, { k: "stock", l: "Units in stock" }
      ], Object.keys(byCat).map(k => Object.assign({ cat: k }, byCat[k]))));
      host.appendChild(c);
    }
  },

  {
    id: "products", label: "All Produce", type: "custom",
    desc: "Everything farmers have listed. The desk can take a line down.",
    render(host) {
      const c = Dash.card("<h3>Listings</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Item" }, { k: "category", l: "Category" },
        { k: "farmer", l: "Sold by", fmt: p => esc(userOf(p.farmer).name) },
        { k: "price", l: "Price", fmt: p => money(p.price) + " / " + esc(p.unit) },
        { k: "stock", l: "Stock" }
      ], DB.all("products"), p => [{
        label: "Take down", cls: "danger", fn: () => {
          if (confirm("Remove this listing?")) {
            DB.remove("products", p.id);
            Dash.show(MODULES.find(m => m.id === "products"));
          }
        }
      }]));
      host.appendChild(c);
    }
  },

  {
    id: "orders", label: "All Orders", type: "custom",
    desc: "Every order placed on the market.",
    render(host) {
      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" }, { k: "placedOn", l: "Placed" },
        { k: "buyer", l: "Buyer", fmt: o => esc(userOf(o.buyer).name) },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "amount", l: "Amount", fmt: o => money(o.amount) },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], DB.all("orders")));
      host.appendChild(c);
    }
  },

  {
    id: "farmers", label: "Farmers", type: "custom",
    desc: "Who sells here and how much they have moved.",
    render(host) {
      const c = Dash.card("<h3>Farmers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "village", l: "Village" }, { k: "joined", l: "Since" },
        { k: "lines", l: "Lines", fmt: u => DB.all("products")
            .filter(p => p.farmer === u.email).length },
        { k: "sold", l: "Sold", fmt: u => money(DB.all("orders")
            .filter(o => o.status !== "Cancelled")
            .reduce((s, o) => s + linesFor(o, u.email)
              .reduce((t, i) => t + Number(i.price) * Number(i.qty), 0), 0)) }
      ], DB.all("users").filter(u => u.role === "farmer")));
      host.appendChild(c);
    }
  },

  {
    id: "buyers", label: "Buyers", type: "custom",
    desc: "Accounts buying on the market.",
    render(host) {
      const c = Dash.card("<h3>Buyers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "wallet", l: "Wallet", fmt: u => money(u.wallet || 0) },
        { k: "orders", l: "Orders", fmt: u => DB.all("orders")
            .filter(o => o.buyer === u.email && o.status !== "Cancelled").length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
