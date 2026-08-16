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

// 1. Clean all data of the target test restaurant (independent of owner query,
//    since reset-test-restaurant may have already deleted the restaurant doc)
const rId = 'restaurante-teste-modulos';
const restaurants = await db.collection('restaurants').where('ownerId', '==', uid).get();
for (const d of restaurants.docs) {
  if (d.id === rId) await db.collection('restaurants').doc(rId).delete();
}
for (const coll of ['products', 'categories', 'deliverySettings', 'ingredients', 'recipe_sheets', 'ingredient_movements', 'cashier_sessions']) {
  const snap = await db.collection(coll).where('restaurantId', '==', rId).get();
  for (const doc of snap.docs) await db.collection(coll).doc(doc.id).delete();
}
console.log('cleaned collections of', rId);

// 2. Seed restaurant + category + products
const now = new Date().toISOString();

await db.collection('restaurants').doc(rId).set({
  id: rId,
  slug: 'restaurante-teste-modulos',
  ownerId: uid,
  name: 'Restaurante Módulos Teste',
  currency: 'BRL',
  isActive: true,
  createdAt: now,
  updatedAt: now,
  phone: '(11) 98765-4321',
  whatsapp: '5511987654321',
  city: 'São Paulo',
  address: 'Rua dos Testes, 123',
  cuisineType: 'Hamburgueria',
  description: 'Restaurante usado pelo E2E de módulos admin.',
  deliverySettings: { enabled: true, fee: 5, estimatedTime: '40-50 min', minimumOrder: 0 },
  orderSettings: { acceptOrderDirectly: true },
});

const catId = 'cat-hamburguer';
await db.collection('categories').doc(catId).set({ id: catId, restaurantId: rId, name: 'Hambúrgueres', order: 0 });

await db.collection('products').doc('prod-xbacon').set({
  id: 'prod-xbacon',
  restaurantId: rId,
  categoryId: catId,
  name: 'X-Bacon Foto',
  description: 'Burger clássico com bacon.',
  price: 29.9,
  isAvailable: true,
  createdAt: now,
  updatedAt: now,
});

await db.collection('deliverySettings').doc(rId).set({
  restaurantId: rId,
  enabled: true,
  fee: 5,
  estimatedTime: '40-50 min',
  minimumOrder: 0,
  observation: '',
  radiusKm: 10,
  feeByNeighborhood: {},
});

// 3. Role restaurant
await db.collection('users').doc(uid).set({ role: 'restaurant' }, { merge: true });

console.log('seeded restaurant:', rId, 'products: X-Bacon Foto');
process.exit(0);
