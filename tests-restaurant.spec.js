import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const REST_EMAIL = 'facilitador@peopleo.com.br';
const PASSWORD = 'Teste@12345';
const BASE = 'http://localhost:3000';

test.beforeAll(() => {
  execSync('node scripts/reset-test-restaurant.mjs', { stdio: 'inherit' });
});

async function collectErrors(page, log) {
  page.on('console', msg => {
    log.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => log.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => log.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
}

test('Cadastro de restaurante completo (login + onboarding)', async ({ page }) => {
  const log = [];
  await collectErrors(page, log);

  // Login como restaurante
  await page.goto(`${BASE}/login?redirect=/cadastro-restaurante`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.fill('#login-email', REST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');

  // Aguardar sair do /login (não fazer match na query string)
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, { timeout: 25000 });
  console.log('Path após login:', page.url());

  await page.waitForSelector('input[placeholder="Ex: Pizzaria do João"]', { timeout: 20000 });
  // Aguardar a transição do AnimatePresence terminar (dev StrictMode monta 2 instâncias temporariamente)
  for (let i = 0; i < 30; i++) {
    const c = await page.locator('input[placeholder="Ex: Pizzaria do João"]').count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  const name = `Restaurante Teste ${Date.now() % 100000}`;
  await page.fill('input[placeholder="Ex: Pizzaria do João"]', name);
  await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 98765-4321');

  // Clicar em Continuar/Continue (i18n pode variar) — aguardar o count estabilizar em 1 (transição AnimatePresence)
  for (let i = 0; i < 30; i++) {
    const c = await page.getByRole('button', { name: /continu/i }).count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /continu/i }).first().click();
  await page.waitForSelector('input[placeholder="Nome do produto"]', { timeout: 20000 });

  // Preencher produto
  await page.fill('input[placeholder="Nome do produto"]', 'Pizza Calabresa');
  await page.fill('input[placeholder="Preço (R$)"]', '39.90');
  await page.selectOption('select:has(option[value="Mais Vendidos"])', 'Mais Vendidos');

  // Finalizar
  await page.getByRole('button', { name: /finalizar/i }).click();
  const toasts = [];
  const toastPoll = setInterval(async () => {
    const t = await page.locator('[class*="toast"], [role="status"], [aria-live="polite"]').allTextContents().catch(() => []);
    t.forEach(x => { if (!toasts.includes(x)) toasts.push(x); });
  }, 250);
  try {
    await page.waitForSelector('text=Tudo pronto!', { timeout: 15000 });
  } catch {
    clearInterval(toastPoll);
    console.log('--- FALHA NO FINALIZAR: console logs ---');
    log.filter(l => !l.includes('googletagmanager') && !l.includes('facebook.net') && !l.includes('Sentry') && !l.includes('gtag') && !l.includes('worker from')).forEach(l => console.log(l));
    console.log('TOASTS:', JSON.stringify(toasts));
    const body = await page.locator('body').innerText();
    console.log('BODY SNIPPET:', body.slice(0, 600).replace(/\s+/g, ' '));
    const progress2 = await page.evaluate(() => localStorage.getItem('meuovo_onboarding_progress')).catch(() => null);
    console.log('SAVED PROGRESS NA FALHA:', progress2 ? progress2.slice(0, 300) : 'null');
    throw new Error('Finalizar não completou');
  }
  clearInterval(toastPoll);
  console.log('Onboarding concluído para:', name);

  // Entrar no painel
  await page.getByRole('button', { name: /acessar painel/i }).click();
  await page.waitForSelector('text=/admin', { timeout: 25000 }).catch(() => console.log('admin path check'));
  console.log('Path no admin:', page.url());

  const realErrors = log.filter(l => l.includes('[pageerror]'));
  expect(realErrors).toEqual([]);
});
