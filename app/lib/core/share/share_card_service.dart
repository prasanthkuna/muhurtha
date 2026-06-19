import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/muh_theme.dart';
import '../../design_system/design_system.dart';
import '../data/muhurtha_engine_api.dart';
import '../locale/locale_provider.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
import '../../shared/widgets/share_story_card.dart';

const kMuhurtaDownloadLink = 'https://muhurta.app';

final shareCardServiceProvider = Provider<ShareCardService>((ref) {
  return ShareCardService(ref);
});

class ShareCardService {
  ShareCardService(this._ref);

  final Ref _ref;
  final ScreenshotController _controller = ScreenshotController();
  bool _sharing = false;

  Future<void> shareInsight({
    required BuildContext context,
    required String sourceType,
    required Map<String, Object?> payload,
    String? sourceId,
    String? sectionLabel,
  }) async {
    final locale = _resolveShareLocale();
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
      contextLine: _first(payload, const ['context', 'period_label', 'period'], ''),
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
    if (_sharing) return;
    _sharing = true;
    try {
      final locale = _resolveShareLocale();
      if (!context.mounted) return;

      await _showShareOverlay(context);

      final id = (sourceId?.trim().isNotEmpty == true
              ? sourceId!.trim()
              : DateTime.now().millisecondsSinceEpoch.toString())
          .replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '-');

      final brand = _brand(locale);
      await _ensureShareFonts(locale);
      final theme = MuhTheme.darkForLocale(Locale(locale));
      final shareEyebrow = contextLine.trim();
      final shareTitle = title.trim();
      final shareBody = body.trim();
      final card = Directionality(
        textDirection: TextDirection.ltr,
        child: Theme(
          data: theme,
          child: Material(
            type: MaterialType.transparency,
            child: ShareStoryCard(
              title: shareTitle,
              body: shareBody,
              eyebrow: shareEyebrow.isNotEmpty ? shareEyebrow : null,
              brandLabel: brand,
              downloadLink: kMuhurtaDownloadLink,
              footerTagline: _footer(locale),
              sectionLabel:
                  sectionLabel ?? _sectionLabel(locale, sourceType),
            ),
          ),
        ),
      );

      // Offscreen capture only — do not pass `context` or InheritedTheme can
      // flash Latin fonts before Telugu/Hindi glyphs are ready.
      final bytes = await _controller.captureFromLongWidget(
        card,
        pixelRatio: 3,
        delay: const Duration(milliseconds: 120),
        constraints: const BoxConstraints(maxWidth: ShareStoryCard.cardWidth),
      );

      final tempDir = await getTemporaryDirectory();
      final file =
          File('${tempDir.path}${Platform.pathSeparator}muhurta-$id.png');
      await file.writeAsBytes(bytes, flush: true);

      if (context.mounted) {
        await _hideShareOverlay(context);
      }

      if (!context.mounted) return;

      final box = context.findRenderObject() as RenderBox?;
      final origin = box == null
          ? null
          : box.localToGlobal(Offset.zero) & box.size;

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/png')],
        sharePositionOrigin: origin,
      );
    } finally {
      _sharing = false;
      if (context.mounted) {
        await _hideShareOverlay(context);
      }
    }
  }

  /// Prefer pack content locale so share image matches Telugu/Hindi copy.
  String _resolveShareLocale() {
    final packLocale = _ref.read(birthPackProvider).valueOrNull?.locale;
    if (packLocale != null && packLocale.trim().isNotEmpty) {
      return packLocale.trim().toLowerCase();
    }
    return _ref.read(localeProvider).languageCode.toLowerCase();
  }

  Future<void> _ensureShareFonts(String locale) async {
    switch (locale.toLowerCase()) {
      case 'te':
        await GoogleFonts.pendingFonts([GoogleFonts.notoSansTelugu()]);
        return;
      case 'hi':
        await GoogleFonts.pendingFonts([GoogleFonts.notoSansDevanagari()]);
        return;
      default:
        await GoogleFonts.pendingFonts([
          GoogleFonts.fraunces(),
          GoogleFonts.instrumentSans(),
        ]);
    }
  }

  Future<void> _showShareOverlay(BuildContext context) {
    return showGeneralDialog<void>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: false,
      barrierColor: MuhColors.bg.withValues(alpha: 0.72),
      pageBuilder: (ctx, _, __) => const PopScope(
        canPop: false,
        child: Center(
          child: MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.share,
            compact: true,
          ),
        ),
      ),
    );
  }

  Future<void> _hideShareOverlay(BuildContext context) async {
    final nav = Navigator.of(context, rootNavigator: true);
    if (nav.canPop()) {
      nav.pop();
    }
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
