import { describe, expect, it } from 'vitest';
import { addDays, diffDays, monthDays, startOfWeek, weekDays } from './dates';
import { currentStreak, dayStats, monthSummary, weekSummary, weeklyGoals } from './stats';
import type { AppState, Task } from './types';

const check = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  category: 'body',
  kind: 'check',
  frequency: 'daily',
  createdAt: '2026-11-02',
  ...extra,
});

function state(tasks: Task[], log: AppState['log'] = {}, workouts: AppState['workouts'] = []): AppState {
  return { version: 1, settings: { startDate: '2026-11-02', length: 90 }, tasks, log, workouts };
}

describe('dates', () => {
  it('tydzień zaczyna się w poniedziałek', () => {
    expect(startOfWeek('2026-11-13')).toBe('2026-11-09'); // piątek
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09'); // niedziela
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // poniedziałek
    expect(weekDays('2026-11-09')).toHaveLength(7);
  });

  it('przechodzi przez granice miesiąca, roku i zmianę czasu', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // zmiana czasu 25.10
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(monthDays(2028, 1)).toHaveLength(29);
  });
});

describe('dzień', () => {
  const s = state(
    [check('a'), check('b'), { ...check('w'), kind: 'counter', target: 3 }],
    { '2026-11-02': { a: 1, w: 2.5 }, '2026-11-03': { a: 1, b: 1, w: 3 } },
  );

  it('licznik zalicza się dopiero po osiągnięciu celu', () => {
    expect(dayStats(s, '2026-11-02', '2026-11-03')).toMatchObject({ done: 1, total: 3 });
    expect(dayStats(s, '2026-11-03', '2026-11-03')).toMatchObject({ done: 3, total: 3, pct: 1 });
  });

  it('nie liczy dni sprzed startu ani z przyszłości', () => {
    expect(dayStats(s, '2026-11-01', '2026-11-03').counted).toBe(false);
    expect(dayStats(s, '2026-11-04', '2026-11-03').counted).toBe(false);
  });
});

describe('seria', () => {
  const full = { a: 1 };
  it('trwa, gdy dzisiejszy dzień jeszcze nie jest zaliczony', () => {
    const s = state([check('a')], { '2026-11-02': full, '2026-11-03': full });
    expect(currentStreak(s, '2026-11-04')).toBe(2);
    expect(currentStreak(s, '2026-11-03')).toBe(2);
  });
  it('zeruje się po opuszczonym dniu', () => {
    const s = state([check('a')], { '2026-11-02': full });
    expect(currentStreak(s, '2026-11-04')).toBe(0);
  });
});

describe('zadania usunięte i dodane w trakcie', () => {
  const s = state(
    [check('a'), check('old', { archivedAt: '2026-11-04' }), check('new', { createdAt: '2026-11-05' })],
    { '2026-11-02': { a: 1, old: 1 }, '2026-11-04': { a: 1 }, '2026-11-05': { a: 1 } },
  );
  it('usunięte zadanie zostaje w historii, ale nie obciąża kolejnych dni', () => {
    expect(dayStats(s, '2026-11-02', '2026-11-06')).toMatchObject({ done: 2, total: 2 });
    expect(dayStats(s, '2026-11-04', '2026-11-06')).toMatchObject({ done: 1, total: 1 });
  });
  it('nowe zadanie liczy się od dnia dodania', () => {
    expect(dayStats(s, '2026-11-05', '2026-11-06')).toMatchObject({ done: 1, total: 2 });
    const w = weekSummary(s, '2026-11-02', '2026-11-06');
    expect(w.perTask.find((r) => r.task.id === 'new')).toMatchObject({ possible: 2, done: 0 });
    expect(w.perTask.find((r) => r.task.id === 'old')).toMatchObject({ possible: 2, done: 1 });
  });
});

describe('tydzień i miesiąc', () => {
  const tasks = [check('a'), { ...check('w'), kind: 'counter' as const, target: 2 }, check('gym', { frequency: 'weekly', timesPerWeek: 2, auto: 'workout' })];
  const s = state(
    tasks,
    { '2026-11-02': { a: 1, w: 2 }, '2026-11-03': { w: 1 }, '2026-11-04': { gym: 1 } },
    [{ id: 'x', date: '2026-11-02', type: 'strength', minutes: 50 }],
  );

  it('średnia tygodnia liczy tylko dni, które już minęły', () => {
    const w = weekSummary(s, '2026-11-02', '2026-11-03');
    expect(w.countedDays).toBe(2);
    expect(w.avgPct).toBe(0.5);
    expect(w.prevAvgPct).toBeNull();
    expect(w.counters[0]).toMatchObject({ avg: 1.5, hits: 1, days: 2 });
    expect(w.workouts).toMatchObject({ count: 1, minutes: 50 });
  });

  it('trening zalicza wyzwanie tygodniowe automatycznie', () => {
    expect(weeklyGoals(s, '2026-11-02')[0]).toMatchObject({ count: 2, goal: 2, met: true });
  });

  it('miesiąc: seria i tygodnie z kompletem wyzwań', () => {
    const m = monthSummary(s, 2026, 10, '2026-11-10');
    expect(m.days).toHaveLength(30);
    expect(m.countedDays).toBe(9);
    expect(m.passedDays).toBe(1);
    expect(m.longest).toBe(1);
    expect(m).toMatchObject({ weeks: 2, weeksMet: 1 });
  });
});
