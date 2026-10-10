import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, uid, type Recipe } from '../db';
import { Icon } from '../components/Icon';
import { findStopWords } from '../lib/moderation';

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

export function RecipeEditScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orig, setOrig] = useState<Recipe | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [servings, setServings] = useState('2');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    db.recipes.get(id).then((r) => {
      if (!r) return;
      setOrig(r);
      setTitle(r.title);
      setMinutes(String(r.minutes));
      setServings(String(r.servings));
      setTags(r.tags.join(', '));
      setIngredients(r.ingredients.join('\n'));
      setSteps(r.steps.join('\n'));
    });
  }, [id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = {
      title: title.trim(),
      minutes: Math.max(1, parseInt(minutes, 10) || 0),
      servings: Math.max(1, parseInt(servings, 10) || 0),
      tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      ingredients: lines(ingredients),
      steps: lines(steps),
    };
    if (!data.title || data.ingredients.length === 0 || data.steps.length === 0) {
      setError('Заполните название, хотя бы один ингредиент и один шаг.');
      return;
    }
    const bad = findStopWords([data.title, ...data.tags, ...data.ingredients, ...data.steps].join(' '));
    if (bad.length) {
      setError('Текст содержит недопустимые слова — исправьте, пожалуйста.');
      return;
    }
    const now = Date.now();
    if (orig) {
      await db.recipes.update(orig.id, { ...data, updatedAt: now });
      navigate(`/recipes/${orig.id}`, { replace: true });
    } else {
      const rid = uid();
      await db.recipes.add({ ...data, id: rid, builtin: false, createdAt: now, updatedAt: now });
      navigate(`/recipes/${rid}`, { replace: true });
    }
  };

  return (
    <main className="screen">
      <div className="topbar">
        <Link className="back-btn" to={orig ? `/recipes/${orig.id}` : '/recipes'}>
          <Icon name="chevronLeft" /> Отмена
        </Link>
      </div>
      <h1 className="headline" style={{ fontSize: 30 }}>{id ? 'Редактировать рецепт' : 'Новый рецепт'}</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="r-title">Название</label>
          <input id="r-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Щука в фольге" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="r-min">Время, мин</label>
            <input id="r-min" className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-srv">Порций</label>
            <input id="r-srv" className="input" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-tags">Теги через запятую</label>
          <input id="r-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="рыба, костёр" />
        </div>
        <div className="field">
          <label htmlFor="r-ing">Ингредиенты — по одному в строке</label>
          <textarea id="r-ing" className="textarea" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="r-steps">Шаги — по одному в строке</label>
          <textarea id="r-steps" className="textarea" style={{ minHeight: 160 }} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </div>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit">Сохранить</button>
      </form>
    </main>
  );
}
