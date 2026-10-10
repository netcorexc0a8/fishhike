import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, type Checklist } from '../db';
import { Icon } from '../components/Icon';
import { plural } from '../lib/format';

export function ChecklistsScreen() {
  const lists = useLiveQuery(() => db.checklists.orderBy('updatedAt').reverse().toArray(), []);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const navigate = useNavigate();

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const tpl = templateId ? lists?.find((l) => l.id === templateId) : undefined;
    const now = Date.now();
    const list: Checklist = {
      id: uid(),
      title: name,
      items: tpl ? tpl.items.map((i) => ({ id: uid(), text: i.text, done: false })) : [],
      createdAt: now,
      updatedAt: now,
    };
    await db.checklists.add(list);
    navigate(`/checklists/${list.id}`);
  };

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Сборы</h2>
      </div>

      <div className="list">
        {lists?.map((l) => {
          const done = l.items.filter((i) => i.done).length;
          return (
            <Link key={l.id} className="list-item" to={`/checklists/${l.id}`}>
              <div>
                <div className="title">{l.title}</div>
                <div className="sub">
                  {l.items.length === 0
                    ? 'пустой список'
                    : `${done} из ${l.items.length} ${plural(l.items.length, 'пункта', 'пунктов', 'пунктов')}`}
                </div>
                <div className="progress">
                  <i style={{ width: `${l.items.length ? (done / l.items.length) * 100 : 0}%` }} />
                </div>
              </div>
              <Icon name="chevronRight" />
            </Link>
          );
        })}
        {lists?.length === 0 && <div className="empty">Списков пока нет — создайте первый ниже.</div>}
      </div>

      <form className="card" onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>Новый список</div>
        <div className="field">
          <label htmlFor="cl-title">Название</label>
          <input
            id="cl-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Зимняя рыбалка"
          />
        </div>
        <div className="field">
          <label htmlFor="cl-tpl">Скопировать пункты из</label>
          <select id="cl-tpl" className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— пустой список —</option>
            {lists?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
          <Icon name="plus" /> Создать
        </button>
      </form>
    </main>
  );
}
