# AgriMart - AgriMart Farm Supplies Marketplace

AgriMart puts farmers and agricultural suppliers in front of buyers directly. A farmer lists seeds, fertilisers, tools or produce at their own price and ships what sells. A buyer fills a cart, tops up a wallet, confirms the order with a one time code and follows it from packed to delivered. The market desk keeps an eye on listings, orders and both sides of the account.

## What the site does

- **The farmer sets the price** - No middleman in between - the seller lists, prices and ships their own lines.
- **Paid from a wallet** - Top up once; every order comes out of the balance with a statement behind it.
- **Confirmed with a code** - A six digit code stands between a full cart and a placed order.
- **Shipping you can see** - Placed, packed, shipped, delivered - set by the farmer, visible to the buyer.

## Who uses it

### Buyer

- Register and sign in
- Search the market by category, budget, item or farmer
- Fill a cart and change quantities
- Top up a wallet and read the statement
- Check out with a one time code to the mobile
- Track the shipping status and cancel while it is still placed

### Farmer

- Sign in to a seller account
- List produce and inputs with price, unit, stock and a photo
- Edit the price or stock, or take a line down
- See orders containing their lines, with the buyer's address
- Move the order packed, shipped and delivered
- Sales totals item by item

### Market desk

- Every listing, with the power to take one down
- Every order on the market
- Farmer list with lines sold and value moved
- Buyer list with wallet balances
- Stock and listings by category

## How it behaves

- A cart line cannot exceed the stock the farmer holds, and the check runs again at confirmation.
- Checkout is refused unless the wallet covers the goods and the delivery.
- Delivery is Rs.90, free once the goods come to Rs.2,000.
- The order is only created after the one time code is entered correctly.
- Stock comes off on order and goes back on cancellation, along with a refund to the wallet.
- Only the farmer whose lines are in an order can move its shipping status.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8018/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8018` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@agrimart.in | admin123 |
| Farmer | murugan@agrimart.in | farmer123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
18-agri-marketplace/
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
