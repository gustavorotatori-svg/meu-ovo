import { Order, Restaurant } from '../types';

export const WA_NUMBER = '5511942221028';

export const STATUS_MESSAGES: Record<Order['status'], string> = {
  received: 'recebido e está aguardando confirmação',
  accepted: 'aguardando pagamento',
  preparing: 'sendo preparado com todo carinho',
  ready: 'prontinho! 🎉',
  'out-for-delivery': 'saiu para entrega! O motoboy já está a caminho 🛵',
  finished: 'entregue. Esperamos que goste! Bom apetite! 🥚',
  cancelled: 'infelizmente foi cancelado. Entre em contato para mais detalhes.'
};

export function formatStatusMessage(order: Order, restaurant: Restaurant): string {
  const statusText = STATUS_MESSAGES[order.status] || order.status;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meuovo.app';
  
  return `Olá *${order.customerName}*! Aqui é do *${restaurant.name}*.\n\n` +
         `Passando para avisar que seu pedido *#${order.id.slice(-6).toUpperCase()}* está *${statusText}*.\n\n` +
         `Você pode acompanhar o status em tempo real aqui: ${baseUrl}/r/${restaurant.slug}/status/${order.id}\n\n` +
         `Obrigado pela preferência!`;
}

export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * This is a placeholder for a real WhatsApp API integration (like Evolution API, Twilio, etc.)
 * In a production app, you would hit your WhatsApp service provider's endpoint here.
 */
export async function triggerAutomaticNotification(order: Order, restaurant: Restaurant) {
  const message = formatStatusMessage(order, restaurant);
  const webhookUrl = restaurant.orderSettings?.whatsappWebhookUrl;

  if (webhookUrl) {
    try {
      console.log(`[WhatsApp] Sending automatic notification for order ${order.id} to ${order.customerPhone}`);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: order.customerPhone.replace(/\D/g, ''),
          message: message,
          orderId: order.id,
          status: order.status
        })
      });
      return response.ok;
    } catch (error) {
      console.error('[WhatsApp] Error triggering webhook:', error);
      return false;
    }
  }

  // If no webhook is configured, we can't send "silently" from server without an API.
  console.log(`[WhatsApp] No webhook configured for ${restaurant.name}. Order status updated to ${order.status} for ${order.customerPhone}`);
  return false;
}
