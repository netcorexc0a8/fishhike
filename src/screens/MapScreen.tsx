import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, type Track, type TrackPoint } from '../db';
import { Icon } from '../components/Icon';
import { geoErrorText, getCurrentPosition, useCurrentPlace } from '../hooks';
import { fmtAmount, fmtCatchDay } from '../lib/catches';
import { fmtDistance, fmtDuration, fmtTrackLine } from '../lib/geo';
import { tileAttribution, tileUrl } from '../lib/tiles';
import { finalizeOrphans, pauseTrack, resumeTrack, startTrack, stopTrack, useRecorder } from '../lib/recorder';

// Карта: сохранённые места, улов с координатами и записанные треки. Подложка — OpenStreetMap.

const svg = (d: string, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const FISH = 'M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6zM3 12l-1-3M3 12l-1 3M16 11h.01';
const PIN = 'M12 21s6-5.3 6-10.3a6 6 0 1 0-12 0C6 15.7 12 21 12 21zM12 12.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z';

const placeIcon = L.divIcon({ className: 'map-pin map-pin-place', html: svg(PIN, 17), iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] });
const catchIcon = L.divIcon({ className: 'map-pin map-pin-catch', html: svg(FISH, 17), iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -15] });

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Подпись для всплывашки — DOM, а не HTML-строка: в названиях пользовательский текст. */
function popup(title: string, sub: string, link?: { href: string; text: string }): HTMLElement {
  const box = document.createElement('div');
  const b = document.createElement('div');
  b.className = 'map-pop-title';
  b.textContent = title;
  box.append(b);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'map-pop-sub';
    s.textContent = sub;
    box.append(s);
  }
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    a.className = 'map-pop-link';
    box.append(a);
  }
  return box;
}

const latLngs = (segments: TrackPoint[][]) => segments.filter((s) => s.length).map((s) => s.map((p) => [p.lat, p.lon] as [number, number]));

function boundsOf(points: [number, number][]): L.LatLngBounds | null {
  return points.length ? L.latLngBounds(points) : null;
}

/** Время в движении с учётом идущего отрезка — для живого счётчика. */
function liveMovingMs(segments: TrackPoint[][], recording: boolean, now: number): number {
  let ms = 0;
  segments.forEach((s, i) => {
    if (!s.length) return;
    const end = recording && i === segments.length - 1 ? now : s[s.length - 1].t;
    ms += Math.max(0, end - s[0].t);
  });
  return ms;
}

export default function MapScreen() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('track');
  const focusCatch = params.get('catch');
  const places = useLiveQuery(() => db.places.toArray(), []);
  const catches = useLiveQuery(() => db.catches.filter((c) => c.lat != null && c.lon != null).toArray(), []);
  const tracks = useLiveQuery(() => db.tracks.orderBy('startedAt').reverse().toArray(), []);
  const { place: current } = useCurrentPlace();
  const rec = useRecorder();

  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layers = useRef<{ places: L.LayerGroup; catches: L.LayerGroup; track: L.LayerGroup; live: L.LayerGroup } | null>(null);
  const fitted = useRef(false);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const finished = useMemo(() => tracks?.filter((t) => t.endedAt != null) ?? [], [tracks]);
  const selected = finished.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    finalizeOrphans();
  }, []);

  // Живой счётчик времени, пока идёт запись.
  useEffect(() => {
    if (rec.status !== 'recording') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rec.status]);

  // Карта создаётся один раз.
  useEffect(() => {
    if (!boxRef.current) return;
    const map = L.map(boxRef.current, { zoomControl: false, center: [55.75, 37.62], zoom: 5 });
    L.control.zoom({ position: 'topright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.tileLayer(tileUrl(), { maxZoom: 19, attribution: tileAttribution(), crossOrigin: true }).addTo(map);
    layers.current = {
      places: L.layerGroup().addTo(map),
      track: L.layerGroup().addTo(map),
      live: L.layerGroup().addTo(map),
      catches: L.layerGroup().addTo(map),
    };
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layers.current = null;
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const g = layers.current?.places;
    if (!g || !places) return;
    g.clearLayers();
    for (const p of places) {
      L.marker([p.lat, p.lon], { icon: placeIcon, title: p.name, keyboard: true })
        .bindPopup(popup(p.name, p.id === current?.id ? 'выбрано для прогноза' : p.region))
        .addTo(g);
    }
  }, [places, current]);

  useEffect(() => {
    const g = layers.current?.catches;
    if (!g || !catches) return;
    g.clearLayers();
    for (const c of catches) {
      const facts = [fmtCatchDay(c.caughtAt), c.weightKg != null ? `${fmtAmount(c.weightKg)} кг` : '', c.placeName].filter(Boolean).join(' · ');
      const m = L.marker([c.lat!, c.lon!], { icon: catchIcon, title: c.species, keyboard: true })
        .bindPopup(popup(c.species, facts, { href: `#/catches/${c.id}`, text: 'Открыть запись' }))
        .addTo(g);
      if (c.id === focusCatch) m.openPopup();
    }
  }, [catches, focusCatch]);

  useEffect(() => {
    const g = layers.current?.track;
    if (!g) return;
    g.clearLayers();
    if (!selected) return;
    const lines = latLngs(selected.segments);
    L.polyline(lines, { color: cssVar('--bg'), weight: 9, opacity: 0.55, lineJoin: 'round' }).addTo(g);
    L.polyline(lines, { color: cssVar('--track') || '#abbc99', weight: 5, opacity: 0.95, lineJoin: 'round' }).addTo(g);
    const first = lines[0]?.[0];
    const last = lines.at(-1)?.at(-1);
    if (first) L.circleMarker(first, { radius: 6, color: cssVar('--surface'), weight: 2, fillColor: cssVar('--track'), fillOpacity: 1 }).bindTooltip('Старт').addTo(g);
    if (last) L.circleMarker(last, { radius: 6, color: cssVar('--surface'), weight: 2, fillColor: cssVar('--warm'), fillOpacity: 1 }).bindTooltip('Финиш').addTo(g);
  }, [selected]);

  useEffect(() => {
    const g = layers.current?.live;
    if (!g) return;
    g.clearLayers();
    if (rec.status !== 'idle') {
      L.polyline(latLngs(rec.segments), { color: cssVar('--bg'), weight: 9, opacity: 0.55, lineJoin: 'round' }).addTo(g);
      L.polyline(latLngs(rec.segments), { color: cssVar('--track') || '#abbc99', weight: 5, opacity: 0.95, lineJoin: 'round' }).addTo(g);
    }
    if (rec.position) {
      L.circle([rec.position.lat, rec.position.lon], { radius: rec.position.acc, color: cssVar('--glyph'), weight: 1, fillOpacity: 0.12 }).addTo(g);
      L.circleMarker([rec.position.lat, rec.position.lon], { radius: 7, color: '#ffffff', weight: 3, fillColor: cssVar('--glyph'), fillOpacity: 1 }).addTo(g);
    }
  }, [rec.segments, rec.position, rec.status]);

  // Первый показ: то, ради чего открыли карту, иначе — всё сохранённое.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitted.current || !places || !catches || !tracks) return;
    fitted.current = true;
    const fc = catches.find((c) => c.id === focusCatch);
    if (fc) return void map.setView([fc.lat!, fc.lon!], 15);
    const sel = selected && boundsOf(latLngs(selected.segments).flat());
    if (sel) return void map.fitBounds(sel, { padding: [28, 28], maxZoom: 17 });
    if (rec.position) return void map.setView([rec.position.lat, rec.position.lon], 16);
    const all = boundsOf([...places.map((p) => [p.lat, p.lon] as [number, number]), ...catches.map((c) => [c.lat!, c.lon!] as [number, number])]);
    if (all) map.fitBounds(all, { padding: [36, 36], maxZoom: 13 });
    else if (current) map.setView([current.lat, current.lon], 12);
  }, [places, catches, tracks, selected, focusCatch, current, rec.position]);

  // Во время записи карта следует за позицией; в начале записи — приближаемся к ней.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || rec.status !== 'recording' || !rec.position) return;
    const at: [number, number] = [rec.position.lat, rec.position.lon];
    if (map.getZoom() < 15) map.setView(at, 16);
    else map.panTo(at);
  }, [rec.status, rec.position]);

  const show = (t: Track) => {
    setParams({ track: t.id }, { replace: true });
    const b = boundsOf(latLngs(t.segments).flat());
    if (b) mapRef.current?.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const locate = async () => {
    setLocating(true);
    setMsg(null);
    try {
      const pos = await getCurrentPosition();
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15);
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 7, color: '#ffffff', weight: 3, fillColor: cssVar('--glyph'), fillOpacity: 1 }).addTo(layers.current!.live);
    } catch (e) {
      setMsg(geoErrorText(e));
    } finally {
      setLocating(false);
    }
  };

  const stop = async () => {
    const id = await stopTrack();
    if (id) {
      const t = await db.tracks.get(id);
      if (t) show(t);
    }
  };

  const del = async (id: string) => {
    await db.tracks.delete(id);
    setConfirmId(null);
    if (id === selectedId) setParams({}, { replace: true });
  };

  const empty = places?.length === 0 && catches?.length === 0 && finished.length === 0;

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Карта</h2>
        <Link className="btn btn-sm" to="/places">
          <Icon name="settings" size={18} /> Места и настройки
        </Link>
      </div>

      <div className="map-wrap">
        <div ref={boxRef} className="map-box" role="region" aria-label="Карта мест, улова и треков" />
        <button className="map-locate" onClick={locate} disabled={locating} aria-label="Показать моё местоположение">
          <Icon name="locate" />
        </button>
      </div>
      <div className="map-legend" aria-hidden="true">
        <span><i className="dot dot-place" /> места</span>
        <span><i className="dot dot-catch" /> улов</span>
        <span><i className="dot dot-track" /> трек</span>
      </div>
      {msg && <div className="notice" role="alert">{msg}</div>}
      {empty && <div className="notice">Здесь появятся сохранённые места, улов с координатами и записанные треки.</div>}

      <RecordPanel rec={rec} now={now} onStop={stop} />

      {finished.length > 0 && (
        <>
          <div className="section-title">Треки</div>
          <div className="list">
            {finished.map((t) =>
              confirmId === t.id ? (
                <div key={t.id} className="card-s confirm" role="alert">
                  <div>Удалить «{t.name}»? Это нельзя отменить.</div>
                  <div className="btn-row">
                    <button className="btn" onClick={() => setConfirmId(null)}>Оставить</button>
                    <button className="btn btn-danger-solid" onClick={() => del(t.id)}>Удалить</button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="list-item track-row" style={t.id === selectedId ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}>
                  <button className="track-main" onClick={() => show(t)} aria-pressed={t.id === selectedId}>
                    <span className="track-ico"><Icon name="route" /></span>
                    <span>
                      <span className="title">{t.name}</span>
                      <span className="sub">{fmtTrackLine(t)}</span>
                    </span>
                  </button>
                  <button className="icon-btn" style={{ border: 0, background: 'none' }} aria-label={`Удалить «${t.name}»`} onClick={() => setConfirmId(t.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </main>
  );
}

function RecordPanel({ rec, now, onStop }: { rec: ReturnType<typeof useRecorder>; now: number; onStop: () => void }) {
  if (rec.status === 'idle') {
    return (
      <div className="card record-card">
        <div>
          <div className="title">Запись трека</div>
          <p className="record-hint">Маршрут пишется по GPS, пока приложение открыто: в фоне телефон не отдаёт координаты. Пауза не считается во время в пути.</p>
        </div>
        {rec.error && <div className="notice" role="alert">{rec.error}</div>}
        <button className="btn btn-primary btn-block" onClick={startTrack}>
          <Icon name="play" /> Записать трек
        </button>
      </div>
    );
  }
  const recording = rec.status === 'recording';
  const points = rec.segments.reduce((n, s) => n + s.length, 0);
  return (
    <div className={'card record-card' + (recording ? ' live' : ' paused')} aria-live="polite">
      <div className="record-head">
        <span className={'rec-dot' + (recording ? ' on' : '')} />
        {recording ? (points ? 'Идёт запись' : 'Ждём сигнал GPS…') : 'На паузе'}
      </div>
      <div className="record-nums">
        <div>
          <span>Пройдено</span>
          <b>{fmtDistance(rec.distanceM)}</b>
        </div>
        <div>
          <span>В пути</span>
          <b>{fmtDuration(liveMovingMs(rec.segments, recording, now))}</b>
        </div>
        <div>
          <span>Точность</span>
          <b>{rec.position ? `${rec.position.acc} м` : '—'}</b>
        </div>
      </div>
      {rec.error && <div className="notice" role="alert">{rec.error}</div>}
      {recording && !rec.awake && <div className="notice">Не гасите экран и не сворачивайте приложение: в фоне телефон не отдаёт координаты.</div>}
      <div className="btn-row">
        {recording ? (
          <button className="btn btn-warm" onClick={pauseTrack}>
            <Icon name="pause" /> Пауза трека
          </button>
        ) : (
          <button className="btn btn-primary" onClick={resumeTrack}>
            <Icon name="play" /> Продолжить
          </button>
        )}
        <button className="btn" onClick={onStop}>
          <Icon name="stop" /> Завершить
        </button>
      </div>
    </div>
  );
}

