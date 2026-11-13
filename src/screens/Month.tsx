import { useState } from 'react';
import { Card, PeriodNav, Stat, pctText } from '../components/ui';
import { DOW_SHORT, fmtMonth, fmtNum, parseKey } from '../lib/dates';
import { PASS, monthSummary, type CounterStat } from '../lib/stats';
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

      <Card code="M5" title="Treningi">
        <WorkoutSummary w={m.workouts} />
      </Card>
    </>
  );
}
