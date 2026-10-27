# MedCare - Hospital Appointment Booking

MedCare runs four branches across the city and takes its outpatient bookings online. Patients search for a doctor by specialty or area, see the free consulting slots for a date, book one with a token number and fill in a check-in form before they arrive. The administration keeps doctors, branches and the day's list in order and watches how each specialty is used.

## What the site does

- **Slots that are really free** - Each doctor's consulting hours are split into twenty minute slots; taken ones never show as open.
- **A token, not a queue** - Your appointment carries a token number for that doctor's list on that day.
- **Check in from home** - Symptoms, how long, medicines and allergies - filled in before you arrive, read by the desk.
- **Your record stays with you** - Every past consultation and what you reported at the time, in one place.

## Who uses it

### Patient

- Register and sign in
- Search doctors by specialty, area or name, with fees and ratings
- See free slots for a date and book one with a token
- Fill in or edit the check-in form before the visit
- Cancel an appointment up to two hours before
- Past consultations with what was reported at the time
- Rate and review a doctor after the visit

### Hospital administration

- Maintain doctors: specialty, qualification, branch, fee, days and hours
- Maintain branches with address, phone and bed count
- Day list filtered by date or doctor
- Read the check-in form a patient submitted
- Close a consultation or cancel an appointment
- Statistics by specialty and by doctor, with ratings
- Moderate patient reviews

## How it behaves

- Consulting hours are divided into 20 minute slots between each doctor's own start and finish time (`slotsFor()`).
- A slot another patient holds is never offered, and is checked once more when the booking is confirmed.
- A doctor who does not sit on that weekday shows no slots at all.
- The token number is the appointment's position in that doctor's list for the day (`tokenFor()`).
- A patient may cancel up to 2 hours before the slot (`canCancel()`); the hospital may cancel at any time.
- A doctor's rating is the average of the reviews patients have left (`ratingOf()`).

## How to run

Open a terminal in this folder and start the site:

```
npm start
```

Then open <http://localhost:8008/> in the browser.

`npm start` only runs `node serve.js`; the project has **no dependencies**, so there is
nothing to `npm install`. Stop the server with **Ctrl + C**. To use another port:
`npm start -- 3000`.

Without Node.js, `python -m http.server 8008` serves the same folder, and the site also
works by double-clicking `index.html`.

Records are kept in the browser's `localStorage`, so they survive a refresh.
**Reset demo data** in the dashboard sidebar restores the seeded sample rows.

## Accounts to try

| Role | E-mail | Password |
|---|---|---|
| Admin | admin@medcare.in | admin123 |
| User | vignesh.s@gmail.com | user123 |

Anyone else can create an account from the **Register** page.

## Built with

Plain HTML, CSS and JavaScript - no framework and no build step. Records are kept in the
browser's `localStorage`, so the site runs without a database server.

## Project structure

```
08-hospital-appointment-booking/
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
