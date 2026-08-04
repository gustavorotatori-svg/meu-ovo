import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
if (!m) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found'); process.exit(1); }
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
let nextPageToken;
let count = 0;
do {
  const res = await auth.listUsers(100, nextPageToken);
  for (const u of res.users) {
    count++;
    console.log(`${u.email || '(no-email)'}\t${u.uid}\temailVerified=${u.emailVerified}\tdisabled=${u.disabled}\tcreated=${u.metadata.creationTime}`);
  }
  nextPageToken = res.pageToken;
} while (nextPageToken);
console.error(`Total users: ${count}`);
