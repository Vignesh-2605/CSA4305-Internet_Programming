/* ==========================================================================
   user.js - the citizen console
   ========================================================================== */

const S = Auth.require("user");
if (S) {
  initShell(S);
  const me = () => DB.all("users").find(u => u.email === S.email) || {};
  const mine = () => DB.all("complaints").filter(c => c.user === S.email)
                       .sort((a, b) => b.id - a.id);

  const modules = [];

  /* ---------------------------------------------------- post a complaint */
  modules.push({
    label: "Post a complaint", desc: "Tell us what is wrong and where it is.",
    render(host) {
      let pin = null;
      const card = Dash.card("<h3>New complaint</h3>");
      const depts = DB.all("departments");

      const form = Dash.form([
        { k: "dept", l: "Department", t: "select", req: true,
          opts: depts.map(d => ({ v: d.name, l: d.name + " (" + d.sla + " day target)" })) },
        { k: "priority", l: "How urgent is it", t: "select",
          opts: ["Low", "Medium", "High"], def: "Medium" },
        { k: "subject", l: "One line summary", req: true, full: true },
        { k: "landmark", l: "Nearest landmark", req: true },
        { k: "ward", l: "Ward", def: me().ward || "", req: true },
        { k: "detail", l: "What is the problem", t: "textarea", req: true, full: true },
        { k: "photo", l: "Photograph (file name)", full: true,
          help: "Attach the picture at the office counter, or type the file name here." }
      ], {}, data => {
        if (settings().showMap === "yes" && !pin) {
          Dash.toast("Mark the spot on the map before sending.");
          return;
        }
        const rec = Object.assign({}, data, {
          ref: refNo(), user: S.email, status: "Registered",
          officer: "", filedOn: today(), notes: "",
          x: pin ? pin.x : 50, y: pin ? pin.y : 35
        });
        DB.insert("complaints", rec);
        Dash.toast("Complaint registered. Your reference is " + rec.ref + ".");
        Dash.show(modules[1]);
        document.querySelectorAll("#dash-nav .side-link").forEach((b, i) =>
          b.classList.toggle("active", i === 1));
      }, null, "Send the complaint");

      card.appendChild(form);
      host.appendChild(card);

      if (settings().showMap === "yes") {
        host.appendChild(wardMap({
          title: "Mark the location",
          onPick: p => { pin = p; }
        }));
      }
    }
  });

  /* ------------------------------------------------------- my complaints */
  modules.push({
    label: "My complaints", desc: "Where each one has got to.",
    render(host) {
      const rows = mine();
      if (!rows.length) {
        host.appendChild(Dash.card('<div class="empty">You have not posted a complaint yet.</div>'));
        return;
      }

      rows.forEach(c => {
        const d = DB.all("departments").find(d => d.name === c.dept) || {};
        const off = DB.all("users").find(u => u.email === c.officer);
        const steps = FLOW.slice(0, 4).map(s => {
          const at = FLOW.indexOf(c.status) >= FLOW.indexOf(s);
          return '<li style="opacity:' + (at ? 1 : .35) + '"><b>' + esc(s) + "</b>" +
                 (s === "Registered" ? esc(c.filedOn)
                  : s === "Assigned" ? esc(c.assignedOn || "-")
                  : s === "Resolved" ? esc(c.resolvedOn || "-") : (at ? "done" : "-")) +
                 "</li>";
        }).join("");

        const card = Dash.card(
          '<div class="view-head" style="margin:0 0 .4rem"><h3 style="margin:0">' +
            esc(c.subject) + "</h3>" +
            '<p class="muted" style="margin:.2rem 0 0">' + esc(c.ref) + " &middot; " +
            esc(c.dept) + " &middot; filed " + esc(c.filedOn) + "</p></div>" +
          badge(c.status) +
          (overdue(c) ? ' <span class="tag bad">past the ' + esc(d.sla) +
                        " day target</span>" : "") +
          '<p style="margin:.7rem 0 0">' + esc(c.detail) + "</p>" +
          '<p class="meta" style="margin:.4rem 0 0">' + esc(c.landmark) + " &middot; " +
            esc(c.ward) + (c.photo ? " &middot; " + esc(c.photo) : "") + "</p>" +
          '<ul class="contact-list" style="margin-top:.7rem">' + steps + "</ul>" +
          (off ? '<p class="meta" style="margin:.5rem 0 0"><b>Officer</b> ' +
                 esc(off.name) + " (" + esc(off.dept) + "), " + esc(off.phone || "-") +
                 "</p>" : "") +
          (c.notes ? '<p class="meta" style="margin:.4rem 0 0"><b>Action taken</b> ' +
                     esc(c.notes) + "</p>" : "") +
          (c.proof ? '<p class="meta" style="margin:.4rem 0 0"><b>Proof of work</b> ' +
                     esc(c.proof) + (c.proofPhoto ? " (" + esc(c.proofPhoto) + ")" : "") +
                     "</p>" : ""));

        if (c.status === "Resolved") {
          const b = document.createElement("button");
          b.className = "btn sm";
          b.style.marginTop = ".7rem";
          b.textContent = "This is fixed, close it";
          b.onclick = () => {
            DB.update("complaints", c.id, { status: "Closed", closedOn: today() });
            Dash.toast("Complaint closed. Thank you.");
            Dash.show(modules[1]);
          };
          card.appendChild(b);

          const r = document.createElement("button");
          r.className = "btn sm flat";
          r.style.cssText = "margin:.7rem 0 0 .4rem";
          r.textContent = "Not fixed, reopen";
          r.onclick = () => {
            DB.update("complaints", c.id, {
              status: "In progress", resolvedOn: "",
              notes: (c.notes ? c.notes + " " : "") + "[Reopened by the complainant on " + today() + "]"
            });
            Dash.toast("Reopened and sent back to the officer.");
            Dash.show(modules[1]);
          };
          card.appendChild(r);
        }
        host.appendChild(card);
      });

      if (settings().showMap === "yes") {
        host.appendChild(wardMap({
          title: "Your complaints on the map",
          pins: rows.map(c => ({ x: c.x, y: c.y, label: c.ref.slice(-3), status: c.status }))
        }));
      }
    }
  });

  /* ------------------------------------------------------------ feedback */
  if (settings().showFeedback === "yes") {
    modules.push({
      label: "Feedback", desc: "Rate a complaint once it has been closed out.",
      render(host) {
        const done = mine().filter(c => c.status === "Resolved" || c.status === "Closed");
        const given = DB.all("feedback").filter(f => f.user === S.email).map(f => f.ref);
        const open = done.filter(c => given.indexOf(c.ref) < 0);

        const card = Dash.card("<h3>Leave feedback</h3>");
        if (!open.length) {
          card.innerHTML += '<div class="empty">Nothing waiting for feedback. ' +
            "Feedback can be left once a complaint is resolved.</div>";
        } else {
          card.appendChild(Dash.form([
            { k: "ref", l: "Complaint", t: "select", req: true,
              opts: open.map(c => ({ v: c.ref, l: c.ref + " - " + c.subject })) },
            { k: "rating", l: "Out of five", t: "select", req: true,
              opts: [5, 4, 3, 2, 1] },
            { k: "comment", l: "Anything to add", t: "textarea", full: true }
          ], {}, data => {
            DB.insert("feedback", Object.assign({}, data, {
              user: S.email, rating: Number(data.rating), on: today() }));
            Dash.toast("Thank you for the feedback.");
            Dash.show(modules[2]);
          }, null, "Send feedback"));
        }
        host.appendChild(card);

        const mineFb = DB.all("feedback").filter(f => f.user === S.email);
        if (mineFb.length) {
          const t = Dash.card("<h3>What you have already sent</h3>");
          t.appendChild(Dash.table([
            { k: "ref", l: "Complaint" },
            { k: "rating", l: "Rating", fmt: r => "&starf;".repeat(r.rating) },
            { k: "comment", l: "Comment" },
            { k: "on", l: "Sent" }
          ], mineFb));
          host.appendChild(t);
        }
      }
    });
  }

  /* -------------------------------------------------------------- office */
  modules.push({
    label: "Notices and office", desc: "Who to contact and what is going on.",
    render(host) {
      const s = settings();
      host.appendChild(Dash.card(
        "<h3>Grievance cell</h3>" +
        '<ul class="contact-list">' +
          "<li><b>Office</b>" + esc(s.office) + "</li>" +
          "<li><b>Helpline</b>" + esc(s.phone) + "</li>" +
          "<li><b>E-mail</b>" + esc(s.email) + "</li>" +
          "<li><b>Open</b>" + esc(s.hours) + "</li>" +
        "</ul>"));

      const n = Dash.card("<h3>Notices</h3>");
      n.innerHTML += DB.all("notices").sort((a, b) => b.id - a.id).map(x =>
        '<div style="padding:.6rem 0;border-top:1px solid var(--border)">' +
        "<b>" + esc(x.title) + '</b><div class="muted">' + esc(x.on) + "</div>" +
        "<p style='margin:.3rem 0 0'>" + esc(x.body) + "</p></div>").join("");
      host.appendChild(n);

      const d = Dash.card("<h3>Departments and their targets</h3>");
      d.appendChild(Dash.table([
        { k: "name", l: "Department" },
        { k: "sla", l: "Target", fmt: r => r.sla + " days" },
        { k: "about", l: "What it covers" }
      ], DB.all("departments")));
      host.appendChild(d);
    }
  });

  /* ------------------------------------------------------------- profile */
  modules.push({
    label: "My details", desc: "Keep your contact details current.",
    render(host) {
      const u = me();
      const card = Dash.card("<h3>My details</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "phone", l: "Mobile number", req: true },
        { k: "ward", l: "Ward", req: true },
        { k: "password", l: "Password", t: "password", req: true }
      ], u, data => {
        DB.update("users", u.id, data);
        Dash.toast("Details saved.");
      }));
      host.appendChild(card);
    }
  });

  Dash.mount(modules);
}
