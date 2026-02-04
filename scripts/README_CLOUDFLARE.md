Cloudflare Worker — publish & test (GitHub Pages)

Files added:
- `scripts/cf-csp-worker.js` — Worker script that injects CSP + security headers
- `wrangler.toml` — sample Wrangler config (fill `account_id`)

Steps to publish (you must have a Cloudflare account and Wrangler installed):

1. Install Wrangler (if needed):

```bash
npm install -g wrangler
```

2. Configure `wrangler.toml`:
- Replace `account_id` with your Cloudflare account ID.
- Optionally change `pattern` if you use a custom domain.
- Replace `https://REPLACE_WITH_REPORT_HOST/csp-report` in `scripts/cf-csp-worker.js` with your public CSP report endpoint (or a hosted `/csp-report`).

3. Authenticate Wrangler:

```bash
wrangler login
```

4. Publish the worker:

```bash
wrangler publish scripts/cf-csp-worker.js --name jurietto-csp-worker
```

5. Verify headers on your site (once Cloudflare route is active):

```bash
curl -I https://jurietto.github.io/
```

Look for `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, etc.

Notes
- Cloudflare must be set to proxy your GitHub Pages site (DNS proxied through Cloudflare) or you must use Cloudflare Pages/route so the Worker sees requests.
- If you want, I can add a small `wrangler` publish script and help craft the final `report-uri` value once you have a report server host.
