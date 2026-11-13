import { useState } from 'react';
import { Card, PeriodNav, Stat, pctText } from '../components/ui';
import { DOW_SHORT, fmtMonth, fmtNum, fmtShort, parseKey } from '../lib/dates';
import { MEASURES, change, fmtDelta, series } from '../lib/measure';
import { PASS, monthSummary, type CounterStat } from '../lib/stats';
import type { AppState } from '../lib/types';
import { useAppState } from '../lib/store';
import { CounterList, TaskRates, WorkoutSummary } from './Week';

function Spark({ c }: { c: CounterStat }) {
  const target = c.task.target ?? 1;
  const max = Math.max(target * 1.2, ...c.series);
  const n = c.series.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 30 - (v / max) * 28;
  return (
    <div className="spark">
      <div className="line-top">
        <span>{c.task.title}</span>
        <span className="mono dim">
          cel {fmtNum(target)} {c.task.unit}
        </span>
      </div>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`Trend: ${c.task.title}`}>
        <line className="spark-t" x1="0" x2="100" y1={y(target)} y2={y(target)} />
        {n > 1 ? <polyline points={c.series.map((v, i) => `${x(i)},${y(v)}`).join(' ')} /> : <circle cx="50" cy={y(c.series[0])} r="1.5" />}
      </svg>
    </div>
  );
}

function BodyCard({ s, from, to }: { s: AppState; from: string; to: string }) {
  const weight = series(s, 'weight');
  const rows = MEASURES.map((f) => ({ f, c: change(series(s, f.key, from, to)) })).filter((r) => r.c);
  if (!weight.length && !rows.length) return null;

  const vals = weight.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = Math.max(0.5, (hi - lo) * 0.15);
  const n = weight.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 30 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 28;

  return (
    <Card code="M5" title="Waga i wymiary">
      {n > 0 && (
        <div className="spark first">
          <div className="line-top">
            <span>Waga — całe wyzwanie</span>
            <span className="mono dim">
              {fmtNum(lo)}–{fmtNum(hi)} kg
            </span>
          </div>
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Wykres wagi w czasie">
            {n > 1 ? <polyline points={weight.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} /> : <circle cx="50" cy="16" r="1.5" />}
          </svg>
          <div className="line-top mono dim">
            <span>{fmtShort(weight[0].date)}</span>
            <span>{fmtShort(weight[n - 1].date)}</span>
          </div>
        </div>
      )}
      <h3 className="sub">Zmiana w tym miesiącu</h3>
      {rows.length === 0 && <p className="hint">Brak pomiarów w tym miesiącu.</p>}
      {rows.map(({ f, c }) => (
        <div key={f.key} className="line">
          <div className="line-top">
            <span>{f.label}</span>
            <span className="mono">
              {c!.delta === null ? (
                <>
                  {fmtNum(c!.last.value)} {f.unit} <span className="dim">· 1 wpis</span>
                </>
              ) : (
                <>
                  {fmtNum(c!.first.value)} → {fmtNum(c!.last.value)} {f.unit} <span className={c!.delta === 0 ? 'dim' : 'delta'}>{fmtDelta(c!.delta)}</span>
                </>
              )}
            </span>
          </div>
        </div>
      ))}
    </Card>
  );
}

export function Month({ today }: { today: string }) {
  const s = useAppState();
  const t = parseKey(today);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const m = monthSummary(s, ym.y, ym.m, today);
  const start = parseKey(s.settings.startDate);

  const shift = (d: number) => {
    const next = new Date(ym.y, ym.m + d, 1, 12);
    setYm({ y: next.getFullYear(), m: next.getMonth() });
  };
  const lead = (parseKey(m.days[0].date).getDay() + 6) % 7;
  const checks = m.perTask.filter((r) => r.task.kind === 'check').sort((a, b) => b.rate - a.rate);
  const strong = checks.slice(0, 3);
  const weak = checks.length > 3 ? checks.slice(-3).reverse() : [];

  return (
    <>
      <PeriodNav
        label={fmtMonth(ym.y, ym.m)}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        canPrev={ym.y > start.getFullYear() || (ym.y === start.getFullYear() && ym.m > start.getMonth())}
        canNext={ym.y < t.getFullYear() || (ym.y === t.getFullYear() && ym.m < t.getMonth())}
      />

      <Card code="M" title="Podsumowanie miesiąca">
        <div className="stats four">
          <Stat tone="accent" label="Średnie wykonanie" value={pctText(m.avgPct)} />
          <Stat label="Dni zaliczone" value={`${m.passedDays}/${m.countedDays}`} />
          <Stat tone="violet" label="Najdłuższa seria" value={m.longest} sub="dni z rzędu" />
          <Stat label="Tygodnie z kompletem wyzwań" value={m.weeks ? `${m.weeksMet}/${m.weeks}` : '—'} />
        </div>
      </Card>

      <Card code="M1" title="Kalendarz">
        <div className="heat" role="img" aria-label="Kalendarz wykonania zadań w miesiącu">
          {DOW_SHORT.map((d) => (
            <span key={d} className="heat-h">
              {d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {m.days.map((d) => (
            <span
              key={d.date}
              className={`cell ${d.counted ? '' : 'off'} ${d.counted && d.pct >= PASS ? 'pass' : ''} ${d.date === today ? 'now' : ''}`}
              style={d.counted ? ({ '--a': 0.08 + d.pct * 0.92 } as React.CSSProperties) : undefined}
              title={d.counted ? `${Math.round(d.pct * 100)}%` : undefined}
            >
              {Number(d.date.slice(8))}
            </span>
          ))}
        </div>
        <div className="legend">
          <span>0%</span>
          <i style={{ '--a': 0.08 } as React.CSSProperties} />
          <i style={{ '--a': 0.4 } as React.CSSProperties} />
          <i style={{ '--a': 0.7 } as React.CSSProperties} />
          <i style={{ '--a': 1 } as React.CSSProperties} />
          <span>100%</span>
          <span className="legend-pass">
            <i className="pass" /> dzień zaliczony
          </span>
        </div>
      </Card>

      <Card code="M2" title="Najmocniejsze nawyki">
        <TaskRates rates={strong} />
      </Card>

      {weak.length > 0 && (
        <Card code="M3" title="Do poprawy">
          <TaskRates rates={weak} />
        </Card>
      )}

      <Card code="M4" title="Liczniki — średnia i trend">
        <CounterList counters={m.counters} />
        {m.counters.map((c) => (
          <Spark key={c.task.id} c={c} />
        ))}
      </Card>

      <BodyCard s={s} from={m.days[0].date} to={m.days[m.days.length - 1].date} />

      <Card code="M6" title="Treningi">
        <WorkoutSummary w={m.workouts} />
      </Card>
    </>
  );
}
