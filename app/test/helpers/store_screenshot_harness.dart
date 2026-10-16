import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:golden_screenshot/golden_screenshot.dart';
import 'package:muhurta/app/muh_theme.dart';
import 'package:muhurta/core/data/muhurtha_engine_api.dart';
import 'package:muhurta/core/data/profile_repository.dart';
import 'package:muhurta/core/locale/locale_provider.dart';
import 'package:muhurta/features/home/home_shell.dart';
import 'package:muhurta/l10n/app_localizations.dart';

/// Loads JSON fixtures from [app/test/fixtures] (exported from Supabase).
class StoreDemoFixtures {
  StoreDemoFixtures._();

  static Future<BirthPackPayload> loadPack(String name) async {
    final raw = await _readJson('store_demo_pack_$name.json');
    return BirthPackPayload.fromJson(raw);
  }

  static Future<TodayPayload> loadToday(String name) async {
    final raw = await _readJson('store_demo_today_$name.json');
    return TodayPayload.fromJson(raw);
  }

  static Future<Map<String, dynamic>> _readJson(String fileName) async {
    final path = 'test/fixtures/$fileName';
    final file = File(path);
    if (!file.existsSync()) {
      throw StateError(
        'Missing $path — run .\\scripts\\export-store-fixtures-from-db.ps1 '
        '(Supabase MCP / linked CLI) to pull your real packs.',
      );
    }
    return jsonDecode(await file.readAsString()) as Map<String, dynamic>;
  }
}

class _FixedLocaleNotifier extends LocaleNotifier {
  _FixedLocaleNotifier(this._locale);

  final Locale _locale;

  @override
  Locale build() => _locale;
}

/// Provider overrides for store screenshot golden tests.
List<Override> storeScreenshotOverrides({
  required BirthPackPayload pack,
  required TodayPayload today,
  Locale locale = const Locale('en'),
  List<RemedyItem> remedies = const [],
}) {
  return [
    localeProvider.overrideWith(() => _FixedLocaleNotifier(locale)),
    birthPackProvider.overrideWith((ref) => Stream.value(pack)),
    todayPayloadProvider.overrideWith((ref) => Future.value(today)),
    remedyListProvider.overrideWith((ref) => Future.value(remedies)),
    profileRepositoryProvider.overrideWith((ref) => null),
    muhurthaEngineApiProvider.overrideWith((ref) => null),
  ];
}

/// Play Store frame with real [HomeShell] + fixture providers.
ScreenshotApp storeScreenshotApp({
  required ScreenshotDevice device,
  required int tabIndex,
  required List<Override> overrides,
  required Locale locale,
}) {
  return ScreenshotApp(
    device: device,
    debugShowCheckedModeBanner: false,
    theme: MuhTheme.lightForLocale(locale),
    locale: locale,
    supportedLocales: const [
      Locale('en'),
      Locale('te'),
      Locale('hi'),
    ],
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: ProviderScope(
      overrides: overrides,
      child: HomeShell(initialIndex: tabIndex),
    ),
  );
}
