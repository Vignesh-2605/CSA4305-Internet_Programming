# StyleHub - StyleHub Online Fashion Store

StyleHub sells clothing, footwear and accessories for men, women and kids. Shoppers filter by department, type, size or colour, check a measurement chart before they choose, and buy at a price that shows the flash sale against the MRP. Anything can be returned or exchanged within seven days of delivery. The merchandising desk keeps the catalogue, the sale, the size chart, the orders and the return requests in order.

## What the site does

- **Pick the size on the tile** - Size and colour are chosen before the piece goes in the bag, so nothing is guessed at checkout.
- **A real size chart** - Chest, waist and length in inches for every department - measure something that fits and compare.
- **Seven days to change your mind** - Return for a refund or exchange for another size, raised from your orders page.
- **Today's offers, clearly priced** - A flash sale cut is applied on top of the usual price and shown against the MRP.

## Who uses it

### Shopper

- Register, sign in, sign out
- Filter by department, type, size, colour, budget or sale, and search
- Open a style for its description, sizes, colours and reviews
- Choose size and colour and add to the bag; change quantities or remove lines
- Read the size guide before choosing
- Check out with an address and a payment method
- Track an order and cancel one not yet packed
- Raise a return or an exchange within seven days of delivery
- Keep a wishlist and review a style

### Merchandising desk

- Add styles with sizes, colours, price, MRP and stock
- Put a style on flash sale and take it off again
- Maintain the size chart for each department
- Work orders through packing, dispatch and delivery
- Approve, reject or complete returns and exchanges
- Customer list with spend and return counts
- Moderate reviews

## How it behaves

- The selling price is the listed price less the flash sale percentage (`salePrice()`); the discount shown is measured against the MRP.
- A piece goes into the bag with a size and a colour, and the same style in another size is a separate line.
- The bag refuses more pieces than the stock holds, and checks again at checkout.
- Delivery is Rs.79, free from Rs.1,500 upwards (`shippingFor()`).
- A return or exchange can be raised only on a delivered order, within 7 days of delivery (`returnWindow()`).
- An approved return puts the piece back in stock when it is marked completed; an exchange does not.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8010/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8010` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@stylehub.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
10-fashion-online-store/
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
