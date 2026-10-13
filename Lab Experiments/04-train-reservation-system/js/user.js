/* ==========================================================================
   user.js - Passenger console
   Modules: train search with seat availability, booking (passenger details +
            payment -> PNR), PNR status, my tickets (print / cancel), profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let booking = null;        // { trainId, cls }
let paxRows = [{ name: "", age: "", gender: "Male" }];

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search Trains", type: "custom",
    desc: "Train list, seat availability and via details for your route.",
    render(host) {
      if (booking) { renderBooking(host); return; }

      const st = [...new Set(DB.all("trains").flatMap(t => [t.from, t.to]))];
      const card = Dash.card(
        "<h3>Find a train</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>From</label><select id="from"><option value="">Any</option>' +
             st.map(s => "<option>" + esc(s) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>To</label><select id="to"><option value="">Any</option>' +
             st.map(s => "<option>" + esc(s) + "</option>").join("") + "</select></div>" +
        '  <div class="field"><label>Date of journey</label><input type="date" id="d"></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const f = card.querySelector("#from").value;
        const t = card.querySelector("#to").value;
        const d = card.querySelector("#d").value;
        const rows = DB.all("trains").filter(x =>
          (!f || x.from === f) && (!t || x.to === t) && (!d || x.date === d));
        out.innerHTML = '<p class="muted">' + rows.length + " train(s) found.</p>";

        rows.forEach(tr => {
          const c = Dash.card(
            "<h3>" + esc(tr.number) + " &middot; " + esc(tr.name) + "</h3>" +
            '<p class="muted">' + esc(tr.from) + " → " + esc(tr.to) +
            " &middot; via " + esc(tr.via) + " &middot; " + esc(tr.date) +
            " &middot; dep " + esc(tr.depTime) + ", arr " + esc(tr.arrTime) + "</p>");

          const cls = classesOf(tr.id);
          c.appendChild(Dash.table([
            { k: "cls", l: "Class" },
            { k: "fare", l: "Fare", fmt: r => money(r.fare) },
            { k: "avail", l: "Availability", fmt: r => {
                const a = availabilityText(tr.id, r.cls, tr.date);
                return '<span class="tag ' + a.c + '">' + a.t + "</span>";
              } }
          ], cls, r => [{
            label: "Book this class", cls: "", fn: () => {
              booking = { trainId: tr.id, cls: r.cls };
              paxRows = [{ name: SESSION.name, age: "", gender: "Male" }];
              Dash.show(MODULES.find(m => m.id === "search"));
            }
          }]));
          out.appendChild(c);
        });
      };

      card.querySelector("#from").onchange = paint;
      card.querySelector("#to").onchange = paint;
      card.querySelector("#d").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "pnr", label: "PNR Status", type: "custom",
    desc: "Enter a PNR number to see whether it is confirmed, RAC or waiting list.",
    render(host) {
      const card = Dash.card(
        "<h3>PNR enquiry</h3>" +
        '<div class="form-row"><div class="field"><label>PNR number</label>' +
        '<input id="pnr" placeholder="10 digit PNR"></div></div>' +
        '<button class="btn" id="go">Check status</button>');
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      card.querySelector("#go").onclick = () => {
        const pnr = card.querySelector("#pnr").value.trim();
        const r = DB.all("reservations").find(x => x.pnr === pnr);
        out.innerHTML = "";
        if (!r) { out.innerHTML = '<div class="note">No reservation found for that PNR.</div>'; return; }
        const tr = trainOf(r.trainId);
        const c = Dash.card(
          "<h3>PNR " + esc(r.pnr) + "</h3>" +
          "<p>" + esc(tr.number) + " " + esc(tr.name) + " &middot; " + esc(tr.from) +
          " → " + esc(tr.to) + " &middot; " + esc(r.journeyDate) +
          " &middot; class " + esc(r.cls) + "</p>" +
          "<p>Booking status: " + (r.status === "Booked"
            ? '<span class="tag ok">booked</span>'
            : '<span class="tag bad">cancelled</span>') + "</p>");
        c.appendChild(Dash.table([
          { k: "name", l: "Passenger" }, { k: "age", l: "Age" }, { k: "gender", l: "Gender" },
          { k: "status", l: "Status", fmt: p => '<span class="tag ' +
              (p.status === "CNF" ? "ok" : p.status === "RAC" ? "warn" : "bad") + '">' +
              p.status + "</span>" },
          { k: "berth", l: "Berth / position" }
        ], r.passengers));
        out.appendChild(c);
      };
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "mine", label: "My Tickets", type: "custom",
    desc: "Booking history, printable tickets and cancellation with refund.",
    render(host) {
      const mine = DB.all("reservations").filter(r => r.user === SESSION.email);
      const c = Dash.card("<h3>My reservations</h3>");
      c.appendChild(Dash.table([
        { k: "pnr", l: "PNR" },
        { k: "train", l: "Train", fmt: r => esc(trainOf(r.trainId).number + " " + trainOf(r.trainId).name) },
        { k: "journeyDate", l: "Journey" },
        { k: "cls", l: "Class" },
        { k: "pax", l: "Pax", fmt: r => (r.passengers || []).length },
        { k: "amount", l: "Fare", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Booked"
            ? '<span class="tag ok">booked</span>'
            : '<span class="tag bad">cancelled (refund ' + money(r.refund || 0) + ")</span>" }
      ], mine, r => r.status === "Booked" ? [
        { label: "Print ticket", cls: "flat", fn: () => showTicket(r) },
        { label: "Cancel", cls: "danger", fn: () => {
            const d = daysBetween(today(), r.journeyDate);
            const pct = refundPercent(d);
            const refund = Math.round(Number(r.amount) * pct / 100);
            if (confirm("Cancel PNR " + r.pnr + "?\n" + d + " day(s) before the journey\n" +
                        "Refundable: " + pct + "% = Rs." + refund)) {
              DB.update("reservations", r.id, { status: "Cancelled", refund: refund, cancelledOn: today() });
              Dash.toast("Cancelled. " + money(refund) + " will be refunded.");
              Dash.show(MODULES.find(m => m.id === "mine"));
            }
          } }
      ] : []));
      host.appendChild(c);

      const rules = Dash.card("<h3>Refund rules</h3>");
      rules.appendChild(Dash.table([
        { k: "daysBefore", l: "Cancelled before journey", fmt: r => "≥ " + r.daysBefore + " day(s)" },
        { k: "percent", l: "Refundable", fmt: r => r.percent + " %" },
        { k: "note", l: "Note" }
      ], DB.all("refundRules")));
      host.appendChild(rules);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "Account details used on the reservation form.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Mobile" },
        { k: "idproof", l: "ID proof number" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, idproof: data.idproof, password: data.password });
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
/*  Booking step: passenger details + payment, then PNR generation          */
/* ------------------------------------------------------------------------ */
function renderBooking(host) {
  const tr = trainOf(booking.trainId);
  const fr = fareRow(booking.trainId, booking.cls);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to train list";
  back.onclick = () => { booking = null; Dash.show(MODULES.find(m => m.id === "search")); };
  host.appendChild(back);

  const card = Dash.card(
    "<h3>" + esc(tr.number) + " " + esc(tr.name) + " &mdash; class " + esc(booking.cls) + "</h3>" +
    '<p class="muted">' + esc(tr.from) + " → " + esc(tr.to) + " &middot; " + esc(tr.date) +
    " &middot; " + money(fr.fare) + " per passenger</p>" +
    "<h4>Passenger details</h4>");

  const list = document.createElement("div");
  card.appendChild(list);

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
          '<option' + (p.gender === g ? " selected" : "") + ">" + g + "</option>").join("") +
        "</select></div>";
      const del = document.createElement("div");
      del.className = "field";
      del.innerHTML = "<label>&nbsp;</label>";
      const b = document.createElement("button");
      b.className = "btn flat";
      b.type = "button";
      b.textContent = "Remove";
      b.disabled = paxRows.length === 1;
      b.onclick = () => { paxRows.splice(i, 1); paintPax(); };
      del.appendChild(b);
      row.appendChild(del);
      list.appendChild(row);
    });
    list.querySelectorAll("[data-i]").forEach(inp => {
      inp.oninput = inp.onchange = () => {
        paxRows[Number(inp.dataset.i)][inp.dataset.k] = inp.value;
        totalLine.innerHTML = "Total fare: <b>" + money(paxRows.length * Number(fr.fare)) + "</b>";
      };
    });
    totalLine.innerHTML = "Total fare: <b>" + money(paxRows.length * Number(fr.fare)) + "</b>";
  };

  const add = document.createElement("button");
  add.className = "btn flat";
  add.type = "button";
  add.textContent = "+ Add passenger";
  add.onclick = () => { paxRows.push({ name: "", age: "", gender: "Male" }); paintPax(); };
  card.appendChild(add);

  const totalLine = document.createElement("p");
  totalLine.style.marginTop = ".9rem";
  card.appendChild(totalLine);
  host.appendChild(card);
  paintPax();

  const pay = Dash.card("<h3>Payment</h3>");
  pay.appendChild(Dash.form([
    { k: "journeyDate", l: "Date of journey", t: "date", req: true, def: tr.date },
    { k: "payMode", l: "Payment mode", t: "select",
      opts: ["Online - UPI", "Online - card", "Online - net banking", "Offline - counter"] },
    { k: "mobile", l: "Mobile for SMS", req: true }
  ], {}, data => {
    if (paxRows.some(p => !p.name || !p.age)) { Dash.toast("Fill name and age for every passenger."); return; }
    const allotted = allocate(booking.trainId, booking.cls, data.journeyDate, paxRows);
    const rec = DB.insert("reservations", {
      user: SESSION.email, trainId: booking.trainId, cls: booking.cls,
      journeyDate: data.journeyDate, passengers: allotted,
      amount: paxRows.length * Number(fr.fare),
      payMode: data.payMode, mobile: data.mobile,
      status: "Booked", bookedOn: today(), refund: 0, pnr: ""
    });
    DB.update("reservations", rec.id, { pnr: makePnr(rec.id) });
    const saved = DB.get("reservations", rec.id);
    booking = null;
    Dash.toast("Payment successful. PNR " + saved.pnr + " generated.");
    Dash.show(MODULES.find(m => m.id === "mine"));
    showTicket(saved);
  }, null, "Pay & generate ticket"));
  host.appendChild(pay);
}

/* printable ticket */
function showTicket(r) {
  const tr = trainOf(r.trainId);
  const host = document.getElementById("dash-view");
  const c = document.createElement("div");
  c.className = "ticket";
  c.innerHTML =
    "<h3>Electronic Reservation Slip &middot; PNR " + esc(r.pnr) + "</h3>" +
    '<div class="row"><span>Train</span><b>' + esc(tr.number) + " " + esc(tr.name) + "</b></div>" +
    '<div class="row"><span>From / To</span><b>' + esc(tr.from) + " → " + esc(tr.to) + "</b></div>" +
    '<div class="row"><span>Journey</span><b>' + esc(r.journeyDate) + " &middot; dep " + esc(tr.depTime) + "</b></div>" +
    '<div class="row"><span>Class</span><b>' + esc(r.cls) + "</b></div>" +
    (r.passengers || []).map(p =>
      '<div class="row"><span>' + esc(p.name) + " (" + esc(p.age) + "/" + esc(p.gender) +
      ")</span><b>" + esc(p.status) + " &middot; " + esc(p.berth) + "</b></div>").join("") +
    '<div class="row"><span>Fare paid</span><b>' + money(r.amount) + " &middot; " + esc(r.payMode) + "</b></div>";
  const p = document.createElement("button");
  p.className = "btn flat no-print";
  p.style.marginTop = ".8rem";
  p.textContent = "Print";
  p.onclick = () => window.print();
  c.appendChild(p);
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
