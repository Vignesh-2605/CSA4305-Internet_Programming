# Websites

Five independent websites, each in its own folder. Every one is a complete site written
in plain HTML, CSS and JavaScript - no framework, no database server, no build step.

| Folder | Site | What it is | Address |
|---|---|---|---|
| `01-library-management-system` | CampusLib | Library catalogue, borrowing, fines, study material | <http://localhost:8001/> |
| `02-hotel-room-booking` | StayWell | Hotel room availability and booking | <http://localhost:8002/> |
| `03-bus-ticket-booking` | RouteOne | Bus tickets with a live seat map | <http://localhost:8003/> |
| `04-train-reservation-system` | RailDesk | Train reservation, PNR status, refunds | <http://localhost:8004/> |
| `05-flight-reservation-system` | SkyRoute | Flight booking, seat map, e-tickets | <http://localhost:8005/> |

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

## Accounts

Each site seeds one staff account and one customer account; the exact addresses are in
that site's own `README.md`. Visitors can also register from the site itself.

## Data

Each site keeps its records in the browser's `localStorage` under its own key, so data
survives a refresh and the sites never interfere with each other. Every dashboard has a
**Reset data** button in the sidebar that restores the starting records.

## Structure of one site

```
<site-folder>/
├── package.json                npm start -> node serve.js (no dependencies)
├── serve.js                    local web server for this site
├── index.html                  home page
├── pages/                      login, register, admin dashboard, user dashboard
├── css/style.css               stylesheet for the whole site
├── js/                         store.js, auth.js, dash.js, admin.js, user.js
└── README.md                   what the site does and how to run it
```
