/* ==========================================================================
   dash.js - dashboard engine shared by the admin and user consoles
   Builds the side menu, renders generic CRUD modules and offers small
   helpers (forms, tables, toasts) that the custom modules reuse.
   ========================================================================== */

const Dash = {

  /* ---- bootstrap ------------------------------------------------------ */
  mount(modules) {
    const nav = document.getElementById("dash-nav");
    nav.innerHTML = "";
    modules.forEach((m, i) => {
      const b = document.createElement("button");
      b.className = "side-link" + (i === 0 ? " active" : "");
      b.textContent = m.label;
      b.onclick = () => {
        nav.querySelectorAll(".side-link").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        this.show(m);
      };
      nav.appendChild(b);
    });
    if (modules.length) this.show(modules[0]);
  },

  show(m) {
    const host = document.getElementById("dash-view");
    host.innerHTML =
      '<div class="view-head"><h2>' + esc(m.label) + "</h2>" +
      (m.desc ? '<p class="muted">' + esc(m.desc) + "</p>" : "") + "</div>";
    const body = document.createElement("div");
    body.className = "stack";
    host.appendChild(body);
    if (m.type === "crud") this.crud(m, body);
    else m.render(body);
  },

  /* ---- generic add / edit / delete module ----------------------------- */
  crud(m, host) {
    let editId = null;

    const formCard = document.createElement("div");
    formCard.className = "card";
    const tableCard = document.createElement("div");

    const paint = () => {
      formCard.innerHTML = "<h3>" + (editId ? "Edit record" : (m.addLabel || "Add new record")) + "</h3>";
      const values = editId ? DB.get(m.table, editId) : {};
      formCard.appendChild(this.form(m.fields, values, (data, form) => {
        if (editId) { DB.update(m.table, editId, data); editId = null; this.toast("Record updated."); }
        else { DB.insert(m.table, data); form.reset(); this.toast("Record added."); }
        paint();
      }, editId ? () => { editId = null; paint(); } : null));

      const rows = m.rows ? m.rows() : DB.all(m.table);
      tableCard.innerHTML = "";
      tableCard.appendChild(this.table(m.cols, rows, r => [
        { label: "Edit", cls: "flat", fn: () => { editId = r.id; paint(); window.scrollTo({ top: 0, behavior: "smooth" }); } },
        { label: "Delete", cls: "danger", fn: () => {
            if (confirm("Delete this record?")) { DB.remove(m.table, r.id); this.toast("Record deleted."); paint(); }
          } }
      ]));
    };

    host.appendChild(formCard);
    host.appendChild(tableCard);
    paint();
  },

  /* ---- form builder ---------------------------------------------------- */
  /* fields: [{ k, l, t:"text|number|date|time|select|textarea|password",
                opts:[...], req:true, step, min, help }] */
  form(fields, values, onSubmit, onCancel, submitLabel) {
    const f = document.createElement("form");
    const row = document.createElement("div");
    row.className = "form-row";
    f.appendChild(row);

    fields.forEach(fd => {
      const v = values && values[fd.k] !== undefined ? values[fd.k] : (fd.def !== undefined ? fd.def : "");
      const wrap = document.createElement("div");
      wrap.className = "field";
      if (fd.full) { wrap.style.gridColumn = "1 / -1"; }
      let input;
      if (fd.t === "select") {
        input = document.createElement("select");
        (fd.opts || []).forEach(o => {
          const val = typeof o === "object" ? o.v : o;
          const lab = typeof o === "object" ? o.l : o;
          const op = document.createElement("option");
          op.value = val; op.textContent = lab;
          if (String(val) === String(v)) op.selected = true;
          input.appendChild(op);
        });
      } else if (fd.t === "textarea") {
        input = document.createElement("textarea");
        input.value = v;
      } else {
        input = document.createElement("input");
        input.type = fd.t || "text";
        input.value = v;
        if (fd.step) input.step = fd.step;
        if (fd.min !== undefined) input.min = fd.min;
      }
      input.name = fd.k;
      if (fd.req) input.required = true;
      if (fd.ro) input.readOnly = true;
      wrap.innerHTML = "<label>" + esc(fd.l) + (fd.req ? " *" : "") + "</label>";
      wrap.appendChild(input);
      if (fd.help) wrap.insertAdjacentHTML("beforeend", '<div class="muted">' + esc(fd.help) + "</div>");
      row.appendChild(wrap);
    });

    const actions = document.createElement("div");
    actions.className = "form-actions";
    actions.innerHTML = '<button class="btn" type="submit">' + (submitLabel || "Save") + "</button>";
    if (onCancel) {
      const c = document.createElement("button");
      c.type = "button"; c.className = "btn flat"; c.textContent = "Cancel";
      c.onclick = onCancel;
      actions.appendChild(c);
    }
    f.appendChild(actions);

    f.onsubmit = e => {
      e.preventDefault();
      const data = {};
      fields.forEach(fd => {
        /* look the control up by name rather than through form.elements:
           names like "item" or "length" collide with the collection's own
           methods and would come back as a function instead of an input. */
        const el = f.querySelector('[name="' + fd.k + '"]');
        let val = el ? String(el.value).trim() : "";
        if (fd.t === "number") val = val === "" ? 0 : Number(val);
        data[fd.k] = val;
      });
      onSubmit(data, f);
    };
    return f;
  },

  /* ---- table builder --------------------------------------------------- */
  /* cols: [{ k, l, fmt(row) }]   actions: row => [{label, cls, fn}] */
  table(cols, rows, actions) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    if (!rows || !rows.length) {
      wrap.innerHTML = '<div class="empty">No records yet.</div>';
      return wrap;
    }
    const t = document.createElement("table");
    t.innerHTML = "<thead><tr>" + cols.map(c => "<th>" + esc(c.l) + "</th>").join("") +
      (actions ? "<th>Actions</th>" : "") + "</tr></thead>";
    const tb = document.createElement("tbody");
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = cols.map(c => "<td>" + (c.fmt ? c.fmt(r) : esc(r[c.k])) + "</td>").join("");
      if (actions) {
        const td = document.createElement("td");
        td.className = "actions";
        (actions(r) || []).forEach(a => {
          const b = document.createElement("button");
          b.className = "btn sm " + (a.cls || "flat");
          b.textContent = a.label;
          b.onclick = a.fn;
          td.appendChild(b);
        });
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  },

  /* ---- misc ----------------------------------------------------------- */
  card(html) {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = html;
    return d;
  },

  stats(items) {
    const g = document.createElement("div");
    g.className = "grid c4";
    g.innerHTML = items.map(i =>
      '<div class="stat"><div class="n">' + i.n + '</div><div class="l">' + esc(i.l) + "</div></div>").join("");
    return g;
  },

  toast(msg) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const d = document.createElement("div");
    d.className = "toast";
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }
};

/* Fills the "signed in as" box and wires the logout / reset buttons. */
function initShell(session) {
  const who = document.getElementById("who");
  if (who) {
    who.innerHTML = "<b>" + esc(session.name) + "</b>" +
      '<span class="muted">' + esc(session.email) + " &middot; " + esc(session.role) + "</span>";
  }
  const out = document.getElementById("logout");
  if (out) out.onclick = () => Auth.logout();
  const rst = document.getElementById("reset-data");
  if (rst) rst.onclick = () => {
    if (confirm("Reset all data back to the starting sample records?")) { DB.reset(); location.reload(); }
  };
}
