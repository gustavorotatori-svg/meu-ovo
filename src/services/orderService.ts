import { getAuth } from 'firebase/auth';

export type OrderRequestItem = {
  productId: string;
  quantity: number;
  selectedOptions?: { optionId: string; name: string; price: number }[];
  observations?: string;
};

export type OrderRequest = {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  type: string;
  paymentMethod: string;
  deliveryAddress?: string;
  neighborhood?: string;
  tableNumber?: string | number;
  observations?: string;
  tip?: number;
  meuOvoCaixinha?: number;
  donationAmount?: number;
  items: OrderRequestItem[];
  couponCode?: string;
  rewardId?: string;
  customerId?: string;
  /** Taxi de entrega. O SERVIDOR não recalcula: só somamos o que foi informado. */
  deliveryFee?: number;
};

export type OrderResponse = {
  id: string;
  total: number;
  subtotal: number;
  rewardDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
};

/**
 * Cria o pedido via API. O preço é calculado no servidor a partir do catálogo
 * — o que o cliente manda é apenas referência. Chamar o Firestore direto
 * deixaria o total sob controle do navegador.
 */
export async function createOrder(req: OrderRequest): Promise<OrderResponse> {
  const token = await getAuth().currentUser?.getIdToken();

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Falha ao enviar pedido (${res.status})`;
    throw new Error(message);
  }

  return data as OrderResponse;
}