# ComplainEase - civic grievance portal

Residents register a complaint against a department, mark it on the ward map and follow
it through to the proof of work. Officers act on what is assigned to them. The grievance
cell assigns the work, approves officer logins and keeps the departments and notices.

Run it with `npm start` and open <http://localhost:8016/>.

## Logins

| Role | E-mail | Password |
|---|---|---|
| Administration | admin@complainease.in | `admin123` |
| Officer (Roads) | ravi@complainease.in | `officer123` |
| Officer (Water supply) | meena@complainease.in | `officer124` |
| Citizen | vignesh.s@gmail.com | `user123` |

A third officer, `arjun@complainease.in`, is seeded **unapproved** so the approval flow can
be seen: logging in as that account shows a waiting notice and no modules at all until the
cell approves it from **Officers**.

## How it behaves

**The status ladder** runs Registered, Assigned, In progress, Resolved, Closed. The cell
moves a complaint to Assigned by giving it to an officer, and only an officer of that
department may be chosen. The officer moves it along, and **the complaint cannot be marked
Resolved until proof of work has been entered** - the form refuses it otherwise.

**Closing belongs to the resident**, not to the office. A resolved complaint shows two
buttons in the citizen console: close it, or reopen it. Reopening puts it back to In
progress and writes a dated line into the action notes, so the officer sees it came back.

**The target is per department** - Roads seven days, Solid waste two. A complaint open
longer than its department's target is flagged late on the officer's list, on the cell's
dashboard and in the per-department table, which is worked out from the dates rather than
stored.

**The map** is drawn in SVG rather than pulled from a tile server, because the site has no
network dependencies. Clicking it records the point against the complaint, and the same
co-ordinates are replayed as pins on the resident's map, the officer's map and the cell's
map of everything still open. Resolved pins are green, open ones red.

**Feedback** can be left once per complaint and only after it is resolved; the form only
offers complaints that qualify. The average rating feeds the cell's overview and the
officer sees the comments on their own finished work.

**Officer accounts** are the only ones that need approval. Approving one asks for the
department, generates a staff number and a password, and shows them to be handed over. The
cell can also create a login outright, or issue a new password later.

**Portal settings** really do change the citizen console: turning off the ward map removes
it and stops the location being required, and turning off feedback removes that module
altogether.
