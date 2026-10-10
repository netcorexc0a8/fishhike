import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Прогноз', icon: 'fish', end: true },
  { to: '/checklists', label: 'Сборы', icon: 'check' },
  { to: '/recipes', label: 'Рецепты', icon: 'pot' },
  { to: '/places', label: 'Места', icon: 'pin' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Разделы">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
