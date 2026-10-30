/* ==========================================================================
   officer.js - the officer console
   ========================================================================== */

const S = Auth.require("officer");
if (S) {
  initShell(S);
  const me = () => DB.all("users").find(u => u.email === S.email) || {};

  /* An officer registers freely but does nothing until the office approves
     the account, which is where the staff id and the department come from. */
  if (!me().approved) {
    document.getElementById("dash-nav").innerHTML = "";
    document.getElementById("dash-view").innerHTML =
      '<div class="view-head"><h2>Waiting for approval</h2></div>' +
      '<div class="card"><p>Your officer account has been created but the ' +
      "grievance cell has not approved it yet. Once it is approved you will be " +
      "given a staff number and a department, and the complaints for that " +
      "department will appear here.</p>" +
      '<p class="muted">Registered on ' + esc(me().joined) + " as " +
      esc(S.email) + ".</p></div>";
  } else {

  const mine = () => DB.all("complaints")
      .filter(c => c.officer === S.email)
      .sort((a, b) => b.id - a.id);

  const modules = [];

  /* ------------------------------------------------------------ worklist */
  modules.push({
    label: "My complaints", desc: "Everything assigned to you, newest first.",
    render(host) {
      const rows = mine();
      const open = rows.filter(c => c.status !== "Closed" && c.status !== "Resolved");
      host.appendChild(Dash.stats([
        { n: rows.length, l: "assigned to me" },
        { n: open.length, l: "still open" },
        { n: rows.filter(overdue).length, l: "past target" },
        { n: rows.filter(c => c.status === "Closed").length, l: "closed by the public" }
      ]));

      const card = document.createElement("div");
      card.appendChild(Dash.table([
        { k: "ref", l: "Reference" },
        { k: "subject", l: "Complaint" },
        { k: "ward", l: "Ward" },
        { k: "priority", l: "Priority" },
        { k: "filedOn", l: "Filed" },
        { k: "age", l: "Open", fmt: r => age(r) + " days" +
            (overdue(r) ? ' <span class="tag bad">late</span>' : "") },
        { k: "status", l: "Status", fmt: r => badge(r.status) }
      ], rows));
      host.appendChild(card);

      host.appendChild(wardMap({
        title: "Where they are",
        pins: rows.map(c => ({ x: c.x, y: c.y, label: c.ref.slice(-3), status: c.status }))
      }));
    }
  });

  /* ------------------------------------------------- update one complaint */
  modules.push({
    label: "Update a complaint", desc: "Record what has been done and move it on.",
    render(host) {
      const open = mine().filter(c => c.status !== "Closed");
      if (!open.length) {
        host.appendChild(Dash.card('<div class="empty">Nothing open on your list.</div>'));
        return;
      }

      let current = open[0];
      const card = Dash.card("");

      const paint = () => {
        card.innerHTML = "<h3>" + esc(current.ref) + " - " + esc(current.subject) + "</h3>" +
          badge(current.status) +
          '<p style="margin:.6rem 0 0">' + esc(current.detail) + "</p>" +
          '<p class="meta" style="margin:.4rem 0 .8rem">' + esc(current.landmark) +
          " &middot; " + esc(current.ward) + " &middot; open " + age(current) + " days</p>";

        card.appendChild(Dash.form([
          { k: "ref", l: "Complaint", t: "select", req: true,
            opts: open.map(c => ({ v: c.ref, l: c.ref + " - " + c.subject })) },
          { k: "status", l: "Move it to", t: "select", req: true,
            opts: ["Assigned", "In progress", "Resolved"] },
          { k: "notes", l: "Action taken", t: "textarea", full: true, req: true },
          { k: "proof", l: "Proof of work", t: "textarea", full: true,
            help: "Required before a complaint can be marked resolved." },
          { k: "proofPhoto", l: "Photograph of the finished work (file name)", full: true }
        ], current, data => {
          if (data.ref !== current.ref) {
            current = open.find(c => c.ref === data.ref);
            paint();
            return;
          }
          if (data.status === "Resolved" && !String(data.proof).trim()) {
            Dash.toast("Add the proof of work before marking it resolved.");
            return;
          }
          const patch = {
            status: data.status, notes: data.notes,
            proof: data.proof, proofPhoto: data.proofPhoto
          };
          if (data.status === "Resolved") patch.resolvedOn = today();
          if (data.status !== "Registered" && !current.assignedOn) patch.assignedOn = today();
          DB.update("complaints", current.id, patch);
          Dash.toast("Complaint updated.");
          Dash.show(modules[1]);
        }, null, "Save the update"));
      };

      paint();
      host.appendChild(card);
    }
  });

  /* ------------------------------------------------------------- history */
  modules.push({
    label: "Closed work", desc: "What has been finished, with the proof recorded.",
    render(host) {
      const rows = mine().filter(c => c.status === "Resolved" || c.status === "Closed");
      host.appendChild(Dash.table([
        { k: "ref", l: "Reference" },
        { k: "subject", l: "Complaint" },
        { k: "resolvedOn", l: "Finished", fmt: r => esc(r.resolvedOn || "-") },
        { k: "days", l: "Took", fmt: r => age(r) + " days" },
        { k: "proof", l: "Proof of work" },
        { k: "status", l: "Status", fmt: r => badge(r.status) }
      ], rows));

      const fb = DB.all("feedback").filter(f =>
        rows.some(c => c.ref === f.ref));
      if (fb.length) {
        const c = Dash.card("<h3>What the public said</h3>");
        c.appendChild(Dash.table([
          { k: "ref", l: "Complaint" },
          { k: "rating", l: "Rating", fmt: r => "&starf;".repeat(r.rating) },
          { k: "comment", l: "Comment" }
        ], fb));
        host.appendChild(c);
      }
    }
  });

  /* ------------------------------------------------------------- profile */
  modules.push({
    label: "My details", desc: "Staff number, department and contact.",
    render(host) {
      const u = me();
      const card = Dash.card("<h3>My details</h3>" +
        '<p class="muted">Staff number ' + esc(u.staffId) +
        ", department " + esc(u.dept) + ". Both are set by the grievance cell.</p>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], u, data => { DB.update("users", u.id, data); Dash.toast("Details saved."); }));
      host.appendChild(card);
    }
  });

  Dash.mount(modules);
  }
}
