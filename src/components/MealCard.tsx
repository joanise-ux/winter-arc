import { useState } from 'react';
import { fmtNum } from '../lib/dates';
import { GOAL_TOLERANCE, SLOTS, dayTotals, inGoal, kcalGoalOf, mealsOn, rangeMeals, recentMeals, slotForHour } from '../lib/meals';
import { actions, useAppState } from '../lib/store';
import type { Meal, MealSlot } from '../lib/types';
import { Bar, Card, Chips, Sheet, Stat, parseNum } from './ui';

/** 1 posiłek, 2–4 posiłki, 5+ posiłków (z wyjątkiem 12–14). */
function mealsWord(n: number) {
  if (n === 1) return 'posiłek';
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? 'posiłki' : 'posiłków';
}

function MealForm({ date, meal, onClose }: { date: string; meal?: Meal; onClose: () => void }) {
  const s = useAppState();
  const [slot, setSlot] = useState<MealSlot>(meal?.slot ?? slotForHour(new Date().getHours()));
  const [name, setName] = useState(meal?.name ?? '');
  const [kcal, setKcal] = useState(meal ? fmtNum(meal.kcal) : '');
  const [protein, setProtein] = useState(meal?.protein !== undefined ? fmtNum(meal.protein) : '');
  const recent = meal ? [] : recentMeals(s);

  const nKcal = parseNum(kcal);
  const nProtein = protein.trim() ? parseNum(protein) : 0;
  const ok = name.trim().length > 0 && kcal.trim() !== '' && nKcal >= 0 && nKcal <= 5000 && nProtein >= 0 && nProtein <= 500;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const data = { date, slot, name: name.trim(), kcal: Math.round(nKcal), protein: protein.trim() ? Math.round(nProtein * 10) / 10 : undefined };
    if (meal) actions.updateMeal(meal.id, data);
    else actions.addMeal(data);
    onClose();
  };

  return (
    <Sheet title={meal ? 'Popraw posiłek' : 'Nowy posiłek'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {recent.length > 0 && (
          <div className="field">
            <span>Ostatnio jedzone</span>
            <div className="quick">
              {recent.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setName(r.name);
                    setKcal(fmtNum(r.kcal));
                    setProtein(r.protein !== undefined ? fmtNum(r.protein) : '');
                  }}
                >
                  {r.name} <small>{fmtNum(r.kcal)} kcal</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <span>Pora</span>
          <Chips label="Pora posiłku" value={slot} onChange={setSlot} options={SLOTS} />
        </div>
        <label className="field">
          <span>Co zjadłaś / zjadłeś</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="np. owsianka z bananem" />
        </label>
        <div className="field-pair">
          <label className="field">
            <span>Kalorie (kcal)</span>
            <input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="450" />
          </label>
          <label className="field">
            <span>Białko (g)</span>
            <input inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="opcjonalnie" />
          </label>
        </div>
        <button className="primary" disabled={!ok}>
          {meal ? 'Zapisz zmiany' : 'Dodaj posiłek'}
        </button>
        {meal && (
          <button
            type="button"
            className="danger"
            onClick={() => {
              actions.removeMeal(meal.id);
              onClose();
            }}
          >
            Usuń posiłek
          </button>
        )}
      </form>
    </Sheet>
  );
}

export function MealCard({ date, code }: { date: string; code: string }) {
  const s = useAppState();
  const [form, setForm] = useState<{ meal?: Meal } | null>(null);
  const meals = mealsOn(s, date);
  const total = dayTotals(s, date);
  const goal = kcalGoalOf(s);
  const left = goal - total.kcal;

  return (
    <Card code={code} title="Posiłki" aside={<button className="small" onClick={() => setForm({})}>+ Posiłek</button>}>
      <div className="kcal">
        <span className="kcal-v">{fmtNum(total.kcal)}</span>
        <span className="dim">{goal > 0 ? `/ ${fmtNum(goal)} kcal` : 'kcal'}</span>
        {total.protein > 0 && <span className="mono kcal-p">białko {fmtNum(total.protein)} g</span>}
      </div>
      {goal > 0 && (
        <>
          <Bar pct={total.kcal / goal} done={inGoal(total.kcal, goal)} />
          <p className="hint kcal-left">
            {total.count === 0
              ? 'Nic jeszcze nie zapisano.'
              : left >= 0
                ? `Zostało ${fmtNum(left)} kcal do celu.`
                : `${fmtNum(-left)} kcal ponad cel.`}
          </p>
        </>
      )}
      {goal === 0 && total.count === 0 && <p className="hint">Nic jeszcze nie zapisano.</p>}

      {SLOTS.map((slot) => {
        const list = meals.filter((m) => m.slot === slot.id);
        if (!list.length) return null;
        return (
          <div key={slot.id} className="group">
            <h3>
              {slot.label} · {fmtNum(list.reduce((a, m) => a + m.kcal, 0))} kcal
            </h3>
            {list.map((m) => (
              <button key={m.id} className="entry" onClick={() => setForm({ meal: m })} aria-label={`Popraw posiłek: ${m.name}`}>
                <span className="entry-v">{m.name}</span>
                <span className="mono meal-k">
                  {fmtNum(m.kcal)} kcal{m.protein ? ` · ${fmtNum(m.protein)} g` : ''}
                </span>
                <span aria-hidden="true">✎</span>
              </button>
            ))}
          </div>
        );
      })}
      {form && <MealForm date={date} meal={form.meal} onClose={() => setForm(null)} />}
    </Card>
  );
}

/** Karta podsumowania kalorii dla tygodnia lub miesiąca; `chart` dodaje wykres dzień po dniu. */
export function MealSummary({ code, dates, today, chart }: { code: string; dates: string[]; today: string; chart?: boolean }) {
  const s = useAppState();
  const r = rangeMeals(s, dates);
  const shown = r.days.filter((d) => d.date <= today);
  const max = Math.max(r.goal * 1.2, ...shown.map((d) => d.kcal), 1);
  const y = (v: number) => 30 - (v / max) * 28;
  const w = shown.length ? 100 / shown.length : 0;

  return (
    <Card code={code} title="Kalorie i posiłki">
      {r.loggedDays === 0 ? (
        <p className="hint">Brak zapisanych posiłków w tym okresie.</p>
      ) : (
        <>
          <div className="stats">
            <Stat tone="accent" label="Średnio dziennie" value={`${fmtNum(r.avgKcal!)}`} sub={r.goal > 0 ? `kcal · cel ${fmtNum(r.goal)}` : 'kcal'} />
            <Stat label="Dni z wpisami" value={r.loggedDays} sub={`${r.meals} ${mealsWord(r.meals)}`} />
            {r.goal > 0 && <Stat tone="violet" label="Dni w celu" value={`${r.goalDays}/${r.loggedDays}`} sub={`±${GOAL_TOLERANCE * 100}% celu`} />}
            <Stat label="Białko z posiłków" value={`${fmtNum(r.avgProtein!)} g`} sub="średnio dziennie" />
          </div>
          {chart && (
            <div className="spark">
              <div className="line-top">
                <span>Kalorie dzień po dniu</span>
                {r.goal > 0 && <span className="mono dim">cel {fmtNum(r.goal)} kcal</span>}
              </div>
              <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Kalorie w kolejnych dniach">
                {shown.map((d, i) =>
                  d.count ? <rect key={d.date} className={inGoal(d.kcal, r.goal) ? 'k-bar in' : 'k-bar'} x={i * w + w * 0.15} width={w * 0.7} y={y(d.kcal)} height={30 - y(d.kcal)} /> : null,
                )}
                {r.goal > 0 && <line className="spark-t" x1="0" x2="100" y1={y(r.goal)} y2={y(r.goal)} />}
              </svg>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
