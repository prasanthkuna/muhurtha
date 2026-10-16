import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/analytics/app_analytics.dart';
import '../../core/data/engine_cache_invalidate.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/profile_repository.dart';
import '../../core/subscription/subscription_service.dart';
import '../../core/locale/locale_provider.dart';
import 'birth_draft_notifier.dart';

Future<void> finishOnboardingToHome({
  required BuildContext context,
  required WidgetRef ref,
}) async {
  final l10n = AppLocalizations.of(context)!;
  final draft = ref.read(birthDraftProvider);
  final repo = ref.read(profileRepositoryProvider);

  if (repo == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.errorNeedSupabase)),
    );
    if (context.mounted) context.go('/home');
    return;
  }

  try {
    final ids = await repo.saveOnboardingDraft(draft);
    await ref
        .read(subscriptionServiceProvider)
        .configureForProfile(ids.profileId);
    final api = ref.read(muhurthaEngineApiProvider);
    if (api != null) {
      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          await api.chartInitialize(ids.birthInputId);
          break;
        } catch (e, st) {
          await api.logEvent(
            level: 'error',
            message: 'chartInitialize failed (attempt ${attempt + 1}): $e',
            stackTrace: st.toString(),
            context: {
              'birthInputId': ids.birthInputId,
              'draft': draft.toLogContext(),
            },
          );
          if (attempt == 0) {
            await Future<void>.delayed(const Duration(seconds: 2));
          }
        }
      }
    }
    ref.read(localeProvider.notifier).setLanguageCode(draft.languageCode);
    await ref.read(appAnalyticsProvider).onboardingComplete(
          engineMode: draft.resolution.engineMode.apiValue,
        );
    invalidateAllEngineCaches(ref);
    if (context.mounted) context.go('/home?tab=decode');
  } catch (e, st) {
    final api = ref.read(muhurthaEngineApiProvider);
    await api?.logEvent(
      level: 'error',
      message: 'finishOnboarding failed: $e',
      stackTrace: st.toString(),
      context: {'draft': draft.toLogContext()},
    );
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.errorGeneric)),
    );
  }
}
