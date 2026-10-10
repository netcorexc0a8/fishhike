// Простая клиентская модерация (требование RE-03): поиск стоп-слов по корням.
// Список намеренно короткий — расширяется по мере необходимости.
const STOP_ROOTS = ['хуй', 'хуе', 'хуё', 'пизд', 'ебат', 'ёбан', 'ебан', 'бляд', 'сука', 'мудак', 'гандон', 'пидор'];

export function findStopWords(text: string): string[] {
  const words = text.toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/i);
  const roots = STOP_ROOTS.map((r) => r.replace(/ё/g, 'е'));
  return words.filter((w) => w && roots.some((r) => w.includes(r)));
}
