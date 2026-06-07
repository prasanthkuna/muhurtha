import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/data/engine_cache_invalidate.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/profile_repository.dart';
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
    final api = ref.read(muhurthaEngineApiProvider);
    if (api != null) {
      try {
        await api.chartInitialize(ids.birthInputId);
      } catch (e, st) {
        await api.logEvent(
          level: 'error',
          message: 'chartInitialize failed during onboarding: $e',
          stackTrace: st.toString(),
          context: {'draft': draft.toJson(), 'birthInputId': ids.birthInputId},
        );
      }
    }
    ref.read(localeProvider.notifier).setLanguageCode(draft.languageCode);
    invalidateAllEngineCaches(ref);
    if (context.mounted) context.go('/home?tab=decode');
  } catch (e, st) {
    final api = ref.read(muhurthaEngineApiProvider);
    await api?.logEvent(
      level: 'error',
      message: 'finishOnboarding failed: $e',
      stackTrace: st.toString(),
      context: {'draft': draft.toJson()},
    );
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.errorGeneric)),
    );
  }
}
