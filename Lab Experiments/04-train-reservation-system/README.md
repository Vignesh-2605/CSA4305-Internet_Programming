# RailDesk - Online Train Reservation System

RailDesk handles train reservations online. Passengers check class wise availability on a route, enter passenger details, pay online or at the counter and receive a PNR, look up the status of that PNR, print the reservation slip and cancel with a refund worked out from the published rules.

## What the site does

- **See the position first** - Every class shows AVAILABLE, RAC or the waiting list number before you pay a rupee.
- **One ticket, whole party** - Add each passenger and the berths are allotted in order, exactly as at the counter.
- **PNR status any time** - Type the PNR to see where each passenger stands, whether or not you booked here.
- **Refunds by the rule book** - Cancel online and the refundable share is worked out from the days left before the journey.

## Who uses it

### Passenger

- Register and sign in
- Search trains on a route, with via details and class wise availability
- Enter passenger details, choose a class and pay online or at the counter
- Receive the ticket and the PNR
- Check PNR status - confirmed, RAC or waiting list - for every passenger
- Print the reservation slip and cancel with the refund shown first

### Administrator

- Maintain trains: number, name, route, via, zone and timing
- Maintain class wise fare and berth capacity
- See every PNR and the payments behind it
- Cancel a reservation and pass the refund
- Maintain the refund rules
- Occupancy report per train and class

## How it behaves

- Berths are allotted the way the railways do it: `CNF` while the class capacity lasts, then `RAC` up to six, then `WL` (`allocate()`).
- The PNR is a ten digit number derived from the reservation (`makePnr`).
- The fare is the number of passengers x the class fare of that train.
- A refund uses the highest matching slab in the refund rule table: 90% at seven days or more, 60% at three, 30% at one, nothing on the day of travel.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8004/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8004` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@raildesk.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
04-train-reservation-system/
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
