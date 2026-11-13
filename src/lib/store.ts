import { useSyncExternalStore } from 'react';
import { isValidKey, todayKey } from './dates';
import { defaultState } from './defaults';
import type { AppState, Measurement, Reminder, Task, Workout } from './types';

const KEY = 'winter-arc:v1';

export function isAppState(x: unknown): x is AppState {
  const s = x as AppState;
  return (
    !!s &&
    typeof s === 'object' &&
    s.version === 1 &&
    !!s.settings &&
    isValidKey(s.settings.startDate) &&
    typeof s.settings.length === 'number' &&
    Array.isArray(s.tasks) &&
    s.tasks.every((t) => t && typeof t.id === 'string' && typeof t.title === 'string' && isValidKey(t.createdAt)) &&
    !!s.log &&
    typeof s.log === 'object' &&
    Array.isArray(s.workouts)
  );
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    }
  } catch {
    /* brak dostępu do pamięci — startujemy od zera */
  }
  return defaultState(todayKey());
}

let state: AppState = load();
const listeners = new Set<() => void>();

function set(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* pamięć niedostępna — stan zostaje tylko w tej sesji */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const getState = () => state;
export const useAppState = () => useSyncExternalStore(subscribe, getState);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round = (n: number) => Math.round(n * 100) / 100;

export const actions = {
  setValue(date: string, taskId: string, value: number) {
    const v = Math.max(0, round(Number.isFinite(value) ? value : 0));
    const day = { ...(state.log[date] ?? {}) };
    if (v === 0) delete day[taskId];
    else day[taskId] = v;
    const log = { ...state.log, [date]: day };
    if (!Object.keys(day).length) delete log[date];
    set({ ...state, log });
  },

  toggle(date: string, taskId: string) {
    actions.setValue(date, taskId, (state.log[date]?.[taskId] ?? 0) >= 1 ? 0 : 1);
  },

  addTask(task: Omit<Task, 'id' | 'createdAt'>) {
    // nowe zadanie obowiązuje od dziś, żeby nie zaniżać wcześniejszych dni
    const createdAt = todayKey() < state.settings.startDate ? state.settings.startDate : todayKey();
    set({ ...state, tasks: [...state.tasks, { ...task, id: uid(), createdAt }] });
  },

  updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    set({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  },

  /** Usuwa zadanie od dziś; wcześniejsze dni i podsumowania zostają. */
  archiveTask(id: string) {
    const today = todayKey();
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.createdAt >= today) return actions.deleteTask(id);
    set({ ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, archivedAt: today } : t)) });
  },

  /** Usuwa zadanie razem z całą historią. */
  deleteTask(id: string) {
    const log: AppState['log'] = {};
    for (const [date, day] of Object.entries(state.log)) {
      const { [id]: _gone, ...rest } = day;
      if (Object.keys(rest).length) log[date] = rest;
    }
    set({ ...state, tasks: state.tasks.filter((t) => t.id !== id), log });
  },

  addWorkout(w: Omit<Workout, 'id'>) {
    set({ ...state, workouts: [...state.workouts, { ...w, id: uid() }] });
  },

  removeWorkout(id: string) {
    set({ ...state, workouts: state.workouts.filter((w) => w.id !== id) });
  },

  setStartDate(startDate: string) {
    const old = state.settings.startDate;
    set({
      ...state,
      settings: { ...state.settings, startDate },
      // zadania obowiązujące od dawnego startu (lub wcześniej niż nowy) przesuwają się razem z nim
      tasks: state.tasks.map((t) => (t.createdAt === old || t.createdAt < startDate ? { ...t, createdAt: startDate } : t)),
    });
  },

  setReminders(reminders: Reminder[]) {
    set({ ...state, settings: { ...state.settings, reminders } });
  },

  /** Jeden wpis na dzień — ponowny zapis nadpisuje. */
  setMeasurement(date: string, values: Measurement) {
    set({ ...state, measurements: { ...state.measurements, [date]: values } });
  },

  deleteMeasurement(date: string) {
    const { [date]: _gone, ...rest } = state.measurements ?? {};
    set({ ...state, measurements: rest });
  },

  importState(next: AppState) {
    set(next);
  },

  reset() {
    set(defaultState(todayKey()));
  },
};
