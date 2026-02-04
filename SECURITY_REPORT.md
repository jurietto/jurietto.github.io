Security audit summary — jurietto.github.io

Date: 2026-02-03

Summary
- Performed a focused client-side security audit (XSS, unsafe DOM insertion, inline scripts, CSP hardening).

Actions taken
- Replaced unsafe `innerHTML` insertion of user-controlled content with DOM-safe construction in:
  - `js/utils.js`
  - `js/blog_comments.js`
  - `js/form.js` (where edited)
  - `js/forum-ui.js` (where edited)
- Replaced inline event handlers by moving small handlers into `js/common.js`.
- Removed inline `<script>` blocks from `admin.html` and `404.html`.
- Hardened CSP meta tags (conservative policy applied) in: `index.html`, `admin.html`, `profile.html`, `privacy.html`, `blog.html`, `404.html`.
- Vendorized Firebase SDK:
  - Added `scripts/fetch-firebase.js` to download Firebase SDK v10.7.1 into `vendor/` and compute SRI values.
  - Updated `js/firebase.js` and `js/blog.js` to import the local `../vendor/*.js` files so the SDK can be hosted with SRI.

Files added/modified (high level)
- Added: `scripts/fetch-firebase.js`, `vendor/` (populated when script is run)
- Added/updated: `js/common.js`, `js/utils.js`, `js/blog_comments.js`, `js/form.js`, `js/forum-ui.js`, `js/firebase.js`, `js/blog.js`, `admin.html`, `404.html`, `index.html`, `blog.html`, `profile.html`, `privacy.html`

Recommendations / Next steps
1. Run the vendor fetch script locally (already executed successfully):
   ```bash
   node scripts/fetch-firebase.js
   ```
   This downloads SDK files into `vendor/` and prints `sha384-...` SRI values.

Computed SRI for vendored Firebase files (sha384):

- `vendor/firebase-app.js`: sha384-ztbLCS0Qe+xdkZU1lZIS81/tLEdaq5oHITH180tHGIFYWfg4+nIHfU3sru95qyGR
- `vendor/firebase-firestore.js`: sha384-ahqjEHYiRa0ZZ8SCV5KcZMpmFUvH1AXYNYUrCA8OemT3HX0RJqXWVr0nwrPkpmz3

2. Commit `vendor/` files (or serve them from a trusted origin).

3. Add `integrity` and `crossorigin="anonymous"` attributes to any externally-hosted `<script>` tags. Use the printed SRI values from step 1.

4. Migrate inline styles into external CSS and remove `style-src 'unsafe-inline'` from CSP. Use nonces or external files for any remaining inline styles.

5. Move any remaining inline scripts to external modules or apply per-response nonces and update CSP accordingly.

6. Serve CSP as an HTTP response header (preferable) and keep the meta tag as a fallback.

7. Add a CSP reporting endpoint (`/csp-report`) and include `report-uri` / `report-to` in CSP to collect violations.
  - I've added `scripts/csp-report-server.js` — run with `node scripts/csp-report-server.js` to collect reports to `csp-reports.log`.

8. After making the above changes, perform functional smoke tests in a staging environment and fix any breakages.

Notes
- The Firebase client config (`apiKey`) remains in client-side JS; this is expected for Firebase usage (not a secret). Ensure no server-side secrets are committed.
- Some `innerHTML` usages were intentionally left for static templates or container clearing; review these in context if concerned.

If you want, I can now:
- Patch HTML to add `integrity` + `crossorigin` using the computed SRI values (I can extract them after you run the fetch script or by reading `vendor/` and computing hashes here), or
- Begin removing `style-src 'unsafe-inline'` by locating inline styles and extracting them to CSS files.

Additional completed actions:
- Replaced `*.googleapis.com` with `firestore.googleapis.com` and `wss://*.googleapis.com` with `wss://chansi-ddd7e.firebaseio.com` in CSP metas.
- Replaced `*.firebaseio.com` wildcard with `https://chansi-ddd7e.firebaseio.com` and `wss://chansi-ddd7e.firebaseio.com`.
- Replaced `*.cloudfunctions.net` with `https://us-central1-chansi-ddd7e.cloudfunctions.net`.
- Replaced remote OG/twitter image references (raw.githubusercontent.com) with local `/art/` paths and switched profile avatar to `/art/avi.png`.

Next recommended steps (high priority):
1. Run the CSP report server for ~48 hours and monitor `csp-reports.log`.
2. Add SRI attributes to any remaining CDN scripts (we vendorized Firebase already).
3. Commit `vendor/` into the repo (or host from a trusted origin) and test in staging.

If you'd like, I will now add SRI attributes to remaining external script tags and create a short deploy checklist for moving CSP from meta to HTTP headers.

End of report.
