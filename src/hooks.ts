import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setSetting, uid, type Place } from './db';
import { deserializeForecast, fetchForecast, serializeForecast, type Forecast } from './lib/weather';

const CACHE_FRESH_MS = 30 * 60_000;

export function useCurrentPlace(): { place: Place | null | undefined } {
  const place = useLiveQuery(async () => {
    const id = (await db.settings.get('placeId'))?.value;
    const p = id ? await db.places.get(id) : undefined;
    return p ?? (await db.places.orderBy('createdAt').first()) ?? null;
  }, []);
  return { place };
}

export async function addPlace(p: Omit<Place, 'id' | 'createdAt'>, select = true): Promise<Place> {
  const place: Place = { ...p, id: uid(), createdAt: Date.now() };
  await db.places.add(place);
  if (select) await setSetting('placeId', place.id);
  return place;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Геолокация недоступна в этом браузере'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 });
  });
}

export async function addCurrentLocation(): Promise<Place> {
  const pos = await getCurrentPosition();
  const { latitude: lat, longitude: lon } = pos.coords;
  return addPlace({ name: 'Моё местоположение', region: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, lat, lon });
}

export function geoErrorText(e: unknown): string {
  if (typeof GeolocationPositionError !== 'undefined' && e instanceof GeolocationPositionError) {
    if (e.code === e.PERMISSION_DENIED) return 'Доступ к геопозиции запрещён — разрешите его в настройках браузера или найдите место поиском.';
    if (e.code === e.TIMEOUT) return 'Не удалось определить позицию вовремя. Попробуйте ещё раз.';
  }
  return e instanceof Error ? e.message : 'Не удалось определить позицию.';
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export interface ForecastState {
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useForecast(place: Place | null | undefined): ForecastState {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!place) return;
    const ctrl = new AbortController();
    let cancelled = false;
    (async () => {
      setError(null);
      const cached = await db.forecasts.get(place.id);
      if (cached && !cancelled) setForecast(deserializeForecast(cached.json));
      else if (!cancelled) setForecast(null);
      const fresh = cached && Date.now() - cached.fetchedAt < CACHE_FRESH_MS;
      if (fresh && tick === 0) return;
      setLoading(true);
      try {
        const f = await fetchForecast(place.lat, place.lon, ctrl.signal);
        if (cancelled) return;
        setForecast(f);
        await db.forecasts.put({ placeId: place.id, fetchedAt: f.fetchedAt, json: serializeForecast(f) });
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError(cached ? 'Нет связи — показан сохранённый прогноз.' : 'Не удалось загрузить прогноз. Проверьте подключение.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [place?.id, place?.lat, place?.lon, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { forecast, loading, error, refresh };
}
