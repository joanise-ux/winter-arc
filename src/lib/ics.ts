import { addDays, diffDays } from './dates';
import type { AppState, Reminder } from './types';

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'am', time: '07:30', label: 'Poranek: rozciąganie, skincare, woda' },
  { id: 'pm', time: '20:30', label: 'Wieczór: odhacz zadania dnia' },
];

export const remindersOf = (s: AppState): Reminder[] => s.settings.reminders ?? DEFAULT_REMINDERS;

export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Pierwszy dzień przypomnień i liczba powtórzeń — do końca wyzwania (albo 30 dni, gdy już minęło). */
export function reminderSpan(s: AppState, today: string): { first: string; count: number } {
  const first = today < s.settings.startDate ? s.settings.startDate : today;
  const end = addDays(s.settings.startDate, s.settings.length - 1);
  const left = diffDays(first, end) + 1;
  return { first, count: left > 0 ? left : 30 };
}

const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

function plusMinutes(time: string, min: number): string {
  const [h, m] = time.split(':').map(Number);
  const t = Math.min(h * 60 + m + min, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Linie dłuższe niż 75 bajtów trzeba łamać (RFC 5545). */
function fold(line: string): string {
  const enc = new TextEncoder();
  let out = '';
  let cur = '';
  let limit = 75;
  for (const ch of line) {
    if (enc.encode(cur + ch).length > limit) {
      out += cur + '\r\n ';
      cur = '';
      limit = 74;
    }
    cur += ch;
  }
  return out + cur;
}

export function buildIcs(s: AppState, today: string, appUrl: string, now = new Date()): string {
  const { first, count } = reminderSpan(s, today);
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Winter Arc//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const r of remindersOf(s)) {
    if (!isTime(r.time)) continue;
    const title = `Winter Arc — ${r.label.trim() || 'przypomnienie'}`;
    lines.push(
      'BEGIN:VEVENT',
      // stały identyfikator: ponowny import aktualizuje wydarzenie zamiast je dublować
      `UID:winter-arc-${r.id}@winter-arc`,
      `DTSTAMP:${dtstamp}`,
      `SEQUENCE:${Math.floor(now.getTime() / 1000)}`,
      `DTSTART:${stamp(first, r.time)}`,
      `DTEND:${stamp(first, plusMinutes(r.time, 5))}`,
      `RRULE:FREQ=DAILY;COUNT=${count}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(`Otwórz aplikację: ${appUrl}`)}`,
      `URL:${appUrl}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Link otwierający Kalendarz Google z gotowym, powtarzanym wydarzeniem. */
export function googleUrl(s: AppState, r: Reminder, today: string, appUrl: string): string {
  const { first, count } = reminderSpan(s, today);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Winter Arc — ${r.label.trim() || 'przypomnienie'}`,
    dates: `${stamp(first, r.time)}/${stamp(first, plusMinutes(r.time, 5))}`,
    recur: `RRULE:FREQ=DAILY;COUNT=${count}`,
    details: `Otwórz aplikację: ${appUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
