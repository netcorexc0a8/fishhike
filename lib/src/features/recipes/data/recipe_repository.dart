import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/offline/local_store.dart';
import '../../../core/repository/repository.dart';
import '../../../core/services/moderation_service.dart';
import '../domain/recipe.dart';

class RecipeRepository implements Repository<Recipe> {
  final LocalStore _local;
  RecipeRepository(this._local);
  static const _kKey = 'recipes_public_v1';

  final _defaults = <Recipe>[
    Recipe(
      id: 'r1',
      title: 'Уха походная',
      description: 'Классическая уха на костре из свежей рыбы.',
      ingredients: ['Рыба','Картофель','Морковь','Лук','Соль','Лавровый лист','Перец'],
      steps: ['Очистить и нарезать овощи','Закипятить воду на костре','Добавить овощи, затем рыбу','Варить до готовности, снять пену','Подавать горячей с зеленью'],
      authorId: 'system',
      createdAt: DateTime.fromMillisecondsSinceEpoch(0),
    ),
    Recipe(
      id: 'r2',
      title: 'Плов в казане',
      description: 'Ароматный плов на костре.',
      ingredients: ['Рис','Мясо','Морковь','Лук','Масло','Зира','Соль'],
      steps: ['Обжарить мясо и лук','Добавить морковь и специи','Заложить рис','Залить водой и томить до готовности'],
      authorId: 'system',
      createdAt: DateTime.fromMillisecondsSinceEpoch(0),
    ),
  ];

  @override
  Future<List<Recipe>> fetchAll() async {
    final raw = await _local.readJson(_kKey);
    List<Recipe> local = [];
    if (raw == null) {
      await _local.saveJson(_kKey, {'items': _defaults.map((e)=>e.toJson()).toList()});
      local = _defaults;
    } else {
      final list = (raw['items'] as List<dynamic>? ?? []);
      local = list.map((e)=>Recipe.fromJson(Map<String,dynamic>.from(e))).toList();
    }
    try {
      final snap = await FirebaseFirestore.instance.collection('recipes_public').orderBy('createdAt', descending: true).get();
      final online = snap.docs.map((d)=>Recipe.fromJson({...d.data(), 'id': d.id})).toList();
      await _local.saveJson(_kKey, {'items': online.map((e)=>e.toJson()).toList()});
      return online;
    } catch (_) {
      return local;
    }
  }

  @override
  Future<void> upsert(Recipe item) async {
    if (!ModerationService.isClean(item.title) || !ModerationService.isClean(item.description)) {
      throw Exception('Рецепт содержит запрещённые слова и не может быть сохранён');
    }
    final all = await fetchAll();
    final idx = all.indexWhere((e)=>e.id==item.id);
    if (idx>=0) all[idx]=item; else all.add(item);
    await _local.saveJson(_kKey, {'items': all.map((e)=>e.toJson()).toList()});
    try {
      await FirebaseFirestore.instance.collection('recipes_public').doc(item.id).set(item.toJson(), SetOptions(merge: true));
    } catch(_){}
  }

  Future<void> delete(String id) async {
    final all = await fetchAll();
    all.removeWhere((e)=>e.id==id);
    await _local.saveJson(_kKey, {'items': all.map((e)=>e.toJson()).toList()});
    try { await FirebaseFirestore.instance.collection('recipes_public').doc(id).delete(); } catch(_){}
  }
}
