/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "insureeasy_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Head Office",
      "email": "admin@insureeasy.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-01-02"
    },
    {
      "id": 2,
      "name": "Suresh Kumar",
      "email": "suresh@insureeasy.in",
      "password": "agent123",
      "role": "agent",
      "phone": "9840022110",
      "licence": "IRDA-44821",
      "approved": true,
      "approvedOn": "2026-02-01",
      "joined": "2026-01-28"
    },
    {
      "id": 3,
      "name": "Nithya Raman",
      "email": "nithya@insureeasy.in",
      "password": "agent123",
      "role": "agent",
      "phone": "9840088770",
      "licence": "IRDA-51204",
      "approved": false,
      "joined": "2026-10-18"
    },
    {
      "id": 4,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "city": "Chennai",
      "agentEmail": "suresh@insureeasy.in",
      "joined": "2026-03-12"
    },
    {
      "id": 5,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "city": "Chennai",
      "agentEmail": "suresh@insureeasy.in",
      "joined": "2026-06-08"
    }
  ],
  "plans": [
    {
      "id": 1,
      "name": "FamilyFirst Health 5L",
      "category": "Health",
      "insurer": "Star Health",
      "cover": 500000,
      "premium": 11800,
      "term": 1,
      "claimRatio": 93,
      "features": "Hospitalisation, day care, 30 day pre and 60 day post cover, no room rent cap."
    },
    {
      "id": 2,
      "name": "FamilyFirst Health 10L",
      "category": "Health",
      "insurer": "Star Health",
      "cover": 1000000,
      "premium": 17400,
      "term": 1,
      "claimRatio": 93,
      "features": "Everything in the 5 lakh plan with a restore benefit and maternity after two years."
    },
    {
      "id": 3,
      "name": "SecureDrive Comprehensive",
      "category": "Auto",
      "insurer": "ICICI Lombard",
      "cover": 600000,
      "premium": 8900,
      "term": 1,
      "claimRatio": 96,
      "features": "Own damage and third party, zero depreciation, roadside assistance."
    },
    {
      "id": 4,
      "name": "SecureDrive Third Party",
      "category": "Auto",
      "insurer": "ICICI Lombard",
      "cover": 750000,
      "premium": 3200,
      "term": 1,
      "claimRatio": 96,
      "features": "Statutory third party cover only, no own damage."
    },
    {
      "id": 5,
      "name": "HomeShield Standard",
      "category": "Home",
      "insurer": "HDFC Ergo",
      "cover": 2500000,
      "premium": 6400,
      "term": 1,
      "claimRatio": 91,
      "features": "Structure and contents against fire, flood, burglary and storm."
    },
    {
      "id": 6,
      "name": "LifeSecure Term 50L",
      "category": "Life",
      "insurer": "LIC",
      "cover": 5000000,
      "premium": 14200,
      "term": 20,
      "claimRatio": 98,
      "features": "Pure term cover to age 60, accidental death rider available."
    },
    {
      "id": 7,
      "name": "TripSafe International",
      "category": "Travel",
      "insurer": "Tata AIG",
      "cover": 4000000,
      "premium": 2900,
      "term": 1,
      "claimRatio": 89,
      "features": "Medical cover abroad, lost baggage, trip cancellation."
    }
  ],
  "policies": [
    {
      "id": 1,
      "policyNo": "POL100037",
      "user": "vignesh.s@gmail.com",
      "planId": 1,
      "agentEmail": "suresh@insureeasy.in",
      "start": "2026-03-15",
      "end": "2026-11-10",
      "premium": 11800,
      "nominee": "Ramesh S",
      "status": "Active",
      "issuedOn": "2026-03-12"
    },
    {
      "id": 2,
      "policyNo": "POL100074",
      "user": "vignesh.s@gmail.com",
      "planId": 3,
      "agentEmail": "suresh@insureeasy.in",
      "start": "2026-05-01",
      "end": "2027-05-01",
      "premium": 8900,
      "nominee": "Ramesh S",
      "status": "Active",
      "issuedOn": "2026-04-28"
    },
    {
      "id": 3,
      "policyNo": "POL100111",
      "user": "divya.r@gmail.com",
      "planId": 5,
      "agentEmail": "suresh@insureeasy.in",
      "start": "2026-06-10",
      "end": "2027-06-10",
      "premium": 6400,
      "nominee": "Ravi R",
      "status": "Active",
      "issuedOn": "2026-06-08"
    }
  ],
  "payments": [
    {
      "id": 1,
      "policyId": 1,
      "user": "vignesh.s@gmail.com",
      "amount": 11800,
      "date": "2026-03-12",
      "mode": "UPI",
      "period": "First premium"
    },
    {
      "id": 2,
      "policyId": 2,
      "user": "vignesh.s@gmail.com",
      "amount": 8900,
      "date": "2026-04-28",
      "mode": "Net banking",
      "period": "First premium"
    },
    {
      "id": 3,
      "policyId": 3,
      "user": "divya.r@gmail.com",
      "amount": 6400,
      "date": "2026-06-08",
      "mode": "Card",
      "period": "First premium"
    }
  ],
  "claims": [
    {
      "id": 1,
      "policyId": 2,
      "user": "vignesh.s@gmail.com",
      "type": "Damage",
      "amount": 24500,
      "reason": "Rear bumper and tail light after a parking knock",
      "date": "2026-09-18",
      "status": "Settled",
      "remarks": "Paid to the garage directly",
      "settledOn": "2026-09-29"
    },
    {
      "id": 2,
      "policyId": 1,
      "user": "vignesh.s@gmail.com",
      "type": "Hospitalisation",
      "amount": 68000,
      "reason": "Two nights for dengue, Apollo Greams Road",
      "date": "2026-10-15",
      "status": "Under review",
      "remarks": ""
    }
  ],
  "alerts": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "from": "Suresh Kumar",
      "channel": "SMS",
      "date": "2026-10-20",
      "message": "Policy POL100037 is due for renewal on 2026-11-10. Premium Rs.11,800."
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "from": "Suresh Kumar",
      "channel": "E-mail",
      "date": "2026-09-01",
      "message": "Your home cover documents have been posted to your address."
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
