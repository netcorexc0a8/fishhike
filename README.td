FishHike — демо-проект под Android Studio (Flutter)

1) Установите Flutter SDK и Android Studio.
2) В каталоге проекта выполните: `flutter pub get`.
3) Выполните `flutterfire configure` (создаст lib/src/firebase_options.dart).
4) В Firebase Console примените правила из `firestore.rules.txt`.
5) (Опционально) Выдайте себе custom claim isAdmin=true через Admin SDK.
6) Запустите: `flutter run`.

Разделы:
- Рецепты: публикация, жалобы, авторство, редактирование/удаление (админ может всё).
- Чек-лист: категории с аккордеоном, оффлайн-хранение.
- Фазы луны: ИИ-прогноз клёва (онлайн/оффлайн).

Маршруты:
/, /recipes, /checklist, /lunar
