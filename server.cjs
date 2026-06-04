var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const ai = new import_genai.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
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
      const filePart = {
        inlineData: {
          mimeType,
          data: fileData
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
            type: import_genai.Type.OBJECT,
            properties: {
              categories: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "Array of distinct menu categories found"
              },
              products: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    name: { type: import_genai.Type.STRING, description: "Name of the item" },
                    price: { type: import_genai.Type.NUMBER, description: "Floating point price of the item" },
                    category: { type: import_genai.Type.STRING, description: "Category name this product belongs to" }
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
    } catch (error) {
      console.error("AI Menu parsing error:", error);
      res.status(500).json({
        error: "Failed to parse menu using AI",
        details: error?.message || String(error)
      });
    }
  });
  app.get("/api/blog/news", async (req, res) => {
    try {
      const urls = [
        "https://sp.abrasel.com.br/noticias/",
        "https://anrbrasil.org.br/noticias/",
        "https://mercadoeconsumo.com.br/category/foodservice/"
      ];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Resuma as 3 \xFAltimas not\xEDcias de cada um destes sites para um blog de foodservice. Foque no que \xE9 relevante para donos de restaurantes. Extraia t\xEDtulos, um breve resumo, links (estimados se n\xE3o puder ler) e tente descrever uma imagem que acompanharia a not\xEDcia.\n\nSites:\n1. https://sp.abrasel.com.br/noticias/\n2. https://anrbrasil.org.br/noticias/\n3. https://mercadoeconsumo.com.br/category/foodservice/",
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              weeklySummary: { type: import_genai.Type.STRING },
              news: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    title: { type: import_genai.Type.STRING },
                    summary: { type: import_genai.Type.STRING },
                    url: { type: import_genai.Type.STRING },
                    source: { type: import_genai.Type.STRING },
                    imageUrl: { type: import_genai.Type.STRING }
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
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere um conte\xFAdo de boas-vindas para o newsletter do 'Meu Ovo' para o email ${email}. 
        O tom deve ser empreendedor, direto e parceiro. 
        Inclua um resumo r\xE1pido de uma not\xEDcia quente do setor de restaurantes (Abrasel ou ANR).`
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
