/** Number formatting for display. The engine stays in SI; units are converted only here. */

export type Currency = 'USD' | 'ZAR';

const group = (n: number, digits: number) =>
  n
    .toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    .replace(/,/g, '\u2009');

export function num(n: number | undefined, digits = 0): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  return group(n, digits);
}

/** Significant-figure friendly formatting: 3 figures for small numbers, grouped for large. */
export function sig(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 100) return num(n, 0);
  if (a >= 10) return num(n, 1);
  if (a >= 1) return num(n, 2);
  return num(n, 3);
}

export const pct = (fraction: number | undefined, digits = 1): string =>
  fraction === undefined || !Number.isFinite(fraction) ? '—' : `${num(fraction * 100, digits)}%`;

/** Watts to the most readable of kW / MW. */
export function power(w: number | undefined): { value: string; unit: string } {
  if (w === undefined || !Number.isFinite(w)) return { value: '—', unit: 'MW' };
  if (Math.abs(w) >= 1e6) return { value: sig(w / 1e6), unit: 'MW' };
  return { value: sig(w / 1e3), unit: 'kW' };
}

/** kWh to the most readable of kWh / MWh / GWh. */
export function energy(kWh: number | undefined): { value: string; unit: string } {
  if (kWh === undefined || !Number.isFinite(kWh)) return { value: '—', unit: 'MWh' };
  if (Math.abs(kWh) >= 1e6) return { value: sig(kWh / 1e6), unit: 'GWh' };
  if (Math.abs(kWh) >= 1e3) return { value: sig(kWh / 1e3), unit: 'MWh' };
  return { value: sig(kWh), unit: 'kWh' };
}

export function hours(h: number | undefined): string {
  if (h === undefined || !Number.isFinite(h)) return '—';
  if (h < 1) return `${num(h * 60, 0)} min`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins === 60 ? `${whole + 1} h` : mins === 0 ? `${whole} h` : `${whole} h ${mins} min`;
}

export interface Money {
  currency: Currency;
  zarPerUsd: number;
}

const SYMBOL: Record<Currency, string> = { USD: '$', ZAR: 'R' };

/** Format a USD amount in the chosen currency, compactly (k, M, bn). */
export function money(usd: number | undefined, m: Money, digits?: number): string {
  if (usd === undefined || !Number.isFinite(usd)) return '—';
  const v = m.currency === 'ZAR' ? usd * m.zarPerUsd : usd;
  const s = SYMBOL[m.currency];
  const a = Math.abs(v);
  if (a >= 1e9) return `${s}${num(v / 1e9, digits ?? 2)} bn`;
  if (a >= 1e6) return `${s}${num(v / 1e6, digits ?? 1)} M`;
  if (a >= 1e4) return `${s}${num(v / 1e3, digits ?? 0)} k`;
  return `${s}${num(v, digits ?? 0)}`;
}

export const metres = (m: number | undefined, digits = 0): string => `${num(m, digits)} m`;
