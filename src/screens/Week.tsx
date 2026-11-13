import { useState } from 'react';
import { MealSummary } from '../components/MealCard';
import { MeasureCard } from '../components/MeasureCard';
import { PhotoCard } from '../components/PhotoCard';
import { Bar, Card, PeriodNav, Stat, pctText } from '../components/ui';
import { DOW_SHORT, addDays, fmtNum, fmtShort, parseKey, startOfWeek } from '../lib/dates';
import { PASS, weekSummary, type CounterStat, type TaskRate, type WorkoutStat } from '../lib/stats';
import { useAppState } from '../lib/store';
import { WORKOUT_LABEL, WORKOUT_TYPES } from '../lib/types';

export function CounterList({ counters }: { counters: CounterStat[] }) {
  if (!counters.length) return <p className="hint">Brak danych w tym okresie.</p>;
  return (
    <>
      {counters.map((c) => (
        <div key={c.task.id} className="line">
          <div className="line-top">
            <span>{c.task.title}</span>
            <span className="mono">
              śr. {fmtNum((c.task.target ?? 1) >= 100 ? Math.round(c.avg) : Math.round(c.avg * 10) / 10)} {c.task.unit} <span className="dim">· cel {c.hits}/{c.days} dni</span>
            </span>
          </div>
          <Bar pct={c.avg / (c.task.target ?? 1)} done={c.avg >= (c.task.target ?? 1)} />
        </div>
      ))}
    </>
  );
}

export function TaskRates({ rates }: { rates: TaskRate[] }) {
  if (!rates.length) return <p className="hint">Brak danych w tym okresie.</p>;
  return (
    <>
      {rates.map((r) => (
        <div key={r.task.id} className="line">
          <div className="line-top">
            <span className={r.task.archivedAt ? 'dim' : ''}>{r.task.title}</span>
            <span className="mono">
              {r.done}/{r.possible}
            </span>
          </div>
          <Bar pct={r.rate} done={r.rate >= PASS} />
        </div>
      ))}
    </>
  );
}

export function WorkoutSummary({ w }: { w: WorkoutStat }) {
  if (!w.count) return <p className="hint">Brak zapisanych treningów.</p>;
  return (
    <div className="wk">
      <Stat label="Treningi" value={w.count} />
      <Stat label="Łączny czas" value={`${Math.floor(w.minutes / 60)} h ${w.minutes % 60} min`} />
      <div className="wk-types">
        {WORKOUT_TYPES.filter((t) => w.byType[t]).map((t) => (
          <span key={t} className="tag">
            {WORKOUT_LABEL[t]} × {w.byType[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Week({ today }: { today: string }) {
  const s = useAppState();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const w = weekSummary(s, weekStart, today);
  const delta = w.avgPct !== null && w.prevAvgPct !== null ? Math.round((w.avgPct - w.prevAvgPct) * 100) : null;

  return (
    <>
      <PeriodNav
        label={`${fmtShort(weekStart)} – ${fmtShort(addDays(weekStart, 6))}`}
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        canPrev={weekStart > s.settings.startDate}
        canNext={addDays(weekStart, 7) <= today}
      />

      <Card code="W" title="Podsumowanie tygodnia">
        <div className="stats">
          <Stat
            tone="accent"
            label="Średnie wykonanie"
            value={pctText(w.avgPct)}
            sub={delta === null ? 'brak porównania' : `${delta > 0 ? '+' : ''}${delta} pkt proc. vs poprzedni`}
          />
          <Stat tone="violet" label="Dni zaliczone" value={`${w.passedDays}/${w.countedDays}`} sub={w.best && w.best.pct > 0 ? `najlepszy: ${parseKey(w.best.date).toLocaleDateString('pl-PL', { weekday: 'long' })}` : undefined} />
        </div>

        <div className="chart" role="img" aria-label="Wykonanie zadań w kolejnych dniach tygodnia">
          <div className="chart-line">
            <span>{PASS * 100}%</span>
          </div>
          {w.days.map((d, i) => (
            <div key={d.date} className={`col ${d.counted ? '' : 'off'} ${d.date === today ? 'now' : ''}`}>
              <span className="col-v">{d.counted ? Math.round(d.pct * 100) : ''}</span>
              <div className="col-b">
                <i className={d.pct >= PASS ? 'pass' : ''} style={{ height: d.counted ? `${Math.max(2, d.pct * 100)}%` : '2%' }} />
              </div>
              <span className="col-l">{DOW_SHORT[i]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card code="W1" title="Wyzwania tygodnia">
        {w.goals.length === 0 ? (
          <p className="hint">Brak wyzwań tygodniowych.</p>
        ) : (
          w.goals.map((g) => (
            <div key={g.task.id} className="line">
              <div className="line-top">
                <span>{g.task.title}</span>
                <span className="mono">
                  {g.count}/{g.goal} {g.met && <span className="tag">OK</span>}
                </span>
              </div>
              <Bar pct={g.count / g.goal} done={g.met} />
            </div>
          ))
        )}
      </Card>

      <Card code="W2" title="Liczniki — średnia dzienna">
        <CounterList counters={w.counters} />
      </Card>

      <Card code="W3" title="Treningi">
        <WorkoutSummary w={w.workouts} />
      </Card>

      <Card code="W4" title="Zadania dzienne">
        <TaskRates rates={w.perTask.filter((r) => r.task.kind === 'check')} />
      </Card>

      <MealSummary code="W5" dates={w.days.map((d) => d.date)} today={today} />

      <MeasureCard weekStart={weekStart} today={today} />

      <PhotoCard weekStart={weekStart} today={today} onJump={setWeekStart} />
    </>
  );
}
