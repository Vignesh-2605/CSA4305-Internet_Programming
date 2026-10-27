/* ==========================================================================
   gate.js - the booth
   Modules: verify a code, today's crossings, which plaza this booth is.
   ========================================================================== */

const SESSION = Auth.require("tollgate");
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

const me = () => DB.all("users").find(u => u.email === SESSION.email) || {};
const myToll = () => tollOf(me().tollId);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "verify", label: "Verify a Code", type: "custom",
    desc: "Read the code off the driver's screen and let them through.",
    render(host) {
      const t = myToll();
      const card = Dash.card(
        "<h3>" + esc(t.name) + "</h3>" +
        '<p class="muted">' + esc(t.highway) + " &middot; car " + money(t.carRate) +
        " &middot; LCV " + money(t.lcvRate) + " &middot; HCV " + money(t.hcvRate) + "</p>" +
        '<div class="form-row"><div class="field"><label>Pass or ticket code</label>' +
        '<input id="code" placeholder="EZT-..." autocomplete="off"></div></div>' +
        '<button class="btn" id="go">Verify</button>');
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const show = (ok, title, lines) => {
        out.innerHTML = "";
        const c = Dash.card(
          "<h3>" + (ok ? '<span class="tag ok">allow</span>' : '<span class="tag bad">stop</span>') +
          " " + esc(title) + "</h3>" +
          '<ul class="contact-list">' + lines.map(l =>
            "<li><b>" + esc(l[0]) + "</b>" + esc(l[1]) + "</li>").join("") + "</ul>");
        out.appendChild(c);
      };

      const verify = () => {
        const code = card.querySelector("#code").value.trim().toUpperCase();
        if (!code) { Dash.toast("Type or scan a code first."); return; }

        const pass = DB.all("passes").find(p => (p.code || "").toUpperCase() === code);
        if (pass) {
          const why = passValid(pass, me().tollId);
          if (why) { show(false, "Pass not valid", [["Reason", why],
            ["Vehicle", vehicleOf(pass.vehicleId).regNo], ["Pass", pass.type]]); return; }
          DB.insert("crossings", {
            tollId: me().tollId, vehicleId: pass.vehicleId,
            regNo: vehicleOf(pass.vehicleId).regNo, kind: "Pass", ref: code,
            at: today(), time: new Date().toTimeString().slice(0, 5), operator: SESSION.email
          });
          show(true, "Pass accepted", [
            ["Vehicle", vehicleOf(pass.vehicleId).regNo + " (" + vehicleOf(pass.vehicleId).type + ")"],
            ["Driver", userOf(pass.user).name],
            ["Pass", pass.type], ["Valid to", pass.to]
          ]);
          Dash.toast("Logged. Let them through.");
          card.querySelector("#code").value = "";
          return;
        }

        const ticket = DB.all("tickets").find(t2 => (t2.code || "").toUpperCase() === code);
        if (ticket) {
          const why = ticketValid(ticket, me().tollId);
          if (why) { show(false, "Ticket not valid", [["Reason", why],
            ["Vehicle", vehicleOf(ticket.vehicleId).regNo]]); return; }
          DB.update("tickets", ticket.id, { status: "Used", usedOn: today() });
          DB.insert("crossings", {
            tollId: me().tollId, vehicleId: ticket.vehicleId,
            regNo: vehicleOf(ticket.vehicleId).regNo, kind: "Ticket", ref: code,
            at: today(), time: new Date().toTimeString().slice(0, 5), operator: SESSION.email
          });
          show(true, "Ticket accepted", [
            ["Vehicle", vehicleOf(ticket.vehicleId).regNo + " (" + vehicleOf(ticket.vehicleId).type + ")"],
            ["Driver", userOf(ticket.user).name],
            ["Paid", "Rs." + ticket.amount], ["Ticket", "now marked used"]
          ]);
          Dash.toast("Logged and the ticket is used up.");
          card.querySelector("#code").value = "";
          return;
        }

        show(false, "No such code", [["Code", code],
          ["What to do", "Take the cash fare and issue a paper receipt"]]);
      };

      card.querySelector("#go").onclick = verify;
      card.querySelector("#code").onkeydown = e => { if (e.key === "Enter") verify(); };
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "today", label: "Today's Crossings", type: "custom",
    desc: "What has gone through this booth today.",
    render(host) {
      const rows = DB.all("crossings")
        .filter(c => c.at === today() && String(c.tollId) === String(me().tollId))
        .slice().reverse();
      host.appendChild(Dash.stats([
        { n: rows.length, l: "Through today" },
        { n: rows.filter(r => r.kind === "Pass").length, l: "On a pass" },
        { n: rows.filter(r => r.kind === "Ticket").length, l: "On a ticket" }
      ]));
      const c = Dash.card("<h3>Log</h3>");
      c.appendChild(Dash.table([
        { k: "time", l: "Time" }, { k: "regNo", l: "Vehicle" },
        { k: "kind", l: "On" }, { k: "ref", l: "Code" }
      ], rows));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "where", label: "This Booth", type: "custom",
    desc: "Which plaza you are posted at - change it if you move.",
    render(host) {
      const card = Dash.card("<h3>Posting</h3>");
      card.appendChild(Dash.form([
        { k: "tollId", l: "Plaza", t: "select",
          opts: DB.all("tolls").map(t => ({ v: t.id, l: t.name + " - " + t.highway })) }
      ], me(), data => {
        DB.update("users", me().id, { tollId: Number(data.tollId) });
        Dash.toast("Now posted at " + tollOf(data.tollId).name + ".");
        Dash.show(MODULES.find(m => m.id === "where"));
      }, null, "Update posting"));
      host.appendChild(card);

      const t = myToll();
      host.appendChild(Dash.card(
        "<h3>" + esc(t.name) + "</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Highway</b>" + esc(t.highway) + "</li>" +
        "<li><b>Location</b>" + esc(t.location) + "</li>" +
        "<li><b>Car / jeep / van</b>" + money(t.carRate) + "</li>" +
        "<li><b>Light commercial</b>" + money(t.lcvRate) + "</li>" +
        "<li><b>Heavy vehicle</b>" + money(t.hcvRate) + "</li></ul>"));
    }
  }
];

Dash.mount(MODULES);
