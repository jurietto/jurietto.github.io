addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  const res = await fetch(request)
  const headers = new Headers(res.headers)
  headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://firestore.googleapis.com https://chansi-ddd7e.firebaseio.com https://api.github.com https://www.gstatic.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-chansi-ddd7e.cloudfunctions.net wss://chansi-ddd7e.firebaseio.com; frame-src 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; report-uri https://REPLACE_WITH_REPORT_HOST/csp-report")
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '0')
  return new Response(res.body, { status: res.status, headers })
}
