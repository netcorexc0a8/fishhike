import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';

class LunarFishingScreen extends StatefulWidget {
  const LunarFishingScreen({super.key});

  @override
  State<LunarFishingScreen> createState() => _LunarFishingScreenState();
}

class _LunarFishingScreenState extends State<LunarFishingScreen> {
  String _forecast = 'Загрузка...';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final now = DateTime.now();
    final phase = _moonPhase(now);
    String baseForecast;
    switch (phase) {
      case 0: baseForecast = 'Новолуние 🌑 — клёв слабый'; break;
      case 1: baseForecast = 'Первая четверть 🌓 — клёв средний'; break;
      case 2: baseForecast = 'Полнолуние 🌕 — клёв отличный'; break;
      case 3: baseForecast = 'Последняя четверть 🌗 — клёв средний'; break;
      default: baseForecast = 'Фаза луны неизвестна';
    }

    try {
      final dio = Dio();
      // Бесплатный источник погоды без ключа — Open-Meteo (Москва как пример)
      final resp = await dio.get('https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.61&current=cloudcover,pressure_msl,windspeed_10m');
      final data = resp.data['current'] ?? {};
      final cloud = (data['cloudcover'] ?? 0) as num;
      final wind = (data['windspeed_10m'] ?? 0) as num;
      final pressure = (data['pressure_msl'] ?? 1013) as num;

      String weatherNote = '';
      if (wind > 7) weatherNote += ' Ветер сильный — клёв хуже.';
      if (cloud > 70) weatherNote += ' Облачность высокая — активность рыбы ниже.';
      if (pressure < 1005) weatherNote += ' Давление низкое — клёв слабее.';
      if (pressure > 1020) weatherNote += ' Высокое давление — клёв лучше.';

      setState(() => _forecast = baseForecast + weatherNote);
    } catch (_) {
      setState(() => _forecast = baseForecast + ' (оффлайн прогноз)');
    }
  }

  // 0=новолуние,1=первая четверть,2=полнолуние,3=последняя четверть
  int _moonPhase(DateTime date) {
    const lp = 2551443; // средняя длительность лунного цикла в секундах
    final newMoon = DateTime.utc(1970, 1, 7, 20, 35, 0);
    final phase = ((date.toUtc().millisecondsSinceEpoch / 1000 - newMoon.millisecondsSinceEpoch / 1000) % lp) / lp;
    if (phase < 0.25) return 0;
    if (phase < 0.5) return 1;
    if (phase < 0.75) return 2;
    return 3;
  }

  @override
  Widget build(BuildContext context) {
    final today = DateFormat.yMMMMd().format(DateTime.now());
    return Scaffold(
      appBar: AppBar(title: const Text('Фазы луны и прогноз клёва')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Сегодня: $today', style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 12),
            Text(_forecast, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
