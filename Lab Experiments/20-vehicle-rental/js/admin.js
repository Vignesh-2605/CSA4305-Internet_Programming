/* ==========================================================================
   admin.js - rental desk
   Modules: overview, fleet, bookings, handover and return, customers, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const MODULES = [
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "What is out, what is due back and what it is earning.",
    render(host) {
      const bk = DB.all("bookings");
      host.appendChild(Dash.stats([
        { n: DB.all("vehicles").length, l: "Vehicles" },
        { n: bk.filter(b => b.status === "Requested").length, l: "To approve" },
        { n: bk.filter(b => b.status === "Out").length, l: "On the road" },
        { n: money(bk.filter(b => b.status !== "Cancelled")
            .reduce((s, b) => s + Number(b.amount) + Number(b.lateFee || 0), 0)), l: "Hire charges" }
      ]));

      const due = bk.filter(b => b.status === "Out" && b.to <= addDays(today(), 2));
      const c = Dash.card("<h3>Due back within two days</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "vehicle", l: "Vehicle", fmt: b => esc(vehicleOf(b.vehicleId).name) },
        { k: "regNo", l: "Reg", fmt: b => esc(vehicleOf(b.vehicleId).regNo) },
        { k: "customer", l: "With", fmt: b => esc(userOf(b.user).name) },
        { k: "to", l: "Due back" },
        { k: "overdue", l: "Overdue", fmt: b => daysBetween(b.to, today()) > 0
            ? '<span class="tag bad">' + daysBetween(b.to, today()) + " day(s)</span>" : "-" }
      ], due));
      host.appendChild(c);
    }
  },

  {
    id: "fleet", label: "Fleet", type: "crud", table: "vehicles",
    desc: "Every vehicle, its daily rate and whether it is on the road at all.",
    addLabel: "Add a vehicle",
    fields: [
      { k: "name", l: "Make and model", req: true },
      { k: "type", l: "Type", t: "select", opts: ["Hatchback", "Sedan", "SUV", "Van", "Truck", "Bike"] },
      { k: "regNo", l: "Registration", req: true },
      { k: "fuel", l: "Fuel", t: "select", opts: ["Petrol", "Diesel", "CNG", "Electric"] },
      { k: "transmission", l: "Gearbox", t: "select", opts: ["Manual", "Automatic"] },
      { k: "seats", l: "Seats", t: "number", min: 1, def: 5 },
      { k: "rate", l: "Rate per day (Rs.)", t: "number", min: 0, req: true },
      { k: "location", l: "Pick-up point", req: true },
      { k: "available", l: "In service", t: "select", opts: ["Yes", "No"] },
      { k: "description", l: "Notes", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Vehicle" }, { k: "type", l: "Type" }, { k: "regNo", l: "Reg" },
      { k: "fuel", l: "Fuel" }, { k: "transmission", l: "Gearbox" }, { k: "seats", l: "Seats" },
      { k: "rate", l: "Per day", fmt: v => money(v.rate) },
      { k: "location", l: "Pick-up" },
      { k: "available", l: "In service", fmt: v => v.available === "Yes"
          ? '<span class="tag ok">yes</span>' : '<span class="tag bad">off the road</span>' }
    ]
  },

  {
    id: "bookings", label: "Bookings", type: "custom",
    desc: "Approve a request, hand the vehicle over and take it back.",
    render(host) {
      const c = Dash.card("<h3>Booking book</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "customer", l: "Customer", fmt: b => esc(userOf(b.user).name) },
        { k: "vehicle", l: "Vehicle", fmt: b => esc(vehicleOf(b.vehicleId).name) },
        { k: "period", l: "Dates", fmt: b => b.from + " to " + b.to },
        { k: "days", l: "Days", fmt: b => days(b.from, b.to) },
        { k: "licence", l: "Licence" },
        { k: "amount", l: "Hire", fmt: b => money(b.amount) },
        { k: "deposit", l: "Deposit", fmt: b => money(b.deposit) },
        { k: "late", l: "Late fee", fmt: b => Number(b.lateFee || 0) ? money(b.lateFee) : "-" },
        { k: "status", l: "Status", fmt: b => stateTag(b.status) }
      ], DB.all("bookings"), b => {
        const acts = [];
        if (b.status === "Requested") {
          acts.push({ label: "Approve", cls: "", fn: () => {
            if (!isFree(b.vehicleId, b.from, b.to, b.id)) {
              Dash.toast("That vehicle is already promised for those dates."); return;
            }
            DB.update("bookings", b.id, { status: "Approved" });
            Dash.toast("Approved - the customer has been told.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          } });
          acts.push({ label: "Refuse", cls: "danger", fn: () => {
            DB.update("bookings", b.id, { status: "Cancelled", note: "Refused by the desk" });
            Dash.show(MODULES.find(m => m.id === "bookings"));
          } });
        }
        if (b.status === "Approved") acts.push({
          label: "Hand over", cls: "", fn: () => {
            DB.update("bookings", b.id, { status: "Out", outOn: today() });
            Dash.toast("Marked as out.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          }
        });
        if (b.status === "Out") acts.push({
          label: "Take back", cls: "", fn: () => {
            const fee = lateCharge(b, today());
            const msg = fee
              ? "Returned " + daysBetween(b.to, today()) + " day(s) late - late fee " +
                money(fee) + ". Take it back?"
              : "Returned on time. The deposit of " + money(b.deposit) + " goes back. Take it back?";
            if (!confirm(msg)) return;
            DB.update("bookings", b.id, {
              status: "Returned", returnedOn: today(), lateFee: fee,
              depositBack: fee ? Math.max(0, Number(b.deposit) - fee) : Number(b.deposit)
            });
            Dash.toast(fee ? "Late fee of " + money(fee) + " taken from the deposit."
                           : "Deposit returned in full.");
            Dash.show(MODULES.find(m => m.id === "bookings"));
          }
        });
        return acts;
      }));
      host.appendChild(c);
    }
  },

  {
    id: "customers", label: "Customers", type: "custom",
    desc: "Who hires from us and how they have treated the vehicles.",
    render(host) {
      const c = Dash.card("<h3>Customers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "licence", l: "Licence" }, { k: "joined", l: "Since" },
        { k: "hires", l: "Hires", fmt: u => DB.all("bookings")
            .filter(b => b.user === u.email && b.status !== "Cancelled").length },
        { k: "late", l: "Late returns", fmt: u => {
            const n = DB.all("bookings").filter(b => b.user === u.email && Number(b.lateFee || 0) > 0).length;
            return n ? '<span class="tag warn">' + n + "</span>" : "-";
          } }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  },

  {
    id: "reviews", label: "Reviews", type: "custom",
    desc: "What customers said about the vehicles.",
    render(host) {
      const c = Dash.card("<h3>Reviews</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "user", l: "Customer", fmt: r => esc(userOf(r.user).name) },
        { k: "vehicle", l: "Vehicle", fmt: r => esc(vehicleOf(r.vehicleId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Comment" }
      ], DB.all("reviews"), r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
