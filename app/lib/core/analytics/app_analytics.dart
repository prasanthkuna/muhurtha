import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
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
    // Startup and preview builds may not have initialized Supabase yet.
    // Analytics must never crash the app or a widget test.
    if (!Env.hasSupabase) return;
    try {
      if (Supabase.instance.client.auth.currentSession == null) return;
    } catch (_) {
      return;
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

  // —— Retention §6.1 allowlisted funnel (no PII) ——

  Future<void> welcomeViewed() => log('welcome_viewed', params: {'screen': 'welcome'});

  Future<void> welcomeCtaTapped() =>
      log('welcome_cta_tapped', params: {'screen': 'welcome'});

  Future<void> setupStarted({required String entry}) => log(
        'setup_started',
        params: {'screen': 'onboarding', 'entry_point': entry},
      );

  Future<void> onboardingStepViewed({
    required String step,
    String? inputMode,
  }) =>
      log(
        'onboarding_step_viewed',
        params: {
          'step': step,
          if (inputMode != null) 'input_mode': inputMode,
        },
      );

  Future<void> firstInsightViewed({required String screen}) => log(
        'first_insight_viewed',
        params: {'screen': screen},
      );

  Future<void> decodeLifeMapCta() => log(
        'decode_life_map_cta',
        params: {'screen': 'decode'},
      );

  Future<void> lifeMapOpened() => log(
        'life_map_opened',
        params: {'screen': 'life_map'},
      );

  Future<void> chapterOpened({
    required String screen,
    required String chapterPhase,
    required String entryPoint,
  }) =>
      log(
        'chapter_opened',
        params: {
          'screen': screen,
          'chapter_phase': chapterPhase,
          'entry_point': entryPoint,
        },
      );

  Future<void> reflectionSubmitted({
    required String screen,
    required String feedback,
  }) =>
      log(
        'reflection_submitted',
        params: {
          'screen': screen,
          'feedback': feedback,
        },
      );

  Future<void> todayOpened({required bool hasNewContent}) => log(
        'today_opened',
        params: {
          'screen': 'today',
          'has_new_content': hasNewContent,
        },
      );

  Future<void> purposeSelected({required String purpose}) => log(
        'purpose_selected',
        params: {'screen': 'today', 'purpose': purpose},
      );

  Future<void> timingEvaluated({required String purpose}) => log(
        'timing_evaluated',
        params: {'screen': 'timing', 'purpose': purpose},
      );

  Future<void> intentionSaved({required String purpose}) => log(
        'intention_saved',
        params: {'screen': 'timing', 'purpose': purpose},
      );

  Future<void> askQuestionSent({required int lengthBucket}) => log(
        'ask_question_sent',
        params: {'screen': 'ask', 'length_bucket': lengthBucket},
      );

  Future<void> askAnswerResolved({required bool useful}) => log(
        'ask_answer_resolved',
        params: {'screen': 'ask', 'useful': useful},
      );

  Future<void> sharePreviewOpened({required String sourceType}) => log(
        'share_preview_opened',
        params: {'source_type': sourceType},
      );

  Future<void> paywallRequested({required String feature}) => log(
        'paywall_requested',
        params: {'feature': feature},
      );
}
