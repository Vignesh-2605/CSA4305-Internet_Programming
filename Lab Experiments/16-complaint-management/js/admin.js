/* ==========================================================================
   admin.js - the grievance cell console
   ========================================================================== */

const S = Auth.require("admin");
if (S) {
  initShell(S);
  const modules = [];

  /* ------------------------------------------------------------ overview */
  modules.push({
    label: "Overview", desc: "Where the grievances stand today.",
    render(host) {
      const all = DB.all("complaints");
      const open = all.filter(c => c.status !== "Closed" && c.status !== "Resolved");
      const fb = DB.all("feedback");
      const avg = fb.length
        ? (fb.reduce((s, f) => s + Number(f.rating), 0) / fb.length).toFixed(1) : "-";

      host.appendChild(Dash.stats([
        { n: all.length, l: "complaints" },
        { n: open.length, l: "still open" },
        { n: all.filter(overdue).length, l: "past target" },
        { n: avg, l: "average rating" }
      ]));

      const byDept = DB.all("departments").map(d => {
        const rows = all.filter(c => c.dept === d.name);
        const done = rows.filter(c => c.status === "Resolved" || c.status === "Closed");
        return {
          id: d.id, name: d.name, sla: d.sla, total: rows.length,
          open: rows.length - done.length, late: rows.filter(overdue).length,
          avg: done.length
            ? Math.round(done.reduce((s, c) => s + age(c), 0) / done.length) + " days" : "-"
        };
      });
      const c = Dash.card("<h3>By department</h3>");
      c.appendChild(Dash.table([
        { k: "name", l: "Department" },
        { k: "sla", l: "Target", fmt: r => r.sla + " days" },
        { k: "total", l: "Received" },
        { k: "open", l: "Open" },
        { k: "late", l: "Past target" },
        { k: "avg", l: "Average time to resolve" }
      ], byDept));
      host.appendChild(c);

      host.appendChild(wardMap({
        title: "Every open complaint",
        pins: open.map(x => ({ x: x.x, y: x.y, label: x.ref.slice(-3), status: x.status }))
      }));
    }
  });

  /* ------------------------------------------------- complaints and assign */
  modules.push({
    label: "All complaints", desc: "Assign a complaint to the officer who handles it.",
    render(host) {
      const rows = DB.all("complaints").sort((a, b) => b.id - a.id);
      const officers = DB.all("users").filter(u => u.role === "officer" && u.approved);

      const table = document.createElement("div");
      const paint = () => {
        table.innerHTML = "";
        table.appendChild(Dash.table([
          { k: "ref", l: "Reference" },
          { k: "subject", l: "Complaint" },
          { k: "dept", l: "Department" },
          { k: "ward", l: "Ward" },
          { k: "priority", l: "Priority" },
          { k: "filedOn", l: "Filed" },
          { k: "officer", l: "Officer", fmt: r => {
              const o = DB.all("users").find(u => u.email === r.officer);
              return o ? esc(o.name) : '<span class="muted">unassigned</span>';
            } },
          { k: "status", l: "Status", fmt: r => badge(r.status) +
              (overdue(r) ? ' <span class="tag bad">late</span>' : "") }
        ], DB.all("complaints").sort((a, b) => b.id - a.id), r => [
          { label: "Assign", cls: "flat", fn: () => {
              const fit = officers.filter(o => o.dept === r.dept);
              if (!fit.length) {
                Dash.toast("No approved officer for " + r.dept + " yet.");
                return;
              }
              const who = prompt("Assign " + r.ref + " to:\n" +
                fit.map((o, i) => (i + 1) + ". " + o.name + " (" + o.dept + ")").join("\n"),
                "1");
              const pick = fit[Number(who) - 1];
              if (!pick) return;
              DB.update("complaints", r.id, {
                officer: pick.email,
                status: r.status === "Registered" ? "Assigned" : r.status,
                assignedOn: r.assignedOn || today()
              });
              Dash.toast("Assigned to " + pick.name + ".");
              paint();
            } },
          { label: "Reject", cls: "danger", fn: () => {
              if (!confirm("Reject " + r.ref + "? The complainant will see it as rejected.")) return;
              DB.update("complaints", r.id, { status: "Rejected" });
              paint();
            } }
        ]));
      };
      paint();
      host.appendChild(table);
    }
  });

  /* --------------------------------------------------- officer approvals */
  modules.push({
    label: "Officers", desc: "Approve an officer, give them a staff number and a department.",
    render(host) {
      const depts = DB.all("departments").map(d => d.name);

      const waiting = document.createElement("div");
      const paint = () => {
        waiting.innerHTML = "";
        const pend = DB.all("users").filter(u => u.role === "officer" && !u.approved);
        const card = Dash.card("<h3>Waiting for approval</h3>");
        if (!pend.length) {
          card.innerHTML += '<div class="empty">Nobody waiting.</div>';
        } else {
          card.appendChild(Dash.table([
            { k: "name", l: "Name" },
            { k: "email", l: "E-mail" },
            { k: "phone", l: "Phone" },
            { k: "joined", l: "Registered" }
          ], pend, r => [
            { label: "Approve", cls: "", fn: () => {
                const d = prompt("Department for " + r.name + ":\n" +
                  depts.map((x, i) => (i + 1) + ". " + x).join("\n"), "1");
                const dept = depts[Number(d) - 1];
                if (!dept) return;
                const n = DB.all("users").filter(u => u.role === "officer").length + 1000;
                const staffId = "OFF-" + n;
                const pwd = "off" + Math.floor(1000 + Math.random() * 8999);
                DB.update("users", r.id, {
                  approved: true, dept: dept, staffId: staffId, password: pwd });
                alert("Approved.\n\nStaff number: " + staffId +
                      "\nLogin: " + r.email + "\nPassword: " + pwd +
                      "\n\nPass these to the officer.");
                paint();
              } },
            { label: "Refuse", cls: "danger", fn: () => {
                if (confirm("Delete this officer account?")) { DB.remove("users", r.id); paint(); }
              } }
          ]));
        }
        waiting.appendChild(card);

        const on = DB.all("users").filter(u => u.role === "officer" && u.approved);
        const t = Dash.card("<h3>Officers on duty</h3>");
        t.appendChild(Dash.table([
          { k: "staffId", l: "Staff no" },
          { k: "name", l: "Name" },
          { k: "dept", l: "Department" },
          { k: "phone", l: "Phone" },
          { k: "load", l: "Open complaints", fmt: r =>
              DB.all("complaints").filter(c => c.officer === r.email &&
                c.status !== "Closed" && c.status !== "Resolved").length }
        ], on, r => [
          { label: "New password", cls: "flat", fn: () => {
              const pwd = "off" + Math.floor(1000 + Math.random() * 8999);
              DB.update("users", r.id, { password: pwd });
              alert("New password for " + r.name + ": " + pwd);
            } },
          { label: "Remove", cls: "danger", fn: () => {
              if (confirm("Remove " + r.name + "?")) { DB.remove("users", r.id); paint(); }
            } }
        ]));
        waiting.appendChild(t);
      };
      paint();
      host.appendChild(waiting);

      const add = Dash.card("<h3>Create an officer login directly</h3>");
      add.appendChild(Dash.form([
        { k: "name", l: "Name", req: true },
        { k: "email", l: "E-mail", req: true },
        { k: "phone", l: "Phone", req: true },
        { k: "dept", l: "Department", t: "select", req: true, opts: depts }
      ], {}, (data, form) => {
        if (DB.all("users").some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
          Dash.toast("That e-mail already has an account.");
          return;
        }
        const n = DB.all("users").filter(u => u.role === "officer").length + 1000;
        const pwd = "off" + Math.floor(1000 + Math.random() * 8999);
        DB.insert("users", Object.assign({}, data, {
          role: "officer", approved: true, staffId: "OFF-" + n,
          password: pwd, joined: today() }));
        alert("Officer created.\n\nStaff number: OFF-" + n +
              "\nLogin: " + data.email + "\nPassword: " + pwd);
        form.reset();
        paint();
      }, null, "Generate the login"));
      host.appendChild(add);
    }
  });

  /* -------------------------------------------------------- all accounts */
  modules.push({
    label: "Accounts", desc: "Every account on the portal.",
    render(host) {
      const box = document.createElement("div");
      const paint = () => {
        box.innerHTML = "";
        box.appendChild(Dash.table([
          { k: "name", l: "Name" },
          { k: "email", l: "E-mail" },
          { k: "role", l: "Role" },
          { k: "phone", l: "Phone" },
          { k: "ward", l: "Ward / department", fmt: r => esc(r.ward || r.dept || "-") },
          { k: "joined", l: "Joined" }
        ], DB.all("users"), r => r.role === "admin" ? [] : [
          { label: "Reset password", cls: "flat", fn: () => {
              const pwd = prompt("New password for " + r.name, "pass123");
              if (!pwd) return;
              DB.update("users", r.id, { password: pwd });
              Dash.toast("Password changed.");
            } },
          { label: "Delete", cls: "danger", fn: () => {
              if (confirm("Delete " + r.name + "?")) { DB.remove("users", r.id); paint(); }
            } }
        ]));
      };
      paint();
      host.appendChild(box);
    }
  });

  /* ------------------------------------------------- departments, notices */
  modules.push({
    label: "Departments", desc: "What each one covers and how long it may take.",
    type: "crud", table: "departments", addLabel: "Add a department",
    fields: [
      { k: "name", l: "Department", req: true },
      { k: "sla", l: "Target in days", t: "number", req: true, min: 1 },
      { k: "about", l: "What it covers", t: "textarea", full: true, req: true }
    ],
    cols: [
      { k: "name", l: "Department" },
      { k: "sla", l: "Target", fmt: r => r.sla + " days" },
      { k: "about", l: "Covers" }
    ]
  });

  modules.push({
    label: "Notices", desc: "Shown on the home page and in the citizen console.",
    type: "crud", table: "notices", addLabel: "Post a notice",
    fields: [
      { k: "title", l: "Title", req: true, full: true },
      { k: "body", l: "Notice", t: "textarea", req: true, full: true },
      { k: "on", l: "Date", t: "date", req: true, def: today() }
    ],
    cols: [
      { k: "on", l: "Date" }, { k: "title", l: "Title" }, { k: "body", l: "Notice" }
    ]
  });

  /* ------------------------------------------------------------ feedback */
  modules.push({
    label: "Feedback", desc: "What the public said after a complaint was closed.",
    render(host) {
      const fb = DB.all("feedback");
      host.appendChild(Dash.stats([
        { n: fb.length, l: "responses" },
        { n: fb.filter(f => f.rating >= 4).length, l: "rated four or five" },
        { n: fb.filter(f => f.rating <= 2).length, l: "rated two or less" },
        { n: fb.length
            ? (fb.reduce((s, f) => s + Number(f.rating), 0) / fb.length).toFixed(1) : "-",
          l: "average" }
      ]));
      host.appendChild(Dash.table([
        { k: "ref", l: "Complaint" },
        { k: "who", l: "From", fmt: r => {
            const u = DB.all("users").find(u => u.email === r.user);
            return esc(u ? u.name : r.user);
          } },
        { k: "rating", l: "Rating", fmt: r => "&starf;".repeat(r.rating) },
        { k: "comment", l: "Comment" },
        { k: "on", l: "Date" }
      ], fb));
    }
  });

  /* ------------------------------------------------------------ settings */
  modules.push({
    label: "Portal settings", desc: "Office details, and which features the public sees.",
    render(host) {
      const s = DB.all("settings")[0];
      const card = Dash.card("<h3>Settings</h3>");
      card.appendChild(Dash.form([
        { k: "office", l: "Office address", req: true, full: true },
        { k: "phone", l: "Helpline", req: true },
        { k: "email", l: "E-mail", req: true },
        { k: "hours", l: "Open hours", req: true, full: true },
        { k: "showMap", l: "Show the ward map", t: "select", opts: ["yes", "no"] },
        { k: "showFeedback", l: "Allow feedback", t: "select", opts: ["yes", "no"] },
        { k: "allowOfficerSignup", l: "Allow officers to register themselves",
          t: "select", opts: ["yes", "no"] }
      ], s, data => {
        DB.update("settings", s.id, data);
        Dash.toast("Settings saved. The citizen console follows them immediately.");
      }));
      host.appendChild(card);
      host.appendChild(Dash.card(
        '<h3>What these do</h3><ul class="contact-list">' +
        "<li><b>Ward map</b>Turning it off hides the map and lets a complaint be " +
        "filed without marking a point.</li>" +
        "<li><b>Feedback</b>Turning it off removes the feedback module from the " +
        "citizen console.</li>" +
        "<li><b>Officer self-registration</b>Turning it off removes the officer " +
        "option from the registration page; the cell then creates logins here.</li></ul>"));
    }
  });

  Dash.mount(modules);
}
