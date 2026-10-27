# TechSavvy - TechSavvy Online Electronics Store

TechSavvy is an online shop for phones, laptops, tablets and accessories. Products are grouped in categories and sub categories, can be filtered by brand or budget and carry reviews from people who bought them. Customers fill a cart, keep a wishlist, check out with an address and a payment method, and follow the order to the door. The back office keeps the catalogue, prices, stock and orders in order.

## What the site does

- **Stock you can trust** - The cart will not let you order more units than we actually have on the shelf.
- **Reviews from buyers** - Ratings and comments sit on the product itself, written by people who bought it.
- **Free delivery over Rs.5,000** - Below that it is a flat Rs.99, worked out in the order summary before you pay.
- **Track every order** - Placed, packed, shipped, delivered - and cancel yourself while it is still placed.

## Who uses it

### Customer

- Register, sign in, sign out
- Browse categories and sub categories, search, filter by brand and budget, sort by price
- Open a product for its description, stock and reviews
- Add to the cart, change quantities, remove items or empty the cart
- Keep a wishlist and move items from it into the cart
- Check out with a delivery address and a payment method
- Track an order, see order history and cancel one not yet packed
- Review a product

### Store back office

- Maintain categories and their sub categories
- Add products, change price, description and stock, remove products
- Work orders through packing, dispatch and delivery
- Cancel an order and return its stock
- See every customer who checked out, with order counts and spend
- Low stock list and best sellers
- Moderate product reviews

## How it behaves

- The cart refuses a quantity greater than the units in stock, and checks again at checkout.
- Checking out lowers the stock of each item; cancelling an order puts it back.
- Shipping is Rs.99, free once the items come to Rs.5,000 or more (`shippingFor()`).
- A customer can cancel only while the order is still `Placed`; the store can cancel until it is delivered.
- An order moves Placed, Packed, Shipped, Delivered, one step at a time.
- A product's rating is the average of its reviews (`ratingOf()`).

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8009/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8009` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@techsavvy.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
09-electronics-online-store/
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
