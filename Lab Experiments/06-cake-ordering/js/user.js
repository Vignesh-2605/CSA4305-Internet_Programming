/* ==========================================================================
   user.js - customer side
   Modules: browse the menu, order a cake, track orders, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let ordering = null;   // id of the cake being ordered

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "menu", label: "Our Cakes", type: "custom",
    desc: "Browse by occasion, flavour or keyword, then order.",
    render(host) {
      if (ordering) { renderOrderForm(host); return; }

      const card = Dash.card(
        "<h3>Find a cake</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Occasion</label><select id="cat"><option value="">All occasions</option>' +
        [...new Set(DB.all("cakes").map(c => c.category))].map(c => "<option>" + esc(c) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Flavour</label><select id="fl"><option value="">All flavours</option>' +
        [...new Set(DB.all("cakes").map(c => c.flavour))].map(c => "<option>" + esc(c) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Eggless only</label><select id="eg"><option value="">No preference</option>' +
        "    <option>Yes</option></select></div>" +
        '  <div class="field"><label>Search</label><input id="q" placeholder="cake name"></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      out.className = "grid c3";
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const fl = card.querySelector("#fl").value;
        const eg = card.querySelector("#eg").value;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = DB.all("cakes").filter(c =>
          c.available === "Yes" &&
          (!cat || c.category === cat) && (!fl || c.flavour === fl) &&
          (!eg || c.eggless === "Yes") &&
          (!q || (c.name + c.flavour).toLowerCase().includes(q)));

        out.innerHTML = "";
        if (!rows.length) {
          out.innerHTML = '<p class="muted">No cake matches that. Try another flavour.</p>';
          return;
        }
        rows.forEach(c => {
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(c.category) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(c.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(c.flavour) +
            (c.eggless === "Yes" ? " &middot; eggless" : "") + "</p>" +
            '<p class="meta">' + esc(c.description) + "</p>" +
            '<div class="row"><span class="price">' + money(c.price) +
            '<span class="meta"> / kg</span></span></div>';
          const b = document.createElement("button");
          b.className = "btn";
          b.style.marginTop = ".8rem";
          b.textContent = "Order this cake";
          b.onclick = () => { ordering = c.id; Dash.show(MODULES.find(m => m.id === "menu")); };
          t.appendChild(b);
          out.appendChild(t);
        });
      };

      ["#cat", "#fl", "#eg"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#q").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "orders", label: "My Orders", type: "custom",
    desc: "Track every order and cancel one the kitchen has not started.",
    render(host) {
      const mine = DB.all("orders").filter(o => o.user === SESSION.email);
      host.appendChild(Dash.stats([
        { n: mine.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length, l: "On the way" },
        { n: mine.filter(o => o.status === "Delivered").length, l: "Delivered" },
        { n: money(mine.filter(o => o.status !== "Cancelled")
            .reduce((s, o) => s + Number(o.amount), 0)), l: "Spent with us" }
      ]));

      const c = Dash.card("<h3>Order history</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "cake", l: "Cake", fmt: o => esc(cakeOf(o.cakeId).name) },
        { k: "weight", l: "Weight", fmt: o => o.weight + " kg" },
        { k: "message", l: "Message", fmt: o => o.message ? esc(o.message) : "-" },
        { k: "deliveryDate", l: "Delivery" },
        { k: "slot", l: "Slot" },
        { k: "amount", l: "Paid", fmt: o => money(o.amount) },
        { k: "status", l: "Status", fmt: o => stateTag(o.status) }
      ], mine, o => canCancel(o) ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this order? The amount is refunded in three working days.")) {
            DB.update("orders", o.id, { status: "Cancelled" });
            Dash.toast("Order cancelled.");
            Dash.show(MODULES.find(m => m.id === "orders"));
          }
        }
      }] : []));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">An order can be cancelled while it is still <b>placed</b>. ' +
        "Once the kitchen starts baking it can no longer be called off.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "track", label: "Track an Order", type: "custom",
    desc: "Follow a single order through the kitchen.",
    render(host) {
      const mine = DB.all("orders").filter(o => o.user === SESSION.email);
      if (!mine.length) {
        host.appendChild(Dash.card('<p class="muted">You have not ordered anything yet.</p>'));
        return;
      }
      const card = Dash.card(
        "<h3>Choose an order</h3>" +
        '<div class="form-row"><div class="field"><label>Order</label><select id="o">' +
        mine.map(o => '<option value="' + o.id + '">#' + o.id + " - " +
          esc(cakeOf(o.cakeId).name) + " (" + o.deliveryDate + ")</option>").join("") +
        "</select></div></div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const o = DB.get("orders", card.querySelector("#o").value);
        const done = STATES.indexOf(o.status);
        out.innerHTML = "";
        const c = Dash.card("<h3>Order #" + o.id + "</h3>");
        c.innerHTML += '<p class="muted">' + esc(cakeOf(o.cakeId).name) + " &middot; " +
          o.weight + " kg &middot; " + esc(o.slot) + " on " + esc(o.deliveryDate) + "</p>";
        if (o.status === "Cancelled") {
          c.innerHTML += '<p><span class="tag bad">this order was cancelled</span></p>';
        } else {
          c.innerHTML += '<div class="steps" style="margin-top:1rem">' +
            STATES.slice(0, 4).map((s, i) =>
              "<div><h3>" + esc(s) + "</h3>" +
              '<p class="meta" style="margin:0">' +
              (i <= done ? "done" : "pending") + "</p></div>").join("") +
            "</div>";
        }
        out.appendChild(c);
      };
      card.querySelector("#o").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "Delivery details we use on your orders.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
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
        Dash.toast("Profile updated.");
        location.reload();
      }, null, "Save profile"));
      host.appendChild(card);
    }
  }
];

/* ------------------------------------------------------------------------ */
/*  Customise the cake, give delivery details and pay                       */
/* ------------------------------------------------------------------------ */
function renderOrderForm(host) {
  const cake = cakeOf(ordering);
  const me = DB.all("users").find(u => u.email === SESSION.email) || {};

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to the cakes";
  back.onclick = () => { ordering = null; Dash.show(MODULES.find(m => m.id === "menu")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>" + esc(cake.name) + "</h3>" +
    '<p class="muted">' + esc(cake.flavour) + " &middot; " + money(cake.price) + " per kg" +
    (cake.eggless === "Yes" ? " &middot; eggless" : "") + "</p>");

  const total = document.createElement("p");
  total.className = "note";

  card.appendChild(Dash.form([
    { k: "weight", l: "Weight", t: "select", opts: ["0.5", "1", "1.5", "2", "3"] },
    { k: "message", l: "Message on the cake", help: "Rs." + MESSAGE_CHARGE + " extra" },
    { k: "deliveryDate", l: "Delivery date", t: "date", req: true, def: addDays(today(), 1) },
    { k: "slot", l: "Delivery slot", t: "select", opts: SLOTS },
    { k: "name", l: "Receiver's name", req: true, def: me.name || "" },
    { k: "phone", l: "Phone", req: true, def: me.phone || "" },
    { k: "address", l: "Delivery address", t: "textarea", req: true, full: true, def: me.address || "" },
    { k: "payment", l: "Payment method", t: "select",
      opts: ["UPI", "Credit card", "Debit card", "Net banking", "Cash on delivery"] }
  ], {}, data => {
    if (daysBetween(today(), data.deliveryDate) < 1) {
      Dash.toast("We need at least a day's notice - pick a later date."); return;
    }
    const amount = orderTotal(cake, data.weight, data.message, data.slot);
    const o = DB.insert("orders", {
      user: SESSION.email, cakeId: cake.id, weight: data.weight,
      message: data.message, deliveryDate: data.deliveryDate, slot: data.slot,
      name: data.name, phone: data.phone, address: data.address,
      payment: data.payment, amount: amount,
      status: "Placed", placedOn: today()
    });
    ordering = null;
    Dash.toast("Order #" + o.id + " placed. A confirmation mail is on its way.");
    Dash.show(MODULES.find(m => m.id === "orders"));
  }, null, "Place the order"));

  /* live total under the form */
  const update = () => {
    const f = card.querySelector("form");
    if (!f) return;
    total.innerHTML = "Total payable: <b>" + money(orderTotal(
      cake, f.weight.value, f.message.value, f.slot.value)) + "</b>" +
      '<br><span class="muted">Price per kg x weight' +
      (f.message.value ? ", plus " + money(MESSAGE_CHARGE) + " for the message" : "") +
      (f.slot.value.indexOf("Midnight") === 0 ? ", plus " + money(MIDNIGHT_CHARGE) + " for midnight delivery" : "") +
      "</span>";
  };
  card.appendChild(total);
  card.querySelectorAll("form input, form select").forEach(el => {
    el.oninput = update; el.onchange = update;
  });
  update();

  host.appendChild(card);
}

Dash.mount(MODULES);
