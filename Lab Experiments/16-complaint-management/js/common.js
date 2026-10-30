/* ==========================================================================
   common.js - pieces the three consoles share: the ward map, the status
   ladder and the badge colours.
   ========================================================================== */

const FLOW = ["Registered", "Assigned", "In progress", "Resolved", "Closed"];

const BADGE = {
  "Registered": "warn", "Assigned": "", "In progress": "warn",
  "Resolved": "ok", "Closed": "mute", "Rejected": "bad"
};

function badge(status) {
  return '<span class="tag ' + (BADGE[status] || "") + '">' + esc(status) + "</span>";
}

function settings() { return DB.all("settings")[0] || {}; }

function refNo() {
  const n = DB.all("complaints").length + 240370;
  return "CMP-" + n;
}

/* Days a complaint has been open, and whether that is past the department's
   published target. */
function age(c) {
  const end = c.resolvedOn || today();
  return Math.max(0, daysBetween(c.filedOn, end));
}
function overdue(c) {
  if (c.status === "Resolved" || c.status === "Closed") return false;
  const d = DB.all("departments").find(d => d.name === c.dept);
  return d ? age(c) > Number(d.sla) : false;
}

/* --------------------------------------------------------------------------
   The ward map. There is no Google Maps key here and nothing may be fetched
   from the network, so the pin is dropped on a drawn street grid and the
   co-ordinates are kept with the complaint exactly as a map pin would be.
   -------------------------------------------------------------------------- */
function wardMap(opts) {
  const pick = !!opts.onPick;
  const pins = opts.pins || [];
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.innerHTML = "<h3>" + esc(opts.title || "Location") + "</h3>" +
    '<p class="muted" style="margin:.2rem 0 .7rem">' +
    (pick ? "Click the point on the map closest to the problem."
          : "Every pin is a complaint on this list.") + "</p>";

  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("viewBox", "0 0 100 70");
  svg.setAttribute("width", "100%");
  svg.style.cssText = "border:1px solid var(--border);border-radius:10px;" +
    "background:#f6f8f5;display:block;" + (pick ? "cursor:crosshair" : "");

  const add = (tag, attrs) => {
    const e = document.createElementNS(svgns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    svg.appendChild(e);
    return e;
  };

  /* a schematic of the ward: the river, the park, the arterial roads */
  add("rect", { x: 0, y: 0, width: 100, height: 70, fill: "#f6f8f5" });
  add("path", { d: "M0 58 Q 25 50 45 56 T 100 48", stroke: "#b9d4e8",
                "stroke-width": 4, fill: "none" });
  add("rect", { x: 8, y: 8, width: 18, height: 13, rx: 2, fill: "#dcebd7" });
  add("text", { x: 17, y: 16, "font-size": 3, "text-anchor": "middle",
                fill: "#6b7f66" }).textContent = "Park";
  for (const y of [18, 32, 46]) {
    add("line", { x1: 0, y1: y, x2: 100, y2: y, stroke: "#dfe3dc", "stroke-width": 1.6 });
  }
  for (const x of [22, 44, 66, 86]) {
    add("line", { x1: x, y1: 0, x2: x, y2: 70, stroke: "#dfe3dc", "stroke-width": 1.6 });
  }
  add("text", { x: 2, y: 16.4, "font-size": 2.6, fill: "#9aa394" }).textContent = "1st Main";
  add("text", { x: 2, y: 30.4, "font-size": 2.6, fill: "#9aa394" }).textContent = "4th Main";
  add("text", { x: 2, y: 44.4, "font-size": 2.6, fill: "#9aa394" }).textContent = "Beach Rd";

  const layer = document.createElementNS(svgns, "g");
  svg.appendChild(layer);

  const drawPin = (x, y, label, tone) => {
    const g = document.createElementNS(svgns, "g");
    const c = document.createElementNS(svgns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 2.2);
    c.setAttribute("fill", tone || "#c0392b");
    c.setAttribute("stroke", "#fff"); c.setAttribute("stroke-width", 0.8);
    g.appendChild(c);
    if (label) {
      const t = document.createElementNS(svgns, "text");
      t.setAttribute("x", x); t.setAttribute("y", y - 3.2);
      t.setAttribute("font-size", 2.8); t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", "#333");
      t.textContent = label;
      g.appendChild(t);
    }
    layer.appendChild(g);
  };

  pins.forEach(p => drawPin(p.x, p.y, p.label,
    p.status === "Resolved" || p.status === "Closed" ? "#2e7d32" : "#c0392b"));

  const out = document.createElement("div");
  out.className = "muted";
  out.style.marginTop = ".5rem";

  if (pick) {
    let chosen = opts.start || null;
    if (chosen) { drawPin(chosen.x, chosen.y, "here"); }
    out.textContent = chosen
      ? "Marked at " + chosen.x.toFixed(1) + ", " + chosen.y.toFixed(1)
      : "No point marked yet.";
    svg.addEventListener("click", ev => {
      const r = svg.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 100;
      const y = ((ev.clientY - r.top) / r.height) * 70;
      chosen = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
      layer.innerHTML = "";
      drawPin(chosen.x, chosen.y, "here");
      out.textContent = "Marked at " + chosen.x.toFixed(1) + ", " + chosen.y.toFixed(1);
      opts.onPick(chosen);
    });
  }

  wrap.appendChild(svg);
  wrap.appendChild(out);
  return wrap;
}
