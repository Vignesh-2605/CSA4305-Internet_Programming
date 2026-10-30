/* ==========================================================================
   user.js - the customer
   Modules: find a vehicle, my bookings, reviews, my details.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- rental rules shared by both consoles ----------------------------- */
const DEPOSIT_PCT = 20;        // held against damage, returned on a clean return
const LATE_FEE_PCT = 150;      // a late day costs this much of the daily rate
const FLOW = ["Requested", "Approved", "Out", "Returned"];

const vehicleOf = id => DB.get("vehicles", id) ||
  { name: "(withdrawn)", rate: 0, type: "-", regNo: "-" };
const userOf = email => DB.all("users").find(u => u.email === email) || { name: email };

const days = (from, to) => Math.max(1, daysBetween(from, to));
const hireCost = (v, from, to) => days(from, to) * Number(v.rate);
const deposit = amount => Math.round(Number(amount) * DEPOSIT_PCT / 100);

const liveBookings = () => DB.all("bookings")
  .filter(b => ["Approved", "Out"].includes(b.status));

/* is this vehicle free for the whole stretch? */
function isFree(vehicleId, from, to, ignoreId) {
  if (vehicleOf(vehicleId).available !== "Yes") return false;
  return !liveBookings().some(b =>
    String(b.vehicleId) === String(vehicleId) && String(b.id) !== String(ignoreId) &&
    b.from <= to && from <= b.to);
}

/* what a late return adds on */
function lateCharge(b, returnedOn) {
  const late = daysBetween(b.to, returnedOn);
  if (late <= 0) return 0;
  return Math.round(late * Number(vehicleOf(b.vehicleId).rate) * LATE_FEE_PCT / 100);
}

function ratingOf(vehicleId) {
  const rows = DB.all("reviews").filter(r => String(r.vehicleId) === String(vehicleId));
  if (!rows.length) return null;
  return (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1);
}

const stateTag = s => '<span class="tag ' +
  (s === "Returned" ? "mute" : s === "Out" ? "warn" : s === "Approved" ? "ok" :
   s === "Cancelled" ? "bad" : "") + '">' + esc(String(s).toLowerCase()) + "</span>";

let booking = null;     // vehicle being booked
let search = { from: addDays(today(), 1), to: addDays(today(), 3) };

const myBookings = () => DB.all("bookings").filter(b => b.user === SESSION.email);

const MODULES = [
  {
    id: "find", label: "Find a Vehicle", type: "custom",
    desc: "Tell us the dates and we will only show what is actually free.",
    render(host) {
      if (booking) { renderBooking(host); return; }

      const all = DB.all("vehicles");
      const card = Dash.card(
        "<h3>When do you need it?</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>From</label><input type="date" id="from" value="' + search.from + '"></div>' +
        '  <div class="field"><label>Until</label><input type="date" id="to" value="' + search.to + '"></div>' +
        '  <div class="field"><label>Type</label><select id="ty"><option value="">Any</option>' +
        [...new Set(all.map(v => v.type))].map(t => "<option>" + esc(t) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Pick-up point</label><select id="loc"><option value="">Anywhere</option>' +
        [...new Set(all.map(v => v.location))].map(t => "<option>" + esc(t) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Up to (Rs. a day)</label><input type="number" id="max" placeholder="any"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        search.from = card.querySelector("#from").value;
        search.to = card.querySelector("#to").value;
        const ty = card.querySelector("#ty").value;
        const loc = card.querySelector("#loc").value;
        const max = Number(card.querySelector("#max").value) || Infinity;

        out.innerHTML = "";
        if (!search.from || !search.to || search.to < search.from) {
          out.innerHTML = '<div class="note">The return date has to be on or after the pick-up date.</div>';
          return;
        }
        const n = days(search.from, search.to);
        const rows = all.filter(v =>
          (!ty || v.type === ty) && (!loc || v.location === loc) && Number(v.rate) <= max);

        out.insertAdjacentHTML("beforeend",
          '<p class="muted">' + n + " day(s). " +
          rows.filter(v => isFree(v.id, search.from, search.to)).length +
          " of " + rows.length + " free for those dates.</p>");

        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);

        rows.forEach(v => {
          const free = isFree(v.id, search.from, search.to);
          const r = ratingOf(v.id);
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(v.type) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(v.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(v.fuel) + " &middot; " +
              esc(v.transmission) + " &middot; " + esc(v.seats) + " seats</p>" +
            '<p class="meta">' + esc(v.location) + "</p>" +
            '<div class="row"><span class="price">' + money(v.rate) +
              '<span class="meta"> / day</span></span>' +
            (r ? '<span class="tag ok">' + r + " / 5</span>" : '<span class="tag mute">new</span>') +
            "</div>" +
            '<p class="meta" style="margin:.4rem 0 0">' +
            (free ? "Total " + money(hireCost(v, search.from, search.to)) + " for " + n + " day(s)"
                  : v.available === "Yes" ? '<span class="tag bad">taken for those dates</span>'
                                          : '<span class="tag bad">off the road</span>') + "</p>";
          const b = document.createElement("button");
          b.className = "btn sm";
          b.style.marginTop = ".8rem";
          b.textContent = "Book it";
          b.disabled = !free;
          b.onclick = () => { booking = v.id; Dash.show(MODULES.find(m => m.id === "find")); };
          t.appendChild(b);
          grid.appendChild(t);
        });
      };
      ["#from", "#to"].forEach(s => card.querySelector(s).onchange = paint);
      ["#ty", "#loc"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#max").oninput = paint;
      paint();
    }
  },

  {
    id: "bookings", label: "My Bookings", type: "custom",
    desc: "Requested, approved, out and returned - with the deposit position.",
    render(host) {
      const rows = myBookings();
      const c = Dash.card("<h3>Your hires</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "vehicle", l: "Vehicle", fmt: b => esc(vehicleOf(b.vehicleId).name) },
        { k: "period", l: "Dates", fmt: b => b.from + " to " + b.to },
        { k: "days", l: "Days", fmt: b => days(b.from, b.to) },
        { k: "amount", l: "Hire", fmt: b => money(b.amount) },
        { k: "deposit", l: "Deposit", fmt: b => money(b.deposit) },
        { k: "late", l: "Late fee", fmt: b => Number(b.lateFee || 0) ? money(b.lateFee) : "-" },
        { k: "back", l: "Deposit back", fmt: b => b.status === "Returned"
            ? money(b.depositBack || 0) : "-" },
        { k: "status", l: "Status", fmt: b => stateTag(b.status) }
      ], rows, b => ["Requested", "Approved"].includes(b.status) ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (daysBetween(today(), b.from) < 1 && b.status === "Approved") {
            Dash.toast("Too late to cancel online - ring the desk."); return;
          }
          if (confirm("Cancel this booking?")) {
            DB.update("bookings", b.id, { status: "Cancelled", note: "Cancelled by the customer" });
            Dash.toast("Cancelled.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          }
        }
      }] : []));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">A deposit of ' + DEPOSIT_PCT + "% of the hire is held and returned " +
        "when the vehicle comes back on time. A late day costs one and a half times the daily " +
        "rate and comes out of the deposit.</div>");
    }
  },

  {
    id: "reviews", label: "Reviews", type: "custom",
    desc: "Rate a vehicle you have actually had out.",
    render(host) {
      const had = myBookings().filter(b => b.status === "Returned");
      const done = DB.all("reviews").filter(r => r.user === SESSION.email);
      const open = had.filter(b => !done.some(r => String(r.bookingId) === String(b.id)));

      const card = Dash.card("<h3>Leave a review</h3>");
      if (!open.length) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">Reviews open once a vehicle has been returned, one per hire.</p>');
      } else {
        card.appendChild(Dash.form([
          { k: "bookingId", l: "Which hire", t: "select", req: true,
            opts: open.map(b => ({ v: b.id,
              l: vehicleOf(b.vehicleId).name + " (" + b.from + " to " + b.to + ")" })) },
          { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
          { k: "comment", l: "How was it", t: "textarea", req: true, full: true }
        ], {}, (data, form) => {
          const b = DB.get("bookings", data.bookingId);
          DB.insert("reviews", {
            bookingId: Number(data.bookingId), vehicleId: b.vehicleId,
            user: SESSION.email, rating: data.rating, comment: data.comment, date: today()
          });
          form.reset();
          Dash.toast("Thanks for the review.");
          Dash.show(MODULES.find(m => m.id === "reviews"));
        }, null, "Post review"));
      }
      host.appendChild(card);

      const c = Dash.card("<h3>What other customers said</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "vehicle", l: "Vehicle", fmt: r => esc(vehicleOf(r.vehicleId).name) },
        { k: "user", l: "Customer", fmt: r => esc(userOf(r.user).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) },
        { k: "comment", l: "Comment" }
      ], DB.all("reviews")));
      host.appendChild(c);
    }
  },

  {
    id: "details", label: "My Details", type: "custom",
    desc: "Your details and driving licence.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "licence", l: "Driving licence number", req: true },
        { k: "address", l: "Address", t: "textarea", full: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Saved.");
        location.reload();
      }, null, "Save"));
      host.appendChild(card);
    }
  }
];

/* ---- the booking form -------------------------------------------------- */
function renderBooking(host) {
  const v = vehicleOf(booking);
  const me = DB.all("users").find(u => u.email === SESSION.email) || {};

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to the search";
  back.onclick = () => { booking = null; Dash.show(MODULES.find(m => m.id === "find")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>" + esc(v.name) + "</h3>" +
    '<p class="muted">' + esc(v.type) + " &middot; " + esc(v.fuel) + " &middot; " +
    esc(v.transmission) + " &middot; " + esc(v.seats) + " seats &middot; " +
    esc(v.location) + "</p>" +
    "<p>" + esc(v.description) + "</p>");

  const bill = document.createElement("p");
  bill.className = "note";

  card.appendChild(Dash.form([
    { k: "from", l: "Pick up on", t: "date", req: true, def: search.from },
    { k: "to", l: "Return on", t: "date", req: true, def: search.to },
    { k: "licence", l: "Driving licence number", req: true, def: me.licence || "" },
    { k: "phone", l: "Phone", req: true, def: me.phone || "" },
    { k: "payment", l: "Pay by", t: "select", opts: ["UPI", "Credit card", "Debit card", "Net banking"] }
  ], {}, data => {
    if (data.to < data.from) { Dash.toast("The return date has to be on or after the pick-up."); return; }
    if (daysBetween(today(), data.from) < 0) { Dash.toast("Pick up today or later."); return; }
    if (!isFree(v.id, data.from, data.to)) {
      Dash.toast("Somebody has taken it for those dates. Try other days."); return;
    }
    const amount = hireCost(v, data.from, data.to);
    const rec = DB.insert("bookings", Object.assign({}, data, {
      user: SESSION.email, vehicleId: v.id, amount: amount,
      deposit: deposit(amount), status: "Requested", createdOn: today(),
      lateFee: 0, note: ""
    }));
    booking = null;
    Dash.toast("Request #" + rec.id + " sent. The desk will approve it shortly.");
    Dash.show(MODULES.find(m => m.id === "bookings"));
  }, null, "Request this vehicle"));

  const update = () => {
    const f = card.querySelector("form");
    if (!f) return;
    const from = f.querySelector('[name="from"]').value;
    const to = f.querySelector('[name="to"]').value;
    if (!from || !to || to < from) { bill.innerHTML = "Choose the dates to see the cost."; return; }
    const amount = hireCost(v, from, to);
    bill.innerHTML = days(from, to) + " day(s) at " + money(v.rate) + " = <b>" + money(amount) +
      "</b><br>Refundable deposit " + money(deposit(amount)) +
      '<br><span class="muted">Deposit comes back when the vehicle is returned on time.</span>';
  };
  card.appendChild(bill);
  card.querySelectorAll("form input, form select").forEach(el => {
    el.oninput = update; el.onchange = update;
  });
  host.appendChild(card);
  update();
}

Dash.mount(MODULES);
