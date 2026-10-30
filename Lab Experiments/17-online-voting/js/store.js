/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "voteonline_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Returning Officer",
      "email": "admin@voteonline.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-02-01"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "voterId": "TN0042118",
      "ward": "Ward 2",
      "joined": "2026-03-04"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "voterId": "TN0042119",
      "ward": "Ward 2",
      "joined": "2026-03-04"
    },
    {
      "id": 4,
      "name": "Karthik M",
      "email": "karthik.m@gmail.com",
      "password": "karthik1",
      "role": "user",
      "voterId": "TN0042120",
      "ward": "Ward 3",
      "joined": "2026-03-06"
    }
  ],
  "elections": [
    {
      "id": 1,
      "name": "Ward 2 councillor election",
      "type": "Municipal ward",
      "ward": "Ward 2",
      "date": "2026-10-30",
      "status": "Open",
      "question": "Who should represent Ward 2 on the corporation council?",
      "createdOn": "2026-10-10"
    },
    {
      "id": 2,
      "name": "Residents association secretary",
      "type": "Residents association",
      "ward": "All wards",
      "date": "2026-09-20",
      "status": "Closed",
      "question": "Who should serve as secretary for the coming year?",
      "createdOn": "2026-09-01",
      "closedOn": "2026-09-20"
    },
    {
      "id": 3,
      "name": "Ward 3 councillor election",
      "type": "Municipal ward",
      "ward": "Ward 3",
      "date": "2026-11-12",
      "status": "Upcoming",
      "question": "Who should represent Ward 3?",
      "createdOn": "2026-10-22"
    }
  ],
  "candidates": [
    {
      "id": 1,
      "electionId": 1,
      "name": "Anitha Selvam",
      "party": "Civic Forum",
      "symbol": "Lamp",
      "manifesto": "Storm water drains and street lighting first."
    },
    {
      "id": 2,
      "electionId": 1,
      "name": "Mohan Das",
      "party": "Ward Welfare Group",
      "symbol": "Tree",
      "manifesto": "Parks, waste segregation and a ward library."
    },
    {
      "id": 3,
      "electionId": 1,
      "name": "Fatima Begum",
      "party": "Independent",
      "symbol": "Book",
      "manifesto": "Better schools and a weekly grievance camp."
    },
    {
      "id": 4,
      "electionId": 2,
      "name": "Ramesh Iyer",
      "party": "Block A",
      "symbol": "Key",
      "manifesto": "Transparent accounts and a working lift contract."
    },
    {
      "id": 5,
      "electionId": 2,
      "name": "Priya Nandakumar",
      "party": "Block C",
      "symbol": "Bell",
      "manifesto": "Security, water tankers and a repair fund."
    },
    {
      "id": 6,
      "electionId": 3,
      "name": "Suresh Babu",
      "party": "Civic Forum",
      "symbol": "Lamp",
      "manifesto": "Road resurfacing across the ward."
    },
    {
      "id": 7,
      "electionId": 3,
      "name": "Lakshmi Devi",
      "party": "Independent",
      "symbol": "Pot",
      "manifesto": "Piped water to every street by next summer."
    }
  ],
  "votes": [
    {
      "id": 1,
      "electionId": 2,
      "candidateId": 4,
      "voter": "vignesh.s@gmail.com",
      "at": "2026-09-20",
      "receipt": "VT-700053"
    },
    {
      "id": 2,
      "electionId": 2,
      "candidateId": 5,
      "voter": "divya.r@gmail.com",
      "at": "2026-09-20",
      "receipt": "VT-700106"
    },
    {
      "id": 3,
      "electionId": 2,
      "candidateId": 4,
      "voter": "karthik.m@gmail.com",
      "at": "2026-09-20",
      "receipt": "VT-700159"
    }
  ],
  "otps": []
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
