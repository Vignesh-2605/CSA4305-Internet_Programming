/* ==========================================================================
   user.js - the buyer
   Modules: market, cart and checkout, my orders, wallet, my details.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let pendingOrder = null;      // order details waiting on a one time code
let otpCode = null;

const myCart = () => DB.all("cart").filter(c => c.user === SESSION.email);
const subtotal = () => myCart()
  .reduce((s, c) => s + Number(productOf(c.productId).price) * Number(c.qty), 0);

const MODULES = [
  {
    id: "market", label: "Market", type: "custom",
    desc: "Everything farmers have listed today.",
    render(host) {
      const all = DB.all("products");
      const card = Dash.card(
        "<h3>Find what you need</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Category</label><select id="cat"><option value="">All</option>' +
        [...new Set(all.map(p => p.category))].map(c => "<option>" + esc(c) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Up to (Rs.)</label><input type="number" id="max" placeholder="any"></div>' +
        '  <div class="field"><label>Search</label><input id="q" placeholder="item or farmer"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = all.filter(p =>
          (!cat || p.category === cat) && Number(p.price) <= max &&
          (!q || (p.name + p.description + userOf(p.farmer).name).toLowerCase().includes(q)));

        out.innerHTML = '<p class="muted">' + rows.length + " line(s).</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(p => {
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(p.category) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(userOf(p.farmer).name) + ", " +
              esc(userOf(p.farmer).village || "-") + "</p>" +
            '<p class="meta">' + esc(p.description) + "</p>" +
            '<div class="row"><span class="price">' + money(p.price) +
            '<span class="meta"> / ' + esc(p.unit) + "</span></span>" +
            (Number(p.stock) > 0 ? '<span class="meta">' + p.stock + " left</span>"
                                 : '<span class="tag bad">out of stock</span>') + "</div>";
          const b = document.createElement("button");
          b.className = "btn sm";
          b.style.marginTop = ".8rem";
          b.textContent = "Add to cart";
          b.disabled = Number(p.stock) < 1;
          b.onclick = () => {
            const line = myCart().find(c => String(c.productId) === String(p.id));
            const have = line ? Number(line.qty) : 0;
            if (have + 1 > Number(p.stock)) { Dash.toast("Only " + p.stock + " left."); return; }
            if (line) DB.update("cart", line.id, { qty: have + 1 });
            else DB.insert("cart", { user: SESSION.email, productId: p.id, qty: 1 });
            Dash.toast("Added."); paint();
          };
          t.appendChild(b);
          grid.appendChild(t);
        });
      };
      card.querySelector("#cat").onchange = paint;
      card.querySelector("#max").oninput = paint;
      card.querySelector("#q").oninput = paint;
      paint();
    }
  },

  {
    id: "cart", label: "My Cart", type: "custom",
    desc: "Checkout is paid from the wallet and confirmed with a one time code.",
    render(host) {
      const rows = myCart();
      const sub = subtotal();
      const ship = shippingFor(sub);

      const c = Dash.card("<h3>Cart</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Item", fmt: r => esc(productOf(r.productId).name) },
        { k: "farmer", l: "From", fmt: r => esc(userOf(productOf(r.productId).farmer).name) },
        { k: "price", l: "Price", fmt: r => money(productOf(r.productId).price) },
        { k: "qty", l: "Qty" },
        { k: "line", l: "Total", fmt: r => money(Number(productOf(r.productId).price) * Number(r.qty)) }
      ], rows, r => [
        { label: "-", cls: "flat", fn: () => {
            if (Number(r.qty) <= 1) DB.remove("cart", r.id);
            else DB.update("cart", r.id, { qty: Number(r.qty) - 1 });
            Dash.show(MODULES.find(m => m.id === "cart"));
          } },
        { label: "+", cls: "flat", fn: () => {
            if (Number(r.qty) + 1 > Number(productOf(r.productId).stock)) {
              Dash.toast("No more in stock."); return;
            }
            DB.update("cart", r.id, { qty: Number(r.qty) + 1 });
            Dash.show(MODULES.find(m => m.id === "cart"));
          } },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("cart", r.id); Dash.show(MODULES.find(m => m.id === "cart"));
          } }
      ]));
      host.appendChild(c);

      if (!rows.length) {
        host.insertAdjacentHTML("beforeend",
          '<div class="note">Your cart is empty. Have a look at the <b>Market</b>.</div>');
        return;
      }

      host.appendChild(Dash.card(
        "<h3>Summary</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Goods</b>" + money(sub) + "</li>" +
        "<li><b>Delivery</b>" + (ship ? money(ship) : "free over " + money(FREE_SHIP_OVER)) + "</li>" +
        "<li><b>To pay</b>" + money(sub + ship) + "</li>" +
        "<li><b>Wallet balance</b>" + money(wallet(SESSION.email)) + "</li></ul>"));

      if (pendingOrder) {
        const conf = Dash.card(
          "<h3>Confirm the order</h3>" +
          '<div class="note">Demonstration: the code sent to your mobile is <b>' +
          esc(otpCode) + "</b>.</div>");
        conf.appendChild(Dash.form([
          { k: "code", l: "One time code", req: true }
        ], {}, data => {
          if (data.code.trim() !== otpCode) { Dash.toast("That code is not right."); return; }
          const items = myCart().map(r => {
            const p = productOf(r.productId);
            return { productId: r.productId, name: p.name, farmer: p.farmer,
                     price: Number(p.price), qty: Number(r.qty) };
          });
          const short = items.find(i => i.qty > Number(productOf(i.productId).stock));
          if (short) { Dash.toast(short.name + " is no longer in stock in that quantity."); return; }
          const total = sub + ship;
          if (wallet(SESSION.email) < total) { Dash.toast("Not enough in the wallet."); return; }

          const o = DB.insert("orders", Object.assign({}, pendingOrder, {
            buyer: SESSION.email, items: items, amount: total,
            placedOn: today(), status: "Placed"
          }));
          items.forEach(i => {
            const p = DB.get("products", i.productId);
            if (p) DB.update("products", p.id, { stock: Number(p.stock) - i.qty });
          });
          moveMoney(SESSION.email, -total, "Order", "Order #" + o.id);
          myCart().forEach(r => DB.remove("cart", r.id));
          pendingOrder = null; otpCode = null;
          Dash.toast("Order #" + o.id + " placed.");
          Dash.show(MODULES.find(m => m.id === "orders"));
        }, () => { pendingOrder = null; otpCode = null; Dash.show(MODULES.find(m => m.id === "cart")); },
          "Confirm and pay"));
        host.appendChild(conf);
        return;
      }

      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      const out = Dash.card("<h3>Delivery</h3>");
      out.appendChild(Dash.form([
        { k: "name", l: "Deliver to", req: true, def: me.name || "" },
        { k: "phone", l: "Phone", req: true, def: me.phone || "" },
        { k: "address", l: "Shipping address", t: "textarea", req: true, full: true, def: me.address || "" }
      ], {}, data => {
        if (wallet(SESSION.email) < sub + ship) {
          Dash.toast("Not enough in the wallet - top it up first."); return;
        }
        pendingOrder = data;
        otpCode = makeOtp();
        Dash.toast("A one time code has been sent to your mobile.");
        Dash.show(MODULES.find(m => m.id === "cart"));
      }, null, "Send me a code"));
      host.appendChild(out);
    }
  },

  {
    id: "orders", label: "My Orders", type: "custom",
    desc: "What is on the way, with the shipping status the farmer sets.",
    render(host) {
      const rows = DB.all("orders").filter(o => o.buyer === SESSION.email);
      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" }, { k: "placedOn", l: "Placed" },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "status", l: "Shipping", fmt: o => stateTag(o.status) }
      ], rows, o => o.status === "Placed" ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this order? The money goes back to your wallet.")) {
            (o.items || []).forEach(i => {
              const p = DB.get("products", i.productId);
              if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(i.qty) });
            });
            DB.update("orders", o.id, { status: "Cancelled" });
            moveMoney(SESSION.email, Number(o.amount), "Refund", "Order #" + o.id + " cancelled");
            Dash.toast("Cancelled and refunded.");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        }
      }] : []));
      host.appendChild(c);

      rows.filter(o => !["Delivered", "Cancelled"].includes(o.status)).forEach(o => {
        const done = FLOW.indexOf(o.status);
        host.appendChild(Dash.card(
          "<h3>Order #" + o.id + "</h3>" +
          '<p class="muted">' + esc(itemsText(o)) + "</p>" +
          '<div class="steps" style="margin-top:1rem">' +
          FLOW.slice(0, 4).map((s, i) =>
            "<div><h3>" + esc(s) + '</h3><p class="meta" style="margin:0">' +
            (i <= done ? "done" : "pending") + "</p></div>").join("") + "</div>"));
      });
    }
  },

  {
    id: "wallet", label: "My Wallet", type: "custom",
    desc: "Orders are paid from this balance.",
    render(host) {
      host.appendChild(Dash.stats([
        { n: money(wallet(SESSION.email)), l: "Balance" }
      ]));
      const card = Dash.card("<h3>Add money</h3>");
      card.appendChild(Dash.form([
        { k: "amount", l: "Amount (Rs.)", t: "number", min: 100, def: 1000, req: true },
        { k: "mode", l: "Pay by", t: "select", opts: ["UPI", "Net banking", "Debit card"] }
      ], {}, data => {
        if (Number(data.amount) < 100) { Dash.toast("The smallest top-up is Rs.100."); return; }
        moveMoney(SESSION.email, Number(data.amount), "Top-up", data.mode);
        Dash.toast("Added.");
        Dash.show(MODULES.find(m => m.id === "wallet"));
      }, null, "Add to wallet"));
      host.appendChild(card);

      const c = Dash.card("<h3>Statement</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" }, { k: "kind", l: "What" }, { k: "ref", l: "Reference" },
        { k: "amount", l: "Amount", fmt: t => (Number(t.amount) > 0 ? "+" : "") + money(t.amount) },
        { k: "balance", l: "Balance", fmt: t => money(t.balance) }
      ], DB.all("walletTxns").filter(t => t.user === SESSION.email).slice().reverse()));
      host.appendChild(c);
    }
  },

  {
    id: "details", label: "My Details", type: "custom",
    desc: "Shipping details used at checkout.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "address", l: "Shipping address", t: "textarea", full: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, address: data.address, password: data.password });
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
