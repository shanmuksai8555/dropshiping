import { useEffect, useState } from 'react';

type Props = { settled: number; total: number; done: boolean; failed: number; onSkip: () => void };

export default function Preloader({ settled, total, done, failed, onSkip }: Props) {
  const [gone, setGone] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const pct = total ? Math.round((settled / total) * 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 12000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(t);
  }, [done]);
  if (gone) return null;

  return (
    <div className={`preloader${done ? ' is-done' : ''}`} role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="preloader__inner">
        <span className="preloader__mark">Lumen Market</span>
        <span className="preloader__pct">
          {String(pct).padStart(3, '0')}
          <small>%</small>
        </span>
        <span className="preloader__bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
        <span className="preloader__meta">
          {settled} / {total} frames decoded{failed ? ` · ${failed} skipped` : ''}
        </span>
        {showSkip && !done && (
          <button className="preloader__skip" onClick={onSkip}>
            Slow connection? Continue anyway
          </button>
        )}
      </div>
    </div>
  );
}
