import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { recipePhoto } from '../lib/recipePhotos';

export function RecipeDetailScreen() {
  const { id = '' } = useParams();
  const recipe = useLiveQuery(() => db.recipes.get(id).then((r) => r ?? null), [id]);
  const navigate = useNavigate();

  if (recipe === undefined) return <main className="screen" />;
  if (recipe === null) {
    return (
      <main className="screen">
        <Link className="back-btn" to="/recipes"><Icon name="chevronLeft" /> Рецепты</Link>
        <div className="empty">Рецепт не найден.</div>
      </main>
    );
  }

  const photo = recipePhoto(recipe.id);

  const del = async () => {
    if (!confirm(`Удалить рецепт «${recipe.title}»?`)) return;
    await db.recipes.delete(recipe.id);
    navigate('/recipes');
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="back-btn" to="/recipes"><Icon name="chevronLeft" /> Рецепты</Link>
        <Link className="icon-btn" to={`/recipes/${recipe.id}/edit`} aria-label="Редактировать рецепт">
          <Icon name="edit" />
        </Link>
      </div>
      {photo && (
        <figure className="recipe-hero">
          <img src={photo.src} alt={photo.alt} />
          <figcaption>
            Фото: <a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.author}</a>, {photo.license}
          </figcaption>
        </figure>
      )}
      <div>
        <h1 className="headline" style={{ fontSize: 30 }}>{recipe.title}</h1>
        <div className="facts" style={{ marginTop: 8 }}>
          <span><Icon name="clock" size={16} /> {recipe.minutes} мин</span>
          <span><Icon name="people" size={16} /> {recipe.servings} порц.</span>
        </div>
      </div>
      {recipe.tags.length > 0 && (
        <div className="tags">
          {recipe.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      <div className="section-title">Ингредиенты</div>
      <section className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        <ul className="ing">
          {recipe.ingredients.map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ul>
      </section>

      <div className="section-title">Приготовление</div>
      <ol className="steps">
        {recipe.steps.map((s, n) => (
          <li key={n}>{s}</li>
        ))}
      </ol>

      {!recipe.builtin && (
        <button className="btn btn-danger" onClick={del}>
          <Icon name="trash" /> Удалить рецепт
        </button>
      )}
    </main>
  );
}
