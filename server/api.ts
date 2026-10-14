import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

dotenv.config();

import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp as initAdminApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { handleWebhook } from '../src/lib/whatsappWebhook.ts';

// Client connects to a custom Firestore database (see src/lib/firebase.ts)
const FIRESTORE_DATABASE_ID = 'ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b';
function adminDb() {
  return getFirestore(getApps()[0]!, FIRESTORE_DATABASE_ID);
}

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
    initAdminApp({ credential: cert(serviceAccount) });
    firebaseAdminInitialized = true;
    console.log('[Vercel API] Firebase Admin SDK initialized');
  } catch (e) {
    console.warn('[Vercel API] Failed to initialize Firebase Admin SDK:', e);
  }
} else {
  console.log('[Vercel API] FIREBASE_SERVICE_ACCOUNT_KEY not set');
}

// ─── Env Validation ─────────────────────────────────────
const requiredEnv = ['GEMINI_API_KEY', 'APP_URL'];
const optionalEnv = ['API_SECRET_KEY', 'WEBHOOK_SECRET', 'FIREBASE_SERVICE_ACCOUNT_KEY', 'VITE_PLATFORM_PIX_KEY', 'VITE_SENTRY_DSN'];
const missingRequired = requiredEnv.filter(v => !process.env[v]);
const missingOptional = optionalEnv.filter(v => !process.env[v]);
if (missingRequired.length > 0) {
  console.error(`[ENV] CRITICAL: Missing required vars: ${missingRequired.join(', ')}`);
}
if (missingOptional.length > 0) {
  console.warn(`[ENV] Optional vars not set: ${missingOptional.join(', ')}`);
}
if (missingRequired.length === 0) {
  console.log('[ENV] All required variables loaded');
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://www.googleapis.com", "https://js.sentry-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://sentry.io", "https://*.sentry.io"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json({ limit: '1mb' }));

// Simple in-memory rate limiter with periodic cleanup
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, CLEANUP_INTERVAL);
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = rawIp.replace(/^::ffff:/, '');
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    entry.count++;
    next();
  };
}

// API key authentication for AI/costly endpoints
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const validKey = process.env.API_SECRET_KEY || process.env.GEMINI_API_KEY;
  if (!validKey) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Firebase ID token authentication for protected endpoints
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: 'Service unavailable: authentication not configured' });
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as express.Request & { auth?: { uid: string } }).auth = { uid: decoded.uid };
    next();
  } catch (error) {
    console.error('[Auth] Invalid token:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Health check (no rate limit) — verifies real DB connectivity
app.get('/api/health', async (_req, res) => {
  const base = {
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL_ENV || 'development',
    region: process.env.VERCEL_REGION || undefined,
  };
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ ...base, status: 'degraded', db: 'not_initialized' });
  }
  try {
    await adminDb().collection('restaurants').limit(1).get();
    res.json({ ...base, status: 'ok', db: 'ok' });
  } catch (error) {
    console.error('[Health] DB check failed:', error);
    res.status(503).json({ ...base, status: 'degraded', db: 'error' });
  }
});

// Scheduled self-check (Vercel Cron). No rate limit.
// Vercel envia `Authorization: Bearer <CRON_SECRET>` automaticamente.
app.get('/api/cron/health', async (req, res) => {
  const expected = process.env.CRON_SECRET || process.env.API_SECRET_KEY;
  const provided = req.headers.authorization;
  if (!expected || provided !== `Bearer ${expected}`) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ status: 'degraded', db: 'not_initialized' });
    }
    const db = adminDb();
    let ok = true;
    try {
      await db.collection('restaurants').limit(1).get();
    } catch (e) {
      ok = false;
      console.error('[Cron] DB check failed:', e);
    }
    const status = ok ? 'ok' : 'down';
    const now = new Date().toISOString();
    const currentRef = db.collection('system_health').doc('current');
    let previous: string | null = null;
    try {
      previous = ((await currentRef.get()).data() as { status?: string } | undefined)?.status ?? null;
    } catch { /* first run */ }
    await currentRef.set({ status, ts: now });
    if (!ok || previous !== status) {
      await db.collection('system_checks').add({
        status,
        ts: now,
        env: process.env.VERCEL_ENV || 'development',
        region: process.env.VERCEL_REGION || undefined,
      });
    }
    res.json({ ok, status, ts: now });
  } catch (error) {
    console.error('[Cron] Error:', error);
    res.status(500).json({ status: 'error' });
  }
});

// Apply rate limiting to all /api routes
app.use('/api', rateLimit(30, 60000)); // 30 requests per minute per IP

// Input sanitization helpers
const MAX_STRING_LEN = 500;
function sanitizeString(input: unknown, maxLen = MAX_STRING_LEN): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}
// Usado para ids que viram nome de documento/coleção: nao aceita '.', '/'
// nem string vazia, senao o cliente apontaria para outro documento.
function sanitizeId(input: unknown, maxLen = 64): string | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().slice(0, maxLen);
  return v && !v.includes('/') && !v.includes('.') ? v : null;
}
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
function isAllowedMimeType(mt: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mt);
}

// Validate redirect URLs to prevent open redirects
function isSafeRedirect(url: string): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Blog and newsletter are now public (requireApiKey removed to match frontend behavior)

app.post("/api/ai/parse-menu", requireAuth, async (req, res) => {
  const { fileData, mimeType } = req.body;
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: "fileData and mimeType are required" });
  }
  if (!isAllowedMimeType(mimeType)) {
    return res.status(400).json({ error: "Invalid mimeType" });
  }
  try {
    const filePart = { inlineData: { mimeType, data: sanitizeString(fileData, 2000000) } };
    const promptPart = { text: "Analyze the attached menu document (image or PDF document). Extract all main categories and the list of individual products under each category. For each product, extract the name, price containing decimal numeric value (without currency symbol, e.g. 15.90), and categorize it with the corresponding category name. Create category names that are clear and concise. Return the categories and products lists matching the requested schema." };
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: { parts: [filePart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of distinct menu categories found" },
            products: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING, description: "Name of the item" }, price: { type: Type.NUMBER, description: "Floating point price of the item" }, category: { type: Type.STRING, description: "Category name this product belongs to" } }, required: ["name", "price", "category"] }, description: "List of products extracted" }
          },
          required: ["categories", "products"]
        }
      }
    });
    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);
    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("AI Menu parsing error:", error?.message || error);
    res.status(500).json({ error: "AI parsing failed" });
  }
});

app.post("/api/ai/generate-menu", requireAuth, async (req, res) => {
  const cuisine = sanitizeString(req.body.cuisine);
  const restaurantName = sanitizeString(req.body.restaurantName);
  const slogan = sanitizeString(req.body.slogan, 200);
  if (!cuisine || !restaurantName) {
    return res.status(400).json({ error: "cuisine and restaurantName are required" });
  }
  try {
    const prompt = `Você é um especialista em gastronomia e consultor de restaurantes. Gere um cardápio digital profissional para um restaurante de culinária "${cuisine}" chamado "${restaurantName}"${slogan ? ` com o slogan "${slogan}"` : ''}.
O cardápio deve conter 3 a 4 categorias lógicas (ex: Entradas, Pratos Principais, Bebidas, Sobremesas).
Cada categoria deve ter de 3 a 5 produtos realistas e atraentes.
As descrições devem ser curtas e vender bem o prato.
Os preços devem ser em Reais (BRL), condizentes com o tipo de culinária.
O tempo de preparo deve ser em minutos.

Retorne o resultado estritamente no formato JSON fornecido no esquema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        estimatedPrepTime: { type: Type.NUMBER }
                      },
                      required: ["name", "description", "price", "estimatedPrepTime"]
                    }
                  }
                },
                required: ["name", "items"]
              }
            }
          },
          required: ["categories"]
        }
      }
    });
    const result = JSON.parse(response.text || "{}");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("AI Menu generation error:", error?.message || error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/ai/generate-product", requireAuth, async (req, res) => {
  const categoryName = sanitizeString(req.body.categoryName);
  const userPrompt = sanitizeString(req.body.prompt, 300);
  if (!categoryName) {
    return res.status(400).json({ error: "categoryName is required" });
  }
  try {
    const systemInstruction = `Você é um chef de cozinha profissional e criativo. Gere um novo produto inovador e realista para a categoria de cardápio "${categoryName}" de um estabelecimento gourmet.
${userPrompt ? `O usuário sugeriu como base: "${userPrompt}"` : 'Crie um prato especial delicioso, premium e popular que se destaque no cardápio.'}
O preço deve ser um valor numérico realista em Reais (BRL), sem o símbolo R$, exemplo: 35.90.
O tempo de preparo deve ser um número inteiro em minutos correspondente à preparação realista do item, exemplo: 15.
A descrição deve ser muito apetitosa, curta e atraente para o cliente final.
Selecione ou crie também uma URL de imagem pública real (Unsplash ou Pexels) condizente com este prato específico e categoria. Ex: Se for uma sobremesa, que seja uma foto de sobremesa do Unsplash.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Gere um prato/produto para o cardápio.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            estimatedPrepTime: { type: Type.NUMBER },
            imageUrl: { type: Type.STRING }
          },
          required: ["name", "description", "price", "estimatedPrepTime", "imageUrl"]
        }
      }
    });
    const result = JSON.parse(response.text || "{}");
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("AI Product generation error:", error?.message || error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.get("/api/blog/news", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Resuma as 3 últimas notícias de cada um destes sites para um blog de foodservice. Foque no que é relevante para donos de restaurantes. Extraia títulos, um breve resumo, links (estimados se não puder ler) e tente descrever uma imagem que acompanharia a notícia.\n\nSites:\n1. https://sp.abrasel.com.br/noticias/\n2. https://anrbrasil.org.br/noticias/\n3. https://mercadoeconsumo.com.br/category/foodservice/",
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weeklySummary: { type: Type.STRING },
            news: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, summary: { type: Type.STRING }, url: { type: Type.STRING }, source: { type: Type.STRING }, imageUrl: { type: Type.STRING } } } }
          }
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// CRIAÇÃO DE PEDIDO AUTORITATIVA
// ═══════════════════════════════════════════════════════════════════════
// O pedido NÃO pode ser escrito direto pelo cliente: se o `total` e os
// `unitPrice` viessem do navegador, um pedido de total 0 seria aceito e o
// restaurante veria isso no painel e no WhatsApp. Aqui o servidor:
//   - lê o preço real de cada produto no catálogo (ignora o que o cliente mandou)
//   - confere o cupom contra a coleção coupons
//   - confere e debita o saldo de fidelidade
//   - recalcula o total e grava com o Admin SDK
//
// Guest checkout continua funcionando (o app não exige login), porque preço
// autoritativo é outra coisa que autenticação.

type IncomingItem = {
  productId?: unknown;
  quantity?: unknown;
  selectedOptions?: unknown;
};

function normalizePhone(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\D/g, '') : '';
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// Rate limit simples por IP (o endpoint é público por causa do guest checkout).
const orderHits = new Map<string, number[]>();
const ORDER_WINDOW_MS = 60_000;
const ORDER_MAX_PER_WINDOW = 12;

function orderRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (orderHits.get(ip) || []).filter((t) => now - t < ORDER_WINDOW_MS);
  hits.push(now);
  orderHits.set(ip, hits);
  if (orderHits.size > 5000) orderHits.clear(); // evita crescimento sem limite
  return hits.length > ORDER_MAX_PER_WINDOW;
}

app.post('/api/orders', async (req, res) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (orderRateLimited(ip)) {
    return res.status(429).json({ error: 'too_many_orders', message: 'Muitos pedidos seguidos. Tente de novo em instantes.' });
  }

  try {
    const body = req.body || {};
    const restaurantIdClean = sanitizeId(body.restaurantId, 64);
    const customerName = sanitizeString(body.customerName, 100);
    const customerPhone = normalizePhone(body.customerPhone);
    const type = ['delivery', 'pickup', 'table', 'dine-in'].includes(String(body.type)) ? String(body.type) : 'pickup';
    const paymentMethod = ['pix', 'cash', 'card-on-delivery', 'on-site', 'credit', 'debit', 'voucher']
      .includes(String(body.paymentMethod)) ? String(body.paymentMethod) : 'pix';

    if (!restaurantIdClean) return res.status(400).json({ error: 'restaurantId invalido' });
    if (!customerName) return res.status(400).json({ error: 'nome obrigatorio' });
    if (customerPhone.length < 8 && customerPhone !== 'N/A') {
      return res.status(400).json({ error: 'telefone invalido' });
    }

    const rawItems = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
    if (rawItems.length === 0 || rawItems.length > 40) {
      return res.status(400).json({ error: 'carrinho invalido' });
    }

    const db = adminDb();

    // ── Restaurante ────────────────────────────────────────────────────────
    const restSnap = await db.collection('restaurants').doc(restaurantIdClean).get();
    if (!restSnap.exists) return res.status(404).json({ error: 'restaurante nao encontrado' });
    const restaurant = restSnap.data() || {};

    // ── Preço real: busca cada produto no catálogo ─────────────────────────
    const ids = [...new Set(rawItems
      .map((i) => sanitizeId(i.productId, 64))
      .filter((x): x is string => !!x))];
    if (ids.length !== rawItems.length) {
      return res.status(400).json({ error: 'item invalido' });
    }

    const prodSnaps = await Promise.all(ids.map((id) => db.collection('products').doc(id).get()));
    const priceById = new Map<string, number>();
    for (let i = 0; i < ids.length; i++) {
      const s = prodSnaps[i];
      if (!s.exists) return res.status(400).json({ error: 'produto inexistente' });
      const p = s.data() || {};
      if (p.restaurantId !== restaurantIdClean) {
        return res.status(400).json({ error: 'produto de outro restaurante' });
      }
      if (p.isActive === false || p.isAvailable === false) {
        return res.status(400).json({ error: 'produto indisponivel' });
      }
      // Mesmo criterio do client: promocao tem precedencia.
      const unit = p.onPromotion && p.promotionPrice ? toNumber(p.promotionPrice) : toNumber(p.price);
      if (unit <= 0) return res.status(400).json({ error: 'produto sem preco valido' });
      priceById.set(ids[i], unit);
    }

    // ── Monta os itens com preço do servidor ───────────────────────────────
    const items: Record<string, unknown>[] = [];
    let subtotal = 0;
    for (const raw of rawItems) {
      const pid = sanitizeId(raw.productId, 64)!;
      const qty = Math.floor(toNumber(raw.quantity));
      if (qty < 1 || qty > 99) return res.status(400).json({ error: 'quantidade invalida' });
      const unit = priceById.get(pid)!;
      const total = unit * qty;
      subtotal += total;
      const prod = (prodSnaps[ids.indexOf(pid)].data() || {}) as Record<string, unknown>;
      const options = Array.isArray(raw.selectedOptions)
        ? (raw.selectedOptions as Record<string, unknown>[])
            .slice(0, 20)
            .map((o) => ({
              optionId: sanitizeId(o.optionId, 64) || '',
              name: sanitizeString(o.name, 80),
              price: toNumber(o.price),
            }))
        : [];
      items.push({
        productId: pid,
        productName: String(prod.name || 'Item'),
        quantity: qty,
        unitPrice: unit,
        additionals: options,
        observations: sanitizeString((raw as Record<string, unknown>).observations, 200),
        total,
      });
    }
    if (subtotal <= 0) return res.status(400).json({ error: 'carrinho zerado' });

    // ── Cupom: confere na coleção, nao confia no cliente ───────────────────
    let couponDiscount = 0;
    let appliedCoupon: Record<string, unknown> | null = null;
    const couponCode = sanitizeString(body.couponCode, 20).toUpperCase();
    if (couponCode) {
      const cSnap = await db.collection('coupons').where('code', '==', couponCode).limit(1).get();
      if (cSnap.empty) return res.status(400).json({ error: 'cupom nao encontrado' });
      const c = cSnap.docs[0].data() as Record<string, unknown>;
      if (c.restaurantId !== restaurantIdClean || c.isActive !== true) {
        return res.status(400).json({ error: 'cupom invalido' });
      }
      const used = toNumber(c.usageCount);
      const limit = c.usageLimit == null ? Infinity : toNumber(c.usageLimit);
      if (used >= limit) return res.status(400).json({ error: 'cupom esgotado' });
      const minOrder = toNumber(c.minOrderValue);
      if (subtotal < minOrder) return res.status(400).json({ error: 'cupom exige valor minimo' });

      couponDiscount = c.type === 'percent' ? (subtotal * toNumber(c.value)) / 100 : toNumber(c.value);
      if (couponDiscount > subtotal) couponDiscount = subtotal;
      if (couponDiscount < 0) couponDiscount = 0;
      appliedCoupon = { id: cSnap.docs[0].id, code: couponCode, discount: couponDiscount };
    }

    // ── Fidelidade: confere saldo e debita ────────────────────────────────
    let rewardDiscount = 0;
    let appliedReward: Record<string, unknown> | null = null;
    const rewardId = sanitizeId(body.rewardId, 64);
    const customerId = sanitizeId(body.customerId, 64);
    if (rewardId) {
      const rulesSnap = await db.collection('loyalty_rules').where('restaurantId', '==', restaurantIdClean).get();
      const rule = rulesSnap.docs.map((d) => d.data() as Record<string, unknown>)
        .find((r) => r.id === rewardId || r.description === rewardId);
      if (!rule) return res.status(400).json({ error: 'recompensa invalida' });

const required = toNumber(rule.pointsRequired);

      // O app identifica o perfil por customerId (logado) ou customerPhone.
      const loyaltyCol = db.collection('loyalty_profiles');
      let profSnap = customerId
        ? await loyaltyCol.where('restaurantId', '==', restaurantIdClean).where('customerId', '==', customerId).limit(1).get()
        : null;
      if ((!profSnap || profSnap.empty) && customerPhone && customerPhone !== 'N/A') {
        profSnap = await loyaltyCol.where('restaurantId', '==', restaurantIdClean).where('customerPhone', '==', customerPhone).limit(1).get();
      }

      let balance = profSnap && !profSnap.empty
        ? toNumber((profSnap.docs[0].data() as Record<string, unknown>).pointsBalance)
        : 0;
      if (balance < required) {
        return res.status(400).json({ error: 'pontos insuficientes', balance, required });
      }

      if (rule.type === 'discount_percent') {
        rewardDiscount = (subtotal * toNumber(rule.value)) / 100;
      } else if (rule.type === 'free_product') {
        const pSnap = await db.collection('products').doc(sanitizeId(rule.value, 64)!).get();
        if (!pSnap.exists) return res.status(400).json({ error: 'recompensa invalida' });
        rewardDiscount = toNumber((pSnap.data() as Record<string, unknown>).price);
        // Da o produto de graça zerando o preco do item.
        for (const it of items) {
          if (it.productId === sanitizeId(rule.value, 64)) it.unitPrice = 0;
        }
        const newSubtotal = items.reduce((s, it) => s + (it.unitPrice as number) * (it.quantity as number), 0);
        subtotal = newSubtotal;
      }
      if (rewardDiscount > subtotal) rewardDiscount = subtotal;
      if (rewardDiscount < 0) rewardDiscount = 0;
      appliedReward = { id: rewardId, pointsRequired: required, pointsDebited: required };

      // Debita saldo (Admin SDK: regra do cliente nao pode ser usada aqui).
      if (profSnap && !profSnap.empty) {
        const profRef = profSnap.docs[0].ref;
        await profRef.set(
          {
            pointsBalance: balance - required,
            history: FieldValue.arrayUnion({
              type: 'redeem',
              points: -required,
              description: `Resgate: ${String(rule.description || '')}`,
              createdAt: new Date().toISOString(),
            }),
          },
          { merge: true }
        );
      }
    }

    // ── Taxas e total ─────────────────────────────────────────────────────
    const deliveryFee = toNumber(body.deliveryFee);
    const tip = toNumber(body.tip);
    const caixinha = toNumber(body.meuOvoCaixinha);
    const donationAmount = toNumber(body.donationAmount);

    const total = Math.max(0, subtotal - rewardDiscount - couponDiscount) + deliveryFee + tip + caixinha + donationAmount;

    // ── Grava com Admin SDK (regras do cliente nao se aplicam) ─────────────
    const uid = (req as express.Request & { auth?: { uid: string } }).auth?.uid || null;
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      restaurantId: restaurantIdClean,
      userId: uid || undefined,
      customerName,
      customerPhone: customerPhone || 'N/A',
      type,
      address: type === 'delivery' ? sanitizeString(body.deliveryAddress, 200) : null,
      neighborhood: type === 'delivery' ? sanitizeString(body.neighborhood, 80) : null,
      tableNumber: body.tableNumber != null ? String(body.tableNumber).slice(0, 20) : null,
      items,
      subtotal,
      deliveryFee,
      tip,
      meuOvoCaixinha: caixinha,
      donationAmount,
      rewardDiscount,
      couponDiscount,
      discountAmount: rewardDiscount + couponDiscount,
      appliedReward,
      appliedCoupon,
      couponCode: appliedCoupon ? couponCode : undefined,
      total,
      status: 'received',
      paymentMethod,
      paymentStatus: 'pending',
      observations: sanitizeString(body.observations, 300),
      createdAt: new Date().toISOString(),
      createdBy: 'api',
    });

    // Incrementa uso do cupom (contador do servidor, nao do cliente).
    if (appliedCoupon) {
      await db.collection('coupons').doc(appliedCoupon.id as string).set(
        { usageCount: FieldValue.increment(1) },
        { merge: true }
      );
    }

    res.status(201).json({
      id: orderRef.id,
      total,
      subtotal,
      rewardDiscount,
      couponDiscount,
      deliveryFee,
    });
  } catch (error: any) {
    console.error('[Orders] Error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post("/api/newsletter/subscribe", async (req, res) => {
  const email = sanitizeString(req.body.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  try {
    if (firebaseAdminInitialized) {
      const db = adminDb();
      const subRef = db.collection('newsletter_subscribers').doc(email.toLowerCase());
      const existing = await subRef.get();
      if (!existing.exists) {
        await subRef.set({
          email: email.toLowerCase(),
          subscribedAt: new Date().toISOString(),
        });
      }
    }
    res.json({ success: true, message: "Subscribed successfully!" });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ error: "Subscription failed" });
  }
});

/**
 * LGPD — Export user data (access/portability rights)
 */
app.get("/api/account/export", requireAuth, async (req, res) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: "Service unavailable" });
  }
  try {
    const uid = (req as express.Request & { auth?: { uid: string } }).auth!.uid;
    const db = adminDb();

    const userDoc = await db.collection('users').doc(uid).get();

    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', uid)
      .limit(500)
      .get();
    const orders = ordersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const loyaltySnapshot = await db.collection('loyalty_profiles')
      .where('customerId', '==', uid)
      .limit(100)
      .get();
    const loyalty = loyaltySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const data = {
      exportedAt: new Date().toISOString(),
      profile: userDoc.exists ? userDoc.data() : null,
      orders,
      loyalty,
    };
    res.setHeader('Content-Disposition', 'attachment; filename="meu-ovo-dados.json"');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(data);
  } catch (error: any) {
    console.error("[Account Export] Error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

/**
 * LGPD — Delete account data (erasure right). Requires fresh ID token.
 * Uses the Admin SDK so it can wipe documents across collections that
 * client rules intentionally lock (orders by customer, loyalty profiles, etc).
 */
app.delete("/api/account/data", requireAuth, async (req, res) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: "Service unavailable" });
  }
  try {
    const uid = (req as express.Request & { auth?: { uid: string } }).auth!.uid;
    const db = adminDb();

    const userRef = db.collection('users').doc(uid);

    const batch = db.batch();

    batch.delete(userRef);

    const deleteWhere = async (collectionName: string, field: string, limit = 500) => {
      let cursor: any = null;
      for (;;) {
        let q = db.collection(collectionName).where(field, '==', uid).limit(limit);
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach(d => batch.delete(d.ref));
        cursor = snap.docs[snap.docs.length - 1];
      }
    };

    await deleteWhere('orders', 'userId');
    await deleteWhere('loyalty_profiles', 'customerId');
    await deleteWhere('dish_ratings', 'userId');
    await deleteWhere('ovos_de_ouro_votes', 'userId');

    // Singleton per-user collections (document ID == uid)
    ['platform_loyalty', 'streaks', 'achievements'].forEach((collectionName) => {
      batch.delete(db.collection(collectionName).doc(uid));
    });

    await batch.commit();

    // Delete the Firebase Auth account (last step: if this fails, docs already gone)
    try {
      await getAuth().deleteUser(uid);
    } catch (authErr: any) {
      if (!authErr?.errorInfo?.code?.includes('auth/user-not-found')) {
        console.error("[Account Delete] deleteUser error:", authErr);
      }
    }

    res.json({ success: true, message: "Account data deleted" });
  } catch (error: any) {
    console.error("[Account Delete] Error:", error);
    res.status(500).json({ error: "Failed to delete account data" });
  }
});

/**
 * WhatsApp AI Webhook — requires x-webhook-secret header or Evolution API signature
 */
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ success: false, message: "Service unavailable" });
    }
    // Verify webhook authenticity — WEBHOOK_SECRET is required
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[WhatsApp Webhook] WEBHOOK_SECRET not configured');
      return res.status(500).json({ success: false, message: "Server not configured" });
    }
    const authHeader = req.headers['x-webhook-secret'] as string || req.headers['x-hub-signature-256'] as string || '';
    if (authHeader !== webhookSecret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const db = adminDb();
    const result = await handleWebhook(ai, db, req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

/**
 * Public tracking status for an order (PII-safe: no name, phone, or address).
 * This is what keeps the WhatsApp status link working for guest checkouts,
 * which the Firestore web rules intentionally deny (guests can't read orders back).
 */
app.get("/api/order/:id/status", async (req, res) => {
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: "Service unavailable" });
    }
    const { id } = req.params as { id: string };
    if (!id || id.length < 8 || id.length > 64) {
      return res.status(400).json({ error: "invalid_order_id" });
    }
    const db = adminDb();
    const orderDoc = await db.collection('orders').doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "order_not_found" });
    }
    const o = orderDoc.data();
    res.json({
      id,
      status: o?.status || 'received',
      createdAt: o?.createdAt || null,
      updatedAt: o?.updatedAt || null,
      type: (o?.type === 'delivery' || o?.type === 'pickup') ? o.type : 'pickup',
      paymentMethod: typeof o?.paymentMethod === 'string' ? o.paymentMethod : 'pix',
      total: typeof o?.total === 'number' ? o.total : 0,
      items: Array.isArray(o?.items)
        ? o!.items.map((item: any) => ({
            productName: item?.productName || item?.name || '',
            quantity: typeof item?.quantity === 'number' ? item.quantity : 0,
            unitPrice: typeof item?.unitPrice === 'number' ? item.unitPrice : 0,
            additionals: Array.isArray(item?.additionals)
              ? item.additionals.filter((a: any) => a).map((a: any) => typeof a === 'string' ? a : (a.name || ''))
              : [],
          }))
        : [],
    });
  } catch (error: any) {
    console.error("[Order Status] Error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * Customer confirms they paid (PIX/cash/online). Customers are not allowed to
 * set paymentStatus via Firestore rules, so this runs with the Admin SDK and
 * only flips 'pending' -> 'awaiting_confirmation'. The restaurant must then
 * approve and the admin flow sets it to 'paid'.
 */
app.post("/api/order/:id/payment-confirm", requireAuth, async (req, res) => {
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: "Service unavailable" });
    }
    const { id } = req.params as { id: string };
    if (!id || id.length < 8 || id.length > 64) {
      return res.status(400).json({ error: "invalid_order_id" });
    }
    const uid = (req as express.Request & { auth?: { uid: string } }).auth!.uid;
    const db = adminDb();
    const orderRef = db.collection('orders').doc(id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "order_not_found" });
    }
    const data = orderDoc.data() || {};
    if (data.userId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (data.paymentStatus === 'paid' || data.paymentStatus === 'awaiting_confirmation') {
      return res.json({ ok: true, paymentStatus: data.paymentStatus });
    }
    await orderRef.update({
      paymentStatus: 'awaiting_confirmation',
      paymentConfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true, paymentStatus: 'awaiting_confirmation' });
  } catch (error: any) {
    console.error("[Payment Confirm] Error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
