export interface DonationPixResponse {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
}

export async function createDonationPix(params: {
  amount: number;
  customerName: string;
  customerEmail?: string;
  orderId: string;
}): Promise<DonationPixResponse> {
  const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/donations/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao gerar PIX de doação' }));
    throw new Error(err.error || 'Erro ao gerar PIX de doação');
  }
  return res.json();
}
