Deploy checklist — CSP headers, SRI, and verification

1. Commit vendored files (already done)
   - `git add vendor/ && git commit -m "Add vendored Firebase SDK for SRI/CSP control"`

2. Serve CSP via HTTP response headers (preferred)
   - If using GitHub Pages: use a CDN or proxy that can add headers (Cloudflare Workers, Netlify, Vercel, or a small proxy).
   - Example (Netlify `_headers`):
     /*
       Content-Security-Policy: <your CSP string here>
     
3. Keep meta-CSP as a fallback in HTML while you roll headers.

4. Add SRI + CORS to any externally-loaded third-party scripts
   - For script tags that remain remote, add `integrity="sha384-..." crossorigin="anonymous"` using the computed hashes.

5. Start CSP report collection
   - Start server locally or on a small host: `node scripts/csp-report-server.js`
   - Check `csp-reports.log` for JSON reports.

6. Monitor for ~48 hours
   - Review `csp-reports.log` and fix any legitimate resource needs by updating CSP origins, or move resources to same-origin.

7. After stabilization
   - Move CSP entirely to response headers and remove the meta tag fallback.
   - Optionally implement nonces for any required inline scripts/styles and update CSP accordingly.

8. Test and smoke-check
   - Run `node scripts/smoke-test.js` to ensure no inline scripts/styles and presence of vendor files.

9. Rollout
   - Deploy to staging, test, then push to production. Document CSP decisions in `SECURITY_REPORT.md`.

Notes
- Vendored Firebase is imported as ES modules; keep imports pointing to `/vendor/*.js`.
- Collected SRI values are in `SECURITY_REPORT.md`.

Secrets / client config

- Do not commit client or server secrets. For client-side Firebase config, keep values out of source control by copying `js/config.example.js` to `js/config.js` and filling values. `js/config.js` is gitignored.
- For truly sensitive keys (service account keys, server API keys), keep them server-side (Cloudflare Worker, Netlify/Vercel function, or GitHub Actions during build) and proxy requests.
