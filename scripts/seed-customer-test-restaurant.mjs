import fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = fs.readFileSync('.env', 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
if (!m) { console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found'); process.exit(1); }
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore(getApps()[0], 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b');

const REST_ID = 'restaurant-customer-e2e';
const SLUG = 'restaurante-cliente-teste';

const restaurant = {
  ownerId: 'e2e-customer-rest-owner',
  name: 'Restaurante Cliente Teste',
  slug: SLUG,
  whatsapp: '5511999990001',
  email: 'cliente.rest@teste.com.br',
  address: 'Rua do Teste, 123',
  city: 'São Paulo',
  neighborhood: 'Centro',
  logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
  coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
  primaryColor: '#FF7A00',
  isOpen: true,
  cuisineType: 'Brasileira',
  priceRange: 'medium',
  deliveryEnabled: true,
  pickupEnabled: true,
  dineInEnabled: true,
  estimatedTime: 30,
  deliveryFee: 0,
  minimumOrder: 0,
  rating: 5.0,
  reviewCount: 0,
  description: 'Restaurante de teste para o fluxo E2E do cliente.',
  createdAt: '2026-01-01',
  deliverySettings: {
    fee: 0,
    estimatedTime: '30 min',
    minOrder: 0,
    feeByNeighborhood: [],
    radiusKm: 10,
  },
  orderSettings: {
    autoAccept: true,
    soundAlert: true,
    thermalPrinterEnabled: false,
    whatsappNotificationsEnabled: true,
    blockProblematicCustomers: false,
  },
  paymentSettings: {
    acceptCreditCard: false,
    creditCardLink: '',
    acceptDebit: false,
    debitLink: '',
    acceptVoucher: false,
    voucherLink: '',
  },
  loyaltySettings: {
    enabled: false,
    pointsPerReal: 1,
    accumulationType: 'amount',
    redemptionRules: [],
  },
};

const category = { restaurantId: REST_ID, name: 'Pratos', order: 0 };

const product = {
  restaurantId: REST_ID,
  categoryId: 'e2e-cat-1',
  name: 'Prato do Cliente Teste',
  description: 'Prato principal de teste para pedido E2E.',
  price: 29.9,
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  isAvailable: true,
  isActive: true,
  isFeatured: false,
  bestSeller: false,
  onPromotion: false,
  additionalGroups: [],
  estimatedPrepTime: 15,
  order: 0,
  createdAt: '2026-01-01',
};

await db.collection('restaurants').doc(REST_ID).set(restaurant);
await db.collection('categories').doc('e2e-cat-1').set(category);
await db.collection('products').doc('e2e-prod-1').set(product);

const deliverySettings = await db.collection('deliverySettings').doc(REST_ID).get();
if (!deliverySettings.exists) {
  await db.collection('deliverySettings').doc(REST_ID).set({
    restaurantId: REST_ID,
    enabled: true,
    radiusKm: 10,
    fee: 0,
    estimatedTime: 30,
    minimumOrder: 0,
    observation: '',
    feeByNeighborhood: [],
  });
}

const oldOrders = await db.collection('orders').where('restaurantId', '==', REST_ID).get();
let deleted = 0;
for (const d of oldOrders.docs) {
  await db.collection('orders').doc(d.id).delete();
  deleted++;
}
console.log(`seed ok: ${SLUG} (${REST_ID}) + 1 cat + 1 product; orders reset: ${deleted}`);
process.exit(0);
