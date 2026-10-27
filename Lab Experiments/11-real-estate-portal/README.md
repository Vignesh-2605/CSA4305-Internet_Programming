# HomeFinder - Home Finder Property Portal

HomeFinder lists residential and commercial property in Chennai for sale and for rent. Buyers filter by purpose, type, city, budget and size, save a search to run again later, shortlist what interests them and ask the agent for a viewing. Each listing carries the rate per square foot against the locality average, and a loan calculator works out the monthly instalment. The agency desk keeps the listings, the agents, the viewing diary and the enquiries.

## What the site does

- **Save the search, not the screenshot** - Keep your filters under a name and run them again whenever new listings come in.
- **Know the going rate** - Every listing is compared against the average rate per square foot in that locality.
- **Book the viewing online** - Ask for a date and time; the agent confirms it and it sits in your account.
- **Work out the instalment** - Price, down payment, rate and term give you the monthly figure and the total interest.

## Who uses it

### Buyer

- Register and sign in
- Search by purpose, type, city, budget, bedrooms or keyword
- Open a listing for amenities, the virtual tour reference, the agent and the locality rate
- Save a search under a name and run it again, with a live match count
- Shortlist properties and open them on the map
- Request a viewing and cancel one
- Search agents and companies by area, and write to an agent
- Work out a loan instalment and compare locality rates

### Agency desk

- Maintain listings: purpose, type, locality, price, size, furnishing, amenities, agent and status
- Maintain agents and the companies they work for
- Confirm, complete or cancel any viewing
- Answer buyer enquiries
- See which buyer opened which listing, and when
- Buyer list with saved searches, shortlists and viewings
- Locality averages and the most looked-at properties

## How it behaves

- A search is matched against listings by purpose, type, city, budget and bedrooms, and only `Available` ones are returned (`matches()`).
- A saved search stores those criteria, so the same filters can be run again and the match count is live.
- The rate per square foot is price divided by built-up area; it is compared only against listings of the same purpose, in the locality, or city-wide when the locality has nothing else (`rateBasis()`).
- The monthly instalment uses the standard EMI formula on the amount left after the down payment (`emi()`).
- Opening a listing's details records a visit, which is what the agency's visitor log shows.
- A buyer may cancel a viewing while it is requested or confirmed; the agency can confirm, complete or cancel any of them.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8011/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8011` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | desk@homefinder.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
11-real-estate-portal/
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
