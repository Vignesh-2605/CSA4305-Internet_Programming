# InsureEasy - InsureEasy Policy Management

InsureEasy brings health, motor, home, life and travel policies into one place. Customers compare the plans of a category side by side, apply online or through an agent, pay renewal premiums from their account and file claims that they can follow to settlement. Agents open customer accounts, issue policies and send reminders, but only once head office has approved their login. Head office keeps the plans, the agents, the policy register and the claims.

## What the site does

- **Compare like with like** - Plans of one category in a single table, with the cost per lakh of cover worked out for you.
- **Renewals that do not creep up** - A policy inside thirty days of expiry is flagged in your account and by your agent.
- **Claims you can follow** - Submitted, under review, approved, settled - the status sits against the claim.
- **An agent who is accountable** - Every agent login is approved by head office before they can write a single policy.

## Who uses it

### Policyholder

- Register and sign in
- Compare the plans of a category, with cost per lakh of cover
- Apply for a plan, name a nominee and pay the first premium
- See every policy, the days left and the total cover held
- Pay a renewal premium and get the cover extended
- Premium statement for any policy
- File a claim and follow it to settlement
- Read the alerts the agent sent

### Agent

- Register, then wait for head office to approve the login
- Create customer accounts
- Issue a policy against a customer and a plan
- Change the nominee on a policy
- Send a renewal reminder or any other alert by SMS or e-mail
- See which policies need chasing and the commission earned

### Head office

- Approve, reject or suspend agent logins
- Maintain the plans: cover, premium, term and settlement ratio
- See every policy, who wrote it and what has been collected
- Cancel a policy
- Move claims through review, approval and settlement
- Business by category and premium collected

## How it behaves

- An agent registers but cannot use the console until head office approves the login; the agent console shows a waiting notice instead.
- A policy number is generated from the record id, and the end date is the start plus the term of the plan.
- A policy is `Active`, `Due for renewal` inside 30 days of the end date, or `Lapsed` once past it (`lifecycle()`).
- Paying a renewal premium moves the end date on by a year and puts the policy back in force.
- A claim is refused if it is for more than the sum assured, or if the policy is not in force.
- Agent commission is 10% of the premium on every policy that agent wrote (`COMMISSION_PCT`).

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8012/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8012` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@insureeasy.in | admin123 |
| Agent | suresh@insureeasy.in | agent123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
12-insurance-management/
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
