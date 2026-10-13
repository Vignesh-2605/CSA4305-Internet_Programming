# StayWell - Online Hotel Room Booking

The booking site for StayWell. Guests check what is free for their dates, compare room types, tariffs and amenities, book and pay online, and change or cancel from their dashboard. The front office sets inventory and pricing, edits any booking and maintains the hotel's information pages.

## What the site does

- **What is really free** - Availability is worked out from the bookings already on the books for your exact dates.
- **Change your mind for free** - Move or cancel a booking yourself up to three days before you arrive, at no charge.
- **The price you see** - Nights times the room tariff, shown in full before you confirm. No booking fee.
- **Everything in one account** - Past stays, upcoming bookings and your details on a single page.

## Who uses it

### Guest

- Register, sign in and keep the profile up to date
- Check room availability for a date range and party size
- Book a room and pay
- See the full booking history
- Change or cancel a booking up to three days before arrival
- Rate a stay and read other guests' reviews

### Front office

- Change the quantity and tariff of every room type
- Edit or cancel any booking, with no time limit
- Edit the information pages: room types, about us, contact, Q&A, travel guide, privacy policy
- Occupancy, arrivals and revenue at a glance
- Moderate guest reviews

## How it behaves

- A guest may change or cancel only while the arrival date is still at least 3 days away (`CHANGE_WINDOW` in `js/user.js`). The front office has no such limit.
- Availability counts the confirmed bookings whose dates overlap the requested range and subtracts them from the number of rooms of that type.
- The amount is nights x tariff, recalculated whenever a booking changes.
- A room whose maximum occupancy is below the party size cannot be booked.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8002/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8002` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | manager@staywell.example | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
02-hotel-room-booking/
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
