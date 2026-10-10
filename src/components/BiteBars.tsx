import type { HourScore } from '../lib/bite';

const FROM = 4;
const TO = 22;

export function BiteBars({ scores, showNow }: { scores: HourScore[]; showNow: boolean }) {
  const shown = scores.filter((s) => s.time.getHours() >= FROM && s.time.getHours() < TO);
  const nowH = new Date().getHours();
  return (
    <>
      <div className="bars" role="img" aria-label="Индекс клёва по часам">
        {shown.map((s) => (
          <div
            key={s.time.getTime()}
            className={'bar' + (s.score >= 7 ? ' good' : '') + (showNow && s.time.getHours() === nowH ? ' now' : '')}
            style={{ height: `${Math.max(6, s.score * 10)}%` }}
            title={`${String(s.time.getHours()).padStart(2, '0')}:00 — ${s.score}`}
          />
        ))}
      </div>
      <div className="bar-axis" aria-hidden="true">
        {[4, 8, 12, 16, 20].map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
    </>
  );
}
