// Play Store, share landing, and referral URLs (compile-time overrides).
import 'package:muhurta/core/config/legal_urls.dart';

abstract final class MarketingUrls {
  static const shareSiteBase = String.fromEnvironment(
    'SHARE_SITE_URL',
    defaultValue: LegalUrls.siteBase,
  );

  static const playStoreListing = String.fromEnvironment(
    'PLAY_STORE_URL',
    defaultValue:
        'https://play.google.com/store/apps/details?id=app.muhurta',
  );

  /// Public share landing (OG preview via Vercel → share-preview).
  static String shareCardLanding(String shareId, {String? referrerProfileId}) {
    final base = shareSiteBase.replaceAll(RegExp(r'/+$'), '');
    final path = '$base/c/$shareId';
    final ref = referrerProfileId?.trim();
    if (ref == null || ref.isEmpty) return path;
    return '$path?ref=${Uri.encodeComponent(ref)}';
  }

  static String playStoreWithReferrer(String referrerProfileId) {
    final ref = referrerProfileId.trim();
    if (ref.isEmpty) return playStoreListing;
    final encoded = Uri.encodeComponent('ref=$ref');
    final joiner = playStoreListing.contains('?') ? '&' : '?';
    return '$playStoreListing${joiner}referrer=$encoded';
  }

  /// Short label printed on share images.
  static String get playStoreLabel => 'Get on Google Play';
}
