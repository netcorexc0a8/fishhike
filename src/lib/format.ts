const hm = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fullDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

export const fmtTime = (d: Date) => hm.format(d);
export const fmtRange = (a: Date, b: Date) => `${fmtTime(a)} – ${fmtTime(b)}`;
export const fmtFullDate = (d: Date) => {
  const s = fullDate.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const fmtWeekday = (d: Date) => wd.format(d).replace('.', '');
export const fmtScore = (n: number) => n.toFixed(1).replace('.', ',');
export const fmtTemp = (t: number) => `${t > 0 ? '+' : ''}${Math.round(t)}°`;

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function ago(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} ${plural(min, 'минуту', 'минуты', 'минут')} назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = Math.round(h / 24);
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}
