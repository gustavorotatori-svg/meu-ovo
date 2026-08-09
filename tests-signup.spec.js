import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:3000';
const PASSWORD = 'Teste@12345';
const EXISTING_EMAIL = 'facilitador@peopleo.com.br';

const stamp = Date.now() % 1000000000;
const REST_EMAIL = `signup.rest.${stamp}@peopleo.com.br`;
const CUST_EMAIL = `signup.cust.${stamp}@peopleo.com.br`;
const ABANDON_EMAIL = `signup.abandon.${stamp}@peopleo.com.br`;
const CREATED = [REST_EMAIL, CUST_EMAIL, ABANDON_EMAIL];

test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

test.afterAll(() => {
  execSync(`node scripts/cleanup-signup-tests.mjs ${CREATED.join(' ')}`, { stdio: 'inherit' });
});

async function collectErrors(page, log) {
  page.on('console', msg => log.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => log.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', req => log.push(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
}

async function fillSelfSignup(page, { name, whatsapp, email, password, acceptTerms = true }) {
  await page.fill('#signup-name', name);
  await page.fill('#signup-whatsapp', whatsapp);
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
  if (acceptTerms) await page.locator('#signup-lgpd').check();
}

function userState(email) {
  return JSON.parse(execSync(`node scripts/assert-signup-user.mjs "${email}"`, { encoding: 'utf8' }).trim());
}

test('Restaurante: cadastro via /cadastro (CTA principal) + onboarding ate o painel', async ({ page }) => {
  const log = [];
  await collectErrors(page, log);
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await page.goto(`${BASE}/cadastro`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#signup-name', { timeout: 20000 });

  const submitBtn = page.getByRole('button', { name: /criar conta grátis/i });
  await expect(submitBtn).toBeDisabled();

  await fillSelfSignup(page, {
    name: `Restaurante Signup ${stamp}`,
    whatsapp: '(11) 98888-7777',
    email: REST_EMAIL,
    password: PASSWORD,
  });
  await submitBtn.click();

  await page.waitForSelector('input[placeholder="Ex: Pizzaria do João"]', { timeout: 30000 });
  console.log('Cadastro -> onboarding:', page.url());

  let st = userState(REST_EMAIL);
  expect(st.exists).toBe(true);
  expect(st.doc.role).toBe('customer');
  expect(st.doc.signupIntent).toBe('restaurant');
  expect(st.emailVerified).toBe(false);

  const name = `Restaurante Signup ${stamp}`;
  for (let i = 0; i < 30; i++) {
    const c = await page.locator('input[placeholder="Ex: Pizzaria do João"]').count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.fill('input[placeholder="Ex: Pizzaria do João"]', name);
  await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 98888-7777');

  for (let i = 0; i < 30; i++) {
    const c = await page.getByRole('button', { name: /continu/i }).count();
    if (c === 1) break;
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /continu/i }).first().click();
  await page.waitForSelector('input[placeholder="Nome do produto"]', { timeout: 20000 });

  await page.fill('input[placeholder="Nome do produto"]', 'Prato Signup Teste');
  await page.fill('input[placeholder="Preço (R$)"]', '24.90');
  await page.selectOption('select:has(option[value="Mais Vendidos"])', 'Mais Vendidos');
  await page.getByRole('button', { name: /finalizar/i }).click();
  await page.waitForSelector('text=Tudo pronto!', { timeout: 20000 });
  console.log('Onboarding concluido');

  await page.getByRole('button', { name: /acessar painel/i }).click();
  await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), null, { timeout: 25000 });
  await page.waitForSelector('h1:has-text("Painel")', { timeout: 20000 });
  console.log('Painel acessado:', page.url());

  st = userState(REST_EMAIL);
  expect(st.doc.role).toBe('restaurant');
  expect(st.restaurantsOwned).toBeGreaterThanOrEqual(1);

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Algo deu errado');
  expect(log.filter(l => l.includes('[pageerror]'))).toEqual([]);
});

test('Cliente: cadastro via /login + primeiro acesso (install-app -> /busca)', async ({ page }) => {
  const log = [];
  await collectErrors(page, log);
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.getByRole('button', { name: /não tem conta\? cadastre-se/i }).click();
  await page.waitForSelector('#login-name', { timeout: 15000 });

  await page.fill('#login-name', 'Cliente Signup Teste');
  await page.fill('#login-email', CUST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.locator('input[type="checkbox"]').check();
  await page.locator('form button[type="submit"]').click();

  await page.waitForSelector('text=Adicione o MEU OVO à', { timeout: 30000 });
  console.log('Cadastro cliente -> install-app');
  await page.getByRole('button', { name: /pular esta etapa/i }).first().click();
  await page.waitForFunction(() => window.location.pathname.startsWith('/busca'), null, { timeout: 25000 });
  await page.waitForSelector('input[placeholder="Busque por restaurante ou tipo de comida..."]', { timeout: 20000 });
  console.log('Cliente no marketplace:', page.url());

  const st = userState(CUST_EMAIL);
  expect(st.exists).toBe(true);
  expect(st.doc.role).toBe('customer');
  expect(st.doc.signupIntent ?? null).toBe(null);

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Algo deu errado');
  expect(log.filter(l => l.includes('[pageerror]'))).toEqual([]);
});

test('Cliente: login com email nao verificado e bloqueado, e funciona apos confirmar', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const log = [];
  await collectErrors(page, log);
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.fill('#login-email', CUST_EMAIL);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');

  await page.getByText(/Confirme seu email/).first().waitFor({ timeout: 20000 });
  console.log('Login bloqueado p/ email nao verificado (ok)');
  expect(page.url()).toContain('/login');

  execSync(`node scripts/verify-signup-user.mjs "${CUST_EMAIL}"`, { stdio: 'inherit' });

  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith('/busca'), null, { timeout: 25000 });
  console.log('Login apos confirmacao ->', page.url());

  const st = userState(CUST_EMAIL);
  expect(st.emailVerified).toBe(true);
  expect(log.filter(l => l.includes('[pageerror]'))).toEqual([]);
  await context.close();
});

test('Restaurante: retomada do onboarding apos abandonar e voltar', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await pageA.goto(`${BASE}/cadastro`, { waitUntil: 'domcontentloaded' });
  await pageA.waitForSelector('#signup-name', { timeout: 20000 });
  await fillSelfSignup(pageA, {
    name: `Restaurante Abandono ${stamp}`,
    whatsapp: '(11) 97777-6666',
    email: ABANDON_EMAIL,
    password: PASSWORD,
  });
  await pageA.getByRole('button', { name: /criar conta grátis/i }).click();
  await pageA.waitForSelector('input[placeholder="Ex: Pizzaria do João"]', { timeout: 30000 });
  await pageA.fill('input[placeholder="Ex: Pizzaria do João"]', `Restaurante Abandono ${stamp}`);
  await pageA.fill('input[placeholder="(11) 99999-9999"]', '(11) 97777-6666');
  console.log('Abandonou no meio do onboarding');
  await ctxA.close();

  execSync(`node scripts/verify-signup-user.mjs "${ABANDON_EMAIL}"`, { stdio: 'inherit' });

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await pageB.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });
  await pageB.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await pageB.waitForSelector('#login-email', { timeout: 20000 });
  await pageB.fill('#login-email', ABANDON_EMAIL);
  await pageB.fill('#login-password', PASSWORD);
  await pageB.click('button[type="submit"]');

  await pageB.waitForFunction(() => window.location.pathname.startsWith('/cadastro-restaurante'), null, { timeout: 25000 });
  console.log('Retomada ->', pageB.url());
  await pageB.waitForSelector('input[placeholder="Ex: Pizzaria do João"]', { timeout: 20000 });
  await ctxB.close();
});

test('Validacao de erros no cadastro + duplo clique', async ({ page }) => {
  const log = [];
  await collectErrors(page, log);
  await page.addInitScript(() => {
    localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
  });

  await page.goto(`${BASE}/cadastro`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#signup-name', { timeout: 20000 });
  const submitBtn = page.getByRole('button', { name: /criar conta grátis/i });

  await expect(submitBtn).toBeDisabled();

  await fillSelfSignup(page, {
    name: 'X', whatsapp: '(11) 9', email: 'invalido', password: '123', acceptTerms: false,
  });
  await expect(submitBtn).toBeDisabled();

  await page.fill('#signup-email', 'valido@teste.com');
  await page.fill('#signup-password', PASSWORD);
  await page.fill('#signup-name', 'Nome Valido');
  await page.fill('#signup-whatsapp', '(11) 95555-4444');
  await expect(submitBtn).toBeDisabled();

  await page.locator('#signup-lgpd').check();
  await expect(submitBtn).toBeEnabled();

  const toasts = [];
  const poll = setInterval(async () => {
    const t = await page.locator('[role="status"], [aria-live="polite"]').allTextContents().catch(() => []);
    t.forEach(x => { if (x.trim() && !toasts.includes(x)) toasts.push(x.trim()); });
  }, 200);

  await page.fill('#signup-email', EXISTING_EMAIL);
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    btn?.click();
    btn?.click();
  });

  await page.waitForFunction(() => true, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2500);
  clearInterval(poll);

  const dupToasts = toasts.filter(t => t.includes('já está cadastrado'));
  console.log('TOASTS DUPLICADO:', JSON.stringify(toasts));
  expect(dupToasts.length).toBe(1);
  expect(page.url()).toContain('/cadastro');
  expect(log.filter(l => l.includes('[pageerror]'))).toEqual([]);
});

test('Responsividade: /cadastro e /login em mobile e desktop', async ({ browser }) => {
  const sizes = [
    { name: 'mobile-360', width: 360, height: 740 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-430', width: 430, height: 932 },
    { name: 'desktop-1366', width: 1366, height: 768 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
  ];

  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('@meuovo:cookie-consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
    });

    for (const [route, btnName] of [['/cadastro', /criar conta grátis/i], ['/login', /entrar|entrar como restaurante/i]]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${s.name} ${route} overflow`).toBe(false);

      const btn = page.getByRole('button', { name: btnName }).first();
      if (await btn.count()) {
        await btn.scrollIntoViewIfNeeded();
        const box = await btn.boundingBox();
        expect(box, `${s.name} ${route} botao fora da tela`).not.toBeNull();
        expect(box.y, `${s.name} ${route} botao acima`).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height, `${s.name} ${route} botao abaixo`).toBeLessThanOrEqual(s.height + 1);
      }
    }
    await ctx.close();
  }
});
