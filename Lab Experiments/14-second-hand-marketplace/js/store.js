/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "renew_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Site Admin",
      "email": "admin@renewmarket.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-10"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "city": "Chennai",
      "joined": "2026-04-02"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "city": "Chennai",
      "joined": "2026-05-19"
    },
    {
      "id": 4,
      "name": "Karthik M",
      "email": "karthik.m@gmail.com",
      "password": "karthik1",
      "role": "user",
      "phone": "9840011223",
      "city": "Coimbatore",
      "joined": "2026-06-30"
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "note": "Phones, laptops, cameras, audio."
    },
    {
      "id": 2,
      "name": "Furniture",
      "note": "Tables, chairs, beds, storage."
    },
    {
      "id": 3,
      "name": "Clothing",
      "note": "Worn a few times, clean and folded."
    },
    {
      "id": 4,
      "name": "Collectables",
      "note": "Coins, stamps, vinyl, memorabilia."
    },
    {
      "id": 5,
      "name": "Books",
      "note": "Textbooks, fiction, reference."
    }
  ],
  "listings": [
    {
      "id": 1,
      "seller": "divya.r@gmail.com",
      "title": "Study table with two drawers",
      "categoryId": 2,
      "price": 3500,
      "negotiable": "Yes",
      "condition": "Good",
      "location": "Mylapore, Chennai",
      "photo": "study-table.jpg",
      "description": "Solid wood table, four years old, one drawer handle is loose.",
      "status": "Live",
      "postedOn": "2026-10-12"
    },
    {
      "id": 2,
      "seller": "karthik.m@gmail.com",
      "title": "Canon EOS 200D with kit lens",
      "categoryId": 1,
      "price": 24000,
      "negotiable": "Yes",
      "condition": "Like new",
      "location": "RS Puram, Coimbatore",
      "photo": "eos200d.jpg",
      "description": "Shutter count under 6,000, box and two batteries included.",
      "status": "Live",
      "postedOn": "2026-10-16"
    },
    {
      "id": 3,
      "seller": "vignesh.s@gmail.com",
      "title": "Engineering mathematics textbooks, set of four",
      "categoryId": 5,
      "price": 900,
      "negotiable": "No",
      "condition": "Good",
      "location": "Adyar, Chennai",
      "photo": "maths-books.jpg",
      "description": "Semester one to four, no writing inside, covers intact.",
      "status": "Live",
      "postedOn": "2026-10-18"
    },
    {
      "id": 4,
      "seller": "divya.r@gmail.com",
      "title": "Bluetooth speaker, JBL Flip 5",
      "categoryId": 1,
      "price": 4200,
      "negotiable": "Yes",
      "condition": "Good",
      "location": "Mylapore, Chennai",
      "photo": "flip5.jpg",
      "description": "Works perfectly, small scuff on the base, charger included.",
      "status": "Sold",
      "soldFor": 3800,
      "soldOn": "2026-10-10",
      "postedOn": "2026-09-28"
    },
    {
      "id": 5,
      "seller": "karthik.m@gmail.com",
      "title": "Vinyl records, Tamil film music, 12 discs",
      "categoryId": 4,
      "price": 6500,
      "negotiable": "Yes",
      "condition": "Fair",
      "location": "RS Puram, Coimbatore",
      "photo": "vinyl.jpg",
      "description": "1970s pressings, sleeves worn, discs play without skipping.",
      "status": "Live",
      "postedOn": "2026-10-20"
    }
  ],
  "offers": [
    {
      "id": 1,
      "listingId": 1,
      "buyer": "vignesh.s@gmail.com",
      "amount": 3000,
      "message": "Can collect this weekend if you can do three thousand.",
      "status": "Pending",
      "madeOn": "2026-10-21",
      "note": ""
    },
    {
      "id": 2,
      "listingId": 4,
      "buyer": "vignesh.s@gmail.com",
      "amount": 3800,
      "message": "Happy to pick it up today.",
      "status": "Accepted",
      "madeOn": "2026-10-09",
      "note": ""
    }
  ],
  "orders": [
    {
      "id": 1,
      "listingId": 4,
      "buyer": "vignesh.s@gmail.com",
      "seller": "divya.r@gmail.com",
      "amount": 3800,
      "logistics": "Pickup",
      "status": "Received",
      "date": "2026-10-10",
      "receivedOn": "2026-10-11"
    }
  ],
  "favourites": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "listingId": 2,
      "added": "2026-10-17"
    }
  ],
  "feedback": [
    {
      "id": 1,
      "orderId": 1,
      "from": "vignesh.s@gmail.com",
      "about": "divya.r@gmail.com",
      "rating": 5,
      "comment": "Exactly as described and easy to deal with.",
      "date": "2026-10-11"
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
