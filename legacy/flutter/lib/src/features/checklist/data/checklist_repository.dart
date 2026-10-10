import '../../../core/offline/local_store.dart';
import '../../../core/repository/repository.dart';
import '../domain/checklist.dart';

class ChecklistRepository implements Repository<ChecklistCategory> {
  final LocalStore _local;
  ChecklistRepository(this._local);
  static const _kKey = 'checklist_v2';

  final _defaults = <ChecklistCategory>[
    ChecklistCategory(id: 'c1', title: 'Для проживания', items: [
      ChecklistItem(id: 'i1', title: 'Палатка'),
      ChecklistItem(id: 'i2', title: 'Матрас'),
      ChecklistItem(id: 'i3', title: 'Спальник'),
      ChecklistItem(id: 'i4', title: 'Насос'),
      ChecklistItem(id: 'i5', title: 'Кресла'),
      ChecklistItem(id: 'i6', title: 'Стол'),
      ChecklistItem(id: 'i7', title: 'Полка для посуды/плиты'),
      ChecklistItem(id: 'i8', title: 'Фонари'),
      ChecklistItem(id: 'i9', title: 'Пенки/коврик'),
    ]),
    ChecklistCategory(id: 'c2', title: 'Для костра и приготовления пищи', items: [
      ChecklistItem(id: 'i10', title: 'Огниво'),
      ChecklistItem(id: 'i11', title: 'Зажигалка'),
      ChecklistItem(id: 'i12', title: 'Охотничьи спички'),
      ChecklistItem(id: 'i13', title: 'Бумага'),
      ChecklistItem(id: 'i14', title: 'Топор'),
      ChecklistItem(id: 'i15', title: 'Пила'),
      ChecklistItem(id: 'i16', title: 'Тренога'),
      ChecklistItem(id: 'i17', title: 'Котелки'),
      ChecklistItem(id: 'i18', title: 'Сковородки'),
      ChecklistItem(id: 'i19', title: 'Плита газовая'),
      ChecklistItem(id: 'i20', title: 'Баллоны газовые'),
      ChecklistItem(id: 'i21', title: 'Ножи'),
      ChecklistItem(id: 'i22', title: 'Посуда (тарелки, приборы)'),
      ChecklistItem(id: 'i23', title: 'Доска'),
    ]),
    ChecklistCategory(id: 'c3', title: 'Для гаджетов', items: [
      ChecklistItem(id: 'i24', title: 'Пауэрбанк'),
    ]),
    ChecklistCategory(id: 'c4', title: 'Одежда (защита от дождя)', items: [
      ChecklistItem(id: 'i25', title: 'Тент'),
      ChecklistItem(id: 'i26', title: 'Дождевик'),
    ]),
    ChecklistCategory(id: 'c5', title: 'Одежда (основная)', items: [
      ChecklistItem(id: 'i27', title: 'Камуфляж'),
      ChecklistItem(id: 'i28', title: 'Термобельё'),
      ChecklistItem(id: 'i29', title: 'Обувь для похода'),
      ChecklistItem(id: 'i30', title: 'Свитер'),
      ChecklistItem(id: 'i31', title: 'Носки'),
      ChecklistItem(id: 'i32', title: 'Вейдерсы'),
    ]),
    ChecklistCategory(id: 'c6', title: 'Аптечка', items: [
      ChecklistItem(id: 'i33', title: 'Обезболивающее (Нурофен/Анальгин)'),
      ChecklistItem(id: 'i34', title: 'Пластырь'),
      ChecklistItem(id: 'i35', title: 'Бинты'),
      ChecklistItem(id: 'i36', title: 'Зелёнка'),
      ChecklistItem(id: 'i37', title: 'Йод'),
      ChecklistItem(id: 'i38', title: 'Перекись водорода'),
      ChecklistItem(id: 'i39', title: 'Спирт'),
      ChecklistItem(id: 'i40', title: 'Салфетки бактерицидные'),
    ]),
  ];

  @override
  Future<List<ChecklistCategory>> fetchAll() async {
    final raw = await _local.readJson(_kKey);
    if (raw == null) {
      await _local.saveJson(_kKey, {'items': _defaults.map((e) => e.toJson()).toList()});
      return _defaults;
    }
    final list = (raw['items'] as List<dynamic>? ?? []);
    return list.map((e) => ChecklistCategory.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  @override
  Future<void> upsert(ChecklistCategory item) async {
    final all = await fetchAll();
    final idx = all.indexWhere((e) => e.id == item.id);
    if (idx >= 0) {
      all[idx] = item;
      print('Updated checklist category: ${item.title}');
    } else {
      all.add(item);
      print('Added new checklist category: ${item.title}');
    }
    await _local.saveJson(_kKey, {'items': all.map((e) => e.toJson()).toList()});
  }
}
