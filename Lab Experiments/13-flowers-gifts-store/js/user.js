/* ==========================================================================
   user.js - customer side
   Modules: shop, basket and checkout, my orders, scheduled deliveries, account.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let coupon = null;     // code applied to the basket

const myCart = () => DB.all("cart").filter(c => c.user === SESSION.email);
const myOrders = () => DB.all("orders").filter(o => o.user === SESSION.email);
const subtotal = () => myCart()
  .reduce((s, c) => s + Number(productOf(c.productId).price) * Number(c.qty), 0);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "shop", label: "Shop", type: "custom",
    desc: "Find something by the occasion, who it is for, or what you want to spend.",
    render(host) {
      const all = DB.all("products");
      const card = Dash.card(
        "<h3>What is the occasion?</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Occasion</label><select id="occ"><option value="">Any occasion</option>' +
        [...new Set(all.map(p => p.occasion))].map(o => "<option>" + esc(o) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Who is it for</label><select id="rec"><option value="">Anyone</option>' +
        [...new Set(all.map(p => p.recipient))].map(o => "<option>" + esc(o) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Category</label><select id="cat"><option value="">All</option>' +
        [...new Set(all.map(p => p.category))].map(o => "<option>" + esc(o) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Up to (Rs.)</label><input type="number" id="max" placeholder="any"></div>' +
        '  <div class="field"><label>Search</label><input id="q" placeholder="name"></div>' +
        '  <div class="field"><label>Delivery</label><select id="sd">' +
        '    <option value="">Any day</option><option value="Yes">Same day possible</option></select></div>' +
        "</div>");
      host.appendChild(card);

      const tier = tierOf(SESSION.email);
      if (tier.pct) host.insertAdjacentHTML("beforeend",
        '<div class="note">You are a <b>' + esc(tier.name) + "</b> customer, so " + tier.pct +
        "% comes off every order automatically.</div>");

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const occ = card.querySelector("#occ").value;
        const rec = card.querySelector("#rec").value;
        const cat = card.querySelector("#cat").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const sd = card.querySelector("#sd").value;

        const rows = all.filter(p =>
          (!occ || p.occasion === occ) && (!rec || p.recipient === rec) &&
          (!cat || p.category === cat) && Number(p.price) <= max &&
          (!sd || p.sameDay === sd) &&
          (!q || (p.name + p.description).toLowerCase().includes(q)));

        out.innerHTML = '<p class="muted">' + rows.length + " gift(s).</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(p => {
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(p.occasion) + "</span>" +
            (p.sameDay === "Yes" ? ' <span class="tag ok">same day</span>' : "") +
            '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(p.category) + " &middot; " + esc(p.recipient) + "</p>" +
            '<p class="meta">' + esc(p.description) + "</p>" +
            '<div class="row"><span class="price">' + money(p.price) + "</span>" +
            (Number(p.stock) > 0 ? '<span class="meta">' + p.stock + " left</span>"
                                 : '<span class="tag bad">sold out</span>') + "</div>";
          const b = document.createElement("button");
          b.className = "btn sm";
          b.style.marginTop = ".8rem";
          b.textContent = "Add to basket";
          b.disabled = Number(p.stock) < 1;
          b.onclick = () => {
            const line = myCart().find(c => String(c.productId) === String(p.id));
            const have = line ? Number(line.qty) : 0;
            if (have + 1 > Number(p.stock)) { Dash.toast("Only " + p.stock + " left."); return; }
            if (line) DB.update("cart", line.id, { qty: have + 1 });
            else DB.insert("cart", { user: SESSION.email, productId: p.id, qty: 1 });
            Dash.toast("Added to the basket.");
            paint();
          };
          t.appendChild(b);
          grid.appendChild(t);
        });
      };

      ["#occ", "#rec", "#cat", "#sd"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#q").oninput = paint;
      card.querySelector("#max").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "basket", label: "Basket", type: "custom",
    desc: "Delivery date, time, the message on the card, and what it comes to.",
    render(host) {
      const rows = myCart();
      const c = Dash.card("<h3>Your basket</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Gift", fmt: r => esc(productOf(r.productId).name) },
        { k: "price", l: "Price", fmt: r => money(productOf(r.productId).price) },
        { k: "qty", l: "Qty" },
        { k: "line", l: "Total", fmt: r => money(Number(productOf(r.productId).price) * Number(r.qty)) }
      ], rows, r => [
        { label: "-", cls: "flat", fn: () => {
            if (Number(r.qty) <= 1) DB.remove("cart", r.id);
            else DB.update("cart", r.id, { qty: Number(r.qty) - 1 });
            Dash.show(MODULES.find(m => m.id === "basket"));
          } },
        { label: "+", cls: "flat", fn: () => {
            if (Number(r.qty) + 1 > Number(productOf(r.productId).stock)) {
              Dash.toast("No more in stock."); return;
            }
            DB.update("cart", r.id, { qty: Number(r.qty) + 1 });
            Dash.show(MODULES.find(m => m.id === "basket"));
          } },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("cart", r.id); Dash.show(MODULES.find(m => m.id === "basket"));
          } }
      ]));
      host.appendChild(c);

      if (!rows.length) {
        host.insertAdjacentHTML("beforeend",
          '<div class="note">Your basket is empty. Have a look in the <b>Shop</b>.</div>');
        return;
      }

      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      const form = Dash.card("<h3>Where is it going?</h3>");
      const summary = document.createElement("div");
      summary.className = "note";

      form.appendChild(Dash.form([
        { k: "recipientName", l: "Recipient's name", req: true },
        { k: "recipientPhone", l: "Recipient's phone", req: true },
        { k: "address", l: "Delivery address", t: "textarea", req: true, full: true },
        { k: "deliveryDate", l: "Delivery date", t: "date", req: true, def: addDays(today(), 1) },
        { k: "slot", l: "Time", t: "select", opts: SLOTS },
        { k: "message", l: "Message on the gift card", full: true },
        { k: "code", l: "Discount code" },
        { k: "payment", l: "Pay by", t: "select",
          opts: ["UPI", "Credit card", "Debit card", "Net banking", "Cash on delivery"] }
      ], {}, data => {
        const d = daysBetween(today(), data.deliveryDate);
        if (d < 0) { Dash.toast("Pick today or a later date."); return; }
        if (d > 90) { Dash.toast("We take orders up to ninety days ahead."); return; }

        const items = myCart().map(r => {
          const p = productOf(r.productId);
          return { productId: r.productId, name: p.name, price: Number(p.price), qty: Number(r.qty) };
        });
        const short = items.find(i => i.qty > Number(productOf(i.productId).stock));
        if (short) { Dash.toast(short.name + " is no longer in stock in that quantity."); return; }
        if (d === 0 && items.some(i => productOf(i.productId).sameDay !== "Yes")) {
          Dash.toast("Something in the basket cannot go out the same day."); return;
        }

        const code = couponByCode(data.code);
        if (data.code && !code) { Dash.toast("That code is not valid."); return; }
        const bill = priceOrder(subtotal(), SESSION.email, code, data.slot, data.deliveryDate);
        if (code && subtotal() < Number(code.minOrder)) {
          Dash.toast("That code needs an order of " + money(code.minOrder) + " or more."); return;
        }

        const o = DB.insert("orders", Object.assign({}, data, {
          user: SESSION.email, name: SESSION.name, items: items,
          subtotal: bill.subtotal, loyalty: bill.loyalty, couponOff: bill.couponOff,
          couponCode: code ? code.code : "", delivery: bill.delivery, amount: bill.total,
          status: "Placed", placedOn: today()
        }));
        items.forEach(i => {
          const p = DB.get("products", i.productId);
          if (p) DB.update("products", p.id, { stock: Number(p.stock) - i.qty });
        });
        myCart().forEach(r => DB.remove("cart", r.id));
        Dash.toast("Order #" + o.id + " placed. A confirmation has been sent to you and " +
          "the recipient will get a message on the day.");
        Dash.show(MODULES.find(m => m.id === "orders"));
      }, null, "Place the order"));

      /* live bill under the form */
      const update = () => {
        const f = form.querySelector("form");
        if (!f) return;
        const code = couponByCode(f.querySelector('[name="code"]').value);
        const date = f.querySelector('[name="deliveryDate"]').value;
        const slot = f.querySelector('[name="slot"]').value;
        const b = priceOrder(subtotal(), SESSION.email, code, slot, date);
        summary.innerHTML =
          "Gifts " + money(b.subtotal) +
          (b.loyalty ? "<br>" + esc(b.tier.name) + " discount (" + b.tier.pct + "%) &minus; " + money(b.loyalty) : "") +
          (b.couponOff ? "<br>Code " + esc(code.code) + " (" + code.percent + "%) &minus; " + money(b.couponOff) : "") +
          "<br>Delivery " + (b.delivery ? money(b.delivery) : "free") +
          (date === today() ? " (same day)" : "") +
          (slot && slot.indexOf("Midnight") === 0 ? " (midnight)" : "") +
          "<br><b>To pay " + money(b.total) + "</b>";
      };
      form.appendChild(summary);
      form.querySelectorAll("form input, form select").forEach(el => {
        el.oninput = update; el.onchange = update;
      });
      host.appendChild(form);
      update();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "My Orders", type: "custom",
    desc: "Track what is on its way and what is booked for later.",
    render(host) {
      const rows = myOrders();
      const ahead = rows.filter(o => isScheduled(o) && !["Delivered", "Cancelled"].includes(o.status));
      const tier = tierOf(SESSION.email);
      host.appendChild(Dash.stats([
        { n: rows.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length, l: "On the way" },
        { n: ahead.length, l: "Booked for later" },
        { n: tier.pct ? tier.name + " &middot; " + tier.pct + "%" : "New", l: "Your standing" }
      ]));

      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "items", l: "Gifts", fmt: o => esc(itemsText(o)) },
        { k: "recipientName", l: "To" },
        { k: "deliveryDate", l: "On" },
        { k: "slot", l: "Slot" },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "saved", l: "You saved", fmt: o =>
            Number(o.loyalty || 0) + Number(o.couponOff || 0)
              ? money(Number(o.loyalty || 0) + Number(o.couponOff || 0)) : "-" },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], rows, o => canCancel(o) ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this order?")) {
            (o.items || []).forEach(it => {
              const p = DB.get("products", it.productId);
              if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(it.qty) });
            });
            DB.update("orders", o.id, { status: "Cancelled" });
            Dash.toast("Order cancelled; the refund follows in three days.");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        }
      }] : []));
      host.appendChild(c);

      rows.filter(o => !["Delivered", "Cancelled"].includes(o.status)).forEach(o => {
        const done = STATES.indexOf(o.status);
        host.appendChild(Dash.card(
          "<h3>Order #" + o.id + " &middot; " + esc(o.deliveryDate) + "</h3>" +
          '<p class="muted">' + esc(itemsText(o)) + " &rarr; " + esc(o.recipientName) + "</p>" +
          '<div class="steps" style="margin-top:1rem">' +
          STATES.slice(0, 4).map((s, i) =>
            "<div><h3>" + esc(s) + '</h3><p class="meta" style="margin:0">' +
            (i <= done ? "done" : "pending") + "</p></div>").join("") + "</div>"));
      });

      host.insertAdjacentHTML("beforeend",
        '<div class="note">An order can be cancelled while it is still <b>placed</b>. ' +
        "Orders can be booked up to ninety days ahead for a date you choose.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "account", label: "My Account", type: "custom",
    desc: "Your details and your standing discount.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const tier = tierOf(SESSION.email);
      host.appendChild(Dash.card(
        "<h3>Your standing</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Orders delivered</b>" + tier.orders + "</li>" +
        "<li><b>Tier</b>" + esc(tier.name) + "</li>" +
        "<li><b>Standing discount</b>" + (tier.pct ? tier.pct + "% off every order" : "none yet") + "</li>" +
        "</ul>" +
        '<p class="meta">Three delivered orders earn Silver and 5% off; six earn Gold and 10%.</p>'));

      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "address", l: "Your address", t: "textarea", full: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, address: data.address, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Details saved.");
        location.reload();
      }, null, "Save details"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
