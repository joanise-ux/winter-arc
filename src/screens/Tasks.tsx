import { useState } from 'react';
import { Card, Chips, Sheet, parseNum } from '../components/ui';
import { fmtNum } from '../lib/dates';
import { actions, useAppState } from '../lib/store';
import { CATEGORIES, CATEGORY_LABEL, type Category, type Task } from '../lib/types';

type Mode = 'daily' | 'weekly' | 'counter';
const MODES: { id: Mode; label: string }[] = [
  { id: 'daily', label: 'Dzienne' },
  { id: 'weekly', label: 'Tygodniowe' },
  { id: 'counter', label: 'Licznik' },
];
const modeOf = (t: Task): Mode => (t.kind === 'counter' ? 'counter' : t.frequency);

function TaskForm({ task, initialMode, onClose }: { task?: Task; initialMode: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(task ? modeOf(task) : initialMode);
  const [title, setTitle] = useState(task?.title ?? '');
  const [category, setCategory] = useState<Category>(task?.category ?? 'body');
  const [times, setTimes] = useState(String(task?.timesPerWeek ?? 3));
  const [target, setTarget] = useState(task?.target !== undefined ? fmtNum(task.target) : '');
  const [unit, setUnit] = useState(task?.unit ?? '');
  const [step, setStep] = useState(task?.step !== undefined ? fmtNum(task.step) : '1');

  const nTimes = parseNum(times);
  const nTarget = parseNum(target);
  const nStep = parseNum(step);
  const ok =
    title.trim().length > 0 &&
    (mode !== 'weekly' || (Number.isInteger(nTimes) && nTimes >= 1 && nTimes <= 7)) &&
    (mode !== 'counter' || (nTarget > 0 && nStep > 0));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const data = {
      title: title.trim(),
      category,
      kind: mode === 'counter' ? ('counter' as const) : ('check' as const),
      frequency: mode === 'weekly' ? ('weekly' as const) : ('daily' as const),
      timesPerWeek: mode === 'weekly' ? nTimes : undefined,
      target: mode === 'counter' ? nTarget : undefined,
      unit: mode === 'counter' ? unit.trim() : undefined,
      step: mode === 'counter' ? nStep : undefined,
    };
    if (task) actions.updateTask(task.id, data);
    else actions.addTask(data);
    onClose();
  };

  return (
    <Sheet title={task ? 'Edytuj zadanie' : 'Nowe zadanie'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {!task && (
          <div className="field">
            <span>Rodzaj</span>
            <Chips label="Rodzaj zadania" value={mode} onChange={setMode} options={MODES} />
          </div>
        )}
        <label className="field">
          <span>Nazwa</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={mode === 'counter' ? 'np. Kalorie' : 'np. Zimny prysznic'} autoFocus />
        </label>
        <div className="field">
          <span>Kategoria</span>
          <Chips label="Kategoria" value={category} onChange={setCategory} options={CATEGORIES.map((id) => ({ id, label: CATEGORY_LABEL[id] }))} />
        </div>
        {mode === 'weekly' && (
          <label className="field">
            <span>Ile razy w tygodniu (1–7)</span>
            <input inputMode="numeric" value={times} onChange={(e) => setTimes(e.target.value)} />
          </label>
        )}
        {mode === 'counter' && (
          <div className="field-row">
            <label className="field">
              <span>Cel dzienny</span>
              <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2000" />
            </label>
            <label className="field">
              <span>Jednostka</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kcal" maxLength={10} />
            </label>
            <label className="field">
              <span>Krok +/−</span>
              <input inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
            </label>
          </div>
        )}
        <button className="primary" disabled={!ok}>
          {task ? 'Zapisz zmiany' : 'Dodaj'}
        </button>
      </form>
    </Sheet>
  );
}

function DeleteSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <Sheet title="Usuń zadanie" onClose={onClose}>
      <div className="form">
        <p className="hint">„{task.title}” — wybierz, co zrobić z dotychczasową historią.</p>
        <button
          className="primary"
          onClick={() => {
            actions.archiveTask(task.id);
            onClose();
          }}
        >
          Usuń od dziś, zachowaj historię
        </button>
        <button
          className="danger"
          onClick={() => {
            actions.deleteTask(task.id);
            onClose();
          }}
        >
          Usuń razem z historią
        </button>
      </div>
    </Sheet>
  );
}

const SECTIONS: { mode: Mode; code: string; title: string; add: string }[] = [
  { mode: 'daily', code: 'T1', title: 'Zadania dzienne', add: 'zadanie dzienne' },
  { mode: 'weekly', code: 'T2', title: 'Wyzwania tygodniowe', add: 'wyzwanie tygodniowe' },
  { mode: 'counter', code: 'T3', title: 'Liczniki', add: 'licznik' },
];

export function Tasks() {
  const s = useAppState();
  const [form, setForm] = useState<{ task?: Task; mode: Mode } | null>(null);
  const [del, setDel] = useState<Task | null>(null);
  const active = s.tasks.filter((t) => !t.archivedAt);

  return (
    <>
      <p className="lead">Dodawaj, zmieniaj i usuwaj zadania. Nowe zadanie liczy się od dnia dodania.</p>
      {SECTIONS.map((sec) => {
        const list = active.filter((t) => modeOf(t) === sec.mode);
        return (
          <Card key={sec.mode} code={sec.code} title={sec.title} aside={<button className="small" onClick={() => setForm({ mode: sec.mode })} aria-label={`Dodaj ${sec.add}`}>+ Dodaj</button>}>
            {list.length === 0 && <p className="hint">Pusto. Dodaj pierwsze.</p>}
            {list.map((t) => (
              <div key={t.id} className="row static">
                <span className="row-t">
                  {t.title}
                  <small>
                    {CATEGORY_LABEL[t.category]}
                    {t.frequency === 'weekly' && ` · ${t.timesPerWeek}× w tygodniu`}
                    {t.kind === 'counter' && ` · cel ${fmtNum(t.target ?? 0)} ${t.unit ?? ''}`}
                  </small>
                </span>
                <button className="ghost" onClick={() => setForm({ task: t, mode: modeOf(t) })} aria-label={`Edytuj: ${t.title}`}>
                  ✎
                </button>
                <button className="ghost" onClick={() => setDel(t)} aria-label={`Usuń: ${t.title}`}>
                  ✕
                </button>
              </div>
            ))}
          </Card>
        );
      })}
      {form && <TaskForm task={form.task} initialMode={form.mode} onClose={() => setForm(null)} />}
      {del && <DeleteSheet task={del} onClose={() => setDel(null)} />}
    </>
  );
}
