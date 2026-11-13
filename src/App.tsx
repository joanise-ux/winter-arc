import { useEffect, useState } from 'react';
import { todayKey } from './lib/dates';
import { Month } from './screens/Month';
import { Settings } from './screens/Settings';
import { Tasks } from './screens/Tasks';
import { Today } from './screens/Today';
import { Week } from './screens/Week';

type Tab = 'today' | 'week' | 'month' | 'tasks' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Dziś', icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z' },
  { id: 'week', label: 'Tydzień', icon: 'M5 20V11M12 20V4M19 20v-6' },
  { id: 'month', label: 'Miesiąc', icon: 'M4 5h16v15H4zM4 10h16M9 5v15M15 5v15' },
  { id: 'tasks', label: 'Zadania', icon: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2' },
  { id: 'settings', label: 'Opcje', icon: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4' },
];

/** Dzisiejsza data, odświeżana po powrocie do aplikacji (np. po północy). */
function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const tick = () => setToday(todayKey());
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    const id = window.setInterval(tick, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
      window.clearInterval(id);
    };
  }, []);
  return today;
}

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const today = useToday();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="kanji" aria-hidden="true">冬</span>
          <span>WINTER ARC</span>
        </div>
        <span className="mono dim">SYS.90 / v1</span>
      </header>

      <main>
        {tab === 'today' && <Today key={today} today={today} />}
        {tab === 'week' && <Week today={today} />}
        {tab === 'month' && <Month today={today} />}
        {tab === 'tasks' && <Tasks />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="nav" aria-label="Główna nawigacja">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
