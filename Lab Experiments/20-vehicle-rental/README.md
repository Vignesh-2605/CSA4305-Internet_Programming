# RentRide - RentRide Vehicle Rental

RentRide hires out cars, vans and bikes by the day. A customer gives the dates first, so the list only ever shows vehicles that are genuinely free for the whole stretch; the cost and the refundable deposit are shown before the request is sent. The desk approves it, hands the vehicle over and takes it back, pricing a late return against the deposit. Customers who have actually had a vehicle out can rate it.

## What the site does

- **Dates first, then the list** - Anything already promised for your stretch is greyed out before you get attached to it.
- **The deposit comes back** - A fifth of the hire is held and returned in full on a clean, on time return.
- **Late is priced, not argued** - A late day costs one and a half times the daily rate, taken from the deposit.
- **Ratings from real hires** - Only a customer who actually had the vehicle out can review it, once per hire.

## Who uses it

### Customer

- Register and sign in
- Search by dates, type, pick-up point and daily rate
- See the total and the deposit before sending the request
- Request a vehicle with a licence number
- Follow the booking through approved, out and returned
- Cancel a request, or an approved booking up to the day before
- Review a vehicle once it has been returned

### Rental desk

- Maintain the fleet: rate, registration, fuel, gearbox, seats, pick-up point
- Take a vehicle off the road and put it back
- Approve or refuse a request, with the clash check run again
- Hand a vehicle over and take it back, with the late fee worked out
- See what is due back within two days and what is overdue
- Customer list with late returns flagged
- Moderate reviews

## How it behaves

- A vehicle is offered only if it is in service and no approved or out booking overlaps those dates (`isFree()`).
- The hire is the number of days times the daily rate, with a deposit of 20% on top.
- Availability is checked again when the request is sent and once more when the desk approves it.
- A late return costs 150% of the daily rate for each late day and is taken out of the deposit (`lateCharge()`).
- A customer can cancel while the booking is requested, or while approved up to the day before pick-up.
- A vehicle can only be reviewed by somebody who had it out, once per hire.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8020/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8020` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | desk@rentride.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
20-vehicle-rental/
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
