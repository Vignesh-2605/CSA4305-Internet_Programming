/* ==========================================================================
   user.js - the shop as a customer sees it
   Modules: browse and search, cart and checkout, orders, wishlist, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let openProduct = null;        // product whose details are expanded

const myCart = () => DB.all("cart").filter(c => c.user === SESSION.email);
const myList = () => DB.all("wishlist").filter(w => w.user === SESSION.email);
const cartSubtotal = () => myCart()
  .reduce((s, c) => s + Number(productOf(c.productId).price) * Number(c.qty), 0);

function addToCart(productId, qty) {
  const p = productOf(productId);
  const row = myCart().find(c => String(c.productId) === String(productId));
  const have = row ? Number(row.qty) : 0;
  if (have + qty > Number(p.stock)) {
    Dash.toast("Only " + p.stock + " in stock.");
    return false;
  }
  if (row) DB.update("cart", row.id, { qty: have + qty });
  else DB.insert("cart", { user: SESSION.email, productId: Number(productId), qty: qty });
  return true;
}

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "shop", label: "Shop", type: "custom",
    desc: "Browse by category, search, filter and add to the cart.",
    render(host) {
      const cats = DB.all("categories");
      const subs = [...new Set(DB.all("products").map(p => p.subcategory))];
      const brands = [...new Set(DB.all("products").map(p => p.brand))];

      const card = Dash.card(
        "<h3>Find a product</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Category</label><select id="cat"><option value="">All categories</option>' +
        cats.map(c => "<option>" + esc(c.name) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Sub category</label><select id="sub"><option value="">All</option>' +
        subs.map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Brand</label><select id="br"><option value="">All brands</option>' +
        brands.map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Up to (Rs.)</label><input type="number" id="max" placeholder="any price"></div>' +
        '  <div class="field"><label>Search</label><input id="q" placeholder="name or description"></div>' +
        '  <div class="field"><label>Sort by</label><select id="sort">' +
        '    <option value="">Most popular</option><option value="low">Price: low to high</option>' +
        '    <option value="high">Price: high to low</option></select></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const sub = card.querySelector("#sub").value;
        const br = card.querySelector("#br").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const sort = card.querySelector("#sort").value;

        let rows = DB.all("products").filter(p =>
          (!cat || p.category === cat) && (!sub || p.subcategory === sub) &&
          (!br || p.brand === br) && Number(p.price) <= max &&
          (!q || (p.name + p.description + p.brand).toLowerCase().includes(q)));
        if (sort === "low") rows = rows.slice().sort((a, b) => a.price - b.price);
        if (sort === "high") rows = rows.slice().sort((a, b) => b.price - a.price);

        out.innerHTML = '<p class="muted">' + rows.length + " product(s).</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(p => {
          const r = ratingOf(p.id);
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(p.subcategory || p.category) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(p.brand) + "</p>" +
            '<div class="row"><span class="price">' + money(p.price) + "</span>" +
            (discount(p) ? '<span class="meta"><s>' + money(p.mrp) + "</s> " +
              discount(p) + "% off</span>" : "") + "</div>" +
            '<p class="meta" style="margin:.4rem 0 0">' +
            (inStock(p) ? '<span class="tag ok">in stock</span>'
                        : '<span class="tag bad">out of stock</span>') +
            (r ? ' <span class="tag">' + r + " / 5</span>" : "") + "</p>";

          const row = document.createElement("div");
          row.className = "form-actions";
          row.style.marginTop = ".8rem";

          const add = document.createElement("button");
          add.className = "btn sm";
          add.textContent = "Add to cart";
          add.disabled = !inStock(p);
          add.onclick = () => { if (addToCart(p.id, 1)) { Dash.toast("Added to the cart."); paint(); } };

          const wish = document.createElement("button");
          wish.className = "btn sm flat";
          const already = myList().some(w => String(w.productId) === String(p.id));
          wish.textContent = already ? "In wishlist" : "Wishlist";
          wish.disabled = already;
          wish.onclick = () => {
            DB.insert("wishlist", { user: SESSION.email, productId: p.id, added: today() });
            Dash.toast("Saved to your wishlist."); paint();
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
              '<p class="meta"><b>' + esc(p.brand) + "</b> &middot; " + esc(p.category) +
              " &middot; " + esc(p.subcategory) + " &middot; " + p.stock + " in stock</p>" +
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

      ["#cat", "#sub", "#br", "#sort"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#q").oninput = paint;
      card.querySelector("#max").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "cart", label: "My Cart", type: "custom",
    desc: "Change quantities, take things out, then check out.",
    render(host) {
      const rows = myCart();
      const sub = cartSubtotal();
      const ship = shippingFor(sub);

      const c = Dash.card("<h3>Shopping cart</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Product", fmt: r => esc(productOf(r.productId).name) },
        { k: "brand", l: "Brand", fmt: r => esc(productOf(r.productId).brand) },
        { k: "price", l: "Price", fmt: r => money(productOf(r.productId).price) },
        { k: "qty", l: "Quantity" },
        { k: "line", l: "Total", fmt: r => money(Number(productOf(r.productId).price) * Number(r.qty)) }
      ], rows, r => [
        { label: "-", cls: "flat", fn: () => {
            if (Number(r.qty) <= 1) DB.remove("cart", r.id);
            else DB.update("cart", r.id, { qty: Number(r.qty) - 1 });
            Dash.show(MODULES.find(m => m.id === "cart"));
          } },
        { label: "+", cls: "flat", fn: () => {
            if (Number(r.qty) + 1 > Number(productOf(r.productId).stock)) {
              Dash.toast("No more units in stock."); return;
            }
            DB.update("cart", r.id, { qty: Number(r.qty) + 1 });
            Dash.show(MODULES.find(m => m.id === "cart"));
          } },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("cart", r.id); Dash.toast("Removed from the cart.");
            Dash.show(MODULES.find(m => m.id === "cart"));
          } }
      ]));
      host.appendChild(c);

      if (!rows.length) {
        host.insertAdjacentHTML("beforeend",
          '<div class="note">Your cart is empty. Add something from the <b>Shop</b>.</div>');
        return;
      }

      const sum = Dash.card(
        "<h3>Order summary</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Items</b>" + money(sub) + "</li>" +
        "<li><b>Shipping</b>" + (ship ? money(ship) : "free over " + money(FREE_SHIP_OVER)) + "</li>" +
        "<li><b>To pay</b>" + money(sub + ship) + "</li></ul>");
      const clear = document.createElement("button");
      clear.className = "btn flat";
      clear.textContent = "Empty the cart";
      clear.onclick = () => {
        if (confirm("Remove everything from the cart?")) {
          myCart().forEach(r => DB.remove("cart", r.id));
          Dash.toast("Cart emptied.");
          Dash.show(MODULES.find(m => m.id === "cart"));
        }
      };
      sum.appendChild(clear);
      host.appendChild(sum);

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
          return { productId: r.productId, name: p.name, price: Number(p.price), qty: Number(r.qty) };
        });
        const short = items.find(i => i.qty > Number(productOf(i.productId).stock));
        if (short) { Dash.toast(short.name + " is no longer in stock in that quantity."); return; }

        const o = DB.insert("orders", Object.assign({}, data, {
          user: SESSION.email, items: items,
          amount: sub + ship, placedOn: today(), status: "Placed"
        }));
        items.forEach(i => {
          const p = DB.get("products", i.productId);
          if (p) DB.update("products", p.id, { stock: Number(p.stock) - i.qty });
        });
        myCart().forEach(r => DB.remove("cart", r.id));
        Dash.toast("Order #" + o.id + " placed. A confirmation mail is on its way.");
        Dash.show(MODULES.find(m => m.id === "orders"));
      }, null, "Place the order (" + money(sub + ship) + ")"));
      host.appendChild(out);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "My Orders", type: "custom",
    desc: "Order history and where each one has got to.",
    render(host) {
      const rows = DB.all("orders").filter(o => o.user === SESSION.email);
      const c = Dash.card("<h3>Orders</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "placedOn", l: "Placed" },
        { k: "items", l: "Items", fmt: o => esc(itemsText(o)) },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "payment", l: "Method" },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], rows, o => o.status === "Placed" ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this order?")) {
            (o.items || []).forEach(it => {
              const p = DB.get("products", it.productId);
              if (p) DB.update("products", p.id, { stock: Number(p.stock) + Number(it.qty) });
            });
            DB.update("orders", o.id, { status: "Cancelled" });
            Dash.toast("Order cancelled; the refund follows in five days.");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        }
      }] : []));
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

      host.insertAdjacentHTML("beforeend",
        '<div class="note">An order can be cancelled while it is still <b>placed</b>. ' +
        "After that it is already with the courier.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "wishlist", label: "Wishlist", type: "custom",
    desc: "Things you saved for later.",
    render(host) {
      const rows = myList();
      const c = Dash.card("<h3>Saved items</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Product", fmt: w => esc(productOf(w.productId).name) },
        { k: "brand", l: "Brand", fmt: w => esc(productOf(w.productId).brand) },
        { k: "price", l: "Price", fmt: w => money(productOf(w.productId).price) },
        { k: "stock", l: "Availability", fmt: w => inStock(productOf(w.productId))
            ? '<span class="tag ok">in stock</span>' : '<span class="tag bad">out of stock</span>' },
        { k: "added", l: "Saved on" }
      ], rows, w => [
        { label: "Move to cart", cls: "", fn: () => {
            if (addToCart(w.productId, 1)) {
              DB.remove("wishlist", w.id);
              Dash.toast("Moved to the cart.");
              Dash.show(MODULES.find(m => m.id === "wishlist"));
            }
          } },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("wishlist", w.id);
            Dash.show(MODULES.find(m => m.id === "wishlist"));
          } }
      ]));
      host.appendChild(c);
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

Dash.mount(MODULES);
