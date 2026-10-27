/* ==========================================================================
   admin.js - salon manager's console
   Modules: day diary, appointments, services, stylists, blocked hours, feedback.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- diary rules shared by both consoles ------------------------------ */
const STEP = 30;              // the diary runs in half hour steps
const DEPOSIT_PCT = 30;       // a chair can be held with a 30% deposit
const HOLD_HOURS = 24;        // an unpaid hold is released after this long
const CUTOFF_HOURS = 2;       // changes stop this long before the appointment

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const serviceOf = id => DB.get("services", id) || { name: "(removed)", price: 0, duration: 30 };
const stylistOf = id => DB.get("stylists", id) || { name: "(removed)", from: "09:00", to: "19:00", days: "" };

const toMin = t => {
  const p = String(t).split(":");
  return Number(p[0]) * 60 + Number(p[1] || 0);
};
const toHHMM = m =>
  String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const pretty = t => {
  const m = toMin(t), h = Math.floor(m / 60), mm = m % 60;
  const ap = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return hh + (mm ? "." + String(mm).padStart(2, "0") : "") + " " + ap;
};
const dayName = d => DAYS[new Date(d + "T00:00:00").getDay()];
const worksOn = (st, date) => String(st.days || "").includes(dayName(date));

const liveAppts = () => DB.all("appointments").filter(a => a.status === "Confirmed");

/* is this stylist free for `duration` minutes from `start` on that date? */
function isFree(stylistId, date, start, duration, ignoreId) {
  const end = start + Number(duration);
  const busy = liveAppts().some(a =>
    String(a.stylistId) === String(stylistId) && a.date === date &&
    String(a.id) !== String(ignoreId) &&
    toMin(a.time) < end && start < toMin(a.time) + Number(a.duration));
  const locked = DB.all("lockouts").some(l =>
    String(l.stylistId) === String(stylistId) && l.date === date &&
    toMin(l.from) < end && start < toMin(l.to));
  return !busy && !locked;
}

/* every half hour the stylist could start that service, with its state */
function slotsFor(stylistId, date, duration, ignoreId) {
  const st = stylistOf(stylistId);
  if (!date || !worksOn(st, date)) return [];
  const out = [];
  for (let t = toMin(st.from); t + Number(duration) <= toMin(st.to); t += STEP) {
    out.push({ start: t, label: pretty(toHHMM(t)), free: isFree(stylistId, date, t, duration, ignoreId) });
  }
  return out;
}

const deposit = price => Math.round(Number(price) * DEPOSIT_PCT / 100);

/* changes close CUTOFF_HOURS before the chair is due */
function canChange(a) {
  if (a.status !== "Confirmed") return false;
  const when = new Date(a.date + "T" + a.time + ":00");
  return (when - new Date()) / 3600000 >= CUTOFF_HOURS;
}

/* a hold that was never paid for is dropped automatically */
function releaseUnpaid() {
  DB.all("appointments")
    .filter(a => a.status === "Confirmed" && a.payMode === "Unpaid" &&
                 daysBetween(a.bookedOn, today()) * 24 >= HOLD_HOURS)
    .forEach(a => DB.update("appointments", a.id, {
      status: "Cancelled", cancelReason: "Unpaid hold released automatically"
    }));
}
releaseUnpaid();

const statusTag = s => '<span class="tag ' +
  (s === "Confirmed" ? "ok" : s === "Completed" ? "mute" : "bad") + '">' +
  esc(s.toLowerCase()) + "</span>";

let editAppt = null;

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "diary", label: "Day Diary", type: "custom",
    desc: "Every chair, hour by hour, for the date you pick.",
    render(host) {
      const card = Dash.card(
        "<h3>Choose a date</h3>" +
        '<div class="form-row"><div class="field"><label>Date</label>' +
        '<input type="date" id="d" value="' + today() + '"></div></div>');
      host.appendChild(card);
      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const d = card.querySelector("#d").value;
        out.innerHTML = "";
        const todays = liveAppts().filter(a => a.date === d);
        out.appendChild(Dash.stats([
          { n: todays.length, l: "Chairs booked" },
          { n: money(todays.reduce((s, a) => s + Number(a.amount), 0)), l: "Expected takings" },
          { n: money(todays.reduce((s, a) => s + Number(a.paid || 0), 0)), l: "Already paid" }
        ]));

        DB.all("stylists").forEach(st => {
          const c = Dash.card("<h3>" + esc(st.name) + ' <span class="tag">' + esc(st.role) + "</span></h3>" +
            '<p class="muted">' + esc(st.days) + " &middot; " + pretty(st.from) + " to " + pretty(st.to) + "</p>");

          if (!worksOn(st, d)) {
            c.insertAdjacentHTML("beforeend", '<p class="muted">Not working on a ' + dayName(d) + ".</p>");
            out.appendChild(c);
            return;
          }

          const map = document.createElement("div");
          map.className = "seatmap";
          map.style.maxWidth = "100%";
          for (let t = toMin(st.from); t < toMin(st.to); t += STEP) {
            const appt = todays.find(a => String(a.stylistId) === String(st.id) &&
              toMin(a.time) <= t && t < toMin(a.time) + Number(a.duration));
            const lock = DB.all("lockouts").find(l => String(l.stylistId) === String(st.id) &&
              l.date === d && toMin(l.from) <= t && t < toMin(l.to));
            const b = document.createElement("button");
            b.className = "seat" + (appt || lock ? " taken" : "");
            b.style.width = "74px";
            b.textContent = pretty(toHHMM(t));
            b.title = appt ? appt.name + " - " + serviceOf(appt.serviceId).name
                           : lock ? "Blocked: " + lock.reason : "free";
            b.disabled = true;
            map.appendChild(b);
          }
          c.appendChild(map);

          const rows = todays.filter(a => String(a.stylistId) === String(st.id))
            .sort((a, b) => toMin(a.time) - toMin(b.time));
          if (rows.length) c.appendChild(Dash.table([
            { k: "time", l: "Time", fmt: a => pretty(a.time) },
            { k: "service", l: "Service", fmt: a => esc(serviceOf(a.serviceId).name) },
            { k: "name", l: "Customer" },
            { k: "phone", l: "Phone" },
            { k: "payMode", l: "Payment", fmt: a => a.payMode === "Unpaid"
                ? '<span class="tag warn">unpaid hold</span>'
                : '<span class="tag ok">' + esc(a.payMode.toLowerCase()) + "</span>" }
          ], rows));
          out.appendChild(c);
        });
      };
      card.querySelector("#d").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "appointments", label: "Appointments", type: "custom",
    desc: "Add, change or cancel a reservation and send the customer a reminder.",
    render(host) {
      if (editAppt) {
        const a = DB.get("appointments", editAppt);
        const card = Dash.card("<h3>Reservation #" + a.id + " - " + esc(a.name) + "</h3>");
        card.appendChild(Dash.form([
          { k: "serviceId", l: "Service", t: "select",
            opts: DB.all("services").map(s => ({ v: s.id, l: s.name })) },
          { k: "stylistId", l: "Stylist", t: "select",
            opts: DB.all("stylists").map(s => ({ v: s.id, l: s.name })) },
          { k: "date", l: "Date", t: "date", req: true },
          { k: "time", l: "Time", t: "time", req: true },
          { k: "status", l: "Status", t: "select", opts: ["Confirmed", "Completed", "Cancelled"] }
        ], a, data => {
          const sv = serviceOf(data.serviceId);
          if (data.status === "Confirmed" &&
              !isFree(data.stylistId, data.date, toMin(data.time), sv.duration, a.id)) {
            Dash.toast("That stylist is not free then."); return;
          }
          DB.update("appointments", a.id, Object.assign(data, {
            duration: sv.duration, amount: sv.price
          }));
          editAppt = null;
          Dash.toast("Reservation updated.");
          Dash.show(MODULES.find(m => m.id === "appointments"));
        }, () => { editAppt = null; Dash.show(MODULES.find(m => m.id === "appointments")); },
          "Save changes"));
        host.appendChild(card);
      }

      const c = Dash.card("<h3>Reservation book</h3>");
      c.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "date", l: "Date" },
        { k: "time", l: "Time", fmt: a => pretty(a.time) },
        { k: "service", l: "Service", fmt: a => esc(serviceOf(a.serviceId).name) },
        { k: "stylist", l: "Stylist", fmt: a => esc(stylistOf(a.stylistId).name) },
        { k: "name", l: "Customer" },
        { k: "amount", l: "Price", fmt: a => money(a.amount) },
        { k: "paid", l: "Paid", fmt: a => money(a.paid || 0) + " (" + esc(a.payMode) + ")" },
        { k: "status", l: "Status", fmt: a => statusTag(a.status) }
      ], DB.all("appointments"), a => {
        const acts = [
          { label: "Edit", cls: "flat", fn: () => {
              editAppt = a.id; Dash.show(MODULES.find(m => m.id === "appointments"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            } },
          { label: "Remind", cls: "flat", fn: () =>
              Dash.toast("SMS sent to " + a.phone + " about " + a.date + " at " + pretty(a.time) + ".") }
        ];
        if (a.status === "Confirmed") {
          acts.push({ label: "Mark done", cls: "", fn: () => {
            DB.update("appointments", a.id, { status: "Completed" });
            Dash.toast("Marked as completed.");
            Dash.show(MODULES.find(m => m.id === "appointments"));
          } });
          acts.push({ label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this reservation?")) {
              DB.update("appointments", a.id, { status: "Cancelled", cancelReason: "Cancelled by the salon" });
              Dash.toast("Reservation cancelled.");
              Dash.show(MODULES.find(m => m.id === "appointments"));
            }
          } });
        }
        return acts;
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "services", label: "Services", type: "crud", table: "services",
    desc: "The menu of treatments, how long each one takes and what it costs.",
    addLabel: "Add a service",
    fields: [
      { k: "name", l: "Service", req: true },
      { k: "category", l: "Category", t: "select", opts: ["Hair", "Skin", "Nails", "Bridal", "Spa"] },
      { k: "duration", l: "Minutes in the chair", t: "number", min: 15, def: 30, req: true },
      { k: "price", l: "Price (Rs.)", t: "number", min: 0, req: true },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Service" }, { k: "category", l: "Category" },
      { k: "duration", l: "Minutes" },
      { k: "price", l: "Price", fmt: s => money(s.price) },
      { k: "description", l: "Description" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "stylists", label: "Stylists", type: "crud", table: "stylists",
    desc: "Who works which days and between which hours.",
    addLabel: "Add a stylist",
    fields: [
      { k: "name", l: "Name", req: true },
      { k: "role", l: "Role", t: "select", opts: ["Senior stylist", "Stylist", "Beautician", "Bridal artist"] },
      { k: "specialty", l: "Specialty" },
      { k: "days", l: "Working days", def: "Tue,Wed,Thu,Fri,Sat,Sun",
        help: "Short day names separated by commas" },
      { k: "from", l: "Starts at", t: "time", def: "09:00" },
      { k: "to", l: "Finishes at", t: "time", def: "19:00" }
    ],
    cols: [
      { k: "name", l: "Name" }, { k: "role", l: "Role" }, { k: "specialty", l: "Specialty" },
      { k: "days", l: "Days" },
      { k: "hours", l: "Hours", fmt: s => pretty(s.from) + " - " + pretty(s.to) }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "lockouts", label: "Blocked Hours", type: "crud", table: "lockouts",
    desc: "Hours no one can book - training, leave, a private appointment.",
    addLabel: "Block some hours",
    fields: [
      { k: "stylistId", l: "Stylist", t: "select", req: true,
        opts: DB.all("stylists").map(s => ({ v: s.id, l: s.name })) },
      { k: "date", l: "Date", t: "date", req: true, def: today() },
      { k: "from", l: "From", t: "time", def: "13:00" },
      { k: "to", l: "To", t: "time", def: "14:00" },
      { k: "reason", l: "Reason", full: true }
    ],
    cols: [
      { k: "stylist", l: "Stylist", fmt: l => esc(stylistOf(l.stylistId).name) },
      { k: "date", l: "Date" },
      { k: "hours", l: "Blocked", fmt: l => pretty(l.from) + " - " + pretty(l.to) },
      { k: "reason", l: "Reason" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Feedback", type: "custom",
    desc: "What customers said after their visit.",
    render(host) {
      const rows = DB.all("feedback");
      const avg = rows.length
        ? (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1) : "-";
      host.appendChild(Dash.stats([
        { n: rows.length, l: "Reviews" },
        { n: avg + " / 5", l: "Average rating" }
      ]));
      const c = Dash.card("<h3>Reviews</h3>");
      c.appendChild(Dash.table([
        { k: "user", l: "Customer" },
        { k: "stylist", l: "Stylist", fmt: r => esc(stylistOf(r.stylistId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Comment" },
        { k: "date", l: "Posted" }
      ], rows, r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("feedback", r.id); Dash.toast("Review removed.");
          Dash.show(MODULES.find(m => m.id === "feedback"));
        } }]));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
