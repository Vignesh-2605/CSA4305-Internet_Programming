/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "train_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Railway Admin",
      "email": "admin@raildesk.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-04-20"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "idproof": "XXXX1234",
      "joined": "2026-06-21"
    }
  ],
  "trains": [
    {
      "id": 1,
      "number": "12635",
      "name": "Vaigai Express",
      "from": "Chennai Egmore",
      "to": "Madurai",
      "via": "Villupuram, Tiruchirappalli",
      "zone": "SR",
      "date": "2026-10-18",
      "depTime": "13:40",
      "arrTime": "21:45"
    },
    {
      "id": 2,
      "number": "12671",
      "name": "Nilagiri Express",
      "from": "Chennai Central",
      "to": "Coimbatore",
      "via": "Salem, Erode",
      "zone": "SR",
      "date": "2026-10-18",
      "depTime": "21:15",
      "arrTime": "05:40"
    },
    {
      "id": 3,
      "number": "16128",
      "name": "Guruvayur Express",
      "from": "Chennai Egmore",
      "to": "Guruvayur",
      "via": "Tiruchirappalli, Thrissur",
      "zone": "SR",
      "date": "2026-10-19",
      "depTime": "07:25",
      "arrTime": "19:05"
    }
  ],
  "fares": [
    {
      "id": 1,
      "trainId": 1,
      "cls": "SL",
      "fare": 285,
      "seats": 8
    },
    {
      "id": 2,
      "trainId": 1,
      "cls": "3A",
      "fare": 760,
      "seats": 6
    },
    {
      "id": 3,
      "trainId": 2,
      "cls": "SL",
      "fare": 340,
      "seats": 10
    },
    {
      "id": 4,
      "trainId": 2,
      "cls": "3A",
      "fare": 905,
      "seats": 6
    },
    {
      "id": 5,
      "trainId": 2,
      "cls": "2A",
      "fare": 1290,
      "seats": 4
    },
    {
      "id": 6,
      "trainId": 3,
      "cls": "SL",
      "fare": 310,
      "seats": 12
    }
  ],
  "reservations": [
    {
      "id": 1,
      "pnr": "4250007919",
      "user": "vignesh.s@gmail.com",
      "trainId": 1,
      "cls": "SL",
      "journeyDate": "2026-10-18",
      "passengers": [
        {
          "name": "Vignesh S",
          "age": "20",
          "gender": "Male",
          "status": "CNF",
          "berth": "SL-1"
        },
        {
          "name": "Ramesh S",
          "age": "48",
          "gender": "Male",
          "status": "CNF",
          "berth": "SL-2"
        }
      ],
      "amount": 570,
      "payMode": "Online - UPI",
      "mobile": "9876543210",
      "status": "Booked",
      "bookedOn": "2026-09-30",
      "refund": 0
    },
    {
      "id": 2,
      "pnr": "4250015838",
      "user": "vignesh.s@gmail.com",
      "trainId": 2,
      "cls": "3A",
      "journeyDate": "2026-10-18",
      "passengers": [
        {
          "name": "Vignesh S",
          "age": "20",
          "gender": "Male",
          "status": "CNF",
          "berth": "3A-1"
        }
      ],
      "amount": 905,
      "payMode": "Online - card",
      "mobile": "9876543210",
      "status": "Cancelled",
      "bookedOn": "2026-09-12",
      "cancelledOn": "2026-09-20",
      "refund": 815
    }
  ],
  "refundRules": [
    {
      "id": 1,
      "daysBefore": 7,
      "percent": 90,
      "note": "More than a week in advance."
    },
    {
      "id": 2,
      "daysBefore": 3,
      "percent": 60,
      "note": "Three to six days before the journey."
    },
    {
      "id": 3,
      "daysBefore": 1,
      "percent": 30,
      "note": "One or two days before the journey."
    },
    {
      "id": 4,
      "daysBefore": 0,
      "percent": 0,
      "note": "Same day or after departure - no refund."
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
