/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "rentride_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Rental Desk",
      "email": "desk@rentride.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-09"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "licence": "TN0120210004455",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-04-18"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "licence": "TN0920190011223",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "joined": "2026-06-02"
    }
  ],
  "vehicles": [
    {
      "id": 1,
      "name": "Maruti Swift VXi",
      "type": "Hatchback",
      "regNo": "TN01BK4412",
      "fuel": "Petrol",
      "transmission": "Manual",
      "seats": 5,
      "rate": 1600,
      "location": "Porur",
      "available": "Yes",
      "description": "Easy in city traffic, good mileage, 2023 model."
    },
    {
      "id": 2,
      "name": "Hyundai Creta SX",
      "type": "SUV",
      "regNo": "TN07CF8890",
      "fuel": "Diesel",
      "transmission": "Automatic",
      "seats": 5,
      "rate": 3200,
      "location": "Porur",
      "available": "Yes",
      "description": "Comfortable for long runs, sunroof, 2024 model."
    },
    {
      "id": 3,
      "name": "Toyota Innova Crysta",
      "type": "Van",
      "regNo": "TN10DE2234",
      "fuel": "Diesel",
      "transmission": "Manual",
      "seats": 7,
      "rate": 4100,
      "location": "Airport",
      "available": "Yes",
      "description": "Seven seats with luggage room - the family choice."
    },
    {
      "id": 4,
      "name": "Honda Activa 6G",
      "type": "Bike",
      "regNo": "TN02GH1120",
      "fuel": "Petrol",
      "transmission": "Automatic",
      "seats": 2,
      "rate": 450,
      "location": "Adyar",
      "available": "Yes",
      "description": "Scooter with a helmet included, best for short city hops."
    },
    {
      "id": 5,
      "name": "Tata Ace",
      "type": "Truck",
      "regNo": "TN04JK7788",
      "fuel": "Diesel",
      "transmission": "Manual",
      "seats": 2,
      "rate": 2200,
      "location": "Guindy",
      "available": "Yes",
      "description": "Small goods carrier, 750 kg payload, for a house move."
    },
    {
      "id": 6,
      "name": "Honda City ZX",
      "type": "Sedan",
      "regNo": "TN05LM3344",
      "fuel": "Petrol",
      "transmission": "Automatic",
      "seats": 5,
      "rate": 2600,
      "location": "Adyar",
      "available": "No",
      "description": "In the workshop for a service until the end of the month."
    }
  ],
  "bookings": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "vehicleId": 1,
      "from": "2026-09-12",
      "to": "2026-09-15",
      "licence": "TN0120210004455",
      "phone": "9876543210",
      "payment": "UPI",
      "amount": 4800,
      "deposit": 960,
      "status": "Returned",
      "createdOn": "2026-09-08",
      "outOn": "2026-09-12",
      "returnedOn": "2026-09-15",
      "lateFee": 0,
      "depositBack": 960,
      "note": ""
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "vehicleId": 2,
      "from": "2026-10-26",
      "to": "2026-10-30",
      "licence": "TN0920190011223",
      "phone": "9876500011",
      "payment": "Credit card",
      "amount": 12800,
      "deposit": 2560,
      "status": "Out",
      "createdOn": "2026-10-20",
      "outOn": "2026-10-26",
      "lateFee": 0,
      "note": ""
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "vehicleId": 3,
      "from": "2026-11-05",
      "to": "2026-11-08",
      "licence": "TN0120210004455",
      "phone": "9876543210",
      "payment": "UPI",
      "amount": 12300,
      "deposit": 2460,
      "status": "Requested",
      "createdOn": "2026-10-25",
      "lateFee": 0,
      "note": ""
    }
  ],
  "reviews": [
    {
      "id": 1,
      "bookingId": 1,
      "vehicleId": 1,
      "user": "vignesh.s@gmail.com",
      "rating": 5,
      "comment": "Clean car, full tank, handover took five minutes.",
      "date": "2026-09-15"
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
