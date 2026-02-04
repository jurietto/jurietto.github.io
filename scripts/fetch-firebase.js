const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const files = [
  {
    url: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
    out: path.join(__dirname, '..', 'vendor', 'firebase-app.js')
  },
  {
    url: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
    out: path.join(__dirname, '..', 'vendor', 'firebase-firestore.js')
  }
];

async function fetchToFile(url, out) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(out);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(out);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Failed ${url} - ${res.statusCode}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => reject(err));
  });
}

function sriForFile(filePath) {
  const data = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384').update(data).digest('base64');
  return `sha384-${hash}`;
}

(async () => {
  try {
    for (const f of files) {
      console.log('Fetching', f.url);
      await fetchToFile(f.url, f.out);
      const sri = sriForFile(f.out);
      console.log('Saved', f.out, '-> SRI:', sri);
    }
    console.log('\nDone. You can now serve the files from /vendor and update imports to use /vendor/*.js');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  }
})();
