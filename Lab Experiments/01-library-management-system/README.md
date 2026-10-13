# CampusLib - Library Management System

CampusLib is the online face of the campus library. Members search the catalogue, see what they are holding and when it is due, check what they owe and download year and semester wise study material. The library desk keeps the catalogue current, issues and receives copies, raises fines and publishes material for each semester.

## What the site does

- **Check before you walk over** - Every title shows how many copies are actually on the shelf, so you never make the trip for nothing.
- **Fourteen day loans** - Borrow a copy at the desk and your account shows the expiry date of everything you are holding.
- **No surprise fines** - Rs.2 a day once a book is overdue, visible in your account from the first day and payable online.
- **Material for your semester** - Notes, question banks and lab manuals filed year and semester wise, free to download.

## Who uses it

### Member

- Register and sign in
- Search the catalogue by title, author, ISBN or category
- Borrowing history with the issue date and expiry date of every copy
- Check the fine due and pay it
- Search study material year and semester wise, then download it
- Keep the profile up to date

### Library desk

- Add, update and remove titles
- Issue a copy to a member, due in 14 days
- Accept a return and see the fine it raises
- Fine register - collect or waive
- Publish study material year and semester wise
- Overdue list, stock position and member details

## How it behaves

- The borrowing period is 14 days (`LOAN_DAYS` in `js/admin.js`).
- A fine of Rs.2 per day (`FINE_PER_DAY`) builds up after the due date and is worked out when the copy comes back.
- Issuing a copy lowers the available count; a return raises it again.
- A title with no copy on the shelf cannot be issued.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8001/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8001` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | librarian@campuslib.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
01-library-management-system/
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
