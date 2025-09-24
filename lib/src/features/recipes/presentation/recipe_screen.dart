import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/offline/local_store.dart';
import '../data/recipe_repository.dart';
import '../domain/recipe.dart';

final _repoProvider = Provider((_) => RecipeRepository(LocalStore()));
final recipeProvider = FutureProvider<List<Recipe>>((ref) => ref.read(_repoProvider).fetchAll());
final isAdminProvider = FutureProvider<bool>((ref) async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) return false;
  final token = await user.getIdTokenResult(true);
  return (token.claims?['isAdmin'] == true);
});

class RecipeScreen extends ConsumerWidget {
  const RecipeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AsyncValue<bool>>(isAdminProvider, (_, state) {
      if (state.hasError && !state.isLoading) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Не удалось проверить статус администратора.')),
        );
      }
    });
    final state = ref.watch(recipeProvider);
    final uid = FirebaseAuth.instance.currentUser?.uid;
    final isAdmin = ref.watch(isAdminProvider).maybeWhen(data: (v) => v, orElse: () => false);
    return Scaffold(
      appBar: AppBar(title: const Text('Походная кухня')),
      body: state.when(
        data: (list) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: list.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) {
            final r = list[i];
            final canManage = (uid != null && uid == r.authorId) || isAdmin;
            return Card(
              child: ListTile(
                title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(r.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.flag_outlined),
                      tooltip: 'Пожаловаться',
                      onPressed: () async {
                        await FirebaseFirestore.instance.collection('reports').add({
                          'type': 'recipe',
                          'refId': r.id,
                          'title': r.title,
                          'createdAt': DateTime.now().toIso8601String(),
                          'userId': FirebaseAuth.instance.currentUser?.uid ?? 'guest',
                        });
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Жалоба отправлена')));
                        }
                      },
                    ),
                    if (canManage) PopupMenuButton<String>(
                      onSelected: (value) async {
                        if (value == 'edit') {
                          await _editRecipe(context, ref, r);
                        } else if (value == 'delete') {
                          final ok = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Удалить рецепт?'),
                              content: const Text('Это действие нельзя отменить.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
                                FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Удалить')),
                              ],
                            ),
                          );
                          if (ok == true) {
                            await ref.read(_repoProvider).delete(r.id);
                            ref.invalidate(recipeProvider);
                          }
                        }
                      },
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: 'edit', child: Text('Редактировать')),
                        PopupMenuItem(value: 'delete', child: Text('Удалить')),
                      ],
                    ),
                  ],
                ),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _RecipeDetails(recipe: r))),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final newRecipe = await _createRecipeDialog(context);
          if (newRecipe != null) {
            try {
              await ref.read(_repoProvider).upsert(newRecipe);
              ref.invalidate(recipeProvider);
            } catch (e) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
            }
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

Future<void> _editRecipe(BuildContext context, WidgetRef ref, Recipe r) async {
  final titleCtrl = TextEditingController(text: r.title);
  final descCtrl = TextEditingController(text: r.description);
  final result = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Редактировать рецепт'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Название')),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Описание'), maxLines: 3),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Сохранить')),
      ],
    ),
  );
  if (result == true) {
    try {
      final updated = r.copyWith(title: titleCtrl.text.trim(), description: descCtrl.text.trim());
      await ref.read(_repoProvider).upsert(updated);
      ref.invalidate(recipeProvider);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

Future<Recipe?> _createRecipeDialog(BuildContext context) async {
  final titleCtrl = TextEditingController();
  final descCtrl = TextEditingController();
  final uid = FirebaseAuth.instance.currentUser?.uid ?? 'guest';
  final ok = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Новый рецепт'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Название')),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Короткое описание'), maxLines: 3),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Отмена')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Добавить')),
      ],
    ),
  );
  if (ok == true && titleCtrl.text.trim().isNotEmpty) {
    return Recipe(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: titleCtrl.text.trim(),
      description: descCtrl.text.trim(),
      ingredients: const [],
      steps: const [],
      authorId: uid,
      createdAt: DateTime.now(),
    );
  }
  return null;
}

class _RecipeDetails extends StatelessWidget {
  final Recipe recipe;
  const _RecipeDetails({required this.recipe});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(recipe.title), actions: [
        IconButton(
          icon: const Icon(Icons.flag_outlined),
          tooltip: 'Пожаловаться',
          onPressed: () async {
            await FirebaseFirestore.instance.collection('reports').add({
              'type': 'recipe',
              'refId': recipe.id,
              'title': recipe.title,
              'createdAt': DateTime.now().toIso8601String(),
              'userId': FirebaseAuth.instance.currentUser?.uid ?? 'guest',
            });
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Жалоба отправлена')));
            }
          },
        ),
      ]),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Text(recipe.description, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 12),
            const Text('Ингредиенты:', style: TextStyle(fontWeight: FontWeight.bold)),
            if (recipe.ingredients.isEmpty) const Text('— не указаны —'),
            ...recipe.ingredients.map((e) => Text('• $e')),
            const SizedBox(height: 12),
            const Text('Шаги приготовления:', style: TextStyle(fontWeight: FontWeight.bold)),
            if (recipe.steps.isEmpty) const Text('— не указаны —'),
            ...recipe.steps.map((e) => Text('- $e')),
          ],
        ),
      ),
    );
  }
}
