/* ==========================================================================
   user.js - Guest dashboard
   Modules: availability search + booking, my bookings (change / cancel with
            the 3 day rule), reviews, hotel information, profile.
   ========================================================================== */

const SESSION = Auth.require("user");
initShell(SESSION);

/* ---- rules shared by both consoles ------------------------------------ */
const CHANGE_WINDOW = 3;   // a booking may be changed/cancelled only this many
                           // days (or more) before the arrival date

const nights = (ci, co) => Math.max(1, daysBetween(ci, co));

/* rooms of `type` already blocked for a date range (confirmed bookings only) */
function roomsBooked(type, ci, co, ignoreId) {
  return DB.all("bookings").filter(b =>
    b.status === "Confirmed" && b.type === type &&
    String(b.id) !== String(ignoreId) &&
    new Date(b.checkIn) < new Date(co) && new Date(ci) < new Date(b.checkOut)
  ).length;
}

function roomsFree(type, ci, co, ignoreId) {
  const rt = DB.all("roomTypes").find(r => r.type === type);
  if (!rt) return 0;
  return Number(rt.qty) - roomsBooked(type, ci, co, ignoreId);
}

const canChange = b =>
  b.status === "Confirmed" && daysBetween(today(), b.checkIn) >= CHANGE_WINDOW;

const myBookings = () => DB.all("bookings").filter(b => b.guest === SESSION.email);
let changing = null;

const MODULES = [

  /* ------------------------------------------------------------------ */
  {
    id: "search", label: "Search & Book", type: "custom",
    desc: "Check room availability for your dates, then book.",
    render(host) {
      const card = Dash.card(
        "<h3>Check availability</h3>" +
        '<div class="form-row">' +
        '  <div class="field"><label>Destination</label>' +
        '    <select id="city"><option>Chennai</option><option>Kodaikanal</option>' +
        '    <option>Ooty</option></select></div>' +
        '  <div class="field"><label>Check in</label><input type="date" id="ci" value="' +
             addDays(today(), 1) + '"></div>' +
        '  <div class="field"><label>Check out</label><input type="date" id="co" value="' +
             addDays(today(), 3) + '"></div>' +
        '  <div class="field"><label>Guests</label><input type="number" id="pax" min="1" value="2"></div>' +
        "</div>" +
        '<button class="btn" id="go">Search rooms</button>');
      host.appendChild(card);

      const out = document.createElement("div");
      out.className = "stack";
      host.appendChild(out);

      const paint = () => {
        const ci = card.querySelector("#ci").value;
        const co = card.querySelector("#co").value;
        const pax = Number(card.querySelector("#pax").value);
        out.innerHTML = "";
        if (!ci || !co || new Date(co) <= new Date(ci)) {
          out.innerHTML = '<div class="note">Check-out date must be after the check-in date.</div>';
          return;
        }
        const n = nights(ci, co);
        out.insertAdjacentHTML("beforeend",
          '<p class="muted">' + n + " night(s), " + pax + " guest(s).</p>");

        DB.all("roomTypes").forEach(rt => {
          const free = roomsFree(rt.type, ci, co);
          const fits = Number(rt.maxGuests) >= pax;
          const c = Dash.card(
            "<h3>" + esc(rt.type) + " &mdash; " + money(rt.price) + " / night</h3>" +
            '<p class="muted">' + esc(rt.about) + "</p>" +
            "<p><b>Amenities:</b> " + esc(rt.amenities) + " &middot; sleeps " + rt.maxGuests + "</p>" +
            "<p>" + (free > 0
              ? '<span class="tag ok">' + free + " room(s) available</span>"
              : '<span class="tag bad">no rooms free for these dates</span>') +
            (fits ? "" : ' <span class="tag warn">too many guests for this room</span>') +
            " &nbsp; <b>Total: " + money(n * Number(rt.price)) + "</b></p>");

          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = "Book this room";
          b.disabled = free <= 0 || !fits;
          b.onclick = () => {
            DB.insert("bookings", {
              guest: SESSION.email, guestName: SESSION.name, type: rt.type,
              checkIn: ci, checkOut: co, guests: pax, nights: n,
              amount: n * Number(rt.price), status: "Confirmed",
              bookedOn: today(), payment: "Paid online"
            });
            Dash.toast("Booking confirmed. A confirmation mail has been sent.");
            paint();
          };
          c.appendChild(b);
          out.appendChild(c);
        });
      };

      card.querySelector("#go").onclick = paint;
      paint();
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "mine", label: "My Bookings", type: "custom",
    desc: "A booking can be changed or cancelled only up to " + CHANGE_WINDOW +
          " days before the arrival date.",
    render(host) {
      if (changing) {
        const b = DB.get("bookings", changing);
        const card = Dash.card("<h3>Change booking #" + b.id + "</h3>");
        card.appendChild(Dash.form([
          { k: "type", l: "Room type", t: "select", opts: DB.all("roomTypes").map(r => r.type) },
          { k: "checkIn", l: "Arrival", t: "date", req: true },
          { k: "checkOut", l: "Departure", t: "date", req: true },
          { k: "guests", l: "Guests", t: "number", min: 1, req: true }
        ], b, data => {
          if (new Date(data.checkOut) <= new Date(data.checkIn)) {
            Dash.toast("Departure must be after arrival."); return;
          }
          if (roomsFree(data.type, data.checkIn, data.checkOut, b.id) <= 0) {
            Dash.toast("That room type is full for the new dates."); return;
          }
          const rt = DB.all("roomTypes").find(r => r.type === data.type);
          const n = nights(data.checkIn, data.checkOut);
          DB.update("bookings", b.id, Object.assign(data, { nights: n, amount: n * Number(rt.price) }));
          changing = null;
          Dash.toast("Booking changed.");
          Dash.show(MODULES.find(m => m.id === "mine"));
        }, () => { changing = null; Dash.show(MODULES.find(m => m.id === "mine")); },
          "Save changes"));
        host.appendChild(card);
      }

      const card = Dash.card("<h3>Booking history</h3>");
      card.appendChild(Dash.table([
        { k: "id", l: "#" },
        { k: "type", l: "Room" },
        { k: "checkIn", l: "Arrival" },
        { k: "checkOut", l: "Departure" },
        { k: "nights", l: "Nights" },
        { k: "guests", l: "Pax" },
        { k: "amount", l: "Amount", fmt: r => money(r.amount) },
        { k: "status", l: "Status", fmt: r => r.status === "Confirmed"
            ? '<span class="tag ok">confirmed</span>' : '<span class="tag bad">cancelled</span>' }
      ], myBookings(), r => canChange(r) ? [
        { label: "Change", cls: "flat", fn: () => {
            changing = r.id; Dash.show(MODULES.find(m => m.id === "mine"));
            window.scrollTo({ top: 0, behavior: "smooth" });
          } },
        { label: "Cancel", cls: "danger", fn: () => {
            if (confirm("Cancel this booking?")) {
              DB.update("bookings", r.id, { status: "Cancelled" });
              Dash.toast("Booking cancelled.");
              Dash.show(MODULES.find(m => m.id === "mine"));
            }
          } }
      ] : []));
      host.appendChild(card);
      host.insertAdjacentHTML("beforeend",
        '<div class="note">Bookings arriving within ' + CHANGE_WINDOW +
        " days, and cancelled bookings, can no longer be edited from here - " +
        "contact the front desk.</div>");
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "review", label: "Reviews", type: "custom",
    desc: "Rate a completed stay and read what other guests said.",
    render(host) {
      const card = Dash.card("<h3>Write a review</h3>");
      card.appendChild(Dash.form([
        { k: "type", l: "Room stayed in", t: "select", opts: DB.all("roomTypes").map(r => r.type) },
        { k: "rating", l: "Rating", t: "select", opts: [5, 4, 3, 2, 1] },
        { k: "comment", l: "Your review", t: "textarea", req: true, full: true }
      ], {}, (data, form) => {
        DB.insert("reviews", Object.assign(data, {
          guest: SESSION.name, date: today()
        }));
        form.reset();
        Dash.toast("Thank you for the review.");
        Dash.show(MODULES.find(m => m.id === "review"));
      }, null, "Post review"));
      host.appendChild(card);

      const list = Dash.card("<h3>Guest reviews</h3>");
      list.appendChild(Dash.table([
        { k: "guest", l: "Guest" }, { k: "type", l: "Room" },
        { k: "rating", l: "Rating", fmt: r => "*".repeat(Number(r.rating)) },
        { k: "comment", l: "Review" }, { k: "date", l: "Posted" }
      ], DB.all("reviews")));
      host.appendChild(list);
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "info", label: "Hotel Information", type: "custom",
    desc: "Room types, about us, contact, customer service Q&A, travel guide and privacy policy.",
    render(host) {
      DB.all("pages").forEach(p => {
        host.appendChild(Dash.card("<h3>" + esc(p.title) + "</h3><p>" +
          esc(p.body).replace(/\n/g, "<br>") + "</p>"));
      });
    }
  },

  /* ------------------------------------------------------------------ */
  {
    id: "profile", label: "My Profile", type: "custom",
    desc: "View or modify your profile.",
    render(host) {
      const me = DB.all("users").find(u => u.email === SESSION.email);
      const card = Dash.card("<h3>Profile</h3>");
      card.appendChild(Dash.form([
        { k: "name", l: "Full name", req: true },
        { k: "email", l: "E-mail", ro: true },
        { k: "phone", l: "Phone" },
        { k: "city", l: "City" },
        { k: "password", l: "Password", t: "password", req: true }
      ], me, data => {
        DB.update("users", me.id, {
          name: data.name, phone: data.phone, city: data.city, password: data.password
        });
        localStorage.setItem(SESSION_KEY, JSON.stringify(
          { email: me.email, name: data.name, role: me.role }));
        Dash.toast("Profile updated.");
        location.reload();
      }, null, "Update profile"));
      host.appendChild(card);
    }
  }
];

Dash.mount(MODULES);
