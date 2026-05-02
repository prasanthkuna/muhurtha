import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../design_system/design_system.dart';

/// Warm editorial dark theme — Fraunces + Instrument Sans (MUHURTA_DESIGN.md).
abstract final class MuhTheme {
  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: MuhColors.bg,
      colorScheme: const ColorScheme.dark(
        surface: MuhColors.surface,
        primary: MuhColors.gold,
        onPrimary: MuhColors.bg,
        secondary: MuhColors.goldDeep,
        onSurface: MuhColors.cream,
        error: MuhColors.maroon,
        onError: MuhColors.cream,
        outline: MuhColors.line,
      ),
    );

    final display = GoogleFonts.frauncesTextTheme(base.textTheme).apply(
      bodyColor: MuhColors.cream,
      displayColor: MuhColors.cream,
    );
    final body = GoogleFonts.instrumentSansTextTheme(display).apply(
      bodyColor: MuhColors.cream,
      displayColor: MuhColors.cream,
    );

    return base.copyWith(
      textTheme: body,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.fraunces(
          fontSize: MuhType.titleL,
          fontWeight: FontWeight.w600,
          color: MuhColors.cream,
        ),
      ),
      cardTheme: CardThemeData(
        color: MuhColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MuhRadius.button),
          side: const BorderSide(color: MuhColors.line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MuhColors.surfaceSoft,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(MuhRadius.input)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MuhRadius.input),
          borderSide: const BorderSide(color: MuhColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MuhRadius.input),
          borderSide: const BorderSide(color: MuhColors.gold, width: 1.4),
        ),
        labelStyle: GoogleFonts.instrumentSans(color: MuhColors.creamMuted),
        hintStyle: GoogleFonts.instrumentSans(color: MuhColors.muted),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: MuhColors.surfaceGold,
        contentTextStyle: GoogleFonts.instrumentSans(color: MuhColors.cream),
      ),
    );
  }

  /// Telugu / Devanagari: Noto body per MUHURTA_DESIGN.md; Latin stays Fraunces + Instrument Sans.
  static ThemeData darkForLocale(Locale locale) {
    final base = dark();
    final code = locale.languageCode.toLowerCase();
    if (code == 'te') {
      final te = GoogleFonts.notoSansTeluguTextTheme(base.textTheme).apply(
        bodyColor: MuhColors.cream,
        displayColor: MuhColors.cream,
      );
      return base.copyWith(textTheme: te);
    }
    if (code == 'hi') {
      final hi = GoogleFonts.notoSansDevanagariTextTheme(base.textTheme).apply(
        bodyColor: MuhColors.cream,
        displayColor: MuhColors.cream,
      );
      return base.copyWith(textTheme: hi);
    }
    return base;
  }

  /// §6 — numerals / time strips (JetBrains Mono). Use only for window times, not body copy.
  static TextStyle timeWindowNumeral() => GoogleFonts.jetBrainsMono(
        fontSize: MuhType.timeXL,
        fontWeight: FontWeight.w500,
        color: MuhColors.cream,
        height: 1.2,
      );
}
