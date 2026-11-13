export type Category = 'body' | 'diet' | 'mind' | 'sleep' | 'routine';
export type WorkoutType = 'strength' | 'cardio' | 'home' | 'mobility';

export interface Task {
  id: string;
  title: string;
  category: Category;
  /** check = odhaczane, counter = licznik z celem dziennym */
  kind: 'check' | 'counter';
  target?: number;
  unit?: string;
  step?: number;
  frequency: 'daily' | 'weekly';
  timesPerWeek?: number;
  /** zadanie zalicza się samo, gdy danego dnia zapisano trening */
  auto?: 'workout';
  /** pierwszy dzień obowiązywania (YYYY-MM-DD) */
  createdAt: string;
  /** pierwszy dzień, w którym zadanie już NIE obowiązuje */
  archivedAt?: string;
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  minutes: number;
  note?: string;
}

export interface Reminder {
  id: string;
  /** HH:MM, czas lokalny */
  time: string;
  label: string;
}

/** Pomiary ciała z jednego dnia; każde pole opcjonalne. Waga w kg, obwody w cm. */
export interface Measurement {
  weight?: number;
  waist?: number;
  hips?: number;
  chest?: number;
  thigh?: number;
  arm?: number;
}

export interface AppState {
  version: 1;
  settings: { startDate: string; length: number; reminders?: Reminder[] };
  tasks: Task[];
  log: Record<string, Record<string, number>>;
  workouts: Workout[];
  measurements?: Record<string, Measurement>;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  body: 'Ciało',
  diet: 'Dieta',
  mind: 'Umysł',
  sleep: 'Sen',
  routine: 'Rutyna',
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export const WORKOUT_LABEL: Record<WorkoutType, string> = {
  strength: 'Siła',
  cardio: 'Cardio',
  home: 'Dom',
  mobility: 'Mobilność',
};
export const WORKOUT_TYPES = Object.keys(WORKOUT_LABEL) as WorkoutType[];
