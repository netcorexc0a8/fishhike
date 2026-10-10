import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/offline/local_store.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist.dart';

final _repoProvider = Provider((_) => ChecklistRepository(LocalStore()));
final checklistProvider = FutureProvider<List<ChecklistCategory>>((ref) => ref.read(_repoProvider).fetchAll());

class ChecklistScreen extends ConsumerWidget {
  const ChecklistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(checklistProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Чек-лист')),
      body: state.when(
        data: (cats) => ListView.builder(
          itemCount: cats.length,
          itemBuilder: (_, i) {
            final cat = cats[i];
            return ExpansionTile(
              title: Text(cat.title, style: const TextStyle(fontWeight: FontWeight.bold)),
              children: cat.items.map((it) {
                return CheckboxListTile(
                  title: Text(it.title),
                  value: it.done,
                  onChanged: (v) async {
                    final newDone = v ?? false;
                    final itemIndex = cat.items.indexWhere((item) => item.id == it.id);
                    if (itemIndex >= 0) {
                      final newItems = List<ChecklistItem>.from(cat.items);
                      newItems[itemIndex] = it.copyWith(done: newDone);
                      final newCat = cat.copyWith(items: newItems);
                      print('Changed ${it.title} to $newDone');
                      await ref.read(_repoProvider).upsert(newCat);
                      ref.invalidate(checklistProvider);
                    }
                  },
                );
              }).toList(),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
      ),
    );
  }
}
