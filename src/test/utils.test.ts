import { describe, it, expect } from 'vitest';
import { formatCurrency, cn } from '../lib/utils';

describe('formatCurrency', () => {
  it('formats integer value', () => {
    expect(formatCurrency(10)).toBe('R$ 10,00');
  });

  it('formats decimal value', () => {
    expect(formatCurrency(15.90)).toBe('R$ 15,90');
  });

  it('formats large value with thousand separator', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formats small decimal', () => {
    expect(formatCurrency(0.25)).toBe('R$ 0,25');
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });
});
