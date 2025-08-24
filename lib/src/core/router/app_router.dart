import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/recipes/presentation/recipe_screen.dart';
import '../../features/checklist/presentation/checklist_screen.dart';
import '../../features/lunar/presentation/lunar_fishing_screen.dart';

final appRouter = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/recipes', builder: (_, __) => const RecipeScreen()),
    GoRoute(path: '/checklist', builder: (_, __) => const ChecklistScreen()),
    GoRoute(path: '/lunar', builder: (_, __) => const LunarFishingScreen()),
  ],
);
