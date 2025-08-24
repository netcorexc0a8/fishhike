class ChecklistItem {
  final String id;
  final String title;
  bool done;
  ChecklistItem({required this.id, required this.title, this.done = false});

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'done': done};
  factory ChecklistItem.fromJson(Map<String, dynamic> j) =>
      ChecklistItem(id: j['id'] as String, title: j['title'] as String, done: j['done'] as bool? ?? false);
}

class ChecklistCategory {
  final String id;
  final String title;
  final List<ChecklistItem> items;
  ChecklistCategory({required this.id, required this.title, required this.items});

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'items': items.map((e) => e.toJson()).toList(),
      };

  factory ChecklistCategory.fromJson(Map<String, dynamic> j) => ChecklistCategory(
        id: j['id'] as String,
        title: j['title'] as String,
        items: (j['items'] as List).map((e) => ChecklistItem.fromJson(Map<String, dynamic>.from(e))).toList(),
      );
}
