import { useRef, useState, type ChangeEvent } from 'react';
import { Icon } from './Icon';
import { createBackup, deliverBackup, parseBackup, restoreBackup } from '../lib/backup';
import { plural } from '../lib/format';
import { setTheme, type ThemeMode } from '../lib/theme';

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function BackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const b = await createBackup();
      const how = await deliverBackup(b);
      const n = b.data.checklists.length + b.data.recipes.filter((r) => !r.builtin).length + b.data.places.length;
      if (how === 'shared') setStatus({ kind: 'ok', text: `Копия отправлена: ${n} ${plural(n, 'запись', 'записи', 'записей')}.` });
      if (how === 'downloaded') setStatus({ kind: 'ok', text: 'Файл копии сохранён в загрузки.' });
    } catch {
      setStatus({ kind: 'error', text: 'Не удалось создать копию. Попробуйте ещё раз.' });
    } finally {
      setBusy(false);
    }
  };

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // чтобы можно было выбрать тот же файл повторно
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Файл слишком большой для резервной копии FishHike.');
      const b = parseBackup(await file.text());
      const total = b.data.checklists.length + b.data.recipes.length + b.data.places.length;
      if (total === 0) throw new Error('В файле нет данных для восстановления.');
      const r = await restoreBackup(b);
      if (b.data.theme) setTheme(b.data.theme as ThemeMode);
      const parts = [
        r.added && `добавлено ${r.added}`,
        r.updated && `обновлено ${r.updated}`,
        r.skipped && `без изменений ${r.skipped}`,
      ].filter(Boolean);
      setStatus({ kind: 'ok', text: `Готово: ${parts.join(', ')}.` });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Не удалось прочитать файл.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field" style={{ gap: 10 }}>
      <span className="label">Резервная копия</span>
      <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
        Сборы, свои рецепты и места — в одном файле. Отправьте его себе (AirDrop, Telegram, «Файлы») и восстановите на
        другом телефоне. Данные объединяются, ничего не удаляется.
      </p>
      <div className="btn-row">
        <button className="btn" onClick={save} disabled={busy}>
          <Icon name="share" /> Сохранить
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="download" /> Восстановить
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={restore}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {status && (
        <div className="notice" role={status.kind === 'error' ? 'alert' : 'status'} style={status.kind === 'error' ? { color: 'var(--danger)' } : undefined}>
          {status.text}
        </div>
      )}
    </div>
  );
}
