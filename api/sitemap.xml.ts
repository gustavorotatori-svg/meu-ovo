export default async function handler(req, res) {
  const baseUrl = 'https://meu-ovo-pi.vercel.app';

  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/busca', priority: '0.9', changefreq: 'daily' },
    { loc: '/para-restaurantes', priority: '0.9', changefreq: 'monthly' },
    { loc: '/cadastro-restaurante', priority: '0.8', changefreq: 'monthly' },
    { loc: '/ovos-de-ouro', priority: '0.8', changefreq: 'weekly' },
    { loc: '/impacto-social', priority: '0.7', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
    { loc: '/sobre', priority: '0.6', changefreq: 'monthly' },
    { loc: '/termos', priority: '0.3', changefreq: 'yearly' },
    { loc: '/privacidade', priority: '0.3', changefreq: 'yearly' },
    { loc: '/install-app', priority: '0.4', changefreq: 'monthly' },
  ];

  const urls = staticPages.map(p => `
    <url>
      <loc>${baseUrl}${p.loc}</loc>
      <priority>${p.priority}</priority>
      <changefreq>${p.changefreq}</changefreq>
    </url>`).join('');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`);
}
