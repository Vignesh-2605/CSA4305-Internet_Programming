/* ==========================================================================
   user.js - patient's account
   Modules: find a doctor and book, my appointments, check-in form,
            past visits and reviews, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let booking = null;    // doctor being booked
let bookDate = addDays(today(), 1);
let bookTime = null;

const mine = () => DB.all("appointments").filter(a => a.patient === SESSION.email);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "find", label: "Find a Doctor", type: "custom",
    desc: "Search by specialty, area or hospital and book a free slot.",
    render(host) {
      if (booking) { renderBooking(host); return; }

      const card = Dash.card(
        "<h3>Search</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Specialty</label><select id="sp"><option value="">Any specialty</option>' +
        [...new Set(DB.all("doctors").map(d => d.specialty))]
          .map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Area</label><select id="loc"><option value="">Anywhere</option>' +
        [...new Set(DB.all("hospitals").map(h => h.location))]
          .map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Doctor name</label><input id="q" placeholder="name"></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      out.className = "grid c3";
      host.appendChild(out);

      const paint = () => {
        const sp = card.querySelector("#sp").value;
        const loc = card.querySelector("#loc").value;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = DB.all("doctors").filter(d =>
          (!sp || d.specialty === sp) &&
          (!loc || hospitalOf(d.hospitalId).location === loc) &&
          (!q || d.name.toLowerCase().includes(q)));

        out.innerHTML = "";
        if (!rows.length) {
          out.innerHTML = '<p class="muted">No doctor matches that search.</p>';
          return;
        }
        rows.forEach(d => {
          const r = ratingOf(d.id);
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(d.specialty) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(d.name) + "</h3>" +
            '<p class="meta" style="margin:0">' + esc(d.qualification) + "</p>" +
            '<p class="meta">' + esc(hospitalOf(d.hospitalId).name) + ", " +
              esc(hospitalOf(d.hospitalId).location) + "<br>" +
              esc(d.days) + " &middot; " + pretty(d.from) + " - " + pretty(d.to) + "</p>" +
            '<div class="row"><span class="price">' + money(d.fee) + "</span>" +
            (r ? '<span class="tag ok">' + r + " / 5</span>"
               : '<span class="tag mute">new</span>') + "</div>";
          const b = document.createElement("button");
          b.className = "btn";
          b.style.marginTop = ".8rem";
          b.textContent = "Book an appointment";
          b.onclick = () => {
            booking = d.id; bookTime = null;
            Dash.show(MODULES.find(m => m.id === "find"));
          };
          t.appendChild(b);
          out.appendChild(t);
        });
      };

      card.querySelector("#sp").onchange = paint;
      card.querySelector("#loc").onchange = paint;
      card.querySelector("#q").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "appts", label: "My Appointments", type: "custom",
    desc: "Upcoming visits, with the check-in form to fill in before you come.",
    render(host) {
      const rows = mine();
      host.appendChild(Dash.stats([
        { n: rows.filter(a => a.status === "Booked").length, l: "Upcoming" },
        { n: rows.filter(a => a.status === "Completed").length, l: "Past visits" },
        { n: rows.filter(a => a.status === "Booked" && !a.checkedIn).length, l: "Check-in pending" }
      ]));

      const c = Dash.card("<h3>Your appointments</h3>");
      c.appendChild(Dash.table([
        { k: "token", l: "Token", fmt: a => tokenOf(a) },
        { k: "date", l: "Date" },
        { k: "time", l: "Time", fmt: a => pretty(a.time) },
        { k: "doctor", l: "Doctor", fmt: a => esc(doctorOf(a.doctorId).name) },
        { k: "specialty", l: "Specialty", fmt: a => esc(doctorOf(a.doctorId).specialty) },
        { k: "hospital", l: "Where", fmt: a => esc(hospitalOf(doctorOf(a.doctorId).hospitalId).name) },
        { k: "fee", l: "Fee", fmt: a => money(a.fee) },
        { k: "checkedIn", l: "Check-in", fmt: a => a.checkedIn
            ? '<span class="tag ok">done</span>' : '<span class="tag warn">pending</span>' },
        { k: "status", l: "Status", fmt: a => statusTag(a.status) }
      ], rows, a => {
        const acts = [];
        if (a.status === "Booked") acts.push({
          label: a.checkedIn ? "Edit check-in" : "Check-in form", cls: "flat",
          fn: () => checkinForm(a)
        });
        if (canCancel(a)) acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this appointment?")) {
              DB.update("appointments", a.id, { status: "Cancelled" });
              Dash.toast("Appointment cancelled.");
              Dash.show(MODULES.find(m => m.id === "appts"));
            }
          }
        });
        return acts;
      }));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Please fill the check-in form before you arrive - it saves time at ' +
        "the desk. Appointments can be cancelled up to " + CUTOFF_HOURS + " hours before the slot.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "history", label: "Past Visits", type: "custom",
    desc: "Everything you have been seen for, and a place to rate the doctor.",
    render(host) {
      const past = mine().filter(a => a.status === "Completed");
      const c = Dash.card("<h3>Consultation history</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "doctor", l: "Doctor", fmt: a => esc(doctorOf(a.doctorId).name) },
        { k: "specialty", l: "Specialty", fmt: a => esc(doctorOf(a.doctorId).specialty) },
        { k: "reason", l: "Reason" },
        { k: "symptoms", l: "What you reported", fmt: a => esc(a.symptoms || "-") },
        { k: "fee", l: "Fee", fmt: a => money(a.fee) }
      ], past));
      host.appendChild(c);

      const rev = Dash.card("<h3>Rate a doctor you have seen</h3>");
      const seen = [...new Set(past.map(a => a.doctorId))];
      if (!seen.length) {
        rev.insertAdjacentHTML("beforeend",
          '<p class="muted">Once a consultation is closed you can rate the doctor here.</p>');
      } else {
        rev.appendChild(Dash.form([
          { k: "doctorId", l: "Doctor", t: "select",
            opts: seen.map(id => ({ v: id, l: doctorOf(id).name })) },
          { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
          { k: "comment", l: "Your review", t: "textarea", req: true, full: true }
        ], {}, (data, form) => {
          DB.insert("reviews", Object.assign(data, {
            patient: SESSION.name, date: today()
          }));
          form.reset();
          Dash.toast("Thank you for the review.");
          Dash.show(MODULES.find(m => m.id === "history"));
        }, null, "Post review"));
      }
      host.appendChild(rev);

      const all = Dash.card("<h3>What other patients said</h3>");
      all.appendChild(Dash.table([
        { k: "patient", l: "Patient" },
        { k: "doctor", l: "Doctor", fmt: r => esc(doctorOf(r.doctorId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) },
        { k: "comment", l: "Comment" }, { k: "date", l: "Posted" }
      ], DB.all("reviews")));
      host.appendChild(all);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Details", type: "custom",
    desc: "Details the hospital holds for you.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Patient details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "age", l: "Age", t: "number", min: 0 },
        { k: "bloodGroup", l: "Blood group", t: "select",
          opts: ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, age: data.age,
          bloodGroup: data.bloodGroup, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Details saved.");
        location.reload();
      }, null, "Save details"));
      host.appendChild(card);
    }
  }
];

/* ------------------------------------------------------------------------ */
/*  Pick a date and a free slot, then confirm                               */
/* ------------------------------------------------------------------------ */
function renderBooking(host) {
  const doc = doctorOf(booking);
  const hos = hospitalOf(doc.hospitalId);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to the doctor list";
  back.onclick = () => { booking = null; Dash.show(MODULES.find(m => m.id === "find")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>" + esc(doc.name) + "</h3>" +
    '<p class="muted">' + esc(doc.specialty) + " &middot; " + esc(doc.qualification) +
    "<br>" + esc(hos.name) + ", " + esc(hos.location) + " &middot; " + money(doc.fee) +
    "<br>Consults " + esc(doc.days) + ", " + pretty(doc.from) + " to " + pretty(doc.to) + "</p>" +
    '<div class="form-row"><div class="field"><label>Date</label>' +
    '<input type="date" id="d" value="' + bookDate + '"></div></div>');
  host.appendChild(card);

  const slotCard = Dash.card("");
  host.appendChild(slotCard);
  const confirm_ = document.createElement("div");
  host.appendChild(confirm_);

  const paint = () => {
    bookDate = card.querySelector("#d").value;
    const slots = slotsFor(booking, bookDate);
    slotCard.innerHTML = "<h3>Free slots</h3>";
    confirm_.innerHTML = "";

    if (!slots.length) {
      slotCard.insertAdjacentHTML("beforeend",
        '<p class="muted">' + esc(doc.name) + " does not consult on a " + dayName(bookDate) +
        ". Try another day.</p>");
      return;
    }
    const map = document.createElement("div");
    map.className = "seatmap";
    map.style.maxWidth = "100%";
    slots.forEach(s => {
      const b = document.createElement("button");
      b.className = "seat" + (s.free ? "" : " taken") + (bookTime === s.time ? " sel" : "");
      b.style.width = "78px";
      b.textContent = s.label;
      b.disabled = !s.free;
      b.onclick = () => { bookTime = s.time; paint(); };
      map.appendChild(b);
    });
    slotCard.appendChild(map);
    slotCard.insertAdjacentHTML("beforeend",
      '<div class="legend"><span><i></i>free</span>' +
      '<span><i style="background:var(--accent);border-color:var(--accent)"></i>chosen</span>' +
      '<span><i style="background:#e9ecef;border-style:dashed"></i>taken</span></div>');

    if (!bookTime) return;

    const me = DB.all("users").find(u => u.email === SESSION.email) || {};
    const c = Dash.card("<h3>Confirm the appointment</h3>" +
      '<p class="muted">' + esc(doc.name) + " on " + esc(bookDate) + " at " +
      pretty(bookTime) + " &middot; token " + tokenFor(booking, bookDate, bookTime) + "</p>");
    c.appendChild(Dash.form([
      { k: "phone", l: "Mobile number", req: true, def: me.phone || "" },
      { k: "reason", l: "Reason for the visit", req: true },
      { k: "remind", l: "Remind me by", t: "select", opts: ["SMS", "E-mail", "Both"] }
    ], {}, data => {
      const slot = slotsFor(booking, bookDate).find(s => s.time === bookTime);
      if (!slot || !slot.free) { Dash.toast("That slot has just gone. Please pick another."); return; }
      const a = DB.insert("appointments", {
        patient: SESSION.email, name: SESSION.name, phone: data.phone,
        doctorId: Number(booking), date: bookDate, time: bookTime,
        token: tokenFor(booking, bookDate, bookTime),   /* kept for the record */
        reason: data.reason, remind: data.remind, fee: Number(doc.fee),
        status: "Booked", bookedOn: today(), checkedIn: ""
      });
      booking = null; bookTime = null;
      Dash.toast("Appointment booked. Token " + a.token + ". A reminder will be sent by " +
        data.remind.toLowerCase() + ".");
      Dash.show(MODULES.find(m => m.id === "appts"));
    }, null, "Confirm appointment"));
    confirm_.appendChild(c);
  };

  card.querySelector("#d").onchange = () => { bookTime = null; paint(); };
  paint();
}

/* ------------------------------------------------------------------------ */
/*  The check-in form, filled in before the visit                           */
/* ------------------------------------------------------------------------ */
function checkinForm(a) {
  const host = document.getElementById("dash-view");
  const c = Dash.card(
    "<h3>Check-in form</h3>" +
    '<p class="muted">' + esc(doctorOf(a.doctorId).name) + " on " + esc(a.date) +
    " at " + pretty(a.time) + "</p>");
  c.appendChild(Dash.form([
    { k: "symptoms", l: "What is troubling you", t: "textarea", req: true, full: true },
    { k: "since", l: "Since when", req: true },
    { k: "medication", l: "Medicines you take now", full: true },
    { k: "allergies", l: "Known allergies", full: true }
  ], a, data => {
    DB.update("appointments", a.id, Object.assign(data, { checkedIn: today() }));
    Dash.toast("Check-in form submitted.");
    Dash.show(MODULES.find(m => m.id === "appts"));
  }, null, "Submit the form"));
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
