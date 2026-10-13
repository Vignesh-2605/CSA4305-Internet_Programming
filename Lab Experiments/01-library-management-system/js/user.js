/* ==========================================================================
   user.js - Student console
   Modules: book search, borrow history, fines, study material, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

const FINE_PER_DAY = 2;
const myIssues = () => DB.all("issues").filter(i => i.member === SESSION.email);
const bookOf = id => DB.get("books", id) || { title: "(removed)", author: "-" };
const lateDays = iss => {
  const d = daysBetween(iss.dueDate, iss.returnDate || today());
  return d > 0 ? d : 0;
};

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search Book", type: "custom",
    desc: "Search the catalogue by title, author, ISBN or category.",
    render(host) {
      const card = Dash.card(
        '<h3>Catalogue search</h3>' +
        '<div class="form-row">' +
        '  <div class="field"><label>Keyword</label>' +
        '    <input id="q" placeholder="title, author or ISBN"></div>' +
        '  <div class="field"><label>Category</label><select id="cat">' +
        '    <option value="">All categories</option>' +
        [...new Set(DB.all("books").map(b => b.category))]
          .map(c => '<option>' + esc(c) + "</option>").join("") +
        '  </select></div>' +
        '  <div class="field"><label>Show</label><select id="only">' +
        '    <option value="">All copies</option><option value="1">Only available</option>' +
        '  </select></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const cat = card.querySelector("#cat").value;
        const only = card.querySelector("#only").value;
        const rows = DB.all("books").filter(b =>
          (!q || (b.title + b.author + b.isbn).toLowerCase().includes(q)) &&
          (!cat || b.category === cat) &&
          (!only || Number(b.available) > 0));
        out.innerHTML = '<p class="muted">' + rows.length + " title(s) found.</p>";
        out.appendChild(Dash.table([
          { k: "title", l: "Title" },
          { k: "author", l: "Author" },
          { k: "isbn", l: "ISBN" },
          { k: "category", l: "Category" },
          { k: "shelf", l: "Shelf" },
          { k: "available", l: "Status", fmt: r => Number(r.available) > 0
              ? '<span class="tag ok">' + r.available + " available</span>"
              : '<span class="tag bad">all issued</span>' }
        ], rows));
      };

      card.querySelector("#q").oninput = paint;
      card.querySelector("#cat").onchange = paint;
      card.querySelector("#only").onchange = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "history", label: "My Borrow History", type: "custom",
    desc: "Every book you have borrowed, with issue date and expiry date.",
    render(host) {
      const mine = myIssues();
      host.appendChild(Dash.stats([
        { n: mine.filter(i => !i.returnDate).length, l: "Books with me now" },
        { n: mine.length, l: "Borrowed all time" },
        { n: mine.filter(i => lateDays(i) > 0).length, l: "Late returns" }
      ]));
      const card = Dash.card("<h3>Borrowing history</h3>");
      card.appendChild(Dash.table([
        { k: "book", l: "Book", fmt: r => esc(bookOf(r.bookId).title) },
        { k: "author", l: "Author", fmt: r => esc(bookOf(r.bookId).author) },
        { k: "issueDate", l: "Issue date" },
        { k: "dueDate", l: "Expiry date" },
        { k: "returnDate", l: "Returned on", fmt: r => r.returnDate || "-" },
        { k: "status", l: "Status", fmt: r => r.returnDate
            ? '<span class="tag mute">returned</span>'
            : (lateDays(r) > 0
                ? '<span class="tag bad">overdue by ' + lateDays(r) + " d</span>"
                : '<span class="tag ok">with me</span>') }
      ], mine));
      host.appendChild(card);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "fine", label: "Check Fine", type: "custom",
    desc: "Fine is Rs." + FINE_PER_DAY + " for each day a book is kept past its expiry date.",
    render(host) {
      const rows = myIssues().filter(i => Number(i.fine) > 0 || lateDays(i) > 0);
      const due = rows.filter(r => !r.paid)
        .reduce((s, r) => s + Number(r.fine || lateDays(r) * FINE_PER_DAY), 0);

      host.appendChild(Dash.stats([
        { n: money(due), l: "Amount payable" },
        { n: rows.length, l: "Fine entries" }
      ]));

      const card = Dash.card("<h3>Fine details</h3>");
      card.appendChild(Dash.table([
        { k: "book", l: "Book", fmt: r => esc(bookOf(r.bookId).title) },
        { k: "dueDate", l: "Expiry date" },
        { k: "late", l: "Days late", fmt: r => lateDays(r) },
        { k: "amount", l: "Fine", fmt: r => money(r.fine || lateDays(r) * FINE_PER_DAY) },
        { k: "paid", l: "Status", fmt: r => r.paid
            ? '<span class="tag ok">paid</span>' : '<span class="tag warn">pending</span>' }
      ], rows, r => r.paid ? [] : [{
        label: "Pay now", cls: "", fn: () => {
          DB.update("issues", r.id, { fine: r.fine || lateDays(r) * FINE_PER_DAY, paid: true });
          Dash.toast("Payment recorded.");
          Dash.show(MODULES.find(m => m.id === "fine"));
        }
      }]));
      host.appendChild(card);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "material", label: "Study Material", type: "custom",
    desc: "Search material year and semester wise, then download.",
    render(host) {
      const card = Dash.card(
        "<h3>Find study material</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Year</label><select id="yr">' +
        '    <option value="">All years</option><option>I</option><option>II</option>' +
        '    <option>III</option><option>IV</option></select></div>' +
        '  <div class="field"><label>Semester</label><select id="sem">' +
        '    <option value="">All semesters</option>' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(n => "<option>" + n + "</option>").join("") +
        '  </select></div>' +
        '  <div class="field"><label>Keyword</label><input id="q" placeholder="subject or title"></div>' +
        "</div>");
      host.appendChild(card);

      const out = document.createElement("div");
      host.appendChild(out);

      const paint = () => {
        const yr = card.querySelector("#yr").value;
        const sem = card.querySelector("#sem").value;
        const q = card.querySelector("#q").value.toLowerCase().trim();
        const rows = DB.all("materials").filter(m =>
          (!yr || m.year === yr) && (!sem || String(m.semester) === sem) &&
          (!q || (m.title + m.subject).toLowerCase().includes(q)));
        out.innerHTML = "";
        out.appendChild(Dash.table([
          { k: "title", l: "Title" },
          { k: "subject", l: "Subject" },
          { k: "year", l: "Year" },
          { k: "semester", l: "Sem" },
          { k: "type", l: "Type" }
        ], rows, r => [{
          label: "Download", cls: "flat",
          fn: () => Dash.toast("Downloading " + r.file + " ...")
        }]));
      };

      card.querySelector("#yr").onchange = paint;
      card.querySelector("#sem").onchange = paint;
      card.querySelector("#q").oninput = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "Your membership details.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "regno", l: "Register number" },
        { k: "phone", l: "Phone" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, regno: data.regno, phone: data.phone, password: data.password
        });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Profile updated.");
        location.reload();
      }, null, "Update profile"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
