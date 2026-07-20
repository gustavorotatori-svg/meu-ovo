export interface ProviderConfig {
  type: "evolution_api" | "twilio" | "z_api" | "custom";
  baseUrl: string;
  apiKey: string;
  instance?: string;
}

export async function sendMessage(
  provider: ProviderConfig,
  to: string,
  text: string
): Promise<boolean> {
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

async function sendEvolutionApi(
  provider: ProviderConfig,
  to: string,
  text: string
): Promise<boolean> {
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
        apikey: provider.apiKey,
      },
      body: JSON.stringify({
        number: to,
        text,
        delay: 1000,
      }),
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

async function sendTwilio(
  provider: ProviderConfig,
  to: string,
  text: string
): Promise<boolean> {
  try {
    const accountSid = provider.apiKey.split(":")[0] || provider.apiKey;
    const authToken = provider.apiKey.split(":")[1] || "";
    const from = provider.instance || "whatsapp:+14155238886";
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from,
      Body: text,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return res.ok;
  } catch (err) {
    console.error("[Twilio] Error sending message:", err);
    return false;
  }
}

async function sendZApi(
  provider: ProviderConfig,
  to: string,
  text: string
): Promise<boolean> {
  try {
    const url = `${provider.baseUrl.replace(/\/$/, "")}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": provider.apiKey,
      },
      body: JSON.stringify({
        phone: to,
        message: text,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[Z-API] Error sending message:", err);
    return false;
  }
}
