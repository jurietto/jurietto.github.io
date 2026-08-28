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
- `POST /api/guestbook` with `{ "name": "...", "message": "..." }`

For deployment, add the same environment variables in the hosting provider instead of committing `.env`.
