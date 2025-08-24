import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'src/core/router/app_router.dart';
import 'src/firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } catch (_) {}
  runApp(const FishHikeApp());
}

class FishHikeApp extends StatelessWidget {
  const FishHikeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'FishHike',
      theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
      routerConfig: appRouter,
    );
  }
}
