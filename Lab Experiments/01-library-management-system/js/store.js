/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "lms_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Library Admin",
      "email": "librarian@campuslib.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-06-01"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "regno": "21CS1042",
      "phone": "9876543210",
      "joined": "2026-06-10"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "regno": "21CS1057",
      "phone": "9876500011",
      "joined": "2026-07-02"
    }
  ],
  "books": [
    {
      "id": 1,
      "title": "Internet & World Wide Web: How to Program",
      "author": "Deitel",
      "isbn": "978-0132151009",
      "category": "Computer Science",
      "copies": 4,
      "available": 2,
      "shelf": "CS-A1"
    },
    {
      "id": 2,
      "title": "Operating System Concepts",
      "author": "Silberschatz",
      "isbn": "978-1118063330",
      "category": "Computer Science",
      "copies": 3,
      "available": 3,
      "shelf": "CS-A2"
    },
    {
      "id": 3,
      "title": "Numerical Methods",
      "author": "S. S. Sastry",
      "isbn": "978-8120327610",
      "category": "Mathematics",
      "copies": 2,
      "available": 1,
      "shelf": "MA-B1"
    },
    {
      "id": 4,
      "title": "Introduction to Algorithms",
      "author": "Cormen",
      "isbn": "978-0262046305",
      "category": "Computer Science",
      "copies": 2,
      "available": 2,
      "shelf": "CS-A3"
    },
    {
      "id": 5,
      "title": "Digital Electronics",
      "author": "Morris Mano",
      "isbn": "978-9332535770",
      "category": "Electronics",
      "copies": 3,
      "available": 3,
      "shelf": "EC-C1"
    },
    {
      "id": 6,
      "title": "Principles of Management",
      "author": "Koontz",
      "isbn": "978-9339222864",
      "category": "Management",
      "copies": 2,
      "available": 2,
      "shelf": "MG-D1"
    }
  ],
  "issues": [
    {
      "id": 1,
      "bookId": 1,
      "member": "vignesh.s@gmail.com",
      "issueDate": "2026-09-05",
      "dueDate": "2026-09-19",
      "returnDate": "2026-09-17",
      "fine": 0,
      "paid": true
    },
    {
      "id": 2,
      "bookId": 1,
      "member": "divya.r@gmail.com",
      "issueDate": "2026-09-20",
      "dueDate": "2026-10-04",
      "returnDate": "",
      "fine": 0,
      "paid": false
    },
    {
      "id": 3,
      "bookId": 3,
      "member": "vignesh.s@gmail.com",
      "issueDate": "2026-09-28",
      "dueDate": "2026-10-12",
      "returnDate": "",
      "fine": 0,
      "paid": false
    }
  ],
  "materials": [
    {
      "id": 1,
      "title": "Data Structures - unit 1 notes",
      "subject": "Data Structures",
      "year": "III",
      "semester": "5",
      "type": "Notes",
      "file": "ds-unit1.pdf"
    },
    {
      "id": 2,
      "title": "Database Systems question bank",
      "subject": "Database Systems",
      "year": "II",
      "semester": "4",
      "type": "Question bank",
      "file": "dbms-qb.pdf"
    },
    {
      "id": 3,
      "title": "Computer Networks lab manual",
      "subject": "Computer Networks",
      "year": "II",
      "semester": "3",
      "type": "Lab manual",
      "file": "cn-lab.pdf"
    },
    {
      "id": 4,
      "title": "Software Engineering syllabus",
      "subject": "Software Engineering",
      "year": "III",
      "semester": "6",
      "type": "Syllabus",
      "file": "se-syllabus.pdf"
    }
  ]
};

const DB = {
  read() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { return null; }
  },
  write(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); },
  init() {
    let d = this.read();
    if (!d) { d = JSON.parse(JSON.stringify(SEED)); this.write(d); }
    return d;
  },
  all(table) { const d = this.init(); return d[table] || []; },
  set(table, rows) { const d = this.init(); d[table] = rows; this.write(d); },
  get(table, id) { return this.all(table).find(r => String(r.id) === String(id)); },
  find(table, fn) { return this.all(table).filter(fn); },
  nextId(table) {
    const rows = this.all(table);
    return rows.length ? Math.max(...rows.map(r => Number(r.id) || 0)) + 1 : 1;
  },
  insert(table, row) {
    const rows = this.all(table);
    if (row.id === undefined || row.id === "") row.id = this.nextId(table);
    rows.push(row); this.set(table, rows); return row;
  },
  update(table, id, patch) {
    this.set(table, this.all(table).map(r =>
      String(r.id) === String(id) ? Object.assign({}, r, patch) : r));
  },
  remove(table, id) {
    this.set(table, this.all(table).filter(r => String(r.id) !== String(id)));
  },
  reset() { localStorage.removeItem(DB_KEY); this.init(); }
};

DB.init();

/* ------------------------- small shared helpers ------------------------- */
const money = n => "Rs." + Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, n) => {
  const d = new Date(date); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);
const esc = s => String(s === undefined || s === null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
