import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../services/customerRatingService';

describe('customerRatingService - normalizePhone', () => {
  it('removes all non-digit characters from phone', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe('11999998888');
  });

  it('handles phone with country code', () => {
    expect(normalizePhone('+55 11 91234-5678')).toBe('5511912345678');
  });

  it('returns empty string for empty input', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('handles already clean phone', () => {
    expect(normalizePhone('11999998888')).toBe('11999998888');
  });

  it('handles phone with spaces and dashes', () => {
    expect(normalizePhone('11 91234-5678')).toBe('11912345678');
  });
});
