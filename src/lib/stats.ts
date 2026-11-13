import { addDays, diffDays, monthDays, startOfWeek, weekDays } from './dates';
import type { AppState, Task, WorkoutType } from './types';

/** Dzień jest „zaliczony”, gdy wykonano co najmniej tyle zadań dziennych. */
export const PASS = 0.8;

export function isActive(t: Task, date: string): boolean {
  return t.createdAt <= date && (!t.archivedAt || date < t.archivedAt);
}

export function tasksOn(s: AppState, date: string, frequency: Task['frequency']): Task[] {
  return s.tasks.filter((t) => t.frequency === frequency && isActive(t, date));
}

export function hasWorkout(s: AppState, date: string): boolean {
  return s.workouts.some((w) => w.date === date);
}

export function valueOf(s: AppState, t: Task, date: string): number {
  const v = s.log[date]?.[t.id] ?? 0;
  if (t.auto === 'workout' && v < 1 && hasWorkout(s, date)) return 1;
  return v;
}

export function isDone(s: AppState, t: Task, date: string): boolean {
  const v = valueOf(s, t, date);
  return t.kind === 'counter' ? v >= (t.target ?? 1) : v >= 1;
}

/** Czy dzień wlicza się do statystyk (od startu wyzwania do dziś). */
export function isCounted(s: AppState, date: string, today: string): boolean {
  return date >= s.settings.startDate && date <= today;
}

export interface DayStats {
  date: string;
  done: number;
  total: number;
  pct: number;
  counted: boolean;
}

export function dayStats(s: AppState, date: string, today: string): DayStats {
  const tasks = tasksOn(s, date, 'daily');
  const done = tasks.filter((t) => isDone(s, t, date)).length;
  return {
    date,
    done,
    total: tasks.length,
    pct: tasks.length ? done / tasks.length : 0,
    counted: isCounted(s, date, today) && tasks.length > 0,
  };
}

const passed = (d: DayStats) => d.counted && d.pct >= PASS;

/** Seria zaliczonych dni kończąca się dziś (albo wczoraj, jeśli dzisiejszy dzień jeszcze trwa). */
export function currentStreak(s: AppState, today: string): number {
  let d = today;
  if (!passed(dayStats(s, d, today))) d = addDays(d, -1);
  let n = 0;
  while (d >= s.settings.startDate && passed(dayStats(s, d, today))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function longestStreak(days: DayStats[]): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = passed(d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function weekCount(s: AppState, t: Task, weekStart: string): number {
  return weekDays(weekStart).filter((d) => isActive(t, d) && isDone(s, t, d)).length;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface TaskRate {
  task: Task;
  done: number;
  possible: number;
  rate: number;
}
export interface CounterStat {
  task: Task;
  avg: number;
  total: number;
  hits: number;
  days: number;
  series: number[];
}
export interface WorkoutStat {
  count: number;
  minutes: number;
  byType: Partial<Record<WorkoutType, number>>;
}

function rangeStats(s: AppState, dates: string[], today: string) {
  const days = dates.map((d) => dayStats(s, d, today));
  const counted = days.filter((d) => d.counted);
  const countedDates = counted.map((d) => d.date);

  const perTask: TaskRate[] = [];
  const counters: CounterStat[] = [];
  for (const task of s.tasks) {
    if (task.frequency !== 'daily') continue;
    const active = countedDates.filter((d) => isActive(task, d));
    if (!active.length) continue;
    const done = active.filter((d) => isDone(s, task, d)).length;
    perTask.push({ task, done, possible: active.length, rate: done / active.length });
    if (task.kind === 'counter') {
      const series = active.map((d) => valueOf(s, task, d));
      const total = series.reduce((a, b) => a + b, 0);
      counters.push({ task, series, total, avg: total / active.length, hits: done, days: active.length });
    }
  }

  const workouts: WorkoutStat = { count: 0, minutes: 0, byType: {} };
  for (const w of s.workouts) {
    if (!dates.includes(w.date)) continue;
    workouts.count++;
    workouts.minutes += w.minutes;
    workouts.byType[w.type] = (workouts.byType[w.type] ?? 0) + 1;
  }

  const best = counted.reduce<DayStats | null>((b, d) => (d.pct > (b?.pct ?? 0) ? d : b), null);

  return {
    days,
    countedDays: counted.length,
    avgPct: mean(counted.map((d) => d.pct)),
    passedDays: counted.filter(passed).length,
    perTask,
    counters,
    workouts,
    best,
  };
}

export interface WeeklyGoal {
  task: Task;
  count: number;
  goal: number;
  met: boolean;
}

export function weeklyGoals(s: AppState, weekStart: string): WeeklyGoal[] {
  const days = weekDays(weekStart);
  return s.tasks
    .filter((t) => t.frequency === 'weekly' && days.some((d) => isActive(t, d)))
    .map((task) => {
      const count = weekCount(s, task, weekStart);
      const goal = task.timesPerWeek ?? 1;
      return { task, count, goal, met: count >= goal };
    });
}

export function weekSummary(s: AppState, weekStart: string, today: string) {
  const cur = rangeStats(s, weekDays(weekStart), today);
  const prev = rangeStats(s, weekDays(addDays(weekStart, -7)), today);
  return { ...cur, weekStart, prevAvgPct: prev.avgPct, goals: weeklyGoals(s, weekStart) };
}

export function monthSummary(s: AppState, year: number, month: number, today: string) {
  const dates = monthDays(year, month);
  const cur = rangeStats(s, dates, today);

  // tygodnie zaczynające się w tym miesiącu, które już trwają lub minęły
  let weeks = 0;
  let weeksMet = 0;
  const seen = new Set<string>();
  for (const d of dates) {
    const ws = startOfWeek(d);
    if (ws !== d || seen.has(ws)) continue;
    seen.add(ws);
    if (ws > today || addDays(ws, 6) < s.settings.startDate) continue;
    const goals = weeklyGoals(s, ws);
    if (!goals.length) continue;
    weeks++;
    if (goals.every((g) => g.met)) weeksMet++;
  }

  return { ...cur, longest: longestStreak(cur.days), weeks, weeksMet };
}

/** Numer dnia wyzwania (1 = dzień startu). Może być < 1 przed startem. */
export function dayNumber(s: AppState, date: string): number {
  return diffDays(s.settings.startDate, date) + 1;
}
