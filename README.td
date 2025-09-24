# FishHike

Приложение на Flutter для рыбалки и походов. Содержит чек‑листы для подготовки, лунный прогноз клёва с учётом погоды и коллекцию походных рецептов. Работает офлайн и синхронизируется через Firebase/Firestore.

## Возможности
- Домашний экран-навигатор
- Чек-листы (офлайн сохранение прогресса)
- Рецепты: просмотр, создание, редактирование, удаление
  - Жалобы на контент (reports в Firestore)
  - Простая клиентская модерация (фильтр стоп-слов)
- Лунный прогноз клёва + погодные факторы (Open‑Meteo API)
- Офлайн кэш локально (file-backed JSON, `path_provider`)
- Интеграция Firebase (Auth, Firestore)

## Технологии
- Flutter (Material 3), Dart
- Маршрутизация: go_router
- Состояние: Riverpod
- HTTP: Dio
- i18n/форматирование дат: intl
- Firebase: firebase_core, firebase_auth, cloud_firestore
- Локальное хранилище: path_provider (кастомный LocalStore)

## Структура проекта
```
lib/
  main.dart                      // Точка входа
  src/
    core/
      offline/local_store.dart   // Простое локальное JSON‑хранилище
      repository/repository.dart // Контракты репозиториев
      router/app_router.dart     // Маршруты приложения
      services/moderation_service.dart // Фильтр нежелательного контента
    features/
      home/presentation/home_screen.dart
      checklist/
        domain/checklist.dart
        data/checklist_repository.dart
        presentation/checklist_screen.dart
      recipes/
        domain/recipe.dart
        data/recipe_repository.dart
        presentation/recipe_screen.dart
      lunar/presentation/lunar_fishing_screen.dart
    firebase_options.dart        // Генерируется FlutterFire
```

## Подготовка окружения
Требуется Flutter 3.x и Dart 3.x.

1) Установить зависимости:
```
flutter pub get
```

2) Настроить Firebase (сгенерировать `firebase_options.dart`):
```
flutter pub add firebase_core firebase_auth cloud_firestore
flutterfire configure
```
Это создаст и заполнит `lib/src/firebase_options.dart` под ваши проекты iOS/Android/Web.

3) (Опционально) Настроить правила Firestore — см. `firestore.rules.txt`.

4) Запуск приложения:
```
flutter run
```

## Архитектура
- Feature‑first: каждая фича отделена по слоям domain/data/presentation
- Repository pattern: абстракция поверх источников данных (локально/онлайн)
- Разделение core и features для переиспользуемых компонентов

## Конфиденциальность и модерация
- Базовый клиентский фильтр через `ModerationService`
- Система жалоб: записи в коллекцию `reports` в Firestore

## Планы развития (Roadmap)
- Пагинация и поиск для рецептов
- Перенос бизнес‑логики Firebase из UI в сервисы/репозитории
- Улучшение локализации (l10n) и перевод строк интерфейса
- Тесты (unit/widget) и CI
