/* ==========================================================================
   doctor.js - the veterinary surgeon
   Modules: cases waiting, answered cases, cure library, notices,
            fees received, where disease is showing up, my profile.
   ========================================================================== */

const SESSION = Auth.require("doctor");
initShell(SESSION);

/* ---- clinic rules shared by both consoles ----------------------------- */
const GOVT_FEE = 0;            // a government veterinary hospital charges nothing
const PRIVATE_FEE = 300;       // a private clinic charges per subscription month

const userOf = email => DB.all("users").find(u => u.email === email) || { name: email };
const caseOf = id => DB.get("cases", id) || { animal: "-", species: "-", user: "-" };

/* the subscription a farmer is on, if it has not run out */
function activeSub(email) {
  return DB.all("subscriptions").find(s =>
    s.user === email && s.from <= today() && today() <= s.to);
}

const doctors = () => DB.all("users").filter(u => u.role === "doctor");

const stateTag = s => '<span class="tag ' +
  (s === "Answered" ? "ok" : s === "Closed" ? "mute" : "warn") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

/* which illness turns up most in a district - the analysis the system is for */
function diseaseByArea() {
  const map = {};
  DB.all("cases").filter(c => c.diagnosis).forEach(c => {
    const key = c.district + " | " + c.diagnosis;
    map[key] = map[key] || { district: c.district, diagnosis: c.diagnosis, n: 0, species: {} };
    map[key].n++;
    map[key].species[c.species] = (map[key].species[c.species] || 0) + 1;
  });
  return Object.values(map).sort((a, b) => b.n - a.n);
}

const myCases = () => DB.all("cases").filter(c => c.doctor === SESSION.email);

const MODULES = [
  {
    id: "waiting", label: "Cases Waiting", type: "custom",
    desc: "What farmers have sent in and nobody has answered.",
    render(host) {
      const open = DB.all("cases").filter(c => c.status === "Open");
      host.appendChild(Dash.stats([
        { n: open.length, l: "Waiting" },
        { n: myCases().filter(c => c.status === "Answered").length, l: "You answered" },
        { n: DB.all("subscriptions").filter(s => s.to >= today()).length, l: "Farmers subscribed" }
      ]));

      if (!open.length) {
        host.appendChild(Dash.card('<p class="muted">Nothing is waiting. Answered cases are ' +
          "under <b>Answered</b>.</p>"));
        return;
      }

      open.forEach(c => {
        const card = Dash.card(
          "<h3>" + esc(c.animal) + " &middot; " + esc(c.species) + "</h3>" +
          '<p class="muted">' + esc(userOf(c.user).name) + ", " + esc(c.district) +
          " &middot; sent " + esc(c.postedOn) + " &middot; " + esc(c.media) + " attached</p>" +
          "<p><b>Signs reported:</b> " + esc(c.symptoms) + "</p>" +
          '<p class="meta">Attachment: ' + esc(c.mediaFile || "none") + "</p>");
        card.appendChild(Dash.form([
          { k: "diagnosis", l: "What it looks like", req: true },
          { k: "solution", l: "What the farmer should do", t: "textarea", req: true, full: true },
          { k: "medicines", l: "Medicines to give", full: true }
        ], {}, data => {
          DB.update("cases", c.id, Object.assign({}, data, {
            status: "Answered", doctor: SESSION.email, answeredOn: today()
          }));
          Dash.toast("Answer sent to " + userOf(c.user).name + ".");
          Dash.show(MODULES.find(m => m.id === "waiting"));
        }, null, "Send the answer"));
        host.appendChild(card);
      });
    }
  },

  {
    id: "answered", label: "Answered", type: "custom",
    desc: "Cases you have dealt with.",
    render(host) {
      const c = Dash.card("<h3>Your case history</h3>");
      c.appendChild(Dash.table([
        { k: "postedOn", l: "Sent" }, { k: "answeredOn", l: "Answered" },
        { k: "farmer", l: "Farmer", fmt: x => esc(userOf(x.user).name) },
        { k: "district", l: "District" },
        { k: "animal", l: "Animal" }, { k: "species", l: "Kind" },
        { k: "diagnosis", l: "Diagnosis" },
        { k: "status", l: "Status", fmt: x => stateTag(x.status) }
      ], myCases().filter(x => x.status !== "Open"), x => x.status === "Answered" ? [{
        label: "Close the case", cls: "flat", fn: () => {
          DB.update("cases", x.id, { status: "Closed" });
          Dash.show(MODULES.find(m => m.id === "answered"));
        }
      }] : []));
      host.appendChild(c);
    }
  },

  {
    id: "cures", label: "Cure Library", type: "crud", table: "cures",
    desc: "Common illnesses, the signs to look for and what to do - open to every farmer.",
    addLabel: "Add an entry",
    fields: [
      { k: "disease", l: "Illness", req: true },
      { k: "species", l: "Animal", t: "select",
        opts: ["Cow", "Buffalo", "Goat", "Sheep", "Poultry", "Dog", "Any"] },
      { k: "signs", l: "Signs to look for", t: "textarea", req: true, full: true },
      { k: "treatment", l: "Treatment", t: "textarea", req: true, full: true },
      { k: "photo", l: "Reference photo (file name)" }
    ],
    cols: [
      { k: "disease", l: "Illness" }, { k: "species", l: "Animal" },
      { k: "signs", l: "Signs" }, { k: "treatment", l: "Treatment" }
    ]
  },

  {
    id: "news", label: "Notices", type: "crud", table: "news",
    desc: "Vaccination drives and warnings, shown to every farmer.",
    addLabel: "Post a notice",
    fields: [
      { k: "title", l: "Headline", req: true },
      { k: "district", l: "District", req: true },
      { k: "date", l: "Date", t: "date", def: today() },
      { k: "body", l: "Details", t: "textarea", req: true, full: true }
    ],
    cols: [
      { k: "date", l: "Date" }, { k: "district", l: "District" },
      { k: "title", l: "Headline" }, { k: "body", l: "Details" }
    ]
  },

  {
    id: "fees", label: "Fees Received", type: "custom",
    desc: "What private subscriptions have brought in.",
    render(host) {
      const rows = DB.all("payments").filter(p => p.doctor === SESSION.email);
      host.appendChild(Dash.stats([
        { n: money(rows.reduce((s, p) => s + Number(p.amount), 0)), l: "Received" },
        { n: rows.length, l: "Payments" }
      ]));
      const c = Dash.card("<h3>Payments</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "farmer", l: "From", fmt: p => esc(userOf(p.user).name) },
        { k: "amount", l: "Amount", fmt: p => money(p.amount) },
        { k: "mode", l: "Paid by" }, { k: "forWhat", l: "For" }
      ], rows));
      host.appendChild(c);

      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      const bank = Dash.card("<h3>Where farmers pay you</h3>");
      bank.appendChild(Dash.form([
        { k: "bank", l: "Bank account details", full: true },
        { k: "upi", l: "UPI or easy paisa id", full: true }
      ], me, data => {
        DB.update("users", me.id, data);
        Dash.toast("Payment details saved - farmers see these when they subscribe.");
      }, null, "Save payment details"));
      host.appendChild(bank);
    }
  },

  {
    id: "analysis", label: "Where Disease Shows", type: "custom",
    desc: "What the answered cases say about each district.",
    render(host) {
      const rows = diseaseByArea();
      const c = Dash.card("<h3>Illness by district</h3>");
      c.appendChild(Dash.table([
        { k: "district", l: "District" }, { k: "diagnosis", l: "Illness" },
        { k: "n", l: "Cases" },
        { k: "species", l: "Mostly in", fmt: r => esc(Object.keys(r.species)
            .sort((a, b) => r.species[b] - r.species[a])[0] || "-") }
      ], rows));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Built only from cases that have been given a diagnosis, so the ' +
        "picture sharpens as more are answered.</div>");
    }
  },

  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "How farmers see you when they choose a doctor.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "clinic", l: "Hospital or clinic", req: true },
        { k: "kind", l: "Type", t: "select", opts: ["Government", "Private"] },
        { k: "district", l: "District", req: true },
        { k: "phone", l: "Phone" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Profile saved.");
        location.reload();
      }, null, "Save profile"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
