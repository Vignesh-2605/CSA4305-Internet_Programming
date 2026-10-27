/* ==========================================================================
   agent.js - agent's console
   Modules: my customers, issue a policy, my policies, send an alert, earnings.
   An agent can do none of this until head office approves the login.
   ========================================================================== */

const SESSION = Auth.require("agent");
initShell(SESSION);

/* ---- policy rules shared by all three consoles ------------------------ */
const RENEWAL_WINDOW = 30;      // a policy counts as due this many days out
const COMMISSION_PCT = 10;      // what an agent earns on a premium

const planOf = id => DB.get("plans", id) ||
  { name: "(withdrawn)", category: "-", insurer: "-", cover: 0, premium: 0, term: 1 };
const policyOf = id => DB.get("policies", id) ||
  { policyNo: "-", planId: 0, user: "-", premium: 0 };
const userOf = email => DB.all("users").find(u => u.email === email) || { name: email };

const policyNo = id => "POL" + String(100000 + Number(id) * 37);

/* days until the cover runs out - negative once it has */
const daysLeft = p => daysBetween(today(), p.end);

function lifecycle(p) {
  if (p.status === "Cancelled") return "Cancelled";
  if (daysLeft(p) < 0) return "Lapsed";
  if (daysLeft(p) <= RENEWAL_WINDOW) return "Due for renewal";
  return "Active";
}

const lifeTag = p => {
  const s = lifecycle(p);
  return '<span class="tag ' +
    (s === "Active" ? "ok" : s === "Due for renewal" ? "warn" : "bad") + '">' +
    esc(s.toLowerCase()) + "</span>";
};

const claimTag = s => '<span class="tag ' +
  (s === "Settled" || s === "Approved" ? "ok" : s === "Rejected" ? "bad" : "warn") +
  '">' + esc(String(s).toLowerCase()) + "</span>";

/* premiums already collected against a policy */
const paidOn = policyId => DB.all("payments")
  .filter(x => String(x.policyId) === String(policyId))
  .reduce((s, x) => s + Number(x.amount), 0);

const me = () => DB.all("users").find(u => u.email === SESSION.email) || {};
const myCustomers = () => DB.all("users")
  .filter(u => u.role === "user" && u.agentEmail === SESSION.email);
const myPolicies = () => DB.all("policies").filter(p => p.agentEmail === SESSION.email);

/* an unapproved agent sees a notice instead of the console */
if (!me().approved) {
  document.getElementById("dash-nav").innerHTML = "";
  document.getElementById("dash-view").innerHTML =
    '<div class="view-head"><h2>Waiting for approval</h2></div>' +
    '<div class="card"><p>Your agent login has been registered but head office has not ' +
    "approved it yet. You will be able to create customers and issue policies as soon as " +
    "it is cleared.</p><p class='muted'>Applied on " + esc(me().joined || "-") + ".</p></div>";
} else {

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "customers", label: "My Customers", type: "custom",
    desc: "Open an account for a customer, then issue policies against it.",
    render(host) {
      const card = Dash.card("<h3>Create a customer</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", req: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "password", l: "Temporary password", req: true, def: "welcome1" },
        { k: "city", l: "City" }
      ], {}, (data, form) => {
        if (DB.all("users").some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
          Dash.toast("Somebody already uses that e-mail."); return;
        }
        DB.insert("users", Object.assign({}, data, {
          role: "user", agentEmail: SESSION.email, joined: today()
        }));
        form.reset();
        Dash.toast("Customer created. They can sign in with that password.");
        Dash.show(MODULES.find(m => m.id === "customers"));
      }, null, "Create customer"));
      host.appendChild(card);

      const c = Dash.card("<h3>Your customers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "city", l: "City" }, { k: "joined", l: "Since" },
        { k: "pols", l: "Policies", fmt: u => myPolicies()
            .filter(p => p.user === u.email && p.status !== "Cancelled").length }
      ], myCustomers()));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "issue", label: "Issue a Policy", type: "custom",
    desc: "Put one of your customers on a plan.",
    render(host) {
      const cust = myCustomers();
      const card = Dash.card("<h3>New policy</h3>");
      if (!cust.length) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">Create a customer first.</p>');
        host.appendChild(card);
        return;
      }
      card.appendChild(Dash.form([
        { k: "user", l: "Customer", t: "select", req: true,
          opts: cust.map(u => ({ v: u.email, l: u.name + " - " + u.email })) },
        { k: "planId", l: "Plan", t: "select", req: true,
          opts: DB.all("plans").map(p => ({
            v: p.id, l: p.name + " (" + p.category + ", cover " + money(p.cover) +
                       ", " + money(p.premium) + "/yr)" })) },
        { k: "start", l: "Cover starts", t: "date", req: true, def: today() },
        { k: "nominee", l: "Nominee", req: true },
        { k: "mode", l: "Premium paid by", t: "select",
          opts: ["UPI", "Cheque", "Net banking", "Card"] }
      ], {}, data => {
        const plan = planOf(data.planId);
        const rec = DB.insert("policies", {
          user: data.user, planId: Number(data.planId), agentEmail: SESSION.email,
          start: data.start, end: addDays(data.start, 365 * Number(plan.term)),
          premium: Number(plan.premium), nominee: data.nominee,
          status: "Active", issuedOn: today(), policyNo: ""
        });
        DB.update("policies", rec.id, { policyNo: policyNo(rec.id) });
        DB.insert("payments", {
          policyId: rec.id, user: data.user, amount: Number(plan.premium),
          date: today(), mode: data.mode, period: "First premium"
        });
        DB.insert("alerts", {
          user: data.user, from: SESSION.name, channel: "SMS", date: today(),
          message: "Policy " + policyNo(rec.id) + " issued on " + plan.name +
                   ". Cover runs to " + addDays(data.start, 365 * Number(plan.term)) + "."
        });
        Dash.toast("Policy " + policyNo(rec.id) + " issued and the customer alerted.");
        Dash.show(MODULES.find(m => m.id === "policies"));
      }, null, "Issue policy"));
      host.appendChild(card);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "policies", label: "My Policies", type: "custom",
    desc: "Everything you have written, and what needs chasing.",
    render(host) {
      const rows = myPolicies();
      const due = rows.filter(p => lifecycle(p) === "Due for renewal" || lifecycle(p) === "Lapsed");
      host.appendChild(Dash.stats([
        { n: rows.filter(p => lifecycle(p) === "Active").length, l: "Running" },
        { n: due.length, l: "Need chasing" },
        { n: money(Math.round(rows.filter(p => p.status !== "Cancelled")
            .reduce((s, p) => s + Number(p.premium), 0) * COMMISSION_PCT / 100)), l: "Your commission" }
      ]));

      const c = Dash.card("<h3>Policies you wrote</h3>");
      c.appendChild(Dash.table([
        { k: "policyNo", l: "Policy no." },
        { k: "holder", l: "Holder", fmt: p => esc(userOf(p.user).name) },
        { k: "plan", l: "Plan", fmt: p => esc(planOf(p.planId).name) },
        { k: "end", l: "Cover to" },
        { k: "left", l: "Days left", fmt: p => daysLeft(p) < 0
            ? '<span class="tag bad">expired</span>' : daysLeft(p) },
        { k: "premium", l: "Premium", fmt: p => money(p.premium) },
        { k: "state", l: "Status", fmt: p => lifeTag(p) }
      ], rows, p => p.status === "Cancelled" ? [] : [
        { label: "Change nominee", cls: "flat", fn: () => {
            const host2 = document.getElementById("dash-view");
            const card = Dash.card("<h3>Policy " + esc(p.policyNo) + "</h3>");
            card.appendChild(Dash.form([
              { k: "nominee", l: "Nominee", req: true }
            ], p, data => {
              DB.update("policies", p.id, { nominee: data.nominee });
              Dash.toast("Policy updated.");
              Dash.show(MODULES.find(m => m.id === "policies"));
            }, null, "Save"));
            host2.appendChild(card);
            card.scrollIntoView({ behavior: "smooth" });
          } },
        { label: "Remind", cls: "flat", fn: () => {
            DB.insert("alerts", {
              user: p.user, from: SESSION.name, channel: "SMS", date: today(),
              message: "Policy " + p.policyNo + " is due for renewal on " + p.end +
                       ". Premium " + money(p.premium) + "."
            });
            Dash.toast("Reminder sent to " + userOf(p.user).name + ".");
          } }
      ]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "alerts", label: "Send an Alert", type: "custom",
    desc: "A message to one of your customers, by SMS or e-mail.",
    render(host) {
      const cust = myCustomers();
      const card = Dash.card("<h3>New alert</h3>");
      card.appendChild(Dash.form([
        { k: "user", l: "Customer", t: "select", req: true,
          opts: cust.map(u => ({ v: u.email, l: u.name })) },
        { k: "channel", l: "Send by", t: "select", opts: ["SMS", "E-mail", "Both"] },
        { k: "message", l: "Message", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("alerts", Object.assign({}, data, {
          from: SESSION.name, date: today()
        }));
        form.reset();
        Dash.toast("Alert sent.");
        Dash.show(MODULES.find(m => m.id === "alerts"));
      }, null, "Send alert"));
      host.appendChild(card);

      const sent = DB.all("alerts").filter(a => a.from === SESSION.name);
      const c = Dash.card("<h3>Alerts you sent</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Sent" },
        { k: "to", l: "To", fmt: a => esc(userOf(a.user).name) },
        { k: "channel", l: "By" },
        { k: "message", l: "Message" }
      ], sent));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "earnings", label: "My Earnings", type: "custom",
    desc: "Commission at " + COMMISSION_PCT + "% of the premium on every policy you wrote.",
    render(host) {
      const rows = myPolicies().filter(p => p.status !== "Cancelled").map(p => ({
        policyNo: p.policyNo, plan: planOf(p.planId).name,
        holder: userOf(p.user).name, premium: Number(p.premium),
        commission: Math.round(Number(p.premium) * COMMISSION_PCT / 100)
      }));
      const c = Dash.card("<h3>Commission statement</h3>");
      c.appendChild(Dash.table([
        { k: "policyNo", l: "Policy" }, { k: "holder", l: "Holder" }, { k: "plan", l: "Plan" },
        { k: "premium", l: "Premium", fmt: r => money(r.premium) },
        { k: "commission", l: "Commission", fmt: r => money(r.commission) }
      ], rows));
      host.appendChild(c);
      host.appendChild(Dash.stats([
        { n: money(rows.reduce((s, r) => s + r.commission, 0)), l: "Total commission" }
      ]));
    }
  }
];

Dash.mount(MODULES);
}
