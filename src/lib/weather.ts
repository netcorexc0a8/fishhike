import { bestWindows, scoreHour, type BiteWindow, type DaySun, type HourScore } from './bite';
import { solunarEvents, type SolunarEvent } from './astro';

// Open-Meteo: бесплатно, без ключа. Время приходит в часовом поясе места (timezone=auto)
// без смещения — парсим его как «местное», чтобы часы на экране совпадали с часами на водоёме.

export interface HourWeather {
  time: Date;
  temperature: number;
  pressure: number;
  wind: number;
  windDir: number;
  precipitation: number;
  cloud: number;
}

/** Сколько дней прогноз считается надёжным; дальше — ориентировочно. */
export const RELIABLE_DAYS = 7;
export const FORECAST_DAYS = 16;

export interface DayForecast {
  date: Date; // полночь дня
  /** День дальше RELIABLE_DAYS — точность погоды заметно ниже. */
  approx: boolean;
  moon?: MoonDay;
  sun: DaySun;
  hours: HourWeather[];
  scores: HourScore[];
  windows: BiteWindow[];
  /** Средний индекс за светлое время ±2 ч. */
  dayScore: number;
}

export interface Forecast {
  fetchedAt: number;
  days: DayForecast[];
}

export interface MoonDay {
  /** Восход, заход и верхняя кульминация Луны в этот день по местному времени водоёма (null — нет события). */
  rise: Date | null;
  set: Date | null;
  transit: Date | null;
}

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  utc_offset_seconds?: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    pressure_msl: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    precipitation: number[];
    cloud_cover: number[];
  };
  daily: { time: string[]; sunrise: string[]; sunset: string[] };
}

const parseLocal = (s: string) => new Date(s.length === 10 ? s + 'T00:00' : s);

/** «Наивное» местное время водоёма → абсолютное UTC (мс). */
function localToUtcMs(s: string, offsetSec: number): number {
  const [d, t = '00:00'] = s.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return Date.UTC(y, m - 1, day, hh, mm) - offsetSec * 1000;
}

/** Абсолютный момент → Date с тем же «настенным» временем, что на водоёме (как у часов прогноза). */
function utcToLocal(at: Date, offsetSec: number): Date {
  const x = new Date(at.getTime() + offsetSec * 1000);
  return new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes());
}

export function forecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover',
    daily: 'sunrise,sunset',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

export function buildForecast(raw: OpenMeteoResponse, fetchedAt = Date.now()): Forecast {
  const h = raw.hourly;
  const offset = raw.utc_offset_seconds ?? 0;
  const hasCoords = typeof raw.latitude === 'number' && typeof raw.longitude === 'number';
  const utcMs = h.time.map((t) => localToUtcMs(t, offset));
  let events: SolunarEvent[] | undefined;
  if (hasCoords && utcMs.length) {
    events = solunarEvents(raw.latitude!, raw.longitude!, new Date(utcMs[0]), new Date(utcMs[utcMs.length - 1]));
  }
  const hours: HourWeather[] = h.time.map((t, i) => ({
    time: parseLocal(t),
    temperature: h.temperature_2m[i],
    pressure: h.pressure_msl[i],
    wind: h.wind_speed_10m[i],
    windDir: h.wind_direction_10m[i],
    precipitation: h.precipitation[i],
    cloud: h.cloud_cover[i],
  }));

  const days: DayForecast[] = raw.daily.time.map((d, di) => {
    const date = parseLocal(d);
    const sun = { sunrise: parseLocal(raw.daily.sunrise[di]), sunset: parseLocal(raw.daily.sunset[di]) };
    const dayHours = hours.filter((x) => x.time.toDateString() === date.toDateString());
    const scores = dayHours.map((x) => {
      const idx = hours.indexOf(x);
      return scoreHour(
        {
          time: x.time,
          pressure: x.pressure,
          pressure3hAgo: idx >= 3 ? hours[idx - 3].pressure : null,
          wind: x.wind,
          precipitation: x.precipitation,
          utcMs: utcMs[idx],
        },
        sun,
        events,
      );
    });
    const light = scores.filter(
      (s) =>
        s.time.getTime() >= sun.sunrise.getTime() - 7_200_000 && s.time.getTime() <= sun.sunset.getTime() + 7_200_000,
    );
    const pool = light.length ? light : scores;
    const avg = pool.reduce((a, s) => a + s.score, 0) / Math.max(1, pool.length);
    // Индекс дня — между средним и пиком: важно, есть ли хорошие окна.
    const peak = Math.max(0, ...pool.map((s) => s.score));
    const dayScore = Math.round(((avg + peak) / 2) * 10) / 10;
    let moon: MoonDay | undefined;
    if (events) {
      const dayStart = localToUtcMs(d, offset);
      const inDay = (k: SolunarEvent['kind']) => {
        const e = events!.find((x) => x.kind === k && x.at.getTime() >= dayStart && x.at.getTime() < dayStart + 86_400_000);
        return e ? utcToLocal(e.at, offset) : null;
      };
      moon = { rise: inDay('rise'), set: inDay('set'), transit: inDay('transit') };
    }
    return { date, approx: di >= RELIABLE_DAYS, moon, sun, hours: dayHours, scores, windows: bestWindows(light, 7), dayScore };
  });

  return { fetchedAt, days };
}

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const res = await fetch(forecastUrl(lat, lon), { signal });
  if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
  return buildForecast((await res.json()) as OpenMeteoResponse);
}

export interface GeoResult {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const p = new URLSearchParams({ name: query, count: '8', language: 'ru', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`, { signal });
  if (!res.ok) throw new Error(`Геокодер: ${res.status}`);
  const data = (await res.json()) as {
    results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

const DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
export const windDirName = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Сериализация для кэша в IndexedDB (Date → число). */
export function serializeForecast(f: Forecast): string {
  return JSON.stringify(f);
}

export function deserializeForecast(s: string): Forecast {
  return JSON.parse(s, (k, v) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && k !== '' ? new Date(v) : v,
  ) as Forecast;
}
