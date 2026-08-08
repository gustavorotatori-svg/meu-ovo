import fs from 'fs';
import https from 'https';

const cfg = JSON.parse(fs.readFileSync(`${process.env.USERPROFILE}/.config/configstore/firebase-tools.json`, 'utf8'));
const tok = cfg.tokens.access_token;
const PROJECT = 'gen-lang-client-0267663159';
const BUCKET = 'gen-lang-client-0267663159.firebasestorage.app';

function req(method, url, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = payload ? JSON.stringify(payload) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const RULES = fs.readFileSync('storage.rules', 'utf8');

// 1. create ruleset with canonical service name
const created = await req('POST', `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, { source: { files: [{ name: 'storage.rules', content: RULES }] } });
console.log('CREATE:', created.status, created.body);
const rulesetName = JSON.parse(created.body).name;
const rulesetId = rulesetName.split('/').pop();
console.log('RULESET_ID:', rulesetId);

// 2. update both releases to point to the new ruleset
for (const relName of [`firebase.storage`, `firebase.storage/${BUCKET}`]) {
  const r = await req('PATCH', `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/${encodeURIComponent(relName)}`, { release: { name: `projects/${PROJECT}/releases/${relName}`, rulesetName } });
  console.log('PATCH', relName, '->', r.status, r.body);
}
