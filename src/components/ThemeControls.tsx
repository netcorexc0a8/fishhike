import { Icon, type IconName } from './Icon';
import { nextTheme, setTheme, THEME_LABEL, useTheme, type ThemeMode } from '../lib/theme';

const ICON: Record<ThemeMode, IconName> = { system: 'themeAuto', light: 'sun', dark: 'moon' };

/** Кнопка в шапке: по нажатию переключает система → светлая → тёмная. */
export function ThemeToggle() {
  const mode = useTheme();
  const next = nextTheme(mode);
  return (
    <button
      className="icon-btn"
      onClick={() => setTheme(next)}
      aria-label={`Тема: ${THEME_LABEL[mode]}. Переключить на «${THEME_LABEL[next]}»`}
      title={`Тема: ${THEME_LABEL[mode]}`}
    >
      <Icon name={ICON[mode]} />
    </button>
  );
}

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Системная' },
  { mode: 'light', label: 'Светлая' },
  { mode: 'dark', label: 'Тёмная' },
];

/** Явный выбор темы — для экрана настроек. */
export function ThemePicker() {
  const mode = useTheme();
  return (
    <div className="field">
      <span className="label" id="theme-label">Оформление</span>
      <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
        {OPTIONS.map((o) => (
          <button key={o.mode} role="radio" aria-checked={mode === o.mode} onClick={() => setTheme(o.mode)}>
            <Icon name={ICON[o.mode]} size={18} />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
