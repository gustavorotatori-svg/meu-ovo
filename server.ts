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

  /**
   * Generate Mercado Pago PIX for donations
   * Donations go to the platform's Mercado Pago account
   */
  app.post("/api/donations/pix", async (req, res) => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(400).json({ 
        error: "Mercado Pago não configurado. Entre em contato com o suporte." 
      });
    }

    const { amount, customerName, customerEmail, orderId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valor da doação inválido" });
    }

    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `donation-${orderId}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Doação Meu OVO - Pedido #${orderId}`,
          payment_method_id: 'pix',
          payer: {
            email: customerEmail || 'doador@meuovo.com.br',
            first_name: customerName || 'Doador',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Mercado Pago error:', error);
        return res.status(500).json({ error: 'Erro ao gerar PIX de doação' });
      }

      const payment = await response.json();
      res.json({
        id: payment.id,
        status: payment.status,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code || '',
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url || '',
      });
    } catch (error) {
      console.error('Mercado Pago API error:', error);
      res.status(500).json({ error: 'Erro ao processar doação' });
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
