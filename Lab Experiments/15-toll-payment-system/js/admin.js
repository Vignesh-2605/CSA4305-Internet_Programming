/* ==========================================================================
   admin.js - toll authority
   Modules: overview, plazas, pass approvals, drivers and vehicles,
            gate logins, crossings.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Traffic through the gates and money through the wallets.",
    render(host) {
      const passes = DB.all("passes");
      host.appendChild(Dash.stats([
        { n: DB.all("tolls").length, l: "Plazas" },
        { n: passes.filter(p => p.status === "Pending").length, l: "Passes to approve" },
        { n: passes.filter(p => p.status === "Approved").length, l: "Passes in force" },
        { n: DB.all("crossings").filter(c => c.at === today()).length, l: "Crossings today" },
        { n: money(DB.all("walletTxns").filter(t => t.amount < 0)
            .reduce((s, t) => s - Number(t.amount), 0)), l: "Collected" }
      ]));

      const byToll = {};
      DB.all("crossings").forEach(c => {
        const n = tollOf(c.tollId).name;
        byToll[n] = (byToll[n] || 0) + 1;
      });
      const c = Dash.card("<h3>Crossings by plaza</h3>");
      c.appendChild(Dash.table(
        [{ k: "name", l: "Plaza" }, { k: "n", l: "Crossings" }],
        Object.keys(byToll).map(k => ({ name: k, n: byToll[k] })).sort((a, b) => b.n - a.n)));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "tolls", label: "Toll Plazas", type: "crud", table: "tolls",
    desc: "Where the gates are and what each class of vehicle pays.",
    addLabel: "Add a plaza",
    fields: [
      { k: "name", l: "Plaza name", req: true },
      { k: "highway", l: "Highway", req: true },
      { k: "location", l: "Location", full: true },
      { k: "carRate", l: "Car / jeep / van (Rs.)", t: "number", min: 0, req: true },
      { k: "lcvRate", l: "Light commercial (Rs.)", t: "number", min: 0, req: true },
      { k: "hcvRate", l: "Heavy vehicle (Rs.)", t: "number", min: 0, req: true }
    ],
    cols: [
      { k: "name", l: "Plaza" }, { k: "highway", l: "Highway" }, { k: "location", l: "Where" },
      { k: "carRate", l: "Car", fmt: t => money(t.carRate) },
      { k: "lcvRate", l: "LCV", fmt: t => money(t.lcvRate) },
      { k: "hcvRate", l: "HCV", fmt: t => money(t.hcvRate) }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "approvals", label: "Pass Approvals", type: "custom",
    desc: "Approve a pass and the code is generated; reject it and the money goes back.",
    render(host) {
      const waiting = DB.all("passes").filter(p => p.status === "Pending");
      const c = Dash.card("<h3>Applications</h3>");
      c.appendChild(Dash.table([
        { k: "appliedOn", l: "Applied" },
        { k: "driver", l: "Driver", fmt: p => esc(userOf(p.user).name) },
        { k: "vehicle", l: "Vehicle", fmt: p => esc(vehicleOf(p.vehicleId).regNo) +
            " (" + esc(vehicleOf(p.vehicleId).type) + ")" },
        { k: "toll", l: "Plaza", fmt: p => esc(tollOf(p.tollId).name) },
        { k: "type", l: "Pass" },
        { k: "period", l: "Valid", fmt: p => p.from + " to " + p.to },
        { k: "amount", l: "Paid", fmt: p => money(p.amount) }
      ], waiting, p => [
        { label: "Approve", cls: "", fn: () => {
            DB.update("passes", p.id, {
              status: "Approved", code: passCode(p.id), approvedOn: today() });
            Dash.toast("Approved. Code " + passCode(p.id) + " issued.");
            Dash.show(MODULES.find(m => m.id === "approvals"));
          } },
        { label: "Reject", cls: "danger", fn: () => {
            if (!confirm("Reject and refund " + money(p.amount) + "?")) return;
            DB.update("passes", p.id, { status: "Rejected" });
            moveMoney(p.user, Number(p.amount), "Refund", "Pass application rejected");
            Dash.toast("Rejected and refunded.");
            Dash.show(MODULES.find(m => m.id === "approvals"));
          } }
      ]));
      host.appendChild(c);

      const all = Dash.card("<h3>Every pass</h3>");
      all.appendChild(Dash.table([
        { k: "code", l: "Code", fmt: p => p.code ? esc(p.code) : "-" },
        { k: "driver", l: "Driver", fmt: p => esc(userOf(p.user).name) },
        { k: "vehicle", l: "Vehicle", fmt: p => esc(vehicleOf(p.vehicleId).regNo) },
        { k: "toll", l: "Plaza", fmt: p => esc(tollOf(p.tollId).name) },
        { k: "type", l: "Pass" },
        { k: "period", l: "Valid", fmt: p => p.from + " to " + p.to },
        { k: "status", l: "Status", fmt: p => passTag(p.status) }
      ], DB.all("passes")));
      host.appendChild(all);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "drivers", label: "Drivers", type: "custom",
    desc: "Accounts, wallets and the vehicles on them.",
    render(host) {
      const c = Dash.card("<h3>Drivers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "wallet", l: "Wallet", fmt: u => money(u.wallet || 0) },
        { k: "vehicles", l: "Vehicles", fmt: u => DB.all("vehicles")
            .filter(v => v.user === u.email).map(v => v.regNo).join(", ") || "-" },
        { k: "passes", l: "Passes", fmt: u => DB.all("passes")
            .filter(p => p.user === u.email && p.status === "Approved").length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);

      const v = Dash.card("<h3>Vehicles on the system</h3>");
      v.appendChild(Dash.table([
        { k: "regNo", l: "Registration" }, { k: "type", l: "Class" },
        { k: "model", l: "Model" },
        { k: "owner", l: "Owner", fmt: x => esc(userOf(x.user).name) }
      ], DB.all("vehicles")));
      host.appendChild(v);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "gates", label: "Gate Logins", type: "custom",
    desc: "Accounts for the people on the booths, and which plaza each one mans.",
    render(host) {
      const card = Dash.card("<h3>Create a gate login</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Operator name", req: true },
        { k: "email", l: "Login e-mail", req: true },
        { k: "password", l: "Password", req: true, def: "gate123" },
        { k: "tollId", l: "Plaza", t: "select", req: true,
          opts: DB.all("tolls").map(t => ({ v: t.id, l: t.name })) }
      ], {}, (data, form) => {
        if (DB.all("users").some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
          Dash.toast("That e-mail is already in use."); return;
        }
        DB.insert("users", Object.assign({}, data, {
          role: "tollgate", tollId: Number(data.tollId), joined: today()
        }));
        form.reset();
        Dash.toast("Gate login created.");
        Dash.show(MODULES.find(m => m.id === "gates"));
      }, null, "Create login"));
      host.appendChild(card);

      const c = Dash.card("<h3>Gate operators</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Operator" }, { k: "email", l: "Login" },
        { k: "toll", l: "Plaza", fmt: u => esc(tollOf(u.tollId).name) },
        { k: "joined", l: "Since" },
        { k: "scans", l: "Crossings logged", fmt: u => DB.all("crossings")
            .filter(x => x.operator === u.email).length }
      ], DB.all("users").filter(u => u.role === "tollgate"), u => [{
        label: "Remove", cls: "danger", fn: () => {
          if (confirm("Remove this gate login?")) {
            DB.remove("users", u.id);
            Dash.show(MODULES.find(m => m.id === "gates"));
          }
        }
      }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "crossings", label: "Crossings", type: "custom",
    desc: "Every vehicle that went through, and on what.",
    render(host) {
      const rows = DB.all("crossings").slice().reverse();
      const c = Dash.card("<h3>Crossing log</h3>");
      c.appendChild(Dash.table([
        { k: "at", l: "Date" }, { k: "time", l: "Time" },
        { k: "toll", l: "Plaza", fmt: x => esc(tollOf(x.tollId).name) },
        { k: "regNo", l: "Vehicle" },
        { k: "kind", l: "On" },
        { k: "ref", l: "Code" },
        { k: "operator", l: "Logged by", fmt: x => esc(userOf(x.operator).name) }
      ], rows));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
