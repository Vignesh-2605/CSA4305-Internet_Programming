/* ==========================================================================
   admin.js - Railway administrator console
   Modules: reports, trains, class fares & seats, reservations, refund rules.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- reservation rules shared by both consoles ------------------------ */
const RAC_QUOTA = 6;          // RAC berths released after the class is full

const trainOf = id => DB.get("trains", id) || { number: "-", name: "(removed)", from: "-", to: "-" };

/* fare + capacity row for a train and a class */
const fareRow = (trainId, cls) =>
  DB.all("fares").find(f => String(f.trainId) === String(trainId) && f.cls === cls);

const classesOf = trainId =>
  DB.all("fares").filter(f => String(f.trainId) === String(trainId));

const liveRes = (trainId, cls, date) => DB.all("reservations").filter(r =>
  r.status === "Booked" && String(r.trainId) === String(trainId) &&
  r.cls === cls && r.journeyDate === date);

/* how many berths of each kind are already taken */
function occupancy(trainId, cls, date) {
  const pax = liveRes(trainId, cls, date).flatMap(r => r.passengers || []);
  return {
    cnf: pax.filter(p => p.status === "CNF").length,
    rac: pax.filter(p => p.status === "RAC").length,
    wl:  pax.filter(p => p.status === "WL").length
  };
}

/* CNF -> RAC -> WL allocation, exactly as the railways do it */
function allocate(trainId, cls, date, passengers) {
  const cap = Number((fareRow(trainId, cls) || {}).seats || 0);
  const o = occupancy(trainId, cls, date);
  let cnf = o.cnf, rac = o.rac, wl = o.wl;
  return passengers.map(p => {
    if (cnf < cap) { cnf++; return Object.assign({}, p, { status: "CNF", berth: cls + "-" + cnf }); }
    if (rac < RAC_QUOTA) { rac++; return Object.assign({}, p, { status: "RAC", berth: "RAC " + rac }); }
    wl++; return Object.assign({}, p, { status: "WL", berth: "WL " + wl });
  });
}

function availabilityText(trainId, cls, date) {
  const cap = Number((fareRow(trainId, cls) || {}).seats || 0);
  const o = occupancy(trainId, cls, date);
  if (o.cnf < cap) return { t: "AVAILABLE " + (cap - o.cnf), c: "ok" };
  if (o.rac < RAC_QUOTA) return { t: "RAC " + (RAC_QUOTA - o.rac), c: "warn" };
  return { t: "WL " + (o.wl + 1), c: "bad" };
}

/* refund percentage from the rule table, by days left before the journey */
function refundPercent(daysBefore) {
  const rules = DB.all("refundRules").slice()
    .sort((a, b) => Number(b.daysBefore) - Number(a.daysBefore));
  const hit = rules.find(r => daysBefore >= Number(r.daysBefore));
  return hit ? Number(hit.percent) : 0;
}

const makePnr = id => String(4250000000 + Number(id) * 7919);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "report", label: "Overview", type: "custom",
    desc: "Reservation and earnings position.",
    render(host) {
      const res = DB.all("reservations");
      const live = res.filter(r => r.status === "Booked");
      host.appendChild(Dash.stats([
        { n: DB.all("trains").length, l: "Trains" },
        { n: live.length, l: "Live PNRs" },
        { n: live.reduce((s, r) => s + (r.passengers || []).length, 0), l: "Passengers" },
        { n: money(live.reduce((s, r) => s + Number(r.amount), 0)), l: "Fare collected" },
        { n: money(res.filter(r => r.status === "Cancelled")
            .reduce((s, r) => s + Number(r.refund || 0), 0)), l: "Refunded" }
      ]));

      const c = Dash.card("<h3>Class wise occupancy</h3>");
      c.appendChild(Dash.table([
        { k: "train", l: "Train", fmt: r => esc(trainOf(r.trainId).number + " " + trainOf(r.trainId).name) },
        { k: "cls", l: "Class" },
        { k: "seats", l: "Capacity" },
        { k: "fare", l: "Fare", fmt: r => money(r.fare) },
        { k: "booked", l: "Confirmed", fmt: r =>
            occupancy(r.trainId, r.cls, trainOf(r.trainId).date).cnf },
        { k: "rac", l: "RAC", fmt: r => occupancy(r.trainId, r.cls, trainOf(r.trainId).date).rac },
        { k: "wl", l: "WL", fmt: r => occupancy(r.trainId, r.cls, trainOf(r.trainId).date).wl }
      ], DB.all("fares")));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "trains", label: "Trains", type: "crud", table: "trains",
    desc: "Train number, name, route, via details and timing.",
    addLabel: "Add a train",
    fields: [
      { k: "number", l: "Train number", req: true },
      { k: "name", l: "Train name", req: true },
      { k: "from", l: "Origin station", req: true },
      { k: "to", l: "Destination station", req: true },
      { k: "via", l: "Via" },
      { k: "zone", l: "Zone", t: "select", opts: ["SR", "SCR", "SWR", "CR", "WR", "NR", "ER"] },
      { k: "date", l: "Date of run", t: "date", req: true, def: today() },
      { k: "depTime", l: "Departure", t: "time", def: "22:30" },
      { k: "arrTime", l: "Arrival", t: "time", def: "06:45" }
    ],
    cols: [
      { k: "number", l: "No." }, { k: "name", l: "Name" },
      { k: "route", l: "Route", fmt: r => esc(r.from + " → " + r.to) },
      { k: "via", l: "Via" }, { k: "zone", l: "Zone" }, { k: "date", l: "Date" },
      { k: "timing", l: "Dep / Arr", fmt: r => esc(r.depTime + " - " + r.arrTime) }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "fares", label: "Fares & Seats", type: "crud", table: "fares",
    desc: "Class wise fare and berth capacity for every train.",
    addLabel: "Add a class to a train",
    fields: [
      { k: "trainId", l: "Train", t: "select", req: true,
        opts: DB.all("trains").map(t => ({ v: t.id, l: t.number + " " + t.name })) },
      { k: "cls", l: "Class", t: "select", opts: ["SL", "3A", "2A", "1A", "CC"] },
      { k: "fare", l: "Fare (Rs.)", t: "number", min: 0, req: true },
      { k: "seats", l: "Berths available", t: "number", min: 1, req: true }
    ],
    cols: [
      { k: "train", l: "Train", fmt: r => esc(trainOf(r.trainId).number + " " + trainOf(r.trainId).name) },
      { k: "cls", l: "Class" },
      { k: "fare", l: "Fare", fmt: r => money(r.fare) },
      { k: "seats", l: "Capacity" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "res", label: "Reservations", type: "custom",
    desc: "Every PNR in the system; the admin may cancel and refund.",
    render(host) {
      const c = Dash.card("<h3>PNR register</h3>");
      c.appendChild(Dash.table([
        { k: "pnr", l: "PNR" },
        { k: "user", l: "Passenger a/c" },
        { k: "train", l: "Train", fmt: r => esc(trainOf(r.trainId).number + " " + trainOf(r.trainId).name) },
        { k: "cls", l: "Class" },
        { k: "journeyDate", l: "Journey" },
        { k: "pax", l: "Pax", fmt: r => (r.passengers || []).length },
        { k: "state", l: "Berths", fmt: r => (r.passengers || [])
            .map(p => '<span class="tag ' + (p.status === "CNF" ? "ok" : p.status === "RAC" ? "warn" : "bad") +
                      '">' + p.status + "</span>").join(" ") },
        { k: "amount", l: "Fare", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Booked"
            ? '<span class="tag ok">booked</span>'
            : '<span class="tag bad">cancelled, refund ' + money(r.refund || 0) + "</span>" }
      ], DB.all("reservations"), r => r.status === "Booked" ? [{
        label: "Cancel & refund", cls: "danger", fn: () => {
          const d = daysBetween(today(), r.journeyDate);
          const pct = refundPercent(d);
          const refund = Math.round(Number(r.amount) * pct / 100);
          if (confirm("Cancel PNR " + r.pnr + "?\nDays before journey: " + d +
                      "\nRefund " + pct + "% = Rs." + refund)) {
            DB.update("reservations", r.id, { status: "Cancelled", refund: refund, cancelledOn: today() });
            Dash.toast("Cancelled. Refund of " + money(refund) + " passed to the system.");
            Dash.show(MODULES.find(m => m.id === "res"));
          }
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "refund", label: "Refund Rules", type: "crud", table: "refundRules",
    desc: "Refundable percentage by the number of days between cancellation and the journey.",
    addLabel: "Add a refund slab",
    fields: [
      { k: "daysBefore", l: "Cancelled at least this many days before", t: "number", min: 0, req: true },
      { k: "percent", l: "Refundable percentage", t: "number", min: 0, req: true },
      { k: "note", l: "Note", full: true }
    ],
    cols: [
      { k: "daysBefore", l: "Days before journey", fmt: r => "≥ " + r.daysBefore },
      { k: "percent", l: "Refund", fmt: r => r.percent + " %" },
      { k: "note", l: "Note" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "payments", label: "Payment Details", type: "custom",
    desc: "Payments received by the system, as sent to the administrator.",
    render(host) {
      const c = Dash.card("<h3>Payments</h3>");
      c.appendChild(Dash.table([
        { k: "pnr", l: "PNR" },
        { k: "bookedOn", l: "Paid on" },
        { k: "payMode", l: "Mode" },
        { k: "amount", l: "Amount", fmt: r => money(r.amount) },
        { k: "refund", l: "Refunded", fmt: r => money(r.refund || 0) },
        { k: "net", l: "Net", fmt: r => money(Number(r.amount) - Number(r.refund || 0)) }
      ], DB.all("reservations")));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
