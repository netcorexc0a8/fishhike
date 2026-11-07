import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const TABS: { to: string; label: string; icon: IconName; end?: boolean; also?: string }[] = [
  { to: '/', label: 'Прогноз', icon: 'fish', end: true },
  { to: '/catches', label: 'Улов', icon: 'basket' },
  { to: '/checklists', label: 'Сборы', icon: 'check' },
  { to: '/recipes', label: 'Рецепты', icon: 'pot' },
  // «Места и настройки» открываются с карты — вкладка остаётся подсвеченной.
  { to: '/map', label: 'Карта', icon: 'map', also: '/places' },
];

/** spotlight — индекс вкладки, подсвеченной в обучении; undefined — обучение не идёт. */
export function TabBar({ spotlight }: { spotlight?: number | null }) {
  const touring = spotlight !== undefined;
  const { pathname } = useLocation();
  return (
    <nav className={'tabbar' + (touring ? ' touring' : '')} aria-label="Разделы" inert={touring || undefined}>
      <div className="tabbar-inner">
        {TABS.map((t, i) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => 'tab' + (isActive || (t.also && pathname.startsWith(t.also)) ? ' active' : '') + (touring && spotlight === i ? ' spot' : '')}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
