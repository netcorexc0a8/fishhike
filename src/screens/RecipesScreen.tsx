import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { SwipeRow } from '../components/SwipeRow';
import { recipePhoto } from '../lib/recipePhotos';

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
        {shown?.map((r) => {
          const photo = recipePhoto(r.id);
          const card = (
            <Link className={'recipe-card' + (photo ? '' : ' no-photo')} to={`/recipes/${r.id}`}>
              {photo && <img className="recipe-photo" src={photo.src} alt="" loading="lazy" />}
              <div className="recipe-body">
                <div className="title">{r.title}</div>
                <div className="facts">
                  <span><Icon name="clock" size={15} /> {r.minutes} мин</span>
                  <span><Icon name="people" size={15} /> {r.servings} порц.</span>
                  {!r.builtin && <span className="tag">мой рецепт</span>}
                </div>
              </div>
              {!photo && <Icon name="chevronRight" />}
            </Link>
          );
          // Встроенные рецепты не удаляются — как и на экране рецепта.
          if (r.builtin) return <Fragment key={r.id}>{card}</Fragment>;
          return (
            <SwipeRow key={r.id} label={r.title} radius="l" onDelete={() => db.recipes.delete(r.id)}>
              {card}
            </SwipeRow>
          );
        })}
        {shown?.length === 0 && <div className="empty">Ничего не нашлось.</div>}
      </div>
    </main>
  );
}
