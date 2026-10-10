import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, type Checklist } from '../db';
import { Icon } from '../components/Icon';

export function ChecklistDetailScreen() {
  const { id = '' } = useParams();
  const list = useLiveQuery(() => db.checklists.get(id).then((l) => l ?? null), [id]);
  const [text, setText] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  if (list === undefined) return <main className="screen" />;
  if (list === null) {
    return (
      <main className="screen">
        <Link className="back-btn" to="/checklists"><Icon name="chevronLeft" /> Сборы</Link>
        <div className="empty">Список не найден.</div>
      </main>
    );
  }

  const save = (patch: Partial<Checklist>) => db.checklists.update(list.id, { ...patch, updatedAt: Date.now() });
  const done = list.items.filter((i) => i.done).length;

  const toggle = (itemId: string) =>
    save({ items: list.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) });
  const remove = (itemId: string) => save({ items: list.items.filter((i) => i.id !== itemId) });
  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    save({ items: [...list.items, { id: uid(), text: t, done: false }] });
    setText('');
  };
  const resetAll = () => save({ items: list.items.map((i) => ({ ...i, done: false })) });
  const del = async () => {
    if (!confirm(`Удалить список «${list.title}»?`)) return;
    await db.checklists.delete(list.id);
    navigate('/checklists');
  };
  const rename = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) save({ title: title.trim() });
    setRenaming(false);
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="back-btn" to="/checklists"><Icon name="chevronLeft" /> Сборы</Link>
        <button
          className="icon-btn"
          aria-label="Переименовать список"
          onClick={() => {
            setTitle(list.title);
            setRenaming(true);
          }}
        >
          <Icon name="edit" />
        </button>
      </div>

      {renaming ? (
        <form onSubmit={rename} className="row">
          <label htmlFor="rename" className="sr-only">Название списка</label>
          <input id="rename" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <button className="btn btn-primary" type="submit">OK</button>
        </form>
      ) : (
        <div>
          <h1 className="headline" style={{ fontSize: 30 }}>{list.title}</h1>
          <div className="eyebrow" style={{ marginTop: 6 }}>Собрано {done} из {list.items.length}</div>
          <div className="progress"><i style={{ width: `${list.items.length ? (done / list.items.length) * 100 : 0}%` }} /></div>
        </div>
      )}

      <div className="card-flush">
        {list.items.map((i) => (
          <div key={i.id} className={'check-row' + (i.done ? ' done' : '')}>
            <label>
              <input type="checkbox" checked={i.done} onChange={() => toggle(i.id)} />
              <span>{i.text}</span>
            </label>
            <button className="icon-btn" style={{ border: 0, background: 'none' }} aria-label={`Удалить «${i.text}»`} onClick={() => remove(i.id)}>
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        <form className="add-row" onSubmit={add}>
          <label htmlFor="new-item" className="sr-only">Новый пункт</label>
          <input id="new-item" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Добавить пункт" />
          <button className="btn btn-primary" type="submit" aria-label="Добавить пункт" disabled={!text.trim()}>
            <Icon name="plus" />
          </button>
        </form>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={resetAll} disabled={done === 0}>
          <Icon name="reset" /> Снять отметки
        </button>
        <button className="btn btn-danger" onClick={del}>
          <Icon name="trash" /> Удалить список
        </button>
      </div>
    </main>
  );
}
