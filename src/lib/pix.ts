// Standard EMV CO-BR static Pix QR Code (Copia e Cola) payload generator for Brazilian Banks.
export function generatePixPayload({
  key,
  name,
  city = 'SAO PAULO',
  amount,
  txid = '***'
}: {
  key: string;
  name: string;
  city?: string;
  amount?: number;
  txid?: string;
}): string {
  // Helper to standardise strings (ascii only, uppercase, remove punctuation/accents)
  const cleanString = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFD') // splits accents from letters
      .replace(/[\u0300-\u036f]/g, '') // remove accent symbols
      .replace(/[^a-zA-Z0-9 ]/g, '') // alphanumeric and spaces only
      .toUpperCase();
  };

  const padLength = (val: string) => String(val.length).padStart(2, '0');

  // Tag 26 - Merchant Account Info (Pix specific payload)
  const merchantAccountInfo = `0014br.gov.bcb.pix01${padLength(key)}${key}`;
  const part26 = `26${padLength(merchantAccountInfo)}${merchantAccountInfo}`;
  
  // Tag 52 - Merchant Category Code
  const mcc = '52040000';
  
  // Tag 53 - Transaction Currency (BRL = 986)
  const currency = '5303986';
  
  // Tag 54 - Transaction Amount (optional)
  let amountStr = '';
  if (amount && amount > 0) {
    const amtVal = amount.toFixed(2);
    amountStr = `54${padLength(amtVal)}${amtVal}`;
  }
  
  // Tag 58 - Country Code (BR)
  const country = '5802BR';
  
  // Tag 59 - Merchant Name (max 25 characters)
  const cleanName = cleanString(name).slice(0, 25).trim() || 'MEU OVO RESTAURANTE';
  const nameStr = `59${padLength(cleanName)}${cleanName}`;
  
  // Tag 60 - Merchant City (max 15 characters)
  const cleanCity = cleanString(city).slice(0, 15).trim() || 'SAO PAULO';
  const cityStr = `60${padLength(cleanCity)}${cleanCity}`;
  
  // Tag 62 - Additional Data Field Template (TxID)
  const txidClean = cleanString(txid).slice(0, 25).trim() || '***';
  const additionalData = `05${padLength(txidClean)}${txidClean}`;
  const part62 = `62${padLength(additionalData)}${additionalData}`;
  
  // Concatenate up to Tag 63 (CRC16 placeholder)
  const payloadBase = `000201${part26}${mcc}${currency}${amountStr}${country}${nameStr}${cityStr}${part62}6304`;
  
  // CRC16 CCITT computation (Polynomial 0x1021, Initial value 0xFFFF)
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < payloadBase.length; i++) {
    const code = payloadBase.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      const bit = ((code >> (7 - j)) & 1) ^ ((crc >> 15) & 1);
      crc <<= 1;
      if (bit === 1) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xFFFF;
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  
  return `${payloadBase}${crcHex}`;
}
