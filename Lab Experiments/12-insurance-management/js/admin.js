/* ==========================================================================
   admin.js - head office
   Modules: overview, agent approvals, agents, plans, policies, claims.
   ========================================================================== */

const SESSION = Auth.require("admin");
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

const agents = () => DB.all("users").filter(u => u.role === "agent");

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "The book of business at a glance.",
    render(host) {
      const pols = DB.all("policies");
      host.appendChild(Dash.stats([
        { n: pols.filter(p => lifecycle(p) === "Active").length, l: "Active policies" },
        { n: pols.filter(p => lifecycle(p) === "Due for renewal").length, l: "Due for renewal" },
        { n: agents().filter(a => !a.approved).length, l: "Agents awaiting approval" },
        { n: DB.all("claims").filter(c => c.status === "Submitted").length, l: "Claims to review" },
        { n: money(DB.all("payments").reduce((s, p) => s + Number(p.amount), 0)), l: "Premium collected" }
      ]));

      const byCat = {};
      pols.filter(p => p.status !== "Cancelled").forEach(p => {
        const c = planOf(p.planId).category;
        byCat[c] = byCat[c] || { n: 0, premium: 0 };
        byCat[c].n++; byCat[c].premium += Number(p.premium);
      });
      const c = Dash.card("<h3>By line of business</h3>");
      c.appendChild(Dash.table([
        { k: "cat", l: "Category" },
        { k: "n", l: "Policies" },
        { k: "premium", l: "Annual premium", fmt: r => money(r.premium) }
      ], Object.keys(byCat).map(k => Object.assign({ cat: k }, byCat[k]))));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "approvals", label: "Agent Approvals", type: "custom",
    desc: "An agent cannot work on the portal until head office approves the login.",
    render(host) {
      const waiting = agents().filter(a => !a.approved);
      const c = Dash.card("<h3>Waiting for approval</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" },
        { k: "phone", l: "Phone" }, { k: "licence", l: "Licence no." },
        { k: "joined", l: "Applied on" }
      ], waiting, a => [
        { label: "Approve", cls: "", fn: () => {
            DB.update("users", a.id, { approved: true, approvedOn: today() });
            Dash.toast(a.name + " can now sign in as an agent.");
            Dash.show(MODULES.find(m => m.id === "approvals"));
          } },
        { label: "Reject", cls: "danger", fn: () => {
            if (confirm("Remove this agent application?")) {
              DB.remove("users", a.id);
              Dash.show(MODULES.find(m => m.id === "approvals"));
            }
          } }
      ]));
      host.appendChild(c);
      if (!waiting.length) host.insertAdjacentHTML("beforeend",
        '<div class="note">No applications are pending. New agents appear here as soon as ' +
        "they register.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "agents", label: "Agents", type: "custom",
    desc: "Everyone selling for us, and what they have written.",
    render(host) {
      const c = Dash.card("<h3>Agents</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Agent" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "licence", l: "Licence" },
        { k: "approved", l: "Login", fmt: a => a.approved
            ? '<span class="tag ok">approved</span>' : '<span class="tag warn">pending</span>' },
        { k: "customers", l: "Customers", fmt: a => DB.all("users")
            .filter(u => u.role === "user" && u.agentEmail === a.email).length },
        { k: "policies", l: "Policies", fmt: a => DB.all("policies")
            .filter(p => p.agentEmail === a.email && p.status !== "Cancelled").length },
        { k: "commission", l: "Commission", fmt: a => money(Math.round(
            DB.all("policies").filter(p => p.agentEmail === a.email && p.status !== "Cancelled")
              .reduce((s, p) => s + Number(p.premium), 0) * COMMISSION_PCT / 100)) }
      ], agents(), a => a.approved ? [{
        label: "Suspend login", cls: "danger", fn: () => {
          DB.update("users", a.id, { approved: false });
          Dash.toast("Login suspended.");
          Dash.show(MODULES.find(m => m.id === "agents"));
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "plans", label: "Plans", type: "crud", table: "plans",
    desc: "The products customers can compare and buy.",
    addLabel: "Add a plan",
    fields: [
      { k: "name", l: "Plan name", req: true },
      { k: "category", l: "Category", t: "select", opts: ["Health", "Auto", "Home", "Life", "Travel"] },
      { k: "insurer", l: "Insurer", req: true },
      { k: "cover", l: "Sum assured (Rs.)", t: "number", min: 0, req: true },
      { k: "premium", l: "Annual premium (Rs.)", t: "number", min: 0, req: true },
      { k: "term", l: "Term (years)", t: "number", min: 1, def: 1 },
      { k: "claimRatio", l: "Claim settlement ratio (%)", t: "number", min: 0, def: 95 },
      { k: "features", l: "What it covers", t: "textarea", full: true }
    ],
    cols: [
      { k: "name", l: "Plan" }, { k: "category", l: "Category" }, { k: "insurer", l: "Insurer" },
      { k: "cover", l: "Cover", fmt: p => money(p.cover) },
      { k: "premium", l: "Premium", fmt: p => money(p.premium) + " / year" },
      { k: "term", l: "Term" },
      { k: "claimRatio", l: "Settlement", fmt: p => p.claimRatio + "%" },
      { k: "sold", l: "Sold", fmt: p => DB.all("policies")
          .filter(x => String(x.planId) === String(p.id)).length }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "policies", label: "All Policies", type: "custom",
    desc: "Every policy on the books, whoever wrote it.",
    render(host) {
      const c = Dash.card("<h3>Policy register</h3>");
      c.appendChild(Dash.table([
        { k: "policyNo", l: "Policy no." },
        { k: "holder", l: "Holder", fmt: p => esc(userOf(p.user).name) },
        { k: "plan", l: "Plan", fmt: p => esc(planOf(p.planId).name) },
        { k: "agent", l: "Agent", fmt: p => esc(userOf(p.agentEmail).name) },
        { k: "start", l: "From" }, { k: "end", l: "To" },
        { k: "premium", l: "Premium", fmt: p => money(p.premium) },
        { k: "paid", l: "Collected", fmt: p => money(paidOn(p.id)) },
        { k: "state", l: "Status", fmt: p => lifeTag(p) }
      ], DB.all("policies"), p => p.status === "Cancelled" ? [] : [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel policy " + p.policyNo + "?")) {
            DB.update("policies", p.id, { status: "Cancelled" });
            Dash.toast("Policy cancelled.");
            Dash.show(MODULES.find(m => m.id === "policies"));
          }
        }
      }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "claims", label: "Claims", type: "custom",
    desc: "Claims filed by policyholders.",
    render(host) {
      const c = Dash.card("<h3>Claims</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Filed" },
        { k: "policy", l: "Policy", fmt: x => esc(policyOf(x.policyId).policyNo) },
        { k: "holder", l: "Holder", fmt: x => esc(userOf(x.user).name) },
        { k: "type", l: "Type" },
        { k: "amount", l: "Claimed", fmt: x => money(x.amount) },
        { k: "cover", l: "Cover", fmt: x => money(planOf(policyOf(x.policyId).planId).cover) },
        { k: "reason", l: "Reason" },
        { k: "status", l: "Status", fmt: x => claimTag(x.status) }
      ], DB.all("claims"), x => {
        if (x.status === "Submitted") return [
          { label: "Start review", cls: "flat", fn: () => {
              DB.update("claims", x.id, { status: "Under review" });
              Dash.show(MODULES.find(m => m.id === "claims"));
            } }
        ];
        if (x.status === "Under review") return [
          { label: "Approve", cls: "", fn: () => {
              DB.update("claims", x.id, { status: "Approved", remarks: "Approved by head office" });
              Dash.toast("Claim approved.");
              Dash.show(MODULES.find(m => m.id === "claims"));
            } },
          { label: "Reject", cls: "danger", fn: () => {
              DB.update("claims", x.id, { status: "Rejected", remarks: "Did not meet the policy terms" });
              Dash.show(MODULES.find(m => m.id === "claims"));
            } }
        ];
        if (x.status === "Approved") return [
          { label: "Mark settled", cls: "", fn: () => {
              DB.update("claims", x.id, { status: "Settled", settledOn: today() });
              Dash.toast("Settlement recorded.");
              Dash.show(MODULES.find(m => m.id === "claims"));
            } }
        ];
        return [];
      }));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
