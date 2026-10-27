# Bloom Studio - Beauty Parlour Appointment Booking

Bloom Studio is a hair, skin and bridal salon that keeps its diary online. Customers see the real free hours of each stylist, book the treatment they want, hold the chair with a deposit and move or cancel it themselves. The manager works from the same diary: adding reservations, blocking hours for training or leave, and keeping the service list and the team up to date.

## What the site does

- **A diary you can actually see** - Free half hours are shown for the stylist you chose; taken and blocked hours are greyed out.
- **Hold it with a deposit** - Pay 30% to hold the chair, settle the rest at the salon, or pay the lot now.
- **Change it yourself** - Move or cancel from your account up to two hours before, without ringing us.
- **The same person each time** - Pick the stylist you like; their working days and hours are on their profile.

## Who uses it

### Customer

- Register and sign in
- Browse treatments with prices and durations
- See each stylist's free half hours for any date
- Book, paying in full, paying a deposit, or holding the slot
- Reschedule to another free slot or cancel
- Upcoming visits, past visits and what is still to pay
- Leave feedback about the visit

### Salon manager

- Day diary: every stylist, hour by hour, with who is in the chair
- Add, edit, complete or cancel any reservation
- Send a reminder to the customer's mobile
- Maintain the service menu - duration and price
- Maintain stylists, their working days and hours
- Block hours for training, leave or a private booking
- Read and moderate feedback

## How it behaves

- The diary runs in 30 minute steps between each stylist's own start and finish time (`slotsFor()`).
- A slot is offered only if the whole treatment fits before closing and nothing overlaps it (`isFree()`).
- Hours blocked by the salon, and days the stylist does not work, never appear as free.
- A deposit is 30% of the price; the balance is collected at the salon.
- An unpaid hold is released automatically after 24 hours (`releaseUnpaid()`).
- Customers may move or cancel until 2 hours before the appointment (`canChange()`); the salon has no such limit.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8007/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8007` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | manager@bloomstudio.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
07-beauty-parlour-appointments/
├── package.json                npm start -> node serve.js (no dependencies)
├── serve.js                    local web server for this site
├── index.html                  home page
├── pages/
│   ├── login.html              sign in, with password reset
│   ├── register.html           create an account
│   ├── admin-dashboard.html    staff / administrator console
│   └── user-dashboard.html     customer console
├── css/
│   └── style.css               stylesheet for the whole site
├── js/
│   ├── store.js                localStorage data layer + sample data
│   ├── auth.js                 registration, sign in, session, page guards
│   ├── dash.js                 dashboard engine - menu, tables, forms
│   ├── admin.js                administrator side features
│   └── user.js                 customer side features
└── README.md
```
