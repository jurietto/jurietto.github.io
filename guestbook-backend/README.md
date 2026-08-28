# Jurietto guestbook backend

This small API stores guestbook entries in MariaDB.

## Local setup

1. Install Node.js.
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env` and fill in the MariaDB connection values.
4. Run `schema.sql` once in the `jurietto` database.
5. Run `npm start`.

The API provides:

- `GET /healthz`
- `GET /api/guestbook`
- `POST /api/visits` to atomically increment the site-wide page-view count
- `POST /api/guestbook` with `{ "name": "...", "message": "...", "turnstileToken": "..." }`
- `POST /api/guestbook/:id/replies` with `{ "message": "..." }` and the `X-Admin-Token` header

The guestbook frontend displays Cloudflare Turnstile when its `data-turnstile-sitekey` value is filled in. The backend validates the token with Cloudflare when `TURNSTILE_SECRET_KEY` is configured. Set `TURNSTILE_REQUIRED=true` in Render so submissions cannot bypass CAPTCHA if the secret is missing.

The visitor counter is a global page-view count stored in MariaDB. It counts homepage loads, not unique people. The backend creates the `site_stats` and `guestbook_replies` tables automatically on first API use; `schema.sql` includes them for a manual migration or a fresh database.

To reply, open `guestbook.html?admin=1`. The reply key is sent only in the request header and must match the private `ADMIN_REPLY_TOKEN` environment variable. Never put that token in the site HTML or commit it.

For deployment, add the same environment variables in the hosting provider instead of committing `.env`.
