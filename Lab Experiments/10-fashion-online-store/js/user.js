/* ==========================================================================
   user.js - the shop as a customer sees it
   Modules: shop with size and colour, size guide, cart and checkout,
            orders with returns, my returns, wishlist, account.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let openProduct = null;
let returning = null;     // { order, item } being sent back

const myCart = () => DB.all("cart").filter(c => c.user === SESSION.email);
const myList = () => DB.all("wishlist").filter(w => w.user === SESSION.email);
const myOrders = () => DB.all("orders").filter(o => o.user === SESSION.email);
const cartSubtotal = () => myCart()
  .reduce((s, c) => s + salePrice(productOf(c.productId)) * Number(c.qty), 0);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "shop", label: "Shop", type: "custom",
    desc: "Filter by department, type, size or colour, then pick your size.",
    render(host) {
      const all = DB.all("products");
      const types = [...new Set(all.map(p => p.type))];
      const sizes = [...new Set(all.flatMap(p => listOf(p.sizes)))];
      const colours = [...new Set(all.flatMap(p => listOf(p.colours)))];

      const card = Dash.card(
        "<h3>Find your style</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Department</label><select id="cat"><option value="">Everyone</option>' +
        "    <option>Men</option><option>Women</option><option>Kids</option></select></div>" +
        '  <div class="field"><label>Type</label><select id="ty"><option value="">All types</option>' +
        types.map(t => "<option>" + esc(t) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Size</label><select id="sz"><option value="">Any size</option>' +
        sizes.map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Colour</label><select id="co"><option value="">Any colour</option>' +
        colours.map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Up to (Rs.)</label><input type="number" id="max" placeholder="any price"></div>' +
        '  <div class="field"><label>Search</label><input id="q" placeholder="style or brand"></div>' +
        '  <div class="field"><label>Show</label><select id="only">' +
        '    <option value="">Everything</option><option value="sale">On sale only</option></select></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const ty = card.querySelector("#ty").value;
        const sz = card.querySelector("#sz").value;
        const co = card.querySelector("#co").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const only = card.querySelector("#only").value;

        const rows = all.filter(p =>
          (!cat || p.category === cat) && (!ty || p.type === ty) &&
          (!sz || listOf(p.sizes).includes(sz)) &&
          (!co || listOf(p.colours).includes(co)) &&
          salePrice(p) <= max &&
          (!q || (p.name + p.brand + p.description).toLowerCase().includes(q)) &&
          (!only || Number(p.sale) > 0));

        out.innerHTML = '<p class="muted">' + rows.length + " style(s).</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(p => {
          const r = ratingOf(p.id);
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(p.category) + " &middot; " + esc(p.type) + "</span>" +
            (Number(p.sale) > 0 ? ' <span class="tag warn">' + p.sale + "% off today</span>" : "") +
            '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(p.brand) + "</p>" +
            '<div class="row"><span class="price">' + money(salePrice(p)) + "</span>" +
            '<span class="meta"><s>' + money(p.mrp) + "</s> " + offPct(p) + "% off</span></div>" +
            '<p class="meta" style="margin:.4rem 0 0">' +
            (Number(p.stock) > 0 ? '<span class="tag ok">' + p.stock + " in stock</span>"
                                 : '<span class="tag bad">sold out</span>') +
            (r ? ' <span class="tag">' + r + " / 5</span>" : "") + "</p>";

          const pick = document.createElement("div");
          pick.className = "form-row";
          pick.style.marginTop = ".7rem";
          pick.innerHTML =
            '<div class="field"><label>Size</label><select class="sz">' +
            listOf(p.sizes).map(s => "<option>" + esc(s) + "</option>").join("") + "</select></div>" +
            '<div class="field"><label>Colour</label><select class="co">' +
            listOf(p.colours).map(s => "<option>" + esc(s) + "</option>").join("") + "</select></div>";
          t.appendChild(pick);

          const row = document.createElement("div");
          row.className = "form-actions";

          const add = document.createElement("button");
          add.className = "btn sm";
          add.textContent = "Add to cart";
          add.disabled = Number(p.stock) < 1;
          add.onclick = () => {
            const size = pick.querySelector(".sz").value;
            const colour = pick.querySelector(".co").value;
            const line = myCart().find(c => String(c.productId) === String(p.id) &&
              c.size === size && c.colour === colour);
            const have = line ? Number(line.qty) : 0;
            if (have + 1 > Number(p.stock)) { Dash.toast("Only " + p.stock + " left."); return; }
            if (line) DB.update("cart", line.id, { qty: have + 1 });
            else DB.insert("cart", {
              user: SESSION.email, productId: p.id, size: size, colour: colour, qty: 1 });
            Dash.toast(esc(p.name) + " (" + size + ", " + colour + ") added.");
            paint();
          };

          const wish = document.createElement("button");
          wish.className = "btn sm flat";
          const already = myList().some(w => String(w.productId) === String(p.id));
          wish.textContent = already ? "In wishlist" : "Wishlist";
          wish.disabled = already;
          wish.onclick = () => {
            DB.insert("wishlist", { user: SESSION.email, productId: p.id, added: today() });
            Dash.toast("Saved for later."); paint();
          };

          const more = document.createElement("button");
          more.className = "btn sm flat";
          more.textContent = openProduct === p.id ? "Hide details" : "Details";
          more.onclick = () => { openProduct = openProduct === p.id ? null : p.id; paint(); };

          row.appendChild(add); row.appendChild(wish); row.appendChild(more);
          t.appendChild(row);

          if (openProduct === p.id) {
            const d = document.createElement("div");
            d.style.marginTop = ".9rem";
            d.innerHTML = '<p class="meta">' + esc(p.description) + "</p>" +
              '<p class="meta">Sizes: ' + esc(p.sizes) + "<br>Colours: " + esc(p.colours) + "</p>" +
              "<h4>Reviews</h4>";
            const revs = DB.all("reviews").filter(x => String(x.productId) === String(p.id));
            d.innerHTML += revs.length
              ? revs.map(x => '<p class="meta">' + "*".repeat(Number(x.rating)) + " - " +
                  esc(x.comment) + " <i>" + esc(x.user) + "</i></p>").join("")
              : '<p class="meta">No reviews yet.</p>';
            d.appendChild(Dash.form([
              { k: "rating", l: "Your rating", t: "select", opts: [5, 4, 3, 2, 1] },
              { k: "comment", l: "Your review", req: true, full: true }
            ], {}, (data, form) => {
              DB.insert("reviews", Object.assign(data, {
                user: SESSION.name, productId: p.id, date: today() }));
              form.reset(); Dash.toast("Thanks for the review."); paint();
            }, null, "Post review"));
            t.appendChild(d);
          }
          grid.appendChild(t);
        });
      };

      ["#cat", "#ty", "#sz", "#co", "#only"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#q").oninput = paint;
      card.querySelector("#max").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "guide", label: "Size Guide", type: "custom",
    desc: "Measurements in inches - measure a garment that fits you and compare.",
    render(host) {
      ["Men", "Women", "Kids"].forEach(cat => {
        const rows = DB.all("sizeGuide").filter(s => s.category === cat);
        if (!rows.length) return;
        const c = Dash.card("<h3>" + cat + "</h3>");
        c.appendChild(Dash.table([
          { k: "size", l: "Size" }, { k: "chest", l: "Chest (in)" },
          { k: "waist", l: "Waist (in)" }, { k: "length", l: "Length (in)" }
        ], rows));
        host.appendChild(c);
      });
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Between two sizes? Take the larger one for casual wear and the ' +
        "smaller for formal. Anything that does not fit can be exchanged within " +
        RETURN_DAYS + " days of delivery.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "cart", label: "My Cart", type: "custom",
    desc: "Sizes and colours you picked, ready to check out.",
    render(host) {
      const rows = myCart();
      const sub = cartSubtotal();
      const ship = shippingFor(sub);

      const c = Dash.card("<h3>Shopping bag</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Style", fmt: r => esc(productOf(r.productId).name) },
        { k: "size", l: "Size" },
        { k: "colour", l: "Colour" },
        { k: "price", l: "Price", fmt: r => money(salePrice(productOf(r.productId))) },
        { k: "qty", l: "Qty" },
        { k: "line", l: "Total", fmt: r => money(salePrice(productOf(r.productId)) * Number(r.qty)) }
      ], rows, r => [
        { label: "-", cls: "flat", fn: () => {
            if (Number(r.qty) <= 1) DB.remove("cart", r.id);
            else DB.update("cart", r.id, { qty: Number(r.qty) - 1 });
            Dash.show(MODULES.find(m => m.id === "cart"));
          } },
        { label: "+", cls: "flat", fn: () => {
            if (Number(r.qty) + 1 > Number(productOf(r.productId).stock)) {
              Dash.toast("No more pieces in stock."); return;
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
          '<div class="note">Your bag is empty. Have a look through the <b>Shop</b>.</div>');
        return;
      }

      host.appendChild(Dash.card(
        "<h3>Bag summary</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Items</b>" + money(sub) + "</li>" +
        "<li><b>Delivery</b>" + (ship ? money(ship) : "free over " + money(FREE_SHIP_OVER)) + "</li>" +
        "<li><b>To pay</b>" + money(sub + ship) + "</li></ul>"));

      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      const out = Dash.card("<h3>Checkout</h3>");
      out.appendChild(Dash.form([
        { k: "name", l: "Deliver to", req: true, def: me.name || "" },
        { k: "phone", l: "Phone", req: true, def: me.phone || "" },
        { k: "address", l: "Delivery address", t: "textarea", req: true, full: true, def: me.address || "" },
        { k: "payment", l: "Payment method", t: "select",
          opts: ["UPI", "Credit card", "Debit card", "Net banking", "Cash on delivery"] }
      ], {}, data => {
        const items = myCart().map(r => {
          const p = productOf(r.productId);
          return { productId: r.productId, name: p.name, size: r.size, colour: r.colour,
                   price: salePrice(p), qty: Number(r.qty) };
        });
        const short = items.find(i => i.qty > Number(productOf(i.productId).stock));
        if (short) { Dash.toast(short.name + " is no longer in stock in that quantity."); return; }

        const o = DB.insert("orders", Object.assign({}, data, {
          user: SESSION.email, items: items, amount: sub + ship,
          placedOn: today(), status: "Placed", deliveredOn: ""
        }));
        items.forEach(i => {
          const p = DB.get("products", i.productId);
          if (p) DB.update("products", p.id, { stock: Number(p.stock) - i.qty });
        });
        myCart().forEach(r => DB.remove("cart", r.id));
        Dash.toast("Order #" + o.id + " placed.");
        Dash.show(MODULES.find(m => m.id === "orders"));
      }, null, "Place the order (" + money(sub + ship) + ")"));
      host.appendChild(out);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "My Orders", type: "custom",
    desc: "Track an order, or send something back within " + RETURN_DAYS + " days of delivery.",
    render(host) {
      if (returning) { renderReturn(host); return; }

      const rows = myOrders();
      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "placedOn", l: "Placed" },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) },
        { k: "window", l: "Return window", fmt: o => {
            const d = returnWindow(o);
            return o.status !== "Delivered" ? "-"
              : d > 0 ? '<span class="tag ok">' + d + " day(s) left</span>"
                      : '<span class="tag mute">closed</span>';
          } }
      ], rows, o => {
        const acts = [];
        if (o.status === "Placed") acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this order?")) {
              (o.items || []).forEach(it => {
                const p = DB.get("products", it.productId);
                if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(it.qty) });
              });
              DB.update("orders", o.id, { status: "Cancelled" });
              Dash.toast("Order cancelled.");
              Dash.show(MODULES.find(m => m.id === "orders"));
            }
          }
        });
        if (returnWindow(o) > 0) acts.push({
          label: "Return / exchange", cls: "flat", fn: () => {
            returning = o.id; Dash.show(MODULES.find(m => m.id === "orders"));
          }
        });
        return acts;
      }));
      host.appendChild(c);

      const live = rows.filter(o => !["Delivered", "Cancelled"].includes(o.status));
      live.forEach(o => {
        const done = STATES.indexOf(o.status);
        host.appendChild(Dash.card(
          "<h3>Order #" + o.id + "</h3>" +
          '<p class="muted">' + esc(itemsText(o)) + "</p>" +
          '<div class="steps" style="margin-top:1rem">' +
          STATES.slice(0, 4).map((s, i) =>
            "<div><h3>" + esc(s) + '</h3><p class="meta" style="margin:0">' +
            (i <= done ? "done" : "pending") + "</p></div>").join("") + "</div>"));
      });
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "returns", label: "My Returns", type: "custom",
    desc: "Returns and exchanges you have asked for.",
    render(host) {
      const rows = DB.all("returns").filter(r => r.user === SESSION.email);
      const c = Dash.card("<h3>Requests</h3>");
      c.appendChild(Dash.table([
        { k: "raisedOn", l: "Raised" },
        { k: "orderId", l: "Order" },
        { k: "product", l: "Item", fmt: r => esc(productOf(r.productId).name) + " (" + esc(r.size) + ")" },
        { k: "type", l: "Type" },
        { k: "newSize", l: "Exchange for", fmt: r => r.type === "Exchange" ? esc(r.newSize) : "-" },
        { k: "reason", l: "Reason" },
        { k: "status", l: "Status", fmt: r => retTag(r.status) }
      ], rows));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Requests are collected by courier once they are approved. ' +
        "Refunds reach the original payment method about five days after that.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "wishlist", label: "Wishlist", type: "custom",
    desc: "Styles you saved for later.",
    render(host) {
      const c = Dash.card("<h3>Saved styles</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Style", fmt: w => esc(productOf(w.productId).name) },
        { k: "brand", l: "Brand", fmt: w => esc(productOf(w.productId).brand) },
        { k: "price", l: "Price now", fmt: w => money(salePrice(productOf(w.productId))) },
        { k: "sale", l: "On sale", fmt: w => Number(productOf(w.productId).sale) > 0
            ? '<span class="tag warn">' + productOf(w.productId).sale + "% off</span>" : "-" },
        { k: "stock", l: "Availability", fmt: w => Number(productOf(w.productId).stock) > 0
            ? '<span class="tag ok">in stock</span>' : '<span class="tag bad">sold out</span>' },
        { k: "added", l: "Saved on" }
      ], myList(), w => [{
        label: "Remove", cls: "danger", fn: () => {
          DB.remove("wishlist", w.id); Dash.show(MODULES.find(m => m.id === "wishlist"));
        }
      }]));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Pick a size and colour on the <b>Shop</b> page to move a saved ' +
        "style into your bag.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Account", type: "custom",
    desc: "Delivery details used at checkout.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Account details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "address", l: "Delivery address", t: "textarea", full: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, address: data.address, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Account updated.");
        location.reload();
      }, null, "Save changes"));
      host.appendChild(card);
    }
  }
];

/* ------------------------------------------------------------------------ */
/*  Raise a return or an exchange against a delivered order                 */
/* ------------------------------------------------------------------------ */
function renderReturn(host) {
  const o = DB.get("orders", returning);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to my orders";
  back.onclick = () => { returning = null; Dash.show(MODULES.find(m => m.id === "orders")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>Return or exchange from order #" + o.id + "</h3>" +
    '<p class="muted">Delivered on ' + esc(o.deliveredOn) + " &middot; " +
    returnWindow(o) + " day(s) of the window left.</p>");

  card.appendChild(Dash.form([
    { k: "lineNo", l: "Which item", t: "select", req: true,
      opts: (o.items || []).map((i, n) => ({ v: n, l: i.name + " (" + i.size + ", " + i.colour + ")" })) },
    { k: "type", l: "What would you like", t: "select", opts: ["Return", "Exchange"] },
    { k: "newSize", l: "Exchange for size", help: "Only needed for an exchange" },
    { k: "reason", l: "Reason", t: "textarea", req: true, full: true }
  ], {}, data => {
    const it = (o.items || [])[Number(data.lineNo)];
    if (!it) { Dash.toast("Pick an item."); return; }
    if (data.type === "Exchange" && !data.newSize) {
      Dash.toast("Tell us which size you would like instead."); return;
    }
    DB.insert("returns", {
      user: SESSION.email, orderId: o.id, productId: it.productId,
      size: it.size, colour: it.colour, type: data.type,
      newSize: data.newSize, reason: data.reason,
      status: "Requested", raisedOn: today()
    });
    returning = null;
    Dash.toast(data.type + " requested. We will collect it from your address.");
    Dash.show(MODULES.find(m => m.id === "returns"));
  }, null, "Raise the request"));

  host.appendChild(card);
}

Dash.mount(MODULES);
