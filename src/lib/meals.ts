import type { AppState, Meal, MealSlot } from './types';

export const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Śniadanie' },
  { id: 'lunch', label: 'Obiad' },
  { id: 'dinner', label: 'Kolacja' },
  { id: 'snack', label: 'Przekąska' },
];

export const DEFAULT_KCAL_GOAL = 2000;
/** Dzień „w celu”, gdy suma mieści się w ±10% celu. */
export const GOAL_TOLERANCE = 0.1;

/** Dzienny cel kalorii; 0 oznacza „bez celu”. */
export const kcalGoalOf = (s: AppState): number => s.settings.kcalGoal ?? DEFAULT_KCAL_GOAL;

export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

export const mealsOn = (s: AppState, date: string): Meal[] => (s.meals ?? []).filter((m) => m.date === date);

export function dayTotals(s: AppState, date: string) {
  const meals = mealsOn(s, date);
  return {
    count: meals.length,
    kcal: meals.reduce((a, m) => a + m.kcal, 0),
    protein: Math.round(meals.reduce((a, m) => a + (m.protein ?? 0), 0) * 10) / 10,
  };
}

export const proteinOn = (s: AppState, date: string): number => dayTotals(s, date).protein;

export const inGoal = (kcal: number, goal: number) => goal > 0 && Math.abs(kcal - goal) <= goal * GOAL_TOLERANCE;

/** Podsumowanie zakresu dat; średnie liczone tylko z dni, w których coś zapisano. */
export function rangeMeals(s: AppState, dates: string[]) {
  const goal = kcalGoalOf(s);
  const days = dates.map((date) => ({ date, ...dayTotals(s, date) }));
  const logged = days.filter((d) => d.count > 0);
  const n = logged.length;
  return {
    goal,
    days,
    loggedDays: n,
    meals: logged.reduce((a, d) => a + d.count, 0),
    avgKcal: n ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / n) : null,
    avgProtein: n ? Math.round(logged.reduce((a, d) => a + d.protein, 0) / n) : null,
    goalDays: logged.filter((d) => inGoal(d.kcal, goal)).length,
  };
}

/** Ostatnio zapisane posiłki bez powtórek nazw — do szybkiego dodawania. */
export function recentMeals(s: AppState, limit = 6): Meal[] {
  const seen = new Set<string>();
  const out: Meal[] = [];
  const all = s.meals ?? [];
  for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
    const key = all[i].name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(all[i]);
  }
  return out;
}
