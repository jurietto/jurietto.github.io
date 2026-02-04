CSP report server — run and monitor

Start the CSP report server (already present at `scripts/csp-report-server.js`):

```bash
node scripts/csp-report-server.js
```

What it does
- Starts a small HTTP server (default port 8080) that accepts `application/csp-report` POSTs to `/csp-report` and appends them to `csp-reports.log`.

Quick monitoring
- Tail the log (PowerShell):

```powershell
Get-Content csp-reports.log -Wait
```

- Or on WSL / Git Bash:

```bash
tail -f csp-reports.log
```

Interpreting reports
- Each line is a JSON object with the CSP report. Look for `blocked-uri`, `violated-directive`, and `document-uri`.
- If you see legitimate blocked resources, update CSP to include their origin or host them on same-origin.

After ~48 hours
- Stop the server and send me `csp-reports.log` (or let me read it in-place) and I will parse and suggest fixes.

Security note
- Do not publicly expose this endpoint unless you expect reports; if you host it publicly, consider restricting by secret token or IP to avoid spam.