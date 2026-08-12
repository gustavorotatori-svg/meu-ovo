import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const env = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY="([^"]*)"/);
if (!m) { console.error('[backup] FIREBASE_SERVICE_ACCOUNT_KEY not found in .env'); process.exit(1); }
const serviceAccount = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore(getApps()[0], 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b');

const COLLECTIONS = [
  'users',
  'restaurants',
  'orders',
  'categories',
  'products',
  'coupons',
  'loyalty_profiles',
  'tables',
  'whatsapp_conversations',
  'dish_ratings',
  'ovos_de_ouro_votes',
  'singletons',
  'cashier_sessions',
  'labels',
  'flash_deals',
  'customer_ratings',
  'deliverySettings',
  'blog_posts',
];

async function exportCollection(name) {
  const docs = [];
  let last = null;
  // Paginate by document id to avoid snapshot size limits.
  while (true) {
    let query = db.collection(name).orderBy('__name__').limit(1000);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      docs.push({ id: d.id, data: d.data() });
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 1000) break;
  }
  return docs;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(projectRoot, 'backups', stamp);
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
const summary = {};
for (const coll of COLLECTIONS) {
  try {
    const docs = await exportCollection(coll);
    if (docs.length > 0) {
      fs.writeFileSync(path.join(outDir, `${coll}.json`), JSON.stringify(docs, null, 2), 'utf8');
      summary[coll] = docs.length;
      total += docs.length;
      console.log(`[backup] ${coll}: ${docs.length} docs`);
    } else {
      console.log(`[backup] ${coll}: vazio (ignorado)`);
    }
  } catch (err) {
    console.log(`[backup] ${coll}: falha (${err.message})`);
  }
}

const manifest = { timestamp: new Date().toISOString(), database: 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b', total, collections: summary };
fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`[backup] CONCLUIDO: ${total} docs em ${outDir}`);
console.log(`[backup] Restaurar com: firebase-admin + collection(NAME).doc(id).set(data)`);
