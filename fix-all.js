const fs = require('fs');

// Fix landing page
let landing = fs.readFileSync('app/page.tsx', 'utf8');
landing = landing.replaceAll('50-60%', 'up to 40%');
fs.writeFileSync('app/page.tsx', landing);
console.log('Fixed: Landing page');

// Fix layout
let layout = fs.readFileSync('app/layout.tsx', 'utf8');
layout = layout.replaceAll('50-60%', 'up to 40%');
fs.writeFileSync('app/layout.tsx', layout);
console.log('Fixed: Layout');

// Fix security page
let security = fs.readFileSync('app/security/page.tsx', 'utf8');
security = security.replace('Deploy with Docker in under 5 minutes', 'Deploy on your own infrastructure using our open source code');
security = security.replace('Compliant with SOC 2, GDPR, HIPAA requirements', 'Compatible with your existing compliance setup');
security = security.replace('Encrypted in Redis. Auto-deleted after 30 minutes.', 'Stored in Redis with TLS in transit. Auto-deleted after 30 minutes.');
fs.writeFileSync('app/security/page.tsx', security);
console.log('Fixed: Security page');

// Fix docs model name
let docs = fs.readFileSync('app/docs/page.tsx', 'utf8');
docs = docs.replace('claude-haiku-4-5-20241022', 'claude-haiku-4-5-20251001');
fs.writeFileSync('app/docs/page.tsx', docs);
console.log('Fixed: Docs');

// Fix proxy - remove unused models
let proxy = fs.readFileSync('app/api/proxy/route.ts', 'utf8');
proxy = proxy.replace(/.*gpt-3\.5-turbo.*\n/g, '');
proxy = proxy.replace(/.*gemma2-9b-it.*\n/g, '');
proxy = proxy.replace(/.*llama-guard-3-8b.*\n/g, '');
fs.writeFileSync('app/api/proxy/route.ts', proxy);
console.log('Fixed: Proxy');

console.log('ALL DONE!');