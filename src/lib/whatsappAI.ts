import { GoogleGenAI } from "@google/genai";

export interface MenuProduct {
  name: string;
  price: number;
  description?: string;
  categoryName: string;
}

export interface ConversationTurn {
  role: "customer" | "assistant";
  text: string;
}

export interface ExtractedOrderItem {
  productName: string;
  quantity: number;
  notes?: string;
}

export interface ProcessResult {
  message: string;
  orderConfirmed: boolean;
  cart?: ExtractedOrderItem[];
  customerName?: string;
}

export function buildMenuContext(products: MenuProduct[]): string {
  const grouped: Record<string, MenuProduct[]> = {};
  for (const p of products) {
    if (!grouped[p.categoryName]) grouped[p.categoryName] = [];
    grouped[p.categoryName].push(p);
  }

  let ctx = "## CARDÁPIO\n";
  for (const [cat, items] of Object.entries(grouped)) {
    ctx += `\n### ${cat}\n`;
    for (const item of items) {
      ctx += `- ${item.name} — R$ ${item.price.toFixed(2)}`;
      if (item.description) ctx += `: ${item.description}`;
      ctx += "\n";
    }
  }
  return ctx;
}

export function buildSystemPrompt(restaurantName: string, menuContext: string): string {
  return `Você é a atendente virtual do restaurante "${restaurantName}", seu nome é Dona Ova.

Você é simpática, ágil e conhece todo o cardápio. Seu objetivo é atender o cliente, tirar dúvidas sobre os produtos e anotar o pedido.

${menuContext}

## REGRAS
1. Responda em português, de forma natural e amigável, como uma atendente de restaurante.
2. Ajude o cliente a escolher itens do cardápio — sugira combinações, destaque os mais populares.
3. Quando o cliente pedir um ou mais itens, REPITA a lista para confirmar e pergunte se quer mais algo.
4. Quando o cliente CONFIRMAR que o pedido está completo (responder "sim", "é isso", "pode fechar", "só isso", etc.), responda NORMALMENTE e NO FINAL da mensagem adicione exatamente: ~~~
order
{"items": [{"productName": "...", "quantity": 1}], "customerName": "..."}
~~~
5. Se o cliente pedir algo que NÃO está no cardápio, avise educadamente que não tem e sugira itens similares.
6. Após o pedido ser confirmado, informe que o pedido será processado e em breve a cozinha começará a preparar.

IMPORTANTE: NÃO invente itens. Use APENAS os itens listados no cardápio acima.`;
}

export async function processMessage(
  ai: GoogleGenAI,
  model: string,
  systemPrompt: string,
  history: ConversationTurn[],
  customerMessage: string
): Promise<ProcessResult> {
  const parts: string[] = [];

  for (const turn of history) {
    const label = turn.role === "customer" ? "Cliente" : "Atendente";
    parts.push(`${label}: ${turn.text}`);
  }
  parts.push(`Cliente: ${customerMessage}`);
  parts.push("Atendente:");

  const conversationText = parts.join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: conversationText,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
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
        customerName: orderData.customerName || "",
      };
    } catch {
      // JSON parse failed, treat as normal message
    }
  }

  return { message: text, orderConfirmed: false };
}

export async function extractOrder(
  ai: GoogleGenAI,
  model: string,
  menuContext: string,
  history: ConversationTurn[]
): Promise<{ items: ExtractedOrderItem[]; customerName: string }> {
  const conversationText = history
    .map((t) => `${t.role === "customer" ? "Cliente" : "Atendente"}: ${t.text}`)
    .join("\n");

  const prompt = `Com base na conversa abaixo e no cardápio, extraia o pedido final do cliente.

${menuContext}

## CONVERSA
${conversationText}

Extraia APENAS os itens que o cliente confirmou. Retorne JSON com:
{
  "items": [{ "productName": "nome exato do produto", "quantity": 1, "notes": "observação se houver" }],
  "customerName": "nome do cliente (se informado)"
}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch {
    return { items: [], customerName: "" };
  }
}
