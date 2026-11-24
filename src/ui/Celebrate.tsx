import { useEffect, useState } from 'react';

let fire: ((xp: number, text?: string) => void) | null = null;

/** Kleine Erfolgsanimation mit XP-Anzeige */
export function celebrate(xp: number, text?: string) {
  fire?.(xp, text);
}

export function CelebrateHost() {
  const [shot, setShot] = useState<{ id: number; xp: number; text?: string } | null>(null);
  useEffect(() => {
    fire = (xp, text) => setShot({ id: Date.now(), xp, text });
    return () => {
      fire = null;
    };
  }, []);
  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => setShot(null), 2600);
    return () => clearTimeout(t);
  }, [shot]);
  if (!shot) return null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="celebrate" key={shot.id} aria-live="polite">
      {!reduce &&
        Array.from({ length: 28 }, (_, i) => (
          <span key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 60}ms`, background: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7'][i % 5] }} />
        ))}
      <div className="toast">
        <div className="toast-xp">+{shot.xp} XP</div>
        <div>{shot.text ?? 'Geschafft!'}</div>
      </div>
    </div>
  );
}
