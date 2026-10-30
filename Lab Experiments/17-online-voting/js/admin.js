/* ==========================================================================
   admin.js - election commission
   Modules: overview, elections, candidates, voter roll, results, turnout.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

/* ---- election rules shared by both consoles --------------------------- */
const OTP_MINUTES = 10;        // how long a one time code stays good

const electionOf = id => DB.get("elections", id) ||
  { name: "(removed)", ward: "-", status: "Closed" };
const candidateOf = id => DB.get("candidates", id) ||
  { name: "(withdrawn)", party: "-", symbol: "-" };
const userOf = email => DB.all("users").find(u => u.email === email) || { name: email };

const candidatesIn = id => DB.all("candidates")
  .filter(c => String(c.electionId) === String(id));

const votesIn = id => DB.all("votes").filter(v => String(v.electionId) === String(id));

/* has this voter already voted in that election? */
const hasVoted = (electionId, voter) => votesIn(electionId).some(v => v.voter === voter);

/* a voter may only see elections for their own ward, and only while open */
const openFor = voter => DB.all("elections").filter(e =>
  e.status === "Open" && (e.ward === "All wards" || e.ward === (userOf(voter).ward || "")));

/* the count, only once the election is closed */
function tally(electionId) {
  const rows = candidatesIn(electionId).map(c => ({
    id: c.id, name: c.name, party: c.party, symbol: c.symbol,
    votes: votesIn(electionId).filter(v => String(v.candidateId) === String(c.id)).length
  })).sort((a, b) => b.votes - a.votes);
  const total = rows.reduce((s, r) => s + r.votes, 0);
  return { rows: rows, total: total, winner: rows[0] && rows[0].votes > 0 ? rows[0] : null };
}

const stateTag = s => '<span class="tag ' +
  (s === "Open" ? "ok" : s === "Closed" ? "mute" : "warn") + '">' +
  esc(String(s).toLowerCase()) + "</span>";

/* a six digit code, written down so the demo can show it on screen */
const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

const MODULES = [

  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Where every election stands.",
    render(host) {
      const els = DB.all("elections");
      host.appendChild(Dash.stats([
        { n: els.filter(e => e.status === "Open").length, l: "Polls open" },
        { n: els.filter(e => e.status === "Upcoming").length, l: "Upcoming" },
        { n: DB.all("users").filter(u => u.role === "user").length, l: "Voters on the roll" },
        { n: DB.all("votes").length, l: "Votes cast" }
      ]));

      const c = Dash.card("<h3>Elections</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Election" }, { k: "type", l: "Type" }, { k: "ward", l: "Ward" },
        { k: "date", l: "Polling day" },
        { k: "cands", l: "Candidates", fmt: e => candidatesIn(e.id).length },
        { k: "cast", l: "Votes cast", fmt: e => votesIn(e.id).length },
        { k: "turnout", l: "Turnout", fmt: e => {
            const roll = DB.all("users").filter(u => u.role === "user" &&
              (e.ward === "All wards" || u.ward === e.ward)).length;
            return roll ? Math.round(votesIn(e.id).length * 100 / roll) + "%" : "-";
          } },
        { k: "status", l: "Status", fmt: e => stateTag(e.status) }
      ], els));
      host.appendChild(c);
    }
  },

  {
    id: "elections", label: "Elections", type: "custom",
    desc: "Create an election, open the poll and close it when voting ends.",
    render(host) {
      const card = Dash.card("<h3>Create an election</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Election name", req: true, full: true },
        { k: "type", l: "Type", t: "select",
          opts: ["Municipal ward", "Student union", "Residents association", "Referendum"] },
        { k: "ward", l: "Ward", t: "select",
          opts: ["All wards", "Ward 1", "Ward 2", "Ward 3", "Ward 4"] },
        { k: "date", l: "Polling day", t: "date", req: true, def: today() },
        { k: "question", l: "What is being decided", full: true }
      ], {}, (data, form) => {
        DB.insert("elections", Object.assign({}, data, { status: "Upcoming", createdOn: today() }));
        form.reset();
        Dash.toast("Election created. Add the candidates, then open the poll.");
        Dash.show(MODULES.find(m => m.id === "elections"));
      }, null, "Create election"));
      host.appendChild(card);

      const c = Dash.card("<h3>All elections</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Election" }, { k: "ward", l: "Ward" }, { k: "date", l: "Polling day" },
        { k: "cands", l: "Candidates", fmt: e => candidatesIn(e.id).length },
        { k: "status", l: "Status", fmt: e => stateTag(e.status) }
      ], DB.all("elections"), e => {
        const acts = [];
        if (e.status === "Upcoming") acts.push({
          label: "Open the poll", cls: "", fn: () => {
            if (candidatesIn(e.id).length < 2) {
              Dash.toast("Add at least two candidates first."); return;
            }
            DB.update("elections", e.id, { status: "Open" });
            Dash.toast("Voting is open.");
            Dash.show(MODULES.find(m => m.id === "elections"));
          }
        });
        if (e.status === "Open") acts.push({
          label: "Close the poll", cls: "danger", fn: () => {
            if (confirm("Close voting? The result becomes public at once.")) {
              DB.update("elections", e.id, { status: "Closed", closedOn: today() });
              Dash.show(MODULES.find(m => m.id === "elections"));
            }
          }
        });
        return acts;
      }));
      host.appendChild(c);
    }
  },

  {
    id: "candidates", label: "Candidates", type: "crud", table: "candidates",
    desc: "Who is standing, and in which election. Candidates cannot change once a poll is open.",
    addLabel: "Add a candidate",
    fields: [
      { k: "electionId", l: "Election", t: "select", req: true,
        opts: DB.all("elections").filter(e => e.status !== "Closed")
          .map(e => ({ v: e.id, l: e.name })) },
      { k: "name", l: "Candidate name", req: true },
      { k: "party", l: "Party or group", req: true },
      { k: "symbol", l: "Symbol", req: true },
      { k: "manifesto", l: "What they stand for", t: "textarea", full: true }
    ],
    cols: [
      { k: "election", l: "Election", fmt: c => esc(electionOf(c.electionId).name) },
      { k: "name", l: "Candidate" }, { k: "party", l: "Party" }, { k: "symbol", l: "Symbol" },
      { k: "votes", l: "Votes", fmt: c => electionOf(c.electionId).status === "Closed"
          ? votesIn(c.electionId).filter(v => String(v.candidateId) === String(c.id)).length
          : '<span class="tag mute">sealed</span>' }
    ]
  },

  {
    id: "roll", label: "Voter Roll", type: "custom",
    desc: "Add voters one at a time or paste a list, and keep the roll current.",
    render(host) {
      const add = Dash.card("<h3>Add a voter</h3>");
      add.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "voterId", l: "Voter ID", req: true },
        { k: "email", l: "E-mail", req: true },
        { k: "ward", l: "Ward", t: "select", opts: ["Ward 1", "Ward 2", "Ward 3", "Ward 4"] },
        { k: "password", l: "Temporary password", req: true, def: "vote123" }
      ], {}, (data, form) => {
        if (DB.all("users").some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
          Dash.toast("That e-mail is already on the roll."); return;
        }
        if (DB.all("users").some(u => u.voterId === data.voterId)) {
          Dash.toast("That voter ID is already on the roll."); return;
        }
        DB.insert("users", Object.assign({}, data, { role: "user", joined: today() }));
        form.reset();
        Dash.toast("Voter added.");
        Dash.show(MODULES.find(m => m.id === "roll"));
      }, null, "Add to the roll"));
      host.appendChild(add);

      const imp = Dash.card("<h3>Import a list</h3>" +
        '<p class="muted">One voter a line: name, voter ID, e-mail, ward.</p>');
      imp.appendChild(Dash.form([
        { k: "rows", l: "Paste the list", t: "textarea", req: true, full: true,
          help: "e.g. Anita R, TN0099221, anita@example.in, Ward 2" }
      ], {}, (data, form) => {
        let added = 0, skipped = 0;
        data.rows.split("\n").forEach(line => {
          const p = line.split(",").map(x => x.trim());
          if (p.length < 4 || !p[0]) return;
          if (DB.all("users").some(u => u.email.toLowerCase() === p[2].toLowerCase() ||
              u.voterId === p[1])) { skipped++; return; }
          DB.insert("users", {
            name: p[0], voterId: p[1], email: p[2], ward: p[3],
            password: "vote123", role: "user", joined: today()
          });
          added++;
        });
        form.reset();
        Dash.toast(added + " added, " + skipped + " already on the roll.");
        Dash.show(MODULES.find(m => m.id === "roll"));
      }, null, "Import"));
      host.appendChild(imp);

      const c = Dash.card("<h3>The roll</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Name" }, { k: "voterId", l: "Voter ID" },
        { k: "email", l: "E-mail" }, { k: "ward", l: "Ward" },
        { k: "voted", l: "Voted in", fmt: u => DB.all("votes")
            .filter(v => v.voter === u.email).length }
      ], DB.all("users").filter(u => u.role === "user"), u => [
        { label: "Edit", cls: "flat", fn: () => {
            const host2 = document.getElementById("dash-view");
            const card = Dash.card("<h3>Update " + esc(u.name) + "</h3>");
            card.appendChild(Dash.form([
              { k: "name", l: "Name", req: true },
              { k: "voterId", l: "Voter ID", req: true },
              { k: "ward", l: "Ward", t: "select", opts: ["Ward 1", "Ward 2", "Ward 3", "Ward 4"] },
              { k: "password", l: "Password", req: true }
            ], u, data => {
              DB.update("users", u.id, data);
              Dash.toast("Roll updated.");
              Dash.show(MODULES.find(m => m.id === "roll"));
            }, null, "Save"));
            host2.appendChild(card);
            card.scrollIntoView({ behavior: "smooth" });
          } },
        { label: "Remove", cls: "danger", fn: () => {
            if (DB.all("votes").some(v => v.voter === u.email)) {
              Dash.toast("That voter has already voted and cannot be struck off."); return;
            }
            if (confirm("Strike " + u.name + " off the roll?")) {
              DB.remove("users", u.id);
              Dash.show(MODULES.find(m => m.id === "roll"));
            }
          } }
      ]));
      host.appendChild(c);
    }
  },

  {
    id: "results", label: "Results", type: "custom",
    desc: "The count, published once a poll is closed.",
    render(host) {
      DB.all("elections").forEach(e => {
        const c = Dash.card("<h3>" + esc(e.name) + " " + stateTag(e.status) + "</h3>" +
          '<p class="muted">' + esc(e.ward) + " &middot; " + esc(e.date) + "</p>");
        if (e.status !== "Closed") {
          c.insertAdjacentHTML("beforeend",
            '<p class="muted">The count stays sealed until the poll is closed.</p>');
          host.appendChild(c);
          return;
        }
        const t = tally(e.id);
        c.appendChild(Dash.table([
          { k: "name", l: "Candidate" }, { k: "party", l: "Party" }, { k: "symbol", l: "Symbol" },
          { k: "votes", l: "Votes" },
          { k: "share", l: "Share", fmt: r => t.total
              ? Math.round(r.votes * 100 / t.total) + "%" : "0%" }
        ], t.rows));
        c.insertAdjacentHTML("beforeend", t.winner
          ? '<div class="note"><b>' + esc(t.winner.name) + "</b> (" + esc(t.winner.party) +
            ") wins with " + t.winner.votes + " of " + t.total + " votes.</div>"
          : '<div class="note">No votes were cast.</div>');
        host.appendChild(c);
      });
    }
  }
];

Dash.mount(MODULES);
