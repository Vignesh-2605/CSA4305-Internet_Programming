/* ==========================================================================
   store.js - tiny data layer on top of localStorage
   Acts as the "database" for this site. First load seeds sample rows.
   ========================================================================== */

const DB_KEY = "complainease_db";

const SEED = {
  "users": [
    {
      "id": 1,
      "name": "Grievance Cell",
      "email": "admin@complainease.in",
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
      "ward": "Ward 12 - Adyar",
      "joined": "2026-04-18"
    },
    {
      "id": 3,
      "name": "Divya R",
      "email": "divya.r@gmail.com",
      "password": "divya123",
      "role": "user",
      "phone": "9840022114",
      "ward": "Ward 07 - T Nagar",
      "joined": "2026-06-02"
    },
    {
      "id": 4,
      "name": "Ravi Kumar",
      "email": "ravi@complainease.in",
      "password": "officer123",
      "role": "officer",
      "phone": "9445001122",
      "dept": "Roads",
      "staffId": "OFF-1001",
      "approved": true,
      "joined": "2026-02-11"
    },
    {
      "id": 5,
      "name": "Meena Lakshmi",
      "email": "meena@complainease.in",
      "password": "officer124",
      "role": "officer",
      "phone": "9445003344",
      "dept": "Water supply",
      "staffId": "OFF-1002",
      "approved": true,
      "joined": "2026-02-11"
    },
    {
      "id": 6,
      "name": "Arjun Das",
      "email": "arjun@complainease.in",
      "password": "officer125",
      "role": "officer",
      "phone": "9445005566",
      "dept": "Street lighting",
      "staffId": "OFF-1003",
      "approved": false,
      "joined": "2026-10-19"
    }
  ],
  "departments": [
    {
      "id": 1,
      "name": "Roads",
      "sla": 7,
      "about": "Potholes, broken kerbs, damaged footpaths, road cuts left open."
    },
    {
      "id": 2,
      "name": "Water supply",
      "sla": 3,
      "about": "No supply, low pressure, leaking mains, contaminated water."
    },
    {
      "id": 3,
      "name": "Street lighting",
      "sla": 5,
      "about": "Lights not working, poles damaged, cables hanging low."
    },
    {
      "id": 4,
      "name": "Solid waste",
      "sla": 2,
      "about": "Bins not cleared, dumping on vacant plots, drain blockage."
    },
    {
      "id": 5,
      "name": "Parks and trees",
      "sla": 10,
      "about": "Fallen branches, overgrown parks, broken play equipment."
    }
  ],
  "complaints": [
    {
      "id": 1,
      "ref": "CMP-240311",
      "user": "vignesh.s@gmail.com",
      "dept": "Roads",
      "subject": "Pothole opposite the bus stop",
      "detail": "A pothole about two feet wide has opened up on the service road opposite the Adyar depot bus stop. Two-wheelers are swerving into the main carriageway to avoid it.",
      "ward": "Ward 12 - Adyar",
      "landmark": "Opposite Adyar depot",
      "x": 61,
      "y": 44,
      "photo": "pothole-adyar.jpg",
      "status": "Resolved",
      "priority": "High",
      "officer": "ravi@complainease.in",
      "filedOn": "2026-10-14",
      "assignedOn": "2026-10-14",
      "resolvedOn": "2026-10-18",
      "proof": "Patched with hot mix on 18 Oct, compacted and opened the same evening.",
      "proofPhoto": "roads-patch-2026-10-18.jpg",
      "notes": "Material indented 15 Oct. Work taken up 18 Oct."
    },
    {
      "id": 2,
      "ref": "CMP-240348",
      "user": "vignesh.s@gmail.com",
      "dept": "Street lighting",
      "subject": "Three lights out on 4th Main",
      "detail": "The last three poles on 4th Main Road have been dark for about a week. The stretch has no shops, so it is completely unlit after 7pm.",
      "ward": "Ward 12 - Adyar",
      "landmark": "4th Main Road, near the water tank",
      "x": 55,
      "y": 52,
      "photo": "",
      "status": "In progress",
      "priority": "Medium",
      "officer": "ravi@complainease.in",
      "filedOn": "2026-10-21",
      "assignedOn": "2026-10-22",
      "notes": "Fuse carrier replaced on one pole. Two poles need a new choke, indent raised with stores."
    },
    {
      "id": 3,
      "ref": "CMP-240359",
      "user": "divya.r@gmail.com",
      "dept": "Water supply",
      "subject": "Main leaking at the junction",
      "detail": "Water has been running down the side of the road from the junction since Saturday. It looks like the joint on the main has given way.",
      "ward": "Ward 07 - T Nagar",
      "landmark": "Thanikachalam Road junction",
      "x": 34,
      "y": 38,
      "photo": "leak-tnagar.jpg",
      "status": "Assigned",
      "priority": "High",
      "officer": "meena@complainease.in",
      "filedOn": "2026-10-24",
      "assignedOn": "2026-10-24",
      "notes": ""
    },
    {
      "id": 4,
      "ref": "CMP-240366",
      "user": "divya.r@gmail.com",
      "dept": "Solid waste",
      "subject": "Bins not cleared for four days",
      "detail": "The two bins at the end of the lane have not been emptied since Tuesday and waste is now spilling onto the pavement.",
      "ward": "Ward 07 - T Nagar",
      "landmark": "Lane behind the market",
      "x": 30,
      "y": 46,
      "photo": "",
      "status": "Registered",
      "priority": "Medium",
      "officer": "",
      "filedOn": "2026-10-26",
      "notes": ""
    }
  ],
  "feedback": [
    {
      "id": 1,
      "ref": "CMP-240311",
      "user": "vignesh.s@gmail.com",
      "rating": 5,
      "comment": "Patched properly and the road was open the same day. The officer called before closing the complaint.",
      "on": "2026-10-19"
    }
  ],
  "notices": [
    {
      "id": 1,
      "title": "Water supply shut down on 29 October",
      "body": "Supply to wards 7, 9 and 12 will be off from 6am to 4pm on 29 October for a valve replacement at the Kodambakkam head works.",
      "on": "2026-10-25"
    },
    {
      "id": 2,
      "title": "Monsoon desilting under way",
      "body": "Storm water drains in all wards are being desilted through November. Complaints about drain blockage will be taken up on priority.",
      "on": "2026-10-20"
    }
  ],
  "settings": [
    {
      "id": 1,
      "office": "Corporation Grievance Cell, Rippon Buildings, Chennai 600003",
      "phone": "1913",
      "email": "help@complainease.in",
      "hours": "Monday to Saturday, 9am to 5.45pm",
      "showMap": "yes",
      "showFeedback": "yes",
      "allowOfficerSignup": "yes"
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
const now = () => new Date().toTimeString().slice(0, 5);
const addDays = (date, n) => {
  const d = new Date(date); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);
const esc = s => String(s === undefined || s === null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
