/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "blossom_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Shop Floor",
      "email": "shop@blossomgifts.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-20"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-03-05"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "joined": "2026-07-17"
    }
  ],
  "products": [
    {
      "id": 1,
      "name": "Dozen red roses",
      "category": "Bouquets",
      "occasion": "Anniversary",
      "recipient": "For her",
      "price": 899,
      "stock": 18,
      "sameDay": "Yes",
      "description": "Twelve long stemmed roses, hand tied with gypsophila."
    },
    {
      "id": 2,
      "name": "Yellow gerbera basket",
      "category": "Bouquets",
      "occasion": "Birthday",
      "recipient": "For anyone",
      "price": 749,
      "stock": 12,
      "sameDay": "Yes",
      "description": "Fifteen gerberas arranged in a cane basket."
    },
    {
      "id": 3,
      "name": "Dry fruit and chocolate hamper",
      "category": "Gift hampers",
      "occasion": "Congratulations",
      "recipient": "For anyone",
      "price": 1650,
      "stock": 8,
      "sameDay": "Yes",
      "description": "Almonds, cashews, dates and a box of truffles."
    },
    {
      "id": 4,
      "name": "Engraved photo frame",
      "category": "Personalised gifts",
      "occasion": "Birthday",
      "recipient": "For couples",
      "price": 1250,
      "stock": 6,
      "sameDay": "No",
      "description": "Wooden frame engraved with a name and a date; made to order."
    },
    {
      "id": 5,
      "name": "Money plant in a ceramic pot",
      "category": "Plants",
      "occasion": "Just because",
      "recipient": "For anyone",
      "price": 549,
      "stock": 22,
      "sameDay": "Yes",
      "description": "Easy to keep indoors, in a glazed white pot."
    },
    {
      "id": 6,
      "name": "White lily arrangement",
      "category": "Bouquets",
      "occasion": "Sympathy",
      "recipient": "For anyone",
      "price": 1100,
      "stock": 5,
      "sameDay": "Yes",
      "description": "Eight white lilies with greens, quietly arranged."
    },
    {
      "id": 7,
      "name": "Belgian chocolate box",
      "category": "Chocolates",
      "occasion": "Thank you",
      "recipient": "For anyone",
      "price": 950,
      "stock": 0,
      "sameDay": "Yes",
      "description": "Sixteen assorted pralines in a ribboned box."
    },
    {
      "id": 8,
      "name": "Teddy and balloons",
      "category": "Gift hampers",
      "occasion": "Birthday",
      "recipient": "For kids",
      "price": 1399,
      "stock": 9,
      "sameDay": "Yes",
      "description": "A soft toy with six helium balloons."
    }
  ],
  "coupons": [
    {
      "id": 1,
      "code": "BLOOM10",
      "percent": 10,
      "minOrder": 1000,
      "active": "Yes",
      "note": "Ten percent on orders of a thousand and above."
    },
    {
      "id": 2,
      "code": "FIRST50",
      "percent": 50,
      "minOrder": 2000,
      "active": "No",
      "note": "Opening week offer, now finished."
    }
  ],
  "cart": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "productId": 1,
      "qty": 1
    }
  ],
  "orders": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "items": [
        {
          "productId": 2,
          "name": "Yellow gerbera basket",
          "price": 749,
          "qty": 1
        }
      ],
      "recipientName": "Lakshmi S",
      "recipientPhone": "9840012345",
      "address": "18 Second Street, Kilpauk, Chennai 600010",
      "deliveryDate": "2026-09-12",
      "slot": "5 pm - 9 pm",
      "message": "Happy birthday Amma",
      "couponCode": "",
      "payment": "UPI",
      "subtotal": 749,
      "loyalty": 0,
      "couponOff": 0,
      "delivery": 60,
      "amount": 809,
      "status": "Delivered",
      "placedOn": "2026-09-10"
    },
    {
      "id": 2,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "items": [
        {
          "productId": 3,
          "name": "Dry fruit and chocolate hamper",
          "price": 1650,
          "qty": 1
        }
      ],
      "recipientName": "Karthik M",
      "recipientPhone": "9840011223",
      "address": "4 Lake View Road, West Mambalam, Chennai 600033",
      "deliveryDate": "2026-10-02",
      "slot": "1 pm - 5 pm",
      "message": "Congratulations on the new job",
      "couponCode": "BLOOM10",
      "payment": "Credit card",
      "subtotal": 1650,
      "loyalty": 0,
      "couponOff": 165,
      "delivery": 0,
      "amount": 1485,
      "status": "Delivered",
      "placedOn": "2026-09-29"
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "items": [
        {
          "productId": 8,
          "name": "Teddy and balloons",
          "price": 1399,
          "qty": 1
        }
      ],
      "recipientName": "Anjali K",
      "recipientPhone": "9840077665",
      "address": "22 Habibullah Road, T Nagar, Chennai 600017",
      "deliveryDate": "2026-10-09",
      "slot": "9 am - 1 pm",
      "message": "Many happy returns",
      "couponCode": "",
      "payment": "UPI",
      "subtotal": 1399,
      "loyalty": 0,
      "couponOff": 0,
      "delivery": 0,
      "amount": 1399,
      "status": "Delivered",
      "placedOn": "2026-10-07"
    },
    {
      "id": 4,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "items": [
        {
          "productId": 5,
          "name": "Money plant in a ceramic pot",
          "price": 549,
          "qty": 2
        }
      ],
      "recipientName": "Divya R",
      "recipientPhone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "deliveryDate": "2026-10-25",
      "slot": "9 am - 1 pm",
      "message": "A little green for the new flat",
      "couponCode": "",
      "payment": "UPI",
      "subtotal": 1098,
      "loyalty": 0,
      "couponOff": 0,
      "delivery": 0,
      "amount": 1098,
      "status": "Placed",
      "placedOn": "2026-10-22"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "user": "Vignesh S",
      "productId": 2,
      "rating": 5,
      "comment": "Arrived exactly in the slot and the flowers were fresh.",
      "date": "2026-09-13"
    },
    {
      "id": 2,
      "user": "Divya R",
      "productId": 5,
      "rating": 4,
      "comment": "Healthy plant, pot was a little smaller than it looked.",
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
