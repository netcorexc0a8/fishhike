import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setSetting } from '../db';
import { Icon, type IconName } from './Icon';

export const ONBOARDING_KEY = 'onboardingDone';
/** Событие для повторного показа подсказок (кнопка на экране «Места»). */
export const ONBOARDING_EVENT = 'fishhike:onboarding';

interface Step {
  /** Индекс вкладки в TabBar, которую подсвечиваем; null — приветствие без подсветки. */
  tab: number | null;
  route: string;
  icon: IconName;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    tab: null,
    route: '/',
    icon: 'fish',
    title: 'Добро пожаловать в FishHike',
    text: 'Короткая экскурсия по четырём разделам — займёт полминуты. Всё работает и без интернета.',
  },
  {
    tab: 0,
    route: '/',
    icon: 'fish',
    title: 'Прогноз',
    text: 'Индекс клёва по часам на 16 дней для выбранного места: погода, давление, ветер и фаза Луны. Жёлтые столбики — лучшее время, дни дальше недели — ориентировочно.',
  },
  {
    tab: 1,
    route: '/checklists',
    icon: 'check',
    title: 'Сборы',
    text: 'Списки вещей с отметками. Есть готовые шаблоны «на день» и «с ночёвкой» — копируйте и правьте под себя.',
  },
  {
    tab: 2,
    route: '/recipes',
    icon: 'pot',
    title: 'Рецепты',
    text: 'Походная кухня: уха, рыба на углях и другое. Добавляйте свои рецепты кнопкой «+».',
  },
  {
    tab: 3,
    route: '/places',
    icon: 'pin',
    title: 'Места',
    text: 'Добавьте текущую позицию или найдите водоём по названию — прогноз считается для выбранного места.',
  },
];

export function Onboarding({
  onStepTab,
  waiting = false,
}: {
  onStepTab: (tab: number | null | undefined) => void;
  /** Пока открыт экран установки, первое обучение ждёт. */
  waiting?: boolean;
}) {
  const done = useLiveQuery(() => db.settings.get(ONBOARDING_KEY).then((s) => s?.value === '1'), []);
  const [forced, setForced] = useState(false);
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const open = forced || (done === false && !waiting);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useEffect(() => {
    const replay = () => {
      setI(0);
      setForced(true);
    };
    window.addEventListener(ONBOARDING_EVENT, replay);
    return () => window.removeEventListener(ONBOARDING_EVENT, replay);
  }, []);

  useEffect(() => {
    if (!open) {
      onStepTab(undefined);
      return;
    }
    onStepTab(step.tab);
    navigate(step.route);
    primaryRef.current?.focus();
  }, [open, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = async () => {
    setForced(false);
    onStepTab(undefined);
    await setSetting(ONBOARDING_KEY, '1');
    navigate('/');
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="onb-backdrop">
      <div className="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title" aria-describedby="onb-text">
        <div className="spread" style={{ alignItems: 'center' }}>
          <div className="onb-icon" aria-hidden="true">
            <Icon name={step.icon} size={24} />
          </div>
          <button className="onb-skip" onClick={finish}>
            Пропустить
          </button>
        </div>
        <h2 id="onb-title" className="onb-title">{step.title}</h2>
        <p id="onb-text" className="onb-text">{step.text}</p>
        <div className="spread" style={{ alignItems: 'center' }}>
          <div className="onb-dots" aria-label={`Шаг ${i + 1} из ${STEPS.length}`} role="img">
            {STEPS.map((_, n) => (
              <i key={n} className={n === i ? 'on' : undefined} />
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {i > 0 && (
              <button className="btn" onClick={() => setI(i - 1)} aria-label="Назад">
                <Icon name="chevronLeft" />
              </button>
            )}
            <button ref={primaryRef} className="btn btn-primary" onClick={() => (last ? finish() : setI(i + 1))}>
              {last ? 'Начать' : i === 0 ? 'Показать' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
