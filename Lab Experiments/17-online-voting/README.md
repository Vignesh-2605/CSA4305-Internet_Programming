# VoteOnline - VoteOnline e-Voting Platform

VoteOnline runs small elections - a municipal ward, a student union, a residents association - end to end. The commission keeps the electoral roll, sets up each election with its candidates and opens the poll. A voter sees only the elections for their own ward, reads the ballot, chooses one candidate and confirms with a one time code. Counts are sealed until the poll closes, and are then published in full.

## What the site does

- **One voter, one vote** - The roll is checked and a second vote in the same election is refused outright.
- **Confirmed with a code** - A six digit code, good for ten minutes and usable once, sits between you and the ballot box.
- **Sealed until the close** - Nobody - not even the commission - sees a count while voting is still open.
- **A receipt, not a record of choice** - You get proof your vote was counted; how you voted is never shown against your name.

## Who uses it

### Voter

- Sign in with the e-mail on the electoral roll
- See the polls open to their own ward, with every candidate and manifesto
- Choose one candidate on the ballot
- Ask for a one time code and confirm the vote with it
- Keep a receipt that the vote was counted
- Read published results once a poll closes
- Change their own password

### Election commission

- Create an election with its type, ward, polling day and question
- Add the candidates with party, symbol and manifesto
- Open the poll, and close it when voting ends
- Add voters one at a time or import a pasted list
- Edit a voter's details or strike a name off the roll
- Turnout per election and the full count once closed

## How it behaves

- A voter sees only elections whose ward matches their own, or which are marked for all wards (`openFor()`).
- A poll cannot be opened with fewer than two candidates.
- A one time code is six digits, valid for 10 minutes, and is marked used the moment a vote is cast (`liveOtp()`).
- A second vote in the same election is refused, and the check runs again at the moment of submission (`hasVoted()`).
- Counts are hidden from both consoles until the election status is `Closed` (`tally()`).
- A voter who has already voted cannot be removed from the roll.
- Imported rows are skipped when the e-mail or the voter ID is already on the roll.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8017/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8017` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@voteonline.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
17-online-voting/
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
