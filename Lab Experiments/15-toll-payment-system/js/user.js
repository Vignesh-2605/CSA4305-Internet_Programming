/* ==========================================================================
   user.js - the driver
   Modules: wallet, vehicles, buy a ticket, passes, crossings, account.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- toll rules shared by all three consoles -------------------------- */
const PASS_TYPES = [
  { name: "Single return", days: 1, times: 1.6 },
  { name: "Local monthly", days: 30, times: 12 },
  { name: "Commercial monthly", days: 30, times: 22 }
];

const tollOf = id => DB.get("tolls", id) ||
  { name: "(removed)", highway: "-", carRate: 0, lcvRate: 0, hcvRate: 0 };
const vehicleOf = id => DB.get("vehicles", id) ||
  { regNo: "-", type: "Car", model: "-" };
const userOf = email => DB.all("users").find(u => u.email === email) || { name: email, wallet: 0 };

/* what this plaza charges that class of vehicle */
function rateFor(toll, type) {
  if (type === "HCV") return Number(toll.hcvRate);
  if (type === "LCV") return Number(toll.lcvRate);
  return Number(toll.carRate);
}

const passPrice = (toll, type, passType) => {
  const t = PASS_TYPES.find(x => x.name === passType) || PASS_TYPES[0];
  return Math.round(rateFor(toll, type) * t.times);
};

/* money in and out of the wallet, always through here so the balance and the
   statement can never disagree */
function wallet(email) { return Number(userOf(email).wallet || 0); }

function moveMoney(email, amount, kind, ref) {
  const u = userOf(email);
  const balance = Number(u.wallet || 0) + Number(amount);
  DB.update("users", u.id, { wallet: balance });
  DB.insert("walletTxns", {
    user: email, kind: kind, amount: Number(amount),
    ref: ref, date: today(), balance: balance
  });
  return balance;
}

/* the code printed on a pass or a ticket and read at the gate */
const passCode = id => "EZT-P-" + String(100000 + Number(id) * 61);
const ticketCode = id => "EZT-T-" + String(500000 + Number(id) * 37);

/* a pass is good only while it is approved and inside its dates */
function passValid(p, tollId) {
  if (p.status !== "Approved") return "that pass is not approved";
  if (today() < p.from) return "that pass does not start until " + p.from;
  if (today() > p.to) return "that pass expired on " + p.to;
  if (tollId && String(p.tollId) !== String(tollId)) {
    return "that pass is for " + tollOf(p.tollId).name;
  }
  return "";
}

function ticketValid(t, tollId) {
  if (t.status === "Used") return "that ticket has already been used";
  if (t.validFor !== today()) return "that ticket is for " + t.validFor;
  if (tollId && String(t.tollId) !== String(tollId)) {
    return "that ticket is for " + tollOf(t.tollId).name;
  }
  return "";
}

const passTag = s => '<span class="tag ' +
  (s === "Approved" ? "ok" : s === "Pending" ? "warn" : "bad") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

/* a small block pattern drawn from the code, so a pass looks like a pass */
function codeBlock(code) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  let cells = "";
  for (let i = 0; i < 81; i++) {
    const on = ((h >>> (i % 31)) ^ (i * 2654435761)) % 3 === 0;
    cells += '<i style="width:12px;height:12px;display:block;background:' +
      (on ? "var(--accent-dark)" : "transparent") + '"></i>';
  }
  return '<div style="display:inline-block;padding:10px;background:#fff;border:1px solid var(--border);border-radius:8px">' +
    '<div style="display:grid;grid-template-columns:repeat(9,12px);gap:2px">' + cells + "</div>" +
    '<div style="font-family:ui-monospace,Consolas,monospace;font-size:.8rem;margin-top:8px;letter-spacing:.04em">' +
    esc(code) + "</div></div>";
}

const myVehicles = () => DB.all("vehicles").filter(v => v.user === SESSION.email);
const myPasses = () => DB.all("passes").filter(p => p.user === SESSION.email);
const myTickets = () => DB.all("tickets").filter(t => t.user === SESSION.email);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "wallet", label: "My Wallet", type: "custom",
    desc: "Tickets and passes are paid for out of this balance.",
    render(host) {
      host.appendChild(Dash.stats([
        { n: money(wallet(SESSION.email)), l: "Balance" },
        { n: myTickets().filter(t => t.status === "Unused").length, l: "Tickets unused" },
        { n: myPasses().filter(p => p.status === "Approved" && today() <= p.to).length, l: "Passes in force" }
      ]));

      const card = Dash.card("<h3>Add money</h3>");
      card.appendChild(Dash.form([
        { k: "amount", l: "Amount (Rs.)", t: "number", min: 50, def: 500, req: true },
        { k: "mode", l: "Pay by", t: "select", opts: ["UPI", "Debit card", "Credit card", "Net banking"] }
      ], {}, data => {
        if (Number(data.amount) < 50) { Dash.toast("The smallest top-up is Rs.50."); return; }
        moveMoney(SESSION.email, Number(data.amount), "Top-up", data.mode);
        Dash.toast(money(data.amount) + " added.");
        Dash.show(MODULES.find(m => m.id === "wallet"));
      }, null, "Add to wallet"));
      host.appendChild(card);

      const c = Dash.card("<h3>Statement</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" }, { k: "kind", l: "What" }, { k: "ref", l: "Reference" },
        { k: "amount", l: "Amount", fmt: t => (Number(t.amount) > 0 ? "+" : "") + money(t.amount) },
        { k: "balance", l: "Balance after", fmt: t => money(t.balance) }
      ], DB.all("walletTxns").filter(t => t.user === SESSION.email).slice().reverse()));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "vehicles", label: "My Vehicles", type: "custom",
    desc: "The vehicles a ticket or a pass can be issued against.",
    render(host) {
      const card = Dash.card("<h3>Add a vehicle</h3>");
      card.appendChild(Dash.form([
        { k: "regNo", l: "Registration number", req: true },
        { k: "type", l: "Class", t: "select",
          opts: [{ v: "Car", l: "Car, jeep or van" },
                 { v: "LCV", l: "Light commercial vehicle" },
                 { v: "HCV", l: "Bus or truck" }] },
        { k: "model", l: "Make and model" }
      ], {}, (data, form) => {
        const reg = data.regNo.toUpperCase().replace(/\s+/g, "");
        if (DB.all("vehicles").some(v => v.regNo === reg)) {
          Dash.toast("That registration is already on the system."); return;
        }
        DB.insert("vehicles", Object.assign({}, data, {
          regNo: reg, user: SESSION.email, addedOn: today() }));
        form.reset();
        Dash.toast("Vehicle added.");
        Dash.show(MODULES.find(m => m.id === "vehicles"));
      }, null, "Add vehicle"));
      host.appendChild(card);

      const c = Dash.card("<h3>Your vehicles</h3>");
      c.appendChild(Dash.table([
        { k: "regNo", l: "Registration" }, { k: "type", l: "Class" },
        { k: "model", l: "Model" }, { k: "addedOn", l: "Added" },
        { k: "passes", l: "Passes", fmt: v => myPasses()
            .filter(p => String(p.vehicleId) === String(v.id) && p.status === "Approved").length }
      ], myVehicles(), v => [{
        label: "Remove", cls: "danger", fn: () => {
          if (myPasses().some(p => String(p.vehicleId) === String(v.id) && p.status === "Approved" && today() <= p.to)) {
            Dash.toast("That vehicle has a pass in force."); return;
          }
          if (confirm("Remove " + v.regNo + "?")) {
            DB.remove("vehicles", v.id);
            Dash.show(MODULES.find(m => m.id === "vehicles"));
          }
        }
      }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "ticket", label: "Buy an e-Ticket", type: "custom",
    desc: "One crossing at one plaza, on the date you choose.",
    render(host) {
      const vs = myVehicles();
      const card = Dash.card("<h3>New ticket</h3>");
      if (!vs.length) {
        card.insertAdjacentHTML("beforeend", '<p class="muted">Add a vehicle first.</p>');
        host.appendChild(card);
        return;
      }
      const price = document.createElement("p");
      price.className = "note";

      card.appendChild(Dash.form([
        { k: "vehicleId", l: "Vehicle", t: "select", req: true,
          opts: vs.map(v => ({ v: v.id, l: v.regNo + " (" + v.type + ")" })) },
        { k: "tollId", l: "Plaza", t: "select", req: true,
          opts: DB.all("tolls").map(t => ({ v: t.id, l: t.name + " - " + t.highway })) },
        { k: "validFor", l: "Travelling on", t: "date", req: true, def: today() }
      ], {}, data => {
        const v = vehicleOf(data.vehicleId);
        const t = tollOf(data.tollId);
        const amount = rateFor(t, v.type);
        if (wallet(SESSION.email) < amount) {
          Dash.toast("Not enough in the wallet - top it up first."); return;
        }
        if (daysBetween(today(), data.validFor) < 0) {
          Dash.toast("Pick today or a later date."); return;
        }
        const rec = DB.insert("tickets", {
          user: SESSION.email, vehicleId: Number(data.vehicleId), tollId: Number(data.tollId),
          amount: amount, validFor: data.validFor, status: "Unused",
          boughtOn: today(), code: ""
        });
        DB.update("tickets", rec.id, { code: ticketCode(rec.id) });
        moveMoney(SESSION.email, -amount, "Toll ticket", t.name + " " + ticketCode(rec.id));
        Dash.toast("Ticket " + ticketCode(rec.id) + " issued.");
        Dash.show(MODULES.find(m => m.id === "ticket"));
      }, null, "Buy the ticket"));

      const update = () => {
        const f = card.querySelector("form");
        if (!f) return;
        const v = vehicleOf(f.querySelector('[name="vehicleId"]').value);
        const t = tollOf(f.querySelector('[name="tollId"]').value);
        price.innerHTML = "A " + esc(v.type) + " through " + esc(t.name) + " costs <b>" +
          money(rateFor(t, v.type)) + "</b>. Wallet balance " + money(wallet(SESSION.email)) + ".";
      };
      card.appendChild(price);
      card.querySelectorAll("form select, form input").forEach(el => {
        el.onchange = update; el.oninput = update;
      });
      host.appendChild(card);
      update();

      const rows = myTickets().slice().reverse();
      const c = Dash.card("<h3>Your tickets</h3>");
      c.appendChild(Dash.table([
        { k: "code", l: "Code" },
        { k: "toll", l: "Plaza", fmt: t => esc(tollOf(t.tollId).name) },
        { k: "vehicle", l: "Vehicle", fmt: t => esc(vehicleOf(t.vehicleId).regNo) },
        { k: "validFor", l: "For" },
        { k: "amount", l: "Paid", fmt: t => money(t.amount) },
        { k: "status", l: "Status", fmt: t => t.status === "Used"
            ? '<span class="tag mute">used</span>'
            : t.validFor < today() ? '<span class="tag bad">expired</span>'
            : '<span class="tag ok">ready</span>' }
      ], rows, t => t.status === "Unused" && t.validFor >= today() ? [{
        label: "Show code", cls: "flat", fn: () => showCode("Toll e-ticket", t.code, [
          ["Plaza", tollOf(t.tollId).name], ["Vehicle", vehicleOf(t.vehicleId).regNo],
          ["Valid for", t.validFor], ["Paid", "Rs." + t.amount]
        ])
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "passes", label: "Toll Passes", type: "custom",
    desc: "Apply for a pass, renew one, and show the code at the gate.",
    render(host) {
      const vs = myVehicles();
      const card = Dash.card("<h3>Apply for a pass</h3>");
      if (!vs.length) {
        card.insertAdjacentHTML("beforeend", '<p class="muted">Add a vehicle first.</p>');
      } else {
        const price = document.createElement("p");
        price.className = "note";
        card.appendChild(Dash.form([
          { k: "vehicleId", l: "Vehicle", t: "select", req: true,
            opts: vs.map(v => ({ v: v.id, l: v.regNo + " (" + v.type + ")" })) },
          { k: "tollId", l: "Plaza", t: "select", req: true,
            opts: DB.all("tolls").map(t => ({ v: t.id, l: t.name + " - " + t.highway })) },
          { k: "type", l: "Pass", t: "select", opts: PASS_TYPES.map(p => p.name) },
          { k: "from", l: "Start from", t: "date", req: true, def: today() }
        ], {}, data => {
          const v = vehicleOf(data.vehicleId);
          const t = tollOf(data.tollId);
          const pt = PASS_TYPES.find(x => x.name === data.type);
          const amount = passPrice(t, v.type, data.type);
          if (wallet(SESSION.email) < amount) {
            Dash.toast("Not enough in the wallet - top it up first."); return;
          }
          const rec = DB.insert("passes", {
            user: SESSION.email, vehicleId: Number(data.vehicleId), tollId: Number(data.tollId),
            type: data.type, from: data.from, to: addDays(data.from, pt.days),
            amount: amount, status: "Pending", appliedOn: today(), code: ""
          });
          moveMoney(SESSION.email, -amount, "Toll pass", t.name + " " + data.type);
          Dash.toast("Applied. The authority will approve it and issue the code.");
          Dash.show(MODULES.find(m => m.id === "passes"));
        }, null, "Apply and pay"));

        const update = () => {
          const f = card.querySelector("form");
          if (!f) return;
          const v = vehicleOf(f.querySelector('[name="vehicleId"]').value);
          const t = tollOf(f.querySelector('[name="tollId"]').value);
          const type = f.querySelector('[name="type"]').value;
          const pt = PASS_TYPES.find(x => x.name === type) || PASS_TYPES[0];
          price.innerHTML = esc(type) + " for a " + esc(v.type) + " at " + esc(t.name) +
            " costs <b>" + money(passPrice(t, v.type, type)) + "</b> and runs for " +
            pt.days + " day(s). Wallet balance " + money(wallet(SESSION.email)) + ".";
        };
        card.appendChild(price);
        card.querySelectorAll("form select, form input").forEach(el => {
          el.onchange = update; el.oninput = update;
        });
        update();
      }
      host.appendChild(card);

      const rows = myPasses().slice().reverse();
      const c = Dash.card("<h3>Your passes</h3>");
      c.appendChild(Dash.table([
        { k: "type", l: "Pass" },
        { k: "toll", l: "Plaza", fmt: p => esc(tollOf(p.tollId).name) },
        { k: "vehicle", l: "Vehicle", fmt: p => esc(vehicleOf(p.vehicleId).regNo) },
        { k: "period", l: "Valid", fmt: p => p.from + " to " + p.to },
        { k: "amount", l: "Paid", fmt: p => money(p.amount) },
        { k: "status", l: "Status", fmt: p => today() > p.to && p.status === "Approved"
            ? '<span class="tag mute">expired</span>' : passTag(p.status) }
      ], rows, p => {
        const acts = [];
        if (p.status === "Approved") {
          acts.push({ label: "Show code", cls: "flat", fn: () =>
            showCode("Toll pass", p.code, [
              ["Plaza", tollOf(p.tollId).name], ["Vehicle", vehicleOf(p.vehicleId).regNo],
              ["Pass", p.type], ["Valid", p.from + " to " + p.to]
            ]) });
          if (daysBetween(today(), p.to) <= 7) acts.push({
            label: "Renew", cls: "", fn: () => renew(p)
          });
        }
        return acts;
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "crossings", label: "My Crossings", type: "custom",
    desc: "Where this account's vehicles have been through.",
    render(host) {
      const mine = myVehicles().map(v => String(v.id));
      const rows = DB.all("crossings")
        .filter(c => mine.includes(String(c.vehicleId))).slice().reverse();
      const c = Dash.card("<h3>Crossing history</h3>");
      c.appendChild(Dash.table([
        { k: "at", l: "Date" }, { k: "time", l: "Time" },
        { k: "toll", l: "Plaza", fmt: x => esc(tollOf(x.tollId).name) },
        { k: "regNo", l: "Vehicle" }, { k: "kind", l: "On" }, { k: "ref", l: "Code" }
      ], rows));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "account", label: "My Account", type: "custom",
    desc: "Your details.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Account</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Account updated.");
        location.reload();
      }, null, "Save"));
      host.appendChild(card);
    }
  }
];

/* the code a driver shows at the booth */
function showCode(title, code, lines) {
  const host = document.getElementById("dash-view");
  const c = Dash.card(
    "<h3>" + esc(title) + "</h3>" +
    '<p class="muted">Show this at the gate. The operator reads the code off the screen.</p>' +
    codeBlock(code) +
    '<ul class="contact-list" style="margin-top:1rem">' + lines.map(l =>
      "<li><b>" + esc(l[0]) + "</b>" + esc(l[1]) + "</li>").join("") + "</ul>");
  host.appendChild(c);
  c.scrollIntoView({ behavior: "smooth" });
}

function renew(p) {
  const host = document.getElementById("dash-view");
  const pt = PASS_TYPES.find(x => x.name === p.type) || PASS_TYPES[0];
  const amount = passPrice(tollOf(p.tollId), vehicleOf(p.vehicleId).type, p.type);
  const card = Dash.card(
    "<h3>Renew the " + esc(p.type) + "</h3>" +
    '<p class="muted">' + esc(tollOf(p.tollId).name) + " &middot; " +
    esc(vehicleOf(p.vehicleId).regNo) + " &middot; runs out on " + esc(p.to) + "</p>" +
    '<div class="note">Another ' + pt.days + " day(s) costs " + money(amount) +
    ". Wallet balance " + money(wallet(SESSION.email)) + ".</div>");
  const b = document.createElement("button");
  b.className = "btn";
  b.style.marginTop = ".8rem";
  b.textContent = "Pay " + money(amount) + " and renew";
  b.onclick = () => {
    if (wallet(SESSION.email) < amount) { Dash.toast("Not enough in the wallet."); return; }
    const from = p.to >= today() ? p.to : today();
    DB.update("passes", p.id, { to: addDays(from, pt.days) });
    moveMoney(SESSION.email, -amount, "Pass renewal", p.code || p.type);
    Dash.toast("Renewed to " + addDays(from, pt.days) + ".");
    Dash.show(MODULES.find(m => m.id === "passes"));
  };
  card.appendChild(b);
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
