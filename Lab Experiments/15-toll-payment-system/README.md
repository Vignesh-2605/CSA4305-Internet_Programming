# EasyToll - EasyToll Online Toll Payment

EasyToll lets drivers pay a highway toll before they reach the booth. A driver tops up a wallet, registers their vehicles and buys either an e-ticket for a single crossing or a pass for a month at one plaza. Passes are approved by the authority, which issues the code. At the gate the operator reads the code, the system checks it is valid for that plaza and that date, and logs the crossing. The authority maintains the plazas and their rates, the gate logins and the record of everything that went through.

## What the site does

- **One wallet, every plaza** - Top up once; tickets and passes come out of the same balance with a full statement.
- **Rates by vehicle class** - Car, light commercial or heavy - the plaza's own rate is applied, not a guess.
- **A code, not a queue** - Every ticket and approved pass carries a code the booth reads off your screen.
- **Passes that are checked** - A pass works only at the plaza it was issued for, and only between its dates.

## Who uses it

### Driver

- Register and sign in
- Top up the wallet and read the statement
- Add or remove vehicles with their class
- Buy an e-ticket for a plaza and a date, priced by vehicle class
- Apply for a single return, local monthly or commercial monthly pass
- Renew a pass in its last week
- Show the code for any ticket or pass
- See every crossing their vehicles made

### Toll gate operator

- Sign in to the booth account
- Type or scan a code and see at once whether to allow or stop
- Crossings logged automatically, with the ticket marked used
- Today's log for that booth
- Change which plaza the booth is posted at

### Toll authority

- Maintain plazas, highways and the rate for each vehicle class
- Approve or reject pass applications, issuing the code on approval
- Drivers, their wallets and the vehicles on each account
- Create and remove gate logins and assign them to a plaza
- The full crossing log and collections

## How it behaves

- Every debit and credit goes through one function, so the balance and the statement cannot disagree (`moveMoney()`).
- A ticket or pass is refused if the wallet will not cover it.
- The fare is the plaza's own rate for that class of vehicle - car, light commercial or heavy (`rateFor()`).
- A pass is Pending until the authority approves it and a code is issued; rejecting it refunds the wallet.
- At the gate a pass is accepted only if it is approved, in date, and for that plaza (`passValid()`).
- A ticket is accepted only if it is unused, dated today and for that plaza, and is marked used on the way through (`ticketValid()`).
- A vehicle with a pass still in force cannot be removed from the account.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8015/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8015` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@easytoll.in | admin123 |
| User | vignesh.s@gmail.com | user123 |
| Tollgate | paranur@easytoll.in | gate123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
15-toll-payment-system/
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
