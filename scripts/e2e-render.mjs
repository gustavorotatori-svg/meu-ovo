// E2E render smoke test — valida que rotas públicas de produção renderizam sem erro.
// Uso: node scripts/e2e-render.mjs [urlBase]
import { chromium } from '@playwright/test';

const base = (process.argv[2] || 'https://meu-ovo-pi.vercel.app').replace(/\/$/, '');

const publicRoutes = [
  '/', '/busca', '/carrinho', '/checkout', '/login', '/install-app',
  '/cadastro-restaurante', '/cadastro', '/impacto-social', '/para-restaurantes',
  '/ovos-de-ouro', '/blog', '/sobre', '/termos', '/privacidade',
];
const protectedRoutes = [
  '/meus-pedidos', '/perfil', '/admin', '/admin/pedidos', '/admin/cardapio',
  '/admin/garcom', '/admin/caixa', '/admin/estoque', '/admin/cozinha',
  '/admin/delivery', '/admin/relatorios', '/admin/cupons', '/admin/fidelidade',
  '/admin/analytics', '/admin/configuracoes', '/admin/ovos-de-ouro',
  '/admin/flash-deals', '/admin/etiquetas', '/admin/whatsapp-ai',
  '/plataforma', '/plataforma/restaurantes', '/plataforma/clientes',
  '/plataforma/inteligencia', '/plataforma/relatorios', '/plataforma/parceiros',
  '/plataforma/doacoes', '/plataforma/ovos-de-ouro',
];

const browser = await chromium.launch();

async function probe(urlPath, label) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  try {
    await page.goto(base + urlPath, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
    const final = page.url().replace(base, '');
    const boundary = bodyText.includes('Algo deu errado') || bodyText.includes('Recarregar página');
    const realErrors = errs.filter(e => !e.includes('Failed to load resource') && !e.includes('net::ERR'));
    const hasContent = bodyText.length > 0;
    const redirectedToLogin = final.includes('/login');
    let ok = hasContent && !boundary && realErrors.length === 0;
    if (label.startsWith('PROT')) ok = ok && redirectedToLogin;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label.padEnd(34)} bodyLen=${bodyText.length} final=${final}${realErrors.length ? (' errs=' + realErrors.join(' | ').slice(0, 80)) : ''}`);
    return ok;
  } catch (e) {
    console.log(`FAIL ${label.padEnd(34)} throw=${String(e.message).slice(0, 80)}`);
    return false;
  } finally {
    await page.close();
  }
}

let pass = 0, fail = 0;

for (const r of publicRoutes) (await probe(r, 'PUB ' + r)) ? pass++ : fail++;
for (const r of protectedRoutes) (await probe(r, 'PROT ' + r)) ? pass++ : fail++;

// rotas dinâmicas: descobrir slug real em /busca
{
  const page = await browser.newPage();
  let slug = null;
  try {
    await page.goto(base + '/busca', { waitUntil: 'domcontentloaded', timeout: 30000 });
    for (let i = 0; i < 25 && !slug; i++) {
      await page.waitForTimeout(1000);
      slug = await page.evaluate(() => {
        const l = Array.from(document.querySelectorAll('a[href^="/r/"]'));
        return l.length ? l[0].getAttribute('href') : null;
      });
    }
    if (slug) {
      const path = slug.split('/r/')[1];
      console.log(`INFO slash dinamico = ${path}`);
      (await probe('/r/' + path, 'DYN /r/' + path)) ? pass++ : fail++;
      (await probe('/m/' + path, 'DYN /m/' + path)) ? pass++ : fail++;
    } else {
      console.log('INFO nenhum /r/ encontrado — pulando rotas dinamicas');
    }
  } catch (e) {
    console.log('INFO falha ao extrair slug: ' + String(e.message).slice(0, 60));
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nRESULTADO: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
