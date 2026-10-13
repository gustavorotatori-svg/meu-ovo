import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
} from 'firebase/firestore';
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
    await setDoc(doc(db, 'restaurants', REST_A), {
      ownerId: OWNER_A,
      name: 'Restaurante A',
      slug: 'restaurante-a',
    });
    await setDoc(doc(db, 'restaurants', REST_B), {
      ownerId: OWNER_B,
      name: 'Restaurante B',
      slug: 'restaurante-b',
    });
    await setDoc(doc(db, 'tables', 'mesa-a1'), {
      restaurantId: REST_A,
      number: 1,
      status: 'free',
    });
    await setDoc(doc(db, 'tables', 'mesa-b1'), {
      restaurantId: REST_B,
      number: 1,
      status: 'free',
    });
  });
}

/**
 * O Firestore emulator exige Java instalado. Sem ele (ou se a porta 8080
 * estiver ocupada por outro servico) os testes de regras sao ignorados, em vez
 * de derrubar a suite inteira.
 *
 * Rode com: npx firebase emulators:exec --only firestore "npx vitest run"
 */
const EMULATOR_PORT = 8080;

let env: RulesTestEnvironment | null = null;
try {
  env = await initializeTestEnvironment({
    projectId: 'demo-meuovo',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: EMULATOR_PORT,
    },
  });
  await seed(env);
} catch (err) {
  console.warn(
    `[tables.rules] Firestore emulator indisponivel em 127.0.0.1:${EMULATOR_PORT} ` +
    `(Java ausente ou porta ocupada?) - testes de regras ignorados. ${String(err).slice(0, 120)}`
  );
  env = null;
}

const RULES_ACTIVE = env !== null;

beforeAll(async () => {
  if (!env) return;
  await seed(env);
});

afterAll(async () => {
  if (!env) return;
  await env.cleanup();
});

afterEach(async () => {
  if (!env) return;
  await env.clearFirestore();
  await seed(env);
});

describe.skipIf(!RULES_ACTIVE)('IDOR em /tables - regressao corrigida', () => {
  it('BLOQUEIA dono do restaurante A de tomar a mesa do restaurante B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();

    // Antes da correcao passava: o atacante escrevia restaurantId = REST_A
    // no documento e a regra via incoming() era satisfeita.
    await assertFails(
      updateDoc(doc(db, 'tables', 'mesa-b1'), {
        restaurantId: REST_A,
        status: 'free',
      })
    );
  });

  it('BLOQUEIA dono de A de alterar o status da mesa de B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertFails(updateDoc(doc(db, 'tables', 'mesa-b1'), { status: 'occupied' }));
  });

  it('BLOQUEIA dono de A de deletar a mesa de B', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertFails(deleteDoc(doc(db, 'tables', 'mesa-b1')));
  });

  it('PERMITE o dono do B deletar a propria mesa (delete antes inalcancavel)', async () => {
    const db = env!.authenticatedContext(OWNER_B).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'tables', 'mesa-b1')));
  });
});

describe.skipIf(!RULES_ACTIVE)('Fluxo legitimo do dono - nao pode regredir', () => {
  it('PERMITE o dono do A criar mesa no proprio restaurante', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertSucceeds(
      addDoc(collection(db, 'tables'), { restaurantId: REST_A, number: 7, status: 'free' })
    );
  });

  it('PERMITE o dono do A atualizar a propria mesa', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'tables', 'mesa-a1'), { status: 'occupied', currentOrderId: 'abc123' })
    );
  });

  it('PERMITE o dono do A ler as proprias mesas', async () => {
    const db = env!.authenticatedContext(OWNER_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'tables', 'mesa-a1')));
  });
});

describe.skipIf(!RULES_ACTIVE)('Fluxo QR Code / dine-in do guest - nao pode regredir', () => {
  it('PERMITE guest logado marcar mesa como ocupada ao pedir pelo QR', async () => {
    // Espelha CheckoutPage.tsx: updateDoc com status + currentOrderId.
    const db = env!.authenticatedContext(GUEST).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'tables', 'mesa-a1'), {
        status: 'occupied',
        currentOrderId: 'order-xyz',
      })
    );
  });

  it('BLOQUEIA guest anonimo marcar mesa como ocupada (evita DoS em todas as mesas)', async () => {
    // Antes da regra nova isso ja era negado, porque isOwnerOrAdmin exige
    // login. A correcao nao pode afrouxar para anonimos.
    const db = env!.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, 'tables', 'mesa-a1'), {
        status: 'occupied',
        currentOrderId: 'order-anon',
      })
    );
  });

  it('BLOQUEIA guest anonimo alterar campos sensiveis da mesa', async () => {
    const db = env!.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, 'tables', 'mesa-a1'), { status: 'free', ownerId: OWNER_B })
    );
  });

  it('BLOQUEIA guest anonimo trocar restaurantId da mesa', async () => {
    const db = env!.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, 'tables', 'mesa-b1'), {
        status: 'occupied',
        restaurantId: REST_A,
      })
    );
  });

  it('PERMITE leitura publica das mesas (necessario para o QR Code)', async () => {
    const db = env!.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(db, 'tables')));
  });
});