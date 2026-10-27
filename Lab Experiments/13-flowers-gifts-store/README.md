# BlossomGifts - BlossomGifts Flowers and Gifts

BlossomGifts is a florist and gift shop that takes its orders online. Customers browse by occasion, recipient and budget, write their own card message, choose a delivery date up to ninety days ahead and one of four time slots, and pay with a discount code or the standing discount their past orders have earned. The shop floor works each order through the workshop and sees the whole delivery run for a day, slot by slot.

## What the site does

- **You choose the hour** - Morning, afternoon, evening - or the midnight slot when it has to be the first thing they see.
- **Book it months ahead** - Set the date up to ninety days out and forget about it; we will not.
- **Your words, not ours** - The message you type is printed on the gift card that travels with the order.
- **Regulars pay less** - Three delivered orders earn 5% off everything, six earn 10%, applied automatically.

## Who uses it

### Customer

- Register and sign in
- Browse by occasion, recipient, category, budget or same day delivery
- Add to the basket, change quantities, remove lines
- Enter the recipient's name, phone and address
- Pick a delivery date up to ninety days ahead and a time slot
- Write the message for the gift card
- Apply a discount code on top of the standing discount
- Track an order and cancel one that has not been made up

### Shop floor

- Maintain the catalogue: occasion, recipient, price, stock and same day flag
- Work orders through made up, out for delivery and delivered
- Print the gift card for any order
- See the delivery run for a date, slot by slot, with addresses and messages
- Create and switch off discount codes
- Customer list with the standing discount each has earned
- Moderate reviews

## How it behaves

- The bill is worked out in order: the standing discount first, then the code on what is left, then delivery (`priceOrder()`).
- A standing discount comes from delivered orders - 3 earns Silver and 5%, 6 earns Gold and 10% (`tierOf()`).
- Delivery is Rs.60, free once the goods come to Rs.999; same day adds Rs.150 and the midnight slot Rs.200.
- Same day delivery is refused if anything in the basket is not marked for it.
- Orders can be dated up to 90 days ahead; anything more than a day out is flagged as booked ahead.
- A customer can cancel only while the order is `Placed`; cancelling anywhere puts the stock back.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8013/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8013` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | shop@blossomgifts.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
13-flowers-gifts-store/
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
