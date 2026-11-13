import { useRef, useState } from 'react';
import { diffDays, fmtShort, startOfWeek, todayKey } from '../lib/dates';
import { compress, deletePhoto, putPhoto, usePhotos, type PhotoView } from '../lib/photos';
import { useAppState } from '../lib/store';
import { Card, Sheet } from './ui';

export function PhotoCard({ weekStart, today, onJump }: { weekStart: string; today: string; onJump: (week: string) => void }) {
  const s = useAppState();
  const photos = usePhotos();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<PhotoView | null>(null);

  const firstWeek = startOfWeek(s.settings.startDate);
  const weekNo = (w: string) => Math.floor(diffDays(firstWeek, w) / 7) + 1;
  const current = photos.find((p) => p.week === weekStart);
  const first = photos[0];
  const canAdd = weekStart <= today;

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await putPhoto({ week: weekStart, date: todayKey(), blob: await compress(file) });
    } catch {
      setError('Nie udało się zapisać zdjęcia. Spróbuj innego pliku.');
    }
    setBusy(false);
  };

  const pick = (
    <button className="small" onClick={() => input.current?.click()} disabled={busy}>
      {busy ? 'Zapisuję…' : current ? 'Zmień' : '+ Zdjęcie'}
    </button>
  );

  return (
    <Card code="W6" title="Zdjęcie tygodnia" aside={canAdd ? pick : undefined}>
      <input ref={input} type="file" accept="image/*" hidden aria-label="Wybierz zdjęcie tygodnia" onChange={(e) => onFile(e.target.files?.[0])} />

      {current ? (
        <div className={`photos ${first && first.week !== current.week ? 'two' : ''}`}>
          {first && first.week !== current.week && (
            <button className="photo" onClick={() => setOpen(first)}>
              <img src={first.url} alt={`Zdjęcie z tygodnia ${weekNo(first.week)}`} />
              <span className="mono">START · TYDZ. {weekNo(first.week)}</span>
            </button>
          )}
          <button className="photo" onClick={() => setOpen(current)}>
            <img src={current.url} alt={`Zdjęcie z tygodnia ${weekNo(current.week)}`} />
            <span className="mono">TYDZ. {weekNo(current.week)}</span>
          </button>
        </div>
      ) : (
        <p className="hint">
          {canAdd
            ? 'Brak zdjęcia z tego tygodnia. Rób je co tydzień o tej samej porze, w tym samym miejscu i świetle — wtedy zmiany widać najlepiej.'
            : 'Ten tydzień jeszcze się nie zaczął.'}
        </p>
      )}

      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}

      {photos.length > 1 && (
        <div className="strip" aria-label="Wszystkie zdjęcia">
          {photos.map((p) => (
            <button key={p.week} className={p.week === weekStart ? 'on' : ''} onClick={() => onJump(p.week)} aria-label={`Przejdź do tygodnia ${weekNo(p.week)}`}>
              <img src={p.url} alt="" />
              <span className="mono">T{weekNo(p.week)}</span>
            </button>
          ))}
        </div>
      )}

      <p className="hint">Zdjęcia zostają tylko na tym urządzeniu i trafiają do kopii zapasowej.</p>

      {open && (
        <Sheet title={`Tydzień ${weekNo(open.week)} · ${fmtShort(open.date)}`} onClose={() => setOpen(null)}>
          <div className="form">
            <img className="photo-full" src={open.url} alt={`Zdjęcie z tygodnia ${weekNo(open.week)}`} />
            <button
              className="danger"
              onClick={() => {
                deletePhoto(open.week);
                setOpen(null);
              }}
            >
              Usuń zdjęcie
            </button>
          </div>
        </Sheet>
      )}
    </Card>
  );
}
