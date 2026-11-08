import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, uid, type Checklist } from '../db';
import { Icon } from '../components/Icon';
import { SwipeRow } from '../components/SwipeRow';
import { plural } from '../lib/format';

const isPacked = (l: Checklist) => l.items.length > 0 && l.items.every((i) => i.done);

/** «Рыбалка на день» → «Рыбалка на день (2)», если такое название уже есть. */
export function uniqueTitle(base: string, taken: string[]): string {
  const set = new Set(taken.map((t) => t.toLowerCase()));
  if (!set.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) if (!set.has(`${base} (${n})`.toLowerCase())) return `${base} (${n})`;
}

function ListRow({ l }: { l: Checklist }) {
  const done = l.items.filter((i) => i.done).length;
  return (
    <SwipeRow label={l.title} onDelete={() => db.checklists.delete(l.id)}>
      <Link className="list-item" to={`/checklists/${l.id}`}>
        <div>
          <div className="title">{l.title}</div>
          <div className="sub">
            {l.items.length === 0 ? 'пустой список' : `${done} из ${l.items.length} ${plural(l.items.length, 'пункта', 'пунктов', 'пунктов')}`}
          </div>
          <div className="progress">
            <i style={{ width: `${l.items.length ? (done / l.items.length) * 100 : 0}%` }} />
          </div>
        </div>
        <Icon name="chevronRight" />
      </Link>
    </SwipeRow>
  );
}

export function ChecklistsScreen() {
  const lists = useLiveQuery(() => db.checklists.orderBy('updatedAt').reverse().toArray(), []);
  const [open, setOpen] = useState(false);
  const active = lists?.filter((l) => !isPacked(l)) ?? [];
  const packed = lists?.filter(isPacked) ?? [];

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Сборы</h2>
      </div>

      {lists?.length === 0 ? (
        <div className="card empty-catch">
          <Icon name="check" size={36} />
          <div className="title">Списков пока нет</div>
          <p>Соберите вещи по списку и отмечайте, что уже в рюкзаке. Начните с пустого списка.</p>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" /> Создать список
          </button>
        </div>
      ) : (
        <>
          <div className="list">
            {active.map((l) => (
              <ListRow key={l.id} l={l} />
            ))}
            {lists && active.length === 0 && <div className="notice">Всё собрано. Новый список — кнопкой «+».</div>}
          </div>
          {packed.length > 0 && (
            <details className="packed">
              <summary>
                <span>Собрано · {packed.length}</span>
                <Icon name="chevronDown" size={18} />
              </summary>
              <div className="list">
                {packed.map((l) => (
                  <ListRow key={l.id} l={l} />
                ))}
              </div>
            </details>
          )}
          <button className="fab" onClick={() => setOpen(true)} aria-label="Новый список">
            <Icon name="plus" size={26} />
          </button>
        </>
      )}

      {open && lists && <NewListSheet lists={lists} onClose={() => setOpen(false)} />}
    </main>
  );
}

function NewListSheet({ lists, onClose }: { lists: Checklist[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tpl = lists.find((l) => l.id === templateId);
  const placeholder = uniqueTitle(tpl ? tpl.title : 'Новый список', lists.map((l) => l.title));

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const list: Checklist = {
      id: uid(),
      title: title.trim() || placeholder,
      items: tpl ? tpl.items.map((i) => ({ id: uid(), text: i.text, done: false })) : [],
      createdAt: now,
      updatedAt: now,
    };
    await db.checklists.add(list);
    navigate(`/checklists/${list.id}`);
  };

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onSubmit={create}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id="sheet-title">Новый список</h2>
          <button type="button" className="onb-skip" onClick={onClose}>Отмена</button>
        </div>
        <div className="field">
          <label htmlFor="cl-title">Название</label>
          <input id="cl-title" ref={inputRef} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} />
        </div>
        <div className="field">
          <span className="label-strong" id="cl-tpl">Пункты</span>
          <div className="pills wrap" role="radiogroup" aria-labelledby="cl-tpl">
            <button type="button" className="pill" role="radio" aria-checked={!templateId} aria-pressed={!templateId} onClick={() => setTemplateId('')}>
              Пустой
            </button>
            {lists.map((l) => (
              <button key={l.id} type="button" className="pill" role="radio" aria-checked={templateId === l.id} aria-pressed={templateId === l.id} onClick={() => setTemplateId(l.id)}>
                {l.title} · {l.items.length}
              </button>
            ))}
          </div>
          <div className="label">{tpl ? `Скопируем ${tpl.items.length} ${plural(tpl.items.length, 'пункт', 'пункта', 'пунктов')} без отметок.` : 'Пункты добавите в самом списке.'}</div>
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          <Icon name="plus" /> Создать
        </button>
      </form>
    </div>
  );
}
