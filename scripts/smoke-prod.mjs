// Smoke test pós-deploy: verifica rotas e API críticas do MEU OVO em produção.
// Uso: node scripts/smoke-prod.mjs [https://seu-dominio.com]
const base = (process.argv[2] || process.env.APP_URL || 'https://meu-ovo-pi.vercel.app').replace(/\/$/, '');

const checks = [
  { name: 'GET /api/health (db ok)', url: '/api/health', method: 'GET', expect: (r) => r.status === 200 && r.json?.status === 'ok' && r.json?.db === 'ok' },
  { name: 'GET /', url: '/', method: 'GET', expect: (r) => r.status === 200 && (r.text || '').includes('MEU OVO') },
  { name: 'GET /busca', url: '/busca', method: 'GET', expect: (r) => r.status === 200 },
  { name: 'GET /mais-pedidos', url: '/mais-pedidos', method: 'GET', expect: (r) => r.status === 200 },
  { name: 'GET /cadastro-restaurante', url: '/cadastro-restaurante', method: 'GET', expect: (r) => r.status === 200 },
  { name: 'GET /api/sitemap.xml', url: '/api/sitemap.xml', method: 'GET', expect: (r) => r.status === 200 && (r.text || '').includes('<loc>') },
  { name: 'GET /api/account/export (401 esperado)', url: '/api/account/export', method: 'GET', expect: (r) => r.status === 401 },
  { name: 'GET /api/order/:id/status (id invalido)', url: '/api/order/invalid/status', method: 'GET', expect: (r) => [400, 404, 503].includes(r.status) },
  { name: 'POST /api/order/:id/payment-confirm (401 esperado)', url: '/api/order/invalid/payment-confirm', method: 'POST', expect: (r) => r.status === 401 },
];

let failed = 0;
for (const c of checks) {
  try {
    const res = await fetch(base + c.url, { method: c.method || 'GET', headers: { 'User-Agent': 'meuovo-smoke-test' } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { }
    const ctx = { status: res.status, json, text };
    const ok = c.expect(ctx);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name} [${res.status}]${ok ? '' : ` -> ${text.slice(0, 120)}`}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ${c.name} -> ${err.message}`);
    failed++;
  }
}

console.log(failed === 0 ? '\nSMOKE TEST OK' : `\nSMOKE TEST FALHOU (${failed} de ${checks.length})`);
process.exit(failed === 0 ? 0 : 1);
