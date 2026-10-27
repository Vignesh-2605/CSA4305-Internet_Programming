/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "cake_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Counter",
      "email": "counter@crumbsandco.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-12"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "joined": "2026-07-04"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "joined": "2026-08-19"
    }
  ],
  "cakes": [
    {
      "id": 1,
      "name": "Classic chocolate truffle",
      "category": "Birthday",
      "flavour": "Chocolate truffle",
      "price": 850,
      "eggless": "No",
      "available": "Yes",
      "description": "Dark chocolate sponge layered with ganache and a mirror glaze."
    },
    {
      "id": 2,
      "name": "Red velvet cream cheese",
      "category": "Anniversary",
      "flavour": "Red velvet",
      "price": 950,
      "eggless": "No",
      "available": "Yes",
      "description": "Soft red velvet with a tangy cream cheese frosting."
    },
    {
      "id": 3,
      "name": "Butterscotch crunch",
      "category": "Birthday",
      "flavour": "Butterscotch",
      "price": 780,
      "eggless": "Yes",
      "available": "Yes",
      "description": "Caramel sponge with praline crunch between the layers."
    },
    {
      "id": 4,
      "name": "Fresh fruit gateau",
      "category": "Everyday",
      "flavour": "Fresh fruit",
      "price": 820,
      "eggless": "Yes",
      "available": "Yes",
      "description": "Vanilla sponge, whipped cream and the fruit that came in that morning."
    },
    {
      "id": 5,
      "name": "Three tier vanilla",
      "category": "Wedding",
      "flavour": "Vanilla",
      "price": 1600,
      "eggless": "No",
      "available": "Yes",
      "description": "Three tiers of vanilla sponge finished in white buttercream."
    },
    {
      "id": 6,
      "name": "Black forest",
      "category": "Baby shower",
      "flavour": "Black forest",
      "price": 790,
      "eggless": "Yes",
      "available": "Yes",
      "description": "Chocolate sponge, cherries and cream, the way it has always been."
    }
  ],
  "orders": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "cakeId": 1,
      "weight": "1",
      "message": "Happy Birthday Amma",
      "deliveryDate": "2026-10-24",
      "slot": "4 pm - 8 pm",
      "name": "Vignesh S",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "payment": "UPI",
      "amount": 950,
      "status": "Placed",
      "placedOn": "2026-10-21"
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "cakeId": 3,
      "weight": "0.5",
      "message": "",
      "deliveryDate": "2026-10-22",
      "slot": "9 am - 12 noon",
      "name": "Divya R",
      "phone": "9876500011",
      "address": "7 Bazaar Road, Mylapore, Chennai 600004",
      "payment": "Cash on delivery",
      "amount": 390,
      "status": "Baking",
      "placedOn": "2026-10-20"
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "cakeId": 4,
      "weight": "1.5",
      "message": "Congratulations",
      "deliveryDate": "2026-10-10",
      "slot": "12 noon - 4 pm",
      "name": "Vignesh S",
      "phone": "9876543210",
      "address": "12/4 Thiruvalluvar Street, Adyar, Chennai 600020",
      "payment": "Credit card",
      "amount": 1330,
      "status": "Delivered",
      "placedOn": "2026-10-08"
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
