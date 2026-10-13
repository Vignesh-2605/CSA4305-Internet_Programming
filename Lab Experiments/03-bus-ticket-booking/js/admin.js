/* ==========================================================================
   admin.js - Bus operator / administrator console
   Modules: reports, bus categories, buses, bookings, comments, news, users.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "report", label: "Report Generation", type: "custom",
    desc: "Booking and revenue report for the whole system.",
    render(host) {
      const bk = DB.all("bookings");
      const live = bk.filter(b => b.status === "Confirmed");
      host.appendChild(Dash.stats([
        { n: DB.all("buses").length, l: "Buses operating" },
        { n: live.length, l: "Confirmed tickets" },
        { n: live.reduce((s, b) => s + String(b.seats).split(",").filter(Boolean).length, 0), l: "Seats sold" },
        { n: money(live.reduce((s, b) => s + Number(b.amount), 0)), l: "Revenue" }
      ]));

      const byBus = DB.all("buses").map(bus => {
        const rows = live.filter(b => String(b.busId) === String(bus.id));
        return {
          id: bus.id, name: bus.name, category: bus.category,
          route: bus.from + " - " + bus.to,
          sold: rows.reduce((s, b) => s + String(b.seats).split(",").filter(Boolean).length, 0),
          free: seatsFree(bus.id),
          amount: rows.reduce((s, b) => s + Number(b.amount), 0)
        };
      });

      const c = Dash.card("<h3>Bus wise report</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Bus" }, { k: "category", l: "Category" }, { k: "route", l: "Route" },
        { k: "sold", l: "Seats sold" }, { k: "free", l: "Seats free" },
        { k: "amount", l: "Revenue", fmt: r => money(r.amount) }
      ], byBus));
      host.appendChild(c);

      const cat = Dash.card("<h3>Category wise bookings</h3>");
      cat.appendChild(Dash.table([
        { k: "name", l: "Category" },
        { k: "buses", l: "Buses", fmt: r => DB.all("buses").filter(b => b.category === r.name).length },
        { k: "tickets", l: "Tickets", fmt: r => live.filter(b =>
            (DB.get("buses", b.busId) || {}).category === r.name).length }
      ], DB.all("categories")));
      host.appendChild(cat);

      const p = document.createElement("button");
      p.className = "btn flat no-print";
      p.textContent = "Print this report";
      p.onclick = () => window.print();
      host.appendChild(p);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "categories", label: "Bus Categories", type: "crud", table: "categories",
    desc: "Volvo, sleeper coach, coach and other categories.",
    addLabel: "Add a bus category",
    fields: [
      { k: "name", l: "Category name", req: true },
      { k: "description", l: "Description", full: true }
    ],
    cols: [{ k: "id", l: "#" }, { k: "name", l: "Category" }, { k: "description", l: "Description" }]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "buses", label: "Bus Information", type: "crud", table: "buses",
    desc: "Add or update bus type, photo, description, route, timing, fare and seats.",
    addLabel: "Add / update a bus",
    fields: [
      { k: "name", l: "Bus name", req: true },
      { k: "category", l: "Category", t: "select", opts: DB.all("categories").map(c => c.name) },
      { k: "from", l: "From", req: true },
      { k: "to", l: "To", req: true },
      { k: "date", l: "Date of journey", t: "date", req: true, def: today() },
      { k: "depTime", l: "Departure", t: "time", def: "21:00" },
      { k: "arrTime", l: "Arrival", t: "time", def: "06:00" },
      { k: "fare", l: "Fare per seat (Rs.)", t: "number", min: 0, req: true },
      { k: "totalSeats", l: "Total seats", t: "number", min: 1, def: 36, req: true },
      { k: "photo", l: "Photo (file name)" },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "id", l: "#" }, { k: "name", l: "Bus" }, { k: "category", l: "Type" },
      { k: "route", l: "Route", fmt: r => esc(r.from + " - " + r.to) },
      { k: "date", l: "Date" },
      { k: "time", l: "Timing", fmt: r => esc(r.depTime + " / " + r.arrTime) },
      { k: "fare", l: "Fare", fmt: r => money(r.fare) },
      { k: "seats", l: "Seats", fmt: r => seatsFree(r.id) + " / " + r.totalSeats + " free" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "bookings", label: "Bookings", type: "custom",
    desc: "Every ticket booked on the portal.",
    render(host) {
      const c = Dash.card("<h3>Ticket register</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "Ticket #" },
        { k: "user", l: "Passenger" },
        { k: "bus", l: "Bus", fmt: r => esc(busOf(r.busId).name) },
        { k: "route", l: "Route", fmt: r => esc(busOf(r.busId).from + " - " + busOf(r.busId).to) },
        { k: "date", l: "Journey", fmt: r => esc(busOf(r.busId).date) },
        { k: "seats", l: "Seats" },
        { k: "amount", l: "Amount", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>' : '<span class="tag bad">cancelled</span>' }
      ], DB.all("bookings"), r => r.status === "Confirmed" ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this ticket?")) {
            DB.update("bookings", r.id, { status: "Cancelled" });
            Dash.toast("Ticket cancelled.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          }
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "comments", label: "Comments", type: "custom",
    desc: "Comments posted by users on a particular bus.",
    render(host) {
      const c = Dash.card("<h3>User comments</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "User" },
        { k: "bus", l: "Bus", fmt: r => esc(busOf(r.busId).name) },
        { k: "text", l: "Comment" },
        { k: "date", l: "Posted" }
      ], DB.all("comments"), r => [{
        label: "Delete", cls: "danger", fn: () => {
          DB.remove("comments", r.id); Dash.toast("Comment removed.");
          Dash.show(MODULES.find(m => m.id === "comments"));
        }
      }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "news", label: "Manage News", type: "crud", table: "news",
    desc: "Announcements shown to every user.",
    addLabel: "Post news",
    fields: [
      { k: "title", l: "Headline", req: true },
      { k: "date", l: "Date", t: "date", def: today() },
      { k: "body", l: "Details", t: "textarea", full: true, req: true }
    ],
    cols: [{ k: "date", l: "Date" }, { k: "title", l: "Headline" }, { k: "body", l: "Details" }]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "users", label: "Registered Users", type: "custom",
    desc: "Accounts registered on the portal.",
    render(host) {
      const c = Dash.card("<h3>Users</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" },
        { k: "phone", l: "Phone" }, { k: "joined", l: "Registered" },
        { k: "tickets", l: "Tickets", fmt: r => DB.all("bookings")
            .filter(b => b.user === r.email && b.status === "Confirmed").length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
