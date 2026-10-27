/* ==========================================================================
   serve.js - local web server for this site
   ==========================================================================
   ReNewMarket Second-hand Marketplace

   Run:   npm start                 -> http://localhost:8014/
          npm start -- 3000         -> a different port
          node serve.js             -> same thing without npm

   Uses only Node's built-in modules. Nothing to install.
   Stop the server with Ctrl + C.
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
let port = Number(process.argv[2]) || 8014;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch (e) {
    res.writeHead(400).end("Bad request");
    return;
  }

  /* browsers ask for this on every page; answer quietly */
  if (urlPath === "/favicon.ico") { res.writeHead(204).end(); return; }

  /* never serve anything outside this project folder */
  const target = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
  if (!target.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }

  let file = target;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");

  if (!fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end('<body style="font:15px system-ui;padding:2rem"><h2>404 - not found</h2>' +
            "<p><code>" + urlPath + "</code></p><p><a href='/'>back to the home page</a></p>");
    console.log("404  " + urlPath);
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(file).pipe(res);
});

/* if the port is taken, move to the next one */
server.on("error", err => {
  if (err.code === "EADDRINUSE" && port < 8014 + 10) {
    console.log("Port " + port + " is busy, trying " + (port + 1) + " ...");
    server.listen(++port);
  } else {
    console.error(err.message);
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log("\n  ReNewMarket Second-hand Marketplace");
  console.log("\n  Open  ->  http://localhost:" + port + "/\n");
  console.log("  Press Ctrl + C to stop.\n");
});
