# Crumbs & Co - Online Cake Ordering

Crumbs & Co is a neighbourhood bakery that takes its orders online. Customers browse the day's cakes by occasion and flavour, choose a weight, add a message and a delivery slot, and pay by card, UPI or on delivery. The counter keeps the menu and prices current, works through the day's orders and sees everything due for delivery in one place.

## What the site does

- **Made the day it travels** - Every cake is baked to order, which is why we ask for a day's notice.
- **Your words on top** - Add a name or a line of your own for Rs.100 and we pipe it before it leaves.
- **You choose the hour** - Morning, afternoon, evening - or the midnight slot for a birthday surprise.
- **Watch it being made** - Placed, baking, out for delivery, delivered: your order page shows where it is.

## Who uses it

### Customer

- Register and sign in
- Browse cakes by occasion, flavour, eggless or keyword
- Choose weight, add a message on the cake and pick a delivery slot
- Pay by card, UPI, net banking or cash on delivery
- Track an order from placed to delivered
- Cancel an order the kitchen has not started
- Keep the delivery address and phone up to date

### Bakery counter

- Add cakes, change prices and descriptions, take cakes off the menu
- Work orders through baking, delivery and completion
- Cancel an order at any point before delivery
- See the delivery schedule for any date, slot by slot
- Customer list with order counts and spend
- Overview of orders due today and what sells

## How it behaves

- The amount is the price per kilogram times the weight chosen (`orderTotal()`).
- A message on the cake adds Rs.100 and the midnight slot adds Rs.200.
- Orders need a day's notice - a delivery date earlier than tomorrow is refused.
- A customer may cancel only while the order is still `Placed`; the counter can cancel at any time before delivery.
- An order moves Placed, Baking, Out for delivery, Delivered, one step at a time.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8006/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8006` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | counter@crumbsandco.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
06-cake-ordering/
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
