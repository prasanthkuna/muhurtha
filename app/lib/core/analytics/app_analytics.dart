import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/muhurtha_engine_api.dart';

final appAnalyticsProvider = Provider<AppAnalytics>((ref) {
  return AppAnalytics(ref);
});

/// Product funnel events — non-PII, forwarded to Supabase app_logs via engine.
class AppAnalytics {
  AppAnalytics(this._ref);

  final Ref _ref;

  Future<void> log(
    String event, {
    Map<String, Object?> params = const {},
  }) async {
    if (kDebugMode) {
      debugPrint('[analytics] $event $params');
    }
    final api = _ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    unawaited(
      api.logEvent(
        level: 'info',
        message: event,
        context: {
          'event': event,
          ...params,
        },
        service: 'product',
      ),
    );
  }

  Future<void> appOpen() => log('app_open');

  Future<void> onboardingStep(String step) =>
      log('onboarding_step', params: {'step': step});

  Future<void> onboardingComplete({String? engineMode}) => log(
        'onboarding_complete',
        params: {if (engineMode != null) 'engine_mode': engineMode},
      );

  Future<void> shareTapped({
    required String sourceType,
    String? sourceId,
  }) =>
      log(
        'share_tapped',
        params: {
          'source_type': sourceType,
          if (sourceId != null) 'source_id': sourceId,
        },
      );

  Future<void> shareCompleted({
    required String sourceType,
    required String shareId,
  }) =>
      log(
        'share_completed',
        params: {
          'source_type': sourceType,
          'share_id': shareId,
        },
      );

  Future<void> shareFailed({
    required String sourceType,
    required String reason,
  }) =>
      log(
        'share_failed',
        params: {
          'source_type': sourceType,
          'reason': reason,
        },
      );

  Future<void> testFriendTapped({required String sourceType}) => log(
        'test_friend_tapped',
        params: {'source_type': sourceType},
      );

  Future<void> referralLinkOpened({required String referrerId}) => log(
        'referral_link_opened',
        params: {'referrer_profile_id': referrerId},
      );

  Future<void> paywallView({String? source}) => log(
        'paywall_view',
        params: {if (source != null) 'source': source},
      );
}
