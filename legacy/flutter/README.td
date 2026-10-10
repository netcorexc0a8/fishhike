## 🎣 FishHike: Спутник Рыбака и Туриста

![Hero Image or Logo Placeholder](assets/images/fishhike_hero.png)

Кроссплатформенное приложение (iOS, Android, Web) на Flutter для планирования и организации рыбалки и походов.

## ✨ Возможности

*   **Чек-листы:** Создание, редактирование, отметка прогресса. Полностью **офлайн** с синхронизацией.
*   **Рецепты:** Коллекция походных рецептов. Пользовательский CRUD. Клиентская модерация (фильтр стоп-слов) и система жалоб (`reports` в Firestore).
*   **Прогноз Клёва:** Лунный прогноз, учитывающий погодные факторы (температура, давление, осадки) через **Open-Meteo API**.
*   **Офлайн-работа:** Все основные данные кэшируются локально (JSON-файлы).
*   **Синхронизация:** Использование **Firebase Auth** и **Firestore** для безопасного хранения и синхронизации данных пользователя.

## 🤖 Методология Разработки (AI-Assisted)

Данный проект разработан одним специалистом с активным использованием ИИ-помощников. Для обеспечения консистентности и соблюдения архитектурных правил, все задачи для ИИ формулируются с обязательной ссылкой на контекстные файлы.

### Контекстные Файлы: Ваши Руководства

В корне проекта находятся три файла, которые служат **единым источником истины** для всех архитектурных и технических решений:

| Файл | Назначение | Ключевая информация |
| :--- | :--- | :--- |
| [`ARCHITECTURE_GUIDE.md`](ARCHITECTURE_GUIDE.md) | **Правила Кодирования и Структура** | Детализация Clean Architecture, BLoC-паттерна, правила именования и взаимодействия слоёв (Presentation, Domain, Data). |
| [`PROJECT_REQUIREMENTS.md`](PROJECT_REQUIREMENTS.md) | **Требования к Функционалу** | Полный список всех функций MVP, разбитый по модулям (Checklist, Recipes, Forecast) с конкретными ID и требованиями. |
| [`TECH_STACK_CONFIG.md`](TECH_STACK_CONFIG.md) | **Правила Использования Пакетов** | Специфические инструкции по интеграции ключевых пакетов: `Firebase`, `json_serializable`, `dio`, `path_provider`. |

**Пример запроса к ИИ:**
> *"Сгенерируй код для `RecipesRemoteDataSource`. Он должен использовать `cloud_firestore` и следовать 'Правилу 3 (UID)' в `TECH_STACK_CONFIG.md` для сохранения пользовательских рецептов, как того требует `RE-02` из `PROJECT_REQUIREMENTS.md`."*

---

## 📐 Архитектура

Проект построен на принципах **Clean Architecture** с использованием **BLoC/Cubit** для управления состоянием.

| Слой | Описание | Зависимости |
| :--- | :--- | :--- |
| **Presentation** | Виджеты Flutter и BLoC/Cubit. Отображение данных и обработка действий пользователя. | `flutter_bloc` |
| **Domain** | Чистая логика (UseCases, Entities, Abstract Repositories). Независим от фреймворков. | Dart, `equatable` |
| **Data** | Конкретная реализация репозиториев, DataSources (Local & Remote). | `cloud_firestore`, `dio`, `path_provider` |

## 🛠️ Технологический Стек

*   **Фреймворк:** Flutter 3.x
*   **Управление состоянием:** BLoC / Cubit
*   **Бэкенд:** Firebase (Auth, Firestore)
*   **Внешний API:** Open-Meteo
*   **Локальное хранение:** JSON (file-backed через `path_provider`)
*   **Dependency Injection:** `get_it`
---
## Структура проекта
```
FishHike/
├── .github/
│   ├── ISSUE_TEMPLATE/ (Шаблоны для багов и фич)
│   └── workflows/      (CI/CD, например, для Flutter Analyze)
├── .gitignore          (Стандартный для Flutter)
├── README.md           (Описание проекта, настройка, архитектура)
├── LICENSE             (Например, MIT License)
├── pubspec.yaml        (Зависимости проекта)
├── pubspec.lock
├── analysis_options.yaml (Настройка линтера)
├── android/            (Нативные файлы Android)
├── ios/                (Нативные файлы iOS)
├── web/                (Нативные файлы Web)
├── lib/                (Основной код Dart/Flutter)
│   ├── main.dart
│   ├── app/                (Конфигурация: роутинг, темы)
│   ├── core/               (Общие утилиты, константы, абстракции)
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── utils/
│   │   ├── usecase/
│   │   └── data/           (Базовые DataSource и Repository)
│   ├── di/                 (Dependency Injection - GetIt setup)
│   ├── features/           (Основная бизнес-логика, разбитая по модулям)
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   ├── checklist/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   ├── recipes/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   └── forecast/
│   │       ├── data/
│   │       ├── domain/
│   │       └── presentation/
└── test/                   (Юнит- и виджет-тесты)
```
---
## ⚙️ Настройка Проекта

Для запуска проекта необходимо выполнить следующие шаги:

### 1. Клонирование репозитория

```bash
git clone https://github.com/ВАШ_АККАУНТ/FishHike.git
cd FishHike
```

### 2. Установка зависимостей

```bash
flutter pub get
```

### 3. Настройка Firebase

**Это обязательный шаг.**

1.  Создайте новый проект в консоли Firebase.
2.  Настройте приложения для **Android**, **iOS** и **Web**.
3.  Скачайте и разместите конфигурационные файлы:
    *   **Android:** `google-services.json` (поместить в `android/app/`)
    *   **iOS:** `GoogleService-Info.plist` (поместить в `ios/Runner/`)
4.  Включите сервисы: **Authentication** и **Firestore**.

### 4. Генерация кода (Сериализация)

Мы используем `json_serializable` для моделей данных. Запуск генератора необходим после каждого изменения в моделях:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### 5. Запуск

```bash
flutter run
# или flutter run -d chrome (для Web)
```

## 📄 Лицензия

Проект распространяется по лицензии [Например, MIT]. См. файл [LICENSE](LICENSE) для подробностей.

---
