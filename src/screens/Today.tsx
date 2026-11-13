import { useState } from 'react';
import { Bar, Card, Chips, PeriodNav, Ring, Sheet, parseNum } from '../components/ui';
import { addDays, fmtDay, fmtNum, fmtShort, startOfWeek } from '../lib/dates';
import { PASS, currentStreak, dayNumber, dayStats, hasWorkout, isDone, tasksOn, valueOf, weekCount } from '../lib/stats';
import { actions, useAppState } from '../lib/store';
import { CATEGORIES, CATEGORY_LABEL, WORKOUT_LABEL, WORKOUT_TYPES, type Task, type WorkoutType } from '../lib/types';

function Counter({ task, date }: { task: Task; date: string }) {
  const s = useAppState();
  const v = valueOf(s, task, date);
  const target = task.target ?? 1;
  const step = task.step ?? 1;
  const done = v >= target;
  const commit = (raw: string) => {
    const n = parseNum(raw);
    if (!Number.isNaN(n)) actions.setValue(date, task.id, n);
  };
  return (
    <div className={`counter ${done ? 'done' : ''}`}>
      <div className="counter-top">
        <span className="mono">{task.title.toUpperCase()}</span>
        {done && <span className="tag">CEL</span>}
      </div>
      <div className="counter-val">
        <input
          key={v}
          defaultValue={fmtNum(v)}
          inputMode="decimal"
          aria-label={`${task.title} — wartość`}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <span className="dim">
          / {fmtNum(target)} {task.unit}
        </span>
      </div>
      <Bar pct={v / target} done={done} />
      <div className="counter-btns">
        <button onClick={() => actions.setValue(date, task.id, v - step)} disabled={v <= 0} aria-label={`${task.title}: odejmij ${fmtNum(step)}`}>
          −
        </button>
        <button onClick={() => actions.setValue(date, task.id, v + step)} aria-label={`${task.title}: dodaj ${fmtNum(step)}`}>
          + {fmtNum(step)}
        </button>
      </div>
    </div>
  );
}

function CheckRow({ task, date, extra }: { task: Task; date: string; extra?: React.ReactNode }) {
  const s = useAppState();
  const done = isDone(s, task, date);
  const auto = task.auto === 'workout' && hasWorkout(s, date);
  return (
    <label className={`row ${done ? 'done' : ''}`}>
      <input type="checkbox" checked={done} disabled={auto} onChange={() => actions.toggle(date, task.id)} />
      <span className="box" aria-hidden="true" />
      <span className="row-t">{task.title}</span>
      {extra}
    </label>
  );
}

function WorkoutSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const [type, setType] = useState<WorkoutType>('strength');
  const [minutes, setMinutes] = useState('60');
  const [note, setNote] = useState('');
  const m = parseNum(minutes);
  const ok = m > 0 && m <= 600;
  return (
    <Sheet title="Nowy trening" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          actions.addWorkout({ date, type, minutes: Math.round(m), note: note.trim() || undefined });
          onClose();
        }}
      >
        <div className="field">
          <span>Rodzaj</span>
          <Chips label="Rodzaj treningu" value={type} onChange={setType} options={WORKOUT_TYPES.map((id) => ({ id, label: WORKOUT_LABEL[id] }))} />
        </div>
        <label className="field">
          <span>Czas (minuty)</span>
          <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label className="field">
          <span>Notatka (opcjonalnie)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. nogi, 5 km, joga" maxLength={80} />
        </label>
        <button className="primary" disabled={!ok}>
          Zapisz trening
        </button>
      </form>
    </Sheet>
  );
}

export function Today({ today }: { today: string }) {
  const s = useAppState();
  const [date, setDate] = useState(today);
  const [sheet, setSheet] = useState(false);

  const { startDate, length } = s.settings;
  const stats = dayStats(s, date, today);
  const streak = currentStreak(s, today);
  const no = dayNumber(s, date);
  const daily = tasksOn(s, date, 'daily');
  const counters = daily.filter((t) => t.kind === 'counter');
  const checks = daily.filter((t) => t.kind === 'check');
  const weekly = tasksOn(s, date, 'weekly');
  const weekStart = startOfWeek(date);
  const workouts = s.workouts.filter((w) => w.date === date);
  const notStarted = date < startDate;

  return (
    <>
      <PeriodNav
        label={date === today ? `Dziś · ${fmtDay(date)}` : fmtDay(date)}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        canPrev={date > startDate}
        canNext={date < today}
      />

      <Card className="hero">
        <div className="hero-main">
          <span className="mono dim">{notStarted ? 'START ZA' : no > length ? 'PO WYZWANIU · DZIEŃ' : 'DZIEŃ'}</span>
          <div className="hero-num">
            {String(notStarted ? 1 - no : no).padStart(2, '0')}
            <small>{notStarted ? ' dni' : `/${length}`}</small>
          </div>
          <div className="hero-meta">
            <span className="streak">
              <b>{streak}</b> {streak === 1 ? 'dzień serii' : 'dni serii'}
            </span>
            <span className="dim">zaliczone od {Math.round(PASS * 100)}%</span>
          </div>
        </div>
        <Ring pct={stats.pct}>
          <b>{Math.round(stats.pct * 100)}%</b>
          <span>
            {stats.done}/{stats.total}
          </span>
        </Ring>
        <div className="arc" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.max(0, (no / length) * 100))}%` }} />
        </div>
      </Card>

      {notStarted && <p className="empty">Wyzwanie zaczyna się {fmtShort(startDate)}. Datę startu zmienisz w Opcjach.</p>}

      {counters.length > 0 && (
        <Card code="01" title="Liczniki">
          <div className="counters">
            {counters.map((t) => (
              <Counter key={t.id} task={t} date={date} />
            ))}
          </div>
        </Card>
      )}

      {checks.length > 0 && (
        <Card code="02" title="Zadania dnia" aside={<span className="mono dim">{checks.filter((t) => isDone(s, t, date)).length}/{checks.length}</span>}>
          {CATEGORIES.map((c) => {
            const list = checks.filter((t) => t.category === c);
            if (!list.length) return null;
            return (
              <div key={c} className="group">
                <h3>{CATEGORY_LABEL[c]}</h3>
                {list.map((t) => (
                  <CheckRow key={t.id} task={t} date={date} />
                ))}
              </div>
            );
          })}
        </Card>
      )}

      {weekly.length > 0 && (
        <Card code="03" title="Wyzwania tygodnia">
          {weekly.map((t) => {
            const goal = t.timesPerWeek ?? 1;
            const count = weekCount(s, t, weekStart);
            return (
              <CheckRow
                key={t.id}
                task={t}
                date={date}
                extra={
                  <span className={`pips ${count >= goal ? 'met' : ''}`} aria-label={`${count} z ${goal} w tym tygodniu`}>
                    {Array.from({ length: Math.max(goal, count) }, (_, i) => (
                      <i key={i} className={i < count ? 'on' : ''} />
                    ))}
                    <span className="mono">
                      {count}/{goal}
                    </span>
                  </span>
                }
              />
            );
          })}
        </Card>
      )}

      {!notStarted && (
        <Card code="04" title="Trening" aside={<button className="small" onClick={() => setSheet(true)}>+ Dodaj</button>}>
          {workouts.length === 0 ? (
            <p className="hint">Brak treningu w tym dniu.</p>
          ) : (
            workouts.map((w) => (
              <div key={w.id} className="row static">
                <span className="tag">{WORKOUT_LABEL[w.type]}</span>
                <span className="row-t">
                  {w.minutes} min{w.note ? ` · ${w.note}` : ''}
                </span>
                <button className="ghost" onClick={() => actions.removeWorkout(w.id)} aria-label="Usuń trening">
                  ✕
                </button>
              </div>
            ))
          )}
        </Card>
      )}

      {sheet && <WorkoutSheet date={date} onClose={() => setSheet(false)} />}
    </>
  );
}
