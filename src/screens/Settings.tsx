import { useEffect, useRef, useState } from 'react';
import { Card, Sheet } from '../components/ui';
import { addDays, fmtShort, isValidKey, todayKey } from '../lib/dates';
import { actions, isAppState, useAppState } from '../lib/store';

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

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
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
      actions.importState(parsed);
      setMsg('Dane wczytane z kopii.');
    } catch {
      setMsg('Nie udało się wczytać — to nie jest plik kopii Winter Arc.');
    }
    if (file.current) file.current.value = '';
  };

  const end = addDays(s.settings.startDate, s.settings.length - 1);

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

      <Card code="S2" title="Instalacja na telefonie">
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

      <Card code="S3" title="Kopia zapasowa">
        <p className="hint">Dane są zapisane tylko na tym urządzeniu. Zrób kopię, zanim wyczyścisz przeglądarkę albo zmienisz telefon.</p>
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

      <Card code="S4" title="Reset">
        <button className="danger" onClick={() => setConfirmReset(true)}>
          Wyczyść wszystkie dane
        </button>
      </Card>

      {confirmReset && (
        <Sheet title="Wyczyścić wszystko?" onClose={() => setConfirmReset(false)}>
          <div className="form">
            <p className="hint">Znikną wszystkie postępy, treningi i własne zadania. Tego nie da się cofnąć.</p>
            <button
              className="danger"
              onClick={() => {
                actions.reset();
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
