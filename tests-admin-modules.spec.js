import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const REST_EMAIL = 'facilitador@peopleo.com.br';
const PASSWORD = 'Teste@12345';
const BASE = 'http://localhost:3000';

test.beforeAll(() => {
  execSync('node scripts/reset-test-restaurant.mjs', { stdio: 'inherit' });
  execSync('node scripts/seed-test-restaurant.mjs', { stdio: 'inherit' });
});

async function collectErrors(page, log) {
  page.on('console', msg => {
    log.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => log.push(`[pageerror] ${err.message}`));
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('firestore.googleapis.com')) {
      const st = resp.status();
      let body = '';
      if (st >= 400) body = await resp.text().catch(() => '');
      log.push(`[resp ${st}] ${resp.request().method()} ${url.slice(0, 160)}${st >= 400 ? ' :: ' + body.slice(0, 400) : ''}`);
    }
  });
}

function dumpErrors(log) {
  const debug = log.filter(l => l.startsWith('[debug]'));
  const bad = log.filter(l =>
    l.startsWith('[pageerror]') ||
    (l.startsWith('[resp 4') || l.startsWith('[resp 5')) ||
    l.includes('PERMISSION_DENIED') || l.includes('permission denied')
  );
  if (bad.length) {
    console.log('--- ERROS RELEVANTES ---');
    bad.forEach(l => console.log(l));
  }
  if (debug.length) {
    console.log('--- DEBUG ---');
    debug.forEach(l => console.log(l));
  }
  return bad.length;
}

// StrictMode + AnimatePresence em dev remonta o componente (estado reset).
// Repete o bloco inteiro se a interação for interrompida por remount/timeout.
async function stableRun(page, fn, log, attempts = 6) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastErr = err;
      const line = `[stableRun] tentativa ${i + 1} falhou: ${String(err?.message || err).slice(0, 300)}`;
      console.error(line);
      if (log) log.push(line);
      let dom = '';
      try {
        dom = await page.evaluate(() => {
          const prod = document.querySelector('[data-testid="rs-product"]');
          const rows = [...document.querySelectorAll('[data-testid="rs-ingredient"]')];
          return JSON.stringify({
            prodValue: prod ? prod.value : null,
            prodOpts: prod ? [...prod.options].map(o => o.text) : null,
            rowCount: rows.length,
            rowOpts: rows.map(r => [...r.options].map(o => o.text)),
            selects: document.querySelectorAll('select').length,
          });
        });
      } catch { /* page fechada */ }
      console.error(`[stableRun] DOM: ${dom}`);
      await page.waitForTimeout(2000);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr || 'stableRun falhou'));
}

async function login(page) {
  await page.goto(`${BASE}/login?redirect=/admin/estoque`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.fill('#login-email', REST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, { timeout: 25000 });
  await page.waitForSelector('text=Estoque & Insumos', { timeout: 30000 });
}

test('Módulos: Estoque, Ficha Técnica e Financeiro', async ({ page }) => {
  test.setTimeout(240000);
  const log = [];
  await collectErrors(page, log);

  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await login(page);

  // ── ESTOQUE: criar insumo ──
  // StrictMode duplica o componente temporariamente; esperar estabilizar em 1
  for (let i = 0; i < 30; i++) {
    const c = await page.getByRole('button', { name: /novo insumo/i }).count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /novo insumo/i }).first().click();
  await page.waitForSelector('[data-testid="ing-name"]', { timeout: 15000 });
  for (let i = 0; i < 30; i++) {
    const c = await page.locator('[data-testid="ing-name"]').count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.locator('[data-testid="ing-name"]').fill('Queijo Mussarela');
  await page.locator('[data-testid="ing-cost"]').fill('40');
  await page.locator('[data-testid="ing-stock"]').fill('10');
  await page.locator('input[type="number"]').nth(2).fill('2'); // estoque mínimo
  await page.locator('[data-testid="ing-save"]').click();
  await expect(page.getByText('Insumo criado!')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Queijo Mussarela')).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/R\$\u00A0400/)).toBeVisible({ timeout: 30000 });

  // ── ESTOQUE: registrar movimentação de compra ──
  await page.getByRole('button', { name: /movimentações/i }).first().click();
  await stableRun(page, async () => {
    await page.getByRole('button', { name: /^registrar$/i }).first().click();
    await page.waitForSelector('[data-testid="mov-ingredient"]', { timeout: 15000 });
    for (let i = 0; i < 30; i++) {
      const c = await page.locator('[data-testid="mov-ingredient"]').count();
      if (c === 1) break;
      await page.waitForTimeout(500);
    }
    await page.locator('[data-testid="mov-ingredient"]').selectOption({ index: 1 });
    await page.locator('[data-testid="mov-qty"]').fill('5');
    await page.locator('[data-testid="mov-save"]').click();
    await expect(page.getByText('Movimentação registrada!')).toBeVisible({ timeout: 30000 });
  }, log);
  await expect(page.getByText(/\+5/)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Entrada \(compra\)/).first()).toBeVisible({ timeout: 30000 });

  // ── FICHA TÉCNICA ──
  await page.goto(`${BASE}/admin/ficha-tecnica`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Ficha Técnica', { timeout: 30000 });
  await stableRun(page, async () => {
    // O contexto inicia com products mock (pizzas) e só mostra os produtos reais
    // quando o restaurante do usuário carrega. Esperar o produto real existir.
    for (let i = 0; i < 60; i++) {
      const c = await page.locator('[data-testid="rs-product"] option', { hasText: 'X-Bacon Foto' }).count();
      if (c > 0) break;
      await page.waitForTimeout(500);
    }
    await page.locator('[data-testid="rs-product"]').selectOption('prod-xbacon', { timeout: 20000 });
    await expect(page.getByText('Nenhum insumo nesta ficha ainda.')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="rs-add-row"]').first().click({ timeout: 20000 });
    for (let i = 0; i < 40; i++) {
      const c = await page.locator('[data-testid="rs-ingredient"]').count();
      if (c >= 1) break;
      await page.waitForTimeout(500);
    }
    await page.locator('[data-testid="rs-ingredient"]').first().selectOption({ index: 1 }, { timeout: 20000 });
    await page.locator('[data-testid="rs-qty"]').first().fill('0.2', { timeout: 20000 });
    await expect(page.getByText('8,00').first()).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="rs-save"]').first().click({ timeout: 20000 });
    await expect(page.getByText('Ficha técnica salva!')).toBeVisible({ timeout: 20000 });
  }, log);
  await expect(page.locator('[data-testid="rs-product"]')).toContainText('✓');

  // ── FINANCEIRO ──
  await page.goto(`${BASE}/admin/financeiro`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Controle Financeiro', { timeout: 30000 });
  await expect(page.getByText('Lucro estimado do período')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Custo de mercadorias').first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Caixa aberto').first()).toBeVisible({ timeout: 30000 });

  const errors = dumpErrors(log);
  expect(errors, 'não deve haver pageerror/permission denied').toBe(0);
});
