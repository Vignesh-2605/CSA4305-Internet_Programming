/* ==========================================================================
   user.js - the voter
   Modules: elections for my ward, cast a vote (with a one time code),
            my voting record, published results, my details.
   ========================================================================== */

const SESSION = Auth.require("user");
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

let voting = null;      // election being voted in
let chosen = null;      // candidate picked on the ballot

const me = () => DB.all("users").find(u => u.email === SESSION.email) || {};

/* the live code for this voter, if it is still inside its window */
function liveOtp(electionId) {
  return DB.all("otps").find(o =>
    o.voter === SESSION.email && String(o.electionId) === String(electionId) &&
    !o.used && (Date.now() - Number(o.issuedAt)) / 60000 < OTP_MINUTES);
}

const MODULES = [

  {
    id: "polls", label: "Elections", type: "custom",
    desc: "Polls open to your ward right now.",
    render(host) {
      if (voting) { renderBallot(host); return; }

      const mine = openFor(SESSION.email);
      host.appendChild(Dash.stats([
        { n: mine.length, l: "Open to you" },
        { n: DB.all("votes").filter(v => v.voter === SESSION.email).length, l: "You have voted in" },
        { n: esc(me().ward || "-"), l: "Your ward" }
      ]));

      if (!mine.length) {
        host.appendChild(Dash.card(
          '<p class="muted">No poll is open for ' + esc(me().ward || "your ward") +
          " at the moment. Anything already decided is under <b>Results</b>.</p>"));
        return;
      }

      mine.forEach(e => {
        const done = hasVoted(e.id, SESSION.email);
        const c = Dash.card(
          "<h3>" + esc(e.name) + "</h3>" +
          '<p class="muted">' + esc(e.type) + " &middot; " + esc(e.ward) +
          " &middot; polling day " + esc(e.date) + "</p>" +
          "<p>" + esc(e.question || "") + "</p>");
        c.appendChild(Dash.table([
          { k: "name", l: "Candidate" }, { k: "party", l: "Party" },
          { k: "symbol", l: "Symbol" }, { k: "manifesto", l: "Stands for" }
        ], candidatesIn(e.id)));

        const b = document.createElement("button");
        b.className = "btn";
        b.style.marginTop = ".9rem";
        b.textContent = done ? "You have already voted" : "Go to the ballot";
        b.disabled = done;
        b.onclick = () => { voting = e.id; chosen = null; Dash.show(MODULES.find(m => m.id === "polls")); };
        c.appendChild(b);
        host.appendChild(c);
      });
    }
  },

  {
    id: "record", label: "My Voting Record", type: "custom",
    desc: "Confirmation that your vote was counted - never who you voted for.",
    render(host) {
      const rows = DB.all("votes").filter(v => v.voter === SESSION.email);
      const c = Dash.card("<h3>Where you have voted</h3>");
      c.appendChild(Dash.table([
        { k: "election", l: "Election", fmt: v => esc(electionOf(v.electionId).name) },
        { k: "ward", l: "Ward", fmt: v => esc(electionOf(v.electionId).ward) },
        { k: "at", l: "Cast on" },
        { k: "receipt", l: "Receipt" },
        { k: "state", l: "Election", fmt: v => stateTag(electionOf(v.electionId).status) }
      ], rows));
      host.appendChild(c);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Your receipt confirms the vote was recorded. The ballot itself ' +
        "is not shown back to you, and nobody can look up how a named voter voted.</div>");
    }
  },

  {
    id: "results", label: "Results", type: "custom",
    desc: "Counts for elections that have closed.",
    render(host) {
      const closed = DB.all("elections").filter(e => e.status === "Closed");
      if (!closed.length) {
        host.appendChild(Dash.card('<p class="muted">No election has been counted yet.</p>'));
        return;
      }
      closed.forEach(e => {
        const t = tally(e.id);
        const c = Dash.card("<h3>" + esc(e.name) + "</h3>" +
          '<p class="muted">' + esc(e.ward) + " &middot; " + esc(e.date) +
          " &middot; " + t.total + " votes counted</p>");
        c.appendChild(Dash.table([
          { k: "name", l: "Candidate" }, { k: "party", l: "Party" }, { k: "votes", l: "Votes" },
          { k: "share", l: "Share", fmt: r => t.total
              ? Math.round(r.votes * 100 / t.total) + "%" : "0%" }
        ], t.rows));
        if (t.winner) c.insertAdjacentHTML("beforeend",
          '<div class="note"><b>' + esc(t.winner.name) + "</b> elected.</div>");
        host.appendChild(c);
      });
    }
  },

  {
    id: "details", label: "My Details", type: "custom",
    desc: "What the roll holds against your name.",
    render(host) {
      const u = me();
      host.appendChild(Dash.card(
        "<h3>On the electoral roll</h3>" +
        '<ul class="contact-list">' +
        "<li><b>Name</b>" + esc(u.name) + "</li>" +
        "<li><b>Voter ID</b>" + esc(u.voterId || "-") + "</li>" +
        "<li><b>Ward</b>" + esc(u.ward || "-") + "</li>" +
        "<li><b>E-mail</b>" + esc(u.email) + "</li></ul>" +
        '<p class="meta">Corrections to the name, voter ID or ward are made by the ' +
        "commission - write to them rather than changing it here.</p>"));

      const card = Dash.card("<h3>Change your password</h3>");
      card.appendChild(Dash.form([
        { k: "password", l: "New password", t: "password", req: true }
      ], {}, data => {
        DB.update("users", u.id, { password: data.password });
        Dash.toast("Password changed.");
      }, null, "Change password"));
      host.appendChild(card);
    }
  }
];

/* ------------------------------------------------------------------------ */
/*  The ballot: pick one candidate, confirm with a one time code            */
/* ------------------------------------------------------------------------ */
function renderBallot(host) {
  const e = electionOf(voting);

  const back = document.createElement("button");
  back.className = "btn flat";
  back.textContent = "← Back to the elections";
  back.onclick = () => { voting = null; Dash.show(MODULES.find(m => m.id === "polls")); };
  host.appendChild(back);

  if (hasVoted(voting, SESSION.email)) {
    host.appendChild(Dash.card('<p class="muted">You have already voted in this election.</p>'));
    return;
  }

  const card = Dash.card(
    "<h3>Ballot - " + esc(e.name) + "</h3>" +
    '<p class="muted">Choose one candidate. Once the vote is submitted it cannot be changed.</p>');
  const grid = document.createElement("div");
  grid.className = "grid c3";
  candidatesIn(voting).forEach(c => {
    const t = document.createElement("article");
    t.className = "tile";
    t.innerHTML =
      '<span class="tag">' + esc(c.symbol) + "</span>" +
      '<h3 style="margin-top:.55rem">' + esc(c.name) + "</h3>" +
      '<p class="meta" style="margin:0">' + esc(c.party) + "</p>" +
      '<p class="meta">' + esc(c.manifesto) + "</p>";
    const b = document.createElement("button");
    b.className = "btn sm" + (String(chosen) === String(c.id) ? "" : " flat");
    b.textContent = String(chosen) === String(c.id) ? "Chosen" : "Choose";
    b.onclick = () => { chosen = c.id; Dash.show(MODULES.find(m => m.id === "polls")); };
    t.appendChild(b);
    grid.appendChild(t);
  });
  card.appendChild(grid);
  host.appendChild(card);

  if (chosen === null) return;

  const otp = liveOtp(voting);
  const conf = Dash.card(
    "<h3>Confirm your vote</h3>" +
    "<p>You are voting for <b>" + esc(candidateOf(chosen).name) + "</b> (" +
    esc(candidateOf(chosen).party) + ").</p>");

  if (!otp) {
    const get = document.createElement("button");
    get.className = "btn";
    get.textContent = "Send me a one time code";
    get.onclick = () => {
      const code = makeOtp();
      DB.insert("otps", {
        voter: SESSION.email, electionId: Number(voting), code: code,
        issuedAt: Date.now(), used: false, at: nowStamp()
      });
      Dash.toast("Code sent to your registered mobile.");
      Dash.show(MODULES.find(m => m.id === "polls"));
    };
    conf.appendChild(get);
    conf.insertAdjacentHTML("beforeend",
      '<p class="meta">A six digit code is sent to the number on the roll. It is good for ' +
      OTP_MINUTES + " minutes and works once.</p>");
  } else {
    conf.insertAdjacentHTML("beforeend",
      '<div class="note">Demonstration: the code sent to you is <b>' + esc(otp.code) +
      "</b>. On a live system it would only reach your phone.</div>");
    conf.appendChild(Dash.form([
      { k: "code", l: "One time code", req: true }
    ], {}, data => {
      const live = liveOtp(voting);
      if (!live) { Dash.toast("That code has expired. Ask for another."); return; }
      if (data.code.trim() !== live.code) { Dash.toast("That code is not right."); return; }
      if (hasVoted(voting, SESSION.email)) { Dash.toast("You have already voted."); return; }

      const rec = DB.insert("votes", {
        electionId: Number(voting), candidateId: Number(chosen),
        voter: SESSION.email, at: today(), receipt: ""
      });
      DB.update("votes", rec.id, { receipt: "VT-" + String(700000 + rec.id * 53) });
      DB.update("otps", live.id, { used: true });
      voting = null; chosen = null;
      Dash.toast("Your vote has been recorded.");
      Dash.show(MODULES.find(m => m.id === "record"));
    }, null, "Submit my vote"));
  }
  host.appendChild(conf);
}

Dash.mount(MODULES);
