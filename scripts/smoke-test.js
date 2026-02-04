const fs = require('fs');
const path = require('path');

const pages = ['index.html','blog.html','profile.html','privacy.html','404.html'];
let ok = true;
console.log('Running simple smoke checks...');

function read(rel){
  return fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
}

for(const p of pages){
  try{
    const src = read(p);
    console.log('\nChecking', p);
    const hasCSP = /http-equiv=["']Content-Security-Policy["']/i.test(src);
    console.log(' - CSP meta present:', hasCSP);
    if(!hasCSP) ok=false;
    const unsafeInline = /style-src[^>]*'unsafe-inline'/.test(src);
    console.log(" - style-src contains 'unsafe-inline':", unsafeInline);
    if(unsafeInline) ok=false;
    const inlineScript = /<script(?:(?!src)[\s\S])*?>/i.test(src);
    console.log(' - inline <script> present:', inlineScript);
    if(inlineScript) ok=false;
    const hasStyleAttr = /\sstyle=\"[^"]+\"/i.test(src);
    console.log(' - inline style attributes present:', hasStyleAttr);
    if(hasStyleAttr) ok=false;
  }catch(e){
    console.error('Error reading',p,e.message);
    ok=false;
  }
}

// vendor files
const vendorFiles = ['vendor/firebase-app.js','vendor/firebase-firestore.js'];
for(const vf of vendorFiles){
  const p = path.join(__dirname,'..',vf);
  const exists = fs.existsSync(p);
  console.log('\nChecking vendor file', vf, 'exists:', exists);
  if(!exists) ok=false;
}

console.log('\nSmoke-test overall success:', ok);
process.exit(ok?0:2);
