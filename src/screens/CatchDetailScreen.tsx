import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { fmtAmount, fmtCatchTime, speciesPhoto } from '../lib/catches';
import { fmtFullDate } from '../lib/format';

export function CatchDetailScreen() {
  const { id = '' } = useParams();
  const c = useLiveQuery(() => db.catches.get(id).then((r) => r ?? null), [id]);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (c === undefined) return <main className="screen" />;
  if (c === null) {
    return (
      <main className="screen">
        <Link className="back-btn" to="/catches"><Icon name="chevronLeft" /> Улов</Link>
        <div className="empty">Запись не найдена.</div>
      </main>
    );
  }

  const stock = c.photo ? undefined : speciesPhoto(c.species);
  const src = c.photo ?? stock?.src;

  const del = async () => {
    await db.catches.delete(c.id);
    navigate('/catches', { replace: true });
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="back-btn" to="/catches"><Icon name="chevronLeft" /> Улов</Link>
        <Link className="icon-btn" to={`/catches/${c.id}/edit`} aria-label="Редактировать запись">
          <Icon name="edit" />
        </Link>
      </div>

      {src && (
        <figure className="recipe-hero">
          <img src={src} alt={c.photo ? `${c.species}, фото улова` : `${c.species}, фото вида`} />
          {stock && (
            <figcaption>
              Фото вида: <a href={stock.source} target="_blank" rel="noopener noreferrer">{stock.author}</a>, {stock.license}
            </figcaption>
          )}
        </figure>
      )}

      <div>
        <h1 className="headline" style={{ fontSize: 30 }}>{c.species}</h1>
        <div className="facts" style={{ marginTop: 8 }}>
          <span><Icon name="calendar" size={16} /> {fmtFullDate(new Date(c.caughtAt))}, {fmtCatchTime(c.caughtAt)}</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card-s">
          <div className="label">Вес</div>
          <div className="factor-value">{c.weightKg != null ? `${fmtAmount(c.weightKg)} кг` : '—'}</div>
        </div>
        <div className="card-s">
          <div className="label">Длина</div>
          <div className="factor-value">{c.lengthCm != null ? `${fmtAmount(c.lengthCm)} см` : '—'}</div>
        </div>
      </div>

      {c.placeName && (
        <div className="card-s row">
          <Icon name="pin" />
          <div>
            <div className="label">Место</div>
            <div style={{ fontWeight: 600 }}>{c.placeName}</div>
            {c.lat != null && c.lon != null && (
              <div className="label">{c.lat.toFixed(4)}°, {c.lon.toFixed(4)}°</div>
            )}
          </div>
        </div>
      )}
      {c.lat != null && c.lon != null && (
        <Link className="btn btn-sm map-link" to={`/map?catch=${c.id}`}>
          <Icon name="map" size={18} /> Показать на карте
        </Link>
      )}

      {c.tags.length > 0 && (
        <>
          <div className="section-title">Снасти и приманки</div>
          <div className="tags">
            {c.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </>
      )}

      {c.note && (
        <>
          <div className="section-title">Заметка</div>
          <div className="card" style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{c.note}</div>
        </>
      )}

      {confirming ? (
        <div className="card-s confirm" role="alert">
          <div>Удалить запись «{c.species}»? Это нельзя отменить.</div>
          <div className="btn-row">
            <button className="btn" onClick={() => setConfirming(false)}>Оставить</button>
            <button className="btn btn-danger-solid" onClick={del}>Удалить</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>
          <Icon name="trash" /> Удалить запись
        </button>
      )}
    </main>
  );
}
