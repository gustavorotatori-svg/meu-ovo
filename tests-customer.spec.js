import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const CUST_EMAIL = 'cliente.teste@peopleo.com.br';
const PASSWORD = 'Teste@12345';
const BASE = 'http://localhost:3000';
const SLUG = 'restaurante-cliente-teste';

test.beforeAll(() => {
  execSync('node scripts/seed-customer-test-restaurant.mjs', { stdio: 'inherit' });
});

async function collectErrors(page, log) {
  page.on('console', msg => {
    log.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => log.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => log.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
}

test('Fluxo do cliente: navegar, adicionar ao carrinho e fechar pedido', async ({ page }) => {
  const log = [];
  await collectErrors(page, log);

  // Login como cliente — cookie consent dispensado via init script (barra fixa intercepta cliques)
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });
  await page.goto(`${BASE}/login?redirect=/r/${SLUG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.fill('#login-email', CUST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname.startsWith('/r/'), null, { timeout: 25000 });
  console.log('Path após login:', page.url());

  // Aguardar o produto do seed aparecer (e a transição do AnimatePresence estabilizar)
  await page.waitForSelector('text=Prato do Cliente Teste', { timeout: 25000 });
  for (let i = 0; i < 30; i++) {
    const c = await page.getByText('Prato do Cliente Teste').count();
    if (c >= 1) break;
    await page.waitForTimeout(500);
  }

  // Abrir modal do produto e adicionar à sacola
  await page.getByText('Prato do Cliente Teste').first().click();
  await page.waitForSelector('button:has-text("Adicionar à Sacola")', { timeout: 15000 });
  await page.getByRole('button', { name: /adicionar à sacola/i }).click();

  // Botão flutuante "Ver sacola de compras" -> /carrinho
  await page.waitForSelector('button:has-text("Ver sacola de compras")', { timeout: 15000 });
  await page.getByRole('button', { name: /ver sacola/i }).click();
  await page.waitForFunction(() => window.location.pathname === '/carrinho', null, { timeout: 15000 });
  console.log('Carrinho:', page.url());

  // Ir para o checkout
  await page.getByRole('button', { name: /ir para o checkout/i }).first().click();
  await page.waitForFunction(() => window.location.pathname === '/checkout', null, { timeout: 15000 });
  console.log('Checkout:', page.url());

  // Preencher dados do cliente — aguardar a transição do AnimatePresence estabilizar (1 input)
  await page.waitForSelector('input[placeholder="Ex: João Silva"]', { timeout: 15000 });
  for (let i = 0; i < 30; i++) {
    const c = await page.locator('input[placeholder="Ex: João Silva"]').count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.fill('input[placeholder="Ex: João Silva"]', 'Cliente Teste E2E');
  await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 98765-4321');

  // Escolher retirada (evita endereço) — o botão de finalizar desabilita até preencher
  await page.getByRole('button', { name: /retirada/i }).first().click();

  // Pagamento: dinheiro (evita dependência de PIX)
  await page.getByRole('button').filter({ hasText: 'Dinheiro' }).first().click();

  // Submeter pedido (abre WhatsApp em nova aba — fechamos a popup se aparecer)
  const popups = [];
  page.on('popup', p => { popups.push(p); p.close().catch(() => {}); });
  const submitBtn = page.getByRole('button', { name: /enviar para o whatsapp/i }).first();
  const enabled = await submitBtn.isEnabled().catch(() => false);
  console.log('Submit habilitado?', enabled);
  if (!enabled) {
    const nameVal = await page.locator('input[placeholder="Ex: João Silva"]').first().inputValue().catch(() => 'ERR');
    const phoneVal = await page.locator('input[placeholder="(11) 99999-9999"]').first().inputValue().catch(() => 'ERR');
    console.log('NOME:', JSON.stringify(nameVal), 'PHONE:', JSON.stringify(phoneVal));
    const errs = await page.locator('[role="alert"], [class*="error"]').allTextContents().catch(() => []);
    console.log('ERROS VISÍVEIS:', JSON.stringify(errs.slice(0, 5)));
    const toasts = await page.locator('[class*="toast"], [role="status"], [aria-live="polite"]').allTextContents().catch(() => []);
    console.log('TOASTS:', JSON.stringify(toasts.slice(0, 5)));
  }
  await submitBtn.click();
  await page.waitForTimeout(4000);
  const afterToasts = await page.locator('[class*="toast"], [role="status"], [aria-live="polite"]').allTextContents().catch(() => []);
  console.log('TOASTS PÓS-SUBMIT:', JSON.stringify(afterToasts.slice(0, 6)));
  const filtered = log.filter(l => l.includes('[pageerror]') || l.includes('Failed to save') || l.includes('permission') || l.includes('denied') || l.includes('toast'));
  console.log('LOG FILTRADO:', JSON.stringify(filtered.slice(0, 10)));

  // Tela de confirmação
  await page.waitForSelector('text=Pedido enviado!', { timeout: 20000 });
  console.log('Pedido enviado! popups abertas:', popups.length);

  const realErrors = log.filter(l => l.includes('[pageerror]'));
  expect(realErrors).toEqual([]);
});
