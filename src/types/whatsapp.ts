export type ConversationState =
  | 'greeting'
  | 'browsing'
  | 'ordering'
  | 'confirming'
  | 'completed';

export interface WhatsAppMessage {
  role: 'customer' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export interface WhatsAppConversation {
  id: string;
  restaurantId: string;
  customerPhone: string;
  customerName?: string;
  state: ConversationState;
  messages: WhatsAppMessage[];
  cart: AICartItem[];
  createdAt: string;
  updatedAt: string;
  orderId?: string;
}

export interface AICartItem {
  productName: string;
  quantity: number;
  notes?: string;
}

export interface AIOrderResult {
  items: { productName: string; quantity: number; notes?: string; price?: number }[];
  customerName: string;
  customerPhone: string;
  total: number;
}

export interface AIResponse {
  message: string;
  action: 'chat' | 'order_progress' | 'order_confirmed' | 'needs_clarification';
  cart?: AICartItem[];
  orderResult?: AIOrderResult;
  clarification?: string;
}

export interface WhatsAppWebhookPayload {
  provider: string;
  instance?: string;
  from: string;
  body: string;
  timestamp?: string;
}

export interface ProviderConfig {
  type: 'evolution_api' | 'twilio' | 'z_api' | 'custom';
  baseUrl: string;
  apiKey: string;
  instance?: string;
}
