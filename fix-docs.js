const fs = require('fs');
let docs = fs.readFileSync('app/docs/page.tsx', 'utf8');
docs = docs.replace('claude-haiku-4-5-20241022', 'claude-haiku-4-5-20251001');
docs = docs.replace('50-60%', 'up to 40%');
fs.writeFileSync('app/docs/page.tsx', docs);
console.log('docs fixed');