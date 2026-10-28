import 'package:flutter/material.dart';

/// MeshPoke theme — light default (warm white + pastel peach #FFB26B), user-selectable dark (Design System §13).
class AppTheme {
  static const seed = Color(0xFFFFB26B); // MeshPoke peach — "poke" accent (pastel, soft)
  static const peachText = Color(0xFFC06A24); // peach-family that reads on white
  static const peachOn = Color(0xFF3B2412); // text on peach fills (dark brown)

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: seed,
        onPrimary: peachOn,
        secondary: peachText,
        surface: const Color(0xFFFDFCFA),
      ),
      scaffoldBackgroundColor: const Color(0xFFFDFCFA),
      cardTheme: const CardThemeData(
        elevation: 0,
        color: Color(0xFFFFFFFF),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFFDFCFA),
        foregroundColor: Color(0xFF26201A),
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF6F1EA),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: seed,
        onPrimary: peachOn,
        secondary: const Color(0xFFFFC48D),
        surface: const Color(0xFF1E1A15),
      ),
      scaffoldBackgroundColor: const Color(0xFF14110D),
      cardTheme: const CardThemeData(
        elevation: 0,
        color: Color(0xFF1E1A15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF14110D),
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF262019),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
