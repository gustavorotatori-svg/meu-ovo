import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Client connects to a custom Firestore database (see src/lib/firebase.ts)
const FIRESTORE_DATABASE_ID = 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b';

export default async function handler(req, res) {
  const baseUrl = 'https://meu-ovo-pi.vercel.app';

  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/busca', priority: '0.9', changefreq: 'daily' },
    { loc: '/mais-pedidos', priority: '0.8', changefreq: 'daily' },
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

  let restaurantPages: { loc: string; priority: string; changefreq: string }[] = [];
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
      const adminApp = initAdminApp({
        credential: cert(serviceAccount),
      });
      const db = getFirestore(adminApp, FIRESTORE_DATABASE_ID);
      const snapshot = await db.collection('restaurants')
        .where('isActive', '==', true)
        .select('slug')
        .limit(2000)
        .get();
      restaurantPages = snapshot.docs
        .map(d => d.data()?.slug as string | undefined)
        .filter((slug): slug is string => !!slug && /^[a-z0-9-]+$/.test(slug))
        .map(slug => ({ loc: `/r/${slug}`, priority: '0.7', changefreq: 'weekly' }));
    } catch (e) {
      console.error('[Sitemap] Failed to load restaurants:', e);
    }
  }

  const allPages = [...staticPages, ...restaurantPages];

  const urls = allPages.map(p => `
    <url>
      <loc>${baseUrl}${p.loc}</loc>
      <priority>${p.priority}</priority>
      <changefreq>${p.changefreq}</changefreq>
    </url>`).join('');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`);
}
