import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../design_system/design_system.dart';

/// Golden Editorial theme — serif readings, sans UI (`Muhurta_Golden_Editorial_Design_System_v1.md` §4).
abstract final class MuhTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: MuhColors.canvas,
      colorScheme: const ColorScheme.light(
        surface: MuhColors.paper,
        onSurface: MuhColors.ink,
        primary: MuhColors.goldButton,
        onPrimary: MuhColors.ink,
        secondary: MuhColors.goldText,
        onSecondary: MuhColors.paper,
        error: MuhColors.errorInk,
        onError: MuhColors.paper,
        outline: MuhColors.line,
      ),
    );

    final serifDisplay = GoogleFonts.frauncesTextTheme(base.textTheme).copyWith(
      displayLarge: GoogleFonts.fraunces(
        fontSize: MuhType.displayHero,
        height: 1.08,
        fontWeight: FontWeight.w400,
        color: MuhColors.ink,
      ),
      displayMedium: GoogleFonts.fraunces(
        fontSize: MuhType.displayChapter,
        height: 1.12,
        fontWeight: FontWeight.w400,
        color: MuhColors.ink,
      ),
      headlineLarge: GoogleFonts.fraunces(
        fontSize: MuhType.headline,
        height: 1.16,
        fontWeight: FontWeight.w500,
        color: MuhColors.ink,
      ),
      headlineMedium: GoogleFonts.fraunces(
        fontSize: MuhType.title,
        height: 1.2,
        fontWeight: FontWeight.w500,
        color: MuhColors.ink,
      ),
    );

    final sans = GoogleFonts.instrumentSansTextTheme(serifDisplay).copyWith(
      titleLarge: GoogleFonts.instrumentSans(
        fontSize: MuhType.titleUi,
        height: 1.3,
        fontWeight: FontWeight.w600,
        color: MuhColors.ink,
      ),
      titleMedium: GoogleFonts.instrumentSans(
        fontSize: MuhType.bodyUi,
        height: 1.46,
        fontWeight: FontWeight.w600,
        color: MuhColors.ink,
      ),
      bodyLarge: GoogleFonts.instrumentSans(
        fontSize: MuhType.bodyReading,
        height: 1.57,
        fontWeight: FontWeight.w400,
        color: MuhColors.ink,
      ),
      bodyMedium: GoogleFonts.instrumentSans(
        fontSize: MuhType.bodyUi,
        height: 1.46,
        fontWeight: FontWeight.w400,
        color: MuhColors.inkSecondary,
      ),
      bodySmall: GoogleFonts.instrumentSans(
        fontSize: MuhType.bodySmall,
        height: 1.44,
        fontWeight: FontWeight.w400,
        color: MuhColors.inkSecondary,
      ),
      labelLarge: GoogleFonts.instrumentSans(
        fontSize: MuhType.label,
        height: 1.25,
        fontWeight: FontWeight.w600,
        color: MuhColors.ink,
      ),
    );

    return base.copyWith(
      textTheme: sans,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: MuhColors.goldButton,
          foregroundColor: MuhColors.ink,
          disabledBackgroundColor: MuhColors.line,
          disabledForegroundColor: MuhColors.inkTertiary,
          minimumSize: const Size(64, MuhSpace.controlHeight),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: MuhColors.goldText,
          side: const BorderSide(color: MuhColors.line),
          padding: const EdgeInsets.symmetric(
            horizontal: MuhSpace.xl,
            vertical: MuhSpace.md,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: MuhColors.goldText,
          disabledForegroundColor: MuhColors.inkTertiary,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: MuhColors.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        foregroundColor: MuhColors.ink,
        titleTextStyle: GoogleFonts.instrumentSans(
          fontSize: MuhType.titleUi,
          fontWeight: FontWeight.w600,
          color: MuhColors.ink,
        ),
      ),
      cardTheme: CardThemeData(
        color: MuhColors.paper,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MuhRadius.readingSheet),
          side: const BorderSide(color: MuhColors.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: MuhColors.paper,
        indicatorColor: MuhColors.goldWash,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.instrumentSans(
            fontSize: MuhType.bodySmall,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? MuhColors.goldText : MuhColors.inkSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? MuhColors.goldText : MuhColors.inkSecondary,
            size: MuhIcons.tab,
          );
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MuhColors.paper,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MuhRadius.input),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MuhRadius.input),
          borderSide: const BorderSide(color: MuhColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MuhRadius.input),
          borderSide: const BorderSide(color: MuhColors.focusRing, width: 1.2),
        ),
        labelStyle: GoogleFonts.instrumentSans(color: MuhColors.inkSecondary),
        hintStyle: GoogleFonts.instrumentSans(color: MuhColors.inkTertiary),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: MuhColors.ink,
        contentTextStyle: GoogleFonts.instrumentSans(color: MuhColors.paper),
      ),
      dividerColor: MuhColors.line,
    );
  }

  static ThemeData lightForLocale(Locale locale) {
    final base = light();
    final code = locale.languageCode.toLowerCase();
    if (code == 'te') {
      final teBody = GoogleFonts.notoSansTeluguTextTheme(base.textTheme);
      final teDisplay = GoogleFonts.notoSerifTeluguTextTheme(base.textTheme);
      return base.copyWith(
        textTheme: base.textTheme.copyWith(
          displayLarge: teDisplay.displayLarge ?? base.textTheme.displayLarge,
          displayMedium: teDisplay.displayMedium ?? base.textTheme.displayMedium,
          headlineLarge: teDisplay.headlineLarge ?? base.textTheme.headlineLarge,
          headlineMedium: teDisplay.headlineMedium ?? base.textTheme.headlineMedium,
          bodyLarge: teBody.bodyLarge ?? base.textTheme.bodyLarge,
          bodyMedium: teBody.bodyMedium ?? base.textTheme.bodyMedium,
          bodySmall: teBody.bodySmall ?? base.textTheme.bodySmall,
        ),
      );
    }
    if (code == 'hi') {
      final hiBody = GoogleFonts.notoSansDevanagariTextTheme(base.textTheme);
      final hiDisplay = GoogleFonts.notoSerifDevanagariTextTheme(base.textTheme);
      return base.copyWith(
        textTheme: base.textTheme.copyWith(
          displayLarge: hiDisplay.displayLarge ?? base.textTheme.displayLarge,
          displayMedium: hiDisplay.displayMedium ?? base.textTheme.displayMedium,
          headlineLarge: hiDisplay.headlineLarge ?? base.textTheme.headlineLarge,
          headlineMedium: hiDisplay.headlineMedium ?? base.textTheme.headlineMedium,
          bodyLarge: hiBody.bodyLarge ?? base.textTheme.bodyLarge,
          bodyMedium: hiBody.bodyMedium ?? base.textTheme.bodyMedium,
          bodySmall: hiBody.bodySmall ?? base.textTheme.bodySmall,
        ),
      );
    }
    return base;
  }

  /// Legacy name — app uses light editorial only.
  static ThemeData darkForLocale(Locale locale) => lightForLocale(locale);

  static TextStyle timeWindowNumeral() => GoogleFonts.instrumentSans(
        fontSize: MuhType.timeXL,
        fontWeight: FontWeight.w600,
        color: MuhColors.ink,
        height: 1.2,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  static TextStyle eyebrow(BuildContext context) =>
      Theme.of(context).textTheme.labelLarge!.copyWith(
            fontSize: MuhType.eyebrow,
            letterSpacing: 1.2,
            color: MuhColors.goldDeep,
            fontWeight: FontWeight.w600,
          );
}
