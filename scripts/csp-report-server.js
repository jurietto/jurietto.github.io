const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', 'csp-reports.log');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/csp-report') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const line = `[${new Date().toISOString()}] ${body}\n`;
      fs.appendFileSync(LOG, line, { encoding: 'utf8' });
      res.statusCode = 204;
      res.end();
      console.log('CSP report received and logged');
    } catch (err) {
      console.error('Failed to log CSP report', err);
      res.statusCode = 500;
      res.end('Server error');
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`CSP report server listening on http://localhost:${PORT}/csp-report`));
