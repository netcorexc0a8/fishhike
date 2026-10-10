class Recipe {
  final String id;
  final String title;
  final String description;
  final List<String> ingredients;
  final List<String> steps;
  final String authorId;
  final DateTime createdAt;

  Recipe({
    required this.id,
    required this.title,
    required this.description,
    required this.ingredients,
    required this.steps,
    required this.authorId,
    required this.createdAt,
  });

  Recipe copyWith({String? title, String? description, List<String>? ingredients, List<String>? steps}) => Recipe(
    id: id,
    title: title ?? this.title,
    description: description ?? this.description,
    ingredients: ingredients ?? this.ingredients,
    steps: steps ?? this.steps,
    authorId: authorId,
    createdAt: createdAt,
  );

  factory Recipe.fromJson(Map<String, dynamic> j) => Recipe(
    id: j['id'] as String,
    title: j['title'] as String,
    description: j['description'] as String,
    ingredients: List<String>.from(j['ingredients'] ?? []),
    steps: List<String>.from(j['steps'] ?? []),
    authorId: j['authorId'] as String? ?? 'system',
    createdAt: DateTime.tryParse(j['createdAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'ingredients': ingredients,
    'steps': steps,
    'authorId': authorId,
    'createdAt': createdAt.toIso8601String(),
  };
}
