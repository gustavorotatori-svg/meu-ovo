/* AUTO-GENERATED from server/api.ts - do not edit directly */

// server/api.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp as initAdminApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// src/lib/whatsappAI.ts
function buildMenuContext(products) {
  const grouped = {};
  for (const p of products) {
    if (!grouped[p.categoryName]) grouped[p.categoryName] = [];
    grouped[p.categoryName].push(p);
  }
  let ctx = "## CARD\xC1PIO\n";
  for (const [cat, items] of Object.entries(grouped)) {
    ctx += `
### ${cat}
`;
    for (const item of items) {
      ctx += `- ${item.name} \u2014 R$ ${item.price.toFixed(2)}`;
      if (item.description) ctx += `: ${item.description}`;
      ctx += "\n";
    }
  }
  return ctx;
}
function buildSystemPrompt(restaurantName, menuContext) {
  return `Voc\xEA \xE9 a atendente virtual do restaurante "${restaurantName}", seu nome \xE9 Dona Ova.

Voc\xEA \xE9 simp\xE1tica, \xE1gil e conhece todo o card\xE1pio. Seu objetivo \xE9 atender o cliente, tirar d\xFAvidas sobre os produtos e anotar o pedido.

${menuContext}

## REGRAS
1. Responda em portugu\xEAs, de forma natural e amig\xE1vel, como uma atendente de restaurante.
2. Ajude o cliente a escolher itens do card\xE1pio \u2014 sugira combina\xE7\xF5es, destaque os mais populares.
3. Quando o cliente pedir um ou mais itens, REPITA a lista para confirmar e pergunte se quer mais algo.
4. Quando o cliente CONFIRMAR que o pedido est\xE1 completo (responder "sim", "\xE9 isso", "pode fechar", "s\xF3 isso", etc.), responda NORMALMENTE e NO FINAL da mensagem adicione exatamente: ~~~
order
{"items": [{"productName": "...", "quantity": 1}], "customerName": "..."}
~~~
5. Se o cliente pedir algo que N\xC3O est\xE1 no card\xE1pio, avise educadamente que n\xE3o tem e sugira itens similares.
6. Ap\xF3s o pedido ser confirmado, informe que o pedido ser\xE1 processado e em breve a cozinha come\xE7ar\xE1 a preparar.

IMPORTANTE: N\xC3O invente itens. Use APENAS os itens listados no card\xE1pio acima.`;
}
async function processMessage(ai2, model, systemPrompt, history, customerMessage) {
  const parts = [];
  for (const turn of history) {
    const label = turn.role === "customer" ? "Cliente" : "Atendente";
    parts.push(`${label}: ${turn.text}`);
  }
  parts.push(`Cliente: ${customerMessage}`);
  parts.push("Atendente:");
  const conversationText = parts.join("\n");
  const response = await ai2.models.generateContent({
    model,
    contents: conversationText,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  });
  const text = response.text || "";
  const orderMatch = text.match(/~~~\s*order\s*\n([\s\S]*?)\n~~~/);
  if (orderMatch) {
    try {
      const orderData = JSON.parse(orderMatch[1].trim());
      const cleanMessage = text.replace(/~~~\s*order\s*\n[\s\S]*?\n~~~/, "").trim();
      return {
        message: cleanMessage,
        orderConfirmed: true,
        cart: orderData.items || [],
        customerName: orderData.customerName || ""
      };
    } catch {
    }
  }
  return { message: text, orderConfirmed: false };
}

// src/lib/whatsappProvider.ts
async function sendMessage(provider, to, text) {
  const cleanNumber = to.replace(/\D/g, "");
  switch (provider.type) {
    case "evolution_api":
      return sendEvolutionApi(provider, cleanNumber, text);
    case "twilio":
      return sendTwilio(provider, cleanNumber, text);
    case "z_api":
      return sendZApi(provider, cleanNumber, text);
    default:
      console.warn(`[WhatsApp Provider] Unsupported provider type: ${provider.type}`);
      return false;
  }
}
async function sendEvolutionApi(provider, to, text) {
  if (!provider.instance) {
    console.warn("[Evolution API] No instance configured");
    return false;
  }
  try {
    const url = `${provider.baseUrl.replace(/\/$/, "")}/message/sendText/${provider.instance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: provider.apiKey
      },
      body: JSON.stringify({
        number: to,
        text,
        delay: 1e3
      })
    });
    if (!res.ok) {
      console.warn(`[Evolution API] Send failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Evolution API] Error sending message:", err);
    return false;
  }
}
async function sendTwilio(provider, to, text) {
  try {
    const accountSid = provider.apiKey.split(":")[0] || provider.apiKey;
    const authToken = provider.apiKey.split(":")[1] || "";
    const from = provider.instance || "whatsapp:+14155238886";
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from,
      Body: text
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    return res.ok;
  } catch (err) {
    console.error("[Twilio] Error sending message:", err);
    return false;
  }
}
async function sendZApi(provider, to, text) {
  try {
    const url = `${provider.baseUrl.replace(/\/$/, "")}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": provider.apiKey
      },
      body: JSON.stringify({
        phone: to,
        message: text
      })
    });
    return res.ok;
  } catch (err) {
    console.error("[Z-API] Error sending message:", err);
    return false;
  }
}

// src/lib/whatsappWebhook.ts
var AI_MODEL = "gemini-3.1-flash-lite";
function parseProviderPayload(body) {
  const evo = body;
  if (evo?.data?.key?.remoteJid && evo?.data?.key?.fromMe === false) {
    const text = evo.data.message?.conversation || evo.data.message?.extendedTextMessage?.text || "";
    const from = evo.data.key.remoteJid.replace(/\D/g, "");
    if (from && text) return { from, text, provider: "evolution_api" };
  }
  if (body.from && body.body && body.provider) {
    return { from: String(body.from).replace(/\D/g, ""), text: String(body.body), provider: body.provider };
  }
  return null;
}
async function getRestaurantByProvider(db, providerType, instance) {
  try {
    let query = db.collection("restaurants").where("whatsappAIEnabled", "==", true);
    if (instance) {
      query = query.where("whatsappProvider.instance", "==", instance);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "Restaurante",
      whatsappProvider: data.whatsappProvider,
      whatsappAIEnabled: data.whatsappAIEnabled
    };
  } catch (err) {
    console.error("[WhatsApp Webhook] Error finding restaurant:", err);
    return null;
  }
}
async function getMenuContext(db, restaurantId) {
  try {
    const [categoriesSnap, productsSnap] = await Promise.all([
      db.collection("categories").where("restaurantId", "==", restaurantId).get(),
      db.collection("products").where("restaurantId", "==", restaurantId).get()
    ]);
    const products = [];
    const catMap = /* @__PURE__ */ new Map();
    for (const doc of categoriesSnap.docs) {
      const d = doc.data();
      catMap.set(doc.id, d.name || "Sem categoria");
    }
    for (const doc of productsSnap.docs) {
      const d = doc.data();
      if (d.isAvailable === false) continue;
      products.push({
        name: d.name,
        price: d.price || 0,
        description: d.description || "",
        categoryName: catMap.get(d.categoryId) || "Sem categoria"
      });
    }
    return buildMenuContext(products);
  } catch (err) {
    console.error("[WhatsApp Webhook] Error fetching menu:", err);
    return "";
  }
}
async function getOrCreateConversation(db, restaurantId, customerPhone) {
  const conversationsRef = db.collection("whatsapp_conversations");
  const snap = await conversationsRef.where("restaurantId", "==", restaurantId).where("customerPhone", "==", customerPhone).limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      messages: data.messages || [],
      docRef: doc.ref
    };
  }
  const newDoc = conversationsRef.doc();
  await newDoc.set({
    id: newDoc.id,
    restaurantId,
    customerPhone,
    state: "active",
    messages: [],
    cart: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return { messages: [], docRef: newDoc };
}
async function ensureProviderConfig(db, restaurantId, providerType, instance) {
  const doc = await db.collection("restaurants").doc(restaurantId).get();
  const data = doc.data();
  const stored = data?.whatsappProvider;
  if (stored?.baseUrl && stored?.apiKey) {
    return {
      type: stored.type || "evolution_api",
      baseUrl: stored.baseUrl,
      apiKey: stored.apiKey,
      instance: stored.instance || instance
    };
  }
  return null;
}
async function handleWebhook(ai2, db, body) {
  const parsed = parseProviderPayload(body);
  if (!parsed) {
    return { success: false, message: "Invalid payload format" };
  }
  const instance = body?.data?.key?.remoteJid?.split("@")[0] || body?.instance;
  const restaurant = await getRestaurantByProvider(db, parsed.provider, instance);
  if (!restaurant) {
    console.log(`[WhatsApp Webhook] No restaurant found for ${parsed.provider} instance=${instance}`);
    return { success: false, message: "No matching restaurant" };
  }
  const { messages, docRef } = await getOrCreateConversation(
    db,
    restaurant.id,
    parsed.from
  );
  const menuContext = await getMenuContext(db, restaurant.id);
  if (!menuContext) {
    const errorMsg = "Desculpe, estou com dificuldades para acessar o card\xE1pio. Tente novamente mais tarde.";
    await docRef.update({
      messages: [...messages.slice(-50), { role: "customer", text: parsed.text, timestamp: (/* @__PURE__ */ new Date()).toISOString() }, { role: "assistant", text: errorMsg, timestamp: (/* @__PURE__ */ new Date()).toISOString() }],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { success: true, message: errorMsg };
  }
  const history = messages.filter((m) => m.role === "customer" || m.role === "assistant").map((m) => ({ role: m.role, text: m.text }));
  const systemPrompt = buildSystemPrompt(restaurant.name, menuContext);
  const result = await processMessage(ai2, AI_MODEL, systemPrompt, history, parsed.text);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const updatedMessages = [
    ...messages.slice(-50),
    { role: "customer", text: parsed.text, timestamp },
    { role: "assistant", text: result.message, timestamp }
  ];
  await docRef.update({
    messages: updatedMessages,
    updatedAt: timestamp,
    state: result.orderConfirmed ? "completed" : "active",
    ...result.orderConfirmed ? { orderId: "pending" } : {}
  });
  const providerConfig = await ensureProviderConfig(db, restaurant.id, parsed.provider, instance);
  if (providerConfig) {
    await sendMessage(providerConfig, parsed.from, result.message).catch(
      (err) => console.error("[WhatsApp Webhook] Failed to send response:", err)
    );
  } else {
    console.log(`[WhatsApp Webhook] No provider config for restaurant ${restaurant.id}`);
  }
  return { success: true };
}

// server/api.ts
dotenv.config();
var FIRESTORE_DATABASE_ID = "ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b";
function adminDb() {
  return getFirestore(getApps()[0], FIRESTORE_DATABASE_ID);
}
var firebaseAdminInitialized = false;
var serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, "base64").toString("utf-8"));
    initAdminApp({ credential: cert(serviceAccount) });
    firebaseAdminInitialized = true;
    console.log("[Vercel API] Firebase Admin SDK initialized");
  } catch (e) {
    console.warn("[Vercel API] Failed to initialize Firebase Admin SDK:", e);
  }
} else {
  console.log("[Vercel API] FIREBASE_SERVICE_ACCOUNT_KEY not set");
}
var requiredEnv = ["GEMINI_API_KEY", "APP_URL"];
var optionalEnv = ["API_SECRET_KEY", "WEBHOOK_SECRET", "FIREBASE_SERVICE_ACCOUNT_KEY", "VITE_PLATFORM_PIX_KEY", "VITE_SENTRY_DSN"];
var missingRequired = requiredEnv.filter((v) => !process.env[v]);
var missingOptional = optionalEnv.filter((v) => !process.env[v]);
if (missingRequired.length > 0) {
  console.error(`[ENV] CRITICAL: Missing required vars: ${missingRequired.join(", ")}`);
}
if (missingOptional.length > 0) {
  console.warn(`[ENV] Optional vars not set: ${missingOptional.join(", ")}`);
}
if (missingRequired.length === 0) {
  console.log("[ENV] All required variables loaded");
}
var app = express();
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
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.APP_URL || "http://localhost:3000",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));
app.use(express.json({ limit: "1mb" }));
var rateLimitMap = /* @__PURE__ */ new Map();
var CLEANUP_INTERVAL = 5 * 60 * 1e3;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, CLEANUP_INTERVAL);
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const rawIp = req.ip || req.socket.remoteAddress || "unknown";
    const key = rawIp.replace(/^::ffff:/, "");
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: "Too many requests. Try again later." });
    }
    entry.count++;
    next();
  };
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: "Service unavailable: authentication not configured" });
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.auth = { uid: decoded.uid };
    next();
  } catch (error) {
    console.error("[Auth] Invalid token:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api", rateLimit(30, 6e4));
var MAX_STRING_LEN = 500;
function sanitizeString(input, maxLen = MAX_STRING_LEN) {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}
var ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
function isAllowedMimeType(mt) {
  return ALLOWED_MIME_TYPES.includes(mt);
}
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } }
});
app.post("/api/ai/parse-menu", requireAuth, async (req, res) => {
  const { fileData, mimeType } = req.body;
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: "fileData and mimeType are required" });
  }
  if (!isAllowedMimeType(mimeType)) {
    return res.status(400).json({ error: "Invalid mimeType" });
  }
  try {
    const filePart = { inlineData: { mimeType, data: sanitizeString(fileData, 2e6) } };
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
  } catch (error) {
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
    const prompt = `Voc\xEA \xE9 um especialista em gastronomia e consultor de restaurantes. Gere um card\xE1pio digital profissional para um restaurante de culin\xE1ria "${cuisine}" chamado "${restaurantName}"${slogan ? ` com o slogan "${slogan}"` : ""}.
O card\xE1pio deve conter 3 a 4 categorias l\xF3gicas (ex: Entradas, Pratos Principais, Bebidas, Sobremesas).
Cada categoria deve ter de 3 a 5 produtos realistas e atraentes.
As descri\xE7\xF5es devem ser curtas e vender bem o prato.
Os pre\xE7os devem ser em Reais (BRL), condizentes com o tipo de culin\xE1ria.
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
  } catch (error) {
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
    const systemInstruction = `Voc\xEA \xE9 um chef de cozinha profissional e criativo. Gere um novo produto inovador e realista para a categoria de card\xE1pio "${categoryName}" de um estabelecimento gourmet.
${userPrompt ? `O usu\xE1rio sugeriu como base: "${userPrompt}"` : "Crie um prato especial delicioso, premium e popular que se destaque no card\xE1pio."}
O pre\xE7o deve ser um valor num\xE9rico realista em Reais (BRL), sem o s\xEDmbolo R$, exemplo: 35.90.
O tempo de preparo deve ser um n\xFAmero inteiro em minutos correspondente \xE0 prepara\xE7\xE3o realista do item, exemplo: 15.
A descri\xE7\xE3o deve ser muito apetitosa, curta e atraente para o cliente final.
Selecione ou crie tamb\xE9m uma URL de imagem p\xFAblica real (Unsplash ou Pexels) condizente com este prato espec\xEDfico e categoria. Ex: Se for uma sobremesa, que seja uma foto de sobremesa do Unsplash.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Gere um prato/produto para o card\xE1pio.",
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
  } catch (error) {
    console.error("AI Product generation error:", error?.message || error);
    res.status(500).json({ error: "AI generation failed" });
  }
});
app.get("/api/blog/news", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Resuma as 3 \xFAltimas not\xEDcias de cada um destes sites para um blog de foodservice. Foque no que \xE9 relevante para donos de restaurantes. Extraia t\xEDtulos, um breve resumo, links (estimados se n\xE3o puder ler) e tente descrever uma imagem que acompanharia a not\xEDcia.\n\nSites:\n1. https://sp.abrasel.com.br/noticias/\n2. https://anrbrasil.org.br/noticias/\n3. https://mercadoeconsumo.com.br/category/foodservice/",
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
    if (firebaseAdminInitialized) {
      const db = adminDb();
      const subRef = db.collection("newsletter_subscribers").doc(email.toLowerCase());
      const existing = await subRef.get();
      if (!existing.exists) {
        await subRef.set({
          email: email.toLowerCase(),
          subscribedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    res.json({ success: true, message: "Subscribed successfully!" });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ error: "Subscription failed" });
  }
});
app.get("/api/account/export", requireAuth, async (req, res) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: "Service unavailable" });
  }
  try {
    const uid = req.auth.uid;
    const db = adminDb();
    const userDoc = await db.collection("users").doc(uid).get();
    const ordersSnapshot = await db.collection("orders").where("userId", "==", uid).limit(500).get();
    const orders = ordersSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const loyaltySnapshot = await db.collection("loyalty_profiles").where("customerId", "==", uid).limit(100).get();
    const loyalty = loyaltySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const data = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      profile: userDoc.exists ? userDoc.data() : null,
      orders,
      loyalty
    };
    res.setHeader("Content-Disposition", 'attachment; filename="meu-ovo-dados.json"');
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(data);
  } catch (error) {
    console.error("[Account Export] Error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});
app.delete("/api/account/data", requireAuth, async (req, res) => {
  if (!firebaseAdminInitialized) {
    return res.status(503).json({ error: "Service unavailable" });
  }
  try {
    const uid = req.auth.uid;
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const batch = db.batch();
    batch.delete(userRef);
    const deleteWhere = async (collectionName, field, limit = 500) => {
      let cursor = null;
      for (; ; ) {
        let q = db.collection(collectionName).where(field, "==", uid).limit(limit);
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty) break;
        snap.docs.forEach((d) => batch.delete(d.ref));
        cursor = snap.docs[snap.docs.length - 1];
      }
    };
    await deleteWhere("orders", "userId");
    await deleteWhere("loyalty_profiles", "customerId");
    await deleteWhere("dish_ratings", "userId");
    await deleteWhere("ovos_de_ouro_votes", "userId");
    ["platform_loyalty", "streaks", "achievements"].forEach((collectionName) => {
      batch.delete(db.collection(collectionName).doc(uid));
    });
    await batch.commit();
    try {
      await getAuth().deleteUser(uid);
    } catch (authErr) {
      if (!authErr?.errorInfo?.code?.includes("auth/user-not-found")) {
        console.error("[Account Delete] deleteUser error:", authErr);
      }
    }
    res.json({ success: true, message: "Account data deleted" });
  } catch (error) {
    console.error("[Account Delete] Error:", error);
    res.status(500).json({ error: "Failed to delete account data" });
  }
});
app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ success: false, message: "Service unavailable" });
    }
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[WhatsApp Webhook] WEBHOOK_SECRET not configured");
      return res.status(500).json({ success: false, message: "Server not configured" });
    }
    const authHeader = req.headers["x-webhook-secret"] || req.headers["x-hub-signature-256"] || "";
    if (authHeader !== webhookSecret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const db = adminDb();
    const result = await handleWebhook(ai, db, req.body);
    res.json(result);
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});
app.get("/api/order/:id/status", async (req, res) => {
  try {
    if (!firebaseAdminInitialized) {
      return res.status(503).json({ error: "Service unavailable" });
    }
    const { id } = req.params;
    if (!id || id.length < 8 || id.length > 64) {
      return res.status(400).json({ error: "invalid_order_id" });
    }
    const db = adminDb();
    const orderDoc = await db.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "order_not_found" });
    }
    const o = orderDoc.data();
    res.json({
      id,
      status: o?.status || "received",
      createdAt: o?.createdAt || null,
      updatedAt: o?.updatedAt || null,
      type: o?.type === "delivery" || o?.type === "pickup" ? o.type : "pickup",
      paymentMethod: typeof o?.paymentMethod === "string" ? o.paymentMethod : "pix",
      total: typeof o?.total === "number" ? o.total : 0,
      items: Array.isArray(o?.items) ? o.items.map((item) => ({
        productName: item?.productName || item?.name || "",
        quantity: typeof item?.quantity === "number" ? item.quantity : 0,
        unitPrice: typeof item?.unitPrice === "number" ? item.unitPrice : 0,
        additionals: Array.isArray(item?.additionals) ? item.additionals.filter((a) => a).map((a) => typeof a === "string" ? a : a.name || "") : []
      })) : []
    });
  } catch (error) {
    console.error("[Order Status] Error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
var distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
var api_default = app;
export {
  api_default as default
};
