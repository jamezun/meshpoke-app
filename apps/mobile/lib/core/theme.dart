import 'package:flutter/material.dart';

/// Dark-first theme (Design System §13): Inter/Noto Sans TC, rounded-16 cards.
class AppTheme {
  static const seed = Color(0xFF00E5A0); // MeshPoke green — "poke" accent

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: seed,
        secondary: const Color(0xFF7C8CF8),
        surface: const Color(0xFF16181D),
      ),
      scaffoldBackgroundColor: const Color(0xFF0E1013),
      cardTheme: const CardThemeData(
        elevation: 0,
        color: Color(0xFF16181D),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0E1013),
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF16181D),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
