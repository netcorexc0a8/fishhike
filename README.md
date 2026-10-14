# FishHike — спутник рыбака и туриста

PWA для рыбалки и походов: прогноз клёва по погоде и Луне, списки сборов, походные рецепты и сохранённые места. Работает офлайн и устанавливается на телефон как приложение.

## Возможности

- **Прогноз клёва** — почасовой индекс 0–10 на 16 дней для выбранного места (дни дальше 7-го помечены «ориентировочно»). Учитывает солунарные периоды (точные кульминации, восход и заход Луны для координат места — `astronomy-engine`, офлайн), утреннюю и вечернюю зорьку, тренд давления, ветер, осадки и фазу Луны. Погода — [Open-Meteo](https://open-meteo.com) (без ключа). Последний прогноз кэшируется и показывается без сети.
- **Сборы** — чек-листы с прогрессом: создание, копирование из шаблона, отметки, переименование, удаление. Два стартовых шаблона.
- **Рецепты** — базовые походные рецепты и свои: поиск, создание, редактирование, удаление. Клиентская проверка стоп-слов.
- **Места** — текущая геопозиция или поиск водоёма по названию.
- **Офлайн** — все данные в IndexedDB, оболочка приложения кэшируется service worker'ом.
- **Резервная копия** — «Места → Настройки → Резервная копия»: все сборы, рецепты, места и тема в одном JSON-файле. На телефоне файл отдаётся через системное «Поделиться» (AirDrop, Telegram, «Файлы»), на другом устройстве — «Восстановить». Данные объединяются по id (побеждает более свежая правка), ничего не удаляется.

## Стек

Vite · React 19 · TypeScript · React Router (HashRouter) · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · Vitest. Шрифты Golos Text и Literata встроены в сборку — работают без сети.

## Разработка

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # юнит-тесты (луна, индекс клёва, кэш, модерация)
npm run build      # сборка в dist/
npm run preview    # проверить собранную версию, включая service worker
```

## Деплой

Workflow `.github/workflows/pwa.yml` на каждый PR прогоняет проверку типов, тесты и сборку, а при пуше в `main` публикует приложение на GitHub Pages.

Адрес приложения: **https://fishhike.wg3664.ru**. Сборка рассчитана на корень домена. Для публикации в подкаталоге (`<user>.github.io/fishhike/`) задайте переменную репозитория `BASE_PATH=/fishhike/` (Settings → Secrets and variables → Actions → Variables).

Настройка домена (один раз):
1. DNS: `fishhike.wg3664.ru CNAME netcorexc0a8.github.io` (в Cloudflare — режим «DNS only»).
2. Settings → Pages → Custom domain: `fishhike.wg3664.ru`, затем включить **Enforce HTTPS**.

## Прокси погоды (доступ из России)

Open-Meteo из части российских сетей недоступен. Приложение перебирает адреса по очереди и запоминает рабочий на 6 часов (`src/lib/hosts.ts`):

1. `https://meteo.wg3664.ru` — свой прокси на proxy1/proxy2;
2. `https://api.open-meteo.com` — напрямую;
3. `https://historical-forecast-api.open-meteo.com` — запасной адрес Open-Meteo.

Геокодер — так же: прокси, затем `geocoding-api.open-meteo.com`. Каждой попытке даётся 7 секунд. Списки можно переопределить переменными репозитория `VITE_FORECAST_HOSTS` / `VITE_GEOCODER_HOSTS` (через запятую).

Настройка прокси:
1. **Caddy** на proxy1 и proxy2 — блок из `deploy/meteo.Caddyfile` (только `GET /v1/forecast` и `/v1/search`, CORS для `fishhike.wg3664.ru`, без передачи IP пользователя).
2. **Mihomo** — правило из `deploy/mihomo-rules.yaml`: `DOMAIN-SUFFIX,open-meteo.com` через VLESS.
3. **HAProxy** на OPNsense — SNI `meteo.wg3664.ru` на тот же бэкенд Caddy.
4. **DNS** в Cloudflare — `meteo` A/AAAA на внешний адрес, режим «DNS only». Wildcard-сертификат уже покрывает имя.
5. Проверка из контейнера Caddy, что исходящий трафик идёт через VPN:
   `docker compose exec caddy wget -qO- 'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current=temperature_2m'`
   и снаружи: `curl -s 'https://meteo.wg3664.ru/v1/forecast?latitude=55.75&longitude=37.62&current=temperature_2m'`.

## Структура

```
src/
  lib/          чистая логика: moon.ts, bite.ts, weather.ts, format.ts, moderation.ts (+ тесты)
  screens/      экраны: прогноз, сборы, рецепты, места
  components/   TabBar, Moon, BiteBars, Icon
  db.ts         схема IndexedDB, seed.ts — стартовые данные
  hooks.ts      текущее место, геолокация, загрузка и кэш прогноза
legacy/flutter/ прежняя версия на Flutter (для справки)
```

## Дальше

- Вход и синхронизация через Firebase Auth / Firestore (правила — `firestore.rules.txt`). Все записи уже хранят `updatedAt` для слияния.
- Публичные рецепты и жалобы (`reports`).
- Журнал уловов с привязкой к месту и условиям.
