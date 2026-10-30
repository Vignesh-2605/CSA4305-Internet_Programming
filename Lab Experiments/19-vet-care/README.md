# VetCure - VetCure Remote Veterinary Advice

VetCure lets a farmer put a sick animal in front of a veterinary surgeon without loading it into a van. The farmer signs up with a government hospital free of charge, or with a private clinic for a monthly fee paid by bank transfer or easy paisa, then sends the signs with a photo, video or voice note. The surgeon answers with a diagnosis, what to do and what to give, and keeps a library of common illnesses. Answered cases build a picture of what is going round in each district.

## What the site does

- **Photo, video or voice** - Send what you can actually capture in a shed - not a form you have to type out.
- **Free where it should be** - A government veterinary hospital costs nothing; a private clinic states its fee up front.
- **An answer you can act on** - A diagnosis, what to do, and the medicines to give - kept against that animal.
- **A library to check first** - Common illnesses with the signs and the treatment, written by the vets themselves.

## Who uses it

### Farmer

- Register and sign in
- Compare vets - government or private, with the fee stated
- Sign up with one, paying by bank transfer, easy paisa or UPI where there is a fee
- Send a case with the animal, district, signs and a photo, video or voice note
- Read the diagnosis, what to do and the medicines prescribed
- Search the cure library and read district notices
- See every payment made

### Veterinary surgeon

- See every case waiting and answer it with a diagnosis and treatment
- Close a case once it is finished
- Maintain the cure library of illnesses, signs and treatments
- Post notices for a district
- See the fees received and set where farmers should pay
- See which illness is showing up where, by district and animal

## How it behaves

- A case cannot be sent without an active subscription to a vet (`activeSub()`).
- A government hospital subscription is free; a private clinic charges Rs.300 for thirty days and the payment is recorded against the doctor.
- A subscription runs thirty days from the day it is taken, and a second one cannot be taken while the first is live.
- A case goes Open, then Answered when the surgeon gives a diagnosis, then Closed.
- The district analysis counts only cases that carry a diagnosis, so it reflects answered work.

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8019/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8019` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Doctor | arul@vetcure.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
19-vet-care/
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
