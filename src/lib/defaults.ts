import type { AppState, Task } from './types';

type Seed = Omit<Task, 'createdAt'>;

const SEED: Seed[] = [
  { id: 'water', title: 'Woda', category: 'diet', kind: 'counter', target: 3, unit: 'l', step: 0.25, frequency: 'daily' },
  { id: 'protein', title: 'Białko', category: 'diet', kind: 'counter', target: 120, unit: 'g', step: 10, frequency: 'daily' },
  { id: 'steps', title: 'Kroki', category: 'body', kind: 'counter', target: 10000, unit: 'kroków', step: 1000, frequency: 'daily' },
  { id: 'sleep', title: 'Sen', category: 'sleep', kind: 'counter', target: 8, unit: 'h', step: 0.5, frequency: 'daily' },

  { id: 'stretch', title: 'Poranne rozciąganie', category: 'body', kind: 'check', frequency: 'daily' },
  { id: 'no-fast-food', title: 'Bez fast foodów', category: 'diet', kind: 'check', frequency: 'daily' },
  { id: 'journal', title: 'Dziennik — 5 minut', category: 'mind', kind: 'check', frequency: 'daily' },
  { id: 'read', title: '10 stron książki', category: 'mind', kind: 'check', frequency: 'daily' },
  { id: 'no-screen', title: 'Bez ekranu po 21:00', category: 'sleep', kind: 'check', frequency: 'daily' },
  { id: 'bed', title: 'W łóżku do 22:00', category: 'sleep', kind: 'check', frequency: 'daily' },
  { id: 'skincare-am', title: 'Skincare rano', category: 'routine', kind: 'check', frequency: 'daily' },
  { id: 'skincare-pm', title: 'Skincare wieczorem', category: 'routine', kind: 'check', frequency: 'daily' },
  { id: 'tidy', title: '15 minut sprzątania', category: 'routine', kind: 'check', frequency: 'daily' },

  { id: 'workout', title: 'Trening', category: 'body', kind: 'check', frequency: 'weekly', timesPerWeek: 4, auto: 'workout' },
  { id: 'wake', title: 'Pobudka przed 8:00', category: 'sleep', kind: 'check', frequency: 'weekly', timesPerWeek: 2 },
  { id: 'me-time', title: 'Dzień „me time”', category: 'mind', kind: 'check', frequency: 'weekly', timesPerWeek: 1 },
];

export function defaultState(startDate: string): AppState {
  return {
    version: 1,
    settings: { startDate, length: 90 },
    tasks: SEED.map((t) => ({ ...t, createdAt: startDate })),
    log: {},
    workouts: [],
  };
}
