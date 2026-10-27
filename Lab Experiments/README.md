# Websites

Fifteen independent websites, each in its own folder. Every one is a complete site written
in plain HTML, CSS and JavaScript - no framework, no database server, no build step.

| Folder | Site | What it is | Address |
|---|---|---|---|
| `01-library-management-system` | CampusLib | Library catalogue, borrowing, fines, study material | <http://localhost:8001/> |
| `02-hotel-room-booking` | StayWell | Hotel room availability and booking | <http://localhost:8002/> |
| `03-bus-ticket-booking` | RouteOne | Bus tickets with a live seat map | <http://localhost:8003/> |
| `04-train-reservation-system` | RailDesk | Train reservation, PNR status, refunds | <http://localhost:8004/> |
| `05-flight-reservation-system` | SkyRoute | Flight booking, seat map, e-tickets | <http://localhost:8005/> |
| `06-cake-ordering` | Crumbs & Co | Cakes to order with weight, message and delivery slot | <http://localhost:8006/> |
| `07-beauty-parlour-appointments` | Bloom Studio | Salon diary, deposits, reschedule and cancel | <http://localhost:8007/> |
| `08-hospital-appointment-booking` | MedCare | Doctor search, slot tokens, check-in forms | <http://localhost:8008/> |
| `09-electronics-online-store` | TechSavvy | Electronics shopping, cart, wishlist, orders | <http://localhost:8009/> |
| `10-fashion-online-store` | StyleHub | Fashion with sizes, size guide, sales and returns | <http://localhost:8010/> |
| `11-real-estate-portal` | HomeFinder | Property search, saved searches, viewings, loan calculator | <http://localhost:8011/> |
| `12-insurance-management` | InsureEasy | Plan comparison, policies, premiums, claims, agents | <http://localhost:8012/> |
| `13-flowers-gifts-store` | BlossomGifts | Gifts with timed delivery, gift cards, loyalty discounts | <http://localhost:8013/> |
| `14-second-hand-marketplace` | ReNewMarket | Member listings, price offers, logistics, feedback | <http://localhost:8014/> |
| `15-toll-payment-system` | EasyToll | Toll wallet, e-tickets, passes, gate verification | <http://localhost:8015/> |

---

## Running one

Open a terminal **inside that site's folder** and run:

```
npm start
```

Then open the address it prints. Each site has its own port, so several can run at once.

`npm start` only runs `node serve.js`, a small server built from Node's own modules.
There are **no dependencies**, so `npm install` is not needed and no `node_modules`
folder is ever created. Stop the server with **Ctrl + C**, or pick another port with
`npm start -- 3000`.

Without Node.js, `python -m http.server 8001` inside the folder does the same job, and
every site also works by double-clicking its `index.html`.

---

## Accounts

Every site seeds a staff account and a customer account; two of them seed a third role as
well. Passwords follow one pattern: staff `admin123`, customer `user123`, and the third
role has its own.

| # | Staff login | Customer login | Third role |
|---|---|---|---|
| 01 | librarian@campuslib.in | vignesh.s@gmail.com | - |
| 02 | manager@staywell.example | vignesh.s@gmail.com | - |
| 03 | admin@routeone.in | vignesh.s@gmail.com | - |
| 04 | admin@raildesk.in | vignesh.s@gmail.com | - |
| 05 | admin@skyroute.in | vignesh.s@gmail.com | - |
| 06 | counter@crumbsandco.in | vignesh.s@gmail.com | - |
| 07 | manager@bloomstudio.in | vignesh.s@gmail.com | - |
| 08 | admin@medcare.in | vignesh.s@gmail.com | - |
| 09 | admin@techsavvy.in | vignesh.s@gmail.com | - |
| 10 | admin@stylehub.in | vignesh.s@gmail.com | - |
| 11 | desk@homefinder.in | vignesh.s@gmail.com | - |
| 12 | admin@insureeasy.in | vignesh.s@gmail.com | **agent** suresh@insureeasy.in / `agent123` |
| 13 | shop@blossomgifts.in | vignesh.s@gmail.com | - |
| 14 | admin@renewmarket.in | vignesh.s@gmail.com | - |
| 15 | admin@easytoll.in | vignesh.s@gmail.com | **toll gate** paranur@easytoll.in / `gate123` |

New accounts can be registered from any site. The login page carries a tab for each role
and a "forgot password" panel that really does change the password.

---

## What is in each site

### 01 - CampusLib, library management
**Librarian:** overview, books, issue book, return book, make fine, study material, students.
**Student:** search book, borrow history, check fine, study material, profile.

Loans run fourteen days. A fine of Rs.2 a day builds up once a book is overdue and is worked
out when the copy comes back. Issuing a copy lowers the available count and a return raises
it, so a title with nothing on the shelf cannot be issued.

### 02 - StayWell, hotel room booking
**Administrator:** overview, room types and tariff, all bookings, static pages, guest reviews.
**Guest:** search and book, my bookings, reviews, hotel information, profile.

Availability is worked out by subtracting bookings whose dates overlap from the room count
of that type. A guest may change or cancel only three or more days before arrival; the front
office has no such limit. The admin also edits the about, contact, Q&A and privacy pages.

### 03 - RouteOne, bus ticket booking
**Operator:** report generation, bus categories, bus information, bookings, comments, news,
registered users. **Passenger:** search and book, my tickets, comments, news, profile.

The seat map greys out seats already sold and checks them again at payment, so the same seat
cannot go twice. Cancelling a ticket releases its seats back to the map immediately.

### 04 - RailDesk, train reservation
**Administrator:** overview, trains, fares and seats, reservations, refund rules, payments.
**Passenger:** search trains, PNR status, my tickets, profile.

Berths are allotted CNF while the class lasts, then RAC up to a quota of six, then waiting
list - the same order as the counter. A ten digit PNR is issued on payment, and a
cancellation refunds whatever the slab table says for the days left before the journey.

### 05 - SkyRoute, flight reservation
**Airline desk:** admin report, flight schedule, fares and seat inventory, booking status,
customer feedback, user accounts. **Traveller:** search flight, my tickets, feedback, profile.

Seat labels (1A to 6F) are generated from the seat count of the class, six to a row, and
exactly one seat must be chosen per passenger. Cancelling refunds 80% three or more days
before departure and 50% inside that.

### 06 - Crumbs & Co, cake ordering
**Bakery counter:** overview, cake menu, orders, delivery schedule, customers.
**Customer:** our cakes, my orders, track an order, profile.

The total is the price per kilogram times the weight, plus Rs.100 for a message piped on the
cake and Rs.200 for the midnight slot. Orders need a day's notice. A customer can cancel only
while the order is still "placed" - once baking starts the ingredients are already in.

### 07 - Bloom Studio, salon appointments
**Salon manager:** day diary, appointments, services, stylists, blocked hours, feedback.
**Customer:** book an appointment, my appointments, leave feedback, my details.

The diary runs in half hours inside each stylist's own working hours. A slot is offered only
if the whole treatment fits before closing and nothing overlaps it, including the hours the
salon has blocked for training or leave. A 30% deposit holds the chair, an unpaid hold is
released after 24 hours, and a customer can move or cancel up to two hours before.

### 08 - MedCare, hospital appointments
**Hospital:** statistics, doctors, hospitals, appointments, patient reviews.
**Patient:** find a doctor, my appointments, past visits, my details.

Consulting hours split into twenty minute slots on the days that doctor actually sits. Token
numbers follow the clock rather than the order of booking, so they renumber when somebody
takes an earlier slot. The check-in form is filled at home and read at the desk. Cancellation
closes two hours before the slot, and a doctor's rating is the average of patient reviews.

### 09 - TechSavvy, electronics store
**Back office:** overview, categories, products, orders, customers, reviews.
**Customer:** shop, my cart, my orders, wishlist, my account.

The cart refuses more units than the stock holds and checks again at checkout. Ordering
lowers stock and cancelling puts it back. Delivery is Rs.99, free once the items reach
Rs.5,000. An order moves placed, packed, shipped, delivered, and the buyer can cancel only
while it is still placed.

### 10 - StyleHub, fashion store
**Merchandising desk:** overview, products, size guide, orders, returns and exchanges,
customers, reviews. **Shopper:** shop, size guide, cart, orders, returns, wishlist, account.

Size and colour are chosen before a piece goes in the bag, so the same style in two sizes is
two separate lines. A flash sale cuts the listed price and the saving is shown against the
MRP. A return or an exchange can be raised within seven days of delivery, and an approved
return puts the piece back in stock when it is completed.

### 11 - HomeFinder, property portal
**Agency desk:** overview, listings, agents, viewings, enquiries, visitor log, buyers.
**Buyer:** search properties, saved searches, shortlist, my viewings, agents, loan
calculator, my details.

A search can be saved under a name and run again later, with a live count of what matches
now. Every listing is measured in rupees per square foot against other listings of the same
purpose in that locality - or city-wide when the locality has nothing else to compare with.
The loan calculator uses the standard EMI formula on the amount left after the down payment.
Opening a listing's details records a visit, which is what the agency's visitor log shows.

### 12 - InsureEasy, insurance management *(three roles)*
**Head office:** overview, agent approvals, agents, plans, all policies, claims.
**Agent:** my customers, issue a policy, my policies, send an alert, my earnings.
**Policyholder:** compare plans, my policies, claims, alerts, my details.

An agent can register but sees only a waiting notice - no modules at all - until head office
approves the login. Policies run Active, then Due for renewal inside thirty days of expiry,
then Lapsed; paying a renewal premium moves the cover date on by a year. A claim for more
than the sum assured is refused, as is one against a policy that is not in force. Agents earn
10% of the premium on everything they write.

### 13 - BlossomGifts, flowers and gifts
**Shop floor:** overview, catalogue, orders, delivery run, offers, customers, reviews.
**Customer:** shop, basket, my orders, my account.

The bill is worked out in order: the standing discount first, then the code on what is left,
then delivery. Three delivered orders earn Silver and 5% off everything, six earn Gold and
10%. Delivery is free from Rs.999; same day adds Rs.150 and the midnight slot Rs.200. Orders
can be dated up to ninety days ahead, and same day is refused if anything in the basket
cannot go out that day.

### 14 - ReNewMarket, second-hand marketplace
**Administration:** overview, members, categories, listings, orders, feedback.
**Member:** browse, sell an item, offers, my deals, watchlist, feedback, my account.

The same account buys and sells. Nobody can bid on their own listing, offers are only
possible where the seller marked the item negotiable, and an offer above the asking price is
refused. One offer stays open per buyer per item. Accepting an offer sells at that price,
marks the listing sold and rejects every other open offer. A deal goes paid, shipped,
received, and feedback can only be left on a deal marked received, once per deal.

### 15 - EasyToll, toll payment *(three roles)*
**Authority:** overview, toll plazas, pass approvals, drivers, gate logins, crossings.
**Driver:** my wallet, my vehicles, buy an e-ticket, toll passes, my crossings, my account.
**Toll gate:** verify a code, today's crossings, this booth.

Every debit and credit goes through a single function, so the balance and the statement
cannot disagree. Fares follow the plaza's own rate for that class of vehicle. A pass is
pending until the authority approves it and issues the code; rejecting it refunds the wallet.
At the gate a ticket is accepted only if it is unused, dated today and for that plaza, and is
marked used on the way through; a pass only if it is approved, in date and for that plaza.

---

## How a site is put together

Every folder has the same shape:

```
NN-site-name/
├── package.json                npm start -> node serve.js (no dependencies)
├── serve.js                    local web server for this site
├── index.html                  the public home page
├── pages/
│   ├── login.html              role tabs, sign in, forgot password
│   ├── register.html           registration
│   ├── admin-dashboard.html    staff console
│   └── user-dashboard.html     customer console
├── css/
│   └── style.css               the whole stylesheet
├── js/
│   ├── store.js                localStorage data layer + the seed data
│   ├── auth.js                 register / login / session / page guard
│   ├── dash.js                 dashboard engine - menu, tables, forms
│   ├── home.js                 fills the home page from the live data
│   ├── admin.js                staff modules
│   └── user.js                 customer modules
└── README.md                   what the site does and how it behaves
```

Sites 12 and 15 add a third console: `pages/agent-dashboard.html` with `js/agent.js`, and
`pages/gate-dashboard.html` with `js/gate.js`.

**The shared files do the same job everywhere.** `store.js` is a small table-based wrapper
over `localStorage` - `all`, `get`, `insert`, `update`, `remove` - with the starting records
at the top. `auth.js` handles registration, login by role, the session, and the guard that
bounces anyone who opens a dashboard without signing in. `dash.js` builds the side menu and
renders a table or a form from a list of field definitions, which is why the consoles look
and behave alike. `home.js` reads the same tables the application uses, so the public page
can never advertise a price, a room or a listing the system does not actually have.

---

## Where the data lives

Each site keeps its records in the browser's `localStorage` under its own key, so the fifteen
never interfere with each other and the data survives a refresh. Every dashboard has a
**Reset data** button in the sidebar that puts the starting records back.

Nothing leaves the browser. There is no server-side database, which is why the whole thing
runs out of a folder.

---

## Progress

Fifteen of the forty-six questions are done - 01 to 15 above. The rest, 16 to 46, are still
to be built, in the same structure and on ports 8016 upwards.
