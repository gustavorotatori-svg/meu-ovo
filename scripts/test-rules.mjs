// Validação das regras do Firestore via emulador local (banco (default)).
// As regras em firestore.rules usam match /databases/{database}/documents (genérico),
// portanto testar no banco (default) valida a mesma lógica publicada.
// Executar com: firebase emulators:exec --only firestore "node scripts/test-rules.mjs"
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';

const rules = readFileSync('firestore.rules', 'utf8');

let pass = 0, fail = 0;
function check(name, ok, extra='') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (ok) pass++; else fail++;
}
async function succeeds(p) { try { await p; return true; } catch { return false; } }
async function fails(p) { try { await p; return false; } catch { return true; } }

const env = await initializeTestEnvironment({
  projectId: 'gen-lang-client-0267663159',
  firestore: { host: '127.0.0.1', port: 8080, rules },
});

const alice = env.authenticatedContext('alice-uid-1234567890');
const unknown = env.authenticatedContext('other-uid-999');
const anon = env.unauthenticatedContext();

const restId = 'rest-abc123';
const prodId = 'prod-xyz987';

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await db.doc(`restaurants/${restId}`).set({
    ownerId: 'alice-uid-1234567890', name: 'Teste', slug: 'teste', city: 'SP',
    createdAt: new Date().toISOString(),
  });
  await db.doc(`products/${prodId}`).set({
    restaurantId: restId, name: 'Produto', price: 10, bestSeller: false,
  });
});

// ═══ 1. LEITURAS PÚBLICAS ═══
check('leitura publica restaurants (anon)', await succeeds(anon.firestore().doc(`restaurants/${restId}`).get()));
check('leitura publica products (anon)', await succeeds(anon.firestore().doc(`products/${prodId}`).get()));
check('leitura publica ovos_de_ouro_participants (anon)', await succeeds(anon.firestore().collection('ovos_de_ouro_participants').limit(1).get()));

// ═══ 2. CREATE de ORDER ═══
const baseOrder = { restaurantId: restId, customerName: 'A', customerPhone: '11999999999', status: 'received', paymentMethod: 'cash', paymentStatus: 'pending', total: 10, items: [{ productId: prodId, name: 'X', quantity: 1, price: 10 }], createdAt: new Date().toISOString() };

check('create order valida (userId=uid)', await succeeds(alice.firestore().collection('orders').add({ ...baseOrder, userId: 'alice-uid-1234567890' })));
check('create order sem userId (guest) permitido', await succeeds(anon.firestore().collection('orders').add(baseOrder)));
check('create order items vazio NEGADO', await fails(alice.firestore().collection('orders').add({ ...baseOrder, items: [] })));
check('create order com userId alheio NEGADO', await fails(alice.firestore().collection('orders').add({ ...baseOrder, userId: 'other-uid-999' })));

// ═══ 3. UPDATE de orderCount NEGADO (regra removida + segurança) ═══
check('update orderCount em product NEGADO (anon)', await fails(anon.firestore().doc(`products/${prodId}`).update({ orderCount: 999 })));
check('update orderCount em restaurant NEGADO (anon)', await fails(anon.firestore().doc(`restaurants/${restId}`).update({ orderCount: 999 })));

// ═══ 4. OWNER vs NÃO-OWNER em restaurant ═══
check('owner (alice) atualiza restaurant permitido', await succeeds(alice.firestore().doc(`restaurants/${restId}`).update({ description: 'ok' })));
check('nao-owner atualiza restaurant NEGADO', await fails(unknown.firestore().doc(`restaurants/${restId}`).update({ description: 'x' })));

// ═══ 5. CANCELAR PRÓPRIA ORDER ═══
let aliceOrderId = null;
await env.withSecurityRulesDisabled(async (ctx) => {
  aliceOrderId = (await ctx.firestore().collection('orders').add({ ...baseOrder, userId: 'alice-uid-1234567890' })).id;
});
const cancel = { status: 'cancelled', updatedAt: new Date().toISOString() };
check('cancelar propria order (received→cancelled) permitido', await succeeds(alice.firestore().doc(`orders/${aliceOrderId}`).update(cancel)));
check('nao-dono cancelar order de outrem NEGADO', await fails(unknown.firestore().doc(`orders/${aliceOrderId}`).update(cancel)));

// ═══ 6. CREATE de dish_rating ═══
const year = new Date().getFullYear();
check('create dish_rating valido (nota 5) permitido', await succeeds(alice.firestore().collection('dish_ratings').add({ userId: 'alice-uid-1234567890', dishId: prodId, rating: 5, year, restaurantId: restId })));
check('create dish_rating nota invalida (6) NEGADO', await fails(alice.firestore().collection('dish_ratings').add({ userId: 'alice-uid-1234567890', dishId: prodId, rating: 6, year, restaurantId: restId })));

await env.cleanup();
console.log(`\nRESULTADO: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
