/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "vetcure_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Dr. Arul Mozhi",
      "email": "arul@vetcure.in",
      "password": "admin123",
      "role": "doctor",
      "clinic": "Government Veterinary Hospital, Pollachi",
      "kind": "Government",
      "district": "Coimbatore",
      "phone": "9843011220",
      "upi": "",
      "bank": "",
      "joined": "2026-01-18"
    },
    {
      "id": 2,
      "name": "Dr. Shalini R",
      "email": "shalini@vetcure.in",
      "password": "doctor123",
      "role": "doctor",
      "clinic": "Shalini Pet and Cattle Clinic",
      "kind": "Private",
      "district": "Thanjavur",
      "phone": "9843055660",
      "upi": "shalinivet@upi",
      "bank": "Indian Bank 408112233",
      "joined": "2026-03-07"
    },
    {
      "id": 3,
      "name": "Vignesh S",
      "email": "vignesh.s@gmail.com",
      "password": "user123",
      "role": "user",
      "phone": "9876543210",
      "district": "Coimbatore",
      "joined": "2026-06-12"
    },
    {
      "id": 4,
      "name": "Murugan P",
      "email": "murugan.p@gmail.com",
      "password": "murugan1",
      "role": "user",
      "phone": "9842011220",
      "district": "Thanjavur",
      "joined": "2026-07-25"
    }
  ],
  "subscriptions": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "doctor": "arul@vetcure.in",
      "kind": "Government",
      "from": "2026-10-10",
      "to": "2026-11-09",
      "fee": 0
    },
    {
      "id": 2,
      "user": "murugan.p@gmail.com",
      "doctor": "shalini@vetcure.in",
      "kind": "Private",
      "from": "2026-10-01",
      "to": "2026-10-31",
      "fee": 300
    }
  ],
  "cases": [
    {
      "id": 1,
      "user": "vignesh.s@gmail.com",
      "doctor": "arul@vetcure.in",
      "animal": "Lakshmi (tag 44)",
      "species": "Cow",
      "age": "6 years",
      "district": "Coimbatore",
      "media": "Photo",
      "mediaFile": "cow-hoof.jpg",
      "symptoms": "Limping on the left front leg, swelling between the hooves, off feed since yesterday.",
      "status": "Answered",
      "postedOn": "2026-10-19",
      "answeredOn": "2026-10-20",
      "diagnosis": "Foot rot",
      "solution": "Keep her on dry ground, wash the foot with a copper sulphate solution twice a day and keep the shed dry.",
      "medicines": "Oxytetracycline as advised by the hospital, zinc supplement in feed."
    },
    {
      "id": 2,
      "user": "murugan.p@gmail.com",
      "doctor": "shalini@vetcure.in",
      "animal": "Goat shed, four animals",
      "species": "Goat",
      "age": "1 to 2 years",
      "district": "Thanjavur",
      "media": "Video",
      "mediaFile": "goats-coughing.mp4",
      "symptoms": "Coughing at night, nasal discharge, two have stopped grazing.",
      "status": "Answered",
      "postedOn": "2026-10-16",
      "answeredOn": "2026-10-17",
      "diagnosis": "Pneumonia",
      "solution": "Separate the two that are off feed, keep the shed out of the draught and start treatment today.",
      "medicines": "Enrofloxacin course, vitamin supplement."
    },
    {
      "id": 3,
      "user": "vignesh.s@gmail.com",
      "doctor": "arul@vetcure.in",
      "animal": "Poultry shed B",
      "species": "Poultry",
      "age": "8 weeks",
      "district": "Coimbatore",
      "media": "Photo",
      "mediaFile": "birds.jpg",
      "symptoms": "Six birds droopy, white droppings, less water being drunk.",
      "status": "Open",
      "postedOn": "2026-10-26",
      "diagnosis": "",
      "solution": "",
      "medicines": ""
    }
  ],
  "cures": [
    {
      "id": 1,
      "disease": "Foot and mouth disease",
      "species": "Cow",
      "signs": "Blisters on the tongue and between the hooves, drooling, lameness, fever.",
      "treatment": "Isolate at once, soft feed, wash the mouth with a mild antiseptic and call the hospital - it is notifiable.",
      "photo": "fmd.jpg"
    },
    {
      "id": 2,
      "disease": "Mastitis",
      "species": "Buffalo",
      "signs": "Hot swollen udder, clots or watery milk, drop in yield.",
      "treatment": "Strip the quarter out often, keep the bedding clean and start the course the vet prescribes.",
      "photo": "mastitis.jpg"
    },
    {
      "id": 3,
      "disease": "Foot rot",
      "species": "Goat",
      "signs": "Limping, smell from between the hooves, swelling above the hoof.",
      "treatment": "Trim the hoof, stand the animal in a zinc sulphate foot bath and keep it on dry ground.",
      "photo": "footrot.jpg"
    },
    {
      "id": 4,
      "disease": "Newcastle disease",
      "species": "Poultry",
      "signs": "Twisted neck, greenish droppings, gasping, sudden deaths in the shed.",
      "treatment": "No cure once it is in - vaccinate the rest, burn the dead birds and disinfect the shed.",
      "photo": "ranikhet.jpg"
    },
    {
      "id": 5,
      "disease": "Bloat",
      "species": "Any",
      "signs": "Left side swollen and drum tight, restless, breathing fast.",
      "treatment": "Walk the animal, drench with cooking oil and call the vet at once - it kills quickly.",
      "photo": "bloat.jpg"
    }
  ],
  "news": [
    {
      "id": 1,
      "title": "Free foot and mouth vaccination camp",
      "district": "Coimbatore",
      "date": "2026-10-20",
      "body": "Camp at the Pollachi hospital from 2 to 6 November, 8 am to 1 pm. Bring the ear tag numbers of every animal."
    },
    {
      "id": 2,
      "title": "Watch for pneumonia as the nights cool",
      "district": "Thanjavur",
      "date": "2026-10-15",
      "body": "Keep young stock out of the draught at night and report coughing early - it spreads fast in a closed shed."
    }
  ],
  "payments": [
    {
      "id": 1,
      "user": "murugan.p@gmail.com",
      "doctor": "shalini@vetcure.in",
      "amount": 300,
      "mode": "Easy paisa",
      "ref": "EP884120",
      "date": "2026-10-01",
      "forWhat": "One month subscription"
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
