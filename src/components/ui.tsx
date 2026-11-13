import { useEffect, type ReactNode } from 'react';

/** Karta w stylu HUD: cienka ramka, klamry w rogach, etykieta kodowa. */
export function Card({ code, title, aside, children, className = '' }: { code?: string; title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || code) && (
        <div className="card-head">
          <h2>
            {code && <span className="code">{code}</span>}
            {title}
          </h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Ring({ pct, size = 132, children }: { pct: number; size?: number; children?: ReactNode }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, pct));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`Wykonano ${Math.round(p * 100)}%`}>
        <circle className="ring-track" cx="50" cy="50" r={r} />
        <circle className="ring-fill" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 50 50)" />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function Bar({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div className={`bar ${done ? 'done' : ''}`}>
      <i style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} />
    </div>
  );
}

export function PeriodNav({ label, onPrev, onNext, canPrev = true, canNext = true }: { label: string; onPrev: () => void; onNext: () => void; canPrev?: boolean; canNext?: boolean }) {
  return (
    <div className="period">
      <button onClick={onPrev} disabled={!canPrev} aria-label="Poprzedni okres">‹</button>
      <span>{label}</span>
      <button onClick={onNext} disabled={!canNext} aria-label="Następny okres">›</button>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose} aria-label="Zamknij">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'violet' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span className="stat-l">{label}</span>
      <span className="stat-v">{value}</span>
      {sub && <span className="stat-s">{sub}</span>}
    </div>
  );
}

export const pctText = (p: number | null) => (p === null ? '—' : `${Math.round(p * 100)}%`);

/** Wartość z pola tekstowego: akceptuje przecinek i kropkę. */
export function parseNum(raw: string): number {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}
