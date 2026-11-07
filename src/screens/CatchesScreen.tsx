import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { CatchPhoto } from '../components/CatchPhoto';
import { fmtAmount, fmtCatchDay, fmtSummaryLine, groupByMonth, speciesInUse, summarize } from '../lib/catches';

export function CatchesScreen() {
  const all = useLiveQuery(() => db.catches.orderBy('caughtAt').reverse().toArray(), []);
  const [species, setSpecies] = useState<string | null>(null);

  if (!all) return <main className="screen" />;

  const kinds = speciesInUse(all);
  const filter = species && kinds.includes(species) ? species : null;
  const shown = filter ? all.filter((c) => c.species === filter) : all;
  const total = summarize(shown);
  const months = groupByMonth(shown);

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Мой улов</h2>
      </div>

      {all.length === 0 ? (
        <div className="card empty-catch">
          <Icon name="fish" size={32} />
          <div className="title">Журнал пока пуст</div>
          <p>Записывайте каждую рыбу: вид, вес, длину, место и снасти. Фото можно сделать сразу или выбрать из галереи.</p>
          <Link className="btn btn-primary" to="/catches/new">
            <Icon name="plus" /> Записать улов
          </Link>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="card-s">
              <div className="label">{filter ? filter : 'Всего'}</div>
              <b>{total.count}</b>
            </div>
            <div className="card-s">
              <div className="label">Рекорд</div>
              <b>{total.record ? `${fmtAmount(total.record.weightKg!)} кг` : '—'}</b>
            </div>
            <div className="card-s">
              <div className="label">Общий вес</div>
              <b>{total.totalKg > 0 ? `${fmtAmount(total.totalKg)} кг` : '—'}</b>
            </div>
          </div>

          {kinds.length > 1 && (
            <div className="pills" role="group" aria-label="Вид рыбы">
              <button type="button" className="pill" aria-pressed={!filter} onClick={() => setSpecies(null)}>
                Все
              </button>
              {kinds.map((k) => (
                <button key={k} type="button" className="pill" aria-pressed={filter === k} onClick={() => setSpecies(k)}>
                  {k}
                </button>
              ))}
            </div>
          )}

          {months.map((m) => (
            <section key={m.key} className="list" aria-label={m.label}>
              <div className="section-title">
                {m.label} · {fmtSummaryLine(m.summary)}
              </div>
              {m.items.map((c) => (
                <Link key={c.id} className="catch-row" to={`/catches/${c.id}`}>
                  <CatchPhoto c={c} />
                  <div className="catch-main">
                    <div className="title">{c.species}</div>
                    <div className="sub">{[fmtCatchDay(c.caughtAt), c.placeName].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="catch-num">
                    <span>кг</span>
                    <b>{c.weightKg != null ? fmtAmount(c.weightKg) : '—'}</b>
                  </div>
                  <div className="catch-num">
                    <span>см</span>
                    <b>{c.lengthCm != null ? fmtAmount(c.lengthCm) : '—'}</b>
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </>
      )}

      {all.length > 0 && (
        <Link className="fab" to="/catches/new" aria-label="Записать улов">
          <Icon name="plus" size={26} />
        </Link>
      )}
    </main>
  );
}
