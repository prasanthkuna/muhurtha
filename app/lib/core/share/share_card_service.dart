import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

import '../locale/locale_provider.dart';
import '../../shared/widgets/share_story_card.dart';

const kMuhurtaDownloadLink = 'https://muhurta.app';

final shareCardServiceProvider = Provider<ShareCardService>((ref) {
  return ShareCardService(ref);
});

class ShareCardService {
  ShareCardService(this._ref);

  final Ref _ref;
  final ScreenshotController _controller = ScreenshotController();

  Future<void> shareInsight({
    required BuildContext context,
    required String sourceType,
    required Map<String, Object?> payload,
    String? sourceId,
    String? sectionLabel,
  }) async {
    final locale = _ref.read(localeProvider).languageCode;
    await shareExact(
      context: context,
      title: _first(payload, const ['title', 'headline'],
          _sectionLabel(locale, sourceType)),
      body: _first(
        payload,
        const [
          'body',
          'shareHook',
          'highlight',
          'directAnswer',
          'actionLine',
          'summary',
          'simpleLine',
        ],
        _sectionLabel(locale, sourceType),
      ),
      sourceType: sourceType,
      sourceId: sourceId,
      sectionLabel: sectionLabel,
    );
  }

  Future<void> shareExact({
    required BuildContext context,
    required String title,
    required String body,
    String contextLine = '',
    String sourceType = 'generic_card',
    String? sourceId,
    String? sectionLabel,
  }) async {
    final locale = _ref.read(localeProvider).languageCode;
    if (!context.mounted) return;
    final id = (sourceId?.trim().isNotEmpty == true
            ? sourceId!.trim()
            : DateTime.now().millisecondsSinceEpoch.toString())
        .replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '-');

    final brand = _brand(locale);

    final view = View.maybeOf(context) ?? ui.PlatformDispatcher.instance.implicitView;
    if (view == null) {
      throw StateError('No Flutter view available for share capture');
    }

    final theme = Theme.of(context);
    final textDirection = Directionality.of(context);
    final mediaQuery = MediaQuery.of(context).copyWith(
      size: const Size(ShareStoryCard.cardWidth, ShareStoryCard.cardHeight),
      devicePixelRatio: 3,
    );

    final bytes = await _controller.captureFromWidget(
      View(
        view: view,
        child: Directionality(
          textDirection: textDirection,
          child: MediaQuery(
            data: mediaQuery,
            child: Theme(
              data: theme,
              child: Material(
                type: MaterialType.transparency,
                child: Center(
                  child: ShareStoryCard(
                    title: title,
                    body: body,
                    brandLabel: brand,
                    downloadLink: kMuhurtaDownloadLink,
                    footerTagline: _footer(locale),
                    sectionLabel:
                        sectionLabel ?? _sectionLabel(locale, sourceType),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      pixelRatio: 3,
      targetSize: const Size(ShareStoryCard.cardWidth, ShareStoryCard.cardHeight),
    );

    final tempDir = await getTemporaryDirectory();
    final file =
        File('${tempDir.path}${Platform.pathSeparator}muhurta-$id.png');
    await file.writeAsBytes(bytes, flush: true);

    // Card image already has brand, copy, and download link — no duplicate caption.
    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'image/png')],
    );
  }

  String _first(
    Map<String, Object?> payload,
    List<String> keys,
    String fallback,
  ) {
    for (final key in keys) {
      final value = payload[key]?.toString().trim();
      if (value != null && value.isNotEmpty) return value;
    }
    final sentences = payload['sentences'];
    if (sentences is List && sentences.isNotEmpty) {
      final first = sentences.first.toString().trim();
      if (first.isNotEmpty) return first;
    }
    return fallback;
  }

  String _brand(String locale) {
    return switch (locale.toLowerCase()) {
      'te' => 'ముహూర్త',
      'hi' => 'मुहूर्त',
      _ => 'Muhūrta',
    };
  }

  String _sectionLabel(String locale, String sourceType) {
    const en = {
      'quick_proof': 'Past phase',
      'today_one_line': 'Today',
      'ask_answer': 'Ask answer',
      'purpose_result': 'Timing check',
      'journey_phase': 'Life map',
      'remedy': 'Remedy',
      'generic_card': 'Decode',
      'decode': 'Decode',
      'natal_luck': 'Natal luck',
    };
    const hi = {
      'quick_proof': 'पिछला चरण',
      'today_one_line': 'आज',
      'ask_answer': 'जवाब',
      'purpose_result': 'समय जांच',
      'journey_phase': 'लाइफ मैप',
      'remedy': 'उपाय',
      'generic_card': 'डिकोड',
      'decode': 'डिकोड',
      'natal_luck': 'नैटल लक',
    };
    const te = {
      'quick_proof': 'గత దశ',
      'today_one_line': 'ఈరోజు',
      'ask_answer': 'సమాధానం',
      'purpose_result': 'టైమింగ్ చెక్',
      'journey_phase': 'లైఫ్ మ్యాప్',
      'remedy': 'పరిహారం',
      'generic_card': 'డీకోడ్',
      'decode': 'డీకోడ్',
      'natal_luck': 'జన్మ లక్',
    };
    final map = switch (locale.toLowerCase()) {
      'te' => te,
      'hi' => hi,
      _ => en,
    };
    return map[sourceType] ?? en[sourceType] ?? 'Decode';
  }

  String _footer(String locale) {
    return switch (locale.toLowerCase()) {
      'te' => 'చంద్ర రాశి ఆధారిత భారతీయ జ్యోతిష్యం',
      'hi' => 'चंद्र राशि आधारित भारतीय ज्योतिष',
      _ => 'Moon-based Indian astrology',
    };
  }
}
