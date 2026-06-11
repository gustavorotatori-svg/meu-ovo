import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ai/parse-menu", async (req, res) => {
  const { fileData, mimeType } = req.body;
  if (!fileData || !mimeType) {
    return res.status(400).json({ error: "fileData and mimeType are required" });
  }
  try {
    const filePart = { inlineData: { mimeType, data: fileData } };
    const promptPart = { text: "Analyze the attached menu document (image or PDF document). Extract all main categories and the list of individual products under each category. For each product, extract the name, price containing decimal numeric value (without currency symbol, e.g. 15.90), and categorize it with the corresponding category name. Create category names that are clear and concise. Return the categories and products lists matching the requested schema." };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
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
    console.error("AI Menu parsing error:", error);
    res.status(500).json({ error: "Failed to parse menu using AI", details: error?.message || String(error) });
  }
});

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

app.get("/api/blog/news", async (req, res) => {
  try {
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
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `Gere um conteúdo de boas-vindas para o newsletter do 'Meu Ovo' para o email ${email}. O tom deve ser empreendedor, direto e parceiro. Inclua um resumo rápido de uma notícia quente do setor de restaurantes (Abrasel ou ANR).`
    });
    res.json({ success: true, message: "Subscribed successfully!", preview: response.text });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ error: "Subscription failed" });
  }
});

const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
