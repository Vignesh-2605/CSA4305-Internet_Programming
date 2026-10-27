/* ==========================================================================
   admin.js - agency desk
   Modules: overview, listings, agents, viewings, enquiries, interest log, buyers.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- rules shared by both consoles ------------------------------------ */
const VIEW_CUTOFF_HOURS = 12;    // a viewing can be changed until this close

const agentOf = id => DB.get("agents", id) ||
  { name: "(removed)", company: "-", phone: "-", email: "-" };
const propertyOf = id => DB.get("properties", id) ||
  { title: "(removed)", price: 0, city: "-", locality: "-", areaSqft: 1 };

const inr = n => {
  n = Number(n || 0);
  if (n >= 10000000) return "Rs." + (n / 10000000).toFixed(2).replace(/\.00$/, "") + " cr";
  if (n >= 100000) return "Rs." + (n / 100000).toFixed(2).replace(/\.00$/, "") + " lakh";
  return money(n);
};

const perSqft = p => Math.round(Number(p.price) / Math.max(1, Number(p.areaSqft)));

const avgRate = rows => Math.round(rows.reduce((s, p) => s + perSqft(p), 0) / rows.length);

/* What is the going rate to compare this listing against? Only listings of
   the same purpose count - a rent per square foot means nothing beside a
   sale price. If the locality has nothing else, fall back to the city. */
function rateBasis(p) {
  const same = x => String(x.id) !== String(p.id) && x.purpose === p.purpose;
  const local = DB.all("properties").filter(x => same(x) && x.locality === p.locality);
  if (local.length) return { label: esc(p.locality), rate: avgRate(local), n: local.length };
  const city = DB.all("properties").filter(x => same(x) && x.city === p.city);
  if (city.length) return { label: esc(p.city), rate: avgRate(city), n: city.length };
  return null;
}

/* monthly instalment on a home loan - the standard EMI formula */
function emi(principal, annualRate, years) {
  const r = Number(annualRate) / 1200;
  const n = Number(years) * 12;
  if (!principal || !r || !n) return 0;
  return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}

/* does a property answer a saved search? */
function matches(p, c) {
  return (!c.purpose || p.purpose === c.purpose) &&
         (!c.type || p.type === c.type) &&
         (!c.city || p.city === c.city) &&
         (!c.maxPrice || Number(p.price) <= Number(c.maxPrice)) &&
         (!c.minBeds || Number(p.bedrooms) >= Number(c.minBeds)) &&
         p.status === "Available";
}

const mapLink = p =>
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(p.locality + ", " + p.city);

const statusTag = s => '<span class="tag ' +
  (s === "Available" ? "ok" : s === "Under offer" ? "warn" : "mute") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

const viewTag = s => '<span class="tag ' +
  (s === "Confirmed" ? "ok" : s === "Completed" ? "mute" : s === "Cancelled" ? "bad" : "warn") +
  '">' + esc(String(s).toLowerCase()) + "</span>";

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Stock on the books and what buyers are asking for.",
    render(host) {
      const props = DB.all("properties");
      const views = DB.all("viewings");
      host.appendChild(Dash.stats([
        { n: props.filter(p => p.status === "Available").length, l: "Available" },
        { n: props.filter(p => p.status === "Under offer").length, l: "Under offer" },
        { n: views.filter(v => v.status === "Requested").length, l: "Viewings to confirm" },
        { n: DB.all("enquiries").filter(e => !e.reply).length, l: "Enquiries unanswered" }
      ]));

      const by = {};
      props.forEach(p => {
        const key = p.locality + " | " + p.purpose;
        by[key] = by[key] || { locality: p.locality, purpose: p.purpose, n: 0, sum: 0 };
        by[key].n++;
        by[key].sum += perSqft(p);
      });
      const c = Dash.card("<h3>The market, locality by locality</h3>");
      c.appendChild(Dash.table([
        { k: "locality", l: "Locality" },
        { k: "purpose", l: "For" },
        { k: "n", l: "On the books" },
        { k: "rate", l: "Average rate", fmt: r => money(Math.round(r.sum / r.n)) + " / sq ft" }
      ], Object.values(by)));
      host.appendChild(c);

      const hot = Dash.card("<h3>Most looked at</h3>");
      const views_ = {};
      DB.all("visits").forEach(v => { views_[v.propertyId] = (views_[v.propertyId] || 0) + 1; });
      hot.appendChild(Dash.table([
        { k: "title", l: "Property", fmt: r => esc(propertyOf(r.id).title) },
        { k: "n", l: "Times opened" },
        { k: "shortlist", l: "Shortlisted by", fmt: r => DB.all("favourites")
            .filter(f => String(f.propertyId) === String(r.id)).length }
      ], Object.keys(views_).map(k => ({ id: k, n: views_[k] })).sort((a, b) => b.n - a.n)));
      host.appendChild(hot);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "properties", label: "Listings", type: "crud", table: "properties",
    desc: "Everything on the books, to buy or to rent.",
    addLabel: "Add a listing",
    fields: [
      { k: "title", l: "Headline", req: true, full: true },
      { k: "purpose", l: "For", t: "select", opts: ["Buy", "Rent"] },
      { k: "type", l: "Type", t: "select",
        opts: ["Apartment", "Independent house", "Villa", "Plot", "Commercial"] },
      { k: "city", l: "City", req: true },
      { k: "locality", l: "Locality", req: true },
      { k: "price", l: "Price (Rs.)", t: "number", min: 0, req: true },
      { k: "bedrooms", l: "Bedrooms", t: "number", min: 0, def: 2 },
      { k: "bathrooms", l: "Bathrooms", t: "number", min: 0, def: 2 },
      { k: "areaSqft", l: "Built-up area (sq ft)", t: "number", min: 1, req: true },
      { k: "furnishing", l: "Furnishing", t: "select",
        opts: ["Unfurnished", "Semi furnished", "Fully furnished"] },
      { k: "agentId", l: "Handled by", t: "select",
        opts: DB.all("agents").map(a => ({ v: a.id, l: a.name + " - " + a.company })) },
      { k: "status", l: "Status", t: "select", opts: ["Available", "Under offer", "Sold"] },
      { k: "amenities", l: "Amenities", full: true },
      { k: "tour", l: "Virtual tour reference" },
      { k: "description", l: "Description", t: "textarea", full: true }
    ],
    cols: [
      { k: "title", l: "Property" },
      { k: "purpose", l: "For" },
      { k: "type", l: "Type" },
      { k: "where", l: "Where", fmt: p => esc(p.locality + ", " + p.city) },
      { k: "price", l: "Price", fmt: p => inr(p.price) },
      { k: "areaSqft", l: "Sq ft" },
      { k: "rate", l: "Rate", fmt: p => money(perSqft(p)) + " / sq ft" },
      { k: "agent", l: "Agent", fmt: p => esc(agentOf(p.agentId).name) },
      { k: "status", l: "Status", fmt: p => statusTag(p.status) }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "agents", label: "Agents", type: "crud", table: "agents",
    desc: "The agents and companies buyers can search through.",
    addLabel: "Add an agent",
    fields: [
      { k: "name", l: "Name", req: true },
      { k: "company", l: "Company", req: true },
      { k: "phone", l: "Phone", req: true },
      { k: "email", l: "E-mail", req: true },
      { k: "areas", l: "Areas covered", full: true },
      { k: "since", l: "With us since" }
    ],
    cols: [
      { k: "name", l: "Agent" }, { k: "company", l: "Company" },
      { k: "phone", l: "Phone" }, { k: "areas", l: "Areas" },
      { k: "listings", l: "Listings", fmt: a => DB.all("properties")
          .filter(p => String(p.agentId) === String(a.id)).length }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "viewings", label: "Viewings", type: "custom",
    desc: "Appointments buyers have asked for.",
    render(host) {
      const c = Dash.card("<h3>Viewing diary</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "time", l: "Time" },
        { k: "property", l: "Property", fmt: v => esc(propertyOf(v.propertyId).title) },
        { k: "where", l: "Where", fmt: v => esc(propertyOf(v.propertyId).locality) },
        { k: "name", l: "Buyer" },
        { k: "phone", l: "Phone" },
        { k: "agent", l: "Agent", fmt: v => esc(agentOf(propertyOf(v.propertyId).agentId).name) },
        { k: "status", l: "Status", fmt: v => viewTag(v.status) }
      ], DB.all("viewings"), v => {
        const acts = [];
        if (v.status === "Requested") acts.push({
          label: "Confirm", cls: "", fn: () => {
            DB.update("viewings", v.id, { status: "Confirmed" });
            Dash.toast("Confirmed; the buyer has been told.");
            Dash.show(MODULES.find(m => m.id === "viewings"));
          }
        });
        if (v.status === "Confirmed") acts.push({
          label: "Mark done", cls: "", fn: () => {
            DB.update("viewings", v.id, { status: "Completed" });
            Dash.show(MODULES.find(m => m.id === "viewings"));
          }
        });
        if (v.status !== "Cancelled" && v.status !== "Completed") acts.push({
          label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this viewing?")) {
              DB.update("viewings", v.id, { status: "Cancelled" });
              Dash.show(MODULES.find(m => m.id === "viewings"));
            }
          }
        });
        return acts;
      }));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "enquiries", label: "Enquiries", type: "custom",
    desc: "Messages buyers sent to an agent.",
    render(host) {
      const c = Dash.card("<h3>Messages</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Sent" },
        { k: "name", l: "From" },
        { k: "property", l: "About", fmt: e => esc(propertyOf(e.propertyId).title) },
        { k: "agent", l: "To", fmt: e => esc(agentOf(e.agentId).name) },
        { k: "message", l: "Message" },
        { k: "reply", l: "Reply", fmt: e => e.reply
            ? esc(e.reply) : '<span class="tag warn">waiting</span>' }
      ], DB.all("enquiries"), e => e.reply ? [] : [{
        label: "Reply", cls: "", fn: () => {
          const host2 = document.getElementById("dash-view");
          const card = Dash.card("<h3>Reply to " + esc(e.name) + "</h3>");
          card.appendChild(Dash.form([
            { k: "reply", l: "Your reply", t: "textarea", req: true, full: true }
          ], {}, data => {
            DB.update("enquiries", e.id, { reply: data.reply, repliedOn: today() });
            Dash.toast("Reply sent.");
            Dash.show(MODULES.find(m => m.id === "enquiries"));
          }, null, "Send reply"));
          host2.appendChild(card);
          card.scrollIntoView({ behavior: "smooth" });
        }
      }]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "visits", label: "Visitor Log", type: "custom",
    desc: "Which buyer opened which property, and when.",
    render(host) {
      const rows = DB.all("visits").slice().reverse();
      const c = Dash.card("<h3>Property views</h3>");
      c.appendChild(Dash.table([
        { k: "at", l: "When" },
        { k: "name", l: "Buyer" },
        { k: "property", l: "Property", fmt: v => esc(propertyOf(v.propertyId).title) },
        { k: "where", l: "Where", fmt: v => esc(propertyOf(v.propertyId).locality) }
      ], rows.slice(0, 60)));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "buyers", label: "Buyers", type: "custom",
    desc: "Registered buyers and what they are looking for.",
    render(host) {
      const c = Dash.card("<h3>Registered buyers</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "email", l: "E-mail" }, { k: "phone", l: "Phone" },
        { k: "joined", l: "Joined" },
        { k: "saved", l: "Saved searches", fmt: u => DB.all("savedSearches")
            .filter(s => s.user === u.email).length },
        { k: "short", l: "Shortlisted", fmt: u => DB.all("favourites")
            .filter(f => f.user === u.email).length },
        { k: "views", l: "Viewings", fmt: u => DB.all("viewings")
            .filter(v => v.user === u.email).length }
      ], DB.all("users").filter(u => u.role === "user")));
      host.appendChild(c);
    }
  }
];

Dash.mount(MODULES);
