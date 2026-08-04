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
const CUST_EMAIL = process.argv[2] || 'cliente.teste@peopleo.com.br';
const PASSWORD = process.argv[3] || 'Teste@12345';

async function upsertUser(email, password, displayName, role) {
  let uid;
  try {
    const u = await auth.getUserByEmail(email);
    uid = u.uid;
    console.log(`[existing] ${email} uid=${uid}`);
  } catch {
    const u = await auth.createUser({ email, password, emailVerified: true, displayName });
    uid = u.uid;
    console.log(`[created] ${email} uid=${uid}`);
  }
  await auth.updateUser(uid, { password, emailVerified: true });
  const profile = {
    full_name: displayName,
    role,
    createdAt: new Date().toISOString(),
    pwaInstallPending: true,
  };
  if (role === 'customer') {
    profile.onboardingComplete = false;
    profile.customerRating = 5;
    profile.customerRatingCount = 0;
  }
  await db.collection('users').doc(uid).set(profile, { merge: true });
  console.log(`[profile] ${email} role=${role}`);
  return uid;
}

const restUid = await upsertUser(REST_EMAIL, PASSWORD, 'Restaurante Facilitador Teste', 'customer');
const custUid = await upsertUser(CUST_EMAIL, PASSWORD, 'Cliente Teste Pessoal', 'customer');
console.log('REST_UID=' + restUid);
console.log('CUST_UID=' + custUid);
console.log('DONE password=' + PASSWORD);
process.exit(0);
