import type { AppState, Measurement } from './types';

export type MeasureKey = keyof Measurement;

export const MEASURES: { key: MeasureKey; label: string; unit: string; min: number; max: number }[] = [
  { key: 'weight', label: 'Waga', unit: 'kg', min: 20, max: 400 },
  { key: 'waist', label: 'Talia', unit: 'cm', min: 10, max: 300 },
  { key: 'hips', label: 'Biodra', unit: 'cm', min: 10, max: 300 },
  { key: 'chest', label: 'Klatka', unit: 'cm', min: 10, max: 300 },
  { key: 'thigh', label: 'Udo', unit: 'cm', min: 10, max: 300 },
  { key: 'arm', label: 'Ramię', unit: 'cm', min: 10, max: 300 },
];

export interface Entry {
  date: string;
  values: Measurement;
}

/** Wszystkie wpisy od najstarszego. */
export function entries(s: AppState): Entry[] {
  return Object.entries(s.measurements ?? {})
    .map(([date, values]) => ({ date, values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface Point {
  date: string;
  value: number;
}

/** Wartości jednego pomiaru w czasie (tylko dni, w których go wpisano), opcjonalnie w zakresie dat. */
export function series(s: AppState, key: MeasureKey, from?: string, to?: string): Point[] {
  return entries(s)
    .filter((e) => e.values[key] !== undefined && (!from || e.date >= from) && (!to || e.date <= to))
    .map((e) => ({ date: e.date, value: e.values[key]! }));
}

export interface Change {
  first: Point;
  last: Point;
  /** last − first; null, gdy jest tylko jeden wpis */
  delta: number | null;
}

export function change(points: Point[]): Change | null {
  if (!points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return { first, last, delta: points.length > 1 ? Math.round((last.value - first.value) * 10) / 10 : null };
}

/** „−3", „+0,5", „0" — z prawdziwym minusem. */
export function fmtDelta(d: number): string {
  const abs = Math.abs(d).toLocaleString('pl-PL', { maximumFractionDigits: 1 });
  return d === 0 ? '0' : `${d > 0 ? '+' : '−'}${abs}`;
}
