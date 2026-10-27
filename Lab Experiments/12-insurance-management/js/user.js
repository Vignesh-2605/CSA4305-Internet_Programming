/* ==========================================================================
   user.js - policyholder's account
   Modules: compare plans, my policies, claims, alerts, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

const myPolicies = () => DB.all("policies").filter(p => p.user === SESSION.email);

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "compare", label: "Compare Plans", type: "custom",
    desc: "Put the plans of one category side by side before you buy.",
    render(host) {
      const card = Dash.card(
        "<h3>Which cover are you after?</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Category</label><select id="cat">' +
        [...new Set(DB.all("plans").map(p => p.category))]
          .map(c => "<option>" + esc(c) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Premium up to (Rs. a year)</label>' +
        '    <input type="number" id="max" placeholder="any"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const cat = card.querySelector("#cat").value;
        const max = Number(card.querySelector("#max").value) || Infinity;
        const rows = DB.all("plans")
          .filter(p => p.category === cat && Number(p.premium) <= max)
          .sort((a, b) => a.premium - b.premium);

        out.innerHTML = "";
        const c = Dash.card("<h3>" + esc(cat) + " plans</h3>");
        c.appendChild(Dash.table([
          { k: "name", l: "Plan" },
          { k: "insurer", l: "Insurer" },
          { k: "cover", l: "Cover", fmt: p => money(p.cover) },
          { k: "premium", l: "Premium", fmt: p => money(p.premium) + " / year" },
          { k: "perLakh", l: "Cost per lakh of cover",
            fmt: p => money(Math.round(Number(p.premium) / (Number(p.cover) / 100000))) },
          { k: "term", l: "Term", fmt: p => p.term + " year(s)" },
          { k: "claimRatio", l: "Settlement", fmt: p => p.claimRatio + "%" },
          { k: "features", l: "What it covers" }
        ], rows));
        out.appendChild(c);

        const mine = myPolicies().map(p => p.planId);
        const grid = document.createElement("div");
        grid.className = "grid c3";
        rows.forEach(p => {
          const t = document.createElement("article");
          t.className = "tile";
          t.innerHTML =
            '<span class="tag">' + esc(p.insurer) + "</span>" +
            '<h3 style="margin-top:.55rem">' + esc(p.name) + "</h3>" +
            '<p class="meta">' + esc(p.features) + "</p>" +
            '<div class="row"><span class="price">' + money(p.premium) +
            '<span class="meta"> / year</span></span>' +
            '<span class="meta">cover ' + money(p.cover) + "</span></div>";
          const b = document.createElement("button");
          b.className = "btn sm";
          b.style.marginTop = ".8rem";
          const held = mine.some(id => String(id) === String(p.id));
          b.textContent = held ? "You hold this" : "Apply for this plan";
          b.disabled = held;
          b.onclick = () => applyFor(p);
          t.appendChild(b);
          grid.appendChild(t);
        });
        out.appendChild(grid);
      };
      card.querySelector("#cat").onchange = paint;
      card.querySelector("#max").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "policies", label: "My Policies", type: "custom",
    desc: "What you hold, when it runs out and what is left to pay.",
    render(host) {
      const rows = myPolicies();
      const due = rows.filter(p => ["Due for renewal", "Lapsed"].includes(lifecycle(p)));
      host.appendChild(Dash.stats([
        { n: rows.filter(p => lifecycle(p) === "Active").length, l: "Running" },
        { n: due.length, l: "Need renewing" },
        { n: money(rows.filter(p => p.status !== "Cancelled")
            .reduce((s, p) => s + Number(planOf(p.planId).cover), 0)), l: "Total cover" }
      ]));

      if (due.length) host.insertAdjacentHTML("beforeend",
        '<div class="note"><b>Renewal due.</b> ' + due.map(p =>
          esc(p.policyNo) + " (" + esc(planOf(p.planId).name) + ") on " + esc(p.end)).join("; ") +
        "</div>");

      const c = Dash.card("<h3>Policies</h3>");
      c.appendChild(Dash.table([
        { k: "policyNo", l: "Policy no." },
        { k: "plan", l: "Plan", fmt: p => esc(planOf(p.planId).name) },
        { k: "cat", l: "Type", fmt: p => esc(planOf(p.planId).category) },
        { k: "cover", l: "Cover", fmt: p => money(planOf(p.planId).cover) },
        { k: "end", l: "Cover to" },
        { k: "left", l: "Days left", fmt: p => daysLeft(p) < 0 ? "expired" : daysLeft(p) },
        { k: "nominee", l: "Nominee" },
        { k: "premium", l: "Premium", fmt: p => money(p.premium) },
        { k: "state", l: "Status", fmt: p => lifeTag(p) }
      ], rows, p => p.status === "Cancelled" ? [] : [
        { label: "Pay premium", cls: "", fn: () => payPremium(p) },
        { label: "Statement", cls: "flat", fn: () => statement(p) }
      ]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "claims", label: "Claims", type: "custom",
    desc: "File a claim against a policy and watch where it has got to.",
    render(host) {
      const live = myPolicies().filter(p => lifecycle(p) === "Active" || lifecycle(p) === "Due for renewal");
      const card = Dash.card("<h3>File a claim</h3>");
      if (!live.length) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">A claim can only be filed against a policy that is in force.</p>');
      } else {
        card.appendChild(Dash.form([
          { k: "policyId", l: "Policy", t: "select", req: true,
            opts: live.map(p => ({ v: p.id, l: p.policyNo + " - " + planOf(p.planId).name })) },
          { k: "type", l: "Type of claim", t: "select",
            opts: ["Hospitalisation", "Accident", "Theft", "Damage", "Other"] },
          { k: "amount", l: "Amount claimed (Rs.)", t: "number", min: 1, req: true },
          { k: "reason", l: "What happened", t: "textarea", req: true, full: true }
        ], {}, (data, form) => {
          const cover = Number(planOf(policyOf(data.policyId).planId).cover);
          if (Number(data.amount) > cover) {
            Dash.toast("That is more than the sum assured of " + money(cover) + "."); return;
          }
          DB.insert("claims", Object.assign({}, data, {
            policyId: Number(data.policyId), user: SESSION.email,
            date: today(), status: "Submitted", remarks: ""
          }));
          form.reset();
          Dash.toast("Claim filed. You can follow it below.");
          Dash.show(MODULES.find(m => m.id === "claims"));
        }, null, "File the claim"));
      }
      host.appendChild(card);

      const c = Dash.card("<h3>Your claims</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Filed" },
        { k: "policy", l: "Policy", fmt: x => esc(policyOf(x.policyId).policyNo) },
        { k: "type", l: "Type" },
        { k: "amount", l: "Claimed", fmt: x => money(x.amount) },
        { k: "reason", l: "Reason" },
        { k: "status", l: "Status", fmt: x => claimTag(x.status) },
        { k: "remarks", l: "Remarks" }
      ], DB.all("claims").filter(x => x.user === SESSION.email)));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "alerts", label: "Alerts", type: "custom",
    desc: "Reminders and messages from your agent.",
    render(host) {
      const rows = DB.all("alerts").filter(a => a.user === SESSION.email).slice().reverse();
      const c = Dash.card("<h3>Messages</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "When" }, { k: "from", l: "From" },
        { k: "channel", l: "By" }, { k: "message", l: "Message" }
      ], rows));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Details", type: "custom",
    desc: "Your details and the agent looking after you.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const ag = userOf(me.agentEmail);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "city", l: "City" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, city: data.city, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Details saved.");
        location.reload();
      }, null, "Save details"));
      host.appendChild(card);

      if (me.agentEmail) host.appendChild(Dash.card(
        "<h3>Your agent</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Name</b>" + esc(ag.name) + "</li>" +
        "<li><b>E-mail</b>" + esc(me.agentEmail) + "</li>" +
        "<li><b>Phone</b>" + esc(ag.phone || "-") + "</li></ul>"));
    }
  }
];

/* ---- applying, paying and statements ---------------------------------- */
function applyFor(plan) {
  const host = document.getElementById("dash-view");
  const card = Dash.card(
    "<h3>Apply for " + esc(plan.name) + "</h3>" +
    '<p class="muted">' + esc(plan.insurer) + " &middot; cover " + money(plan.cover) +
    " &middot; " + money(plan.premium) + " a year for " + plan.term + " year(s)</p>");
  card.appendChild(Dash.form([
    { k: "start", l: "Cover to start on", t: "date", req: true, def: today() },
    { k: "nominee", l: "Nominee", req: true },
    { k: "mode", l: "Pay by", t: "select", opts: ["UPI", "Net banking", "Card"] }
  ], {}, data => {
    const me = DB.all("users").find(u => u.email === SESSION.email) || {};
    const rec = DB.insert("policies", {
      user: SESSION.email, planId: plan.id, agentEmail: me.agentEmail || "",
      start: data.start, end: addDays(data.start, 365 * Number(plan.term)),
      premium: Number(plan.premium), nominee: data.nominee,
      status: "Active", issuedOn: today(), policyNo: ""
    });
    DB.update("policies", rec.id, { policyNo: policyNo(rec.id) });
    DB.insert("payments", {
      policyId: rec.id, user: SESSION.email, amount: Number(plan.premium),
      date: today(), mode: data.mode, period: "First premium"
    });
    Dash.toast("Policy " + policyNo(rec.id) + " is now in force.");
    Dash.show(MODULES.find(m => m.id === "policies"));
  }, null, "Buy this cover"));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

function payPremium(p) {
  const host = document.getElementById("dash-view");
  const card = Dash.card(
    "<h3>Premium for " + esc(p.policyNo) + "</h3>" +
    '<p class="muted">' + esc(planOf(p.planId).name) + " &middot; " + money(p.premium) +
    " &middot; cover currently runs to " + esc(p.end) + "</p>");
  card.appendChild(Dash.form([
    { k: "mode", l: "Pay by", t: "select", opts: ["UPI", "Net banking", "Card"] }
  ], {}, data => {
    const newEnd = addDays(p.end >= today() ? p.end : today(), 365);
    DB.insert("payments", {
      policyId: p.id, user: SESSION.email, amount: Number(p.premium),
      date: today(), mode: data.mode, period: "Renewal to " + newEnd
    });
    DB.update("policies", p.id, { end: newEnd, status: "Active" });
    Dash.toast("Premium paid. Cover now runs to " + newEnd + ".");
    Dash.show(MODULES.find(m => m.id === "policies"));
  }, null, "Pay " + money(p.premium)));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

function statement(p) {
  const host = document.getElementById("dash-view");
  const card = Dash.card("<h3>Premiums paid on " + esc(p.policyNo) + "</h3>");
  card.appendChild(Dash.table([
    { k: "date", l: "Date" }, { k: "period", l: "For" },
    { k: "mode", l: "Paid by" },
    { k: "amount", l: "Amount", fmt: x => money(x.amount) }
  ], DB.all("payments").filter(x => String(x.policyId) === String(p.id))));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
