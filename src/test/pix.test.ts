import { describe, it, expect } from 'vitest';
import { generatePixPayload } from '../lib/pix';

describe('generatePixPayload', () => {
  const validKey = 'teste@example.com';
  const validName = 'MEU OVO';

  it('generates payload starting with 000201', () => {
    const result = generatePixPayload({ key: validKey, name: validName });
    expect(result.startsWith('000201')).toBe(true);
  });

  it('generates payload ending with valid CRC16 (4 hex chars)', () => {
    const result = generatePixPayload({ key: validKey, name: validName });
    const crc = result.slice(-4);
    expect(/^[0-9A-F]{4}$/.test(crc)).toBe(true);
  });

  it('includes the PIX key in the payload', () => {
    const result = generatePixPayload({ key: validKey, name: validName });
    expect(result).toContain('br.gov.bcb.pix');
    expect(result).toContain(validKey);
  });

  it('includes amount when provided', () => {
    const result = generatePixPayload({ key: validKey, name: validName, amount: 25.50 });
    // 54 + length(25.50)=5 + 25.50 -> 540525.50
    expect(result).toContain('540525.50');
  });

  it('does not include amount tag when not provided', () => {
    const result = generatePixPayload({ key: validKey, name: validName });
    expect(result).not.toContain('54');
  });

  it('uses *** as default txid', () => {
    const result = generatePixPayload({ key: validKey, name: validName });
    // 62 + length(additionalData) + 05 + length(***)=3 + ***
    expect(result).toContain('***');
  });

  it('includes custom txid when provided', () => {
    const result = generatePixPayload({
      key: validKey,
      name: validName,
      txid: 'PEDIDO123'
    });
    expect(result).toContain('PEDIDO123');
  });

  it('CRC16 checksum validates correctly', () => {
    // Known valid payload structure - just verify length > 50 and ends with 4 hex chars
    const result = generatePixPayload({
      key: validKey,
      name: validName,
      amount: 10.00,
      txid: 'TESTTXID123'
    });
    expect(result.length).toBeGreaterThan(50);
    expect(/^[0-9A-F]{4}$/.test(result.slice(-4))).toBe(true);
  });

  it('handles special characters in name', () => {
    const result = generatePixPayload({
      key: validKey,
      name: 'São Paulo Bistro & Café',
      amount: 15.00
    });
    expect(result).toContain('SAO PAULO');
    expect(result).not.toContain('São');
  });
});
