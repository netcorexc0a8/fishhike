import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';

export function RecipesScreen() {
  const [q, setQ] = useState('');
  const recipes = useLiveQuery(() => db.recipes.orderBy('title').toArray(), []);
  const needle = q.trim().toLowerCase();
  const shown = recipes?.filter(
    (r) =>
      !needle ||
      r.title.toLowerCase().includes(needle) ||
      r.tags.some((t) => t.includes(needle)) ||
      r.ingredients.some((i) => i.toLowerCase().includes(needle)),
  );

  return (
    <main className="screen">
      <div className="topbar">
        <h2>Рецепты</h2>
        <Link className="icon-btn" to="/recipes/new" aria-label="Новый рецепт">
          <Icon name="plus" />
        </Link>
      </div>
      <div className="field">
        <label htmlFor="rq" className="sr-only">Поиск рецептов</label>
        <input id="rq" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: уха, щука, костёр…" />
      </div>
      <div className="list">
        {shown?.map((r) => (
          <Link key={r.id} className="list-item" to={`/recipes/${r.id}`}>
            <div>
              <div className="title">{r.title}</div>
              <div className="sub">
                {r.minutes} мин · {r.servings} порц.{r.builtin ? '' : ' · мой рецепт'}
              </div>
            </div>
            <Icon name="chevronRight" />
          </Link>
        ))}
        {shown?.length === 0 && <div className="empty">Ничего не нашлось.</div>}
      </div>
    </main>
  );
}
