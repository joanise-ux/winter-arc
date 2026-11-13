/** Daty jako klucze YYYY-MM-DD w czasie lokalnym. Liczymy w południe, żeby zmiana czasu nie przesuwała dni. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86400000);
}

/** Poniedziałek tygodnia, w którym leży dany dzień. */
export function startOfWeek(key: string): string {
  const dow = (parseKey(key).getDay() + 6) % 7; // pon = 0
  return addDays(key, -dow);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** month: 0–11 */
export function monthDays(year: number, month: number): string[] {
  const n = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`);
}

export function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(parseKey(key)) === key;
}

export const DOW_SHORT = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];

export function fmtDay(key: string): string {
  return parseKey(key).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtShort(key: string): string {
  return parseKey(key).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export function fmtMonth(year: number, month: number): string {
  return new Date(year, month, 1, 12).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

export function fmtNum(n: number): string {
  return n.toLocaleString('pl-PL', { maximumFractionDigits: 2 });
}
