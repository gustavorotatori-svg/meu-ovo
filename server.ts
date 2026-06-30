import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";
import { initializeApp as initAdminApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '10mb' }));

  // Simple in-memory rate limiter
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  function rateLimit(maxRequests: number, windowMs: number) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const key = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
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

  // Simple API key check for AI endpoints
  function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    const validKey = process.env.GEMINI_API_KEY;
    if (!validKey || validKey === 'MY_GEMINI_API_KEY') {
      return next();
    }
    if (apiKey !== validKey) {
      return res.status(401).json({ error: 'Unauthorized — invalid or missing x-api-key header' });
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
    res.json({ status: "ok" });
  });

  /**
   * AI Menu Document Parser
   * Uses Gemini 2.5 Flash Lite to extract categories and products from an uploaded image or PDF
   */
  app.post("/api/ai/parse-menu", async (req, res) => {
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "fileData and mimeType are required" });
    }

    try {
      const filePart = {
        inlineData: {
          mimeType: mimeType,
          data: fileData,
        }
      };

      const promptPart = {
        text: "Analyze the attached menu document (image or PDF document). Extract all main categories and the list of individual products under each category. For each product, extract the name, price containing decimal numeric value (without currency symbol, e.g. 15.90), and categorize it with the corresponding category name. Create category names that are clear and concise. Return the categories and products lists matching the requested schema."
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
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
      res.status(500).json({ 
        error: "Failed to parse menu using AI", 
        details: error?.message || String(error)
      });
    }
  });

  /**
   * AI Menu Generator
   * Generates a full menu with categories and items based on cuisine type
   */
  app.post("/api/ai/generate-menu", async (req, res) => {
    const { cuisine, restaurantName, slogan } = req.body;
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
        model: "gemini-2.5-flash-lite",
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
      res.status(500).json({ error: "Failed to generate menu using AI", details: error?.message || String(error) });
    }
  });

  /**
   * AI Product Generator
   * Generates a single product/plate for a given category
   */
  app.post("/api/ai/generate-product", async (req, res) => {
    const { categoryName, prompt: userPrompt } = req.body;
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
        model: "gemini-2.5-flash-lite",
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
      res.status(500).json({ error: "Failed to generate product using AI", details: error?.message || String(error) });
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
        model: "gemini-2.5-flash-lite",
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
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
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
  app.post("/api/notifications/reengage", async (req, res) => {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: "Firebase Admin not configured — set FIREBASE_SERVICE_ACCOUNT_KEY" });
    }

    const apiKey = req.headers['x-api-key'] as string;
    const validKey = process.env.GEMINI_API_KEY;
    if (validKey && validKey !== 'MY_GEMINI_API_KEY' && apiKey !== validKey) {
      return res.status(401).json({ error: 'Unauthorized — invalid or missing x-api-key header' });
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
      res.status(500).json({ error: 'Failed to send re-engagement notifications', details: error?.message || String(error) });
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
