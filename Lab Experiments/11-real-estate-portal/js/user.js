/* ==========================================================================
   user.js - buyer's account
   Modules: search, saved searches, shortlist, viewings, agents, loan
            calculator, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let openProp = null;
let criteria = { purpose: "", type: "", city: "", maxPrice: "", minBeds: "" };

const myFavs = () => DB.all("favourites").filter(f => f.user === SESSION.email);
const mySearches = () => DB.all("savedSearches").filter(s => s.user === SESSION.email);

/* the agency keeps a record of which listings a buyer opened */
function logVisit(propertyId) {
  const last = DB.all("visits").slice(-1)[0];
  if (last && last.user === SESSION.email && String(last.propertyId) === String(propertyId)) return;
  DB.insert("visits", {
    user: SESSION.email, name: SESSION.name,
    propertyId: Number(propertyId), at: today()
  });
}

function propertyCard(p, onChange) {
  const t = document.createElement("article");
  t.className = "tile";
  const fav = myFavs().find(f => String(f.propertyId) === String(p.id));
  t.innerHTML =
    '<span class="tag">' + esc(p.purpose === "Rent" ? "To rent" : "For sale") + " &middot; " +
      esc(p.type) + "</span>" +
    '<h3 style="margin-top:.55rem">' + esc(p.title) + "</h3>" +
    '<p class="meta" style="margin:0">' + esc(p.locality) + ", " + esc(p.city) + "</p>" +
    '<p class="meta">' + p.bedrooms + " bed &middot; " + p.bathrooms + " bath &middot; " +
      p.areaSqft + " sq ft &middot; " + esc(p.furnishing) + "</p>" +
    '<div class="row"><span class="price">' + inr(p.price) +
      (p.purpose === "Rent" ? '<span class="meta"> / month</span>' : "") + "</span>" +
    '<span class="meta">' + money(perSqft(p)) + " / sq ft</span></div>";

  const acts = document.createElement("div");
  acts.className = "form-actions";
  acts.style.marginTop = ".8rem";

  const det = document.createElement("button");
  det.className = "btn sm flat";
  det.textContent = openProp === p.id ? "Hide details" : "Details";
  det.onclick = () => {
    if (openProp !== p.id) logVisit(p.id);
    openProp = openProp === p.id ? null : p.id;
    onChange();
  };

  const sh = document.createElement("button");
  sh.className = "btn sm" + (fav ? " flat" : "");
  sh.textContent = fav ? "Shortlisted" : "Shortlist";
  sh.disabled = !!fav;
  sh.onclick = () => {
    DB.insert("favourites", { user: SESSION.email, propertyId: p.id, added: today() });
    Dash.toast("Added to your shortlist."); onChange();
  };

  const map = document.createElement("a");
  map.className = "btn sm flat";
  map.href = mapLink(p);
  map.target = "_blank";
  map.rel = "noopener";
  map.textContent = "Map";

  acts.appendChild(det); acts.appendChild(sh); acts.appendChild(map);
  t.appendChild(acts);

  if (openProp === p.id) {
    const basis = rateBasis(p);
    const mine = perSqft(p);
    const gap = basis ? Math.round((mine - basis.rate) * 100 / basis.rate) : 0;
    const d = document.createElement("div");
    d.style.marginTop = ".9rem";
    d.innerHTML =
      '<p class="meta">' + esc(p.description) + "</p>" +
      '<p class="meta"><b>Amenities:</b> ' + esc(p.amenities) + "</p>" +
      '<p class="meta"><b>Virtual tour:</b> ' + esc(p.tour || "not available") + "</p>" +
      '<p class="meta"><b>Agent:</b> ' + esc(agentOf(p.agentId).name) + ", " +
        esc(agentOf(p.agentId).company) + " &middot; " + esc(agentOf(p.agentId).phone) + "</p>" +
      (basis
        ? '<div class="note">Asking ' + money(mine) + " / sq ft against " + money(basis.rate) +
          " across " + basis.n + " other " +
          (p.purpose === "Rent" ? "rental" : "sale") + " listing(s) in " + basis.label + " - " +
          (gap > 0 ? "about " + gap + "% above that"
           : gap < 0 ? "about " + Math.abs(gap) + "% below that"
           : "right on it") + ".</div>"
        : '<div class="note">Nothing else comparable is listed yet, so there is no rate to ' +
          "measure this against.</div>");

    const book = Dash.card("<h4>Ask for a viewing</h4>");
    book.appendChild(Dash.form([
      { k: "date", l: "Preferred date", t: "date", req: true, def: addDays(today(), 2) },
      { k: "time", l: "Preferred time", t: "time", def: "11:00" },
      { k: "notes", l: "Anything to tell the agent", full: true }
    ], {}, data => {
      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      DB.insert("viewings", {
        user: SESSION.email, name: SESSION.name, phone: me.phone || "",
        propertyId: p.id, date: data.date, time: data.time,
        notes: data.notes, status: "Requested", askedOn: today()
      });
      Dash.toast("Viewing requested. The agent will confirm.");
      Dash.show(MODULES.find(m => m.id === "viewings"));
    }, null, "Request a viewing"));
    d.appendChild(book);
    t.appendChild(d);
  }
  return t;
}

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search Properties", type: "custom",
    desc: "Filter by what matters, then save the search so you need not set it again.",
    render(host) {
      const all = DB.all("properties");
      const cities = [...new Set(all.map(p => p.city))];

      const card = Dash.card(
        "<h3>What are you looking for?</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Buy or rent</label><select id="pu">' +
        '    <option value="">Either</option><option>Buy</option><option>Rent</option></select></div>' +
        '  <div class="field"><label>Type</label><select id="ty"><option value="">Any type</option>' +
        [...new Set(all.map(p => p.type))].map(t => "<option>" + esc(t) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>City</label><select id="ci"><option value="">Anywhere</option>' +
        cities.map(c => "<option>" + esc(c) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Budget up to (Rs.)</label><input type="number" id="mp" placeholder="any"></div>' +
        '  <div class="field"><label>Bedrooms at least</label><input type="number" id="mb" min="0" placeholder="any"></div>' +
        '  <div class="field"><label>Keyword</label><input id="q" placeholder="locality or feature"></div>' +
        "</div>" +
        '<div class="form-actions"><button class="btn flat" id="save">Save this search</button></div>');
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const read = () => ({
        purpose: card.querySelector("#pu").value,
        type: card.querySelector("#ty").value,
        city: card.querySelector("#ci").value,
        maxPrice: card.querySelector("#mp").value,
        minBeds: card.querySelector("#mb").value
      });

      const paint = () => {
        criteria = read();
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = all.filter(p => matches(p, criteria) &&
          (!q || (p.title + p.locality + p.amenities + p.description).toLowerCase().includes(q)));

        out.innerHTML = '<p class="muted">' + rows.length + " property(ies) available.</p>";
        const grid = document.createElement("div");
        grid.className = "grid c3";
        out.appendChild(grid);
        rows.forEach(p => grid.appendChild(propertyCard(p, paint)));
      };

      ["#pu", "#ty", "#ci"].forEach(s => card.querySelector(s).onchange = paint);
      card.querySelector("#mp").oninput = paint;
      card.querySelector("#mb").oninput = paint;
      card.querySelector("#q").oninput = paint;

      card.querySelector("#save").onclick = e => {
        e.preventDefault();
        const c = read();
        const name = prompt("Name this search", c.city || "My search");
        if (!name) return;
        DB.insert("savedSearches", Object.assign({}, c, {
          user: SESSION.email, name: name, savedOn: today()
        }));
        Dash.toast("Search saved. Open it any time from Saved Searches.");
      };
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "saved", label: "Saved Searches", type: "custom",
    desc: "Run a search you set up earlier instead of building it again.",
    render(host) {
      const rows = mySearches();
      const c = Dash.card("<h3>Your searches</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" },
        { k: "purpose", l: "Buy / rent", fmt: s => s.purpose || "either" },
        { k: "type", l: "Type", fmt: s => s.type || "any" },
        { k: "city", l: "City", fmt: s => s.city || "anywhere" },
        { k: "maxPrice", l: "Budget", fmt: s => s.maxPrice ? inr(s.maxPrice) : "any" },
        { k: "minBeds", l: "Beds", fmt: s => s.minBeds ? s.minBeds + "+" : "any" },
        { k: "hits", l: "Matches now", fmt: s => {
            const n = DB.all("properties").filter(p => matches(p, s)).length;
            return n ? '<span class="tag ok">' + n + "</span>" : '<span class="tag mute">0</span>';
          } }
      ], rows, s => [
        { label: "Show matches", cls: "", fn: () => {
            const out = document.getElementById("dash-view");
            const res = DB.all("properties").filter(p => matches(p, s));
            const card = Dash.card("<h3>" + esc(s.name) + " - " + res.length + " match(es)</h3>");
            const grid = document.createElement("div");
            grid.className = "grid c3";
            res.forEach(p => grid.appendChild(propertyCard(p, () =>
              Dash.show(MODULES.find(m => m.id === "saved")))));
            card.appendChild(grid);
            out.appendChild(card);
            card.scrollIntoView({ behavior: "smooth" });
          } },
        { label: "Delete", cls: "danger", fn: () => {
            DB.remove("savedSearches", s.id);
            Dash.show(MODULES.find(m => m.id === "saved"));
          } }
      ]));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">A saved search keeps your filters, so the same criteria can be ' +
        "run again whenever new listings come in.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "shortlist", label: "Shortlist", type: "custom",
    desc: "Properties you marked to come back to.",
    render(host) {
      const rows = myFavs();
      const c = Dash.card("<h3>Shortlisted</h3>");
      c.appendChild(Dash.table([
        { k: "title", l: "Property", fmt: f => esc(propertyOf(f.propertyId).title) },
        { k: "where", l: "Where", fmt: f => esc(propertyOf(f.propertyId).locality + ", " +
            propertyOf(f.propertyId).city) },
        { k: "price", l: "Price", fmt: f => inr(propertyOf(f.propertyId).price) },
        { k: "status", l: "Status", fmt: f => statusTag(propertyOf(f.propertyId).status) },
        { k: "added", l: "Saved on" }
      ], rows, f => [
        { label: "Map", cls: "flat", fn: () =>
            window.open(mapLink(propertyOf(f.propertyId)), "_blank", "noopener") },
        { label: "Remove", cls: "danger", fn: () => {
            DB.remove("favourites", f.id);
            Dash.show(MODULES.find(m => m.id === "shortlist"));
          } }
      ]));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "viewings", label: "My Viewings", type: "custom",
    desc: "Appointments to see a property.",
    render(host) {
      const rows = DB.all("viewings").filter(v => v.user === SESSION.email);
      const c = Dash.card("<h3>Viewings</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" }, { k: "time", l: "Time" },
        { k: "property", l: "Property", fmt: v => esc(propertyOf(v.propertyId).title) },
        { k: "where", l: "Where", fmt: v => esc(propertyOf(v.propertyId).locality) },
        { k: "agent", l: "Agent", fmt: v => esc(agentOf(propertyOf(v.propertyId).agentId).name) },
        { k: "status", l: "Status", fmt: v => viewTag(v.status) }
      ], rows, v => ["Requested", "Confirmed"].includes(v.status) ? [{
        label: "Cancel", cls: "danger", fn: () => {
          if (confirm("Cancel this viewing?")) {
            DB.update("viewings", v.id, { status: "Cancelled" });
            Dash.toast("Viewing cancelled.");
            Dash.show(MODULES.find(m => m.id === "viewings"));
          }
        }
      }] : []));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "agents", label: "Agents", type: "custom",
    desc: "Search agents and companies, and write to one.",
    render(host) {
      const card = Dash.card(
        "<h3>Find an agent</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Company</label><select id="co"><option value="">Any company</option>' +
        [...new Set(DB.all("agents").map(a => a.company))]
          .map(c => "<option>" + esc(c) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Area</label><input id="ar" placeholder="locality"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const co = card.querySelector("#co").value;
        const ar = card.querySelector("#ar").value.toLowerCase().trim();
        const rows = DB.all("agents").filter(a =>
          (!co || a.company === co) && (!ar || a.areas.toLowerCase().includes(ar)));
        out.innerHTML = "";
        out.appendChild(Dash.table([
          { k: "name", l: "Agent" }, { k: "company", l: "Company" },
          { k: "areas", l: "Areas" }, { k: "phone", l: "Phone" }, { k: "email", l: "E-mail" },
          { k: "n", l: "Listings", fmt: a => DB.all("properties")
              .filter(p => String(p.agentId) === String(a.id) && p.status === "Available").length }
        ], rows));
      };
      card.querySelector("#co").onchange = paint;
      card.querySelector("#ar").oninput = paint;
      paint();

      const ask = Dash.card("<h3>Write to an agent</h3>");
      ask.appendChild(Dash.form([
        { k: "propertyId", l: "About which property", t: "select", req: true,
          opts: DB.all("properties").map(p => ({ v: p.id, l: p.title })) },
        { k: "message", l: "Your message", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        const p = propertyOf(data.propertyId);
        DB.insert("enquiries", {
          user: SESSION.email, name: SESSION.name,
          propertyId: Number(data.propertyId), agentId: p.agentId,
          message: data.message, date: today(), reply: ""
        });
        form.reset();
        Dash.toast("Message sent to " + agentOf(p.agentId).name + ".");
        Dash.show(MODULES.find(m => m.id === "agents"));
      }, null, "Send message"));
      host.appendChild(ask);

      const mine = DB.all("enquiries").filter(e => e.user === SESSION.email);
      if (mine.length) {
        const c = Dash.card("<h3>Your messages</h3>");
        c.appendChild(Dash.table([
          { k: "date", l: "Sent" },
          { k: "property", l: "About", fmt: e => esc(propertyOf(e.propertyId).title) },
          { k: "agent", l: "To", fmt: e => esc(agentOf(e.agentId).name) },
          { k: "message", l: "Message" },
          { k: "reply", l: "Reply", fmt: e => e.reply
              ? esc(e.reply) : '<span class="tag warn">waiting</span>' }
        ], mine));
        host.appendChild(c);
      }
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "loan", label: "Loan Calculator", type: "custom",
    desc: "What a property would cost you a month, and what the locality says about the price.",
    render(host) {
      const card = Dash.card(
        "<h3>Home loan instalment</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Property</label><select id="p"><option value="">Enter an amount instead</option>' +
        DB.all("properties").filter(p => p.purpose === "Buy")
          .map(p => '<option value="' + p.id + '">' + esc(p.title) + " - " + inr(p.price) + "</option>").join("") +
        "  </select></div>" +
        '  <div class="field"><label>Price (Rs.)</label><input type="number" id="price" value="5000000"></div>' +
        '  <div class="field"><label>Down payment (%)</label><input type="number" id="down" value="20"></div>' +
        '  <div class="field"><label>Interest rate (% a year)</label><input type="number" id="rate" step="0.05" value="8.5"></div>' +
        '  <div class="field"><label>Term (years)</label><input type="number" id="yrs" value="20"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const price = Number(card.querySelector("#price").value) || 0;
        const down = Number(card.querySelector("#down").value) || 0;
        const rate = Number(card.querySelector("#rate").value) || 0;
        const yrs = Number(card.querySelector("#yrs").value) || 0;
        const loan = Math.round(price * (100 - down) / 100);
        const m = emi(loan, rate, yrs);
        const total = m * yrs * 12;
        out.innerHTML = "";
        out.appendChild(Dash.stats([
          { n: money(m), l: "Every month" },
          { n: inr(loan), l: "Loan amount" },
          { n: inr(total - loan), l: "Interest over the term" },
          { n: inr(total + price - loan), l: "Total you will have paid" }
        ]));
      };

      card.querySelector("#p").onchange = e => {
        const p = DB.get("properties", e.target.value);
        if (p) { card.querySelector("#price").value = p.price; paint(); }
      };
      ["#price", "#down", "#rate", "#yrs"].forEach(s => card.querySelector(s).oninput = paint);
      paint();

      const val = Dash.card("<h3>What each locality is asking</h3>");
      const rates = {};
      DB.all("properties").forEach(p => {
        const key = p.locality + " | " + p.purpose;
        rates[key] = rates[key] || { locality: p.locality, purpose: p.purpose, n: 0, sum: 0 };
        rates[key].n++; rates[key].sum += perSqft(p);
      });
      val.appendChild(Dash.table([
        { k: "locality", l: "Locality" },
        { k: "purpose", l: "For" },
        { k: "rate", l: "Average rate", fmt: r => money(Math.round(r.sum / r.n)) + " / sq ft" },
        { k: "n", l: "Listings" }
      ], Object.values(rates)));
      host.appendChild(val);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Details", type: "custom",
    desc: "What the agency holds for you.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "budget", l: "Budget (Rs.)", t: "number", min: 0 },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, budget: data.budget, password: data.password });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Details saved.");
        location.reload();
      }, null, "Save details"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
