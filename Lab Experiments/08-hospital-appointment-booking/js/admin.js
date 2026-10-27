/* ==========================================================================
   admin.js - hospital administration
   Modules: statistics, doctors, hospitals, appointments, check-in forms, reviews.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- clinic rules shared by both consoles ----------------------------- */
const SLOT_MIN = 20;          // one consultation slot
const CUTOFF_HOURS = 2;       // appointments close this long before the time

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const doctorOf = id => DB.get("doctors", id) ||
  { name: "(removed)", specialty: "-", fee: 0, from: "09:00", to: "13:00", days: "" };
const hospitalOf = id => DB.get("hospitals", id) || { name: "(removed)", location: "-" };

const toMin = t => {
  const p = String(t).split(":");
  return Number(p[0]) * 60 + Number(p[1] || 0);
};
const toHHMM = m =>
  String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const pretty = t => {
  const m = toMin(t), h = Math.floor(m / 60), mm = m % 60;
  const ap = h < 12 ? "am" : "pm";
  return (h % 12 === 0 ? 12 : h % 12) + (mm ? "." + String(mm).padStart(2, "0") : "") + " " + ap;
};
const dayName = d => DAYS[new Date(d + "T00:00:00").getDay()];
const sitsOn = (doc, date) => String(doc.days || "").includes(dayName(date));

const booked = () => DB.all("appointments").filter(a => a.status === "Booked");

/* consulting slots of a doctor on a date, with the ones already taken marked */
function slotsFor(doctorId, date) {
  const doc = doctorOf(doctorId);
  if (!date || !sitsOn(doc, date)) return [];
  const taken = booked()
    .filter(a => String(a.doctorId) === String(doctorId) && a.date === date)
    .map(a => a.time);
  const out = [];
  for (let t = toMin(doc.from); t + SLOT_MIN <= toMin(doc.to); t += SLOT_MIN) {
    out.push({ time: toHHMM(t), label: pretty(toHHMM(t)), free: !taken.includes(toHHMM(t)) });
  }
  return out;
}

/* Token numbers follow the clock, not the order things were booked, so they
   are worked out from the day's list every time rather than stored. */
function tokenFor(doctorId, date, time) {
  const list = booked()
    .filter(a => String(a.doctorId) === String(doctorId) && a.date === date)
    .map(a => a.time).concat(time).sort();
  return list.indexOf(time) + 1;
}

/* token of an appointment that already exists */
function tokenOf(a) {
  if (a.status !== "Booked") return a.token || "-";
  const list = booked()
    .filter(x => String(x.doctorId) === String(a.doctorId) && x.date === a.date)
    .map(x => x.time).sort();
  return list.indexOf(a.time) + 1;
}

function canCancel(a) {
  if (a.status !== "Booked") return false;
  return (new Date(a.date + "T" + a.time + ":00") - new Date()) / 3600000 >= CUTOFF_HOURS;
}

/* average rating a doctor has been given */
function ratingOf(doctorId) {
  const rows = DB.all("reviews").filter(r => String(r.doctorId) === String(doctorId));
  if (!rows.length) return null;
  return (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(1);
}

const statusTag = s => '<span class="tag ' +
  (s === "Booked" ? "ok" : s === "Completed" ? "mute" : "bad") + '">' +
  esc(s.toLowerCase()) + "</span>";

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "stats", label: "Statistics", type: "custom",
    desc: "Appointment numbers, specialties in demand and doctor ratings.",
    render(host) {
      const all = DB.all("appointments");
      host.appendChild(Dash.stats([
        { n: DB.all("doctors").length, l: "Doctors" },
        { n: all.filter(a => a.status === "Booked").length, l: "Upcoming" },
        { n: all.filter(a => a.status === "Completed").length, l: "Consultations done" },
        { n: all.filter(a => a.status === "Cancelled").length, l: "Cancelled" },
        { n: money(all.filter(a => a.status !== "Cancelled")
            .reduce((s, a) => s + Number(a.fee), 0)), l: "Consultation fees" }
      ]));

      const bySpec = {};
      all.filter(a => a.status !== "Cancelled").forEach(a => {
        const s = doctorOf(a.doctorId).specialty;
        bySpec[s] = (bySpec[s] || 0) + 1;
      });
      const spec = Dash.card("<h3>Appointments by specialty</h3>");
      spec.appendChild(Dash.table(
        [{ k: "s", l: "Specialty" }, { k: "n", l: "Appointments" }],
        Object.keys(bySpec).map(s => ({ s: s, n: bySpec[s] })).sort((a, b) => b.n - a.n)));
      host.appendChild(spec);

      const docs = Dash.card("<h3>Doctor wise</h3>");
      docs.appendChild(Dash.table([
        { k: "name", l: "Doctor" },
        { k: "specialty", l: "Specialty" },
        { k: "hospital", l: "Hospital", fmt: d => esc(hospitalOf(d.hospitalId).name) },
        { k: "appts", l: "Appointments", fmt: d => DB.all("appointments")
            .filter(a => String(a.doctorId) === String(d.id) && a.status !== "Cancelled").length },
        { k: "rating", l: "Rating", fmt: d => {
            const r = ratingOf(d.id);
            return r ? '<span class="tag ok">' + r + " / 5</span>" : '<span class="tag mute">no reviews</span>';
          } }
      ], DB.all("doctors")));
      host.appendChild(docs);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "doctors", label: "Doctors", type: "crud", table: "doctors",
    desc: "Who consults where, on which days and at what fee.",
    addLabel: "Add a doctor",
    fields: [
      { k: "name", l: "Name", req: true },
      { k: "specialty", l: "Specialty", t: "select",
        opts: ["General medicine", "Cardiology", "Dermatology", "Orthopaedics",
               "Paediatrics", "ENT", "Ophthalmology", "Dentistry"] },
      { k: "qualification", l: "Qualification" },
      { k: "hospitalId", l: "Hospital", t: "select",
        opts: DB.all("hospitals").map(h => ({ v: h.id, l: h.name + " - " + h.location })) },
      { k: "fee", l: "Consultation fee (Rs.)", t: "number", min: 0, req: true },
      { k: "days", l: "Consulting days", def: "Mon,Tue,Wed,Thu,Fri",
        help: "Short day names separated by commas" },
      { k: "from", l: "From", t: "time", def: "09:00" },
      { k: "to", l: "To", t: "time", def: "13:00" }
    ],
    cols: [
      { k: "name", l: "Doctor" }, { k: "specialty", l: "Specialty" },
      { k: "qualification", l: "Qualification" },
      { k: "hospital", l: "Hospital", fmt: d => esc(hospitalOf(d.hospitalId).name) },
      { k: "fee", l: "Fee", fmt: d => money(d.fee) },
      { k: "days", l: "Days" },
      { k: "hours", l: "Hours", fmt: d => pretty(d.from) + " - " + pretty(d.to) }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "hospitals", label: "Hospitals", type: "crud", table: "hospitals",
    desc: "Branches patients can choose between.",
    addLabel: "Add a hospital",
    fields: [
      { k: "name", l: "Hospital name", req: true },
      { k: "location", l: "Area", req: true },
      { k: "address", l: "Address", full: true },
      { k: "phone", l: "Phone" },
      { k: "beds", l: "Beds", t: "number", min: 0 }
    ],
    cols: [
      { k: "name", l: "Hospital" }, { k: "location", l: "Area" },
      { k: "address", l: "Address" }, { k: "phone", l: "Phone" },
      { k: "doctors", l: "Doctors", fmt: h => DB.all("doctors")
          .filter(d => String(d.hospitalId) === String(h.id)).length }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "appointments", label: "Appointments", type: "custom",
    desc: "The day's list, with the check-in form each patient filled in.",
    render(host) {
      const card = Dash.card(
        "<h3>Filter</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Date</label><input type="date" id="d"></div>' +
        '  <div class="field"><label>Doctor</label><select id="doc"><option value="">All doctors</option>' +
        DB.all("doctors").map(d => '<option value="' + d.id + '">' + esc(d.name) + "</option>").join("") +
        "  </select></div>" +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const d = card.querySelector("#d").value;
        const doc = card.querySelector("#doc").value;
        const rows = DB.all("appointments")
          .filter(a => (!d || a.date === d) && (!doc || String(a.doctorId) === String(doc)))
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

        out.innerHTML = "";
        const c = Dash.card("<h3>Appointment list</h3>");
        c.appendChild(Dash.table([
          { k: "token", l: "Token", fmt: a => tokenOf(a) },
          { k: "date", l: "Date" },
          { k: "time", l: "Time", fmt: a => pretty(a.time) },
          { k: "patient", l: "Patient" },
          { k: "doctor", l: "Doctor", fmt: a => esc(doctorOf(a.doctorId).name) },
          { k: "reason", l: "Reason" },
          { k: "checkedIn", l: "Check-in", fmt: a => a.checkedIn
              ? '<span class="tag ok">submitted</span>' : '<span class="tag mute">not yet</span>' },
          { k: "fee", l: "Fee", fmt: a => money(a.fee) },
          { k: "status", l: "Status", fmt: a => statusTag(a.status) }
        ], rows, a => {
          const acts = [];
          if (a.checkedIn) acts.push({ label: "View form", cls: "flat", fn: () => showForm(a) });
          if (a.status === "Booked") {
            acts.push({ label: "Mark seen", cls: "", fn: () => {
              DB.update("appointments", a.id, { status: "Completed" });
              Dash.toast("Consultation closed.");
              Dash.show(MODULES.find(m => m.id === "appointments"));
            } });
            acts.push({ label: "Cancel", cls: "danger", fn: () => {
              if (confirm("Cancel this appointment?")) {
                DB.update("appointments", a.id, { status: "Cancelled" });
                Dash.toast("Appointment cancelled.");
                Dash.show(MODULES.find(m => m.id === "appointments"));
              }
            } });
          }
          return acts;
        }));
        out.appendChild(c);
      };
      card.querySelector("#d").onchange = paint;
      card.querySelector("#doc").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "reviews", label: "Patient Reviews", type: "custom",
    desc: "Ratings patients left after a consultation.",
    render(host) {
      const c = Dash.card("<h3>Reviews</h3>");
      c.appendChild(Dash.table([
        { k: "patient", l: "Patient" },
        { k: "doctor", l: "Doctor", fmt: r => esc(doctorOf(r.doctorId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) + " (" + r.rating + ")" },
        { k: "comment", l: "Comment" },
        { k: "date", l: "Posted" }
      ], DB.all("reviews"), r => [{ label: "Remove", cls: "danger", fn: () => {
          DB.remove("reviews", r.id); Dash.toast("Review removed.");
          Dash.show(MODULES.find(m => m.id === "reviews"));
        } }]));
      host.appendChild(c);
    }
  }
];

/* the check-in form a patient submitted, shown to the desk */
function showForm(a) {
  const host = document.getElementById("dash-view");
  const c = Dash.card(
    "<h3>Check-in form - " + esc(a.patient) + "</h3>" +
    '<p class="muted">' + esc(a.date) + " at " + pretty(a.time) + " with " +
    esc(doctorOf(a.doctorId).name) + "</p>" +
    '<ul class="contact-list">' +
    "<li><b>Symptoms</b>" + esc(a.symptoms || "-") + "</li>" +
    "<li><b>Since</b>" + esc(a.since || "-") + "</li>" +
    "<li><b>Current medication</b>" + esc(a.medication || "-") + "</li>" +
    "<li><b>Known allergies</b>" + esc(a.allergies || "-") + "</li>" +
    "<li><b>Form submitted on</b>" + esc(a.checkedIn || "-") + "</li></ul>");
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
