/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "medcare_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Front Office",
      "email": "admin@medcare.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-05"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "age": 21,
      "bloodGroup": "O+",
      "joined": "2026-06-30"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "age": 22,
      "bloodGroup": "B+",
      "joined": "2026-07-26"
    }
  ],
  "hospitals": [
    {
      "id": 1,
      "name": "MedCare Kilpauk",
      "location": "Kilpauk",
      "address": "45 Poonamallee High Road, Kilpauk, Chennai 600010",
      "phone": "044-2644 8800",
      "beds": 180
    },
    {
      "id": 2,
      "name": "MedCare Adyar",
      "location": "Adyar",
      "address": "9 Sardar Patel Road, Adyar, Chennai 600020",
      "phone": "044-2441 3300",
      "beds": 120
    },
    {
      "id": 3,
      "name": "MedCare Anna Nagar",
      "location": "Anna Nagar",
      "address": "ZZ Block, Third Avenue, Anna Nagar, Chennai 600040",
      "phone": "044-2622 7711",
      "beds": 95
    }
  ],
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Ananth Raman",
      "specialty": "General medicine",
      "qualification": "MBBS, MD",
      "hospitalId": 1,
      "fee": 500,
      "days": "Mon,Tue,Wed,Thu,Fri",
      "from": "09:00",
      "to": "13:00"
    },
    {
      "id": 2,
      "name": "Dr. Kavitha Nair",
      "specialty": "Dermatology",
      "qualification": "MBBS, MD (DVL)",
      "hospitalId": 2,
      "fee": 700,
      "days": "Mon,Wed,Fri,Sat",
      "from": "10:00",
      "to": "14:00"
    },
    {
      "id": 3,
      "name": "Dr. S. Balaji",
      "specialty": "Cardiology",
      "qualification": "MBBS, DM (Cardiology)",
      "hospitalId": 1,
      "fee": 900,
      "days": "Tue,Thu,Sat",
      "from": "11:00",
      "to": "15:00"
    },
    {
      "id": 4,
      "name": "Dr. Preethi Venkat",
      "specialty": "Paediatrics",
      "qualification": "MBBS, DCH",
      "hospitalId": 3,
      "fee": 600,
      "days": "Mon,Tue,Wed,Thu,Fri,Sat",
      "from": "09:00",
      "to": "12:00"
    },
    {
      "id": 5,
      "name": "Dr. Imran Shaikh",
      "specialty": "Orthopaedics",
      "qualification": "MBBS, MS (Ortho)",
      "hospitalId": 2,
      "fee": 800,
      "days": "Mon,Thu,Fri",
      "from": "15:00",
      "to": "19:00"
    }
  ],
  "appointments": [
    {
      "id": 1,
      "patient": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "doctorId": 1,
      "date": "2026-10-23",
      "time": "09:20",
      "token": 1,
      "reason": "Fever and sore throat",
      "remind": "SMS",
      "fee": 500,
      "status": "Booked",
      "bookedOn": "2026-10-21",
      "checkedIn": ""
    },
    {
      "id": 2,
      "patient": "divya.r@gmail.com",
      "name": "Divya R",
      "phone": "9876500011",
      "doctorId": 2,
      "date": "2026-10-23",
      "time": "10:00",
      "token": 1,
      "reason": "Skin allergy",
      "remind": "Both",
      "fee": 700,
      "status": "Booked",
      "bookedOn": "2026-10-20",
      "checkedIn": "2026-10-21",
      "symptoms": "Rash on both forearms, itchy at night",
      "since": "About ten days",
      "medication": "Cetirizine at night",
      "allergies": "Dust"
    },
    {
      "id": 3,
      "patient": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "doctorId": 4,
      "date": "2026-09-14",
      "time": "09:40",
      "token": 2,
      "reason": "Routine check",
      "remind": "SMS",
      "fee": 600,
      "status": "Completed",
      "bookedOn": "2026-09-12",
      "checkedIn": "2026-09-13",
      "symptoms": "General check-up",
      "since": "-",
      "medication": "None",
      "allergies": "None"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "patient": "Divya R",
      "doctorId": 2,
      "rating": 5,
      "comment": "Explained the treatment properly and did not rush.",
      "date": "2026-09-30"
    },
    {
      "id": 2,
      "patient": "Vignesh S",
      "doctorId": 1,
      "rating": 4,
      "comment": "Good consultation, the wait was a little long.",
      "date": "2026-09-18"
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
