/* ==========================================================================
   admin.js - Librarian / Admin console
   Modules: catalogue CRUD, issue book, return & fine, fine register,
            study material maintenance.
   ========================================================================== */

const SESSION = Auth.require("admin");
initShell(SESSION);

const LOAN_DAYS = 14;        // borrowing period
const FINE_PER_DAY = 2;      // Rs. charged for every day after the due date

const members = () => DB.all("users").filter(u => u.role === "user");
const activeIssues = () => DB.all("issues").filter(i => !i.returnDate);
const bookTitle = id => (DB.get("books", id) || {}).title || "(removed)";
const lateDays = (iss, upto) => {
  const d = daysBetween(iss.dueDate, upto || today());
  return d > 0 ? d : 0;
};

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "overview", label: "Overview", type: "custom",
    desc: "Live picture of the library.",
    render(host) {
      const books = DB.all("books");
      const issues = DB.all("issues");
      host.appendChild(Dash.stats([
        { n: books.length, l: "Titles in catalogue" },
        { n: books.reduce((s, b) => s + Number(b.available || 0), 0), l: "Copies on shelf" },
        { n: activeIssues().length, l: "Books out on loan" },
        { n: money(issues.reduce((s, i) => s + Number(i.fine || 0), 0)), l: "Fine levied" }
      ]));

      const overdue = activeIssues().filter(i => lateDays(i) > 0);
      const c = Dash.card("<h3>Overdue books</h3><p class='muted'>Fine accrues at " +
        money(FINE_PER_DAY) + " per day after the due date.</p>");
      c.appendChild(Dash.table([
        { k: "book", l: "Book", fmt: r => esc(bookTitle(r.bookId)) },
        { k: "member", l: "Member" },
        { k: "dueDate", l: "Due date" },
        { k: "late", l: "Days late", fmt: r => '<span class="tag bad">' + lateDays(r) + "</span>" },
        { k: "accrued", l: "Fine so far", fmt: r => money(lateDays(r) * FINE_PER_DAY) }
      ], overdue));
      host.appendChild(c);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "books", label: "Books", type: "crud", table: "books",
    desc: "Add, update and delete titles in the catalogue.",
    addLabel: "Add a book",
    fields: [
      { k: "title", l: "Title", req: true },
      { k: "author", l: "Author", req: true },
      { k: "isbn", l: "ISBN", req: true },
      { k: "category", l: "Category", t: "select",
        opts: ["Computer Science", "Mathematics", "Electronics", "Management", "Literature"] },
      { k: "copies", l: "Total copies", t: "number", min: 1, def: 1, req: true },
      { k: "available", l: "Copies available", t: "number", min: 0, def: 1, req: true },
      { k: "shelf", l: "Shelf / rack" }
    ],
    cols: [
      { k: "id", l: "#" },
      { k: "title", l: "Title" },
      { k: "author", l: "Author" },
      { k: "isbn", l: "ISBN" },
      { k: "category", l: "Category" },
      { k: "copies", l: "Copies" },
      { k: "available", l: "Available",
        fmt: r => Number(r.available) > 0
          ? '<span class="tag ok">' + r.available + "</span>"
          : '<span class="tag bad">0</span>' },
      { k: "shelf", l: "Shelf" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "issue", label: "Issue Book", type: "custom",
    desc: "Lend a copy to a registered student. Due date = issue date + " + LOAN_DAYS + " days.",
    render(host) {
      const avail = DB.all("books").filter(b => Number(b.available) > 0);
      const card = Dash.card("<h3>Issue a copy</h3>");

      if (!avail.length || !members().length) {
        card.insertAdjacentHTML("beforeend",
          '<p class="muted">Need at least one available book and one registered student.</p>');
        host.appendChild(card);
        return;
      }

      card.appendChild(Dash.form([
        { k: "bookId", l: "Book", t: "select", req: true,
          opts: avail.map(b => ({ v: b.id, l: b.title + " (" + b.available + " free)" })) },
        { k: "member", l: "Student", t: "select", req: true,
          opts: members().map(m => ({ v: m.email, l: m.name + " - " + m.email })) },
        { k: "issueDate", l: "Issue date", t: "date", def: today(), req: true }
      ], {}, data => {
        const book = DB.get("books", data.bookId);
        if (!book || Number(book.available) < 1) { Dash.toast("No copy available."); return; }
        DB.insert("issues", {
          bookId: Number(data.bookId),
          member: data.member,
          issueDate: data.issueDate,
          dueDate: addDays(data.issueDate, LOAN_DAYS),
          returnDate: "",
          fine: 0,
          paid: false
        });
        DB.update("books", book.id, { available: Number(book.available) - 1 });
        Dash.toast("Issued. Due on " + addDays(data.issueDate, LOAN_DAYS) + ".");
        Dash.show(MODULES.find(m => m.id === "issue"));
      }, null, "Issue book"));
      host.appendChild(card);

      const list = Dash.card("<h3>Currently issued</h3>");
      list.appendChild(Dash.table([
        { k: "id", l: "Issue #" },
        { k: "book", l: "Book", fmt: r => esc(bookTitle(r.bookId)) },
        { k: "member", l: "Student" },
        { k: "issueDate", l: "Issue date" },
        { k: "dueDate", l: "Expiry date" },
        { k: "state", l: "Status", fmt: r => lateDays(r) > 0
            ? '<span class="tag bad">' + lateDays(r) + " days late</span>"
            : '<span class="tag ok">on time</span>' }
      ], activeIssues()));
      host.appendChild(list);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "returns", label: "Return Book", type: "custom",
    desc: "Accept a returned copy; any fine is calculated automatically.",
    render(host) {
      const card = Dash.card("<h3>Books awaiting return</h3>");
      card.appendChild(Dash.table([
        { k: "id", l: "Issue #" },
        { k: "book", l: "Book", fmt: r => esc(bookTitle(r.bookId)) },
        { k: "member", l: "Student" },
        { k: "dueDate", l: "Due date" },
        { k: "fine", l: "Fine payable", fmt: r => money(lateDays(r) * FINE_PER_DAY) }
      ], activeIssues(), r => [{
        label: "Mark returned", cls: "", fn: () => {
          const fine = lateDays(r) * FINE_PER_DAY;
          DB.update("issues", r.id, { returnDate: today(), fine: fine, paid: fine === 0 });
          const b = DB.get("books", r.bookId);
          if (b) DB.update("books", b.id, { available: Number(b.available) + 1 });
          Dash.toast(fine ? "Returned. Fine of " + money(fine) + " raised." : "Returned on time.");
          Dash.show(MODULES.find(m => m.id === "returns"));
        }
      }]));
      host.appendChild(card);

      const done = DB.all("issues").filter(i => i.returnDate);
      const hist = Dash.card("<h3>Return history</h3>");
      hist.appendChild(Dash.table([
        { k: "book", l: "Book", fmt: r => esc(bookTitle(r.bookId)) },
        { k: "member", l: "Student" },
        { k: "issueDate", l: "Issued" },
        { k: "returnDate", l: "Returned" },
        { k: "fine", l: "Fine", fmt: r => money(r.fine) },
        { k: "paid", l: "Payment", fmt: r => Number(r.fine) === 0
            ? '<span class="tag mute">nil</span>'
            : (r.paid ? '<span class="tag ok">paid</span>' : '<span class="tag warn">pending</span>') }
      ], done));
      host.appendChild(hist);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "fines", label: "Make Fine", type: "custom",
    desc: "Fine register - raise, waive or collect fines.",
    render(host) {
      const all = DB.all("issues").filter(i => Number(i.fine) > 0 || lateDays(i) > 0);
      const pending = all.filter(i => !i.paid);
      host.appendChild(Dash.stats([
        { n: money(all.reduce((s, i) => s + Number(i.fine || 0), 0)), l: "Total fine raised" },
        { n: money(pending.reduce((s, i) => s + Number(i.fine || lateDays(i) * FINE_PER_DAY), 0)), l: "Outstanding" },
        { n: pending.length, l: "Students with dues" }
      ]));

      const card = Dash.card("<h3>Fine register</h3>");
      card.appendChild(Dash.table([
        { k: "member", l: "Student" },
        { k: "book", l: "Book", fmt: r => esc(bookTitle(r.bookId)) },
        { k: "dueDate", l: "Due date" },
        { k: "late", l: "Days late", fmt: r => r.returnDate
            ? daysBetween(r.dueDate, r.returnDate) > 0 ? daysBetween(r.dueDate, r.returnDate) : 0
            : lateDays(r) },
        { k: "amount", l: "Fine", fmt: r => money(r.fine || lateDays(r) * FINE_PER_DAY) },
        { k: "paid", l: "Status", fmt: r => r.paid
            ? '<span class="tag ok">paid</span>' : '<span class="tag warn">pending</span>' }
      ], all, r => r.paid ? [] : [
        { label: "Collect", cls: "", fn: () => {
            DB.update("issues", r.id, { fine: r.fine || lateDays(r) * FINE_PER_DAY, paid: true });
            Dash.toast("Fine collected."); Dash.show(MODULES.find(m => m.id === "fines"));
          } },
        { label: "Waive", cls: "flat", fn: () => {
            DB.update("issues", r.id, { fine: 0, paid: true });
            Dash.toast("Fine waived."); Dash.show(MODULES.find(m => m.id === "fines"));
          } }
      ]));
      host.appendChild(card);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "materials", label: "Study Material", type: "crud", table: "materials",
    desc: "Upload year / semester wise study material for students.",
    addLabel: "Add study material",
    fields: [
      { k: "title", l: "Title", req: true },
      { k: "subject", l: "Subject", req: true },
      { k: "year", l: "Year", t: "select", opts: ["I", "II", "III", "IV"] },
      { k: "semester", l: "Semester", t: "select", opts: ["1", "2", "3", "4", "5", "6", "7", "8"] },
      { k: "type", l: "Type", t: "select", opts: ["Notes", "Question bank", "Lab manual", "Syllabus"] },
      { k: "file", l: "File name / link", req: true, full: true }
    ],
    cols: [
      { k: "id", l: "#" },
      { k: "title", l: "Title" },
      { k: "subject", l: "Subject" },
      { k: "year", l: "Year" },
      { k: "semester", l: "Sem" },
      { k: "type", l: "Type" },
      { k: "file", l: "File" }
    ]
  },

  /* ------------------------------------------------------------------ */
  {
    id: "studentlist", label: "Students", type: "custom",
    desc: "Registered members and their borrowing position.",
    render(host) {
      const card = Dash.card("<h3>Registered students</h3>");
      card.appendChild(Dash.table([
        { k: "name", l: "Name" },
        { k: "email", l: "E-mail" },
        { k: "regno", l: "Register no." },
        { k: "joined", l: "Joined" },
        { k: "out", l: "Books held",
          fmt: r => activeIssues().filter(i => i.member === r.email).length },
        { k: "due", l: "Fine due", fmt: r => money(DB.all("issues")
            .filter(i => i.member === r.email && !i.paid)
            .reduce((s, i) => s + Number(i.fine || lateDays(i) * FINE_PER_DAY), 0)) }
      ], members()));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
