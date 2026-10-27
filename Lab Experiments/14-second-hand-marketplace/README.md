# ReNewMarket - ReNewMarket Second-hand Marketplace

ReNewMarket is a marketplace for used goods. The same account sells and buys: members list what they no longer need, other members buy at the asking price or send an offer, and the two agree whether it is a pickup or a delivery. A deal goes from paid to shipped to received, and once it is received each side can rate the other. The site administration looks after members, categories, listings and the record of deals.

## What the site does

- **Haggle, don't guess** - Send the seller a price with a note; they accept, reject, or you withdraw it.
- **Pickup or delivery** - Agreed between the two of you and tracked from paid to shipped to received.
- **Ratings that mean something** - Feedback can only be left on a deal that actually completed, and only once.
- **Sell in a minute** - Title, category, condition, price and an honest description - it is live straight away.

## Who uses it

### Member

- Register and sign in
- Browse by category, condition, budget, area or keyword and sort by price
- Buy at the asking price, choosing pickup or delivery
- Make an offer with a message, or withdraw one
- List an item, edit the price or take it down
- Accept or reject offers on their own items
- Mark a sale as sent, or a purchase as received
- Keep a watchlist and leave feedback after a completed deal

### Administration

- Edit a member's details or set their login password
- Delete a member, which takes their live listings down
- Add and remove categories
- Take down any listing
- Change the logistics status of a deal, or delete the record
- Remove feedback
- Live and sold counts by category

## How it behaves

- A member cannot buy or make an offer on their own listing.
- Offers are only possible where the seller marked the listing negotiable, and an offer above the asking price is refused.
- One open offer per buyer per item; it can be withdrawn while it is pending.
- Accepting an offer sells the item at that price, marks the listing sold and rejects every other open offer (`completeSale()`).
- A deal moves Paid, Shipped, Received: the seller marks it sent and the buyer confirms arrival.
- Feedback can only be left on a deal marked received, and only once per deal.
- Deleting a member takes their live listings down with them.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8014/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8014` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@renewmarket.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
14-second-hand-marketplace/
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
