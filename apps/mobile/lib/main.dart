import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/theme.dart';

void main() {
  runApp(const MeshPokeApp());
}

class MeshPokeApp extends StatelessWidget {
  const MeshPokeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MeshPoke',
      theme: AppTheme.dark(),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en')], // zh_HK at Phase 2
      home: const Scaffold(
        body: Center(child: Text('Poke the mesh. Watch your network ripple.')),
      ),
    );
  }
}
