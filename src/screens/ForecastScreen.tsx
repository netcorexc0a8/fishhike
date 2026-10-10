import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { addCurrentLocation, geoErrorText, useCurrentPlace, useForecast } from '../hooks';
import { BiteBars } from '../components/BiteBars';
import { Icon } from '../components/Icon';
import { Moon } from '../components/Moon';
import { ThemeToggle } from '../components/ThemeControls';
import { moonInfo } from '../lib/moon';
import { verdict } from '../lib/bite';
import { windDirName, type DayForecast } from '../lib/weather';
import { ago, fmtFullDate, fmtRange, fmtScore, fmtTemp, fmtWeekday } from '../lib/format';

function headline(day: DayForecast, isToday: boolean): string {
  const v = verdict(day.dayScore);
  const best = day.windows[0];
  if (!best) return v;
  const h = best.start.getHours();
  const when = h < 11 ? 'с утра' : h < 16 ? 'днём' : 'вечером';
  return isToday || day.dayScore >= 5 ? `${v}\n${when}` : v;
}

function pressureNote(day: DayForecast): string {
  const first = day.hours[6]?.pressure ?? day.hours[0]?.pressure;
  const last = day.hours[18]?.pressure ?? day.hours.at(-1)?.pressure;
  if (first === undefined || last === undefined) return '';
  const d = last - first;
  if (d < -3) return 'падает ↘';
  if (d > 3) return 'растёт ↗';
  return 'стабильно';
}

export function ForecastScreen() {
  const { place } = useCurrentPlace();
  const { forecast, loading, error, refresh } = useForecast(place);
  const [dayIdx, setDayIdx] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const checklist = useLiveQuery(() => db.checklists.orderBy('updatedAt').last(), []);

  const day = forecast?.days[Math.min(dayIdx, (forecast?.days.length ?? 1) - 1)];
  const isToday = dayIdx === 0;
  const refTime = useMemo(() => {
    if (!day) return new Date();
    if (isToday) return new Date();
    const d = new Date(day.date);
    d.setHours(12);
    return d;
  }, [day, isToday]);
  const moon = moonInfo(refTime);
  const nowHour = day?.hours.find((h) => h.time.getHours() === (isToday ? new Date().getHours() : 12)) ?? day?.hours[12];
  const dayTemps = day?.hours.map((h) => h.temperature) ?? [];
  const rainSum = day?.hours.reduce((a, h) => a + h.precipitation, 0) ?? 0;

  const locate = async () => {
    setLocating(true);
    setGeoError(null);
    try {
      await addCurrentLocation();
    } catch (e) {
      setGeoError(geoErrorText(e));
    } finally {
      setLocating(false);
    }
  };

  if (place === null) {
    return (
      <main className="screen">
        <div className="topbar">
          <h2>FishHike</h2>
          <ThemeToggle />
        </div>
        <div>
          <div className="eyebrow">{fmtFullDate(new Date())}</div>
          <h1 className="headline">Где рыбачим?</h1>
        </div>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Прогноз клёва считается по погоде и Луне для конкретного места. Определите позицию или найдите водоём по названию.
        </p>
        <button className="btn btn-primary btn-block" onClick={locate} disabled={locating}>
          <Icon name="locate" /> {locating ? 'Определяем…' : 'Моё местоположение'}
        </button>
        <Link className="btn btn-block" to="/places">
          <Icon name="search" /> Найти место
        </Link>
        {geoError && <div className="notice" role="alert">{geoError}</div>}
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="place-btn" to="/places" aria-label={`Место: ${place?.name ?? ''}. Сменить`}>
          <Icon name="pin" size={18} />
          <span>{place?.name ?? '…'}</span>
          <Icon name="chevronDown" size={16} />
        </Link>
        <div className="topbar-actions">
          <ThemeToggle />
          <button className="icon-btn" onClick={refresh} aria-label="Обновить прогноз" disabled={loading}>
            <Icon name="refresh" />
          </button>
        </div>
      </div>

      <div className="hero">
        <div>
          <div className="eyebrow">{day ? fmtFullDate(day.date) : fmtFullDate(new Date())}</div>
          <h1 className="headline" style={{ whiteSpace: 'pre-line' }}>
            {day ? headline(day, isToday) : loading ? 'Считаем клёв…' : 'Нет прогноза'}
          </h1>
        </div>
        <Moon info={moon} size={68} />
      </div>

      {forecast && (
        <div className="chips" role="group" aria-label="День прогноза">
          {forecast.days.map((d, i) => (
            <button
              key={d.date.getTime()}
              className={'chip' + (d.approx ? ' approx' : '')}
              aria-pressed={i === dayIdx}
              aria-label={d.approx ? `${fmtWeekday(d.date)} ${d.date.getDate()}, ориентировочно` : undefined}
              onClick={() => setDayIdx(i)}
            >
              {i === 0 ? 'сегодня' : fmtWeekday(d.date)}
              <b>{d.date.getDate()}</b>
            </button>
          ))}
        </div>
      )}

      {day ? (
        <section className={'card' + (day.approx ? ' approx' : '')} aria-label="Индекс клёва">
          {day.approx && (
            <div className="approx-badge">
              <Icon name="clock" size={14} /> Ориентировочно — погода дальше недели неточна
            </div>
          )}
          <div className="spread">
            <div>
              <div className="label">Индекс клёва</div>
              <div className="big-num">
                {fmtScore(day.dayScore)}
                <small> / 10</small>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, lineHeight: 1.5 }} className="muted">
              Лучшее окно
              <br />
              <b style={{ color: 'var(--text)', fontSize: 16 }}>
                {day.windows[0] ? fmtRange(day.windows[0].start, day.windows[0].end) : 'не выражено'}
              </b>
            </div>
          </div>
          <BiteBars scores={day.scores} showNow={isToday} />
        </section>
      ) : loading ? (
        <div className="skeleton" style={{ height: 196 }} aria-hidden="true" />
      ) : null}

      {day && nowHour && (
        <div className="grid-2">
          <div className="card-s">
            <div className="label">Давление</div>
            <div className="factor-value">{Math.round(nowHour.pressure)} гПа</div>
            <div className="factor-note">{pressureNote(day)}</div>
          </div>
          <div className="card-s">
            <div className="label">Ветер</div>
            <div className="factor-value">
              {Math.round(nowHour.wind)} м/с, {windDirName(nowHour.windDir)}
            </div>
            <div className="factor-note">{nowHour.wind > 8 ? 'сильный' : nowHour.wind > 4 ? 'умеренный' : 'слабый'}</div>
          </div>
          <div className="card-s">
            <div className="label">Воздух</div>
            <div className="factor-value">{fmtTemp(nowHour.temperature)}</div>
            <div className="factor-note">
              {fmtTemp(Math.min(...dayTemps))}…{fmtTemp(Math.max(...dayTemps))}, {rainSum < 0.2 ? 'без осадков' : `осадки ${rainSum.toFixed(1)} мм`}
            </div>
          </div>
          <div className="card-s">
            <div className="label">Луна</div>
            <div className="factor-value">{moon.name}</div>
            <div className="factor-note">освещена {Math.round(moon.illumination * 100)}%</div>
          </div>
        </div>
      )}

      {error && <div className="notice" role="status">{error}</div>}
      {forecast && !error && (
        <div className="label" style={{ textAlign: 'center' }}>
          Обновлено {ago(forecast.fetchedAt)} · Open-Meteo
        </div>
      )}

      {checklist && (
        <Link className="link-card" to={`/checklists/${checklist.id}`}>
          <div>
            <div className="label">Сборы · {checklist.title}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
              Собрано {checklist.items.filter((i) => i.done).length} из {checklist.items.length}
            </div>
            <div className="progress">
              <i
                style={{
                  width: `${checklist.items.length ? (checklist.items.filter((i) => i.done).length / checklist.items.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <Icon name="chevronRight" />
        </Link>
      )}
    </main>
  );
}
