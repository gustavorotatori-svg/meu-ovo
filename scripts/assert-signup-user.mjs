import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore(getApps()[0], 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b');

const email = process.argv[2];
if (!email) { console.error('usage: node scripts/assert-signup-user.mjs <email>'); process.exit(1); }

let result = { email, exists: false };
try {
  const u = await auth.getUserByEmail(email);
  result.exists = true;
  result.uid = u.uid;
  result.emailVerified = u.emailVerified;
} catch {
  result.exists = false;
  result.emailVerified = null;
}

if (result.exists) {
  const snap = await db.collection('users').doc(result.uid).get();
  result.doc = snap.exists ? snap.data() : null;
  const ownedRests = await db.collection('restaurants').where('ownerId', '==', result.uid).get();
  result.restaurantsOwned = ownedRests.size;
}

console.log(JSON.stringify(result));
process.exit(0);
