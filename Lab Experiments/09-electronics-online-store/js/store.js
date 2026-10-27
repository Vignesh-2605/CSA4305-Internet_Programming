/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "techsavvy_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Store Admin",
      "email": "admin@techsavvy.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-08"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-05-16"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "joined": "2026-06-22"
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Smartphones",
      "subcategories": "Android, iPhone, Feature phones",
      "popular": "Yes"
    },
    {
      "id": 2,
      "name": "Laptops",
      "subcategories": "Thin and light, Gaming, Business",
      "popular": "Yes"
    },
    {
      "id": 3,
      "name": "Tablets",
      "subcategories": "Android, iPad, E-readers",
      "popular": "No"
    },
    {
      "id": 4,
      "name": "Accessories",
      "subcategories": "Headphones, Chargers, Keyboards, Storage",
      "popular": "Yes"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Pixel 9a",
      "category": "Smartphones",
      "subcategory": "Android",
      "brand": "Google",
      "price": 42999,
      "mrp": 49999,
      "stock": 8,
      "description": "6.3 inch OLED, 5 year updates, very good camera for the price."
    },
    {
      "id": 2,
      "name": "Galaxy S25",
      "category": "Smartphones",
      "subcategory": "Android",
      "brand": "Samsung",
      "price": 71999,
      "mrp": 79999,
      "stock": 3,
      "description": "Flagship with a 120Hz display and three rear cameras."
    },
    {
      "id": 3,
      "name": "ThinkPad E14",
      "category": "Laptops",
      "subcategory": "Business",
      "brand": "Lenovo",
      "price": 58990,
      "mrp": 66000,
      "stock": 5,
      "description": "14 inch business laptop, 16GB RAM, 512GB SSD."
    },
    {
      "id": 4,
      "name": "MacBook Air M4",
      "category": "Laptops",
      "subcategory": "Thin and light",
      "brand": "Apple",
      "price": 99900,
      "mrp": 109900,
      "stock": 2,
      "description": "Fanless, 18 hour battery, 13.6 inch Liquid Retina display."
    },
    {
      "id": 5,
      "name": "Tab S10 FE",
      "category": "Tablets",
      "subcategory": "Android",
      "brand": "Samsung",
      "price": 31999,
      "mrp": 36999,
      "stock": 6,
      "description": "11 inch tablet with a stylus in the box."
    },
    {
      "id": 6,
      "name": "WH-1000XM6",
      "category": "Accessories",
      "subcategory": "Headphones",
      "brand": "Sony",
      "price": 26990,
      "mrp": 29990,
      "stock": 11,
      "description": "Over-ear headphones with very good noise cancelling."
    },
    {
      "id": 7,
      "name": "65W GaN charger",
      "category": "Accessories",
      "subcategory": "Chargers",
      "brand": "Anker",
      "price": 2499,
      "mrp": 3499,
      "stock": 24,
      "description": "Two USB-C ports, charges a laptop and a phone together."
    },
    {
      "id": 8,
      "name": "1TB NVMe SSD",
      "category": "Accessories",
      "subcategory": "Storage",
      "brand": "Crucial",
      "price": 6499,
      "mrp": 7999,
      "stock": 0,
      "description": "Gen4 drive, 5000 MB/s read, five year warranty."
    }
  ],
  "cart": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 7,
      "qty": 2
    }
  ],
  "wishlist": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 4,
      "added": "2026-10-12"
    }
  ],
  "orders": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "payment": "UPI",
      "items": [
        {
          "productId": 6,
          "name": "WH-1000XM6",
          "price": 26990,
          "qty": 1
        }
      ],
      "amount": 26990,
      "placedOn": "2026-10-14",
      "status": "Delivered"
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "payment": "Credit card",
      "items": [
        {
          "productId": 1,
          "name": "Pixel 9a",
          "price": 42999,
          "qty": 1
        },
        {
          "productId": 7,
          "name": "65W GaN charger",
          "price": 2499,
          "qty": 1
        }
      ],
      "amount": 45498,
      "placedOn": "2026-10-20",
      "status": "Placed"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "user": "Divya R",
      "productId": 6,
      "rating": 5,
      "comment": "Noise cancelling is excellent on the bus.",
      "date": "2026-10-18"
    },
    {
      "id": 2,
      "user": "Vignesh S",
      "productId": 7,
      "rating": 4,
      "comment": "Small and charges the laptop fine. Gets a bit warm.",
      "date": "2026-10-16"
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
