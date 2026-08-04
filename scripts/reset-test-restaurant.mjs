import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
if (!m) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found'); process.exit(1); }
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const auth = getAuth();
const db = getFirestore(getApps()[0], 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b');

const REST_EMAIL = 'facilitador@peopleo.com.br';

let uid;
try {
  const u = await auth.getUserByEmail(REST_EMAIL);
  uid = u.uid;
} catch {
  console.log('NO_ACCOUNT');
  process.exit(0);
}

const restaurants = await db.collection('restaurants').where('ownerId', '==', uid).get();
let deleted = 0;
for (const d of restaurants.docs) {
  const rId = d.id;
  const prods = await db.collection('products').where('restaurantId', '==', rId).get();
  for (const p of prods.docs) await db.collection('products').doc(p.id).delete();
  const cats = await db.collection('categories').where('restaurantId', '==', rId).get();
  for (const c of cats.docs) await db.collection('categories').doc(c.id).delete();
  const settings = await db.collection('deliverySettings').where('restaurantId', '==', rId).get();
  for (const s of settings.docs) await db.collection('deliverySettings').doc(s.id).delete();
  await db.collection('restaurants').doc(rId).delete();
  deleted++;
  console.log('deleted restaurant:', rId);
}

await db.collection('users').doc(uid).set({ role: 'customer' }, { merge: true });
console.log('reset role -> customer; deleted restaurants:', deleted);
process.exit(0);
