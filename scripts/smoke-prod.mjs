// Smoke test pós-deploy: verifica rotas e API críticas do MEU OVO em produção.
// Uso: node scripts/smoke-prod.mjs [https://seu-dominio.com]
const base = (process.argv[2] || process.env.APP_URL || 'https://meu-ovo-pi.vercel.app').replace(/\/$/, '');

const checks = [
  { name: 'GET /api/health', url: '/api/health', expect: (r) => r.status === 200 && r.json?.status === 'ok' },
  { name: 'GET /', url: '/', expect: (r) => r.status === 200 && (r.text || '').includes('MEU OVO') },
  { name: 'GET /busca', url: '/busca', expect: (r) => r.status === 200 },
  { name: 'GET /mais-pedidos', url: '/mais-pedidos', expect: (r) => r.status === 200 },
  { name: 'GET /cadastro-restaurante', url: '/cadastro-restaurante', expect: (r) => r.status === 200 },
  { name: 'GET /api/sitemap.xml', url: '/api/sitemap.xml', expect: (r) => r.status === 200 && (r.text || '').includes('<loc>') },
  { name: 'GET /api/account/export (401 esperado)', url: '/api/account/export', expect: (r) => r.status === 401 },
  { name: 'GET /api/order/:id/status (id invalido)', url: '/api/order/invalid/status', expect: (r) => [400, 404, 503].includes(r.status) },
];

let failed = 0;
for (const c of checks) {
  try {
    const res = await fetch(base + c.url, { headers: { 'User-Agent': 'meuovo-smoke-test' } });
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
