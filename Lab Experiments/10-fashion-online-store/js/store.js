/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "stylehub_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Store Admin",
      "email": "admin@stylehub.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-15"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-04-09"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "joined": "2026-05-27"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Oxford cotton shirt",
      "category": "Men",
      "type": "Formal wear",
      "brand": "Arrow",
      "price": 1899,
      "mrp": 2499,
      "sale": 20,
      "sizes": "S,M,L,XL,XXL",
      "colours": "White,Sky blue,Navy",
      "stock": 14,
      "description": "Full sleeve cotton shirt with a button down collar."
    },
    {
      "id": 2,
      "name": "Relaxed fit jeans",
      "category": "Men",
      "type": "Casual wear",
      "brand": "Levis",
      "price": 2799,
      "mrp": 3499,
      "sale": 0,
      "sizes": "30,32,34,36",
      "colours": "Indigo,Black",
      "stock": 9,
      "description": "Mid rise, straight leg, washed denim."
    },
    {
      "id": 3,
      "name": "Anarkali kurta set",
      "category": "Women",
      "type": "Formal wear",
      "brand": "Biba",
      "price": 3299,
      "mrp": 4299,
      "sale": 25,
      "sizes": "XS,S,M,L,XL",
      "colours": "Maroon,Teal,Mustard",
      "stock": 7,
      "description": "Printed kurta with a dupatta and matching palazzo."
    },
    {
      "id": 4,
      "name": "Cotton co-ord set",
      "category": "Women",
      "type": "Casual wear",
      "brand": "Max",
      "price": 1499,
      "mrp": 1999,
      "sale": 0,
      "sizes": "S,M,L,XL",
      "colours": "Olive,Beige",
      "stock": 12,
      "description": "Breathable cotton shirt and shorts, easy for the weekend."
    },
    {
      "id": 5,
      "name": "School canvas shoes",
      "category": "Kids",
      "type": "Footwear",
      "brand": "Bata",
      "price": 899,
      "mrp": 1099,
      "sale": 10,
      "sizes": "1,2,3,4,5",
      "colours": "White,Black",
      "stock": 20,
      "description": "Washable canvas shoes with a velcro strap."
    },
    {
      "id": 6,
      "name": "Hooded sweatshirt",
      "category": "Kids",
      "type": "Seasonal",
      "brand": "Gini & Jony",
      "price": 1199,
      "mrp": 1599,
      "sale": 15,
      "sizes": "4-5y,6-7y,8-9y,10-11y",
      "colours": "Grey,Red",
      "stock": 0,
      "description": "Fleece lined hoodie with a kangaroo pocket."
    },
    {
      "id": 7,
      "name": "Leather belt",
      "category": "Men",
      "type": "Accessories",
      "brand": "Hidesign",
      "price": 1299,
      "mrp": 1799,
      "sale": 0,
      "sizes": "32,34,36,38",
      "colours": "Tan,Black",
      "stock": 16,
      "description": "Full grain leather with a brushed steel buckle."
    }
  ],
  "sizeGuide": [
    {
      "id": 1,
      "category": "Men",
      "size": "S",
      "chest": "36",
      "waist": "30",
      "length": "27"
    },
    {
      "id": 2,
      "category": "Men",
      "size": "M",
      "chest": "38",
      "waist": "32",
      "length": "28"
    },
    {
      "id": 3,
      "category": "Men",
      "size": "L",
      "chest": "40",
      "waist": "34",
      "length": "29"
    },
    {
      "id": 4,
      "category": "Men",
      "size": "XL",
      "chest": "42",
      "waist": "36",
      "length": "30"
    },
    {
      "id": 5,
      "category": "Women",
      "size": "XS",
      "chest": "32",
      "waist": "26",
      "length": "36"
    },
    {
      "id": 6,
      "category": "Women",
      "size": "S",
      "chest": "34",
      "waist": "28",
      "length": "37"
    },
    {
      "id": 7,
      "category": "Women",
      "size": "M",
      "chest": "36",
      "waist": "30",
      "length": "38"
    },
    {
      "id": 8,
      "category": "Women",
      "size": "L",
      "chest": "38",
      "waist": "32",
      "length": "39"
    },
    {
      "id": 9,
      "category": "Kids",
      "size": "4-5y",
      "chest": "24",
      "waist": "22",
      "length": "18"
    },
    {
      "id": 10,
      "category": "Kids",
      "size": "6-7y",
      "chest": "26",
      "waist": "23",
      "length": "20"
    },
    {
      "id": 11,
      "category": "Kids",
      "size": "8-9y",
      "chest": "28",
      "waist": "24",
      "length": "22"
    }
  ],
  "cart": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 7,
      "size": "34",
      "colour": "Tan",
      "qty": 1
    }
  ],
  "wishlist": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 2,
      "added": "2026-10-11"
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
          "productId": 1,
          "name": "Oxford cotton shirt",
          "size": "M",
          "colour": "Sky blue",
          "price": 1519,
          "qty": 2
        }
      ],
      "amount": 3038,
      "placedOn": "2026-10-14",
      "status": "Delivered",
      "deliveredOn": "2026-10-18"
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
          "productId": 3,
          "name": "Anarkali kurta set",
          "size": "M",
          "colour": "Teal",
          "price": 2474,
          "qty": 1
        }
      ],
      "amount": 2474,
      "placedOn": "2026-10-20",
      "status": "Shipped",
      "deliveredOn": ""
    }
  ],
  "returns": [
    {
      "id": 1,
      "user": "divya.r@gmail.com",
      "orderId": 2,
      "productId": 3,
      "size": "M",
      "colour": "Teal",
      "type": "Exchange",
      "newSize": "L",
      "reason": "A little tight across the shoulders",
      "status": "Requested",
      "raisedOn": "2026-10-21"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "user": "Vignesh S",
      "productId": 1,
      "rating": 5,
      "comment": "Good cotton, holds its shape after a wash.",
      "date": "2026-10-19"
    },
    {
      "id": 2,
      "user": "Divya R",
      "productId": 4,
      "rating": 4,
      "comment": "Comfortable, though the beige runs slightly big.",
      "date": "2026-10-12"
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
