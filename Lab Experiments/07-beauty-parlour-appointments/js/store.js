/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "salon_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Salon Manager",
      "email": "manager@bloomstudio.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-02-02"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "joined": "2026-07-11"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "joined": "2026-08-02"
    }
  ],
  "services": [
    {
      "id": 1,
      "name": "Haircut and styling",
      "category": "Hair",
      "duration": 45,
      "price": 650,
      "description": "Consultation, cut and a blow dry finish."
    },
    {
      "id": 2,
      "name": "Hair colour - global",
      "category": "Hair",
      "duration": 120,
      "price": 2800,
      "description": "Ammonia free colour with a protein treatment afterwards."
    },
    {
      "id": 3,
      "name": "Classic facial",
      "category": "Skin",
      "duration": 60,
      "price": 1200,
      "description": "Cleanse, exfoliation, massage and a mask for your skin type."
    },
    {
      "id": 4,
      "name": "Manicure and pedicure",
      "category": "Nails",
      "duration": 60,
      "price": 900,
      "description": "Shaping, cuticle care, scrub and polish."
    },
    {
      "id": 5,
      "name": "Bridal make-up trial",
      "category": "Bridal",
      "duration": 90,
      "price": 3500,
      "description": "A full trial of the look before the wedding day."
    },
    {
      "id": 6,
      "name": "Head massage",
      "category": "Spa",
      "duration": 30,
      "price": 450,
      "description": "Warm oil massage for the head, neck and shoulders."
    }
  ],
  "stylists": [
    {
      "id": 1,
      "name": "Meera K",
      "role": "Senior stylist",
      "specialty": "Cuts and colour",
      "days": "Tue,Wed,Thu,Fri,Sat",
      "from": "09:00",
      "to": "18:00"
    },
    {
      "id": 2,
      "name": "Anjali P",
      "role": "Beautician",
      "specialty": "Facials and nails",
      "days": "Wed,Thu,Fri,Sat,Sun",
      "from": "10:00",
      "to": "19:00"
    },
    {
      "id": 3,
      "name": "Farah S",
      "role": "Bridal artist",
      "specialty": "Bridal make-up",
      "days": "Fri,Sat,Sun",
      "from": "09:00",
      "to": "17:00"
    }
  ],
  "appointments": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "serviceId": 1,
      "stylistId": 1,
      "date": "2026-10-23",
      "time": "10:00",
      "duration": 45,
      "amount": 650,
      "paid": 650,
      "payMode": "Full",
      "notes": "",
      "status": "Confirmed",
      "bookedOn": "2026-10-20"
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "phone": "9876500011",
      "serviceId": 3,
      "stylistId": 2,
      "date": "2026-10-23",
      "time": "11:30",
      "duration": 60,
      "amount": 1200,
      "paid": 360,
      "payMode": "Deposit",
      "notes": "Sensitive skin",
      "status": "Confirmed",
      "bookedOn": "2026-10-19"
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "serviceId": 6,
      "stylistId": 1,
      "date": "2026-09-30",
      "time": "16:00",
      "duration": 30,
      "amount": 450,
      "paid": 450,
      "payMode": "Full",
      "notes": "",
      "status": "Completed",
      "bookedOn": "2026-09-28"
    }
  ],
  "lockouts": [
    {
      "id": 1,
      "stylistId": 1,
      "date": "2026-10-23",
      "from": "13:00",
      "to": "14:00",
      "reason": "Lunch break"
    },
    {
      "id": 2,
      "stylistId": 2,
      "date": "2026-10-24",
      "from": "10:00",
      "to": "13:00",
      "reason": "Product training"
    }
  ],
  "feedback": [
    {
      "id": 1,
      "user": "Divya R",
      "stylistId": 2,
      "rating": 5,
      "comment": "Lovely facial and the studio was spotless.",
      "date": "2026-09-21"
    },
    {
      "id": 2,
      "user": "Vignesh S",
      "stylistId": 1,
      "rating": 4,
      "comment": "Good cut, had to wait ten minutes though.",
      "date": "2026-10-01"
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
