/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "easytoll_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Toll Authority",
      "email": "admin@easytoll.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-06"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "wallet": 1250,
      "joined": "2026-05-21"
    },
    {
      "id": 3,
      "name": "Karthik M",
      "email": "karthik.m@gmail.com",
      "password": "karthik1",
      "role": "user",
      "phone": "9840011223",
      "wallet": 380,
      "joined": "2026-07-03"
    },
    {
      "id": 4,
      "name": "Gate Operator - Paranur",
      "email": "paranur@easytoll.in",
      "password": "gate123",
      "role": "tollgate",
      "tollId": 1,
      "joined": "2026-02-14"
    }
  ],
  "tolls": [
    {
      "id": 1,
      "name": "Paranur Plaza",
      "highway": "NH-32 (GST Road)",
      "location": "Near Chengalpattu, Chennai - Trichy road",
      "carRate": 65,
      "lcvRate": 110,
      "hcvRate": 230
    },
    {
      "id": 2,
      "name": "Surapet Plaza",
      "highway": "NH-16 (Chennai bypass)",
      "location": "Surapet, outer ring road",
      "carRate": 50,
      "lcvRate": 85,
      "hcvRate": 180
    },
    {
      "id": 3,
      "name": "Nemili Plaza",
      "highway": "NH-48 (Chennai - Bengaluru)",
      "location": "Nemili, past Sriperumbudur",
      "carRate": 80,
      "lcvRate": 135,
      "hcvRate": 270
    }
  ],
  "vehicles": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "regNo": "TN01AB1234",
      "type": "Car",
      "model": "Maruti Swift",
      "addedOn": "2026-05-21"
    },
    {
      "id": 2,
      "user": "vignesh.s@gmail.com",
      "regNo": "TN07CD5678",
      "type": "LCV",
      "model": "Tata Ace",
      "addedOn": "2026-08-02"
    },
    {
      "id": 3,
      "user": "karthik.m@gmail.com",
      "regNo": "TN38EF9012",
      "type": "Car",
      "model": "Hyundai i20",
      "addedOn": "2026-07-03"
    }
  ],
  "passes": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "vehicleId": 1,
      "tollId": 1,
      "type": "Local monthly",
      "from": "2026-10-01",
      "to": "2026-10-31",
      "amount": 780,
      "status": "Approved",
      "appliedOn": "2026-09-29",
      "approvedOn": "2026-09-30",
      "code": "EZT-P-100061"
    },
    {
      "id": 2,
      "user": "karthik.m@gmail.com",
      "vehicleId": 3,
      "tollId": 3,
      "type": "Single return",
      "from": "2026-10-26",
      "to": "2026-10-27",
      "amount": 128,
      "status": "Pending",
      "appliedOn": "2026-10-23",
      "code": ""
    }
  ],
  "tickets": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "vehicleId": 2,
      "tollId": 2,
      "amount": 85,
      "validFor": "2026-10-24",
      "status": "Unused",
      "boughtOn": "2026-10-23",
      "code": "EZT-T-500037"
    },
    {
      "id": 2,
      "user": "karthik.m@gmail.com",
      "vehicleId": 3,
      "tollId": 1,
      "amount": 65,
      "validFor": "2026-10-20",
      "status": "Used",
      "boughtOn": "2026-10-19",
      "usedOn": "2026-10-20",
      "code": "EZT-T-500074"
    }
  ],
  "walletTxns": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "kind": "Top-up",
      "amount": 2000,
      "ref": "UPI",
      "date": "2026-09-29",
      "balance": 2000
    },
    {
      "id": 2,
      "user": "vignesh.s@gmail.com",
      "kind": "Toll pass",
      "amount": -780,
      "ref": "Paranur Plaza Local monthly",
      "date": "2026-09-29",
      "balance": 1220
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "kind": "Top-up",
      "amount": 115,
      "ref": "UPI",
      "date": "2026-10-23",
      "balance": 1335
    },
    {
      "id": 4,
      "user": "vignesh.s@gmail.com",
      "kind": "Toll ticket",
      "amount": -85,
      "ref": "Surapet Plaza EZT-T-500037",
      "date": "2026-10-23",
      "balance": 1250
    },
    {
      "id": 5,
      "user": "karthik.m@gmail.com",
      "kind": "Top-up",
      "amount": 573,
      "ref": "Debit card",
      "date": "2026-10-19",
      "balance": 573
    },
    {
      "id": 6,
      "user": "karthik.m@gmail.com",
      "kind": "Toll ticket",
      "amount": -65,
      "ref": "Paranur Plaza EZT-T-500074",
      "date": "2026-10-19",
      "balance": 508
    },
    {
      "id": 7,
      "user": "karthik.m@gmail.com",
      "kind": "Toll pass",
      "amount": -128,
      "ref": "Nemili Plaza Single return",
      "date": "2026-10-23",
      "balance": 380
    }
  ],
  "crossings": [
    {
      "id": 1,
      "tollId": 1,
      "vehicleId": 3,
      "regNo": "TN38EF9012",
      "kind": "Ticket",
      "ref": "EZT-T-500074",
      "at": "2026-10-20",
      "time": "08:40",
      "operator": "paranur@easytoll.in"
    },
    {
      "id": 2,
      "tollId": 1,
      "vehicleId": 1,
      "regNo": "TN01AB1234",
      "kind": "Pass",
      "ref": "EZT-P-100061",
      "at": "2026-10-21",
      "time": "09:05",
      "operator": "paranur@easytoll.in"
    },
    {
      "id": 3,
      "tollId": 1,
      "vehicleId": 1,
      "regNo": "TN01AB1234",
      "kind": "Pass",
      "ref": "EZT-P-100061",
      "at": "2026-10-22",
      "time": "18:50",
      "operator": "paranur@easytoll.in"
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
