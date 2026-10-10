import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FishHike')),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        children: const [
          _MenuCard(title: 'Рецепты', icon: Icons.restaurant, route: '/recipes', color: Colors.redAccent),
          _MenuCard(title: 'Чек-лист', icon: Icons.checklist, route: '/checklist', color: Colors.green),
          _MenuCard(title: 'Фазы луны', icon: Icons.nights_stay, route: '/lunar', color: Colors.indigo),
        ],
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final String route;
  final Color color;
  const _MenuCard({required this.title, required this.icon, required this.route, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color.withOpacity(0.85),
      child: InkWell(
        onTap: () => context.push(route),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 36),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
