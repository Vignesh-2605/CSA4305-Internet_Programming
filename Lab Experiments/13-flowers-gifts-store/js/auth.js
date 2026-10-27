/* ==========================================================================
   auth.js - registration, login, session and page guards
   Roles in this project: admin, user
   ========================================================================== */

const SESSION_KEY = "blossom_session";

const Auth = {
  users() { return DB.all("users"); },

  register(rec) {
    if (!rec.name || !rec.email || !rec.password) return { ok: false, msg: "All fields are required." };
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(rec.email)) return { ok: false, msg: "Enter a valid e-mail address." };
    if (rec.password.length < 5) return { ok: false, msg: "Password must be at least 5 characters." };
    if (this.users().some(u => u.email.toLowerCase() === rec.email.toLowerCase()))
      return { ok: false, msg: "That e-mail is already registered." };
    rec.role = rec.role || "user";
    rec.joined = today();
    DB.insert("users", rec);
    return { ok: true, msg: "Registration successful. You can log in now." };
  },

  login(email, password, role) {
    const u = this.users().find(u =>
      u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
    if (!u) return { ok: false, msg: "Invalid e-mail or password." };
    if (role && u.role !== role) return { ok: false, msg: "This account is not registered as " + role + "." };
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: u.email, name: u.name, role: u.role }));
    return { ok: true, user: u };
  },

  resetPassword(email, password) {
    const u = this.users().find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!u) return { ok: false, msg: "No account found with that e-mail." };
    if (!password || password.length < 5) return { ok: false, msg: "New password must be at least 5 characters." };
    DB.update("users", u.id, { password: password });
    return { ok: true, msg: "Password changed. Please log in." };
  },

  current() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  },

  /* Redirects to the login page when nobody (or the wrong role) is signed in. */
  require(role) {
    const s = this.current();
    if (!s || (role && s.role !== role)) { location.href = "login.html"; return null; }
    return s;
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    location.href = "login.html";
  }
};
