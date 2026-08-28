import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import mariadb from "mariadb";

const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
const turnstileSecretKey = String(process.env.TURNSTILE_SECRET_KEY || "");
const turnstileRequired = process.env.TURNSTILE_REQUIRED === "true";
const adminReplyToken = String(process.env.ADMIN_REPLY_TOKEN || "");
const adminReplyName = String(process.env.ADMIN_REPLY_NAME || "Juri").trim() || "Juri";

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
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(payload);
}

let schemaReady;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_stats (
          id TINYINT UNSIGNED NOT NULL,
          visitor_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query("INSERT IGNORE INTO site_stats (id, visitor_count) VALUES (1, 0)");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS guestbook_replies (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          entry_id BIGINT UNSIGNED NOT NULL,
          name VARCHAR(80) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX guestbook_replies_entry_idx (entry_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }

  return schemaReady;
}

async function verifyTurnstile(token, request) {
  if (!turnstileSecretKey && !turnstileRequired) {
    return { ok: true };
  }

  if (!turnstileSecretKey) {
    return { ok: false, error: "CAPTCHA is not configured yet." };
  }

  if (!token) {
    return { ok: false, error: "Please complete the CAPTCHA." };
  }

  const payload = new URLSearchParams({
    secret: turnstileSecretKey,
    response: token
  });
  const forwardedIp = request.headers["cf-connecting-ip"] || request.headers["x-forwarded-for"];
  if (forwardedIp) {
    payload.set("remoteip", String(forwardedIp).split(",")[0].trim());
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload
    });
    if (!response.ok) {
      return { ok: false, error: "CAPTCHA verification failed." };
    }
    const result = await response.json();
    return result.success === true
      ? { ok: true }
      : { ok: false, error: "Please complete the CAPTCHA again." };
  } catch {
    return { ok: false, error: "CAPTCHA verification is temporarily unavailable." };
  }
}

function hasAdminReplyToken(providedToken) {
  if (!adminReplyToken || !providedToken) {
    return false;
  }

  const provided = Buffer.from(String(providedToken));
  const expected = Buffer.from(adminReplyToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
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
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
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
    await ensureSchema();
    const rows = await pool.query(
      "SELECT id, name, message, created_at AS createdAt FROM guestbook_entries WHERE approved = 1 ORDER BY created_at DESC LIMIT 100"
    );
    const replyRows = await pool.query(
      "SELECT id, entry_id AS entryId, name, message, created_at AS createdAt FROM guestbook_replies ORDER BY created_at ASC"
    );
    const repliesByEntry = new Map();
    for (const reply of replyRows) {
      const list = repliesByEntry.get(Number(reply.entryId)) || [];
      list.push({
        id: Number(reply.id),
        name: reply.name,
        message: reply.message,
        createdAt: reply.createdAt
      });
      repliesByEntry.set(Number(reply.entryId), list);
    }
    sendJson(response, 200, rows.map(({ id, name, message, createdAt }) => ({
      id: Number(id),
      name,
      message,
      createdAt,
      replies: repliesByEntry.get(Number(id)) || []
    })));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/visits") {
    await ensureSchema();
    await pool.query("UPDATE site_stats SET visitor_count = visitor_count + 1 WHERE id = 1");
    const rows = await pool.query("SELECT visitor_count AS count FROM site_stats WHERE id = 1");
    sendJson(response, 200, { count: Number(rows[0].count) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guestbook") {
    await ensureSchema();
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

    const captcha = await verifyTurnstile(String(input.turnstileToken || ""), request);
    if (!captcha.ok) {
      sendJson(response, turnstileSecretKey || turnstileRequired ? 403 : 503, { error: captcha.error });
      return;
    }

    const result = await pool.query(
      "INSERT INTO guestbook_entries (name, message) VALUES (?, ?)",
      [name, message]
    );
    sendJson(response, 201, { id: Number(result.insertId), name, message });
    return;
  }

  const replyMatch = url.pathname.match(/^\/api\/guestbook\/(\d+)\/replies$/);
  if (request.method === "POST" && replyMatch) {
    if (!hasAdminReplyToken(request.headers["x-admin-token"])) {
      sendJson(response, 401, { error: "Reply authorization is required." });
      return;
    }

    await ensureSchema();
    let input;
    try {
      input = await readJson(request);
    } catch {
      sendJson(response, 400, { error: "Please send valid JSON." });
      return;
    }

    const message = String(input.message || "").trim();
    if (!message || message.length > 2000) {
      sendJson(response, 400, { error: "A reply is required and must be 2000 characters or fewer." });
      return;
    }

    const entryId = Number(replyMatch[1]);
    const existingEntry = await pool.query(
      "SELECT id FROM guestbook_entries WHERE id = ? AND approved = 1 LIMIT 1",
      [entryId]
    );
    if (!existingEntry.length) {
      sendJson(response, 404, { error: "Guestbook entry not found." });
      return;
    }

    const result = await pool.query(
      "INSERT INTO guestbook_replies (entry_id, name, message) VALUES (?, ?, ?)",
      [entryId, adminReplyName, message]
    );
    sendJson(response, 201, { id: Number(result.insertId), entryId, name: adminReplyName, message });
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
