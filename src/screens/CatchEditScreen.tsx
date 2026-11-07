import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, type Catch } from '../db';
import { Icon } from '../components/Icon';
import { CatchPhoto } from '../components/CatchPhoto';
import { geoErrorText, getCurrentPosition, useCurrentPlace } from '../hooks';
import { fromLocalInput, normalizeSpecies, parseAmount, SPECIES, toLocalInput, fmtAmount } from '../lib/catches';
import { compressPhoto } from '../lib/photo';

export function CatchEditScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { place: current } = useCurrentPlace();
  const places = useLiveQuery(() => db.places.toArray(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [orig, setOrig] = useState<Catch | null>(null);
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [when, setWhen] = useState(() => toLocalInput(Date.now()));
  const [placeName, setPlaceName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photo' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeTouched, setPlaceTouched] = useState(false);

  useEffect(() => {
    if (!id) return;
    db.catches.get(id).then((c) => {
      if (!c) return;
      setOrig(c);
      setSpecies(c.species);
      setWeight(c.weightKg != null ? fmtAmount(c.weightKg) : '');
      setLength(c.lengthCm != null ? fmtAmount(c.lengthCm) : '');
      setWhen(toLocalInput(c.caughtAt));
      setPlaceName(c.placeName);
      setCoords(c.lat != null && c.lon != null ? { lat: c.lat, lon: c.lon } : null);
      setTags(c.tags.join(', '));
      setNote(c.note);
      setPhoto(c.photo);
      setPlaceTouched(true);
    });
  }, [id]);

  // Новая запись: место по умолчанию — выбранное для прогноза.
  useEffect(() => {
    if (id || placeTouched || !current) return;
    setPlaceName(current.name);
    setCoords({ lat: current.lat, lon: current.lon });
  }, [id, current, placeTouched]);

  const onPlace = (v: string) => {
    setPlaceTouched(true);
    setPlaceName(v);
    const saved = places?.find((p) => p.name === v);
    setCoords(saved ? { lat: saved.lat, lon: saved.lon } : null);
  };

  const onGps = async () => {
    setBusy('gps');
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setPlaceTouched(true);
      if (!placeName.trim()) setPlaceName('Моё местоположение');
    } catch (e) {
      setError(geoErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('photo');
    setError(null);
    try {
      setPhoto(await compressPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть фото.');
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sp = normalizeSpecies(species);
    const w = parseAmount(weight);
    const l = parseAmount(length);
    const at = fromLocalInput(when);
    if (!sp) return setError('Укажите вид рыбы.');
    if (Number.isNaN(w)) return setError('Вес — положительное число в килограммах, например 4,2.');
    if (Number.isNaN(l)) return setError('Длина — положительное число в сантиметрах, например 78.');
    if (at == null) return setError('Укажите дату и время поимки.');
    const data = {
      species: sp,
      weightKg: w,
      lengthCm: l,
      caughtAt: at,
      placeName: placeName.trim(),
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      note: note.trim(),
      photo,
    };
    const now = Date.now();
    try {
      if (orig) {
        await db.catches.update(orig.id, { ...data, updatedAt: now });
        navigate(`/catches/${orig.id}`, { replace: true });
      } else {
        const cid = uid();
        await db.catches.add({ ...data, id: cid, createdAt: now, updatedAt: now });
        navigate(`/catches/${cid}`, { replace: true });
      }
    } catch {
      setError('Не удалось сохранить: на телефоне мало места. Удалите старые фото или освободите память.');
    }
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="back-btn" to={orig ? `/catches/${orig.id}` : '/catches'}>
          <Icon name="chevronLeft" /> Отмена
        </Link>
      </div>
      <h1 className="headline" style={{ fontSize: 30 }}>{id ? 'Изменить запись' : 'Новый улов'}</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="photo-pick">
          <CatchPhoto c={{ photo, species }} className="large" />
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy === 'photo'}>
              <Icon name="camera" /> {busy === 'photo' ? 'Сжимаем…' : photo ? 'Заменить' : 'Добавить фото'}
            </button>
            {photo && (
              <button type="button" className="btn btn-danger" onClick={() => setPhoto(null)}>
                Убрать фото
              </button>
            )}
          </div>
          {!photo && <div className="label">Без своего фото покажем снимок вида, если он есть.</div>}
          <input ref={fileRef} id="c-photo" type="file" accept="image/*" hidden onChange={onFile} />
        </div>

        <div className="field">
          <label htmlFor="c-species">Вид</label>
          <input id="c-species" className="input" list="c-species-list" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Щука" autoComplete="off" />
          <datalist id="c-species-list">
            {SPECIES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="c-weight">Вес, кг</label>
            <input id="c-weight" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="4,2" />
          </div>
          <div className="field">
            <label htmlFor="c-length">Длина, см</label>
            <input id="c-length" className="input" inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} placeholder="78" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="c-when">Когда поймана</label>
          <input id="c-when" className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="c-place">Место</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="c-place" className="input" list="c-place-list" value={placeName} onChange={(e) => onPlace(e.target.value)} placeholder="р. Ока, у моста" autoComplete="off" style={{ flex: '1 1 auto', minWidth: 0 }} />
            <button type="button" className="icon-btn" onClick={onGps} disabled={busy === 'gps'} aria-label="Записать координаты по GPS">
              <Icon name="locate" />
            </button>
          </div>
          <datalist id="c-place-list">
            {places?.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <div className="label">
            {busy === 'gps' ? 'Определяем позицию…' : coords ? `Координаты: ${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°` : 'Без координат'}
          </div>
        </div>
        <div className="field">
          <label htmlFor="c-tags">Снасти и приманки через запятую</label>
          <input id="c-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="спиннинг, джиг" />
        </div>
        <div className="field">
          <label htmlFor="c-note">Заметка</label>
          <textarea id="c-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Глубина, погода, на что клевало" />
        </div>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy === 'photo'}>Сохранить</button>
      </form>
    </main>
  );
}
