/// Play Store screenshots from the real Flutter UI (golden_screenshot).
///
/// Generate: `.\scripts\capture-store-screenshots.ps1`
/// Compare:  `flutter test test/store_screenshots_test.dart --dart-define=STORE_SCREENSHOT_MODE=true`
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_screenshot/golden_screenshot.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:muhurta/core/config/legal_urls.dart';
import 'package:muhurta/core/data/birth_pack_views.dart';
import 'package:muhurta/core/data/muhurtha_engine_api.dart';
import 'package:muhurta/design_system/design_system.dart';
import 'package:muhurta/shared/widgets/share_story_card.dart';

import 'helpers/store_screenshot_harness.dart';

/// Opt-in: `flutter test test/store_screenshots_test.dart --dart-define=STORE_SCREENSHOT_MODE=true`
/// Canonical Play assets come from `scripts/capture-store-screenshots.ps1` (adb).
const _runGoldens =
    bool.fromEnvironment('STORE_SCREENSHOT_MODE', defaultValue: false);

/// Play listing size — raw UI, no device bezel.
const _playPhone = ScreenshotDevice(
  platform: TargetPlatform.android,
  resolution: Size(1080, 1920),
  pixelRatio: 1,
  goldenSubFolder: './',
  frameBuilder: ScreenshotFrame.noFrame,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  if (!_runGoldens) {
    test('store screenshots skipped (adb capture is canonical)', () {});
    return;
  }

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
    ScreenshotDevice.screenshotsFolder = '../../play/assets/screenshots/en-IN/';
  });

  group('Store screenshots (en-IN)', () {
    late BirthPackPayload enPack;
    late TodayPayload enToday;

    setUpAll(() async {
      enPack = await StoreDemoFixtures.loadPack('en');
      enToday = await StoreDemoFixtures.loadToday('en');
    });

    _homeTabShot('01-today', tabIndex: 0, pack: () => enPack, today: () => enToday);
    _homeTabShot('02-life-map', tabIndex: 1, pack: () => enPack, today: () => enToday);
    _homeTabShot('03-decode', tabIndex: 2, pack: () => enPack, today: () => enToday);
    _homeTabShot('04-timing', tabIndex: 3, pack: () => enPack, today: () => enToday);
    _homeTabShot(
      '05-ask',
      tabIndex: 4,
      pack: () => enPack,
      today: () => enToday,
      beforeScreenshot: (tester) async {
        await tester.pump(const Duration(milliseconds: 400));
        final suggestions = find.textContaining('interview', findRichText: true);
        if (tester.any(suggestions)) {
          await tester.tap(suggestions.first);
          await tester.pump(const Duration(milliseconds: 400));
        }
      },
    );

    final shareGolden =
        File('../../play/assets/screenshots/en-IN/06-share.png');
    if (shareGolden.existsSync()) {
      testGoldens('06-share', (tester) async {
        await tester.loadAssets(fontsToMock: kFontsToMock);
        await tester.pumpWidget(
        ScreenshotApp(
          device: _playPhone,
          home: Material(
            color: MuhColors.bg,
            child: Center(
              child: ShareStoryCard(
                title: enPack.displayName.isEmpty
                    ? 'Life Map'
                    : 'Your chapter',
                body: BirthPackViews(enPack)
                        .chaptersByTense('current')
                        .firstOrNull
                        ?.displayBody ??
                    'First check your past. Then choose the right time.',
                brandLabel: 'Muhūrta',
                downloadLink: LegalUrls.siteBase,
                footerTagline:
                    'First check your past. Then choose the right time.',
                sectionLabel: 'Life Map',
                eyebrow: BirthPackViews(enPack)
                        .chaptersByTense('current')
                        .firstOrNull
                        ?.periodLabel ??
                    '',
              ),
            ),
          ),
        ),
      );
      await _finishScreenshot(tester);
      await tester.expectScreenshot(_playPhone, '06-share');
      });
    }
  });
}

void _homeTabShot(
  String name, {
  required int tabIndex,
  required BirthPackPayload Function() pack,
  required TodayPayload Function() today,
  Locale locale = const Locale('en'),
  Future<void> Function(WidgetTester tester)? beforeScreenshot,
}) {
  testGoldens(name, (tester) async {
    await tester.loadAssets(fontsToMock: kFontsToMock);
    final overrides = storeScreenshotOverrides(
      pack: pack(),
      today: today(),
      locale: locale,
    );

    await tester.pumpWidget(
      storeScreenshotApp(
        device: _playPhone,
        tabIndex: tabIndex,
        overrides: overrides,
        locale: locale,
      ),
    );

    await beforeScreenshot?.call(tester);
    await _finishScreenshot(tester);
    await tester.expectScreenshot(_playPhone, name);
  });
}

Future<void> _finishScreenshot(WidgetTester tester) async {
  await tester.pumpFrames(
    tester.widget(find.byType(ScreenshotApp)),
    const Duration(milliseconds: 900),
  );
}
