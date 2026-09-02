// Validação de responsividade mobile (E2E) — detecta overflow horizontal, render e erros JS.
// Uso: node scripts/e2e-mobile.mjs [urlBase]
import { chromium, devices } from '@playwright/test';

const base = (process.argv[2] || 'https://meu-ovo-pi.vercel.app').replace(/\/$/, '');

const routes = [
  '/', '/busca', '/login', '/cadastro', '/impacto-social', '/para-restaurantes',
  '/ovos-de-ouro', '/blog', '/sobre', '/carrinho', '/install-app',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
let pass = 0, fail = 0;

for (const r of routes) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await page.goto(base + r, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const metrics = await page.evaluate(() => {
      return {
        vw: window.innerWidth,
        docW: document.documentElement.scrollWidth,
        bodyW: document.body.scrollWidth,
        bodyText: (document.body.innerText || '').trim().length,
      };
    });
    const realErrors = errs.filter(e => !e.includes('Failed to load resource') && !e.includes('net::ERR') && !e.includes('apis.google.com'));
    const overflow = metrics.docW > metrics.vw + 1 || metrics.bodyW > metrics.vw + 1;
    const hasContent = metrics.bodyText > 0;
    const ok = !overflow && hasContent && realErrors.length === 0;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${r.padEnd(20)} vw=${metrics.vw} docW=${metrics.docW} bodyText=${metrics.bodyText}${overflow ? ' OVERFLOW' : ''}${realErrors.length ? ' errs=' + realErrors.join('|').slice(0,60) : ''}`);
    if (ok) pass++; else fail++;
  } catch (e) {
    console.log(`FAIL ${r.padEnd(20)} throw=${String(e.message).slice(0,70)}`);
    fail++;
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(`\nMOBILE: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
