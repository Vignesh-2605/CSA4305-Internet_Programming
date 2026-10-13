# RouteOne - Online Bus Ticket Booking

RouteOne sells bus tickets online. Passengers search by route, date and bus type, choose seats on a live seat map, pay and get an e-ticket they can print, and can cancel or leave a comment about a service. The operator maintains the fleet, the categories, announcements and the booking reports.

## What the site does

- **Choose your own seat** - A live seat map for every service; seats already sold are greyed out.
- **Volvo, sleeper or coach** - Overnight sleepers, air conditioned Volvos and ordinary coaches on the same search.
- **E-ticket straight away** - Your ticket with the seat numbers and boarding point, ready to print or show on a phone.
- **Cancel without a phone call** - Cancel from your bookings page and the refund follows in about five days.

## Who uses it

### Passenger

- Register, sign in, reset a forgotten password
- Search buses by origin, destination, date and bus type
- Choose seats on a live seat map
- Enter passenger details and pay
- Print the e-ticket and cancel if plans change
- Comment on a particular bus and read the announcements

### Operator

- Maintain bus categories - Volvo, sleeper coach, coach
- Add or update a bus: type, photo, description, route, timing, fare, seats
- See every ticket and cancel one when needed
- Manage registered users
- Post announcements
- Moderate comments
- Bus wise and category wise reports, printable

## How it behaves

- Every seat already sold on a bus is read from the confirmed bookings, so a sold seat is disabled on the map and cannot go twice.
- A seat sold while the form was still open is checked again at payment time.
- The amount is the number of seats x the fare of that bus.
- Cancelling a ticket puts its seats straight back on the map.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8003/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8003` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@routeone.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
03-bus-ticket-booking/
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
