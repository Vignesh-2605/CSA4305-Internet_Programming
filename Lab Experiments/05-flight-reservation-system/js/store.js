/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "flight_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Airline Admin",
      "email": "admin@skyroute.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-04-11"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "passport": "N1234567",
      "joined": "2026-06-25"
    }
  ],
  "flights": [
    {
      "id": 1,
      "no": "AI-539",
      "airline": "Air India",
      "from": "Chennai (MAA)",
      "to": "Delhi (DEL)",
      "date": "2026-10-18",
      "dep": "06:20",
      "arr": "09:05",
      "aircraft": "A320neo",
      "terminal": "T1"
    },
    {
      "id": 2,
      "no": "6E-212",
      "airline": "IndiGo",
      "from": "Chennai (MAA)",
      "to": "Mumbai (BOM)",
      "date": "2026-10-18",
      "dep": "11:45",
      "arr": "13:40",
      "aircraft": "A321",
      "terminal": "T1"
    },
    {
      "id": 3,
      "no": "UK-882",
      "airline": "Vistara",
      "from": "Bengaluru (BLR)",
      "to": "Chennai (MAA)",
      "date": "2026-10-19",
      "dep": "18:10",
      "arr": "19:15",
      "aircraft": "ATR 72",
      "terminal": "T2"
    }
  ],
  "fares": [
    {
      "id": 1,
      "flightId": 1,
      "cls": "Economy",
      "fare": 5400,
      "seats": 18,
      "baggage": "15 kg"
    },
    {
      "id": 2,
      "flightId": 1,
      "cls": "Business",
      "fare": 14200,
      "seats": 6,
      "baggage": "30 kg"
    },
    {
      "id": 3,
      "flightId": 2,
      "cls": "Economy",
      "fare": 4100,
      "seats": 24,
      "baggage": "15 kg"
    },
    {
      "id": 4,
      "flightId": 3,
      "cls": "Economy",
      "fare": 2650,
      "seats": 12,
      "baggage": "15 kg"
    },
    {
      "id": 5,
      "flightId": 3,
      "cls": "Premium Economy",
      "fare": 4300,
      "seats": 6,
      "baggage": "20 kg"
    }
  ],
  "tickets": [
    {
      "id": 1,
      "pnr": "AI100137",
      "user": "vignesh.s@gmail.com",
      "flightId": 1,
      "cls": "Economy",
      "journeyDate": "2026-10-18",
      "passengers": [
        {
          "name": "Vignesh S",
          "age": "20",
          "gender": "Male",
          "seat": "1A"
        }
      ],
      "amount": 5400,
      "method": "UPI",
      "mobile": "9876543210",
      "status": "Confirmed",
      "bookedOn": "2026-09-29",
      "refund": 0
    },
    {
      "id": 2,
      "pnr": "AI100274",
      "user": "vignesh.s@gmail.com",
      "flightId": 2,
      "cls": "Economy",
      "journeyDate": "2026-10-18",
      "passengers": [
        {
          "name": "Vignesh S",
          "age": "20",
          "gender": "Male",
          "seat": "2C"
        },
        {
          "name": "Divya R",
          "age": "21",
          "gender": "Female",
          "seat": "2D"
        }
      ],
      "amount": 8200,
      "method": "Credit card",
      "mobile": "9876543210",
      "status": "Confirmed",
      "bookedOn": "2026-10-01",
      "refund": 0
    }
  ],
  "feedback": [
    {
      "id": 1,
      "user": "Divya R",
      "subject": "Smooth check-in",
      "rating": 5,
      "message": "Web check-in and boarding were quick.",
      "date": "2026-09-20"
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
