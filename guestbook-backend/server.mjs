import http from "node:http";
import mariadb from "mariadb";

const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 5,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
});

function sendJson(response, status, body) {
  if (response.headersSent || response.writableEnded) {
    return;
  }

  const payload = JSON.stringify(body, (_key, value) => (
    typeof value === "bigint" ? Number(value) : value
  ));

  response.writeHead(status, {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(payload);
}

async function readJson(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10000) {
      throw new Error("request-too-large");
    }
  }

  return JSON.parse(body || "{}");
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/healthz") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/guestbook") {
    const rows = await pool.query(
      "SELECT id, name, message, created_at AS createdAt FROM guestbook_entries WHERE approved = 1 ORDER BY created_at DESC LIMIT 100"
    );
    sendJson(response, 200, rows.map(({ id, name, message, createdAt }) => ({ id, name, message, createdAt })));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guestbook") {
    let input;

    try {
      input = await readJson(request);
    } catch {
      sendJson(response, 400, { error: "Please send valid JSON." });
      return;
    }

    const name = String(input.name || "").trim();
    const message = String(input.message || "").trim();

    if (!name || !message || name.length > 80 || message.length > 2000) {
      sendJson(response, 400, { error: "Name and message are required. Please keep them within the length limits." });
      return;
    }

    const result = await pool.query(
      "INSERT INTO guestbook_entries (name, message) VALUES (?, ?)",
      [name, message]
    );
    sendJson(response, 201, { id: Number(result.insertId), name, message });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    if (!response.headersSent && !response.writableEnded) {
      sendJson(response, 500, { error: "The guestbook is temporarily unavailable." });
    }
  });
});

server.listen(port, () => {
  console.log(`Guestbook API listening on port ${port}`);
});
