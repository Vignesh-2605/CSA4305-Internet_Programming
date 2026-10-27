/* ==========================================================================
   user.js - customer's account
   Modules: book a chair, my appointments, feedback, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let picked = { serviceId: "", stylistId: "", date: "", start: null };
let moving = null;     // appointment being rescheduled

const mine = () => DB.all("appointments").filter(a => a.user === SESSION.email);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "book", label: "Book an Appointment", type: "custom",
    desc: "Pick the treatment, the stylist and a free half hour.",
    render(host) {
      const services = DB.all("services");
      const stylists = DB.all("stylists");
      if (!picked.serviceId) picked.serviceId = services[0] ? services[0].id : "";
      if (!picked.stylistId) picked.stylistId = stylists[0] ? stylists[0].id : "";
      if (!picked.date) picked.date = addDays(today(), 1);

      const card = Dash.card(
        "<h3>What would you like?</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Service</label><select id="sv">' +
        services.map(s => '<option value="' + s.id + '"' +
          (String(s.id) === String(picked.serviceId) ? " selected" : "") + ">" +
          esc(s.name) + " - " + money(s.price) + " (" + s.duration + " min)</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Stylist</label><select id="st">' +
        stylists.map(s => '<option value="' + s.id + '"' +
          (String(s.id) === String(picked.stylistId) ? " selected" : "") + ">" +
          esc(s.name) + " - " + esc(s.specialty) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Date</label><input type="date" id="d" value="' + picked.date + '"></div>' +
        "</div>");
      host.appendChild(card);

      const slotCard = Dash.card("<h3>Free times</h3>");
      host.appendChild(slotCard);
      const payCard = document.createElement("div");
      host.appendChild(payCard);

      const paint = () => {
        picked.serviceId = card.querySelector("#sv").value;
        picked.stylistId = card.querySelector("#st").value;
        picked.date = card.querySelector("#d").value;
        const sv = serviceOf(picked.serviceId);
        const st = stylistOf(picked.stylistId);

        slotCard.innerHTML = "<h3>Free times</h3>" +
          '<p class="muted">' + esc(st.name) + " works " + esc(st.days) + ", " +
          pretty(st.from) + " to " + pretty(st.to) + ". " + esc(sv.name) +
          " takes " + sv.duration + " minutes.</p>";

        const slots = slotsFor(picked.stylistId, picked.date, sv.duration);
        if (!slots.length) {
          slotCard.insertAdjacentHTML("beforeend",
            '<p class="muted">' + esc(st.name) + " is not working on a " + dayName(picked.date) +
            ". Try another day or another stylist.</p>");
          payCard.innerHTML = "";
          return;
        }

        const map = document.createElement("div");
        map.className = "seatmap";
        map.style.maxWidth = "100%";
        slots.forEach(s => {
          const b = document.createElement("button");
          b.className = "seat" + (s.free ? "" : " taken") + (picked.start === s.start ? " sel" : "");
          b.style.width = "76px";
          b.textContent = s.label;
          b.disabled = !s.free;
          b.onclick = () => { picked.start = s.start; paint(); };
          map.appendChild(b);
        });
        slotCard.appendChild(map);
        slotCard.insertAdjacentHTML("beforeend",
          '<div class="legend"><span><i></i>free</span>' +
          '<span><i style="background:var(--accent);border-color:var(--accent)"></i>chosen</span>' +
          '<span><i style="background:#e9ecef;border-style:dashed"></i>taken</span></div>');

        payCard.innerHTML = "";
        if (picked.start === null) return;

        const c = Dash.card("<h3>Confirm and pay</h3>" +
          '<p class="muted">' + esc(sv.name) + " with " + esc(st.name) + " on " +
          esc(picked.date) + " at " + pretty(toHHMM(picked.start)) + " &middot; " +
          money(sv.price) + "</p>");
        c.appendChild(Dash.form([
          { k: "phone", l: "Mobile number", req: true,
            def: (DB.all("users").find(u => u.email === SESSION.email) || {}).phone || "" },
          { k: "payMode", l: "Payment", t: "select",
            opts: [
              { v: "Full", l: "Pay in full now - " + money(sv.price) },
              { v: "Deposit", l: "Pay a " + DEPOSIT_PCT + "% deposit - " + money(deposit(sv.price)) },
              { v: "Unpaid", l: "Hold the slot, pay at the salon" }
            ] },
          { k: "notes", l: "Anything we should know?", full: true }
        ], {}, data => {
          if (!isFree(picked.stylistId, picked.date, picked.start, sv.duration)) {
            Dash.toast("Someone just took that slot. Please pick another."); return;
          }
          const paid = data.payMode === "Full" ? Number(sv.price)
                     : data.payMode === "Deposit" ? deposit(sv.price) : 0;
          DB.insert("appointments", {
            user: SESSION.email, name: SESSION.name, phone: data.phone,
            serviceId: Number(picked.serviceId), stylistId: Number(picked.stylistId),
            date: picked.date, time: toHHMM(picked.start), duration: sv.duration,
            amount: Number(sv.price), paid: paid, payMode: data.payMode,
            notes: data.notes, status: "Confirmed", bookedOn: today()
          });
          picked.start = null;
          Dash.toast(data.payMode === "Unpaid"
            ? "Slot held. It is released if it is not paid for within " + HOLD_HOURS + " hours."
            : "Booked. A confirmation and a reminder will be sent to you.");
          Dash.show(MODULES.find(m => m.id === "mine"));
        }, null, "Confirm appointment"));
        payCard.appendChild(c);
      };

      card.querySelector("#sv").onchange = () => { picked.start = null; paint(); };
      card.querySelector("#st").onchange = () => { picked.start = null; paint(); };
      card.querySelector("#d").onchange = () => { picked.start = null; paint(); };
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "mine", label: "My Appointments", type: "custom",
    desc: "Upcoming visits and everything you have had done before.",
    render(host) {
      if (moving) { renderMove(host); return; }

      const rows = mine();
      const upcoming = rows.filter(a => a.status === "Confirmed" && a.date >= today());
      host.appendChild(Dash.stats([
        { n: upcoming.length, l: "Upcoming" },
        { n: rows.filter(a => a.status === "Completed").length, l: "Past visits" },
        { n: money(rows.filter(a => a.status !== "Cancelled")
            .reduce((s, a) => s + Number(a.amount) - Number(a.paid || 0), 0)), l: "Still to pay" }
      ]));

      const c = Dash.card("<h3>Your reservations</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "time", l: "Time", fmt: a => pretty(a.time) },
        { k: "service", l: "Service", fmt: a => esc(serviceOf(a.serviceId).name) },
        { k: "stylist", l: "With", fmt: a => esc(stylistOf(a.stylistId).name) },
        { k: "amount", l: "Price", fmt: a => money(a.amount) },
        { k: "payMode", l: "Payment", fmt: a => a.payMode === "Unpaid"
            ? '<span class="tag warn">unpaid hold</span>'
            : esc(a.payMode) + " " + money(a.paid || 0) },
        { k: "status", l: "Status", fmt: a => statusTag(a.status) }
      ], rows, a => canChange(a) ? [
        { label: "Reschedule", cls: "flat", fn: () => {
            moving = a.id; Dash.show(MODULES.find(m => m.id === "mine"));
          } },
        { label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this appointment?")) {
              DB.update("appointments", a.id, { status: "Cancelled", cancelReason: "Cancelled by the customer" });
              Dash.toast("Appointment cancelled.");
              Dash.show(MODULES.find(m => m.id === "mine"));
            }
          } }
      ] : []));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Appointments can be moved or cancelled up to ' + CUTOFF_HOURS +
        " hours before the time booked. An unpaid hold is released after " + HOLD_HOURS + " hours.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "feedback", label: "Leave Feedback", type: "custom",
    desc: "Tell us how the visit went.",
    render(host) {
      const card = Dash.card("<h3>How did we do?</h3>");
      card.appendChild(Dash.form([
        { k: "stylistId", l: "Who looked after you", t: "select",
          opts: DB.all("stylists").map(s => ({ v: s.id, l: s.name })) },
        { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
        { k: "comment", l: "Your comments", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("feedback", Object.assign(data, { user: SESSION.name, date: today() }));
        form.reset();
        Dash.toast("Thank you - that goes straight to the salon.");
        Dash.show(MODULES.find(m => m.id === "feedback"));
      }, null, "Send feedback"));
      host.appendChild(card);

      const list = Dash.card("<h3>What others said</h3>");
      list.appendChild(Dash.table([
        { k: "user", l: "Customer" },
        { k: "stylist", l: "Stylist", fmt: r => esc(stylistOf(r.stylistId).name) },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) },
        { k: "comment", l: "Comment" }, { k: "date", l: "Posted" }
      ], DB.all("feedback")));
      host.appendChild(list);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Details", type: "custom",
    desc: "Your personal data, as we hold it.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Personal details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, { name: data.name, phone: data.phone, password: data.password });
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
/*  Move an existing appointment to another free slot                       */
/* ------------------------------------------------------------------------ */
function renderMove(host) {
  const a = DB.get("appointments", moving);
  const sv = serviceOf(a.serviceId);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to my appointments";
  back.onclick = () => { moving = null; Dash.show(MODULES.find(m => m.id === "mine")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>Move your " + esc(sv.name) + "</h3>" +
    '<p class="muted">Currently ' + esc(a.date) + " at " + pretty(a.time) +
    " with " + esc(stylistOf(a.stylistId).name) + "</p>" +
    '<div class="form-row"><div class="field"><label>New date</label>' +
    '<input type="date" id="d" value="' + a.date + '"></div></div>');
  host.appendChild(card);
  const out = document.createElement("div");
  host.appendChild(out);

  const paint = () => {
    const d = card.querySelector("#d").value;
    const slots = slotsFor(a.stylistId, d, sv.duration, a.id);
    out.innerHTML = "";
    const c = Dash.card("<h3>Free times on " + esc(d) + "</h3>");
    if (!slots.length) {
      c.insertAdjacentHTML("beforeend",
        '<p class="muted">' + esc(stylistOf(a.stylistId).name) + " is not working that day.</p>");
      out.appendChild(c);
      return;
    }
    const map = document.createElement("div");
    map.className = "seatmap";
    map.style.maxWidth = "100%";
    slots.forEach(s => {
      const b = document.createElement("button");
      b.className = "seat" + (s.free ? "" : " taken");
      b.style.width = "76px";
      b.textContent = s.label;
      b.disabled = !s.free;
      b.onclick = () => {
        DB.update("appointments", a.id, { date: d, time: toHHMM(s.start) });
        moving = null;
        Dash.toast("Moved to " + d + " at " + s.label + ".");
        Dash.show(MODULES.find(m => m.id === "mine"));
      };
      map.appendChild(b);
    });
    c.appendChild(map);
    out.appendChild(c);
  };
  card.querySelector("#d").onchange = paint;
  paint();
}

Dash.mount(MODULES);
