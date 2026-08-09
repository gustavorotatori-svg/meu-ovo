import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

const email = process.argv[2];
if (!email) { console.error('usage: node scripts/verify-signup-user.mjs <email>'); process.exit(1); }

const u = await auth.getUserByEmail(email);
await auth.updateUser(u.uid, { emailVerified: true });
console.log(`verified: ${email} -> emailVerified=true`);
process.exit(0);
