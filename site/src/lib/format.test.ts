import { describe, expect, it } from 'vitest';
import { energy, hours, money, pct, power } from './format';

describe('format', () => {
  it('picks readable power and energy units', () => {
    expect(power(26_500_000)).toEqual({ value: '26.5', unit: 'MW' });
    expect(power(750_000)).toEqual({ value: '750', unit: 'kW' });
    expect(energy(131_000)).toEqual({ value: '131', unit: 'MWh' });
    expect(energy(1_686_000)).toEqual({ value: '1.69', unit: 'GWh' });
  });
  it('formats hours and minutes', () => {
    expect(hours(4.95)).toBe('4 h 57 min');
    expect(hours(0.5)).toBe('30 min');
    expect(hours(2)).toBe('2 h');
  });
  it('converts money to rand with the set exchange rate', () => {
    expect(money(60_300_000, { currency: 'USD', zarPerUsd: 18 })).toBe('$60.3 M');
    expect(money(60_300_000, { currency: 'ZAR', zarPerUsd: 18 })).toBe('R1.09 bn');
  });
  it('formats percentages', () => {
    expect(pct(0.762)).toBe('76.2%');
    expect(pct(undefined)).toBe('—');
  });
});
