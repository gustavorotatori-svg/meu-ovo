import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
   * Uses Gemini 3.5 Flash to extract categories and products from an uploaded image or PDF
   */
  app.post("/api/ai/parse-menu", async (req, res) => {
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "fileData and mimeType are required" });
    }

    try {
      // Structure the attachment part as inlineData
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
        model: "gemini-3.5-flash",
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
        model: "gemini-3-flash-preview",
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
        model: "gemini-3-flash-preview",
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
