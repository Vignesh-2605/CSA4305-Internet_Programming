/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "agrimart_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Market Desk",
      "email": "admin@agrimart.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-14"
    },
    {
      "id": 2,
      "name": "Murugan P",
      "email": "murugan@agrimart.in",
      "password": "farmer123",
      "role": "farmer",
      "phone": "9842011220",
      "village": "Pollachi",
      "joined": "2026-02-20"
    },
    {
      "id": 3,
      "name": "Selvi A",
      "email": "selvi@agrimart.in",
      "password": "farmer124",
      "role": "farmer",
      "phone": "9842033440",
      "village": "Thanjavur",
      "joined": "2026-04-11"
    },
    {
      "id": 4,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "wallet": 4200,
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-05-02"
    }
  ],
  "products": [
    {
      "id": 1,
      "farmer": "murugan@agrimart.in",
      "name": "Paddy seed, ADT 45",
      "category": "Seeds",
      "price": 68,
      "unit": "kg",
      "stock": 400,
      "photo": "adt45.jpg",
      "description": "Short duration variety, certified seed from this season.",
      "listedOn": "2026-09-10"
    },
    {
      "id": 2,
      "farmer": "murugan@agrimart.in",
      "name": "Coconut, grade one",
      "category": "Fresh produce",
      "price": 32,
      "unit": "piece",
      "stock": 900,
      "photo": "coconut.jpg",
      "description": "Picked and dehusked, delivered within two days.",
      "listedOn": "2026-10-01"
    },
    {
      "id": 3,
      "farmer": "selvi@agrimart.in",
      "name": "Vermicompost",
      "category": "Fertilisers",
      "price": 420,
      "unit": "bag",
      "stock": 60,
      "photo": "vermicompost.jpg",
      "description": "Fifty kilo bag, fully cured, no odour.",
      "listedOn": "2026-08-22"
    },
    {
      "id": 4,
      "farmer": "selvi@agrimart.in",
      "name": "Neem oil spray",
      "category": "Pesticides",
      "price": 310,
      "unit": "litre",
      "stock": 45,
      "photo": "neem.jpg",
      "description": "Cold pressed, for sucking pests on vegetables.",
      "listedOn": "2026-09-30"
    },
    {
      "id": 5,
      "farmer": "murugan@agrimart.in",
      "name": "Knapsack sprayer, 16 litre",
      "category": "Equipment",
      "price": 1850,
      "unit": "piece",
      "stock": 12,
      "photo": "sprayer.jpg",
      "description": "Manual lever sprayer with two nozzles.",
      "listedOn": "2026-07-19"
    },
    {
      "id": 6,
      "farmer": "selvi@agrimart.in",
      "name": "Hand weeder",
      "category": "Tools",
      "price": 240,
      "unit": "piece",
      "stock": 0,
      "photo": "weeder.jpg",
      "description": "Forged steel head on a teak handle.",
      "listedOn": "2026-06-05"
    }
  ],
  "cart": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 3,
      "qty": 1
    }
  ],
  "orders": [
    {
      "id": 1,
      "buyer": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "items": [
        {
          "productId": 2,
          "name": "Coconut, grade one",
          "farmer": "murugan@agrimart.in",
          "price": 32,
          "qty": 50
        }
      ],
      "amount": 1690,
      "placedOn": "2026-10-18",
      "status": "Delivered"
    },
    {
      "id": 2,
      "buyer": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "items": [
        {
          "productId": 4,
          "name": "Neem oil spray",
          "farmer": "selvi@agrimart.in",
          "price": 310,
          "qty": 2
        }
      ],
      "amount": 710,
      "placedOn": "2026-10-24",
      "status": "Packed"
    }
  ],
  "walletTxns": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "kind": "Top-up",
      "amount": 6600,
      "ref": "UPI",
      "date": "2026-10-18",
      "balance": 6600
    },
    {
      "id": 2,
      "user": "vignesh.s@gmail.com",
      "kind": "Order",
      "amount": -1690,
      "ref": "Order #1",
      "date": "2026-10-18",
      "balance": 4910
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "kind": "Order",
      "amount": -710,
      "ref": "Order #2",
      "date": "2026-10-24",
      "balance": 4200
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
