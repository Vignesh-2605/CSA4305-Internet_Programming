# SkyRoute - Online Flight Reservation System

SkyRoute brings flight schedules, fares and live seat inventory together in one place. Travellers search by route, date and class, pick seats on an aircraft map, pay through the gateway and get an e-ticket to print. Cancellation refunds follow the published rule, and the airline desk keeps schedules, inventory and feedback under control.

## What the site does

- **Every fare in one search** - Schedules and fares from the airlines together, by route, date and class.
- **Pick your seat** - A cabin map for the class you choose; one seat per passenger, window or aisle as you like.
- **E-ticket, ready to print** - Your booking reference, seats and terminal on one page you can print or keep on a phone.
- **Cancel online** - 80% back when you cancel three or more days before departure, 50% after that.

## Who uses it

### Traveller

- Register, sign in, reset a forgotten password
- Search flights by origin, destination, date and class with live seat counts
- Choose seats on the aircraft map and enter passenger details
- Pay by card, net banking, UPI or wallet
- See booking status, print the e-ticket
- Cancel a ticket and see the refund
- Send feedback about a journey

### Airline desk

- Maintain the flight schedule: number, airline, route, date, timing, aircraft, terminal
- Maintain class wise fares and seat inventory
- See every ticket and cancel one with its refund
- Read and moderate traveller feedback
- Manage user accounts
- Inventory and revenue report, printable

## How it behaves

- Seat labels (1A, 1B ... ) are generated from the seat count of the class, six to a row.
- A seat already issued on that flight and class is disabled, and checked once more at payment.
- Exactly one seat must be chosen for each passenger.
- A cancellation refunds 80% of the fare three or more days before departure and 50% inside that, nothing after it (`refundFor()`).

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8005/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8005` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@skyroute.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
05-flight-reservation-system/
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
