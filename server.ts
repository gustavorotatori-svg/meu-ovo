import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { handleWebhook } from './src/lib/whatsappWebhook';

dotenv.config();

// Initialize Firebase Admin SDK for push notifications
let firebaseAdminInitialized = false;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
    initAdminApp({ credential: cert(serviceAccount) });
    firebaseAdminInitialized = true;
    console.log('Firebase Admin SDK initialized for push notifications');
  } catch (e) {
    console.warn('Failed to initialize Firebase Admin SDK:', e);
  }
} else {
  console.log('FIREBASE_SERVICE_ACCOUNT_KEY not set — push notifications disabled');
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  }));
  app.use(express.json({ limit: '1mb' }));

  // Simple in-memory rate limiter with periodic cleanup
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
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

  app.use('/api', rateLimit(30, 60000));

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

  // Initialize Gemini
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        gemini: !!process.env.GEMINI_API_KEY,
        firebase: firebaseAdminInitialized,
        pix: !!process.env.VITE_PLATFORM_PIX_KEY,
        sentry: !!process.env.VITE_SENTRY_DSN,
        webhook: !!process.env.WEBHOOK_SECRET,
      },
    });
  });

  // Protect costly endpoints with API key auth
  app.use('/api/blog', requireApiKey);
  app.use('/api/newsletter', requireApiKey);

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

  /**
   * AI Menu Document Parser
   * Uses Gemini 2.5 Flash Lite to extract categories and products from an uploaded image or PDF
   */
  app.post("/api/ai/parse-menu", async (req, res) => {
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "fileData and mimeType are required" });
    }
    if (!isAllowedMimeType(mimeType)) {
      return res.status(400).json({ error: "Invalid mimeType" });
    }

    try {
      const filePart = {
        inlineData: {
          mimeType: mimeType,
          data: sanitizeString(fileData, 2000000),
        }
      };

      const promptPart = {
        text: "Analyze the attached menu document (image or PDF document). Extract all main categories and the list of individual products under each category. For each product, extract the name, price containing decimal numeric value (without currency symbol, e.g. 15.90), and categorize it with the corresponding category name. Create category names that are clear and concise. Return the categories and products lists matching the requested schema."
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: { parts: [filePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of distinct menu categories found"
              },
              products: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the item" },
                    price: { type: Type.NUMBER, description: "Floating point price of the item" },
                    category: { type: Type.STRING, description: "Category name this product belongs to" }
                  },
                  required: ["name", "price", "category"]
                },
                description: "List of products extracted"
              }
            },
            required: ["categories", "products"]
          }
        }
      });

      const resultText = response.text || "{}";
      const parsedData = JSON.parse(resultText);

      res.json({
        success: true,
        data: parsedData
      });
    } catch (error: any) {
      console.error("AI Menu parsing error:", error);
      res.status(500).json({ error: "Failed to parse menu using AI" });
    }
  });

  /**
   * AI Menu Generator
   * Generates a full menu with categories and items based on cuisine type
   */
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
      console.error("AI Menu generation error:", error);
      res.status(500).json({ error: "Failed to generate menu using AI" });
    }
  });

  /**
   * AI Product Generator
   * Generates a single product/plate for a given category
   */
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
      console.error("AI Product generation error:", error);
      res.status(500).json({ error: "Failed to generate product using AI" });
    }
  });

  /**
   * Blog News Aggregation API
   * Fetches news from provided URLs and summarizes them using Gemini
   */
  app.get("/api/blog/news", async (req, res) => {
    try {
      const urls = [
        "https://sp.abrasel.com.br/noticias/",
        "https://anrbrasil.org.br/noticias/",
        "https://mercadoeconsumo.com.br/category/foodservice/"
      ];

      // Using Gemini with URL context is the best approach here as per SKILL.md
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
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    url: { type: Type.STRING },
                    source: { type: Type.STRING },
                    imageUrl: { type: Type.STRING }
                  }
                }
              }
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

  /**
   * Newsletter subscription simulation
   */
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const email = sanitizeString(req.body.email, 254);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Gere um conteúdo de boas-vindas para o newsletter do 'Meu Ovo' para o email ${email}. 
        O tom deve ser empreendedor, direto e parceiro. 
        Inclua um resumo rápido de uma notícia quente do setor de restaurantes (Abrasel ou ANR).`
      });

      res.json({ 
        success: true, 
        message: "Subscribed successfully!",
        preview: response.text 
      });
    } catch (error) {
      console.error("Newsletter error:", error);
      res.status(500).json({ error: "Subscription failed" });
    }
  });

  /**
   * Re-engagement Push Notification
   * Sends push notifications to users inactive for 7+ days
   * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var + FCM tokens registered on user docs
   * Intended to be called by an external cron service (e.g., cron-job.org) once daily
   */
  app.post("/api/notifications/reengage", requireApiKey, async (req, res) => {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: "Firebase Admin not configured — set FIREBASE_SERVICE_ACCOUNT_KEY" });
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const db = getFirestore();
      const snapshot = await db.collection('users')
        .where('fcmToken', '!=', null)
        .where('lastActiveAt', '<', sevenDaysAgo.toISOString())
        .limit(500)
        .get();

      const messaging = getMessaging();
      let sent = 0;
      let failed = 0;

      const promises = snapshot.docs.map(async (userDoc) => {
        const data = userDoc.data();
        const token = data.fcmToken;
        if (!token) return;

        try {
          await messaging.send({
            token,
            notification: {
              title: 'Saudades! 🍳',
              body: 'Já passou mais de uma semana! Que tal pedir sua comida favorita hoje?',
            },
            webpush: {
              fcmOptions: { link: process.env.APP_URL || 'https://meu-ovo-pi.vercel.app/busca' },
            },
          });
          sent++;
        } catch {
          // Token might be invalid — could clean up here
          failed++;
        }
      });

      await Promise.allSettled(promises);

      res.json({
        success: true,
        notified: sent,
        failed,
        totalQueried: snapshot.docs.length,
      });
    } catch (error: any) {
      console.error('Re-engagement push error:', error);
      res.status(500).json({ error: 'Failed to send re-engagement notifications' });
    }
  });

  /**
   * WhatsApp AI Webhook
   * Receives incoming WhatsApp messages from provider (Evolution API, Twilio, etc.)
   * Processes with Gemini AI and sends response back
   */
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Verify webhook authenticity
      const webhookSecret = process.env.WEBHOOK_SECRET;
      const authHeader = (req.headers['x-webhook-secret'] as string) || (req.headers['x-hub-signature-256'] as string) || '';
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
