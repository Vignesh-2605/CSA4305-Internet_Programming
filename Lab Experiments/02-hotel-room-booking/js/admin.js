/* ==========================================================================
   admin.js - Hotel administrator panel
   Modules: room inventory & tariff, all bookings, static page editor, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- rules shared by both consoles ------------------------------------ */
const CHANGE_WINDOW = 3;   // a booking may be changed/cancelled only this many
                           // days (or more) before the arrival date

const nights = (ci, co) => Math.max(1, daysBetween(ci, co));

/* rooms of `type` already blocked for a date range (confirmed bookings only) */
function roomsBooked(type, ci, co, ignoreId) {
  return DB.all("bookings").filter(b =>
    b.status === "Confirmed" && b.type === type &&
    String(b.id) !== String(ignoreId) &&
    new Date(b.checkIn) < new Date(co) && new Date(ci) < new Date(b.checkOut)
  ).length;
}

function roomsFree(type, ci, co, ignoreId) {
  const rt = DB.all("roomTypes").find(r => r.type === type);
  if (!rt) return 0;
  return Number(rt.qty) - roomsBooked(type, ci, co, ignoreId);
}

const canChange = b =>
  b.status === "Confirmed" && daysBetween(today(), b.checkIn) >= CHANGE_WINDOW;

let editBooking = null;

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Occupancy and revenue at a glance.",
    render(host) {
      const bk = DB.all("bookings");
      const live = bk.filter(b => b.status === "Confirmed");
      host.appendChild(Dash.stats([
        { n: DB.all("roomTypes").reduce((s, r) => s + Number(r.qty), 0), l: "Rooms in hotel" },
        { n: live.length, l: "Confirmed bookings" },
        { n: bk.filter(b => b.status === "Cancelled").length, l: "Cancelled" },
        { n: money(live.reduce((s, b) => s + Number(b.amount), 0)), l: "Revenue booked" }
      ]));

      const c = Dash.card("<h3>Availability today (" + today() + ")</h3>");
      c.appendChild(Dash.table([
        { k: "type", l: "Room type" },
        { k: "price", l: "Tariff / night", fmt: r => money(r.price) },
        { k: "qty", l: "Total rooms" },
        { k: "free", l: "Free today", fmt: r => {
            const f = roomsFree(r.type, today(), addDays(today(), 1));
            return f > 0 ? '<span class="tag ok">' + f + "</span>"
                         : '<span class="tag bad">full</span>';
          } }
      ], DB.all("roomTypes")));
      host.appendChild(c);

      const up = Dash.card("<h3>Arrivals in the next 7 days</h3>");
      up.appendChild(Dash.table([
        { k: "id", l: "#" }, { k: "guest", l: "Guest" }, { k: "type", l: "Room" },
        { k: "checkIn", l: "Arrival" }, { k: "checkOut", l: "Departure" },
        { k: "guests", l: "Pax" }
      ], live.filter(b => {
        const d = daysBetween(today(), b.checkIn);
        return d >= 0 && d <= 7;
      })));
      host.appendChild(up);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "rooms", label: "Room Types & Tariff", type: "crud", table: "roomTypes",
    desc: "Change the quantity and price of every room type.",
    addLabel: "Add a room type",
    fields: [
      { k: "type", l: "Room type", req: true },
      { k: "price", l: "Tariff per night (Rs.)", t: "number", min: 0, req: true },
      { k: "qty", l: "Number of rooms", t: "number", min: 0, req: true },
      { k: "maxGuests", l: "Max guests", t: "number", min: 1, def: 2 },
      { k: "amenities", l: "Amenities", full: true },
      { k: "about", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "type", l: "Room type" },
      { k: "price", l: "Tariff", fmt: r => money(r.price) },
      { k: "qty", l: "Rooms" },
      { k: "maxGuests", l: "Max pax" },
      { k: "amenities", l: "Amenities" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "bookings", label: "All Bookings", type: "custom",
    desc: "Administrators may change or cancel any booking at any time.",
    render(host) {
      if (editBooking) {
        const b = DB.get("bookings", editBooking);
        const card = Dash.card("<h3>Edit booking #" + b.id + " - " + esc(b.guest) + "</h3>");
        card.appendChild(Dash.form([
          { k: "type", l: "Room type", t: "select", req: true,
            opts: DB.all("roomTypes").map(r => r.type) },
          { k: "checkIn", l: "Arrival", t: "date", req: true },
          { k: "checkOut", l: "Departure", t: "date", req: true },
          { k: "guests", l: "Guests", t: "number", min: 1, req: true },
          { k: "status", l: "Status", t: "select", opts: ["Confirmed", "Cancelled"] }
        ], b, data => {
          const rt = DB.all("roomTypes").find(r => r.type === data.type);
          const n = nights(data.checkIn, data.checkOut);
          DB.update("bookings", b.id, Object.assign(data, {
            nights: n, amount: n * Number(rt.price)
          }));
          editBooking = null;
          Dash.toast("Booking updated.");
          Dash.show(MODULES.find(m => m.id === "bookings"));
        }, () => { editBooking = null; Dash.show(MODULES.find(m => m.id === "bookings")); },
          "Save changes"));
        host.appendChild(card);
      }

      const card = Dash.card("<h3>Booking register</h3>");
      card.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "guest", l: "Guest" },
        { k: "type", l: "Room" },
        { k: "checkIn", l: "Arrival" },
        { k: "checkOut", l: "Departure" },
        { k: "guests", l: "Pax" },
        { k: "amount", l: "Amount", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>' : '<span class="tag bad">cancelled</span>' }
      ], DB.all("bookings"), r => [
        { label: "Edit", cls: "flat", fn: () => {
            editBooking = r.id; Dash.show(MODULES.find(m => m.id === "bookings"));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } },
        { label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this booking?")) {
              DB.update("bookings", r.id, { status: "Cancelled" });
              Dash.toast("Booking cancelled.");
              Dash.show(MODULES.find(m => m.id === "bookings"));
            }
          } }
      ]));
      host.appendChild(card);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "pages", label: "Static Pages", type: "custom",
    desc: "Room information, about us, contact us, customer service Q&A, travel guide and privacy policy.",
    render(host) {
      const pages = DB.all("pages");
      const card = Dash.card(
        "<h3>Edit a page</h3>" +
        '<div class="field"><label>Page</label><select id="pg">' +
        pages.map(p => '<option value="' + p.id + '">' + esc(p.title) + "</option>").join("") +
        "</select></div>");
      host.appendChild(card);

      const edit = document.createElement("div");
      host.appendChild(edit);

      const paint = () => {
        const p = DB.get("pages", card.querySelector("#pg").value);
        edit.innerHTML = "";
        const c = Dash.card("");
        c.appendChild(Dash.form([
          { k: "title", l: "Page title", req: true, full: true },
          { k: "body", l: "Content", t: "textarea", req: true, full: true }
        ], p, data => {
          DB.update("pages", p.id, data);
          Dash.toast("Page saved.");
          paint();
        }, null, "Save page"));
        edit.appendChild(c);
      };
      card.querySelector("#pg").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "reviews", label: "Guest Reviews", type: "custom",
    desc: "Ratings and reviews posted by guests after their stay.",
    render(host) {
      const rows = DB.all("reviews");
      const avg = rows.length
        ? (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1) : "-";
      host.appendChild(Dash.stats([
        { n: rows.length, l: "Reviews" },
        { n: avg + " / 5", l: "Average rating" }
      ]));
      const c = Dash.card("<h3>Reviews</h3>");
      c.appendChild(Dash.table([
        { k: "guest", l: "Guest" },
        { k: "type", l: "Room" },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Comment" },
        { k: "date", l: "Posted" }
      ], rows, r => [{ label: "Delete", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.toast("Review removed.");
          Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
