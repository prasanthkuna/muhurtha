import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

import '../../app/muh_theme.dart';
import '../../design_system/design_system.dart';
import '../analytics/app_analytics.dart';
import '../config/env.dart';
import '../config/marketing_urls.dart';
import '../data/muhurtha_engine_api.dart';
import '../locale/locale_provider.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
import '../../shared/widgets/editorial/muh_share_preview.dart';
import '../../shared/widgets/share_story_card.dart';

final shareCardServiceProvider = Provider<ShareCardService>((ref) {
  return ShareCardService(ref);
});

class ShareCardService {
  ShareCardService(this._ref);

  final Ref _ref;
  final ScreenshotController _controller = ScreenshotController();
  bool _sharing = false;
  OverlayEntry? _shareOverlay;

  Future<void> shareInsight({
    required BuildContext context,
    required String sourceType,
    required Map<String, Object?> payload,
    String? sourceId,
    String? sectionLabel,
  }) async {
    await shareExact(
      context: context,
      title: _first(payload, const ['title', 'headline'],
          _sectionLabel(_resolveShareLocale(), sourceType)),
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
        _sectionLabel(_resolveShareLocale(), sourceType),
      ),
      contextLine: _first(payload, const ['context', 'period_label', 'period'], ''),
      sourceType: sourceType,
      sourceId: sourceId,
      sectionLabel: sectionLabel,
      serverPayload: payload,
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
    Map<String, Object?>? serverPayload,
  }) async {
    if (_sharing) return;
    _sharing = true;
    try {
      final locale = _resolveShareLocale();
      if (!context.mounted) return;

      await _ref.read(appAnalyticsProvider).shareTapped(
            sourceType: sourceType,
            sourceId: sourceId,
          );

      final shareTitle = title.trim();
      final shareBody = body.trim();
      final shareEyebrow = contextLine.trim();

      ShareCardResult? registered;
      if (Env.hasSupabase) {
        try {
          final api = _ref.read(muhurthaEngineApiProvider);
          if (api != null) {
            registered = await api.shareCardGenerate(
              sourceType: sourceType,
              sourceId: sourceId,
              payload: serverPayload ??
                  <String, Object?>{
                    'title': shareTitle,
                    'body': shareBody,
                    if (shareEyebrow.isNotEmpty) 'context': shareEyebrow,
                    'shareHook': shareBody,
                  },
            );
          }
        } catch (e) {
          await _ref.read(appAnalyticsProvider).shareFailed(
                sourceType: sourceType,
                reason: e.toString(),
              );
          rethrow;
        }
      }

      if (!context.mounted) return;

      await _ref.read(appAnalyticsProvider).sharePreviewOpened(
            sourceType: sourceType,
          );

      final approved = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: MuhColors.paper,
        builder: (ctx) => MuhSharePreview(
          title: registered?.shareTitle ?? shareTitle,
          body: registered?.shareBody ?? shareBody,
          redacted: true,
          onCancel: () => Navigator.pop(ctx, false),
          onShare: () => Navigator.pop(ctx, true),
        ),
      );
      if (approved != true || !context.mounted) return;

      _insertShareOverlay(context);

      final id = registered?.id ??
          (sourceId?.trim().isNotEmpty == true
              ? sourceId!.trim()
              : DateTime.now().millisecondsSinceEpoch.toString())
              .replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '-');

      final brand = _brand(locale);
      await _ensureShareFonts(locale);
      final theme = MuhTheme.darkForLocale(Locale(locale));
      final card = Directionality(
        textDirection: TextDirection.ltr,
        child: Theme(
          data: theme,
          child: Material(
            type: MaterialType.transparency,
            child: ShareStoryCard(
              title: registered?.shareTitle ?? shareTitle,
              body: registered?.shareBody ?? shareBody,
              eyebrow: (registered?.shareContext ?? shareEyebrow).isNotEmpty
                  ? (registered?.shareContext ?? shareEyebrow)
                  : null,
              brandLabel: brand,
              downloadLink: MarketingUrls.playStoreLabel,
              footerTagline: _footer(locale),
              sectionLabel:
                  sectionLabel ?? _sectionLabel(locale, sourceType),
            ),
          ),
        ),
      );

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

      _removeShareOverlay();

      if (!context.mounted) return;

      final box = context.findRenderObject() as RenderBox?;
      final origin = box == null
          ? null
          : box.localToGlobal(Offset.zero) & box.size;

      final shareText = _composeShareText(
        registered: registered,
        locale: locale,
        title: shareTitle,
        body: shareBody,
      );

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/png')],
        text: shareText,
        sharePositionOrigin: origin,
      );

      if (registered != null) {
        await _ref.read(appAnalyticsProvider).shareCompleted(
              sourceType: sourceType,
              shareId: registered.id,
            );
      }
    } catch (e) {
      await _ref.read(appAnalyticsProvider).shareFailed(
            sourceType: sourceType,
            reason: e.toString(),
          );
      rethrow;
    } finally {
      _sharing = false;
      _removeShareOverlay();
    }
  }

  String _composeShareText({
    required ShareCardResult? registered,
    required String locale,
    required String title,
    required String body,
  }) {
    if (registered != null && registered.shareText.trim().isNotEmpty) {
      return '${registered.shareText.trim()}\n\n${MarketingUrls.playStoreLabel}\n${MarketingUrls.playStoreListing}';
    }
    final brand = _brand(locale);
    final link = MarketingUrls.playStoreListing;
    return '$brand\n\n$title\n$body\n\n${_checkYours(locale)}\n$link';
  }

  String _checkYours(String locale) {
    return switch (locale.toLowerCase()) {
      'te' => 'నీదీ చూడండి',
      'hi' => 'अपना भी देखें',
      _ => 'Check yours',
    };
  }

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

  void _insertShareOverlay(BuildContext context) {
    _removeShareOverlay();
    final overlay = Overlay.of(context, rootOverlay: true);
    _shareOverlay = OverlayEntry(
      builder: (_) => PopScope(
        canPop: false,
        child: Material(
          color: MuhColors.bg.withValues(alpha: 0.72),
          child: const Center(
            child: MuhurthaLoadingView(
              mode: MuhurthaLoadingMode.share,
              compact: true,
            ),
          ),
        ),
      ),
    );
    overlay.insert(_shareOverlay!);
  }

  void _removeShareOverlay() {
    _shareOverlay?.remove();
    _shareOverlay = null;
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
