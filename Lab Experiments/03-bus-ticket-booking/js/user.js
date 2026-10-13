/* ==========================================================================
   user.js - Passenger console
   Modules: search buses, seat selection + payment, my tickets, cancel,
            comments, news, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- helpers shared by both consoles ---------------------------------- */
const busOf = id => DB.get("buses", id) || { name: "(removed)", fare: 0, from: "-", to: "-" };

/* every seat already sold on a bus (confirmed bookings only) */
function takenSeats(busId, ignoreId) {
  return DB.all("bookings")
    .filter(b => String(b.busId) === String(busId) && b.status === "Confirmed" &&
                 String(b.id) !== String(ignoreId))
    .flatMap(b => String(b.seats).split(",").filter(Boolean).map(Number));
}
const seatsFree = busId => {
  const bus = busOf(busId);
  return Number(bus.totalSeats || 0) - takenSeats(busId).length;
};

let pickedBus = null;      // bus currently being booked
let pickedSeats = [];      // seat numbers selected on the seat map

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search & Book", type: "custom",
    desc: "Find buses by route and date, pick your seats and pay.",
    render(host) {
      if (pickedBus) { renderSeatStep(host); return; }

      const cities = [...new Set(DB.all("buses").flatMap(b => [b.from, b.to]))];
      const card = Dash.card(
        "<h3>Search buses</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>From</label><select id="from"><option value="">Any</option>' +
             cities.map(c => "<option>" + esc(c) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>To</label><select id="to"><option value="">Any</option>' +
             cities.map(c => "<option>" + esc(c) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>Date of journey</label><input type="date" id="d"></div>' +
        '  <div class="field"><label>Bus type</label><select id="cat"><option value="">All</option>' +
             DB.all("categories").map(c => "<option>" + esc(c.name) + "</option>").join("") +
        "  </select></div>" +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const f = card.querySelector("#from").value;
        const t = card.querySelector("#to").value;
        const d = card.querySelector("#d").value;
        const cat = card.querySelector("#cat").value;
        const rows = DB.all("buses").filter(b =>
          (!f || b.from === f) && (!t || b.to === t) &&
          (!d || b.date === d) && (!cat || b.category === cat));
        out.innerHTML = '<p class="muted">' + rows.length + " bus(es) found.</p>";
        out.appendChild(Dash.table([
          { k: "name", l: "Bus" },
          { k: "category", l: "Type" },
          { k: "route", l: "Route", fmt: r => esc(r.from + " → " + r.to) },
          { k: "date", l: "Date" },
          { k: "timing", l: "Dep / Arr", fmt: r => esc(r.depTime + " - " + r.arrTime) },
          { k: "fare", l: "Fare", fmt: r => money(r.fare) },
          { k: "free", l: "Seats free", fmt: r => {
              const n = seatsFree(r.id);
              return n > 0 ? '<span class="tag ok">' + n + "</span>" : '<span class="tag bad">full</span>';
            } }
        ], rows, r => seatsFree(r.id) > 0 ? [{
          label: "Select seats", cls: "", fn: () => {
            pickedBus = r.id; pickedSeats = [];
            Dash.show(MODULES.find(m => m.id === "search"));
          }
        }] : []));
      };

      ["#from", "#to", "#cat"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#d").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "tickets", label: "My Tickets", type: "custom",
    desc: "Booking history; a confirmed ticket can be cancelled from here.",
    render(host) {
      const mine = DB.all("bookings").filter(b => b.user === SESSION.email);
      const c = Dash.card("<h3>My bookings</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "Ticket #" },
        { k: "bus", l: "Bus", fmt: r => esc(busOf(r.busId).name) },
        { k: "route", l: "Route", fmt: r => esc(busOf(r.busId).from + " → " + busOf(r.busId).to) },
        { k: "date", l: "Journey", fmt: r => esc(busOf(r.busId).date) },
        { k: "seats", l: "Seats" },
        { k: "amount", l: "Paid", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>' : '<span class="tag bad">cancelled</span>' }
      ], mine, r => r.status === "Confirmed" ? [
        { label: "View ticket", cls: "flat", fn: () => showTicket(r) },
        { label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel ticket #" + r.id + "?")) {
              DB.update("bookings", r.id, { status: "Cancelled" });
              Dash.toast("Ticket cancelled, refund will be credited in 5 days.");
              Dash.show(MODULES.find(m => m.id === "tickets"));
            }
          } }
      ] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "comments", label: "Comments", type: "custom",
    desc: "Post a comment about a particular bus.",
    render(host) {
      const card = Dash.card("<h3>Post a comment</h3>");
      card.appendChild(Dash.form([
        { k: "busId", l: "Bus", t: "select", req: true,
          opts: DB.all("buses").map(b => ({ v: b.id, l: b.name + " (" + b.from + " - " + b.to + ")" })) },
        { k: "text", l: "Your comment", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("comments", {
          busId: Number(data.busId), text: data.text,
          user: SESSION.name, date: today()
        });
        form.reset();
        Dash.toast("Comment posted.");
        Dash.show(MODULES.find(m => m.id === "comments"));
      }, null, "Post comment"));
      host.appendChild(card);

      const list = Dash.card("<h3>All comments</h3>");
      list.appendChild(Dash.table([
        { k: "user", l: "User" },
        { k: "bus", l: "Bus", fmt: r => esc(busOf(r.busId).name) },
        { k: "text", l: "Comment" },
        { k: "date", l: "Posted" }
      ], DB.all("comments")));
      host.appendChild(list);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "news", label: "News", type: "custom",
    desc: "Announcements from the operator.",
    render(host) {
      DB.all("news").forEach(n => host.appendChild(Dash.card(
        "<h3>" + esc(n.title) + "</h3><p class='muted'>" + esc(n.date) + "</p><p>" +
        esc(n.body) + "</p>")));
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "Your account details.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, { name: data.name, phone: data.phone, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Profile updated.");
        location.reload();
      }, null, "Update profile"));
      host.appendChild(card);
    }
  }
];

/* ------------------------------------------------------------------------ */
/*  Step 2 of booking: seat map, passenger details and payment              */
/* ------------------------------------------------------------------------ */
function renderSeatStep(host) {
  const bus = busOf(pickedBus);
  const taken = takenSeats(pickedBus);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to search";
  back.onclick = () => { pickedBus = null; Dash.show(MODULES.find(m => m.id === "search")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>" + esc(bus.name) + " &mdash; " + esc(bus.from) + " → " + esc(bus.to) + "</h3>" +
    '<p class="muted">' + esc(bus.category) + " &middot; " + esc(bus.date) + " &middot; " +
    esc(bus.depTime) + " - " + esc(bus.arrTime) + " &middot; " + money(bus.fare) + " per seat</p>" +
    "<h4>Choose your seats</h4>");

  const map = document.createElement("div");
  map.className = "seatmap";
  for (let i = 1; i <= Number(bus.totalSeats); i++) {
    const b = document.createElement("button");
    b.className = "seat" + (taken.includes(i) ? " taken" : "");
    b.textContent = i;
    b.disabled = taken.includes(i);
    b.onclick = () => {
      if (pickedSeats.includes(i)) pickedSeats = pickedSeats.filter(s => s !== i);
      else pickedSeats.push(i);
      b.classList.toggle("sel");
      total.innerHTML = summary();
    };
    map.appendChild(b);
  }
  card.appendChild(map);
  card.insertAdjacentHTML("beforeend",
    '<div class="legend"><span><i></i>available</span>' +
    '<span><i style="background:var(--accent);border-color:var(--accent)"></i>selected</span>' +
    '<span><i style="background:#e9ecef;border-style:dashed"></i>sold</span></div>');

  const summary = () => "<b>" + pickedSeats.length + " seat(s)</b> selected" +
    (pickedSeats.length ? " (" + pickedSeats.sort((a, b) => a - b).join(", ") + ")" : "") +
    " &middot; Total <b>" + money(pickedSeats.length * Number(bus.fare)) + "</b>";
  const total = document.createElement("p");
  total.style.marginTop = "1rem";
  total.innerHTML = summary();
  card.appendChild(total);
  host.appendChild(card);

  const pay = Dash.card("<h3>Passenger details &amp; payment</h3>");
  pay.appendChild(Dash.form([
    { k: "pname", l: "Passenger name", req: true, def: SESSION.name },
    { k: "age", l: "Age", t: "number", min: 1, def: 20, req: true },
    { k: "gender", l: "Gender", t: "select", opts: ["Male", "Female", "Other"] },
    { k: "phone", l: "Mobile number", req: true },
    { k: "boarding", l: "Boarding point", req: true },
    { k: "method", l: "Payment method", t: "select",
      opts: ["Credit card", "Debit card", "Net banking", "UPI", "Wallet"] }
  ], {}, data => {
    if (!pickedSeats.length) { Dash.toast("Select at least one seat."); return; }
    const clash = pickedSeats.filter(s => takenSeats(pickedBus).includes(s));
    if (clash.length) { Dash.toast("Seat " + clash.join(", ") + " was just sold. Pick another."); return; }
    const t = DB.insert("bookings", {
      user: SESSION.email, busId: Number(pickedBus),
      seats: pickedSeats.sort((a, b) => a - b).join(","),
      passenger: data.pname, age: data.age, gender: data.gender, phone: data.phone,
      boarding: data.boarding, method: data.method,
      amount: pickedSeats.length * Number(bus.fare),
      status: "Confirmed", bookedOn: today()
    });
    pickedBus = null; pickedSeats = [];
    Dash.toast("Payment successful. Ticket #" + t.id + " confirmed.");
    Dash.show(MODULES.find(m => m.id === "tickets"));
    showTicket(t);
  }, null, "Pay & confirm"));
  host.appendChild(pay);
}

/* printable ticket */
function showTicket(t) {
  const bus = busOf(t.busId);
  const host = document.getElementById("dash-view");
  const c = document.createElement("div");
  c.className = "ticket";
  c.innerHTML =
    "<h3>E-Ticket #" + t.id + "</h3>" +
    '<div class="row"><span>Bus</span><b>' + esc(bus.name) + " (" + esc(bus.category) + ")</b></div>" +
    '<div class="row"><span>Route</span><b>' + esc(bus.from) + " → " + esc(bus.to) + "</b></div>" +
    '<div class="row"><span>Date / time</span><b>' + esc(bus.date) + " " + esc(bus.depTime) + "</b></div>" +
    '<div class="row"><span>Passenger</span><b>' + esc(t.passenger) + ", " + esc(t.age) + " / " + esc(t.gender) + "</b></div>" +
    '<div class="row"><span>Boarding</span><b>' + esc(t.boarding) + "</b></div>" +
    '<div class="row"><span>Seats</span><b>' + esc(t.seats) + "</b></div>" +
    '<div class="row"><span>Paid</span><b>' + money(t.amount) + " via " + esc(t.method) + "</b></div>";
  const p = document.createElement("button");
  p.className = "btn flat no-print";
  p.style.marginTop = ".8rem";
  p.textContent = "Print ticket";
  p.onclick = () => window.print();
  c.appendChild(p);
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
