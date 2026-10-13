/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "hotel_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Hotel Admin",
      "email": "manager@staywell.example",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-05-01"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "city": "Chennai",
      "joined": "2026-06-14"
    }
  ],
  "roomTypes": [
    {
      "id": 1,
      "type": "Standard",
      "price": 2400,
      "qty": 10,
      "maxGuests": 2,
      "amenities": "AC, TV, Wi-Fi, breakfast",
      "about": "Comfortable twin room with a city view."
    },
    {
      "id": 2,
      "type": "Deluxe",
      "price": 3800,
      "qty": 6,
      "maxGuests": 3,
      "amenities": "AC, TV, Wi-Fi, mini bar, breakfast",
      "about": "Larger room with a seating area and balcony."
    },
    {
      "id": 3,
      "type": "Executive Suite",
      "price": 6500,
      "qty": 3,
      "maxGuests": 4,
      "amenities": "AC, living room, Wi-Fi, mini bar, lounge access",
      "about": "Two-room suite with a separate living area."
    },
    {
      "id": 4,
      "type": "Family Room",
      "price": 5200,
      "qty": 4,
      "maxGuests": 5,
      "amenities": "AC, two double beds, Wi-Fi, breakfast",
      "about": "Spacious room for families with children."
    }
  ],
  "bookings": [
    {
      "id": 1,
      "guest": "vignesh.s@gmail.com",
      "guestName": "Vignesh S",
      "type": "Deluxe",
      "checkIn": "2026-10-20",
      "checkOut": "2026-10-23",
      "guests": 2,
      "nights": 3,
      "amount": 11400,
      "status": "Confirmed",
      "bookedOn": "2026-10-01",
      "payment": "Paid online"
    },
    {
      "id": 2,
      "guest": "vignesh.s@gmail.com",
      "guestName": "Vignesh S",
      "type": "Standard",
      "checkIn": "2026-08-11",
      "checkOut": "2026-08-13",
      "guests": 2,
      "nights": 2,
      "amount": 4800,
      "status": "Confirmed",
      "bookedOn": "2026-08-01",
      "payment": "Paid online"
    },
    {
      "id": 3,
      "guest": "divya.r@gmail.com",
      "guestName": "Divya R",
      "type": "Family Room",
      "checkIn": "2026-10-12",
      "checkOut": "2026-10-15",
      "guests": 4,
      "nights": 3,
      "amount": 15600,
      "status": "Confirmed",
      "bookedOn": "2026-09-22",
      "payment": "Paid online"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "guest": "Divya R",
      "type": "Family Room",
      "rating": 5,
      "comment": "Very clean rooms and a helpful front desk.",
      "date": "2026-09-01"
    },
    {
      "id": 2,
      "guest": "Arun K",
      "type": "Standard",
      "rating": 4,
      "comment": "Good value, breakfast could have more options.",
      "date": "2026-09-14"
    }
  ],
  "pages": [
    {
      "id": 1,
      "title": "Room type introduction",
      "body": "Standard, Deluxe, Executive Suite and Family rooms. Every room has air conditioning, Wi-Fi and daily housekeeping. Check-in 2 PM, check-out 11 AM."
    },
    {
      "id": 2,
      "title": "About us",
      "body": "StayWell has served travellers since 1998 with 23 rooms across four categories, a multi-cuisine restaurant and a rooftop lounge."
    },
    {
      "id": 3,
      "title": "Contact us",
      "body": "StayWell Hotel, 14 Mount Road, Chennai 600002.\nPhone 044-2345 6789\nE-mail stay@staywell.example"
    },
    {
      "id": 4,
      "title": "Customer service Q&A",
      "body": "Q: Can I cancel my booking?\nA: Yes, up to three days before arrival, free of charge.\n\nQ: Is parking available?\nA: Free covered parking for guests."
    },
    {
      "id": 5,
      "title": "Local travel and shopping guide",
      "body": "Central railway station 2 km, airport 16 km. Marina beach, Fort St. George and the Pondy Bazaar shopping district are all within 6 km."
    },
    {
      "id": 6,
      "title": "Privacy policy",
      "body": "Guest details are used only to process bookings and are never sold. Payment data is handled by the payment gateway and is not stored on our servers."
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
