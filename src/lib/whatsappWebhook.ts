import { GoogleGenAI } from "@google/genai";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { buildMenuContext, buildSystemPrompt, processMessage } from "./whatsappAI.ts";
import { sendMessage, ProviderConfig } from "./whatsappProvider.ts";

const AI_MODEL = "gemini-3.1-flash-lite";

interface EvolutionPayload {
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
    };
  };
}

function parseProviderPayload(body: any): { from: string; text: string; provider: "evolution_api" | "twilio" | "z_api" } | null {
  // Evolution API
  const evo = body as EvolutionPayload;
  if (evo?.data?.key?.remoteJid && evo?.data?.key?.fromMe === false) {
    const text =
      evo.data.message?.conversation ||
      evo.data.message?.extendedTextMessage?.text ||
      "";
    const from = evo.data.key.remoteJid.replace(/\D/g, "");
    if (from && text) return { from, text, provider: "evolution_api" };
  }

  // Generic: { from, body, provider }
  if (body.from && body.body && body.provider) {
    return { from: String(body.from).replace(/\D/g, ""), text: String(body.body), provider: body.provider };
  }

  return null;
}

interface RestaurantConfig {
  id: string;
  name: string;
  whatsappProvider?: {
    type: "evolution_api" | "twilio" | "z_api" | "custom";
    baseUrl: string;
    apiKey: string;
    instance?: string;
  };
  whatsappAIEnabled?: boolean;
}

async function getRestaurantByProvider(
  db: Firestore,
  providerType: string,
  instance?: string
): Promise<RestaurantConfig | null> {
  try {
    let query: FirebaseFirestore.Query = db.collection("restaurants").where("whatsappAIEnabled", "==", true);

    if (instance) {
      query = query.where("whatsappProvider.instance", "==", instance);
    }

    const snap = await query.limit(1).get();
    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data() as any;
    return {
      id: doc.id,
      name: data.name || "Restaurante",
      whatsappProvider: data.whatsappProvider,
      whatsappAIEnabled: data.whatsappAIEnabled,
    };
  } catch (err) {
    console.error("[WhatsApp Webhook] Error finding restaurant:", err);
    return null;
  }
}

async function getMenuContext(
  db: Firestore,
  restaurantId: string
): Promise<string> {
  try {
    const [categoriesSnap, productsSnap] = await Promise.all([
      db.collection("categories").where("restaurantId", "==", restaurantId).get(),
      db.collection("products").where("restaurantId", "==", restaurantId).get(),
    ]);

    const products: any[] = [];
    const catMap = new Map<string, string>();

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
        categoryName: catMap.get(d.categoryId) || "Sem categoria",
      });
    }

    return buildMenuContext(products);
  } catch (err) {
    console.error("[WhatsApp Webhook] Error fetching menu:", err);
    return "";
  }
}

async function getOrCreateConversation(
  db: Firestore,
  restaurantId: string,
  customerPhone: string
): Promise<{ messages: any[]; docRef: FirebaseFirestore.DocumentReference }> {
  const conversationsRef = db.collection("whatsapp_conversations");
  const snap = await conversationsRef
    .where("restaurantId", "==", restaurantId)
    .where("customerPhone", "==", customerPhone)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      messages: data.messages || [],
      docRef: doc.ref,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { messages: [], docRef: newDoc };
}

async function ensureProviderConfig(
  db: Firestore,
  restaurantId: string,
  providerType: string,
  instance?: string
): Promise<ProviderConfig | null> {
  // Try stored config first
  const doc = await db.collection("restaurants").doc(restaurantId).get();
  const data = doc.data();
  const stored = data?.whatsappProvider;

  if (stored?.baseUrl && stored?.apiKey) {
    return {
      type: stored.type || "evolution_api",
      baseUrl: stored.baseUrl,
      apiKey: stored.apiKey,
      instance: stored.instance || instance,
    };
  }

  return null;
}

export async function handleWebhook(
  ai: GoogleGenAI,
  db: Firestore,
  body: any
): Promise<{ success: boolean; message?: string }> {
  const parsed = parseProviderPayload(body);
  if (!parsed) {
    return { success: false, message: "Invalid payload format" };
  }

  // Determine instance from payload for restaurant lookup
  const instance = body?.data?.key?.remoteJid?.split("@")[0] || body?.instance;

  // Find restaurant
  const restaurant = await getRestaurantByProvider(db, parsed.provider, instance);
  if (!restaurant) {
    console.log(`[WhatsApp Webhook] No restaurant found for ${parsed.provider} instance=${instance}`);
    return { success: false, message: "No matching restaurant" };
  }

  // Get or create conversation
  const { messages, docRef } = await getOrCreateConversation(
    db,
    restaurant.id,
    parsed.from
  );

  // Get menu context
  const menuContext = await getMenuContext(db, restaurant.id);
  if (!menuContext) {
    const errorMsg = "Desculpe, estou com dificuldades para acessar o cardápio. Tente novamente mais tarde.";
    await docRef.update({
      messages: [...messages.slice(-50), { role: "customer", text: parsed.text, timestamp: new Date().toISOString() }, { role: "assistant", text: errorMsg, timestamp: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: errorMsg };
  }

  // Build history from stored messages
  const history = messages
    .filter((m: any) => m.role === "customer" || m.role === "assistant")
    .map((m: any) => ({ role: m.role as "customer" | "assistant", text: m.text }));

  // Process with AI
  const systemPrompt = buildSystemPrompt(restaurant.name, menuContext);
  const result = await processMessage(ai, AI_MODEL, systemPrompt, history, parsed.text);

  const timestamp = new Date().toISOString();
  const updatedMessages = [
    ...messages.slice(-50),
    { role: "customer", text: parsed.text, timestamp },
    { role: "assistant", text: result.message, timestamp },
  ];

  // Save conversation
  await docRef.update({
    messages: updatedMessages,
    updatedAt: timestamp,
    state: result.orderConfirmed ? "completed" : "active",
    ...(result.orderConfirmed ? { orderId: "pending" } : {}),
  });

  // Send response via provider
  const providerConfig = await ensureProviderConfig(db, restaurant.id, parsed.provider, instance);
  if (providerConfig) {
    await sendMessage(providerConfig, parsed.from, result.message).catch((err) =>
      console.error("[WhatsApp Webhook] Failed to send response:", err)
    );
  } else {
    console.log(`[WhatsApp Webhook] No provider config for restaurant ${restaurant.id}`);
  }

  return { success: true };
}
