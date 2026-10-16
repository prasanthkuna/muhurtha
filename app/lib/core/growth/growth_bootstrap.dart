import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/core/analytics/app_analytics.dart';
import 'package:muhurta/core/growth/referral_service.dart';

/// Deep links (share landing /c/{id}?ref=) + product analytics bootstrap.
final growthBootstrapProvider = Provider<GrowthBootstrap>((ref) {
  return GrowthBootstrap(ref);
});

class GrowthBootstrap {
  GrowthBootstrap(this._ref);

  final Ref _ref;
  StreamSubscription<Uri>? _linkSub;
  var _started = false;

  Future<void> start() async {
    if (_started) return;
    _started = true;

    await _ref.read(appAnalyticsProvider).appOpen();

    final appLinks = AppLinks();
    final initial = await appLinks.getInitialLink();
    await _handleUri(initial);

    _linkSub = appLinks.uriLinkStream.listen(_handleUri);
  }

  Future<void> _handleUri(Uri? uri) async {
    if (uri == null) return;
    await ReferralService.captureFromUri(uri);
    final ref = uri.queryParameters['ref']?.trim();
    if (ref != null && ref.isNotEmpty) {
      await _ref.read(appAnalyticsProvider).referralLinkOpened(
            referrerId: ref,
          );
    }
  }

  void dispose() {
    unawaited(_linkSub?.cancel());
    _linkSub = null;
    _started = false;
  }
}
