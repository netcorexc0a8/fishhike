# FishHike Project Overview.

## Общее описание
FishHike — это Flutter-приложение для рыбалки и походов. Оно предоставляет чек-листы для подготовки, лунный прогноз клёва с учётом погоды и коллекцию походных рецептов. Приложение работает офлайн и синхронизируется через Firebase/Firestore.

## Возможности
- **Домашний экран**: Навигация по основным разделам через карточки.
- **Чек-листы**: Категории с элементами, офлайн сохранение прогресса (чекбоксы).
- **Рецепты**: Просмотр, создание, редактирование, удаление рецептов. Поддержка жалоб на контент (reports в Firestore). Клиентская модерация через фильтр стоп-слов.
- **Лунный прогноз**: Расчёт фаз луны и прогноз клёва на основе погоды (API Open-Meteo). Работает онлайн и офлайн.
- **Офлайн режим**: Локальное хранение данных в JSON-файлах (path_provider).
- **Синхронизация**: Firebase Auth и Firestore для онлайн-данных.

## Архитектура
- **Feature-first**: Каждая фича (home, checklist, recipes, lunar) имеет свою папку с domain/data/presentation.
- **Repository pattern**: Абстракция над источниками данных (локально/онлайн).
- **State management**: Riverpod для управления состоянием.
- **Навигация**: go_router для маршрутизации.
- **Локализация**: Поддержка русского языка (flutter_localizations).
- **Модерация**: Простой клиентский фильтр запрещённых слов.

## Структура кода
```
lib/
├── main.dart                          // Точка входа, инициализация Firebase, Riverpod, локализация
├── src/
    ├── core/
    │   ├── offline/local_store.dart    // Локальное JSON-хранилище (file-backed)
    │   ├── repository/repository.dart  // Интерфейс Repository<T>
    │   ├── router/app_router.dart      // Маршруты приложения (/, /recipes, /checklist, /lunar)
    │   └── services/moderation_service.dart // Фильтр стоп-слов
    └── features/
        ├── home/presentation/home_screen.dart // Домашний экран с GridView карточек
        ├── checklist/
        │   ├── domain/checklist.dart    // Модель ChecklistCategory и ChecklistItem
        │   ├── data/checklist_repository.dart // Репозиторий чек-листов (локальный)
        │   └── presentation/checklist_screen.dart // Экран с ExpansionTile и CheckboxListTile
        ├── recipes/
        │   ├── domain/recipe.dart       // Модель Recipe
        │   ├── data/recipe_repository.dart // Репозиторий рецептов (локальный + Firestore)
        │   └── presentation/recipe_screen.dart // Экран рецептов (CRUD)
        └── lunar/presentation/lunar_fishing_screen.dart // Экран лунного прогноза
```

## Ключевые компоненты
- **LocalStore**: Простое хранение JSON в файлах (path_provider). Методы: readJson, saveJson.
- **Repository**: Интерфейс с fetchAll() и upsert(T). Реализации для чек-листов и рецептов.
- **ModerationService**: Статический класс с методом isClean(String) для проверки текста на стоп-слова.
- **Firebase**: Используется для аутентификации (firebase_auth) и базы данных (cloud_firestore). Синхронизация рецептов и reports.
- **API**: Dio для HTTP-запросов (Open-Meteo для погоды).

## Зависимости (pubspec.yaml)
- flutter_riverpod: ^2.5.1 (state management)
- go_router: ^14.1.4 (навигация)
- dio: ^5.5.0+1 (HTTP)
- intl: ^0.19.0 (форматирование дат)
- firebase_core: ^3.4.0, firebase_auth: ^5.2.0, cloud_firestore: ^5.4.4 (Firebase)
- path_provider: ^2.1.4 (локальное хранение)
- flutter_localizations (локализация)

## Где найти детали по каждой фиче
- **Домашний экран**: `lib/src/features/home/presentation/home_screen.dart` — GridView с MenuCard виджетами.
- **Чек-листы**: `lib/src/features/checklist/` — Модели в domain, репозиторий в data, экран в presentation. Использует LocalStore для сохранения.
- **Рецепты**: `lib/src/features/recipes/` — CRUD операции, модерация в upsert. Синх с Firestore. Reports коллекция для жалоб.
- **Лунный прогноз**: `lib/src/features/lunar/presentation/lunar_fishing_screen.dart` — Расчёт фаз луны, API погоды. Оффлайн fallback.
- **Core компоненты**: `lib/src/core/` — LocalStore, Repository интерфейс, ModerationService.
- **Firebase**: `lib/src/firebase_options.dart` (генерируется), firestore.rules.txt для правил.
- **Конфигурация**: pubspec.yaml, main.dart.

## Roadmap (планы развития)
- Пагинация и поиск для рецептов
- Перенос бизнес-логики Firebase из UI в сервисы/репозитории
- Улучшение локализации (l10n)
- Тесты (unit/widget) и CI

Этот обзор позволяет быстро понять проект без чтения всего кода. Для изменений обращайтесь к соответствующим файлам.