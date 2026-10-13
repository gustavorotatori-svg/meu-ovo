import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const OWNER_A = 'owner-restaurante-a';
const OWNER_B = 'owner-restaurante-b';
const GUEST = 'cliente-guest-saudein';
const REST_A = 'restaurante-a';
const REST_B = 'restaurante-b';

const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

async function seed(e: RulesTestEnvironment) {
  await e.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'restaurants', REST_A), { ownerId: OWNER_A, name: 'Restaurante A', slug: 'restaurante-a' });
    await setDoc(doc(db, 'restaurants', REST_B), { ownerId: OWNER_B, name: 'Restaurante B', slug: 'restaurante-b' });
    await setDoc(doc(db, 'tables', 'mesa-a1'), { restaurantId: REST_A, number: 1, status: 'free' });
    await setDoc(doc(db, 'tables', 'mesa-b1'), { restaurantId: REST_B, number: 1, status: 'free' });
  });
}

const EMULATOR_PORT = 8080;

let env: RulesTestEnvironment | null = null;
try {
  env = await initializeTestEnvironment({
    projectId: 'demo-meuovo',
    firestore: { rules, host: '127.0.0.1', port: EMULATOR_PORT },
  });
  await seed(env);
} catch (err) {
  console.warn(
    `[rules] Firestore emulator indisponivel em 127.0.0.1:${EMULATOR_PORT} (Java ausente ou porta ocupada?) - testes ignorados. ${String(err).slice(0, 100)}`
  );
  env = null;
}

const RULES_ACTIVE = env !== null;

beforeAll(async () => {
  if (!env) return;
  await seed(env);
});
afterAll(async () => {
  if (env) await env.cleanup();
});
afterEach(async () => {
  if (!env) return;
  await env.clearFirestore();
  await seed(env);
});

const base = (over: Record<string, unknown> = {}) => ({
  restaurantId: REST_A,
  type: 'delivery',
  customerName: 'Cliente Teste',
  customerPhone: '11988887777',
  status: 'received',
  paymentMethod: 'pix',
  paymentStatus: 'pending',
  createdAt: new Date().toISOString(),
  ...over,
});

describe.skipIf(!RULES_ACTIVE)('IDOR em /tables', () => {
  it('BLOQUEIA dono de A tomar a mesa de B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertFails(updateDoc(doc(db, 'tables', 'mesa-b1'), { restaurantId: REST_A, status: 'free' }));
  });
  it('BLOQUEIA dono de A alterar status da mesa de B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertFails(updateDoc(doc(db, 'tables', 'mesa-b1'), { status: 'occupied' }));
  });
  it('BLOQUEIA dono de A deletar mesa de B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertFails(deleteDoc(doc(db, 'tables', 'mesa-b1')));
  });
  it('PERMITE dono do B deletar a propria mesa', async () => {
    const db = env!.authenticatedContext(OWNER_B).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'tables', 'mesa-b1')));
  });
  it('PERMITE dono do A criar mesa', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertSucceeds(addDoc(collection(db, 'tables'), { restaurantId: REST_A, number: 7, status: 'free' }));
  });
  it('PERMITE guest logado marcar mesa ocupada (QR dine-in)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertSucceeds(updateDoc(doc(db, 'tables', 'mesa-a1'), { status: 'occupied', currentOrderId: 'x' }));
  });
  it('BLOQUEIA guest anonimo marcar mesa ocupada', async () => {
    const db = env!.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, 'tables', 'mesa-a1'), { status: 'occupied' }));
  });
  it('PERMITE leitura publica das mesas', async () => {
    const db = env!.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(db, 'tables')));
  });
});

describe.skipIf(!RULES_ACTIVE)('Pedidos legitimos devem PASSAR (regressao)', () => {
  it('MenuDisplay: carrinho simples sem desconto', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    // items com `price` (formato do MenuDisplay)
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'Pastel', price: 12.5, quantity: 2 }],
        deliveryFee: 5,
        donationAmount: 0,
        rewardDiscount: 0,
        couponDiscount: 0,
        discountAmount: 0,
        total: 30,
      }))
    );
  });

  it('MenuDisplay: com reward percentual (33.33%) - ruido de float', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    // subtotal 100, reward = 33.33, fee 5 -> 71.67
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'Combo', price: 50, quantity: 2 }],
        deliveryFee: 5,
        donationAmount: 0,
        rewardDiscount: 33.33,
        couponDiscount: 0,
        total: 71.67,
      }))
    );
  });

  it('MenuDisplay: com cupom + reward somados', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'Combo', price: 40, quantity: 2 }],
        deliveryFee: 0,
        donationAmount: 2,
        rewardDiscount: 10,
        couponDiscount: 10,
        total: 62,
      }))
    );
  });

  it('CheckoutPage: com tip + caixinha + doacao (unitPrice)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    // items 30, fee 5, tip 6, caixinha 1, donation 2, sem desconto -> 44
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        origin: 'marketplace',
        items: [{ productId: 'p1', productName: 'X', unitPrice: 15, quantity: 2, additionals: [] }],
        subtotal: 30,
        deliveryFee: 5,
        tip: 6,
        meuOvoCaixinha: 1,
        donationAmount: 2,
        total: 44,
      }))
    );
  });

  it('CheckoutPage: reward free_product (unitPrice 0 no item, total coerente)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    // item gratis (0) + item pago 20 -> soma 20; total = 20 + 0 = 20
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        items: [
          { productId: 'p1', productName: 'Gratis', unitPrice: 0, quantity: 1, additionals: [] },
          { productId: 'p2', productName: 'Pago', unitPrice: 20, quantity: 1, additionals: [] },
        ],
        deliveryFee: 0,
        donationAmount: 0,
        total: 20,
      }))
    );
  });

  it('CheckoutPage: reward discount_percent (agora declara rewardDiscount)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', productName: 'X', unitPrice: 50, quantity: 1, additionals: [] }],
        deliveryFee: 0,
        donationAmount: 0,
        rewardDiscount: 25,
        total: 25,
      }))
    );
  });

  it('WaiterMode: pedido de mesa sem desconto (customerPhone N/A)', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'orders'), base({
        customerPhone: 'N/A',
        type: 'table',
        tableNumber: 3,
        items: [{ productId: 'p1', productName: 'X', unitPrice: 9.9, quantity: 3, additionals: [] }],
        total: 29.7,
      }))
    );
  });
});

describe.skipIf(!RULES_ACTIVE)('Fraude de preco deve ser BLOQUEADA', () => {
  it('BLOQUEIA total: 0 com carrinho de 100', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'Combo', price: 50, quantity: 2 }],
        total: 0,
      }))
    );
  });

  it('BLOQUEIA desconto maior que o carrinho', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'X', price: 10, quantity: 1 }],
        couponDiscount: 999,
        total: 0,
      }))
    );
  });

  it('BLOQUEIA desconto negativo (credito ao cliente)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', name: 'X', price: 10, quantity: 1 }],
        couponDiscount: -50,
        total: 60,
      }))
    );
  });

  it('BLOQUEIA unitPrice forjado para 0.01', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', productName: 'Combo 50 reais', unitPrice: 0.01, quantity: 2 }],
        total: 0.02,
        // o total bate com os itens declarados; o catalogo nao e conferido aqui
      }))
    );
  });

  it('BLOQUEIA total incoerente (total muito menor que itens - taxa negativa)', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(
      addDoc(collection(db, 'orders'), base({
        items: [{ productId: 'p1', productName: 'X', unitPrice: 50, quantity: 2 }],
        deliveryFee: -40,
        total: 60,
      }))
    );
  });

  it('BLOQUEIA carrinho vazio', async () => {
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertFails(addDoc(collection(db, 'orders'), base({ items: [], total: 0 })));
  });
});