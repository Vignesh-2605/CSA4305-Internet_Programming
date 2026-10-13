/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "bus_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Bus Admin",
      "email": "admin@routeone.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-05-02"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "joined": "2026-06-18"
    },
    {
      "id": 3,
      "name": "Karthik M",
      "email": "karthik.m@gmail.com",
      "password": "karthik1",
      "role": "user",
      "phone": "9840011223",
      "joined": "2026-07-09"
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Volvo A/C",
      "description": "Multi-axle air conditioned seater."
    },
    {
      "id": 2,
      "name": "Sleeper coach",
      "description": "Berths, air conditioned."
    },
    {
      "id": 3,
      "name": "Coach",
      "description": "Non air conditioned seater."
    }
  ],
  "buses": [
    {
      "id": 1,
      "name": "KPN Travels 404",
      "category": "Volvo A/C",
      "from": "Chennai",
      "to": "Coimbatore",
      "date": "2026-10-18",
      "depTime": "21:30",
      "arrTime": "05:30",
      "fare": 950,
      "totalSeats": 36,
      "photo": "kpn404.jpg",
      "description": "Multi-axle Volvo with charging points and blankets."
    },
    {
      "id": 2,
      "name": "SRM Sleeper 77",
      "category": "Sleeper coach",
      "from": "Chennai",
      "to": "Madurai",
      "date": "2026-10-18",
      "depTime": "22:00",
      "arrTime": "06:00",
      "fare": 1100,
      "totalSeats": 30,
      "photo": "srm77.jpg",
      "description": "Single and double berths, A/C sleeper."
    },
    {
      "id": 3,
      "name": "TNSTC Express 12",
      "category": "Coach",
      "from": "Coimbatore",
      "to": "Kodaikanal",
      "date": "2026-10-19",
      "depTime": "06:15",
      "arrTime": "12:40",
      "fare": 420,
      "totalSeats": 40,
      "photo": "tnstc12.jpg",
      "description": "Government express service via Palani."
    },
    {
      "id": 4,
      "name": "Parveen Travels 9",
      "category": "Volvo A/C",
      "from": "Madurai",
      "to": "Chennai",
      "date": "2026-10-20",
      "depTime": "20:45",
      "arrTime": "05:15",
      "fare": 1020,
      "totalSeats": 36,
      "photo": "parveen9.jpg",
      "description": "A/C seater with on-board entertainment."
    }
  ],
  "bookings": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "busId": 1,
      "seats": "11,12",
      "passenger": "Vignesh S",
      "age": 20,
      "gender": "Male",
      "phone": "9876543210",
      "boarding": "Koyambedu",
      "method": "UPI",
      "amount": 1900,
      "status": "Confirmed",
      "bookedOn": "2026-10-02"
    },
    {
      "id": 2,
      "user": "karthik.m@gmail.com",
      "busId": 1,
      "seats": "1,2,3",
      "passenger": "Karthik M",
      "age": 21,
      "gender": "Male",
      "phone": "9840011223",
      "boarding": "Guindy",
      "method": "Credit card",
      "amount": 2850,
      "status": "Confirmed",
      "bookedOn": "2026-10-03"
    },
    {
      "id": 3,
      "user": "karthik.m@gmail.com",
      "busId": 2,
      "seats": "7",
      "passenger": "Karthik M",
      "age": 21,
      "gender": "Male",
      "phone": "9840011223",
      "boarding": "Tambaram",
      "method": "Net banking",
      "amount": 1100,
      "status": "Cancelled",
      "bookedOn": "2026-09-28"
    }
  ],
  "comments": [
    {
      "id": 1,
      "busId": 1,
      "user": "Karthik M",
      "text": "Clean bus and it left on time.",
      "date": "2026-09-30"
    },
    {
      "id": 2,
      "busId": 3,
      "user": "Vignesh S",
      "text": "Ghat road journey, carry water.",
      "date": "2026-10-01"
    }
  ],
  "news": [
    {
      "id": 1,
      "title": "Diwali special services",
      "date": "2026-10-05",
      "body": "Extra Volvo services on the Chennai - Coimbatore route from 18 to 22 October."
    },
    {
      "id": 2,
      "title": "UPI payments restored",
      "date": "2026-09-27",
      "body": "UPI payment downtime has been fixed; all gateways are working normally."
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
