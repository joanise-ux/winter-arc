import { useState } from 'react';
import { addDays, fmtNum, fmtShort, isValidKey, todayKey } from '../lib/dates';
import { MEASURES, change, entries, fmtDelta, series, type MeasureKey } from '../lib/measure';
import { actions, useAppState } from '../lib/store';
import type { Measurement } from '../lib/types';
import { Card, Sheet, parseNum } from './ui';

function MeasureForm({ initialDate, onClose }: { initialDate: string; onClose: () => void }) {
  const s = useAppState();
  const today = todayKey();
  const [date, setDate] = useState(initialDate);
  const existing = s.measurements?.[date];
  const [raw, setRaw] = useState<Record<string, string>>(() => fill(s.measurements?.[initialDate]));

  function fill(m: Measurement | undefined) {
    return Object.fromEntries(MEASURES.map((f) => [f.key, m?.[f.key] !== undefined ? fmtNum(m[f.key]!) : '']));
  }

  const parsed: Measurement = {};
  let invalid = false;
  for (const f of MEASURES) {
    const txt = raw[f.key].trim();
    if (!txt) continue;
    const n = parseNum(txt);
    if (Number.isNaN(n) || n < f.min || n > f.max) invalid = true;
    else parsed[f.key] = Math.round(n * 10) / 10;
  }
  const ok = !invalid && Object.keys(parsed).length > 0 && isValidKey(date) && date <= today;

  return (
    <Sheet title={existing ? 'Popraw pomiar' : 'Nowy pomiar'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          actions.setMeasurement(date, parsed);
          onClose();
        }}
      >
        <label className="field">
          <span>Data</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              setDate(e.target.value);
              setRaw(fill(s.measurements?.[e.target.value]));
            }}
          />
        </label>
        <div className="field-grid">
          {MEASURES.map((f) => {
            const last = series(s, f.key).filter((p) => p.date !== date).pop();
            return (
              <label key={f.key} className="field">
                <span>
                  {f.label} ({f.unit})
                </span>
                <input inputMode="decimal" value={raw[f.key]} placeholder={last ? fmtNum(last.value) : '—'} onChange={(e) => setRaw({ ...raw, [f.key]: e.target.value })} />
              </label>
            );
          })}
        </div>
        <p className="hint">{invalid ? 'Sprawdź wartości — któraś jest poza zakresem.' : 'Wypełnij tylko to, co mierzysz. Mierz o tej samej porze, najlepiej rano.'}</p>
        <button className="primary" disabled={!ok}>
          Zapisz pomiar
        </button>
        {existing && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              actions.deleteMeasurement(date);
              onClose();
            }}
          >
            Usuń pomiar z {fmtShort(date)}
          </button>
        )}
      </form>
    </Sheet>
  );
}

export function MeasureCard({ weekStart, today }: { weekStart: string; today: string }) {
  const s = useAppState();
  const [form, setForm] = useState<string | null>(null);
  const all = entries(s);
  const weekEnd = addDays(weekStart, 6);
  const inWeek = all.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  const canAdd = weekStart <= today;
  // domyślna data formularza: dziś w bieżącym tygodniu, w starszym — jego ostatni dzień
  const defaultDate = today <= weekEnd ? today : weekEnd;

  return (
    <Card code="W5" title="Pomiary" aside={canAdd ? <button className="small" onClick={() => setForm(defaultDate)}>+ Pomiar</button> : undefined}>
      {all.length === 0 ? (
        <p className="hint">Zapisuj wagę i obwody raz w tygodniu — zobaczysz zmianę od startu i trend w miesiącu.</p>
      ) : (
        <>
          <div className="measures">
            {MEASURES.map((f) => {
              const c = change(series(s, f.key));
              if (!c) return null;
              return (
                <div key={f.key} className="measure">
                  <span className="stat-l">{f.label}</span>
                  <span className="measure-v">
                    {fmtNum(c.last.value)} <small>{f.unit}</small>
                  </span>
                  <span className="stat-s">{c.delta === null ? `wpis z ${fmtShort(c.last.date)}` : `${fmtDelta(c.delta)} ${f.unit} od startu`}</span>
                </div>
              );
            })}
          </div>

          <h3 className="sub">W tym tygodniu</h3>
          {inWeek.length === 0 && <p className="hint">Brak pomiaru w tym tygodniu.</p>}
          {inWeek.map((e) => (
            <button key={e.date} className="entry" onClick={() => setForm(e.date)} aria-label={`Popraw pomiar z ${fmtShort(e.date)}`}>
              <span className="mono">{fmtShort(e.date)}</span>
              <span className="entry-v">
                {MEASURES.filter((f) => e.values[f.key] !== undefined)
                  .map((f) => `${f.label.toLowerCase()} ${fmtNum(e.values[f.key as MeasureKey]!)}`)
                  .join(' · ')}
              </span>
              <span aria-hidden="true">✎</span>
            </button>
          ))}
        </>
      )}
      {form && <MeasureForm initialDate={form} onClose={() => setForm(null)} />}
    </Card>
  );
}
