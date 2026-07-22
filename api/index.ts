import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

dotenv.config();

import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { handleWebhook } from '../src/lib/whatsappWebhook';

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
  methods: ['GET', 'POST'],
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

// Apply rate limiting to all /api routes
app.use('/api', rateLimit(30, 60000)); // 30 requests per minute per IP

// Input sanitization helpers
const MAX_STRING_LEN = 500;
function sanitizeString(input: unknown, maxLen = MAX_STRING_LEN): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Blog and newsletter are now public (requireApiKey removed to match frontend behavior)

app.post("/api/ai/parse-menu", async (req, res) => {
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

app.post("/api/ai/generate-menu", async (req, res) => {
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

app.post("/api/ai/generate-product", async (req, res) => {
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

app.post("/api/newsletter/subscribe", async (req, res) => {
  const email = sanitizeString(req.body.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Gere um conteúdo de boas-vindas para o newsletter do 'Meu Ovo' para o email ${email}. O tom deve ser empreendedor, direto e parceiro. Inclua um resumo rápido de uma notícia quente do setor de restaurantes (Abrasel ou ANR).`
    });
    res.json({ success: true, message: "Subscribed successfully!", preview: response.text });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ error: "Subscription failed" });
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
    // Verify webhook authenticity via shared secret or provider signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const authHeader = req.headers['x-webhook-secret'] as string || req.headers['x-hub-signature-256'] as string || '';
    if (webhookSecret && authHeader !== webhookSecret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const db = getFirestore();
    const result = await handleWebhook(ai, db, req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
