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

const emails = process.argv.slice(2);
if (emails.length === 0) { console.error('usage: node scripts/cleanup-signup-tests.mjs <email> [email...]'); process.exit(1); }

let uids = [];
for (const email of emails) {
  try {
    const u = await auth.getUserByEmail(email);
    uids.push(u.uid);
    await auth.deleteUser(u.uid);
    console.log(`deleted auth user: ${email}`);
  } catch {
    console.log(`auth user not found: ${email}`);
  }
}

for (const uid of uids) {
  const ownedRests = await db.collection('restaurants').where('ownerId', '==', uid).get();
  for (const r of ownedRests.docs) {
    const restId = r.id;
    const cats = await db.collection('categories').where('restaurantId', '==', restId).get();
    for (const c of cats.docs) await c.ref.delete();
    const prods = await db.collection('products').where('restaurantId', '==', restId).get();
    for (const p of prods.docs) await p.ref.delete();
    const ds = await db.collection('deliverySettings').where('restaurantId', '==', restId).get();
    for (const d of ds.docs) await d.ref.delete();
    await r.ref.delete();
    console.log(`cleaned restaurant: ${restId}`);
  }
  await db.collection('users').doc(uid).delete().catch(() => {});
  console.log(`cleaned users doc: ${uid}`);
}

console.log('cleanup done');
process.exit(0);
