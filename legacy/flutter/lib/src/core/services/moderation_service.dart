class ModerationService {
  static final _bannedWords = <String>['реклама','спам','xxx','мат'];
  static bool isClean(String text) {
    final lower = text.toLowerCase();
    for (final w in _bannedWords) {
      if (lower.contains(w)) return false;
    }
    return true;
  }
}
