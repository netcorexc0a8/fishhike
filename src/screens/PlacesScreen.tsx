import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setSetting } from '../db';
import { addCurrentLocation, addPlace, geoErrorText, useCurrentPlace, useOnline } from '../hooks';
import { searchPlaces, type GeoResult } from '../lib/weather';
import { Icon } from '../components/Icon';
import { ONBOARDING_EVENT } from '../components/Onboarding';
import { INSTALL_EVENT } from '../components/InstallScreen';
import { isStandalone } from '../lib/install';
import { ThemePicker } from '../components/ThemeControls';

export function PlacesScreen() {
  const places = useLiveQuery(() => db.places.orderBy('createdAt').reverse().toArray(), []);
  const { place: current } = useCurrentPlace();
  const online = useOnline();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || !online) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(query, ctrl.signal));
        setMsg(null);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setMsg('Поиск недоступен. Проверьте подключение.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, online]);

  const pick = async (id: string) => {
    await setSetting('placeId', id);
    navigate('/');
  };

  const addResult = async (r: GeoResult) => {
    await addPlace({ name: r.name, region: r.region, lat: r.lat, lon: r.lon });
    setQ('');
    navigate('/');
  };

  const locate = async () => {
    setLocating(true);
    setMsg(null);
    try {
      await addCurrentLocation();
      navigate('/');
    } catch (e) {
      setMsg(geoErrorText(e));
    } finally {
      setLocating(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Удалить место «${name}»?`)) return;
    await db.places.delete(id);
    await db.forecasts.delete(id);
  };

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Места</h2>
      </div>

      <button className="btn btn-primary btn-block" onClick={locate} disabled={locating}>
        <Icon name="locate" /> {locating ? 'Определяем…' : 'Добавить моё местоположение'}
      </button>

      <div className="field">
        <label htmlFor="pq">Найти водоём или населённый пункт</label>
        <input
          id="pq"
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Сенеж, Селигер, Рыбинск…"
          disabled={!online}
        />
      </div>
      {!online && <div className="notice">Поиск работает только онлайн. Сохранённые места доступны всегда.</div>}
      {msg && <div className="notice" role="alert">{msg}</div>}

      {(results.length > 0 || searching) && (
        <div className="list" aria-live="polite">
          {searching && results.length === 0 && <div className="muted">Ищем…</div>}
          {results.map((r) => (
            <button key={`${r.lat},${r.lon}`} className="list-item" onClick={() => addResult(r)}>
              <div>
                <div className="title">{r.name}</div>
                <div className="sub">{r.region}</div>
              </div>
              <Icon name="plus" />
            </button>
          ))}
        </div>
      )}

      <div className="section-title">Сохранённые</div>
      <div className="list">
        {places?.map((p) => (
          <div key={p.id} className="list-item" style={p.id === current?.id ? { borderColor: 'var(--accent)' } : undefined}>
            <button
              onClick={() => pick(p.id)}
              style={{ flex: '1 1 auto', minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', minHeight: 44 }}
              aria-current={p.id === current?.id ? 'true' : undefined}
            >
              <div className="title">{p.name}</div>
              <div className="sub">{p.id === current?.id ? 'выбрано · ' : ''}{p.region}</div>
            </button>
            <button className="icon-btn" style={{ border: 0, background: 'none' }} aria-label={`Удалить «${p.name}»`} onClick={() => remove(p.id, p.name)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        {places?.length === 0 && <div className="empty">Пока нет мест. Добавьте текущую позицию или найдите водоём.</div>}
      </div>

      <div className="section-title">Настройки</div>
      <ThemePicker />
      <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => window.dispatchEvent(new Event(ONBOARDING_EVENT))}>
        Показать подсказки по разделам
      </button>
      {!isStandalone() && (
        <button className="btn btn-block" onClick={() => window.dispatchEvent(new Event(INSTALL_EVENT))}>
          <Icon name="download" /> Установить приложение
        </button>
      )}
    </main>
  );
}
