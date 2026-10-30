/* ==========================================================================
   user.js - the farmer
   Modules: subscribe to a vet, send a case, my cases, cure library,
            notices, payments, my details.
   ========================================================================== */

const SESSION = Auth.require("user");
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

const myCases = () => DB.all("cases").filter(c => c.user === SESSION.email);

const MODULES = [
  {
    id: "subscribe", label: "My Vet", type: "custom",
    desc: "A government hospital is free; a private clinic charges a monthly fee.",
    render(host) {
      const sub = activeSub(SESSION.email);
      if (sub) {
        const d = userOf(sub.doctor);
        host.appendChild(Dash.card(
          "<h3>You are signed up with " + esc(d.name) + "</h3>" +
          '<ul class="contact-list">' +
          "<li><b>Clinic</b>" + esc(d.clinic || "-") + " (" + esc(d.kind || "-") + ")</li>" +
          "<li><b>District</b>" + esc(d.district || "-") + "</li>" +
          "<li><b>Runs to</b>" + esc(sub.to) + "</li>" +
          "<li><b>Fee paid</b>" + (Number(sub.fee) ? money(sub.fee) : "free - government hospital") + "</li>" +
          "</ul>"));
      } else {
        host.insertAdjacentHTML("beforeend",
          '<div class="note">You need to be signed up with a vet before you can send a case.</div>');
      }

      const grid = document.createElement("div");
      grid.className = "grid c3";
      doctors().forEach(d => {
        const t = document.createElement("article");
        t.className = "tile";
        const free = d.kind === "Government";
        t.innerHTML =
          '<span class="tag ' + (free ? "ok" : "") + '">' + esc(d.kind || "-") + "</span>" +
          '<h3 style="margin-top:.55rem">' + esc(d.name) + "</h3>" +
          '<p class="meta" style="margin:0">' + esc(d.clinic || "-") + ", " + esc(d.district || "-") + "</p>" +
          '<div class="row"><span class="price">' +
            (free ? "Free" : money(PRIVATE_FEE) + '<span class="meta"> / month</span>') + "</span></div>" +
          (free ? "" : '<p class="meta">Pay to ' + esc(d.upi || d.bank || "the clinic") + "</p>");
        const b = document.createElement("button");
        b.className = "btn sm";
        b.style.marginTop = ".8rem";
        b.textContent = free ? "Sign up free" : "Subscribe for a month";
        b.onclick = () => subscribeTo(d);
        t.appendChild(b);
        grid.appendChild(t);
      });
      host.appendChild(grid);
    }
  },

  {
    id: "send", label: "Send a Case", type: "custom",
    desc: "Describe the signs and attach a photo, video, voice note or a line of text.",
    render(host) {
      const sub = activeSub(SESSION.email);
      const card = Dash.card("<h3>New case</h3>");
      if (!sub) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">Sign up with a vet first, under <b>My Vet</b>.</p>');
        host.appendChild(card);
        return;
      }
      const me = DB.all("users").find(u => u.email === SESSION.email) || {};
      card.insertAdjacentHTML("beforeend",
        '<p class="muted">Going to ' + esc(userOf(sub.doctor).name) + ", " +
        esc(userOf(sub.doctor).clinic || "") + "</p>");
      card.appendChild(Dash.form([
        { k: "animal", l: "Which animal", req: true, help: "A name or a tag number" },
        { k: "species", l: "Kind", t: "select",
          opts: ["Cow", "Buffalo", "Goat", "Sheep", "Poultry", "Dog"] },
        { k: "age", l: "Age" },
        { k: "district", l: "District", req: true, def: me.district || "" },
        { k: "media", l: "What are you sending", t: "select",
          opts: ["Photo", "Video", "Voice note", "Text only"] },
        { k: "mediaFile", l: "File name", help: "e.g. cow-leg.jpg" },
        { k: "symptoms", l: "What you can see", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("cases", Object.assign({}, data, {
          user: SESSION.email, doctor: sub.doctor, status: "Open",
          postedOn: today(), diagnosis: "", solution: "", medicines: ""
        }));
        form.reset();
        Dash.toast("Sent to the vet. You will see the answer under My Cases.");
        Dash.show(MODULES.find(m => m.id === "cases"));
      }, null, "Send to the vet"));
      host.appendChild(card);
    }
  },

  {
    id: "cases", label: "My Cases", type: "custom",
    desc: "What you have sent and what the vet said.",
    render(host) {
      const rows = myCases();
      const c = Dash.card("<h3>Your cases</h3>");
      c.appendChild(Dash.table([
        { k: "postedOn", l: "Sent" },
        { k: "animal", l: "Animal" }, { k: "species", l: "Kind" },
        { k: "symptoms", l: "What you reported" },
        { k: "doctor", l: "Vet", fmt: x => esc(userOf(x.doctor).name) },
        { k: "status", l: "Status", fmt: x => stateTag(x.status) }
      ], rows, x => x.status !== "Open" ? [{
        label: "Read the answer", cls: "flat", fn: () => {
          const host2 = document.getElementById("dash-view");
          const card = Dash.card(
            "<h3>" + esc(x.animal) + " &middot; " + esc(x.diagnosis) + "</h3>" +
            '<p class="muted">Answered by ' + esc(userOf(x.doctor).name) + " on " +
            esc(x.answeredOn || "-") + "</p>" +
            "<p><b>What to do:</b> " + esc(x.solution) + "</p>" +
            "<p><b>Medicines:</b> " + esc(x.medicines || "none prescribed") + "</p>");
          host2.appendChild(card);
          card.scrollIntoView({ behavior: "smooth" });
        }
      }] : []));
      host.appendChild(c);
    }
  },

  {
    id: "cures", label: "Cure Library", type: "custom",
    desc: "Common illnesses and what to do, written by the vets.",
    render(host) {
      const card = Dash.card(
        "<h3>Look something up</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Animal</label><select id="sp"><option value="">Any</option>' +
        [...new Set(DB.all("cures").map(c => c.species))]
          .map(s => "<option>" + esc(s) + "</option>").join("") + "  </select></div>" +
        '  <div class="field"><label>Search</label><input id="q" placeholder="illness or sign"></div>' +
        "</div>");
      host.appendChild(card);
      const out = document.createElement("div");
      out.className = "grid c2";
      host.appendChild(out);

      const paint = () => {
        const sp = card.querySelector("#sp").value;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = DB.all("cures").filter(c =>
          (!sp || c.species === sp || c.species === "Any") &&
          (!q || (c.disease + c.signs + c.treatment).toLowerCase().includes(q)));
        out.innerHTML = rows.map(c =>
          '<article class="tile"><span class="tag">' + esc(c.species) + "</span>" +
          '<h3 style="margin-top:.55rem">' + esc(c.disease) + "</h3>" +
          '<p class="meta"><b>Signs:</b> ' + esc(c.signs) + "</p>" +
          '<p class="meta"><b>Treatment:</b> ' + esc(c.treatment) + "</p></article>").join("") ||
          '<p class="muted">Nothing matches that.</p>';
      };
      card.querySelector("#sp").onchange = paint;
      card.querySelector("#q").oninput = paint;
      paint();
    }
  },

  {
    id: "news", label: "Notices", type: "custom",
    desc: "Vaccination drives and warnings from the veterinary office.",
    render(host) {
      DB.all("news").slice().reverse().forEach(n => host.appendChild(Dash.card(
        "<h3>" + esc(n.title) + "</h3>" +
        '<p class="muted">' + esc(n.district) + " &middot; " + esc(n.date) + "</p>" +
        "<p>" + esc(n.body) + "</p>")));
    }
  },

  {
    id: "payments", label: "My Payments", type: "custom",
    desc: "What you have paid, and to whom.",
    render(host) {
      const rows = DB.all("payments").filter(p => p.user === SESSION.email);
      const c = Dash.card("<h3>Payments</h3>");
      c.appendChild(Dash.table([
        { k: "date", l: "Date" },
        { k: "doctor", l: "To", fmt: p => esc(userOf(p.doctor).name) },
        { k: "amount", l: "Amount", fmt: p => money(p.amount) },
        { k: "mode", l: "Paid by" }, { k: "forWhat", l: "For" }
      ], rows));
      host.appendChild(c);
    }
  },

  {
    id: "details", label: "My Details", type: "custom",
    desc: "Your details and where you farm.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Your details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone", req: true },
        { k: "district", l: "District" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Saved.");
        location.reload();
      }, null, "Save"));
      host.appendChild(card);
    }
  }
];

/* ---- subscribing to a vet --------------------------------------------- */
function subscribeTo(d) {
  const free = d.kind === "Government";
  const fee = free ? GOVT_FEE : PRIVATE_FEE;
  const host = document.getElementById("dash-view");
  const card = Dash.card(
    "<h3>Sign up with " + esc(d.name) + "</h3>" +
    '<p class="muted">' + esc(d.clinic || "") + " &middot; " +
    (free ? "government hospital, no fee" : money(fee) + " for a month") + "</p>" +
    (free ? "" : '<div class="note">Pay to <b>' + esc(d.upi || d.bank || "the clinic") +
      "</b> and enter the reference below.</div>"));
  card.appendChild(Dash.form(free ? [
    { k: "confirm", l: "Confirm", t: "select", opts: ["Yes, sign me up"] }
  ] : [
    { k: "mode", l: "Paid by", t: "select", opts: ["Bank transfer", "Easy paisa", "UPI"] },
    { k: "ref", l: "Payment reference", req: true }
  ], {}, data => {
    const existing = activeSub(SESSION.email);
    if (existing) { Dash.toast("You are already signed up until " + existing.to + "."); return; }
    DB.insert("subscriptions", {
      user: SESSION.email, doctor: d.email, kind: d.kind,
      from: today(), to: addDays(today(), 30), fee: fee
    });
    if (fee) DB.insert("payments", {
      user: SESSION.email, doctor: d.email, amount: fee,
      mode: data.mode, ref: data.ref, date: today(),
      forWhat: "One month subscription"
    });
    Dash.toast(free ? "Signed up. You can send cases now."
                    : "Payment recorded. You can send cases now.");
    Dash.show(MODULES.find(m => m.id === "subscribe"));
  }, null, free ? "Sign me up" : "Record the payment"));
  host.appendChild(card);
  card.scrollIntoView({ behavior: "smooth" });
}

Dash.mount(MODULES);
