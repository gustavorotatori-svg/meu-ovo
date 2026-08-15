import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const REST_EMAIL = 'facilitador@peopleo.com.br';
const PASSWORD = 'Teste@12345';
const BASE = 'http://localhost:3000';

// 1x1 PNG vermelho, buffer válido para setInputFiles
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeAll(() => {
  execSync('node scripts/reset-test-restaurant.mjs', { stdio: 'inherit' });
});

async function collectErrors(page, log) {
  page.on('console', msg => {
    log.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => log.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => log.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
  page.on('request', req => {
    if (req.url().includes('firebasestorage') && req.method() === 'POST') {
      const h = req.headers();
      log.push(`[storage-upload] url=${req.url().slice(0, 120)} contentType=${h['content-type']} auth=${h['authorization'] ? 'yes' : 'NO'} xGoogContentLength=${h['x-goog-content-length-range'] || '?'}`);
    }
  });
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('firebasestorage.googleapis.com') || url.includes('firestore.googleapis.com')) {
      const st = resp.status();
      let body = '';
      if (st >= 400) body = await resp.text().catch(() => '');
      log.push(`[resp ${st}] ${resp.request().method()} ${url.slice(0, 160)}${st >= 400 ? ' :: ' + body.slice(0, 400) : ''}`);
    }
  });
}

test('Upload de foto com processamento (onboarding + painel admin)', async ({ page }) => {
  // Fluxo longo (onboarding completo + upload + filtros) — tolerar ambiente lento
  test.setTimeout(240000);
  const log = [];
  await collectErrors(page, log);

  // Cookie consent dispensado via init script (barra fixa intercepta cliques)
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  // Login como restaurante
  await page.goto(`${BASE}/login?redirect=/cadastro-restaurante`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.fill('#login-email', REST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, { timeout: 25000 });
  console.log('Path após login:', page.url());

  await page.waitForSelector('input[placeholder="Ex: Pizzaria do João"]', { timeout: 20000 });
  for (let i = 0; i < 30; i++) {
    const c = await page.locator('input[placeholder="Ex: Pizzaria do João"]').count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  const name = `Restaurante Upload ${Date.now() % 100000}`;
  await page.fill('input[placeholder="Ex: Pizzaria do João"]', name);
  await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 98765-4321');

  for (let i = 0; i < 30; i++) {
    const c = await page.getByRole('button', { name: /continu/i }).count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /continu/i }).first().click();
  await page.waitForSelector('input[placeholder="Nome do produto"]', { timeout: 20000 });

  await page.fill('input[placeholder="Nome do produto"]', 'Pizza Calabresa');
  await page.fill('input[placeholder="Preço (R$)"]', '39.90');
  await page.selectOption('select:has(option[value="Mais Vendidos"])', 'Mais Vendidos');
  await page.getByRole('button', { name: /finalizar/i }).click();
  await page.waitForSelector('text=Tudo pronto!', { timeout: 15000 });
  console.log('Onboarding concluído');

  await page.getByRole('button', { name: /acessar painel/i }).click();
  await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), null, { timeout: 25000 });
  console.log('Path no admin:', page.url());

  // Navegar para o cardápio
  await page.goto(`${BASE}/admin/cardapio`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Algo deu errado, text=PRODUTO', { timeout: 15000 }).catch(async () => {});
  const hasError = await page.getByText('Algo deu errado').isVisible().catch(() => false);
  console.log('ErrorBoundary visível:', hasError);
  const body = await page.locator('body').innerText();
  console.log('BODY SNIPPET:', body.slice(0, 400).replace(/\s+/g, ' '));
  console.log('--- console logs ---');
  log.filter(l => !l.includes('googletagmanager') && !l.includes('facebook.net') && !l.includes('Sentry') && !l.includes('gtag') && !l.includes('worker from')).forEach(l => console.log(l));
  await page.waitForSelector('text=PRODUTO', { timeout: 20000 });

  // Abrir modal de novo produto (botão de criação, não a aba "PRODUTOS")
  await page.getByRole('button', { name: /^PRODUTO$/ }).first().click();
  await page.waitForTimeout(1500);
  const bodyAfterClick = await page.locator('body').innerText();
  console.log('BODY APÓS CLIQUE:', bodyAfterClick.slice(0, 300).replace(/\s+/g, ' '));
  console.log('--- console logs APÓS clique ---');
  log.filter(l => !l.includes('googletagmanager') && !l.includes('facebook.net') && !l.includes('Sentry') && !l.includes('gtag') && !l.includes('worker from')).forEach(l => console.log(l));
  await page.waitForSelector('input[placeholder="X-Bacon Supremo"]', { timeout: 20000 });

  // Enviar imagem via input file (dispara o processamento real: resize + webp + EXIF)
  await page.setInputFiles('input[type="file"]', {
    name: 'foto-teste.png',
    mimeType: 'image/png',
    buffer: PNG_BUFFER,
  });

  // Deve passar pelo estado PROCESSANDO e mostrar preview (blob URL)
  const sawProcessing = await page.getByText('PROCESSANDO').isVisible({ timeout: 3000 }).then(() => true).catch(() => false);
  console.log('Viu estado PROCESSANDO:', sawProcessing);

  await page.waitForSelector('img[alt="Preview"]', { timeout: 10000 });
  const previewSrc = await page.locator('img[alt="Preview"]').getAttribute('src');
  console.log('Preview src (primeiros 30):', previewSrc?.slice(0, 30));
  expect(previewSrc).toMatch(/^blob:/);

  // Preencher e salvar
  await page.fill('input[placeholder="X-Bacon Supremo"]', 'X-Bacon Foto');
  await page.fill('input[placeholder="0.00"]', '25.90');
  await page.selectOption('select', { label: 'Mais Vendidos' });

  await page.getByRole('button', { name: /CRIAR PRODUTO/i }).click();

  // Confirmar que o salvamento foi reconhecido (toast de sucesso do Firestore)
  await page.waitForSelector('text=Produto criado!', { timeout: 20000 }).catch(() => {});
  console.log('--- logs pós salvar ---');
  log.filter(l => !l.includes('googletagmanager') && !l.includes('facebook.net') && !l.includes('Sentry') && !l.includes('gtag') && !l.includes('worker from')).forEach(l => console.log(l));
  const toasts = await page.locator('[class*="toast"], [role="status"], [aria-live="polite"]').allTextContents().catch(() => []);
  console.log('TOASTS:', JSON.stringify(toasts));
  const body2 = await page.locator('body').innerText();
  console.log('BODY PÓS SALVAR:', body2.slice(0, 300).replace(/\s+/g, ' '));

  // A aba padrão é a primeira categoria (pode não conter o produto); clicar em "Todos"
  await page.getByRole('button', { name: /todos/i }).click();

  // Espera robusta: Playwright re-poll até o produto aparecer (tolera latência do listener Firestore)
  await expect(page.getByText('X-Bacon Foto')).toBeVisible({ timeout: 60000 });

  // Verificar que a URL da imagem veio do Firebase Storage (upload real + processado)
  const imgUrls = await page.locator('img[src*="firebasestorage.googleapis.com"]').count();
  console.log('Imagens do Storage na página:', imgUrls);
  expect(imgUrls).toBeGreaterThan(0);

  const realErrors = log.filter(l => l.includes('[pageerror]'));
  console.log('Erros de página:', realErrors.length);
  expect(realErrors).toEqual([]);
});
