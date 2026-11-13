import { useEffect, useRef, useState } from 'react';
import { Card, Sheet } from '../components/ui';
import { addDays, fmtShort, isValidKey, todayKey } from '../lib/dates';
import { buildIcs, googleUrl, isTime, reminderSpan, remindersOf } from '../lib/ics';
import { clearPhotos, exportPhotos, importPhotos } from '../lib/photos';
import { actions, isAppState, uid, useAppState } from '../lib/store';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

export function Settings() {
  const s = useAppState();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  const exportData = async () => {
    const photos = await exportPhotos().catch(() => []);
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...s, photos })], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `winter-arc-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Kopia zapisana do pliku.');
  };

  const importData = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (!isAppState(parsed)) throw new Error('format');
      const { photos, ...data } = parsed as typeof parsed & { photos?: unknown };
      actions.importState(data);
      await importPhotos(photos).catch(() => {});
      setMsg('Dane wczytane z kopii.');
    } catch {
      setMsg('Nie udało się wczytać — to nie jest plik kopii Winter Arc.');
    }
    if (file.current) file.current.value = '';
  };

  const end = addDays(s.settings.startDate, s.settings.length - 1);

  const reminders = remindersOf(s);
  const span = reminderSpan(s, todayKey());
  const appUrl = location.origin + location.pathname;
  const [calMsg, setCalMsg] = useState('');
  const patchReminder = (id: string, patch: { time?: string; label?: string }) =>
    actions.setReminders(reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addToCalendar = async () => {
    const f = new File([buildIcs(s, todayKey(), appUrl)], 'winter-arc-przypomnienia.ics', { type: 'text/calendar' });
    // na telefonie arkusz udostępniania pozwala od razu wybrać Kalendarz
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: 'Winter Arc — przypomnienia' });
        setCalMsg('Wybierz Kalendarz, żeby dodać przypomnienia.');
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
    setCalMsg('Plik pobrany — otwórz go, żeby dodać przypomnienia do kalendarza.');
  };

  return (
    <>
      <Card code="S1" title="Wyzwanie">
        <label className="field">
          <span>Data startu</span>
          <input type="date" value={s.settings.startDate} onChange={(e) => isValidKey(e.target.value) && actions.setStartDate(e.target.value)} />
        </label>
        <p className="hint">
          {s.settings.length} dni: {fmtShort(s.settings.startDate)} – {fmtShort(end)}. Statystyki liczą się od dnia startu.
        </p>
      </Card>

      <Card code="S2" title="Przypomnienia">
        <p className="hint">
          Przypomnienia trafiają do kalendarza telefonu, więc działają także przy zamkniętej aplikacji. Codziennie przez {span.count} dni, od {fmtShort(span.first)}.
        </p>
        {reminders.map((r) => (
          <div key={r.id} className="reminder">
            <input type="time" value={r.time} aria-label="Godzina przypomnienia" onChange={(e) => isTime(e.target.value) && patchReminder(r.id, { time: e.target.value })} />
            <input value={r.label} maxLength={60} aria-label="Treść przypomnienia" placeholder="Treść przypomnienia" onChange={(e) => patchReminder(r.id, { label: e.target.value })} />
            <button className="ghost" onClick={() => actions.setReminders(reminders.filter((x) => x.id !== r.id))} aria-label={`Usuń przypomnienie ${r.time}`}>
              ✕
            </button>
            <a className="reminder-g" href={googleUrl(s, r, todayKey(), appUrl)} target="_blank" rel="noreferrer">
              Dodaj w Kalendarzu Google ↗
            </a>
          </div>
        ))}
        <div className="btn-row">
          <button className="secondary" onClick={() => actions.setReminders([...reminders, { id: uid(), time: '12:00', label: '' }])} disabled={reminders.length >= 6}>
            + Przypomnienie
          </button>
          <button className="primary" onClick={addToCalendar} disabled={reminders.length === 0}>
            Dodaj do kalendarza
          </button>
        </div>
        {calMsg && (
          <p className="hint" role="status">
            {calMsg}
          </p>
        )}
        <p className="hint">Po zmianie godzin dodaj je ponownie. Żeby wyłączyć przypomnienie, usuń wydarzenie „Winter Arc” w kalendarzu.</p>
      </Card>

      <Card code="S3" title="Instalacja na telefonie">
        {standalone ? (
          <p className="hint">Aplikacja jest zainstalowana i działa offline.</p>
        ) : (
          <>
            {install && (
              <button className="primary" onClick={() => install.prompt().then(() => setInstall(null))}>
                Zainstaluj aplikację
              </button>
            )}
            <ul className="steps">
              <li>
                <b>Android (Chrome):</b> menu ⋮ → „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.
              </li>
              <li>
                <b>iPhone (Safari):</b> przycisk Udostępnij → „Do ekranu początkowego”.
              </li>
            </ul>
          </>
        )}
      </Card>

      <Card code="S4" title="Kopia zapasowa">
        <p className="hint">Dane i zdjęcia są zapisane tylko na tym urządzeniu. Zrób kopię, zanim wyczyścisz przeglądarkę albo zmienisz telefon.</p>
        <div className="btn-row">
          <button className="secondary" onClick={exportData}>
            Zapisz kopię
          </button>
          <button className="secondary" onClick={() => file.current?.click()}>
            Wczytaj kopię
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} />
        </div>
        {msg && (
          <p className="hint" role="status">
            {msg}
          </p>
        )}
      </Card>

      <Card code="S5" title="Reset">
        <button className="danger" onClick={() => setConfirmReset(true)}>
          Wyczyść wszystkie dane
        </button>
      </Card>

      {confirmReset && (
        <Sheet title="Wyczyścić wszystko?" onClose={() => setConfirmReset(false)}>
          <div className="form">
            <p className="hint">Znikną wszystkie postępy, treningi, zdjęcia i własne zadania. Tego nie da się cofnąć.</p>
            <button
              className="danger"
              onClick={() => {
                actions.reset();
                clearPhotos().catch(() => {});
                setConfirmReset(false);
                setMsg('');
              }}
            >
              Tak, zacznij od nowa
            </button>
            <button className="secondary" onClick={() => setConfirmReset(false)}>
              Anuluj
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
