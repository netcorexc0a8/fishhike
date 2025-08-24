import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

class LocalStore {
  Future<File> _fileFor(String key) async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/$key.json');
  }

  Future<Map<String, dynamic>?> readJson(String key) async {
    try {
      final f = await _fileFor(key);
      if (!await f.exists()) return null;
      final txt = await f.readAsString();
      return jsonDecode(txt) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> saveJson(String key, Map<String, dynamic> data) async {
    final f = await _fileFor(key);
    await f.writeAsString(jsonEncode(data));
  }
}
