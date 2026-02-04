CSP Header Examples — snippets for common hosts

Note: prefer serving CSP via HTTP response headers. Keep the meta CSP as a fallback during rollout.

Netlify (`_headers`)
/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self' https://firestore.googleapis.com https://chansi-ddd7e.firebaseio.com https://api.github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-chansi-ddd7e.cloudfunctions.net wss://chansi-ddd7e.firebaseio.com; frame-src https://www.youtube.com https://w.soundcloud.com https://chansi-ddd7e.firebaseapp.com; object-src 'none'; form-action 'self'; frame-ancestors 'none'; report-uri /csp-report

  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer-when-downgrade
  X-Frame-Options: DENY
  X-XSS-Protection: 0

Cloudflare (Workers) — example header injection
addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(req) {
  const res = await fetch(req)
  const newHeaders = new Headers(res.headers)
  newHeaders.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self' https://firestore.googleapis.com https://chansi-ddd7e.firebaseio.com https://api.github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-chansi-ddd7e.cloudfunctions.net wss://chansi-ddd7e.firebaseio.com; frame-src https://www.youtube.com https://w.soundcloud.com https://chansi-ddd7e.firebaseapp.com; object-src 'none'; form-action 'self'; frame-ancestors 'none'; report-uri /csp-report")
  return new Response(res.body, { status: res.status, headers: newHeaders })
}

Apache (`.htaccess`)
<IfModule mod_headers.c>
  Header set Content-Security-Policy "default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self' https://firestore.googleapis.com https://chansi-ddd7e.firebaseio.com https://api.github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-chansi-ddd7e.cloudfunctions.net wss://chansi-ddd7e.firebaseio.com; frame-src https://www.youtube.com https://w.soundcloud.com https://chansi-ddd7e.firebaseapp.com; object-src 'none'; form-action 'self'; frame-ancestors 'none'; report-uri /csp-report"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "no-referrer-when-downgrade"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "0"
</IfModule>

Vercel (`vercel.json`)
{
  "headers": [
    {
      "source": "(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; connect-src 'self' https://firestore.googleapis.com https://chansi-ddd7e.firebaseio.com https://api.github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-chansi-ddd7e.cloudfunctions.net wss://chansi-ddd7e.firebaseio.com; frame-src https://www.youtube.com https://w.soundcloud.com https://chansi-ddd7e.firebaseapp.com; object-src 'none'; form-action 'self'; frame-ancestors 'none'; report-uri /csp-report" }
      ]
    }
  ]
}

GitHub Pages
- GitHub Pages does not let you set response headers directly. Use a CDN or proxy (Cloudflare, Netlify, Vercel) in front of GitHub Pages to inject headers, or host on a platform that supports headers.

Adjust the CSP string above to include only the origins you actually need. Test in staging and use the report endpoint to catch missing resources.