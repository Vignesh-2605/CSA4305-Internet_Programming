/* ==========================================================================
   user.js - Traveller console
   Modules: search flight, book ticket (seat map) + payment, my tickets with
            booking status / print / cancel, customer feedback, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- airline rules shared by both consoles ---------------------------- */
const SEATS_PER_ROW = 6;
const LETTERS = "ABCDEF";

const flightOf = id => DB.get("flights", id) ||
  { no: "-", airline: "(removed)", from: "-", to: "-", date: "-" };

const fareRow = (flightId, cls) =>
  DB.all("fares").find(f => String(f.flightId) === String(flightId) && f.cls === cls);

const classesOf = flightId =>
  DB.all("fares").filter(f => String(f.flightId) === String(flightId));

/* every seat label already issued on a flight / class */
function takenSeats(flightId, cls) {
  return DB.all("tickets")
    .filter(t => String(t.flightId) === String(flightId) && t.cls === cls && t.status === "Confirmed")
    .flatMap(t => (t.passengers || []).map(p => p.seat));
}

/* seat labels 1A, 1B ... derived from the capacity of that class */
function seatLabels(flightId, cls) {
  const cap = Number((fareRow(flightId, cls) || {}).seats || 0);
  const out = [];
  for (let i = 0; i < cap; i++) {
    out.push((Math.floor(i / SEATS_PER_ROW) + 1) + LETTERS[i % SEATS_PER_ROW]);
  }
  return out;
}

const seatsFree = (flightId, cls) =>
  seatLabels(flightId, cls).length - takenSeats(flightId, cls).length;

/* cancellation charge: 20% if cancelled 3 or more days before departure, else 50% */
function refundFor(ticket) {
  const d = daysBetween(today(), ticket.journeyDate);
  const pct = d >= 3 ? 80 : (d >= 0 ? 50 : 0);
  return { pct: pct, amount: Math.round(Number(ticket.amount) * pct / 100), days: d };
}

const makePnr = id => "AI" + String(100000 + Number(id) * 137).slice(-6);

let booking = null;        // { flightId, cls }
let chosen = [];           // seat labels picked on the map
let paxRows = [{ name: "", age: "", gender: "Male" }];

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search Flight", type: "custom",
    desc: "Flights by destination, date and class with real time seat availability.",
    render(host) {
      if (booking) { renderBooking(host); return; }

      const ap = [...new Set(DB.all("flights").flatMap(f => [f.from, f.to]))];
      const card = Dash.card(
        "<h3>Find a flight</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>From</label><select id="from"><option value="">Any</option>' +
             ap.map(a => "<option>" + esc(a) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>To</label><select id="to"><option value="">Any</option>' +
             ap.map(a => "<option>" + esc(a) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>Date</label><input type="date" id="d"></div>' +
        '  <div class="field"><label>Class</label><select id="cls"><option value="">Any</option>' +
             [...new Set(DB.all("fares").map(f => f.cls))]
               .map(c => "<option>" + esc(c) + "</option>").join("") + "</select></div>" +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const f = card.querySelector("#from").value;
        const t = card.querySelector("#to").value;
        const d = card.querySelector("#d").value;
        const cl = card.querySelector("#cls").value;
        const rows = DB.all("flights").filter(x =>
          (!f || x.from === f) && (!t || x.to === t) && (!d || x.date === d));
        out.innerHTML = '<p class="muted">' + rows.length + " flight(s) found.</p>";

        rows.forEach(fl => {
          const cls = classesOf(fl.id).filter(c => !cl || c.cls === cl);
          if (!cls.length) return;
          const c = Dash.card(
            "<h3>" + esc(fl.no) + " &middot; " + esc(fl.airline) + "</h3>" +
            '<p class="muted">' + esc(fl.from) + " → " + esc(fl.to) + " &middot; " +
            esc(fl.date) + " &middot; dep " + esc(fl.dep) + ", arr " + esc(fl.arr) +
            " &middot; " + esc(fl.aircraft) + " &middot; terminal " + esc(fl.terminal) + "</p>");
          c.appendChild(Dash.table([
            { k: "cls", l: "Class" },
            { k: "fare", l: "Fare", fmt: r => money(r.fare) },
            { k: "baggage", l: "Baggage" },
            { k: "free", l: "Seats", fmt: r => {
                const n = seatsFree(fl.id, r.cls);
                return n > 0 ? '<span class="tag ok">' + n + " available</span>"
                             : '<span class="tag bad">full</span>';
              } }
          ], cls, r => seatsFree(fl.id, r.cls) > 0 ? [{
            label: "Book ticket", cls: "", fn: () => {
              booking = { flightId: fl.id, cls: r.cls };
              chosen = [];
              paxRows = [{ name: SESSION.name, age: "", gender: "Male" }];
              Dash.show(MODULES.find(m => m.id === "search"));
            }
          }] : []));
          out.appendChild(c);
        });
      };

      ["#from", "#to", "#cls"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#d").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "mine", label: "My Tickets", type: "custom",
    desc: "Booking status, e-ticket printing and cancellation.",
    render(host) {
      const mine = DB.all("tickets").filter(t => t.user === SESSION.email);
      const c = Dash.card("<h3>My bookings</h3>");
      c.appendChild(Dash.table([
        { k: "pnr", l: "PNR" },
        { k: "flight", l: "Flight", fmt: r => esc(flightOf(r.flightId).no + " " + flightOf(r.flightId).airline) },
        { k: "route", l: "Route", fmt: r => esc(flightOf(r.flightId).from + " → " + flightOf(r.flightId).to) },
        { k: "journeyDate", l: "Date" },
        { k: "cls", l: "Class" },
        { k: "seats", l: "Seats", fmt: r => (r.passengers || []).map(p => p.seat).join(", ") },
        { k: "amount", l: "Paid", fmt: r => money(r.amount) },
        { k: "status", l: "Booking status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>'
            : '<span class="tag bad">cancelled, refund ' + money(r.refund || 0) + "</span>" }
      ], mine, r => r.status === "Confirmed" ? [
        { label: "Print e-ticket", cls: "flat", fn: () => showTicket(r) },
        { label: "Cancel", cls: "danger", fn: () => {
            const f = refundFor(r);
            if (confirm("Cancel PNR " + r.pnr + "?\n" + f.days + " day(s) before departure\n" +
                        "Refund " + f.pct + "% = Rs." + f.amount)) {
              DB.update("tickets", r.id, { status: "Cancelled", refund: f.amount, cancelledOn: today() });
              Dash.toast("Ticket cancelled. " + money(f.amount) + " will be refunded.");
              Dash.show(MODULES.find(m => m.id === "mine"));
            }
          } }
      ] : []));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Cancellation: 80% of the fare is refunded when the ticket is ' +
        "cancelled three or more days before departure, otherwise 50%.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Customer Feedback", type: "custom",
    desc: "Tell us about your journey.",
    render(host) {
      const card = Dash.card("<h3>Submit feedback</h3>");
      card.appendChild(Dash.form([
        { k: "subject", l: "Subject", req: true },
        { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
        { k: "message", l: "Message", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("feedback", Object.assign(data, { user: SESSION.name, date: today() }));
        form.reset();
        Dash.toast("Thank you for your feedback.");
        Dash.show(MODULES.find(m => m.id === "feedback"));
      }, null, "Send feedback"));
      host.appendChild(card);

      const list = Dash.card("<h3>What travellers say</h3>");
      list.appendChild(Dash.table([
        { k: "user", l: "From" }, { k: "subject", l: "Subject" },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) },
        { k: "message", l: "Message" }, { k: "date", l: "Date" }
      ], DB.all("feedback")));
      host.appendChild(list);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "Traveller details used on the booking form.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone" },
        { k: "passport", l: "Passport / ID" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, passport: data.passport, password: data.password });
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
/*  Book ticket -> choose seats -> ticket payment                           */
/* ------------------------------------------------------------------------ */
function renderBooking(host) {
  const fl = flightOf(booking.flightId);
  const fr = fareRow(booking.flightId, booking.cls);
  const taken = takenSeats(booking.flightId, booking.cls);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to flight list";
  back.onclick = () => { booking = null; Dash.show(MODULES.find(m => m.id === "search")); };
  host.appendChild(back);

  /* ---- passengers ---- */
  const paxCard = Dash.card(
    "<h3>" + esc(fl.no) + " " + esc(fl.airline) + " &mdash; " + esc(booking.cls) + "</h3>" +
    '<p class="muted">' + esc(fl.from) + " → " + esc(fl.to) + " &middot; " + esc(fl.date) +
    " &middot; " + money(fr.fare) + " per passenger</p><h4>Passenger details</h4>");
  const list = document.createElement("div");
  paxCard.appendChild(list);

  const paintPax = () => {
    list.innerHTML = "";
    paxRows.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "form-row";
      row.innerHTML =
        '<div class="field"><label>Name</label><input value="' + esc(p.name) + '" data-i="' + i + '" data-k="name"></div>' +
        '<div class="field"><label>Age</label><input type="number" min="1" value="' + esc(p.age) + '" data-i="' + i + '" data-k="age"></div>' +
        '<div class="field"><label>Gender</label><select data-i="' + i + '" data-k="gender">' +
        ["Male", "Female", "Other"].map(g =>
          "<option" + (p.gender === g ? " selected" : "") + ">" + g + "</option>").join("") +
        "</select></div>";
      const del = document.createElement("div");
      del.className = "field";
      del.innerHTML = "<label>&nbsp;</label>";
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn flat"; b.textContent = "Remove";
      b.disabled = paxRows.length === 1;
      b.onclick = () => { paxRows.splice(i, 1); chosen = chosen.slice(0, paxRows.length); paintPax(); paintSeats(); };
      del.appendChild(b);
      row.appendChild(del);
      list.appendChild(row);
    });
    list.querySelectorAll("[data-i]").forEach(inp => {
      inp.oninput = inp.onchange = () => { paxRows[Number(inp.dataset.i)][inp.dataset.k] = inp.value; };
    });
  };

  const add = document.createElement("button");
  add.type = "button"; add.className = "btn flat"; add.textContent = "+ Add passenger";
  add.onclick = () => { paxRows.push({ name: "", age: "", gender: "Male" }); paintPax(); paintSeats(); };
  paxCard.appendChild(add);
  host.appendChild(paxCard);
  paintPax();

  /* ---- seat map ---- */
  const seatCard = Dash.card("<h3>Choose seats</h3>" +
    '<p class="muted">Pick one seat for each passenger.</p>');
  const map = document.createElement("div");
  map.className = "seatmap";
  seatCard.appendChild(map);
  seatCard.insertAdjacentHTML("beforeend",
    '<div class="legend"><span><i></i>available</span>' +
    '<span><i style="background:var(--accent);border-color:var(--accent)"></i>selected</span>' +
    '<span><i style="background:#e9ecef;border-style:dashed"></i>occupied</span></div>');
  const info = document.createElement("p");
  seatCard.appendChild(info);
  host.appendChild(seatCard);

  function paintSeats() {
    map.innerHTML = "";
    seatLabels(booking.flightId, booking.cls).forEach(lbl => {
      const b = document.createElement("button");
      const isTaken = taken.includes(lbl);
      b.className = "seat" + (isTaken ? " taken" : "") + (chosen.includes(lbl) ? " sel" : "");
      b.textContent = lbl;
      b.disabled = isTaken;
      b.onclick = () => {
        if (chosen.includes(lbl)) chosen = chosen.filter(s => s !== lbl);
        else if (chosen.length >= paxRows.length) { Dash.toast("One seat per passenger."); return; }
        else chosen.push(lbl);
        paintSeats();
      };
      map.appendChild(b);
    });
    info.innerHTML = "Selected: <b>" + (chosen.join(", ") || "none") + "</b> &middot; Total payable <b>" +
      money(paxRows.length * Number(fr.fare)) + "</b>";
  }
  paintSeats();

  /* ---- payment ---- */
  const pay = Dash.card("<h3>Ticket payment</h3>");
  pay.appendChild(Dash.form([
    { k: "journeyDate", l: "Date of travel", t: "date", req: true, def: fl.date },
    { k: "method", l: "Payment method", t: "select",
      opts: ["Credit card", "Debit card", "Net banking", "UPI", "Travel wallet"] },
    { k: "cardName", l: "Name on card / UPI id", req: true },
    { k: "mobile", l: "Mobile for the e-ticket", req: true }
  ], {}, data => {
    if (paxRows.some(p => !p.name || !p.age)) { Dash.toast("Fill name and age for every passenger."); return; }
    if (chosen.length !== paxRows.length) { Dash.toast("Select exactly one seat per passenger."); return; }
    const clash = chosen.filter(s => takenSeats(booking.flightId, booking.cls).includes(s));
    if (clash.length) { Dash.toast("Seat " + clash.join(", ") + " was just taken."); return; }

    const rec = DB.insert("tickets", {
      user: SESSION.email, flightId: booking.flightId, cls: booking.cls,
      journeyDate: data.journeyDate,
      passengers: paxRows.map((p, i) => Object.assign({}, p, { seat: chosen[i] })),
      amount: paxRows.length * Number(fr.fare),
      method: data.method, mobile: data.mobile,
      status: "Confirmed", bookedOn: today(), refund: 0, pnr: ""
    });
    DB.update("tickets", rec.id, { pnr: makePnr(rec.id) });
    const saved = DB.get("tickets", rec.id);
    booking = null; chosen = [];
    Dash.toast("Payment successful. E-ticket " + saved.pnr + " mailed to you.");
    Dash.show(MODULES.find(m => m.id === "mine"));
    showTicket(saved);
  }, null, "Pay & issue e-ticket"));
  host.appendChild(pay);
}

/* printable e-ticket */
function showTicket(t) {
  const fl = flightOf(t.flightId);
  const host = document.getElementById("dash-view");
  const c = document.createElement("div");
  c.className = "ticket";
  c.innerHTML =
    "<h3>E-Ticket &middot; PNR " + esc(t.pnr) + "</h3>" +
    '<div class="row"><span>Flight</span><b>' + esc(fl.no) + " " + esc(fl.airline) + "</b></div>" +
    '<div class="row"><span>From / To</span><b>' + esc(fl.from) + " → " + esc(fl.to) + "</b></div>" +
    '<div class="row"><span>Date</span><b>' + esc(t.journeyDate) + " &middot; dep " + esc(fl.dep) +
      " &middot; terminal " + esc(fl.terminal) + "</b></div>" +
    '<div class="row"><span>Class</span><b>' + esc(t.cls) + "</b></div>" +
    (t.passengers || []).map(p =>
      '<div class="row"><span>' + esc(p.name) + " (" + esc(p.age) + "/" + esc(p.gender) +
      ")</span><b>seat " + esc(p.seat) + "</b></div>").join("") +
    '<div class="row"><span>Fare paid</span><b>' + money(t.amount) + " &middot; " + esc(t.method) + "</b></div>";
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
