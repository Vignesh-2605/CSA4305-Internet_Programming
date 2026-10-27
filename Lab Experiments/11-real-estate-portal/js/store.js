/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "homefinder_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Agency Desk",
      "email": "desk@homefinder.in",
      "password": "admin123",
      "role": "admin",
      "joined": "2026-02-10"
    },
    {
      "id": 2,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "budget": 7500000,
      "joined": "2026-08-14"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9876500011",
      "budget": 4500000,
      "joined": "2026-09-02"
    }
  ],
  "agents": [
    {
      "id": 1,
      "name": "Ravi Shankar",
      "company": "Shankar Estates",
      "phone": "9840011220",
      "email": "ravi@shankarestates.in",
      "areas": "Adyar, Besant Nagar, Thiruvanmiyur",
      "since": "2018"
    },
    {
      "id": 2,
      "name": "Lakshmi Iyer",
      "company": "Metro Realty",
      "phone": "9840033440",
      "email": "lakshmi@metrorealty.in",
      "areas": "Anna Nagar, Kilpauk, Aminjikarai",
      "since": "2020"
    },
    {
      "id": 3,
      "name": "Faisal Ahmed",
      "company": "Metro Realty",
      "phone": "9840055660",
      "email": "faisal@metrorealty.in",
      "areas": "Velachery, Guindy, Pallikaranai",
      "since": "2021"
    }
  ],
  "properties": [
    {
      "id": 1,
      "title": "2 BHK flat with a sea breeze, Besant Nagar",
      "purpose": "Buy",
      "type": "Apartment",
      "city": "Chennai",
      "locality": "Besant Nagar",
      "price": 9500000,
      "bedrooms": 2,
      "bathrooms": 2,
      "areaSqft": 1150,
      "furnishing": "Semi furnished",
      "agentId": 1,
      "status": "Available",
      "amenities": "Covered parking, lift, power backup, 24x7 water",
      "tour": "tour-besant-2bhk.mp4",
      "description": "Third floor flat ten minutes from the beach, east facing, in a quiet lane off the main road."
    },
    {
      "id": 2,
      "title": "3 BHK independent house, Anna Nagar",
      "purpose": "Buy",
      "type": "Independent house",
      "city": "Chennai",
      "locality": "Anna Nagar",
      "price": 18500000,
      "bedrooms": 3,
      "bathrooms": 3,
      "areaSqft": 2100,
      "furnishing": "Unfurnished",
      "agentId": 2,
      "status": "Available",
      "amenities": "Two car park, borewell, solar water heater, terrace garden",
      "tour": "tour-annanagar-house.mp4",
      "description": "Two storey house on a 2400 sq ft plot, built in 2016, close to the tower park."
    },
    {
      "id": 3,
      "title": "1 BHK to rent near the IT corridor",
      "purpose": "Rent",
      "type": "Apartment",
      "city": "Chennai",
      "locality": "Velachery",
      "price": 18000,
      "bedrooms": 1,
      "bathrooms": 1,
      "areaSqft": 620,
      "furnishing": "Fully furnished",
      "agentId": 3,
      "status": "Available",
      "amenities": "Furnished, lift, gym, security",
      "tour": "",
      "description": "Furnished flat suited to a working couple, bus stop at the gate."
    },
    {
      "id": 4,
      "title": "Commercial floor on Guindy main road",
      "purpose": "Rent",
      "type": "Commercial",
      "city": "Chennai",
      "locality": "Guindy",
      "price": 95000,
      "bedrooms": 0,
      "bathrooms": 2,
      "areaSqft": 1800,
      "furnishing": "Unfurnished",
      "agentId": 3,
      "status": "Available",
      "amenities": "Lift, three phase supply, parking for six cars",
      "tour": "",
      "description": "Open floor plate suited to an office of about twenty people."
    },
    {
      "id": 5,
      "title": "Plot of 2400 sq ft, Pallikaranai",
      "purpose": "Buy",
      "type": "Plot",
      "city": "Chennai",
      "locality": "Pallikaranai",
      "price": 6200000,
      "bedrooms": 0,
      "bathrooms": 0,
      "areaSqft": 2400,
      "furnishing": "Unfurnished",
      "agentId": 3,
      "status": "Available",
      "amenities": "Approved layout, corner plot, road on two sides",
      "tour": "",
      "description": "CMDA approved layout with clear title, ready for construction."
    },
    {
      "id": 6,
      "title": "2 BHK flat, Adyar, near the bus depot",
      "purpose": "Buy",
      "type": "Apartment",
      "city": "Chennai",
      "locality": "Adyar",
      "price": 11500000,
      "bedrooms": 2,
      "bathrooms": 2,
      "areaSqft": 1240,
      "furnishing": "Semi furnished",
      "agentId": 1,
      "status": "Under offer",
      "amenities": "Covered parking, lift, gated",
      "tour": "",
      "description": "Well kept flat in a six year old building with a lift."
    }
  ],
  "savedSearches": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "2 BHK under 1 crore",
      "purpose": "Buy",
      "type": "Apartment",
      "city": "Chennai",
      "maxPrice": 10000000,
      "minBeds": 2,
      "savedOn": "2026-09-30"
    }
  ],
  "favourites": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "propertyId": 1,
      "added": "2026-10-02"
    }
  ],
  "viewings": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "phone": "9876543210",
      "propertyId": 1,
      "date": "2026-10-26",
      "time": "11:00",
      "notes": "Weekend morning suits best",
      "status": "Confirmed",
      "askedOn": "2026-10-20"
    },
    {
      "id": 2,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "phone": "9876500011",
      "propertyId": 5,
      "date": "2026-10-27",
      "time": "16:30",
      "notes": "",
      "status": "Requested",
      "askedOn": "2026-10-22"
    }
  ],
  "enquiries": [
    {
      "id": 1,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "propertyId": 5,
      "agentId": 3,
      "message": "Is the layout approval available to see?",
      "date": "2026-10-21",
      "reply": ""
    }
  ],
  "visits": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "propertyId": 1,
      "at": "2026-10-02"
    },
    {
      "id": 2,
      "user": "vignesh.s@gmail.com",
      "name": "Vignesh S",
      "propertyId": 2,
      "at": "2026-10-05"
    },
    {
      "id": 3,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "propertyId": 5,
      "at": "2026-10-21"
    },
    {
      "id": 4,
      "user": "divya.r@gmail.com",
      "name": "Divya R",
      "propertyId": 1,
      "at": "2026-10-22"
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
