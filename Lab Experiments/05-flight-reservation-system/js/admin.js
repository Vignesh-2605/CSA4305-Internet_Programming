/* ==========================================================================
   admin.js - Airline administrator panel
   Modules: admin report, flights, class fares & seat inventory, bookings
            (view booking status / cancel), customer feedback, users.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "report", label: "Admin Report", type: "custom",
    desc: "Consolidated inventory, booking and revenue report.",
    render(host) {
      const tk = DB.all("tickets");
      const live = tk.filter(t => t.status === "Confirmed");
      host.appendChild(Dash.stats([
        { n: DB.all("flights").length, l: "Flights" },
        { n: live.length, l: "Confirmed tickets" },
        { n: live.reduce((s, t) => s + (t.passengers || []).length, 0), l: "Seats sold" },
        { n: money(live.reduce((s, t) => s + Number(t.amount), 0)), l: "Revenue" },
        { n: money(tk.filter(t => t.status === "Cancelled")
            .reduce((s, t) => s + Number(t.refund || 0), 0)), l: "Refunded" }
      ]));

      const c = Dash.card("<h3>Flight wise inventory</h3>");
      c.appendChild(Dash.table([
        { k: "flight", l: "Flight", fmt: r => esc(flightOf(r.flightId).no + " " + flightOf(r.flightId).airline) },
        { k: "route", l: "Route", fmt: r => esc(flightOf(r.flightId).from + " → " + flightOf(r.flightId).to) },
        { k: "cls", l: "Class" },
        { k: "fare", l: "Fare", fmt: r => money(r.fare) },
        { k: "seats", l: "Capacity" },
        { k: "sold", l: "Sold", fmt: r => takenSeats(r.flightId, r.cls).length },
        { k: "free", l: "Free", fmt: r => {
            const n = seatsFree(r.flightId, r.cls);
            return n > 0 ? '<span class="tag ok">' + n + "</span>" : '<span class="tag bad">full</span>';
          } }
      ], DB.all("fares")));
      host.appendChild(c);

      const p = document.createElement("button");
      p.className = "btn flat no-print";
      p.textContent = "Print report";
      p.onclick = () => window.print();
      host.appendChild(p);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "flights", label: "Flight Schedule", type: "crud", table: "flights",
    desc: "Flight number, airline, route, date and timing.",
    addLabel: "Add a flight",
    fields: [
      { k: "no", l: "Flight number", req: true },
      { k: "airline", l: "Airline", req: true },
      { k: "from", l: "Origin", req: true },
      { k: "to", l: "Destination", req: true },
      { k: "date", l: "Date", t: "date", req: true, def: today() },
      { k: "dep", l: "Departure", t: "time", def: "06:30" },
      { k: "arr", l: "Arrival", t: "time", def: "08:40" },
      { k: "aircraft", l: "Aircraft" },
      { k: "terminal", l: "Terminal" }
    ],
    cols: [
      { k: "no", l: "Flight" }, { k: "airline", l: "Airline" },
      { k: "route", l: "Route", fmt: r => esc(r.from + " → " + r.to) },
      { k: "date", l: "Date" },
      { k: "timing", l: "Dep / Arr", fmt: r => esc(r.dep + " - " + r.arr) },
      { k: "aircraft", l: "Aircraft" }, { k: "terminal", l: "Terminal" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "fares", label: "Fares & Seat Inventory", type: "crud", table: "fares",
    desc: "Class wise fare and number of seats for each flight.",
    addLabel: "Add a class to a flight",
    fields: [
      { k: "flightId", l: "Flight", t: "select", req: true,
        opts: DB.all("flights").map(f => ({ v: f.id, l: f.no + " " + f.from + "-" + f.to })) },
      { k: "cls", l: "Class", t: "select", opts: ["Economy", "Premium Economy", "Business", "First"] },
      { k: "fare", l: "Fare (Rs.)", t: "number", min: 0, req: true },
      { k: "seats", l: "Seats", t: "number", min: 1, req: true },
      { k: "baggage", l: "Free baggage" }
    ],
    cols: [
      { k: "flight", l: "Flight", fmt: r => esc(flightOf(r.flightId).no) },
      { k: "cls", l: "Class" }, { k: "fare", l: "Fare", fmt: r => money(r.fare) },
      { k: "seats", l: "Seats" }, { k: "baggage", l: "Baggage" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "bookings", label: "Booking Status", type: "custom",
    desc: "Every ticket issued; the admin may cancel and refund.",
    render(host) {
      const c = Dash.card("<h3>Ticket register</h3>");
      c.appendChild(Dash.table([
        { k: "pnr", l: "PNR" },
        { k: "user", l: "Account" },
        { k: "flight", l: "Flight", fmt: r => esc(flightOf(r.flightId).no) },
        { k: "route", l: "Route", fmt: r => esc(flightOf(r.flightId).from + " → " + flightOf(r.flightId).to) },
        { k: "journeyDate", l: "Date" },
        { k: "cls", l: "Class" },
        { k: "seats", l: "Seats", fmt: r => (r.passengers || []).map(p => p.seat).join(", ") },
        { k: "amount", l: "Amount", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>'
            : '<span class="tag bad">cancelled</span>' }
      ], DB.all("tickets"), r => r.status === "Confirmed" ? [{
        label: "Cancel ticket", cls: "danger", fn: () => {
          const f = refundFor(r);
          if (confirm("Cancel PNR " + r.pnr + "?\nRefund " + f.pct + "% = Rs." + f.amount)) {
            DB.update("tickets", r.id, { status: "Cancelled", refund: f.amount, cancelledOn: today() });
            Dash.toast("Cancelled, " + money(f.amount) + " refunded.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          }
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Customer Feedback", type: "custom",
    desc: "Feedback submitted by travellers.",
    render(host) {
      const rows = DB.all("feedback");
      const avg = rows.length
        ? (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1) : "-";
      host.appendChild(Dash.stats([
        { n: rows.length, l: "Feedback entries" },
        { n: avg + " / 5", l: "Average rating" }
      ]));
      const c = Dash.card("<h3>Feedback</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "From" }, { k: "subject", l: "Subject" },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "message", l: "Message" }, { k: "date", l: "Date" }
      ], rows, r => [{ label: "Delete", cls: "danger", fn: () => {
          DB.remove("feedback", r.id); Dash.toast("Removed.");
          Dash.show(MODULES.find(m => m.id === "feedback"));
        } }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "users", label: "User Accounts", type: "custom",
    desc: "Travellers registered on the portal.",
    render(host) {
      const c = Dash.card("<h3>Registered users</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" },
        { k: "phone", l: "Phone" }, { k: "joined", l: "Registered" },
        { k: "tickets", l: "Tickets", fmt: r => DB.all("tickets")
            .filter(t => t.user === r.email && t.status === "Confirmed").length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
